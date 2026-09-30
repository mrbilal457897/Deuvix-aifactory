import { NextRequest } from "next/server";
import { bookingsToCsv, listBookings, parseBookingFilter } from "@/lib/bookings/queries";
import { isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Protected by HTTP Basic Auth in src/middleware.ts (matcher covers /api/admin). */
export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "DATABASE_URL is not set" }, { status: 503 });
  }

  const filter = parseBookingFilter(request.nextUrl.searchParams.get("filter") ?? undefined);

  try {
    const rows = await listBookings(filter, 5000);
    const stamp = new Date().toISOString().slice(0, 10);

    return new Response(bookingsToCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="deux-bookings-${filter}-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[admin/bookings/export]", err instanceof Error ? err.message : err);
    return Response.json({ error: "Could not export bookings" }, { status: 500 });
  }
}