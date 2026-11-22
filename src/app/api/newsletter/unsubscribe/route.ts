import { NextResponse, type NextRequest } from "next/server";
import { findByUnsubscribeToken, unsubscribeSubscriber } from "@/lib/newsletter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) return NextResponse.redirect(new URL("/newsletter/invalid", request.url));

  try {
    const subscriber = await findByUnsubscribeToken(token);
    if (!subscriber || !subscriber.unsubscribeToken || subscriber.unsubscribeToken !== token) {
      return NextResponse.redirect(new URL("/newsletter/invalid", request.url));
    }
    const ok = await unsubscribeSubscriber(subscriber.id);
    if (!ok) return NextResponse.redirect(new URL("/newsletter/invalid", request.url));
    return NextResponse.redirect(new URL("/newsletter/unsubscribed", request.url));
  } catch (err) {
    console.error("[newsletter] unsubscribe failed:", err instanceof Error ? err.message : err);
    return NextResponse.redirect(new URL("/newsletter/invalid", request.url));
  }
}

export const GET = handle;
export const POST = handle;
