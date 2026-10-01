import { NextResponse } from "next/server";
import { listContacts } from "@/lib/contacts";
import { listLeads } from "@/lib/leads";
import { listFollowUps } from "@/lib/follow-ups";
import { summariseClients } from "@/lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/contacts — one row per person for the CRM table.
 *
 * Read-only. Auth is not checked here on purpose: src/middleware.ts requires a
 * next-auth admin session for any /api/ path that is not on its public
 * allow-list, and this route is deliberately not on it. Customer contact
 * details must never be readable without a session.
 */
export async function GET() {
  try {
    const [contacts, leads, followUps] = await Promise.all([
      listContacts(),
      listLeads(),
      listFollowUps(),
    ]);

    return NextResponse.json(
      { clients: summariseClients(contacts, leads, followUps) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[api:contacts]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to load contacts" }, { status: 500 });
  }
}