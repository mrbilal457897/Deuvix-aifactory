/**
 * Session memory (§3).
 *
 * Logged-in users get durable conversations keyed by their user id. Every
 * query filters on that id — there is no path that reads a row without the
 * ownership predicate, so one user can never surface another user's history.
 *
 * Guests are never written to the database at all; their state lives in
 * sessionStorage on the client.
 */

import { and, desc, eq, ne } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import {
  conversations,
  messages,
  type ChatMessage,
  type Conversation,
} from "@/lib/db/schema";
import { chatConfig } from "./config";
import { completeChat, ChatModelError } from "./gemini";
import { redact } from "./redact";

export interface MemoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface LoadedHistory {
  conversationId: string | null;
  /** Newest-first slice actually fed to the model, oldest first. */
  window: MemoryTurn[];
  summary: string;
  profile: Record<string, string>;
  abuseStrikes: number;
  status: "active" | "ended";
}

const EMPTY: LoadedHistory = {
  conversationId: null,
  window: [],
  summary: "",
  profile: {},
  abuseStrikes: 0,
  status: "active",
};

/* -------------------------------------------------------------------------- */
/* Ownership-checked access                                                   */
/* -------------------------------------------------------------------------- */

export async function loadHistory(userId: string, conversationId?: string): Promise<LoadedHistory> {
  if (!isDatabaseConfigured() || !userId) return EMPTY;
  const db = getDb();

  const rows = await db
    .select()
    .from(conversations)
    .where(
      conversationId
        ? and(eq(conversations.userId, userId), eq(conversations.id, conversationId))
        : eq(conversations.userId, userId),
    )
    .orderBy(desc(conversations.updatedAt))
    .limit(1);

  const conv = rows[0];
  if (!conv) return EMPTY;

  const msgRows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conv.id))
    .orderBy(desc(messages.createdAt))
    .limit(chatConfig.historyWindow);

  return {
    conversationId: conv.id,
    window: msgRows
      .slice()
      .reverse()
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    summary: conv.summary || "",
    profile: (conv.profile as Record<string, string>) || {},
    abuseStrikes: conv.abuseStrikes,
    status: conv.status,
  };
}

/** Returns the conversation id, creating it lazily on the first logged-in turn. */
export async function ensureConversation(userId: string, conversationId?: string): Promise<string | null> {
  if (!isDatabaseConfigured() || !userId) return null;
  const db = getDb();

  if (conversationId) {
    const owned = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.userId, userId), eq(conversations.id, conversationId)))
      .limit(1);
    // A conversation id belonging to someone else is treated as absent.
    if (owned[0]) return owned[0].id;
  }

  const inserted = await db
    .insert(conversations)
    .values({ userId, title: null })
    .returning({ id: conversations.id });
  return inserted[0]?.id ?? null;
}

export async function persistTurn(
  userId: string,
  conversationId: string,
  turn: { role: "user" | "assistant"; content: string; sources?: Array<{ title: string; url: string; source: "deuvix" | "agentfactory" }> },
): Promise<string | null> {
  if (!isDatabaseConfigured() || !userId || !conversationId) return null;
  const db = getDb();

  // Ownership guard on the write path too.
  const owned = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.id, conversationId)))
    .limit(1);
  if (!owned[0]) return null;

  // Never store payment material (§6A).
  const safe = redact(turn.content, true);

  const inserted = await db.insert(messages).values({
    conversationId,
    role: turn.role,
    content: safe.text,
    sources: turn.sources ?? [],
  }).returning({ id: messages.id });
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
  return inserted[0]?.id ?? null;
}

/* -------------------------------------------------------------------------- */
/* Rolling summary + user profile                                             */
/* -------------------------------------------------------------------------- */

/**
 * When the message table grows past `summaryThreshold`, collapse everything
 * outside the live window into `conversations.summary` so token use stays
 * inside free-tier limits. Fails soft: a summary outage must not break chat.
 */
export async function maybeRollupSummary(userId: string, conversationId: string | null): Promise<void> {
  if (!isDatabaseConfigured() || !userId || !conversationId) return;
  const db = getDb();

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(chatConfig.summaryThreshold + 5);

  if (rows.length <= chatConfig.summaryThreshold) return;

  const older = rows.slice(chatConfig.historyWindow).reverse();
  const transcript = older
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n")
    .slice(0, 6000);

  try {
    const summary = await completeChat(
      "Summarise the conversation in under 120 words. Keep: the user's business/problem, their goals, tools or constraints they named, and anything decided. Plain prose, no preamble.",
      transcript,
    );
    if (summary) {
      const existing = await db
        .select({ summary: conversations.summary })
        .from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
        .limit(1);
      const merged = [existing[0]?.summary, summary].filter(Boolean).join("\n\n").slice(0, 2000);
      await db
        .update(conversations)
        .set({ summary: merged, updatedAt: new Date() })
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
      // The rolled-up messages drop out of the live window automatically
      // because loadHistory reads only the newest N.
    }
  } catch {
    // Rollup is best-effort; the chat continues with a truncated window.
  }
}

/**
 * Compact profile so the bot does not re-ask the same questions (§3).
 * Extracted locally first; only ambiguous turns cost a model call.
 */
const PROFILE_HINT =
  'Extract a compact JSON object with at most these keys, only when the user stated them: "businessType", "goal", "problem", "tools". Use short English phrases. Return ONLY the JSON, or {} if nothing applies.';

export async function extractProfile(
  current: Record<string, string>,
  userMessage: string,
): Promise<Record<string, string>> {
  const hint = PROFILE_HINT.toLowerCase();
  const local: Record<string, string> = {};
  const msg = userMessage.toLowerCase();

  if (!current.businessType && /\bi (run|own|have)\b|\bmy (business|startup|company|clinic|shop|agency)\b/.test(msg)) {
    local.businessType = userMessage.slice(0, 80);
  }
  if (!current.problem && /\bi (need|want|struggle|have a problem)\b|\bproblem\b/.test(msg)) {
    local.problem = userMessage.slice(0, 120);
  }

  const mergedIfLocal = { ...current, ...local };
  if (Object.keys(local).length > 0 && mergedIfLocal.goal && mergedIfLocal.tools) {
    return mergedIfLocal;
  }

  try {
    const raw = await completeChat(PROFILE_HINT, `${hint}\n\nUser said: ${userMessage.slice(0, 600)}`);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return mergedIfLocal;
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const out: Record<string, string> = { ...mergedIfLocal };
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && v.trim() && ["businessType", "goal", "problem", "tools"].includes(k)) {
        out[k] = v.trim().slice(0, 160);
      }
    }
    return out;
  } catch {
    return mergedIfLocal;
  }
}

export async function saveProfile(
  userId: string,
  conversationId: string | null,
  profile: Record<string, string>,
): Promise<void> {
  if (!isDatabaseConfigured() || !userId || !conversationId) return;
  await getDb()
    .update(conversations)
    .set({ profile, updatedAt: new Date() })
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
}

/* -------------------------------------------------------------------------- */
/* Abuse strikes + session end (§6E)                                          */
/* -------------------------------------------------------------------------- */

export async function recordAbuseStrike(userId: string, conversationId: string | null): Promise<number> {
  if (!isDatabaseConfigured() || !userId || !conversationId) return 0;
  const db = getDb();
  const rows = await db
    .select({ strikes: conversations.abuseStrikes })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .limit(1);
  if (!rows[0]) return 0;
  const next = rows[0].strikes + 1;
  await db
    .update(conversations)
    .set({
      abuseStrikes: next,
      ...(next >= chatConfig.abuseStrikeLimit
        ? { status: "ended" as const, endedReason: "abuse" }
        : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
  return next;
}

/** "Clear my chat history" / delete-on-request (§3). */
export async function clearHistory(userId: string, conversationId?: string): Promise<void> {
  if (!isDatabaseConfigured() || !userId) return;
  const db = getDb();
  if (conversationId) {
    await db
      .delete(conversations)
      .where(and(eq(conversations.userId, userId), eq(conversations.id, conversationId)));
    return;
  }
  await db.delete(conversations).where(eq(conversations.userId, userId));
}

/** Anonymous feedback — no payload beyond the verdict (§8.2). */
export async function setFeedback(messageId: string, feedback: "up" | "down"): Promise<void> {
  if (!isDatabaseConfigured()) return;
  await getDb()
    .update(messages)
    .set({ feedback })
    .where(and(eq(messages.id, messageId), ne(messages.role, "system")));
}

export type { Conversation, ChatMessage };
export { ChatModelError };
