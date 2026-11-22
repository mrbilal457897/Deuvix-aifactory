"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Search, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type SubscriberStatus = "pending" | "confirmed" | "unsubscribed";
interface Subscriber {
  id: string;
  email: string;
  status: SubscriberStatus;
  source: string | null;
  createdAt: string;
  confirmedAt?: string | null;
  unsubscribedAt?: string | null;
}

const STATUS_VARIANT: Record<SubscriberStatus, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  confirmed: "default",
  unsubscribed: "destructive",
};

function fmt(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Karachi",
  });
}

export default function AdminNewsletterPage() {
  const { status } = useSession();
  const [rows, setRows] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | SubscriberStatus>("all");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/newsletter", { cache: "no-store" });
      if (!res.ok) throw new Error(`request failed (${res.status})`);
      const data = (await res.json()) as { ok: boolean; subscribers?: Subscriber[] };
      setRows(data.subscribers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load subscribers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    void load();
  }, [status, load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== "all" && row.status !== filter) return false;
      return !q || row.email.toLowerCase().includes(q);
    });
  }, [rows, query, filter]);

  async function changeStatus(row: Subscriber, next: SubscriberStatus) {
    setBusyId(row.id);
    setError("");
    try {
      const res = await fetch("/api/admin/newsletter", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, status: next }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Update failed");
      setRows((current) =>
        current.map((item) => (item.id === row.id ? { ...item, status: next } : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId("");
    }
  }

  function exportCsv() {
    const header = "email,status,source,created_at,confirmed_at,unsubscribed_at";
    const lines = visible.map((row) =>
      [row.email, row.status, row.source ?? "", row.createdAt, row.confirmedAt ?? "", row.unsubscribedAt ?? ""]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "newsletter-subscribers.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (status === "loading") return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (status !== "authenticated") {
    return <p className="p-6 text-sm text-muted-foreground">Please sign in to view subscribers.</p>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading h2-lg text-foreground">Newsletter</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} subscriber{rows.length === 1 ? "" : "s"} · double opt-in
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={visible.length === 0}>
          Export CSV
        </Button>
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search email"
            aria-label="Search subscribers by email"
            className="pl-9"
          />
        </div>
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as "all" | SubscriberStatus)}
          aria-label="Filter by status"
          className="h-10 rounded-none border border-input bg-background px-3 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="unsubscribed">Unsubscribed</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading subscribers…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No subscribers found.</p>
      ) : (
        <div className="overflow-x-auto rounded-none border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3">Email</th>
                <th className="p-3">Status</th>
                <th className="p-3">Source</th>
                <th className="p-3">Created</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="p-3">
                    <a href={`mailto:${row.email}`} className="inline-flex items-center gap-2 text-primary hover:underline">
                      <Mail className="size-3.5" />
                      {row.email}
                    </a>
                  </td>
                  <td className="p-3">
                    <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{row.source || "—"}</td>
                  <td className="p-3 text-muted-foreground">{fmt(row.createdAt)}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {row.status !== "confirmed" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === row.id}
                          onClick={() => void changeStatus(row, "confirmed")}
                        >
                          Confirm
                        </Button>
                      ) : null}
                      {row.status !== "unsubscribed" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === row.id}
                          onClick={() => void changeStatus(row, "unsubscribed")}
                        >
                          Unsubscribe
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
