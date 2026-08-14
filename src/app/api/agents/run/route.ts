import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agents/registry";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.type !== "string" || typeof body.input !== "object" || body.input === null) {
      return NextResponse.json({ error: "type and input are required" }, { status: 400 });
    }

    const result = await runAgent({ type: body.type, input: body.input });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Agent run failed" }, { status: 500 });
  }
}
