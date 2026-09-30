import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, MessageCircle, Download } from "lucide-react";
import {
  BOOKING_FILTERS,
  bookingsToCsv,
  listBookings,
  parseBookingFilter,
} from "@/lib/bookings/queries";
import { isDatabaseConfigured } from "@/lib/db";
import { buildClientChatLink } from "@/lib/notify/whatsapp";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  rescheduled: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  cancelled: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmed",
  rescheduled: "Rescheduled",
  cancelled: "Cancelled",
};

function fmt(value: Date, timeZone?: string | null) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timeZone?.trim() || undefined,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isDatabaseConfigured()) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-heading text-2xl font-bold">Bookings</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          <code>DATABASE_URL</code> is not set, so bookings cannot be loaded. See{" "}
          <code>docs/SETUP.md</code>.
        </p>
      </main>
    );
  }

  const params = await searchParams;
  const filter = parseBookingFilter(params.filter);

  let rows: Awaited<ReturnType<typeof listBookings>> = [];
  let error: string | null = null;
  try {
    rows = await listBookings(filter);
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
    console.error("[admin/bookings]", error);
  }

  // Belt and braces: middleware already guards this route.
  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD) {
    redirect("/");
  }

  const downloadHref =
    `/api/admin/bookings/export?filter=${filter}`;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} {filter === "all" ? "total" : filter}
          </p>
        </div>
        <Button render={<a href={downloadHref} />}>
          <Download aria-hidden="true" />
          Export CSV
        </Button>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Booking filters">
        {BOOKING_FILTERS.map((value) => (
          <Link
            key={value}
            href={`/admin/bookings?filter=${value}`}
            aria-current={filter === value ? "page" : undefined}
            className={cn(
              "rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors",
              filter === value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {value}
          </Link>
        ))}
      </nav>

      {error ? (
        <p className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          Could not load bookings: {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-lg border border-border p-6 text-sm text-muted-foreground">
          No {filter === "all" ? "" : filter} bookings yet.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3">When</th>
                <th scope="col" className="px-4 py-3">Client</th>
                <th scope="col" className="px-4 py-3">Company</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Links</th>
                <th scope="col" className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const wa = buildClientChatLink(row.whatsapp, {
                  name: row.name,
                  startTime: row.startTime,
                  meetingUrl: row.meetingUrl,
                });
                return (
                  <tr key={row.id} className="border-t border-border align-top">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium">{fmt(row.startTime)}</div>
                      <div className="text-xs text-muted-foreground">
                        {fmt(row.startTime, row.timezone)} ({row.timezone || "local"})
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.name || "—"}</div>
                      {row.email ? (
                        <a href={`mailto:${row.email}`} className="text-xs text-primary hover:underline">
                          {row.email}
                        </a>
                      ) : null}
                      {row.whatsapp ? <div className="text-xs text-muted-foreground">{row.whatsapp}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.company || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-block rounded-md border px-2 py-0.5 text-xs font-medium",
                          STATUS_STYLES[row.status] ?? "",
                        )}
                      >
                        {STATUS_LABEL[row.status] ?? row.status}
                      </span>
                      {row.reminderSent ? (
                        <div className="mt-1 text-xs text-muted-foreground">reminder sent</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {row.meetingUrl ? (
                          <a
                            href={row.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            Meeting <ExternalLink className="size-3" aria-hidden="true" />
                          </a>
                        ) : null}
                        {wa ? (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            WhatsApp <MessageCircle className="size-3" aria-hidden="true" />
                          </a>
                        ) : null}
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-xs text-muted-foreground">
                      {row.notes ? <span className="line-clamp-4">{row.notes}</span> : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <details className="mt-6 text-xs text-muted-foreground">
        <summary className="cursor-pointer">Raw CSV preview ({rows.length} rows)</summary>
        <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-border bg-muted/40 p-3">
          {bookingsToCsv(rows).slice(0, 4000)}
        </pre>
      </details>
    </main>
  );
}