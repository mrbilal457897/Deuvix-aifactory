/**
 * Admin API for contact tickets - detail route.
 * PATCH  /api/admin/tickets/:ticketId  - update status or notes
 */

import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
): Promise<Response> {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  const pool = getPool();
  const { ticketId } = await params;

  let body: { status?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { status: newStatus, notes } = body;

  if (newStatus !== undefined && !["new", "in_progress", "replied", "closed"].includes(newStatus)) {
    return NextResponse.json({ ok: false, error: "Invalid status value" }, { status: 400 });
  }

  try {
    const setClause: string[] = [];
    const values: unknown[] = [ticketId];
    let paramIndex = 2;

    if (newStatus !== undefined) {
      setClause.push(`status = $${paramIndex}`);
      values.push(newStatus);
      paramIndex++;
    }
    if (notes !== undefined) {
      setClause.push(`notes = $${paramIndex}`);
      values.push(notes);
      paramIndex++;
    }
    setClause.push(`updated_at = $${paramIndex}`);
    values.push(new Date().toISOString());

    const sql = `UPDATE contact_tickets SET ${setClause.join(", ")} WHERE ticket_id = $1 RETURNING id, ticket_id`;

    const result = await pool.query(sql, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ticket: result.rows[0] });
  } catch (err) {
    console.error("[admin/tickets/[id] PATCH] error:", err);
    return NextResponse.json({ ok: false, error: "Failed to update ticket" }, { status: 500 });
  }
}