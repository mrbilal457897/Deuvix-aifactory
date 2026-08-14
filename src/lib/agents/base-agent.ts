import fs from "fs/promises";
import path from "path";
import type { Agent, AgentTask, AgentResult } from "./types";

const LOG_DIR = path.join(process.cwd(), "data");
const LOG_PATH = path.join(LOG_DIR, "agent-logs.json");

async function appendLog(agent: string, event: string, data: unknown) {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    let logs: unknown[] = [];
    try {
      logs = JSON.parse(await fs.readFile(LOG_PATH, "utf-8"));
    } catch {}
    logs.push({
      ts: new Date().toISOString(),
      agent,
      event,
      data,
    });
    await fs.writeFile(LOG_PATH, JSON.stringify(logs, null, 2));
  } catch {}
}

export abstract class BaseAgent implements Agent {
  abstract name: string;
  abstract description: string;

  abstract run(task: AgentTask): Promise<AgentResult>;

  protected async log(event: string, data: unknown) {
    await appendLog(this.name, event, data);
  }
}
