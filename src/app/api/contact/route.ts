import { NextResponse } from "next/server";
import { saveContact } from "@/lib/contacts";
import { runAgent } from "@/lib/agents/registry";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const { name, email, phone, service, message, portfolio, website } = body as Record<string, unknown>;

    // Honeypot: bots fill the hidden "website" field — silently accept.
    if (website) {
      return NextResponse.json({ success: true });
    }

    if (typeof name !== "string" || typeof email !== "string" || typeof message !== "string") {
      return NextResponse.json({ error: "Name, email, and message are required" }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanMessage = message.trim();
    const cleanPhone = typeof phone === "string" ? phone.trim() : "";
    const cleanService = typeof service === "string" ? service.trim() : "";
    const cleanPortfolio = typeof portfolio === "string" ? portfolio.trim() : "";

    if (!cleanName || !cleanEmail || !cleanMessage) {
      return NextResponse.json({ error: "Name, email, and message are required" }, { status: 400 });
    }

    if (!EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 200) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    if (cleanMessage.length > 5000) {
      return NextResponse.json({ error: "Message is too long (max 5000 characters)" }, { status: 400 });
    }

    const { contact, email: emailResult } = await saveContact({
      name: cleanName.slice(0, 120),
      email: cleanEmail.slice(0, 200),
      phone: cleanPhone.slice(0, 60),
      service: cleanService.slice(0, 120),
      portfolio: cleanPortfolio.slice(0, 300),
      message: cleanMessage.slice(0, 5000),
    });

    // Autonomous lead qualification (best-effort, never blocks the form response).
    let lead: { status?: string; score?: number } = {};
    try {
      const result = await runAgent({
        type: "lead-qualify",
        input: { contact },
      });
      lead = result.output || {};
    } catch {}

    return NextResponse.json(
      {
        success: true,
        leadStatus: lead.status,
        emailSent: emailResult.ok,
        emailProvider: emailResult.provider,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to submit the form. Please try again." },
      { status: 500 }
    );
  }
}
