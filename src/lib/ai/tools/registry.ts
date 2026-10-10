import { tool, type ToolSet } from "ai";
import { aiConfig } from "../config";
import { readTools } from "./read";
import type { ToolContext, ToolDefinition, ToolRisk } from "./types";

/**
 * The one and only tool registry. Phase 1 ships READ tools; WRITE and
 * DESTRUCTIVE tools are added here in later phases behind the same metadata, so
 * the risk class and confirmation rules live in exactly one place.
 */
export const ALL_TOOLS: ToolDefinition[] = [...readTools];

/** Risk classes currently exposed to the model. */
export const ENABLED_RISKS: readonly ToolRisk[] = ["read"];

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

/** Builds the AI SDK toolset bound to the current admin. */
export function buildTools(ctx: ToolContext): ToolSet {
  const tools: ToolSet = {};
  for (const def of enabledDefinitions()) {
    tools[def.name] = tool({
      description: def.description,
      inputSchema: def.inputSchema,
      execute: async (input: unknown) => clampResult(await def.execute(input, ctx)),
    });
  }
  return tools;
}
