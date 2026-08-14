import type { Agent, AgentResult, AgentTask } from "./types";
import { LeadQualifierAgent } from "./lead-qualifier";
import { FollowUpSchedulerAgent } from "./follow-up-scheduler";
import { LoggerAgent } from "./tools/logger";
import { EmailTool } from "./tools/email";

const agents: Agent[] = [
  new LeadQualifierAgent(),
  new FollowUpSchedulerAgent(),
  new LoggerAgent(),
  new EmailTool(),
];

export const AGENT_REGISTRY: Record<string, Agent> = Object.fromEntries(
  agents.map((agent) => [agent.name, agent])
);

export const AGENT_TASK_TYPES: Record<string, Agent> = {
  "lead-qualify": AGENT_REGISTRY["lead-qualifier"],
  "schedule-follow-up": AGENT_REGISTRY["follow-up-scheduler"],
  log: AGENT_REGISTRY["data-logger"],
  email: AGENT_REGISTRY["email-tool"],
};

export async function runAgent(task: AgentTask): Promise<AgentResult> {
  const agent = AGENT_TASK_TYPES[task.type];
  if (!agent) {
    return { ok: false, error: `UNKNOWN_TASK_TYPE:${task.type}` };
  }
  return agent.run(task);
}

export function listAgents() {
  return agents.map((agent) => ({
    name: agent.name,
    description: agent.description,
  }));
}
