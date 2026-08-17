import { supabase } from "../../supabase";
import type { Agent, AgentResult, AgentTask } from "../types";

export class LoggerAgent implements Agent {
  name = "data-logger";
  description = "Structured, append-only event logging to Supabase agent_logs";

  async run(task: AgentTask): Promise<AgentResult> {
    try {
      const { event, data } = task.input;

      await supabase.from("agent_logs").insert({
        agent: typeof task.input.agent === "string" ? task.input.agent : "system",
        event: typeof event === "string" ? event : "log",
        data: data ?? null,
      });

      return { ok: true, output: { logged: true } };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "LOG_FAILED" };
    }
  }
}
