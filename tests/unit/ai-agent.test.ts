import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aiConfig } from "@/lib/ai/config";
import {
  PROVIDER_IDS,
  isProviderId,
  providerStatuses,
  resolveProvider,
  resolveProviderId,
} from "@/lib/ai/providers";
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
  "list_follow_ups",
  "list_recent_actions",
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

  it("honours the numeric step override", () => {
    vi.stubEnv("LLM_MAX_STEPS", "4");
    expect(aiConfig.maxSteps).toBe(4);
  });

  it("falls back when a numeric override is not a number", () => {
    vi.stubEnv("LLM_TEMPERATURE", "hot");
    expect(aiConfig.temperature).toBe(0.2);
  });
});

describe("ai providers", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("exposes the three built-in providers", () => {
    expect(PROVIDER_IDS).toEqual(["gemini", "groq", "ollama"]);
    expect(isProviderId("gemini")).toBe(true);
    expect(isProviderId("openai")).toBe(false);
  });

  it("defaults to a keyless local Ollama endpoint", () => {
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("LLM_BASE_URL", "");
    vi.stubEnv("LLM_MODEL", "");
    const p = resolveProvider();
    expect(p.id).toBe("ollama");
    expect(p.baseUrl).toBe("http://localhost:11434/v1");
    expect(p.model).toBe("qwen2.5:7b");
    expect(p.apiKey).toBe("ollama");
    expect(p.configured).toBe(true);
  });

  it("resolves Gemini and requires a key", () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const missing = resolveProvider("gemini");
    expect(missing.baseUrl).toBe("https://generativelanguage.googleapis.com/v1beta/openai");
    expect(missing.model).toBe("gemini-2.5-flash");
    expect(missing.configured).toBe(false);

    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-pro");
    const ready = resolveProvider("gemini");
    expect(ready.apiKey).toBe("test-key");
    expect(ready.model).toBe("gemini-2.5-pro");
    expect(ready.configured).toBe(true);
  });

  it("resolves Groq and requires a key", () => {
    vi.stubEnv("GROQ_API_KEY", "");
    expect(resolveProvider("groq").baseUrl).toBe("https://api.groq.com/openai/v1");
    expect(resolveProvider("groq").configured).toBe(false);
    vi.stubEnv("GROQ_API_KEY", "gsk_test");
    expect(resolveProvider("groq").configured).toBe(true);
  });

  it("selects the default from AI_PROVIDER and falls back on garbage", () => {
    vi.stubEnv("AI_PROVIDER", "groq");
    expect(resolveProviderId()).toBe("groq");
    vi.stubEnv("AI_PROVIDER", "not-a-provider");
    expect(resolveProviderId()).toBe("ollama");
  });

  it("normalises base URLs and honours Ollama env overrides", () => {
    vi.stubEnv("OLLAMA_BASE_URL", "http://example.test:8080/v1/");
    vi.stubEnv("OLLAMA_MODEL", "llama3.1:8b");
    const p = resolveProvider("ollama");
    expect(p.baseUrl).toBe("http://example.test:8080/v1");
    expect(p.model).toBe("llama3.1:8b");
  });

  it("reports readiness without leaking keys", () => {
    vi.stubEnv("GEMINI_API_KEY", "secret");
    vi.stubEnv("GROQ_API_KEY", "");
    const statuses = providerStatuses();
    expect(statuses).toHaveLength(3);
    const gemini = statuses.find((s) => s.id === "gemini");
    const groq = statuses.find((s) => s.id === "groq");
    expect(gemini?.ready).toBe(true);
    expect(groq?.ready).toBe(false);
    expect(JSON.stringify(statuses)).not.toContain("secret");
  });
});

describe("ai skills loader", () => {
  beforeEach(() => resetSkills());

  it("loads the safe-actions skill by name", () => {
    const names = listSkills().map((s) => s.name);
    expect(names).toContain("safe-actions");
  });

  it("loads the phase-3 playbook skills", () => {
    const names = listSkills().map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(["lead-triage", "blog-writing", "faq-maintenance"]));
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

  it("enables READ tools plus confirmation-gated WRITE tools", () => {
    expect(ENABLED_RISKS).toEqual(["read", "write"]);
    expect(enabledDefinitions().some((t) => t.risk === "read")).toBe(true);
    expect(enabledDefinitions().some((t) => t.risk === "write")).toBe(true);
    expect(enabledDefinitions().every((t) => t.risk === "read" || t.risk === "write")).toBe(true);
  });

  it("resolves a tool's risk class and returns undefined for unknown tools", () => {
    expect(getToolRisk("list_leads")).toBe("read");
    expect(getToolRisk("update_lead_status")).toBe("write");
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
