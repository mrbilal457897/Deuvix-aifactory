"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Folder, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThumbImage, projectPreviewUrl } from "@/components/project-thumb";

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  image?: string;
  url?: string;
}

const statusColors: Record<string, string> = {
  Active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Planning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Completed: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  Paused: "bg-muted text-muted-foreground",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pt-24">
      {/* Hero */}
      <section className="py-16 text-center px-4 bg-hero-pattern relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Portfolio</Badge>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">
          Our <span className="text-gradient">Projects</span>
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground text-lg">
          Explore the AI solutions we&apos;ve built and deployed.
        </p>
      </section>

      {/* Projects Grid */}
      <section className="py-16 px-4">
        <div className="mx-auto max-w-6xl">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground">Loading...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16">
              <Folder className="size-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground">No projects yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group rounded-xl bg-card border border-border overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                >
                  {project.image ? (
                    <div className="relative h-56 overflow-hidden">
                      <ThumbImage
                        src={project.image}
                        alt={project.title}
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      {(() => {
                        const previewUrl = projectPreviewUrl(project.url, project.image);
                        return previewUrl ? (
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Live Preview"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-3 right-3 z-10 flex items-center justify-center size-10 rounded-full bg-black/60 backdrop-blur-sm text-white border border-white/20 hover:bg-primary hover:scale-110 transition-all duration-200"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        ) : null;
                      })()}
                    </div>
                  ) : (
                    <div className="h-56 bg-muted flex items-center justify-center">
                      <Folder className="size-12 text-muted-foreground/20" />
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium">
                        {project.category}
                      </span>
                      <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", statusColors[project.status] || "bg-muted text-muted-foreground")}>
                        {project.status}
                      </span>
                    </div>
                    <h3 className="font-heading text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {project.description}
                    </p>
                    {(() => {
                      const previewUrl = projectPreviewUrl(project.url, project.image);
                      return previewUrl ? (
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                          <ExternalLink className="size-3.5" />
                          Live Preview
                        </a>
                      ) : null;
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
