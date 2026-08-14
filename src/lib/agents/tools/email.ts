import type { Agent, AgentResult, AgentTask } from "../types";
import { sendEmail } from "@/lib/email";

export class EmailTool implements Agent {
  name = "email-tool";
  description =
    "Sends transactional emails (acknowledgements, follow-ups) via the configured email provider. Only fires when RESEND_API_KEY is configured.";

  async run(task: AgentTask): Promise<AgentResult> {
    const { to, subject, html, text } = task.input as {
      to?: string;
      subject?: string;
      html?: string;
      text?: string;
    };

    if (!to || !subject) {
      return { ok: false, error: "EMAIL_MISSING_FIELDS" };
    }

    const result = await sendEmail({
      to,
      subject,
      html: html || "",
      text,
    });

    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return { ok: true, output: { id: result.id } };
  }
}
