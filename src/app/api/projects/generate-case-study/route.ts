import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "ai";
import { requireAdmin } from "@/lib/ai/auth";
import { getModel } from "@/lib/ai/provider";

const statSchema = z.object({
  value: z.string().trim().min(1).max(24),
  label: z.string().trim().min(1).max(32),
});

const generateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(4000),
  liveUrl: z.string().trim().max(500).optional(),
  browserUrlLabel: z.string().trim().max(120).optional(),
  unitId: z.string().trim().max(32).optional(),
  tags: z.array(z.string().trim().max(24)).max(4).default([]),
  stats: z.array(statSchema).max(3).default([]),
});

function stripCodeFence(text: string): string {
  return text
    .replace(/^```(?:markdown)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

/**
 * Generates a Markdown case study from the project brief. The admin reviews
 * and edits the result before saving — this route never writes to the DB.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error || "Unauthorized" }, { status: admin.status ?? 401 });
  }

  try {
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Add at least a project name and description before generating the case study." },
        { status: 400 },
      );
    }

    const { name, description, liveUrl, browserUrlLabel, unitId, tags, stats } = parsed.data;
    const tagList = tags.length ? tags.join(", ") : "not provided";
    const statList = stats.length
      ? stats.map((stat) => `${stat.value} ${stat.label}`).join("; ")
      : "not provided";

    const prompt = [
      `Project: ${name}`,
      `Brief: ${description}`,
      `Live site: ${liveUrl || browserUrlLabel || "not provided"}`,
      `Unit ID: ${unitId || "not provided"}`,
      `Tags: ${tagList}`,
      `Real metrics provided: ${statList}`,
      "",
      "Write a concise B2B case study in Markdown. Structure:",
      "## The problem",
      "## What we shipped",
      "## The outcome",
      "",
      "Rules: use only the facts in the brief; if a number or client name is missing, write outcome in directional terms rather than inventing figures; keep it under 800 words; no preamble; no code fences; no placeholder brackets.",
    ].join("\n");

    const result = await generateText({
      model: getModel(),
      system:
        "You are DEUVIX's senior case-study writer. Write sharp, factual, human copy for a premium AI-workforce company. Output only the finished Markdown case study.",
      prompt,
      temperature: 0.6,
      maxRetries: 1,
    });

    const content = stripCodeFence(result.text ?? "");
    if (!content) {
      return NextResponse.json({ error: "The AI returned an empty case study — try again." }, { status: 502 });
    }

    return NextResponse.json({ content });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Case study generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
