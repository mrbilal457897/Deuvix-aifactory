import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/ai/auth";
import { checkLlmHealth } from "@/lib/ai/health";
import { listSkills } from "@/lib/ai/skills";
import { toolCatalog } from "@/lib/ai/tools/registry";

export const runtime = "nodejs";

/** Admin-only reachability probe for the model server, used by the panel UI. */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  const health = await checkLlmHealth();
  return NextResponse.json({
    ...health,
    skills: listSkills().map((s) => s.name),
    tools: toolCatalog().map((t) => t.name),
  });
}
