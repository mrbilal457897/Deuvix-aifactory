import { describe, expect, it } from "vitest";
import {
  buildTools,
  executeTool,
  getToolRisk,
  isWriteRisk,
  ToolExecutionError,
} from "@/lib/ai/tools/registry";
import type { ToolContext } from "@/lib/ai/tools/types";

const ctx: ToolContext = { adminId: "u1", adminEmail: "admin@example.com", role: "admin" };

describe("write tool gating", () => {
  it("classifies update_lead_status as a write", () => {
    expect(getToolRisk("update_lead_status")).toBe("write");
    expect(isWriteRisk("write")).toBe(true);
    expect(isWriteRisk("destructive")).toBe(true);
    expect(isWriteRisk("read")).toBe(false);
  });

  it("never performs the write from the model-facing toolset", async () => {
    const tools = buildTools(ctx);
    const t = tools.update_lead_status as unknown as {
      execute: (input: unknown, opts?: unknown) => Promise<unknown>;
    };
    const result = await t.execute({ leadId: "lead-1", status: "hot" });
    expect(result).toMatchObject({ status: "pending_approval" });
  });

  it("refuses to run read tools through the confirm path", async () => {
    await expect(executeTool("list_leads", {}, ctx)).rejects.toBeInstanceOf(ToolExecutionError);
  });

  it("rejects unknown tools with a 404", async () => {
    await expect(executeTool("nope", {}, ctx)).rejects.toMatchObject({ status: 404 });
  });

  it("validates arguments before executing a write", async () => {
    await expect(executeTool("update_lead_status", { leadId: "" }, ctx)).rejects.toBeInstanceOf(
      ToolExecutionError,
    );
    await expect(
      executeTool("update_lead_status", { leadId: "x", status: "lukewarm" }, ctx),
    ).rejects.toBeInstanceOf(ToolExecutionError);
  });
});
