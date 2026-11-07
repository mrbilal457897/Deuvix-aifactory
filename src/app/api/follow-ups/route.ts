import { NextResponse } from "next/server";
import { listFollowUps, markFollowUpStatus } from "@/lib/follow-ups";
import { summariseFollowUps, countFollowUps } from "@/lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/follow-ups — pending follow-ups, identical rows collapsed.
 *
 * PATCH resolves them as done/skipped. That write only happens when an admin
 * clicks the button in /deuvix/leads: this route never sends an email, so no
 * prospect is contacted without a human pressing Send in their own mail client.
 *
 * Auth comes from src/middleware.ts (admin session required — not allow-listed).
 */
export async function GET() {
  try {
    const followUps = await listFollowUps();
    return NextResponse.json(
      {
        followUps: summariseFollowUps(followUps),
        counts: countFollowUps(followUps),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api:follow-ups] read failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to load follow-ups" }, { status: 500 });
  }
}

const RESOLVED_STATUSES = new Set(["done", "skipped"]);

export async function PATCH(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { ids, status } = (payload ?? {}) as { ids?: unknown; status?: unknown };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
  }
  const clean = ids.filter((id): id is string => typeof id === "string" && id.length > 0);
  if (clean.length === 0) {
    return NextResponse.json({ error: "ids must contain non-empty strings" }, { status: 400 });
  }
  if (typeof status !== "string" || !RESOLVED_STATUSES.has(status)) {
    return NextResponse.json({ error: 'status must be "done" or "skipped"' }, { status: 400 });
  }

  try {
    const updated = await markFollowUpStatus(clean, status as "done" | "skipped");
    return NextResponse.json({ ok: true, updated, status });
  } catch (err) {
    console.error("[api:follow-ups] update failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not update follow-up" }, { status: 500 });
  }
}