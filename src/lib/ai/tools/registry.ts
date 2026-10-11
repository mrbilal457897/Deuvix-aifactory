import { tool, type ToolSet } from "ai";
import { aiConfig } from "../config";
import { readTools } from "./read";
import { writeTools } from "./write";
import { ToolExecutionError, type ToolContext, type ToolDefinition, type ToolRisk } from "./types";

export { ToolExecutionError };

/**
 * The one and only tool registry. READ tools run directly; WRITE and
 * DESTRUCTIVE tools are proposed and only run after the admin confirms, so the
 * risk class and confirmation rules live in exactly one place.
 */
export const ALL_TOOLS: ToolDefinition[] = [...readTools, ...writeTools];

/** Risk classes currently exposed to the model. */
export const ENABLED_RISKS: readonly ToolRisk[] = ["read", "write"];

/** Anything that is not a read must be confirmed before it can run. */
export function isWriteRisk(risk: ToolRisk | undefined): boolean {
  return risk === "write" || risk === "destructive";
}

export function enabledDefinitions(): ToolDefinition[] {
  return ALL_TOOLS.filter((t) => ENABLED_RISKS.includes(t.risk));
}

export interface ToolCatalogEntry {
  name: string;
  description: string;
  risk: ToolRisk;
}

/** Metadata only (no execute) — for the system prompt and the audit log. */
export function toolCatalog(): ToolCatalogEntry[] {
  return enabledDefinitions().map(({ name, description, risk }) => ({ name, description, risk }));
}

export function getToolRisk(name: string): ToolRisk | undefined {
  return ALL_TOOLS.find((t) => t.name === name)?.risk;
}

/** Caps what a tool feeds back to the model, so one huge result can't blow the context. */
function clampResult(value: unknown): unknown {
  try {
    const serialized = JSON.stringify(value);
    if (serialized && serialized.length > aiConfig.maxToolResultChars) {
      return {
        truncated: true,
        note: "Result was too large and has been truncated.",
        preview: serialized.slice(0, aiConfig.maxToolResultChars),
      };
    }
    return value;
  } catch {
    return value;
  }
}

/** Placeholder a write tool returns to the model — it means "not executed yet". */
const PENDING_RESULT = {
  status: "pending_approval",
  note: "This action only runs after the admin confirms it in the UI. It has NOT been performed.",
};

/** Builds the AI SDK toolset bound to the current admin. */
export function buildTools(ctx: ToolContext): ToolSet {
  const tools: ToolSet = {};
  for (const def of enabledDefinitions()) {
    if (isWriteRisk(def.risk)) {
      // The model can PROPOSE a write, never perform one. The real executor is
      // only reachable through executeTool(), called after an explicit confirm.
      tools[def.name] = tool({
        description: def.description,
        inputSchema: def.inputSchema,
        execute: async () => PENDING_RESULT,
      });
    } else {
      tools[def.name] = tool({
        description: def.description,
        inputSchema: def.inputSchema,
        execute: async (input: unknown) => clampResult(await def.execute(input, ctx)),
      });
    }
  }
  return tools;
}

/**
 * Runs a confirmed WRITE/DESTRUCTIVE tool. This is the ONLY path that executes a
 * write, and it is reachable only from the admin-guarded confirm route. Reads
 * and unknowns are rejected here so a confirm can never be used to smuggle one.
 */
export async function executeTool(
  name: string,
  input: unknown,
  ctx: ToolContext,
): Promise<unknown> {
  const def = ALL_TOOLS.find((t) => t.name === name);
  if (!def) throw new ToolExecutionError("Unknown tool.", 404);
  if (!ENABLED_RISKS.includes(def.risk)) throw new ToolExecutionError("Tool is not enabled.", 403);
  if (!isWriteRisk(def.risk)) {
    throw new ToolExecutionError("Only write actions require confirmation.", 400);
  }
  if (!def.roles.includes(ctx.role)) {
    throw new ToolExecutionError("You are not allowed to run this action.", 403);
  }

  const parsed = def.inputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ToolExecutionError(parsed.error.issues[0]?.message || "Invalid arguments.", 400);
  }
  return def.execute(parsed.data, ctx);
}
