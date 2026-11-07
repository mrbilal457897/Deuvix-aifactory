/**
 * Admin API for contact tickets.
 * GET    /api/admin/tickets          - list tickets (with search/status filter)
 *
 * Protected by admin auth (checked via NextAuth session cookie).
 */

import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";
const TICKET_PAGE_SIZE = 50;

function requireAdmin(request: Request): { ok: true } | { ok: false; response: Response } {
  const authHeader = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");
  if (!authHeader && !cookie) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 }),
    };
  }
  return { ok: true };
}

function rowToTicket(r: any) {
  return {
    id: r.id,
    ticketId: r.ticket_id,
    status: r.status,
    emailError: r.email_error,
    name: r.name,
    email: r.email,
    company: r.company,
    phone: r.phone,
    via: r.via,
    slot: r.slot,
    nda: r.nda,
    units: r.units,
    brief: r.brief,
    startWhen: r.start_when,
    website: r.website,
    channels: r.channels,
    expectedReplyAt: r.expected_reply_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    notes: r.notes,
  };
}

export async function GET(request: Request): Promise<Response> {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const pool = getPool();
  const { searchParams } = new URL(request.url);

  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "all";

  try {
    let sql = `SELECT * FROM contact_tickets`;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(`(ticket_id ILIKE $${params.length + 1} OR name ILIKE $${params.length + 2} OR email ILIKE $${params.length + 3} OR company ILIKE $${params.length + 4})`);
      params.push(term, term, term, term);
    }

    if (status && status !== "all") {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT ${TICKET_PAGE_SIZE}`;

    const result = await pool.query(sql, params);

    return NextResponse.json({
      tickets: result.rows.map(rowToTicket),
    });
  } catch (err) {
    console.error("[admin/tickets GET] error:", err);
    return NextResponse.json({ ok: false, error: "Failed to load tickets" }, { status: 500 });
  }
}