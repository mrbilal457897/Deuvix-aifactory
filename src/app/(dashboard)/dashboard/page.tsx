"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Folder,
  CheckCircle,
  Clock,
  Pause,
  ImageIcon,
  Link,
  Globe,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThumbImage, thumbSrc, projectPreviewUrl } from "@/components/project-thumb";

export const dynamic = "force-dynamic";

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  image?: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "AI",
    status: "Active",
    image: "",
    url: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [fetchingOg, setFetchingOg] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/projects");
        const data = await res.json();
        if (!cancelled) setProjects(data);
      } catch {
        console.error("Failed to fetch projects");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const loadProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data);
    } catch {
      console.error("Failed to fetch projects");
    }
  };

  const openCreate = () => {
    setEditingProject(null);
    setForm({ title: "", description: "", category: "AI", status: "Active", image: "", url: "" });
    setUrlInput("");
    setShowModal(true);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setForm({
      title: project.title,
      description: project.description,
      category: project.category,
      status: project.status,
      image: project.image || "",
      url: project.url || "",
    });
    setUrlInput("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject) {
      await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, id: editingProject.id }),
      });
    } else {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setShowModal(false);
    loadProjects();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    await fetch("/api/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadProjects();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setForm({ ...form, image: data.url });
      }
    } catch {
      console.error("Upload failed");
    }
    setUploading(false);
  };

  const handleFetchOg = async () => {
    if (!urlInput.trim()) return;
    setFetchingOg(true);
    try {
      const res = await fetch("/api/fetch-og", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });
      const data = await res.json();
      if (data.image) {
        setForm((prev) => ({ ...prev, image: data.image }));
      }
    } catch {
      console.error("Failed to fetch thumbnail");
    }
    setFetchingOg(false);
  };

  const filteredProjects = useMemo(
    () =>
      projects.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [projects, searchQuery]
  );

  const stats = useMemo(
    () => [
      { label: "Total Projects", value: projects.length, icon: Folder, color: "text-primary" },
      { label: "Active", value: projects.filter((p) => p.status === "Active").length, icon: CheckCircle, color: "text-emerald-500" },
      { label: "Planning", value: projects.filter((p) => p.status === "Planning").length, icon: Clock, color: "text-amber-500" },
      { label: "Completed", value: projects.filter((p) => p.status === "Completed").length, icon: Pause, color: "text-violet-500" },
    ],
    [projects]
  );

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome, <span className="text-foreground font-medium">{session?.user?.name || session?.user?.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 self-start">
          <Button
            onClick={() => signOut({ callbackUrl: "/" })}
            variant="outline"
            className="h-11 md:h-9"
          >
            Sign Out
          </Button>
          <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 md:h-9">
            <Plus className="size-4 mr-1.5" /> New Project
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="p-5 rounded-xl bg-card border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-heading font-bold text-foreground mt-1">{stat.value}</p>
              </div>
              <div className={cn("size-10 rounded-lg bg-muted flex items-center justify-center", stat.color)}>
                <stat.icon className="size-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search projects..."
          className="pl-10 h-11 md:h-9"
        />
      </div>

      {/* Projects Table */}
      {loading ? (
        <div className="rounded-xl bg-card border border-border overflow-hidden" aria-hidden="true">
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-muted text-xs text-muted-foreground uppercase tracking-wider font-medium">
            <div className="col-span-5">Project</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Updated</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-12 gap-4 items-center px-5 py-4 border-t border-border">
              <div className="col-span-12 md:col-span-5 flex items-center gap-3">
                <div className="size-10 rounded-lg bg-muted animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 w-1/2 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
                </div>
              </div>
              <div className="hidden md:block col-span-2">
                <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
              </div>
              <div className="hidden md:block col-span-2">
                <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
              </div>
              <div className="hidden md:block col-span-2">
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              </div>
              <div className="hidden md:block col-span-1">
                <div className="h-8 w-20 ml-auto rounded-lg bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-16 rounded-xl bg-card border border-border">
          <Folder className="size-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "No projects match your search" : "No projects yet"}
          </p>
          {!searchQuery && (
            <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="size-4 mr-1.5" /> Create First Project
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-muted text-xs text-muted-foreground uppercase tracking-wider font-medium">
            <div className="col-span-5">Project</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Updated</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {/* Table Rows */}
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="grid grid-cols-12 gap-4 items-center px-5 py-4 border-t border-border hover:bg-muted/50 transition-colors"
            >
              {/* Project Info */}
              <div className="col-span-12 md:col-span-5 flex items-center gap-3">
                {project.image ? (
                  <Image
                    src={thumbSrc(project.image)}
                    alt={project.title}
                    width={40}
                    height={40}
                    unoptimized
                    className="size-10 rounded-lg object-cover bg-muted"
                  />
                ) : (
                  <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                    <Folder className="size-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{project.title}</p>
                  <p className="text-xs text-muted-foreground truncate md:hidden">{project.category} · {project.status}</p>
                </div>
              </div>

              {/* Category */}
              <div className="hidden md:block col-span-2">
                <span className="px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary">
                  {project.category}
                </span>
              </div>

              {/* Status */}
              <div className="hidden md:block col-span-2">
                <span
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium",
                    project.status === "Active" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    project.status === "Planning" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                    project.status === "Completed" && "bg-violet-500/10 text-violet-600 dark:text-violet-400",
                    project.status === "Paused" && "bg-muted text-muted-foreground"
                  )}
                >
                  {project.status}
                </span>
              </div>

              {/* Date */}
              <div className="hidden md:block col-span-2">
                <p className="text-xs text-muted-foreground">
                  {new Date(project.updatedAt).toLocaleDateString()}
                </p>
              </div>

              {/* Actions */}
              <div className="col-span-12 md:col-span-1 flex items-center justify-end gap-1">
                {(() => {
                  const previewUrl = projectPreviewUrl(project.url, project.image);
                  return previewUrl ? (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Live Preview"
                      className="size-11 md:size-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  ) : null;
                })()}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(project)}
                  className="size-11 md:size-9"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(project.id)}
                  className="size-11 md:size-9 text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-lg font-bold text-foreground">
                {editingProject ? "Edit Project" : "New Project"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Close dialog"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image Upload + URL Fetch */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Thumbnail</label>
                <div className="flex items-center gap-3">
                  {form.image ? (
                    <div className="relative size-16 rounded-lg overflow-hidden bg-muted">
                      <ThumbImage src={form.image} alt="Preview" className="object-cover" sizes="64px" />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, image: "" })}
                        className="absolute top-1 right-1 size-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center size-16 rounded-lg border-2 border-dashed border-border hover:border-primary/30 cursor-pointer transition-colors">
                      {uploading ? (
                        <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ImageIcon className="size-5 text-muted-foreground" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  <p className="text-xs text-muted-foreground">Upload image file</p>
                </div>

                {/* URL to auto-fetch thumbnail */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="Or paste project URL to auto-fetch thumbnail"
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleFetchOg}
                    disabled={fetchingOg || !urlInput.trim()}
                    className="shrink-0"
                  >
                    {fetchingOg ? (
                      <div className="size-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Link className="size-3.5 mr-1" />
                    )}
                    Fetch
                  </Button>
                </div>
                {urlInput && !form.image && !fetchingOg && (
                  <p className="text-xs text-muted-foreground mt-1.5">No thumbnail found for this URL</p>
                )}
              </div>

              {/* Project URL (Live Preview) */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Live Preview URL</label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://your-project.vercel.app"
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Visitors can open the live project from the &quot;Live Preview&quot; icon.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Title</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Project name"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Project description"
                  rows={3}
                  className="resize-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary/50"
                  >
                    <option value="AI">AI</option>
                    <option value="Automation">Automation</option>
                    <option value="Analytics">Analytics</option>
                    <option value="Security">Security</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary/50"
                  >
                    <option value="Active">Active</option>
                    <option value="Planning">Planning</option>
                    <option value="Completed">Completed</option>
                    <option value="Paused">Paused</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-11 md:h-10"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-11 md:h-10">
                  {editingProject ? "Save Changes" : "Create Project"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
