export interface AgentTask {
  type: string;
  input: Record<string, unknown>;
}

export interface AgentResult {
  ok: boolean;
  output?: Record<string, unknown>;
  error?: string;
}

export interface Agent {
  name: string;
  description: string;
  run(task: AgentTask): Promise<AgentResult>;
}
