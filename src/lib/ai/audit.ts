import { desc } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { adminAgentAudit, type AdminAgentToolCall } from "@/lib/db/schema";
import { supabase } from "@/lib/supabase";

export interface AuditEntry {
  adminId: string;
  adminEmail: string;
  inputMode: "text" | "voice";
  /** The admin's message text (for voice: the reviewed transcript). */
  prompt: string;
  transcript?: string;
  skillsLoaded: string[];
  toolCalls: AdminAgentToolCall[];
  status: "ok" | "error";
  error?: string;
  durationMs: number;
}

/** Keeps one oversized tool argument/result from bloating the row. */
function capValue(value: unknown, max = 2000): unknown {
  if (value === undefined) return undefined;
  try {
    const serialized = JSON.stringify(value);
    if (serialized && serialized.length > max) {
      return { truncated: true, preview: serialized.slice(0, max) };
    }
    return value;
  } catch {
    return { unserializable: true };
  }
}

function capToolCalls(toolCalls: AdminAgentToolCall[]): AdminAgentToolCall[] {
  return toolCalls.slice(0, 20).map((tc) => ({
    name: tc.name,
    risk: tc.risk,
    status: tc.status,
    args: capValue(tc.args),
    result: capValue(tc.result),
    error: tc.error?.slice(0, 500),
  }));
}

/**
 * Persists one audit row. Never throws: auditing must not break the agent.
 *
 * Primary sink is the Drizzle `admin_agent_audit` table; if the database is not
 * configured (or the migration has not run yet) it falls back to the existing
 * Supabase `agent_logs` table so the trail is never silently lost.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  const payload = {
    adminId: entry.adminId,
    adminEmail: entry.adminEmail,
    inputMode: entry.inputMode,
    prompt: entry.prompt?.slice(0, 4000),
    transcript: entry.transcript?.slice(0, 4000),
    skillsLoaded: entry.skillsLoaded.slice(0, 20),
    toolCalls: capToolCalls(entry.toolCalls),
    status: entry.status,
    error: entry.error?.slice(0, 1000),
    durationMs: entry.durationMs,
  };

  if (isDatabaseConfigured()) {
    try {
      await getDb().insert(adminAgentAudit).values({
        adminId: entry.adminId,
        adminEmail: entry.adminEmail,
        inputMode: entry.inputMode,
        prompt: payload.prompt,
        transcript: payload.transcript,
        skillsLoaded: payload.skillsLoaded,
        toolCalls: payload.toolCalls,
        status: entry.status,
        error: payload.error,
        durationMs: entry.durationMs,
      });
      return;
    } catch (err) {
      console.warn(
        "[ai-audit] admin_agent_audit insert failed, falling back:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  try {
    await supabase.from("agent_logs").insert({
      agent: "admin-agent",
      event: "audit",
      data: payload,
    });
  } catch (err) {
    console.warn("[ai-audit] fallback agent_logs insert failed:", err instanceof Error ? err.message : err);
  }
}

export interface RecentAction {
  id: string;
  adminEmail: string | null;
  inputMode: string;
  prompt: string | null;
  skillsLoaded: string[];
  toolCalls: Array<Pick<AdminAgentToolCall, "name" | "risk" | "status" | "error">>;
  status: string;
  durationMs: number | null;
  createdAt: string;
}

/**
 * Reads the most recent agent interactions for the self-audit read tool.
 * Returns [] when the database is not configured so the tool degrades quietly.
 */
export async function listRecentActions(limit = 10): Promise<RecentAction[]> {
  if (!isDatabaseConfigured()) return [];
  const rows = await getDb()
    .select()
    .from(adminAgentAudit)
    .orderBy(desc(adminAgentAudit.createdAt))
    .limit(Math.min(Math.max(limit, 1), 50));

  return rows.map((row) => ({
    id: row.id,
    adminEmail: row.adminEmail,
    inputMode: row.inputMode,
    prompt: row.prompt ? row.prompt.slice(0, 200) : null,
    skillsLoaded: row.skillsLoaded,
    toolCalls: row.toolCalls.map((tc) => ({
      name: tc.name,
      risk: tc.risk,
      status: tc.status,
      error: tc.error?.slice(0, 200),
    })),
    status: row.status,
    durationMs: row.durationMs,
    createdAt: row.createdAt.toISOString(),
  }));
}
