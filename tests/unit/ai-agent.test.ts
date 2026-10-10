import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aiConfig } from "@/lib/ai/config";
import { listSkills, loadSkill, skillsIndexPrompt, resetSkills } from "@/lib/ai/skills";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import {
  ALL_TOOLS,
  ENABLED_RISKS,
  enabledDefinitions,
  getToolRisk,
  toolCatalog,
  buildTools,
} from "@/lib/ai/tools/registry";
import type { ToolContext } from "@/lib/ai/tools/types";

const ctx: ToolContext = { adminId: "u1", adminEmail: "admin@example.com", role: "admin" };

const READ_TOOL_NAMES = [
  "list_leads",
  "get_lead",
  "list_contacts",
  "list_bookings",
  "list_projects",
  "list_blog_posts",
  "list_faqs",
  "get_company_info",
  "get_site_stats",
  "load_skill",
];

describe("ai config", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("defaults to a local Ollama endpoint", () => {
    vi.stubEnv("LLM_BASE_URL", "");
    vi.stubEnv("LLM_MODEL", "");
    expect(aiConfig.baseUrl).toBe("http://localhost:11434/v1");
    expect(aiConfig.model).toBe("qwen2.5:7b");
    expect(aiConfig.apiKey).toBe("ollama");
  });

  it("honours env overrides and normalises the base URL", () => {
    vi.stubEnv("LLM_BASE_URL", "http://example.test:8080/v1/");
    vi.stubEnv("LLM_MODEL", "llama3.1:8b");
    vi.stubEnv("LLM_MAX_STEPS", "4");
    expect(aiConfig.baseUrl).toBe("http://example.test:8080/v1");
    expect(aiConfig.model).toBe("llama3.1:8b");
    expect(aiConfig.maxSteps).toBe(4);
  });

  it("falls back when a numeric override is not a number", () => {
    vi.stubEnv("LLM_TEMPERATURE", "hot");
    expect(aiConfig.temperature).toBe(0.2);
  });
});

describe("ai skills loader", () => {
  beforeEach(() => resetSkills());

  it("loads the safe-actions skill by name", () => {
    const names = listSkills().map((s) => s.name);
    expect(names).toContain("safe-actions");
  });

  it("advertises only the index (name + description) in the prompt", () => {
    const prompt = skillsIndexPrompt();
    expect(prompt).toContain("<skills>");
    expect(prompt).toContain("safe-actions");
    expect(prompt).toContain("untrusted");
  });

  it("loads the full body on demand and returns null for unknown skills", () => {
    const skill = loadSkill("safe-actions");
    expect(skill).not.toBeNull();
    expect(skill!.content.length).toBeGreaterThan(0);
    expect(loadSkill("not-a-skill")).toBeNull();
    expect(loadSkill("  SAFE-ACTIONS  ")).not.toBeNull();
  });
});

describe("ai tool registry", () => {
  it("exposes every read tool from read.ts", () => {
    const names = ALL_TOOLS.map((t) => t.name);
    for (const name of READ_TOOL_NAMES) expect(names).toContain(name);
  });

  it("enables READ tools only in phase 1", () => {
    expect(ENABLED_RISKS).toEqual(["read"]);
    expect(enabledDefinitions().every((t) => t.risk === "read")).toBe(true);
    expect(toolCatalog().every((t) => t.risk === "read")).toBe(true);
  });

  it("resolves a tool's risk class and returns undefined for unknown tools", () => {
    expect(getToolRisk("list_leads")).toBe("read");
    expect(getToolRisk("delete_everything")).toBeUndefined();
  });

  it("builds an AI SDK toolset bound to the admin context", () => {
    const tools = buildTools(ctx);
    expect(Object.keys(tools).sort()).toEqual(toolCatalog().map((t) => t.name).sort());
  });
});

describe("ai system prompt", () => {
  it("includes the admin identity, the tool list, and the security rule", () => {
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toContain("admin@example.com");
    expect(prompt).toContain("list_leads");
    expect(prompt.toLowerCase()).toContain("untrusted");
    expect(prompt).toContain("<tools>");
  });
});
