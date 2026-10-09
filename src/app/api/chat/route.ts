import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { chatConfig } from "@/lib/chat/config";
import { evaluateInput, isAbusive } from "@/lib/chat/guardrails";
import { checkOutput, RESTRICTED_RESPONSE } from "@/lib/chat/output-guard";
import { classifyLocally, routeByScores, namespacesFor, type QueryRoute } from "@/lib/chat/route-classify";
import { retrieve, type RetrievedChunk } from "@/lib/chat/retrieve";
import { SYSTEM_PROMPT, buildUserPrompt, STRICT_REGEN_INSTRUCTION } from "@/lib/chat/systemPrompt";
import { streamChat, friendlyFailure, ChatModelError } from "@/lib/chat/gemini";
import {
  loadHistory,
  ensureConversation,
  persistTurn,
  maybeRollupSummary,
  extractProfile,
  saveProfile,
  recordAbuseStrike,
  type MemoryTurn,
} from "@/lib/chat/memory";
import { uiStrings } from "@/lib/chat/ui-strings";

export const runtime = "nodejs";
export const maxDuration = 60;

/* -------------------------------------------------------------------------- */
/* Request contract                                                           */
/* -------------------------------------------------------------------------- */

const bodySchema = z.object({
  message: z.string().min(1, "Empty message").max(4000),
  /** Logged-in users: server owns the history. Guests: sent from sessionStorage. */
  conversationId: z.string().uuid().optional(),
  sessionId: z
    .string()
    .min(8)
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, "bad session id")
    .optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(1200),
      }),
    )
    .max(12)
    .optional(),
});

type Body = z.infer<typeof bodySchema>;

/* -------------------------------------------------------------------------- */
/* SSE framing — every event is one JSON object per line                       */
/* -------------------------------------------------------------------------- */

interface MetaEvent {
  type: "meta";
  route: QueryRoute | "blocked";
  sources: Array<{ title: string; url: string; source: "deux" | "agentfactory" }>;
  conversationId: string | null;
  abuseStrikes: number;
  ended: boolean;
  blockedReason?: string;
  /** Server-side ids, so a logged-in user's feedback can be attached. */
  messageIds?: { user: string | null; assistant: string | null };
}
interface TokenEvent {
  type: "token";
  text: string;
}
interface DoneEvent {
  type: "done";
}
interface ErrorEvent {
  type: "error";
  kind: string;
  message: string;
}

type Event = MetaEvent | TokenEvent | DoneEvent | ErrorEvent;

function sse(events: Event[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const ev of events) {
        controller.enqueue(encoder.encode(`${JSON.stringify(ev)}\n`));
      }
      controller.close();
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

/** Split into small pieces so the local re-stream feels smooth. */
function chunkText(text: string, size = 4): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    out.push(text.slice(i, i + size));
    i += size;
  }
  return out;
}

function logEvent(event: string, detail: Record<string, string | number | boolean> = {}) {
  if (!chatConfig.logEvents) return;
  // No message bodies, no prompts, no keys — metadata only (§9).
  console.log(`[chat] ${event}`, JSON.stringify(detail));
}

/** Prebuilt single-event replies (guard hits, abuse, failures). */
function cannedReply(
  text: string,
  opts: { conversationId: string | null; strikes: number; ended?: boolean; reason?: string },
): Response {
  const meta: MetaEvent = {
    type: "meta",
    route: "blocked",
    sources: [],
    conversationId: opts.conversationId,
    abuseStrikes: opts.strikes,
    ended: opts.ended ?? false,
    ...(opts.reason ? { blockedReason: opts.reason } : {}),
  };
  return sse([meta, ...chunkText(text).map((t): TokenEvent => ({ type: "token", text: t })), { type: "done" }]);
}

/* -------------------------------------------------------------------------- */
/* POST /api/chat                                                              */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!checkRateLimit(`ip:${ip}`)) {
      return sse([
        { type: "error", kind: "rate_limit", message: uiStrings.rateLimited },
        { type: "done" },
      ]);
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { error: issue?.message || "Invalid request body" },
        { status: 400 },
      );
    }
    const body: Body = parsed.data;

    /* ---- identity ------------------------------------------------------- */
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { userId?: string } | undefined)?.userId || "";
    const rateKey = userId ? `user:${userId}` : `guest:${body.sessionId || ip}`;

    if (!checkRateLimit(rateKey, chatConfig.userRateLimit)) {
      return sse([
        { type: "error", kind: "rate_limit", message: uiStrings.rateLimited },
        { type: "done" },
      ]);
    }

    /* ---- memory --------------------------------------------------------- */
    const history = userId
      ? await loadHistory(userId, body.conversationId)
      : {
          conversationId: null,
          window: (body.history || []) as MemoryTurn[],
          summary: "",
          profile: {},
          abuseStrikes: 0,
          status: "active" as const,
        };

    if (history.status === "ended") {
      return cannedReply(uiStrings.sessionEnded, {
        conversationId: history.conversationId,
        strikes: history.abuseStrikes,
        ended: true,
        reason: "session_ended",
      });
    }

    /* ---- layer 1: input guardrails (§6) --------------------------------- */
    const verdict = evaluateInput(body.message);

    if (verdict.action === "block") {
      if (verdict.reason === "empty_or_spam") {
        return NextResponse.json({ error: "Empty message" }, { status: 400 });
      }

      // Abuse is counted, not just refused (§6E).
      if (verdict.reason === "off_topic" && isAbusive(body.message)) {
        const strikes = userId
          ? await recordAbuseStrike(userId, history.conversationId)
          : history.abuseStrikes + 1;
        const ended = strikes >= chatConfig.abuseStrikeLimit;
        logEvent("guardrail", { rule: "abuse", strikes, ended });
        return cannedReply(ended ? uiStrings.sessionEnded : uiStrings.abuseBoundary, {
          conversationId: history.conversationId,
          strikes,
          ended,
          reason: ended ? "abuse" : "abuse_boundary",
        });
      }

      logEvent("guardrail", { rule: verdict.reason });
      return cannedReply(verdict.reply, {
        conversationId: history.conversationId,
        strikes: history.abuseStrikes,
        reason: verdict.reason,
      });
    }

    // Explicit abuse check even when the rest of the input passed.
    if (isAbusive(body.message)) {
      const strikes = userId
        ? await recordAbuseStrike(userId, history.conversationId)
        : history.abuseStrikes + 1;
      const ended = strikes >= chatConfig.abuseStrikeLimit;
      logEvent("guardrail", { rule: "abuse", strikes, ended });
      return cannedReply(ended ? uiStrings.sessionEnded : uiStrings.abuseBoundary, {
        conversationId: history.conversationId,
        strikes,
        ended,
        reason: ended ? "abuse" : "abuse_boundary",
      });
    }

    if (verdict.action === "redact") {
      logEvent("guardrail", { rule: verdict.reason });
      // Warn, do not echo, do not store (§6A).
      return cannedReply(verdict.reply, {
        conversationId: history.conversationId,
        strikes: history.abuseStrikes,
        reason: verdict.reason,
      });
    }

    const userText = verdict.cleaned;

    /* ---- routing + retrieval (§2D) -------------------------------------- */
    const localRoute = classifyLocally(userText);

    // §6F: politely decline before spending a retrieval call.
    if (localRoute === "out_of_scope") {
      logEvent("guardrail", { rule: "off_topic" });
      return cannedReply(uiStrings.boundary("topics outside AI agents and what Deux does"), {
        conversationId: history.conversationId,
        strikes: history.abuseStrikes,
        reason: "off_topic",
      });
    }

    let namespaces = namespacesFor(localRoute ?? "mixed");
    // Never search Source A if the index for it is missing — but always
    // allow Source B, and fall back to both if routing came back empty.
    const first = await retrieve(userText, namespaces);
    let route: QueryRoute = localRoute ?? "mixed";
    let result = first;

    if (!localRoute) {
      route = routeByScores(result.topScores.deux ?? 0, result.topScores.agentfactory ?? 0);
      const wanted = namespacesFor(route);
      if (wanted.join(",") !== namespaces.join(",")) {
        namespaces = wanted;
        result = await retrieve(userText, namespaces);
      }
    }

    if (result.error === "model") {
      logEvent("retrieval_error", { route });
      return sse([
        { type: "error", kind: "model", message: uiStrings.modelError },
        { type: "done" },
      ]);
    }

    const contextFor = (source: "deux" | "agentfactory") =>
      result.chunks
        .filter((c) => c.source === source)
        .map(formatChunk)
        .join("\n\n---\n\n");

    logEvent("retrieval", {
      route,
      chunks: result.chunks.length,
      deux: result.chunks.filter((c) => c.source === "deux").length,
      af: result.chunks.filter((c) => c.source === "agentfactory").length,
    });

    /* ---- no relevant context (§2D) -------------------------------------- */
    if (result.chunks.length === 0) {
      // The pricing branch never reaches here (blocked earlier), so this is a
      // genuine "not in the knowledge base" answer.
      const reply = `${uiStrings.noAnswer}\n\n${foundersLine()}`;
      const convId = history.conversationId;
      await persistForUser(userId, convId, userText, [], "user");
      await persistForUser(userId, convId, reply, [], "assistant");
      const meta: MetaEvent = {
        type: "meta",
        route,
        sources: [],
        conversationId: convId,
        abuseStrikes: history.abuseStrikes,
        ended: false,
      };
      return sse([meta, ...chunkText(reply).map((t): TokenEvent => ({ type: "token", text: t })), { type: "done" }]);
    }

    /* ---- build the prompt ------------------------------------------------ */
    const profile = Object.keys(history.profile).length
      ? history.profile
      : await safeProfile(userId, history.conversationId, history.profile, userText);

    const historyText = renderHistory(history.summary, history.window);

    const prompt = buildUserPrompt({
      userMessage: userText,
      history: historyText,
      profile: renderProfile(profile),
      route,
      ...(result.chunks.some((c) => c.source === "deux")
        ? { deuxContext: contextFor("deux") }
        : {}),
      ...(result.chunks.some((c) => c.source === "agentfactory")
        ? { agentFactoryContext: contextFor("agentfactory") }
        : {}),
    });

    const sources = dedupeSources(result.chunks);
    const urls = result.urls;

    /* ---- generate → guard → re-stream ----------------------------------- */
    let finalText = "";
    let attempt = 0;
    let lastReason = "";

    try {
      for (;;) {
        finalText = await collect(streamChat(SYSTEM_PROMPT, prompt));
        const verdictOut = checkOutput(finalText, { contextUrls: urls, attempt });

        if (verdictOut.ok) {
          finalText = verdictOut.text;
          break;
        }

        lastReason = verdictOut.reason;

        // Non-recoverable classes go straight to their canned answer.
        if (
          verdictOut.reply &&
          (verdictOut.reason === "prompt_leak" ||
            verdictOut.reason === "price" ||
            verdictOut.reason === "order_confirmation" ||
            verdictOut.reason === "payment_promise")
        ) {
          finalText = verdictOut.reply;
          break;
        }

        if (attempt >= 1) {
          finalText = verdictOut.reply || uiStrings.emptyAnswer;
          break;
        }

        attempt += 1;
        try {
          const retryPrompt = `${prompt}\n\n<instruction>\n${STRICT_REGEN_INSTRUCTION}\n</instruction>`;
          finalText = await collect(streamChat(SYSTEM_PROMPT, retryPrompt));
        } catch (err) {
          finalText = uiStrings.emptyAnswer;
          lastReason = "retry_failed";
          logEvent("model_error", { kind: err instanceof ChatModelError ? err.kind : "unknown" });
          break;
        }
      }
    } catch (err) {
      const kind = err instanceof ChatModelError ? err.kind : "model";
      logEvent("model_error", { kind, attempt });
      const message = err instanceof ChatModelError ? friendlyFailure(kind) : uiStrings.modelError;
      return sse([{ type: "error", kind, message }, { type: "done" }]);
    }

    if (lastReason) logEvent("output_filter", { reason: lastReason, attempt });

    /* ---- persist (logged-in only, §3) ------------------------------------ */
    const convId = history.conversationId ?? (await ensureConversation(userId, body.conversationId));
    const userMsgId = await persistForUser(userId, convId, userText, sources, "user");
    const botMsgId = await persistForUser(userId, convId, finalText, sources, "assistant");
    await maybeRollupSummary(userId, convId);

    const meta: MetaEvent = {
      type: "meta",
      route,
      sources,
      conversationId: convId,
      abuseStrikes: history.abuseStrikes,
      ended: false,
      messageIds: { user: userMsgId, assistant: botMsgId },
    };

    // Local re-stream: the guard already approved every character.
    const pieces = chunkText(finalText, 3);
    const events: Event[] = [meta];
    for (const piece of pieces) events.push({ type: "token", text: piece });
    events.push({ type: "done" });

    return sse(events);
  } catch (err) {
    logEvent("unhandled_error", { message: err instanceof Error ? err.name : "unknown" });
    return sse([
      { type: "error", kind: "model", message: uiStrings.modelError },
      { type: "done" },
    ]);
  }
}

/* -------------------------------------------------------------------------- */
/* helpers                                                                     */
/* -------------------------------------------------------------------------- */

async function collect(gen: AsyncGenerator<string>): Promise<string> {
  let out = "";
  for await (const piece of gen) out += piece;
  return out.trim();
}

function formatChunk(c: RetrievedChunk): string {
  const head = [c.heading || c.title, c.url].filter(Boolean).join(" — ");
  return `${head}\n${c.text}`;
}

function dedupeSources(
  chunks: RetrievedChunk[],
): Array<{ title: string; url: string; source: "deux" | "agentfactory" }> {
  const seen = new Map<string, { title: string; url: string; source: "deux" | "agentfactory" }>();
  for (const c of chunks) {
    if (!c.url || seen.has(c.url)) continue;
    seen.set(c.url, {
      title: (c.title || c.heading || c.url).slice(0, 80),
      url: c.url,
      source: c.source,
    });
  }
  return [...seen.values()].slice(0, 6);
}

function renderHistory(summary: string, window: MemoryTurn[]): string {
  const parts: string[] = [];
  if (summary) parts.push(`Earlier in this conversation: ${summary}`);
  for (const t of window) {
    parts.push(`${t.role === "user" ? "User" : "Assistant"}: ${t.content}`);
  }
  return parts.join("\n").slice(0, 4000);
}

function renderProfile(profile: Record<string, string>): string {
  const entries = Object.entries(profile).filter(([, v]) => v);
  if (entries.length === 0) return "";
  return entries.map(([k, v]) => `${k}: ${v}`).join("; ");
}

function foundersLine(): string {
  const lines: string[] = [];
  if (process.env.FOUNDERS_CONTACT_EMAIL) lines.push(`Email: ${process.env.FOUNDERS_CONTACT_EMAIL}`);
  lines.push(`Contact page: ${process.env.FOUNDERS_CONTACT_URL || "/contact"}`);
  if (process.env.FOUNDERS_WHATSAPP) lines.push(`WhatsApp: ${process.env.FOUNDERS_WHATSAPP}`);
  return lines.join(" · ");
}

async function persistForUser(
  userId: string,
  conversationId: string | null,
  content: string,
  sources: Array<{ title: string; url: string; source: "deux" | "agentfactory" }>,
  role?: "user" | "assistant",
): Promise<string | null> {
  if (!userId || !conversationId || !role) return null;
  try {
    return await persistTurn(userId, conversationId, { role, content, sources });
  } catch {
    // History is a convenience; a write failure must never fail the response.
    return null;
  }
}

async function safeProfile(
  userId: string,
  conversationId: string | null,
  current: Record<string, string>,
  message: string,
): Promise<Record<string, string>> {
  if (!userId || !conversationId) return current;
  try {
    const next = await extractProfile(current, message);
    await saveProfile(userId, conversationId, next);
    return next;
  } catch {
    return current;
  }
}

export { RESTRICTED_RESPONSE };
