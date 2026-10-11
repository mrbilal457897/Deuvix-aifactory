import type { EvalCase, EvalLang } from "./cases";

/** What the model actually did for one case. */
export interface CapturedRun {
  text: string;
  toolNames: string[];
  error?: string;
}

export interface CaseResult {
  id: string;
  lang: EvalLang;
  pass: boolean;
  failures: string[];
  toolNames: string[];
}

function containsAll(haystack: string, needles: string[]): string[] {
  const lower = haystack.toLowerCase();
  return needles.filter((n) => !lower.includes(n.toLowerCase()));
}

function containsAny(haystack: string, needles: string[]): string[] {
  const lower = haystack.toLowerCase();
  return needles.filter((n) => lower.includes(n.toLowerCase()));
}

/**
 * Grades one captured run against its case. Pure and deterministic so the rules
 * themselves can be unit-tested without a live model.
 */
export function scoreCase(testCase: EvalCase, run: CapturedRun): CaseResult {
  const failures: string[] = [];

  if (run.error) {
    return {
      id: testCase.id,
      lang: testCase.lang,
      pass: false,
      failures: [`run error: ${run.error}`],
      toolNames: run.toolNames,
    };
  }

  if (testCase.tools && testCase.tools.length > 0) {
    const called = testCase.tools.some((t) => run.toolNames.includes(t));
    if (!called) {
      failures.push(`expected one of [${testCase.tools.join(", ")}], called [${run.toolNames.join(", ")}]`);
    }
  }

  if (testCase.forbidTools && testCase.forbidTools.length > 0) {
    const forbidden = run.toolNames.filter((t) => testCase.forbidTools!.includes(t));
    if (forbidden.length > 0) failures.push(`called forbidden [${forbidden.join(", ")}]`);
  }

  if (testCase.mustInclude && testCase.mustInclude.length > 0) {
    const missing = containsAll(run.text, testCase.mustInclude);
    if (missing.length > 0) failures.push(`reply missing [${missing.join(", ")}]`);
  }

  if (testCase.mustNotInclude && testCase.mustNotInclude.length > 0) {
    const present = containsAny(run.text, testCase.mustNotInclude);
    if (present.length > 0) failures.push(`reply contains forbidden [${present.join(", ")}]`);
  }

  return {
    id: testCase.id,
    lang: testCase.lang,
    pass: failures.length === 0,
    failures,
    toolNames: run.toolNames,
  };
}

export function scoreAll(cases: EvalCase[], runs: Map<string, CapturedRun>): CaseResult[] {
  return cases.map((c) => scoreCase(c, runs.get(c.id) ?? { text: "", toolNames: [] }));
}
