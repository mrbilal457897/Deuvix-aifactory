"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Search, Mail, ExternalLink, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/dashboard/data-table";
import { DataTable } from "@/components/dashboard/data-table";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;

type TicketStatus = "new" | "in_progress" | "replied" | "closed";

interface TicketRow {
  id: string;
  ticketId: string;
  status: TicketStatus;
  emailError: string | null;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  via: string;
  slot: string | null;
  nda: boolean;
  units: string[];
  brief: string;
  startWhen: string | null;
  expectedReplyAt: string;
  createdAt: string;
}

function fmt(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Karachi",
  });
}

function relative(value: string): string {
  const delta = Date.now() - new Date(value).getTime();
  const days = Math.abs(Math.round(delta / DAY));
  if (days === 0) return "today";
  if (days === 1) return delta < 0 ? "tomorrow" : "yesterday";
  if (days < 30) return delta < 0 ? `in ${days}d` : `${days}d ago`;
  const months = Math.round(days / 30);
  return delta < 0 ? `in ${months}mo` : `${months}mo ago`;
}

function statusVariant(status: TicketStatus) {
  switch (status) {
    case "new":
      return "danger" as const;
    case "in_progress":
      return "warning" as const;
    case "replied":
      return "success" as const;
    case "closed":
      return "default" as const;
  }
}

export default function TicketsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tickets", { cache: "no-store" });
      if (!res.ok) throw new Error(`Tickets request failed (${res.status})`);
      const data = await res.json();
      const rows = Array.isArray(data.tickets) ? data.tickets : [];
      setTickets(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !session) return;
    let cancelled = false;
    void (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [status, session, load]);

  const updateStatus = async (ticketId: string, nextStatus: TicketStatus) => {
    setBusyKey(ticketId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(`Status update failed (${res.status})`);
      setLoading(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyKey(null);
    }
  };

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!needle) return true;
      const haystack = `${t.ticketId} ${t.name} ${t.email} ${t.company ?? ""} ${t.units.join(" ")}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [tickets, search, statusFilter]);

  const overdueCount = visible.filter((t) => {
    if (t.status === "replied" || t.status === "closed") return false;
    return new Date(t.expectedReplyAt) < new Date();
  }).length;

  const columns: Column<TicketRow>[] = [
    {
      key: "ticketId",
      label: "Ticket ID",
      render: (row) => (
        <div>
          <a
            href={`/deuvix/tickets/${row.ticketId}`}
            className="text-foreground hover:underline font-medium"
          >
            {row.ticketId}
          </a>
        </div>
      ),
    },
    {
      key: "name",
      label: "Name",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.name}</p>
          {row.email && (
            <a href={`mailto:${row.email}`} className="text-[11px] text-primary hover:underline">
              {row.email}
            </a>
          )}
        </div>
      ),
    },
    {
      key: "units",
      label: "Units",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.units.map((u) => (
            <span key={u} className="text-[10px] font-medium text-foreground px-2 py-0.5 rounded bg-white/10 border border-white/10 dark:bg-white/5 dark:border-white/10">
              {u}
            </span>
          ))}
          {row.units.length === 0 && <span className="text-[10px] text-muted-foreground italic">—</span>}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => (
        <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
      ),
    },
    {
      key: "expectedReplyAt",
      label: "Expected reply",
      sortable: true,
      render: (row) => (
        <div>
          <p className={cn("text-sm", new Date(row.expectedReplyAt) < new Date() && row.status !== "replied" && row.status !== "closed" ? "text-destructive" : "text-foreground")}>
            {fmt(row.expectedReplyAt)}
          </p>
          <p className="text-[11px] text-muted-foreground">{relative(row.expectedReplyAt)}</p>
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Received",
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-foreground">{fmt(row.createdAt)}</p>
          <p className="text-[11px] text-muted-foreground">{relative(row.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <a href={`mailto:${row.email}`} className="text-[11px] text-primary hover:underline">
            <Mail className="size-3.5" />
          </a>
          <select
            value={row.status}
            onChange={(e) => void updateStatus(row.ticketId, e.target.value as TicketStatus)}
            disabled={busyKey === row.ticketId}
            className="text-[11px] rounded border border-border bg-card px-2 py-1 text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
          >
            <option value="new">New</option>
            <option value="in_progress">In progress</option>
            <option value="replied">Replied</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Contact tickets</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Job ticket submissions from the site contact form.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total</p>
          <p className="text-2xl font-heading font-bold text-foreground">{tickets.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">New</p>
          <p className="text-2xl font-heading font-bold text-destructive">{tickets.filter((t) => t.status === "new").length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Overdue</p>
          <p className="text-2xl font-heading font-bold text-destructive">{overdueCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Closed</p>
          <p className="text-2xl font-heading font-bold text-foreground">{tickets.filter((t) => t.status === "closed").length}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket ID, name, email…"
            className="pl-10 h-10 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary/40 rounded-xl"
          />
        </div>
        <div
          role="tablist"
          aria-label="Filter by status"
          className="flex rounded-xl border border-border bg-muted p-1"
        >
          {["all", "new", "in_progress", "replied", "closed"].map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={statusFilter === value}
              onClick={() => setStatusFilter(value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                statusFilter === value
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:bg-primary/5 hover:text-foreground",
              )}
            >
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading tickets…</p>
      ) : (
        <DataTable
          columns={columns}
          data={visible}
          emptyIcon={<Mail className="size-6 text-muted-foreground mx-auto" />}
          emptyText="No tickets yet."
        />
      )}
    </div>
  );
}

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render: (row: T) => React.ReactNode;
}