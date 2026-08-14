import { NextResponse } from "next/server";
import { listFollowUps } from "@/lib/follow-ups";

export async function GET() {
  const followUps = await listFollowUps();
  const pending = followUps.filter((f) => f.status === "pending");
  return NextResponse.json({
    summary: { total: followUps.length, pending: pending.length },
    followUps,
  });
}
