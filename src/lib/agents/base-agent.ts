import { supabase } from "../supabase";
import type { Agent, AgentTask, AgentResult } from "./types";

async function appendLog(agent: string, event: string, data: unknown) {
  try {
    await supabase.from("agent_logs").insert({
      agent,
      event,
      data,
    });
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
