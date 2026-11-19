import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness probe.
 *
 * Runs a trivial Supabase round-trip (head-only count on `projects` — no row
 * data crosses the wire). Answers 200 when the DB answers, 503 otherwise.
 * No authentication — Better Stack / Hostinger uptime monitors hit this.
 * No-store, no internal details, no leaked config.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const { error, count } = await supabase
      .from("projects")
      .select("id", { head: true, count: "exact" });

    if (error) {
      console.error("[api:health] supabase check failed:", error.message);
      return NextResponse.json(
        { ok: false },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }

    // Touch `count` so a satisfied query is the only success signal.
    void count;

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error(
      "[api:health] supabase request crashed:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { ok: false },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
