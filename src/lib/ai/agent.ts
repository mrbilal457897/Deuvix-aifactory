import { streamText, stepCountIs, type ModelMessage } from "ai";
import { aiConfig } from "./config";
import { getModel } from "./provider";
import { buildSystemPrompt } from "./system-prompt";
import { buildTools, getToolRisk } from "./tools/registry";
import { listSkills } from "./skills";
import { recordAudit } from "./audit";
import type { AdminAgentToolCall } from "@/lib/db/schema";
import type { ToolContext, ToolRisk } from "./tools/types";

export type AgentStreamEvent =
  | { type: "text"; text: string }
  | { type: "tool-call"; toolCallId: string; toolName: string; risk?: ToolRisk; args: unknown }
  | { type: "tool-result"; toolCallId: string; toolName: string; result: unknown }
  | { type: "tool-error"; toolCallId: string; toolName: string; error: string }
  | { type: "error"; message: string };

export interface RunParams {
  messages: ModelMessage[];
  ctx: ToolContext;
  inputMode: "text" | "voice";
  /** The admin's message text (or the reviewed voice transcript). */
  prompt: string;
  transcript?: string;
  signal?: AbortSignal;
}

/** Shape of one part from streamText().fullStream (handled defensively). */
interface StreamPart {
  type: string;
  [key: string]: unknown;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function errorText(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  return "tool failed";
}

/**
 * Runs the single-step-per-tool loop and yields normalized events.
 *
 * The audit row is written in `finally`, so it is recorded even if the admin
 * stops the stream or the model errors. The caller appends a terminal `done`.
 */
export async function* runAdminAgent(params: RunParams): AsyncGenerator<AgentStreamEvent> {
  const started = Date.now();
  const skillsLoaded = listSkills().map((s) => s.name);
  const toolCalls: AdminAgentToolCall[] = [];
  const byId = new Map<string, AdminAgentToolCall>();
  let status: "ok" | "error" = "ok";
  let errorMessage: string | undefined;

  try {
    const result = streamText({
      model: getModel(),
      system: buildSystemPrompt(params.ctx),
      messages: params.messages,
      tools: buildTools(params.ctx),
      stopWhen: stepCountIs(aiConfig.maxSteps),
      temperature: aiConfig.temperature,
      maxRetries: 1,
      ...(params.signal ? { abortSignal: params.signal } : {}),
    });

    for await (const part of result.fullStream as unknown as AsyncIterable<StreamPart>) {
      switch (part.type) {
        case "text-delta": {
          const text = asString(part.text);
          if (text) yield { type: "text", text };
          break;
        }
        case "tool-call": {
          const toolCallId = asString(part.toolCallId);
          const toolName = asString(part.toolName);
          const args = part.input ?? part.args;
          const risk = getToolRisk(toolName);
          const record: AdminAgentToolCall = { name: toolName, risk, status: "running", args };
          if (toolCallId) byId.set(toolCallId, record);
          toolCalls.push(record);
          yield { type: "tool-call", toolCallId, toolName, risk, args };
          break;
        }
        case "tool-result": {
          const toolCallId = asString(part.toolCallId);
          const toolName = asString(part.toolName);
          const value = part.output ?? part.result;
          const record = toolCallId ? byId.get(toolCallId) : undefined;
          if (record) {
            record.status = "ok";
            record.result = value;
          }
          yield { type: "tool-result", toolCallId, toolName, result: value };
          break;
        }
        case "tool-error": {
          const toolCallId = asString(part.toolCallId);
          const toolName = asString(part.toolName);
          const message = errorText(part.error);
          const record = toolCallId ? byId.get(toolCallId) : undefined;
          if (record) {
            record.status = "error";
            record.error = message;
          }
          yield { type: "tool-error", toolCallId, toolName, error: message };
          break;
        }
        case "error": {
          status = "error";
          errorMessage = "The model request failed. Check that the LLM server is running.";
          yield { type: "error", message: errorMessage };
          break;
        }
        default:
          break;
      }
    }
  } catch (err) {
    const aborted =
      params.signal?.aborted === true || (err instanceof Error && err.name === "AbortError");
    if (!aborted) {
      status = "error";
      errorMessage = "The LLM server is unavailable. Start Ollama (or set LLM_BASE_URL), then retry.";
      yield { type: "error", message: errorMessage };
    }
  } finally {
    await recordAudit({
      adminId: params.ctx.adminId,
      adminEmail: params.ctx.adminEmail,
      inputMode: params.inputMode,
      prompt: params.prompt,
      transcript: params.transcript,
      skillsLoaded,
      toolCalls,
      status,
      error: errorMessage,
      durationMs: Date.now() - started,
    });
  }
}
