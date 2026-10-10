import type { z } from "zod";

/** How dangerous a tool is. Only READ tools run without confirmation. */
export type ToolRisk = "read" | "write" | "destructive";

export type AdminRole = "admin";

export interface ToolContext {
  adminId: string;
  adminEmail: string;
  role: AdminRole;
}

/**
 * One entry in the tool registry. The same object drives three things:
 *   - the model's toolset (name/description/inputSchema/execute),
 *   - the system prompt's tool list,
 *   - the audit log's risk annotation.
 */
export interface ToolDefinition<TInput = unknown> {
  name: string;
  description: string;
  risk: ToolRisk;
  roles: AdminRole[];
  inputSchema: z.ZodType<TInput>;
  execute: (input: TInput, ctx: ToolContext) => Promise<unknown>;
}

/** Narrows a typed definition to the erased registry shape. */
export function defineTool<TInput>(def: ToolDefinition<TInput>): ToolDefinition<unknown> {
  return def as unknown as ToolDefinition<unknown>;
}
