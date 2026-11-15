import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Keep-alive ping for the free Supabase project.
 *
 * Supabase pauses free projects after ~7 days without activity, which blanks
 * the projects/Live Work sections until someone opens the dashboard. Vercel
 * calls this route every 3 days (see vercel.json) to keep the project active.
 *
 * Security:
 * - The route runs a trivial `head` count query (no data is returned).
 * - It only proceeds with a valid CRON_SECRET, sent either as
 *   `Authorization: Bearer <CRON_SECRET>` (Vercel Cron's default) or an
 *   `x-cron-secret: <CRON_SECRET>` header (manual trigger / curl).
 * - If Supabase itself is paused or unreachable we answer 500 so the cron run
 *   is flagged red in the Vercel dashboard instead of failing silently.
 *
 * No route data is cached: `dynamic = "force-dynamic"` plus `no-store`.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron:keep-alive] CRON_SECRET is not set - rejecting request");
    return false;
  }

  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  const direct = request.headers.get("x-cron-secret");
  const candidate = bearer ?? direct;
  if (!candidate) return false;
  return safeEqual(candidate, secret);
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  try {
    // Trivial read — proves the project is awake without returning data.
    const { error, count } = await supabase
      .from("projects")
      .select("id", { head: true, count: "exact" });

    if (error) {
      console.error("[cron:keep-alive] supabase paused or erroring:", error.message);
      return NextResponse.json(
        { ok: false, error: "supabase_unavailable", detail: error.message },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { ok: true, projects: count ?? 0, ms: Date.now() - started },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[cron:keep-alive] supabase request crashed:", message);
    return NextResponse.json(
      { ok: false, error: "supabase_unavailable", detail: message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
