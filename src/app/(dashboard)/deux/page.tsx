"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
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
import { StatCard } from "@/components/dashboard/stat-card";
import { DataTable, Badge, type Column } from "@/components/dashboard/data-table";
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
  const [form, setForm] = useState({ title: "", description: "", category: "AI", status: "Active", image: "", url: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [fetchingOg, setFetchingOg] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/projects");
        const data = await res.json();
        if (!cancelled) setProjects(data);
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [status]);

  const loadProjects = async () => {
    const res = await fetch("/api/projects");
    setProjects(await res.json());
  };

  const openCreate = () => {
    setEditingProject(null);
    setForm({ title: "", description: "", category: "AI", status: "Active", image: "", url: "" });
    setUrlInput("");
    setShowModal(true);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setForm({ title: project.title, description: project.description, category: project.category, status: project.status, image: project.image || "", url: project.url || "" });
    setUrlInput("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject) {
      await fetch("/api/projects", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, id: editingProject.id }) });
    } else {
      await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    setShowModal(false);
    loadProjects();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    await fetch("/api/projects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
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
      if (data.url) setForm({ ...form, image: data.url });
    } catch {} finally {
      setUploading(false);
    }
  };

  const handleFetchOg = async () => {
    if (!urlInput.trim()) return;
    setFetchingOg(true);
    try {
      const res = await fetch("/api/fetch-og", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: urlInput }) });
      const data = await res.json();
      if (data.image) setForm((prev) => ({ ...prev, image: data.image }));
    } catch {} finally {
      setFetchingOg(false);
    }
  };

  const filteredProjects = useMemo(
    () => projects.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase())),
    [projects, searchQuery]
  );

  const columns: Column<Project>[] = [
    {
      key: "title",
      label: "Project",
      sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          {p.image ? (
            <Image src={thumbSrc(p.image)} alt={p.title} width={40} height={40} unoptimized className="size-10 rounded-xl object-cover bg-muted border border-border" />
          ) : (
            <div className="size-10 rounded-xl bg-muted border border-border flex items-center justify-center">
              <Folder className="size-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{p.title}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
      className: "hidden md:table-cell",
      render: (p) => <Badge variant="info">{p.category}</Badge>,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      className: "hidden md:table-cell",
      render: (p) => (
        <Badge variant={p.status === "Active" ? "success" : p.status === "Planning" ? "warning" : p.status === "Completed" ? "info" : "default"}>
          {p.status}
        </Badge>
      ),
    },
    {
      key: "updatedAt",
      label: "Updated",
      sortable: true,
      className: "hidden lg:table-cell",
      render: (p) => <span className="text-muted-foreground text-xs">{new Date(p.updatedAt).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      label: "",
      className: "w-24 text-right",
      render: (p) => (
        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {projectPreviewUrl(p.url, p.image) && (
            <a href={projectPreviewUrl(p.url, p.image)!} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors" title="Preview">
              <ExternalLink className="size-4" />
            </a>
          )}
          <button onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Edit">
            <Pencil className="size-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors" title="Delete">
            <Trash2 className="size-4" />
          </button>
        </div>
      ),
    },
  ];

  if (status === "loading" || status === "unauthenticated") {
    return <div className="flex items-center justify-center py-32"><div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome, <span className="text-foreground font-medium">{session?.user?.name || session?.user?.email}</span>
          </p>
        </div>
        <Button onClick={openCreate} className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 h-9 rounded-xl text-sm font-medium shadow-lg shadow-primary/20">
          <Plus className="size-4 mr-1.5" /> New Project
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Projects" value={projects.length} icon={Folder} />
        <StatCard label="Active" value={projects.filter((p) => p.status === "Active").length} icon={CheckCircle} />
        <StatCard label="Planning" value={projects.filter((p) => p.status === "Planning").length} icon={Clock} />
        <StatCard label="Completed" value={projects.filter((p) => p.status === "Completed").length} icon={Pause} />
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search projects..."
          className="pl-10 h-10 bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary/40 rounded-xl"
        />
      </div>

      <div className="group">
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}</div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredProjects}
            emptyIcon={<Folder className="size-12 text-muted-foreground/40 mx-auto" />}
            emptyText={searchQuery ? "No projects match your search" : "No projects yet"}
            onRowClick={openEdit}
          />
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-lg font-bold text-foreground">{editingProject ? "Edit Project" : "New Project"}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"><X className="size-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">Thumbnail</label>
                <div className="flex items-center gap-3">
                  {form.image ? (
                    <div className="relative size-16 rounded-xl overflow-hidden bg-muted border border-border">
                      <ThumbImage src={form.image} alt="Preview" className="object-cover" sizes="64px" />
                      <button type="button" onClick={() => setForm({ ...form, image: "" })} className="absolute top-1 right-1 size-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"><X className="size-3" /></button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center size-16 rounded-xl border border-dashed border-border hover:border-primary/30 cursor-pointer transition-colors">
                      {uploading ? <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <ImageIcon className="size-5 text-muted-foreground" />}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="Paste URL to auto-fetch thumbnail" className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40" />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleFetchOg} disabled={fetchingOg || !urlInput.trim()} className="shrink-0 border-border text-foreground hover:bg-muted">
                    {fetchingOg ? <div className="size-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Link className="size-3.5 mr-1" />}
                    Fetch
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">Live Preview URL</label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://your-project.vercel.app" className="pl-9 bg-muted border-border text-foreground placeholder:text-muted-foreground" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">Title</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Project name" required className="bg-muted border-border text-foreground placeholder:text-muted-foreground" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">Description</label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Project description" rows={3} className="resize-none bg-muted border-border text-foreground placeholder:text-muted-foreground" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary/40">
                    <option value="AI">AI</option>
                    <option value="Automation">Automation</option>
                    <option value="Analytics">Analytics</option>
                    <option value="Security">Security</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5 block">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary/40">
                    <option value="Active">Active</option>
                    <option value="Planning">Planning</option>
                    <option value="Completed">Completed</option>
                    <option value="Paused">Paused</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1 h-10 border-border text-foreground hover:bg-muted">Cancel</Button>
                <Button type="submit" className="flex-1 h-10 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 rounded-xl shadow-lg shadow-primary/20">
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
