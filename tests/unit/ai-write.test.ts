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
  const WRITE_TOOLS = [
    "update_lead_status",
    "update_lead_priority",
    "update_lead_notes",
    "schedule_follow_up",
    "resolve_follow_up",
    "create_lead",
    "create_project",
    "update_project",
    "set_site_image",
  ];

  const DESTRUCTIVE_TOOLS = ["delete_project", "delete_media", "delete_user"];

  it("classifies every write tool as a write", () => {
    for (const name of WRITE_TOOLS) {
      expect(getToolRisk(name), name).toBe("write");
    }
    expect(isWriteRisk("write")).toBe(true);
    expect(isWriteRisk("destructive")).toBe(true);
    expect(isWriteRisk("read")).toBe(false);
  });

  it("classifies every delete tool as destructive", () => {
    for (const name of DESTRUCTIVE_TOOLS) {
      expect(getToolRisk(name), name).toBe("destructive");
    }
  });

  it("never performs writes from the model-facing toolset", async () => {
    const tools = buildTools(ctx);
    for (const name of [...WRITE_TOOLS, ...DESTRUCTIVE_TOOLS]) {
      const t = tools[name] as unknown as {
        execute: (input: unknown, opts?: unknown) => Promise<unknown>;
      };
      const result = await t.execute({ leadId: "lead-1", status: "hot", priority: "high" });
      expect(result, name).toMatchObject({ status: "pending_approval" });
    }
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
    await expect(
      executeTool("schedule_follow_up", { leadId: "x", dueInHours: -1, subject: "", body: "" }, ctx),
    ).rejects.toBeInstanceOf(ToolExecutionError);
  });

  it("validates the new dashboard write tools before executing", async () => {
    await expect(executeTool("create_project", { title: "", description: "" }, ctx)).rejects.toMatchObject({
      status: 400,
    });
    await expect(executeTool("update_project", { id: "p1" }, ctx)).rejects.toMatchObject({ status: 400 });
    await expect(
      executeTool("update_project", { id: "p1", image: "not a url" }, ctx),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      executeTool("set_site_image", { slot: "not-a-slot", imageUrl: "/images/x.png" }, ctx),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      executeTool("set_site_image", { slot: "logo", imageUrl: "javascript:alert(1)" }, ctx),
    ).rejects.toMatchObject({ status: 400 });
  });
});
