import { generateText, stepCountIs } from "ai";
import { aiConfig } from "../config";
import { checkLlmHealth } from "../health";
import { getModel } from "../provider";
import { buildSystemPrompt } from "../system-prompt";
import { buildTools } from "../tools/registry";
import type { ToolContext } from "../tools/types";
import { CASES, type EvalCase } from "./cases";
import { scoreCase, type CapturedRun, type CaseResult } from "./score";

const EVAL_CTX: ToolContext = {
  adminId: "eval",
  adminEmail: "eval@deux.local",
  role: "admin",
};

export interface EvalSummary {
  reachable: boolean;
  model?: string;
  results: CaseResult[];
  passed: number;
  failed: number;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function runCase(testCase: EvalCase, timeoutMs: number): Promise<CapturedRun> {
  try {
    const result = await withTimeout(
      generateText({
        model: getModel(),
        system: buildSystemPrompt(EVAL_CTX),
        prompt: testCase.prompt,
        tools: buildTools(EVAL_CTX),
        stopWhen: stepCountIs(aiConfig.maxSteps),
        temperature: 0,
      }),
      timeoutMs,
    );
    const toolNames = result.steps.flatMap((step) => step.toolCalls.map((call) => call.toolName));
    return { text: result.text, toolNames };
  } catch (err) {
    return { text: "", toolNames: [], error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Runs the eval set against the live model. Returns `reachable:false` (no throw)
 * when the model server is down, so the CLI can skip instead of failing CI.
 */
export async function runEvals(options: {
  filter?: string;
  timeoutMs?: number;
  onResult?: (result: CaseResult) => void;
} = {}): Promise<EvalSummary> {
  const health = await checkLlmHealth();
  if (!health.ok) {
    return { reachable: false, model: health.model, results: [], passed: 0, failed: 0 };
  }

  const cases = options.filter
    ? CASES.filter((c) => c.id.includes(options.filter!) || c.lang === options.filter)
    : CASES;

  const results: CaseResult[] = [];
  for (const testCase of cases) {
    const result = scoreCase(testCase, await runCase(testCase, options.timeoutMs ?? 60_000));
    results.push(result);
    options.onResult?.(result);
  }

  const passed = results.filter((r) => r.pass).length;
  return {
    reachable: true,
    model: health.model,
    results,
    passed,
    failed: results.length - passed,
  };
}
