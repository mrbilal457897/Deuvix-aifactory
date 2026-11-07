"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/dashboard/data-table";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Folder,
  GripVertical,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { LiveWorkForm } from "./live-work-form";
import type { Project } from "@/lib/live-work/types";

export const dynamic = "force-dynamic";

type StatusFilter = "all" | "published" | "draft";

/**
 * "Our live Work" admin.
 *
 * The list order here IS the order of the stacked blocks on the site: drag a
 * row (or use the arrow buttons) and the new order is persisted immediately.
 */
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<Project | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "ok" | "error" } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  /** Plain fetch — no state updates, so the initial load can live in `.then`. */
  const fetchAll = useCallback(async (): Promise<Project[]> => {
    const res = await fetch("/api/projects", { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load projects (${res.status})`);
    const data = await res.json();
    return Array.isArray(data) ? (data as Project[]) : [];
  }, []);

  /** Reload used after a mutation (always called from an event handler). */
  const load = useCallback(async () => {
    try {
      const data = await fetchAll();
      setProjects(data);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load projects");
    } finally {
      setLoading(false);
    }
  }, [fetchAll]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetchAll()
      .then((data) => {
        if (!cancelled) {
          setProjects(data);
          setLoadError("");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load projects");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, fetchAll]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const notify = (message: string, tone: "ok" | "error" = "ok") => setToast({ message, tone });

  /* --------------------------------------------------------- mutations -- */

  const reorder = async (ordered: Project[]) => {
    const previous = projects;
    setProjects(ordered);
    try {
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ordered.map((project) => project.id) }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || "Reorder failed");
      notify("Order saved — the site has been updated.");
    } catch (error) {
      setProjects(previous);
      notify(error instanceof Error ? error.message : "Reorder failed", "error");
    }
  };

  const moveTo = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= projects.length) return;
    const next = [...projects];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    void reorder(next);
  };

  const dropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = projects.findIndex((project) => project.id === dragId);
    const to = projects.findIndex((project) => project.id === targetId);
    if (from < 0 || to < 0) return;
    void moveTo(from, to);
  };

  const patchProject = async (project: Project, changes: Record<string, unknown>, label: string) => {
    try {
      const res = await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: project.id, ...changes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `${label} failed`);
      setProjects((prev) => prev.map((item) => (item.id === project.id ? (data as Project) : item)));
      notify(`${label} saved — the site has been updated.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : `${label} failed`, "error");
    }
  };

  const remove = async (project: Project) => {
    if (!window.confirm(`Delete "${project.name}"? Its uploaded images are removed too.`)) return;
    try {
      const res = await fetch("/api/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: project.id }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || "Delete failed");
      setProjects((prev) => prev.filter((item) => item.id !== project.id));
      notify("Project deleted.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Delete failed", "error");
    }
  };

  const duplicate = async (project: Project) => {
    try {
      const res = await fetch("/api/projects/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: project.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Duplicate failed");
      setProjects((prev) => [...prev, data as Project]);
      notify("Duplicated as a draft.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Duplicate failed", "error");
    }
  };

  /* ------------------------------------------------------------ views -- */

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return projects.filter((project) => {
      if (statusFilter !== "all" && project.status !== statusFilter) return false;
      if (!needle) return true;
      return `${project.name} ${project.slug} ${project.unitId ?? ""}`.toLowerCase().includes(needle);
    });
  }, [projects, search, statusFilter]);

  const takenSlugs = useMemo(
    () => projects.filter((p) => p.id !== editing?.id).map((p) => p.slug),
    [projects, editing]
  );
  const nextOrder = projects.reduce((max, project) => Math.max(max, project.order), 0) + 1;

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Our live Work</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back,{" "}
            <span className="text-foreground font-medium">
              {session?.user?.name || session?.user?.email}
            </span>
            . Drag a row to change the order of the blocks on the site.
          </p>
        </div>
        <Button
          onClick={() => setCreating(true)}
          className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 h-9 rounded-xl text-sm font-medium shadow-lg shadow-primary/20"
        >
          <Plus className="size-4 mr-1.5" /> New project
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total" value={projects.length} icon={Folder} />
        <StatCard label="Published" value={projects.filter((p) => p.status === "published").length} icon={Sparkles} />
        <StatCard label="Drafts" value={projects.filter((p) => p.status === "draft").length} icon={Pencil} />
        <StatCard label="Featured" value={projects.filter((p) => p.featured).length} icon={Star} />
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
          <p className="mt-1 text-xs opacity-80">
            If the message mentions a missing column, run the migration in
            <code className="mx-1 rounded bg-destructive/10 px-1">supabase/migrations/</code>
            first.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, slug or unit…"
            className="pl-10 h-10 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary/40 rounded-xl"
          />
        </div>
        <div
          role="tablist"
          aria-label="Filter by status"
          className="flex rounded-xl border border-border bg-muted p-1"
        >
          {(["all", "published", "draft"] as StatusFilter[]).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={statusFilter === value}
              onClick={() => setStatusFilter(value)}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize transition-colors ${
                statusFilter === value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Folder className="size-12 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">
              {search || statusFilter !== "all"
                ? "No projects match your filters"
                : "No projects yet — create the first block."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {filtered.map((project, index) => (
              <li
                key={project.id}
                draggable
                onDragStart={(event) => {
                  setDragId(project.id);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setOverId(project.id);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setOverId(null);
                  dropOn(project.id);
                }}
                className={`group flex items-center gap-3 px-4 py-3 transition-colors ${
                  overId === project.id && dragId !== project.id
                    ? "border-t-2 border-primary bg-primary/5"
                    : dragId === project.id
                      ? "opacity-50"
                      : "hover:bg-muted/50"
                }`}
              >
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <GripVertical className="size-4 cursor-grab active:cursor-grabbing" aria-hidden="true" />
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => moveTo(index, index - 1)}
                      disabled={index === 0}
                      aria-label={`Move ${project.name} up`}
                      className="p-0.5 rounded hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronUp className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTo(index, index + 1)}
                      disabled={index === filtered.length - 1}
                      aria-label={`Move ${project.name} down`}
                      className="p-0.5 rounded hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronDown className="size-3" />
                    </button>
                  </div>
                </div>

                {project.desktopThumbnail?.url ? (
                  <div className="relative size-14 shrink-0 rounded-xl overflow-hidden bg-muted border border-border">
                    <Image
                      src={project.desktopThumbnail.url}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover object-top"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="size-14 shrink-0 rounded-xl bg-muted border border-border flex items-center justify-center">
                    <Folder className="size-4 text-muted-foreground" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{project.name}</p>
                  <p className="text-xs text-muted-foreground truncate font-mono">
                    /{project.slug}
                    {project.unitId ? ` · ${project.unitId}` : ""}
                  </p>
                </div>

                <Badge variant={project.status === "published" ? "success" : "warning"}>
                  {project.status}
                </Badge>

                <button
                  type="button"
                  role="switch"
                  aria-checked={project.featured}
                  aria-label={`${project.featured ? "Unfeature" : "Feature"} ${project.name} on the home page`}
                  onClick={() => void patchProject(project, { featured: !project.featured }, "Featured")}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    project.featured ? "bg-primary" : "bg-muted border border-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                      project.featured ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  {project.status === "published" && (
                    <Link
                      href={`/projects/${project.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View on site"
                      className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                    >
                      <ExternalLink className="size-4" />
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => void duplicate(project)}
                    title="Duplicate as draft"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Copy className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(project)}
                    title="Edit"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(project)}
                    title="Delete"
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(creating || editing) && (
        <LiveWorkForm
          project={editing}
          takenSlugs={takenSlugs}
          nextOrder={nextOrder}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            void load();
            notify("Saved — the site has been updated.");
          }}
        />
      )}

      <div aria-live="polite" role="status" className="pointer-events-none fixed bottom-6 right-6 z-[60]">
        {toast && (
          <div
            className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-lg ${
              toast.tone === "error"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-primary/30 bg-card text-foreground"
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
