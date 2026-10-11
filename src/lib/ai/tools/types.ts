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

/**
 * Error for a tool execution that was refused. `status` maps straight to an HTTP
 * status in the confirm route. Lives here so both the registry and the write
 * tools can throw it without importing each other.
 */
export class ToolExecutionError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ToolExecutionError";
    this.status = status;
  }
}
