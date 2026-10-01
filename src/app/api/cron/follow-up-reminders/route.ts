import { timingSafeEqual } from "node:crypto";
import { listFollowUps } from "@/lib/follow-ups";
import { summariseFollowUps, countFollowUps } from "@/lib/crm";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dry-run reminder for overdue follow-ups.
 *
 * This route deliberately CANNOT email anyone. It counts what is due, writes a
 * line to agent_logs, and returns the list. Outbound mail stays a human action
 * in /deux/leads, because the stored follow-up bodies are generic boilerplate
 * and the queue contains test mailboxes and our own accounts.
 */

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron:follow-up-reminders] CRON_SECRET is not set - rejecting request");
    return false;
  }

  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  const direct = request.headers.get("x-cron-secret");

  const candidate = bearer ?? direct;
  if (!candidate) return false;
  return safeEqual(candidate, secret);
}

async function run(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const followUps = await listFollowUps();
    const counts = countFollowUps(followUps);
    const due = summariseFollowUps(followUps);
    const actionable = due.filter((row) => !row.isInternal);

    // Audit trail only. Nothing is emailed and no follow-up status changes.
    const { error } = await supabase.from("agent_logs").insert({
      ts: new Date().toISOString(),
      agent: "follow-up-reminder",
      event: "follow_ups_due",
      data: {
        pending: counts.pending,
        overdue: counts.overdue,
        actionable: actionable.length,
        internalExcluded: due.length - actionable.length,
      },
    });
    if (error) {
      console.error("[cron:follow-up-reminders] log failed:", error.message);
    }

    return Response.json({
      ok: true,
      mode: "dry-run",
      sent: 0,
      counts,
      dueGroups: due.length,
      actionableGroups: actionable.length,
      internalExcluded: due.length - actionable.length,
      actionable: actionable.map((row) => ({
        email: row.email,
        name: row.name,
        dueAt: row.dueAt,
        overdue: row.overdue,
        subject: row.subject,
        rows: row.duplicateCount,
      })),
      hint: "No mail was sent. Open /deux/leads to draft replies.",
    });
  } catch (err) {
    console.error(
      "[cron:follow-up-reminders] failed:",
      err instanceof Error ? err.message : err,
    );
    return Response.json({ error: "Follow-up scan failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}