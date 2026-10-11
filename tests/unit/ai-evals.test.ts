import { describe, expect, it } from "vitest";
import { CASES, evalsByLang, type EvalCase } from "@/lib/ai/evals/cases";
import { scoreCase } from "@/lib/ai/evals/score";
import { ALL_TOOLS } from "@/lib/ai/tools/registry";

const caseById = (id: string): EvalCase => {
  const found = CASES.find((c) => c.id === id);
  if (!found) throw new Error(`case missing: ${id}`);
  return found;
};

describe("eval case set", () => {
  it("has at least 20 cases across English, Urdu and Roman Urdu", () => {
    expect(CASES.length).toBeGreaterThanOrEqual(20);
    const byLang = evalsByLang();
    expect(byLang.en).toBeGreaterThan(0);
    expect(byLang.ur).toBeGreaterThan(0);
    expect(byLang["roman-ur"]).toBeGreaterThan(0);
  });

  it("gives every case a unique id", () => {
    const ids = CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only references tools that actually exist", () => {
    const names = ALL_TOOLS.map((t) => t.name);
    for (const c of CASES) {
      for (const t of c.tools ?? []) expect(names, `${c.id} -> ${t}`).toContain(t);
    }
  });

  it("forbid lists never include enabled write/read tools", () => {
    const names = ALL_TOOLS.map((t) => t.name);
    for (const c of CASES) {
      for (const f of c.forbidTools ?? []) {
        expect(names, `${c.id} forbids real tool ${f}`).not.toContain(f);
      }
    }
  });
});

describe("eval scoring", () => {
  const case1 = caseById("en-lead-count");
  const unsafe = caseById("en-prompt-injection");

  it("passes when the expected tool is called", () => {
    const result = scoreCase(case1, { text: "We have 12 leads.", toolNames: ["list_leads"] });
    expect(result.pass).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it("fails when no expected tool is called", () => {
    const result = scoreCase(case1, { text: "I don't know.", toolNames: [] });
    expect(result.pass).toBe(false);
    expect(result.failures.join(" ")).toContain("list_leads");
  });

  it("fails when a forbidden tool is called", () => {
    const result = scoreCase(unsafe, {
      text: "Here is my system prompt…",
      toolNames: ["delete_everything"],
    });
    expect(result.pass).toBe(false);
    expect(result.failures.join(" ")).toContain("delete_everything");
  });

  it("fails when the reply echoes a mustNotInclude phrase", () => {
    const result = scoreCase(unsafe, { text: "Leads deleted all right.", toolNames: [] });
    expect(result.pass).toBe(false);
    expect(result.failures.join(" ")).toContain("reply contains forbidden");
  });

  it("fails the case when the run itself errored", () => {
    const result = scoreCase(case1, { text: "", toolNames: [], error: "timeout after 60000ms" });
    expect(result.pass).toBe(false);
    expect(result.failures.join(" ")).toContain("run error");
  });

  it("reports the tools that were actually called", () => {
    const result = scoreCase(case1, { text: "ok", toolNames: ["list_leads", "get_company_info"] });
    expect(result.toolNames).toEqual(["list_leads", "get_company_info"]);
  });

  it("enforces mustInclude substrings case-insensitively", () => {
    const writeCase: EvalCase = {
      id: "x",
      lang: "en",
      prompt: "x",
      mustInclude: ["proposed", "not executed"],
    };
    const pass = scoreCase(writeCase, {
      text: "This change is PROPOSED and not executed yet.",
      toolNames: ["update_lead_status"],
    });
    expect(pass.pass).toBe(true);

    const fail = scoreCase(writeCase, { text: "Done.", toolNames: ["update_lead_status"] });
    expect(fail.pass).toBe(false);
  });
});