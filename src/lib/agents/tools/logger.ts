import fs from "fs/promises";
import path from "path";
import type { Agent, AgentResult, AgentTask } from "../types";

const LOG_PATH = path.join(process.cwd(), "data", "agent-logs.json");

export class LoggerAgent implements Agent {
  name = "data-logger";
  description = "Structured, append-only event logging to data/agent-logs.json";

  async run(task: AgentTask): Promise<AgentResult> {
    try {
      const { event, data } = task.input;
      const entry = {
        ts: new Date().toISOString(),
        agent: typeof task.input.agent === "string" ? task.input.agent : "system",
        event: typeof event === "string" ? event : "log",
        data: data ?? null,
      };

      await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
      let logs: unknown[] = [];
      try {
        logs = JSON.parse(await fs.readFile(LOG_PATH, "utf-8"));
      } catch {}
      logs.push(entry);
      await fs.writeFile(LOG_PATH, JSON.stringify(logs, null, 2));

      return { ok: true, output: { logged: true } };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "LOG_FAILED" };
    }
  }
}
