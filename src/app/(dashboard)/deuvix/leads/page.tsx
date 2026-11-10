"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Users, Flame, Clock, AlarmClock, Mail, Eye, EyeOff, Check, Ban } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { DataTable, Badge, type Column } from "@/components/dashboard/data-table";
import {
  followUpMailto,
  type ClientSummary,
  type FollowUpSummary,
  type FollowUpCounts,
} from "@/lib/crm";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;

/**
 * Display timezone. Mirrors FALLBACK_TIMEZONE from @/lib/email/layout, but is
 * declared locally on purpose: that module imports escapeHtml from
 * src/lib/email/index.ts, which pulls nodemailer into the client bundle and
 * breaks the production build (child_process/dns are node-only).
 */
const DISPLAY_TIMEZONE = "Asia/Karachi";

const EMPTY_COUNTS: FollowUpCounts = { pending: 0, done: 0, skipped: 0, overdue: 0 };

const TABS = [
  { id: "clients", label: "Clients" },
  { id: "followups", label: "Follow-ups" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function fmt(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DISPLAY_TIMEZONE,
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

function scoreVariant(score: number | null) {
  if (score == null) return "default" as const;
  if (score >= 8) return "danger" as const;
  if (score >= 5) return "warning" as const;
  return "info" as const;
}

function statusVariant(status: ClientSummary["status"]) {
  if (status === "hot") return "danger" as const;
  if (status === "warm") return "warning" as const;
  if (status === "cold") return "info" as const;
  return "default" as const;
}

export default function LeadsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tab, setTab] = useState<TabId>("clients");
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpSummary[]>([]);
  const [counts, setCounts] = useState<FollowUpCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInternal, setShowInternal] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  /** Wall clock captured when data arrives, so render stays pure. */
  const [loadedAt, setLoadedAt] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  /**
   * Every setState below happens after an await, which keeps React from
   * cascading renders (the same shape as deaux/media/page.tsx).
   */
  const load = useCallback(async () => {
    setError(null);
    try {
      const [clientsRes, followRes] = await Promise.all([
        fetch("/api/contacts"),
        fetch("/api/follow-ups"),
      ]);
      if (!clientsRes.ok) throw new Error(`contacts request failed (${clientsRes.status})`);

      const clientsJson = await clientsRes.json();
      const parsedClients = Array.isArray(clientsJson.clients) ? clientsJson.clients : [];

      let parsedFollowUps: FollowUpSummary[] | null = null;
      let parsedCounts: FollowUpCounts | null = null;
      if (followRes.ok) {
        const followJson = await followRes.json();
        if (Array.isArray(followJson.followUps)) parsedFollowUps = followJson.followUps;
        if (followJson.counts) parsedCounts = followJson.counts;
      }

      // Single batch: one render, and a render-safe "now" for the stats below.
      setClients(parsedClients);
      setLoadedAt(Date.now());
      if (parsedFollowUps) setFollowUps(parsedFollowUps);
      if (parsedCounts) setCounts(parsedCounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load CRM data");
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

  /** Marks a follow-up (and every duplicate row it collapsed) resolved. */
  const resolve = async (row: FollowUpSummary, next: "done" | "skipped") => {
    const ids = row.duplicateIds.length ? row.duplicateIds : [row.id];
    setBusyKey(`${next}:${row.id}`);
    setError(null);
    try {
      const res = await fetch("/api/follow-ups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: next }),
      });
      if (!res.ok) throw new Error(`Could not mark ${next} (${res.status})`);
      setLoading(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyKey(null);
    }
  };

  const stats = useMemo(() => {
    const weekAgo = loadedAt - 7 * DAY;
    return {
      total: clients.length,
      hot: clients.filter((c) => c.status === "hot").length,
      recent: clients.filter((c) => new Date(c.lastContactAt).getTime() >= weekAgo).length,
      overdue: counts.overdue,
      internalHidden: followUps.filter((f) => f.isInternal).length,
    };
  }, [clients, counts.overdue, followUps, loadedAt]);

  const visibleFollowUps = useMemo(
    () => (showInternal ? followUps : followUps.filter((f) => !f.isInternal)),
    [followUps, showInternal],
  );

  const clientColumns: Column<ClientSummary>[] = [
    {
      key: "name",
      label: "Client",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.name || "(no name)"}</p>
          {row.contactCount > 1 && (
            <p className="text-[11px] text-muted-foreground">{row.contactCount} submissions</p>
          )}
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (row) => (
        <a href={`mailto:${row.email}`} className="text-primary hover:underline">
          {row.email}
        </a>
      ),
    },
    {
      key: "service",
      label: "Service",
      sortable: true,
      render: (row) => <span className="text-foreground">{row.service || "—"}</span>,
    },
    {
      key: "score",
      label: "Score",
      sortable: true,
      render: (row) => <Badge variant={scoreVariant(row.score)}>{row.score ?? "—"}</Badge>,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => (
        <Badge variant={statusVariant(row.status)}>{row.status ?? "unscored"}</Badge>
      ),
    },
    {
      // Sortable on the normalised ISO string, not on the rendered text.
      key: "lastContactAt",
      label: "Last contact",
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-foreground">{fmt(row.lastContactAt)}</p>
          <p className="text-[11px] text-muted-foreground">{relative(row.lastContactAt)}</p>
        </div>
      ),
    },
    {
      key: "contactCount",
      label: "Submissions",
      sortable: true,
      render: (row) => <span className="text-foreground">{row.contactCount}</span>,
    },
    {
      key: "greetingSent",
      label: "Greeting",
      render: (row) => (
        <Badge variant={row.greetingSent ? "success" : "danger"}>
          {row.greetingSent ? "sent" : "not sent"}
        </Badge>
      ),
    },
    {
      key: "pendingFollowUps",
      label: "Follow-ups",
      sortable: true,
      render: (row) =>
        row.pendingFollowUps > 0 ? (
          <Badge variant="warning">{row.pendingFollowUps} pending</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  const followUpColumns: Column<FollowUpSummary>[] = [
    {
      key: "dueAt",
      label: "Due",
      sortable: true,
      render: (row) => (
        <div>
          <p className={cn("font-medium", row.overdue ? "text-destructive" : "text-foreground")}>
            {fmt(row.dueAt)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {row.overdue ? `overdue ${relative(row.dueAt).replace(" ago", "")}` : relative(row.dueAt)}
          </p>
        </div>
      ),
    },
    {
      key: "name",
      label: "Client",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.name || "(no name)"}</p>
          <a href={`mailto:${row.email}`} className="text-[11px] text-primary hover:underline">
            {row.email}
          </a>
          {row.isInternal && (
            <p className="mt-1">
              <Badge variant="warning">internal / test</Badge>
            </p>
          )}
        </div>
      ),
    },
    {
      key: "subject",
      label: "Subject",
      sortable: true,
      render: (row) => <span className="text-foreground">{row.subject}</span>,
    },
    {
      key: "duplicateCount",
      label: "Rows",
      sortable: true,
      render: (row) =>
        row.duplicateCount > 1 ? (
          <Badge variant="warning">×{row.duplicateCount} identical</Badge>
        ) : (
          <span className="text-muted-foreground">1</span>
        ),
    },
    {
      key: "actions",
      label: "Action",
      render: (row) => (
        <div className="flex items-center gap-2">
          {/* Opens the admin's own mail client pre-filled. The app never sends. */}
          <a
            href={followUpMailto(row)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
          >
            <Mail className="size-3.5" />
            Draft reply
          </a>
          <button
            type="button"
            onClick={() => resolve(row, "done")}
            disabled={busyKey !== null}
            className="btn-sharp inline-flex items-center gap-1.5 rounded-none border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20 disabled:opacity-40 dark:text-emerald-400"
          >
            <Check className="size-3.5" />
            {busyKey === `done:${row.id}` ? "Saving…" : "Done"}
          </button>
          <button
            type="button"
            onClick={() => resolve(row, "skipped")}
            disabled={busyKey !== null}
            className="btn-sharp inline-flex items-center gap-1.5 rounded-none border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-40"
          >
            <Ban className="size-3.5" />
            {busyKey === `skipped:${row.id}` ? "Saving…" : "Skip"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading h1 text-foreground">Leads</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Who reached out, and when — plus the follow-ups waiting on you.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total clients" value={stats.total} icon={Users} />
        <StatCard label="Hot leads" value={stats.hot} icon={Flame} />
        <StatCard label="Last 7 days" value={stats.recent} icon={Clock} />
        <StatCard label="Overdue follow-ups" value={stats.overdue} icon={AlarmClock} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn("btn-sharp rounded-none px-4 py-2 text-sm font-medium transition-colors",
              tab === item.id
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:bg-primary/5 hover:text-foreground",
            )}
          >
            {item.label}
            {item.id === "followups" && counts.pending > 0 && (
              <span className="ml-2 text-[11px] opacity-80">{counts.pending}</span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {tab === "clients" ? (
        loading ? (
          <p className="text-sm text-muted-foreground">Loading clients…</p>
        ) : (
          <DataTable
            columns={clientColumns}
            data={clients}
            emptyIcon={<Users className="size-6 text-muted-foreground mx-auto" />}
            emptyText="No contacts yet."
          />
        )
      ) : (
        <>
          {stats.internalHidden > 0 && (
            <button
              type="button"
              onClick={() => setShowInternal((v) => !v)}
              className="btn-sharp inline-flex items-center gap-2 rounded-none border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50"
            >
              {showInternal ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {showInternal
                ? "Hide internal / test"
                : `Show internal / test (${stats.internalHidden})`}
            </button>
          )}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading follow-ups…</p>
          ) : (
            <DataTable
              columns={followUpColumns}
              data={visibleFollowUps}
              emptyIcon={<AlarmClock className="size-6 text-muted-foreground mx-auto" />}
              emptyText="Nothing pending. Inbox zero."
            />
          )}

          <p className="text-xs text-muted-foreground">
            Nothing is ever emailed automatically. “Draft reply” opens your own mail
            client with the drafted text pre-filled — you press Send. “Done” and “Skip”
            only update the status of that row.
          </p>
        </>
      )}
    </div>
  );
}