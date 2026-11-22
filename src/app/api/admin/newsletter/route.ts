import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/ai/auth";
import { listSubscribers, setSubscriberStatus, type SubscriberStatus } from "@/lib/newsletter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function deny(auth: { ok: boolean; error?: string; status?: number }) {
  return NextResponse.json(
    { ok: false, error: auth.error ?? "Unauthorized" },
    { status: auth.status ?? 401 },
  );
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return deny(auth);
  try {
    const subscribers = await listSubscribers();
    return NextResponse.json({ ok: true, subscribers });
  } catch (err) {
    console.error("[admin/newsletter] list failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "Could not load subscribers" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return deny(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const candidate = body as { id?: unknown; status?: unknown } | null;
  const allowed: SubscriberStatus[] = ["pending", "confirmed", "unsubscribed"];
  if (
    !candidate ||
    typeof candidate.id !== "string" ||
    !candidate.id ||
    typeof candidate.status !== "string" ||
    !allowed.includes(candidate.status as SubscriberStatus)
  ) {
    return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
  }

  try {
    const ok = await setSubscriberStatus(candidate.id, candidate.status as SubscriberStatus);
    if (!ok) return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/newsletter] status update failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "Update failed" }, { status: 500 });
  }
}
