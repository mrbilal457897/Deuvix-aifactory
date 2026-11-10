"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Mail, Phone, Copy, Clock, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/dashboard/data-table";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;

type TicketStatus = "new" | "in_progress" | "replied" | "closed";

interface TicketDetail {
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
  website: string | null;
  channels: string[];
  expectedReplyAt: string;
  createdAt: string;
  updatedAt: string;
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

export default function TicketDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const load = useCallback(async () => {
    if (!params.ticketId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tickets/${params.ticketId}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Ticket request failed (${res.status})`);
      const data = await res.json();
      setTicket(data.ticket);
      setNotes(data.notes || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load ticket");
    } finally {
      setLoading(false);
    }
  }, [params.ticketId, router]);

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
  }, [status, session, params.ticketId, router]);

  const updateStatus = async (nextStatus: TicketStatus) => {
    if (!ticket) return;
    setBusyKey(ticket.ticketId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tickets/${ticket.ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(`Status update failed (${res.status})`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyKey(null);
    }
  };

  const saveNotes = async () => {
    if (!ticket) return;
    setBusyKey(ticket.ticketId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tickets/${ticket.ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error(`Notes update failed (${res.status})`);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Notes update failed");
    } finally {
      setBusyKey(null);
    }
  };

  if (loading || !ticket) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isOverdue = ticket.status !== "replied" && ticket.status !== "closed" && new Date(ticket.expectedReplyAt) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading h1 text-foreground">Ticket {ticket.ticketId}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Job ticket from {ticket.name} • {ticket.email}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant(ticket.status)}>{ticket.status}</Badge>
          {isOverdue && (
            <Badge variant="danger">Overdue</Badge>
          )}
          <Button
            type="button"
            onClick={() => load()}
            disabled={busyKey === ticket.ticketId}
            className="text-[11px] rounded-lg border border-border bg-card px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
          >
            <RefreshCw className="size-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-heading h3-lg text-foreground mb-4">Ticket details</h3>
            <dl className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ticket ID</span>
                <span className="font-mono text-foreground font-medium">{ticket.ticketId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Name</span>
                <span className="text-foreground font-medium">{ticket.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <a href={`mailto:${ticket.email}`} className="text-primary hover:underline font-medium">{ticket.email}</a>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phone</span>
                <span className="text-foreground font-medium">{ticket.phone || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Company</span>
                <span className="text-foreground font-medium">{ticket.company || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Website</span>
                <span className="text-foreground font-medium">{ticket.website || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Units</span>
                <span className="text-foreground font-medium">{ticket.units.join(", ")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Start when</span>
                <span className="text-foreground font-medium">{ticket.startWhen || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Channels</span>
                <span className="text-foreground font-medium">{ticket.channels.join(", ") || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reply via</span>
                <span className="text-foreground font-medium">{ticket.via}{ticket.slot ? ` · ${ticket.slot}` : ""}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">NDA requested</span>
                <span className="text-foreground font-medium">{ticket.nda ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expected reply</span>
                <span className={cn("text-foreground font-medium", isOverdue ? "text-destructive" : "")}>
                  {fmt(ticket.expectedReplyAt)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Received</span>
                <span className="text-foreground font-medium">{fmt(ticket.createdAt)}</span>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-heading h3-lg text-foreground mb-4">Brief</h3>
            <div className="rounded-lg border border-border bg-background dark:bg-white/5 p-4 text-sm text-foreground dark:text-white leading-relaxed whitespace-pre-wrap">
              {ticket.brief}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-heading h3-lg text-foreground mb-4">Status</h3>
            <div className="space-y-3">
              <Badge variant={statusVariant(ticket.status)}>
                {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
              </Badge>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-muted-foreground dark:text-white/60">Change status</label>
                <select
                  value={ticket.status}
                  onChange={(e) => void updateStatus(e.target.value as TicketStatus)}
                  disabled={busyKey === ticket.ticketId}
                  className="text-[11px] rounded border border-border bg-card px-2 py-1 text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
                >
                  <option value="new">New</option>
                  <option value="in_progress">In progress</option>
                  <option value="replied">Replied</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              {busyKey === ticket.ticketId && (
                <p className="text-[11px] text-muted-foreground">Updating…</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-heading h3-lg text-foreground mb-4">Internal notes</h3>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes…"
              rows={6}
              className="w-full resize-none rounded-lg border border-border bg-background dark:bg-white/10 text-foreground dark:text-white placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <div className="mt-2 flex justify-end">
              <Button
                onClick={saveNotes}
                disabled={busyKey === ticket.ticketId || notes === ""}
                className="text-[11px] px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
              >
                {notesSaved ? "Saved ✓" : "Save notes"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-heading h3-lg text-foreground mb-4">Quick actions</h3>
            <div className="space-y-2">
              <a
                href={`mailto:${ticket.email}`}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                <Mail className="size-4" />
                <span>Reply by email</span>
              </a>
              {ticket.phone && (
                <a
                  href={`https://wa.me/${ticket.phone.replace(/\D/g, "")}?text=Hi%20${encodeURIComponent(ticket.name)}%2C%20this%20is%20Deuvix%20AI%20Factory%20regarding%20ticket%20${ticket.ticketId}.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <Phone className="size-4" />
                  <span>Message on WhatsApp</span>
                </a>
              )}
              <a
                href="/book-a-call"
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                <Clock className="size-4" />
                <span>Book a call</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}