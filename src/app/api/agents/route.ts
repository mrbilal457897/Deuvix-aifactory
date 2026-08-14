import { NextResponse } from "next/server";
import { listAgents } from "@/lib/agents/registry";

export async function GET() {
  return NextResponse.json({ agents: listAgents() });
}
