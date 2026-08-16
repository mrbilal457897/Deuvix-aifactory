"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Folder, ExternalLink, ArrowRight } from "lucide-react";
import { ThumbImage, projectPreviewUrl } from "@/components/project-thumb";

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  image?: string;
  url?: string;
  tags?: string[];
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
      <section className="py-16 text-center px-6 bg-hero-pattern relative">
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
      <section className="py-16 px-6">
        <div className="mx-auto max-w-6xl">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground">Loading...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16">
              <Folder className="size-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground">No projects yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-6">
              {projects.map((project) => {
                const previewUrl = projectPreviewUrl(project.url, project.image);
                const tags = project.tags && project.tags.length > 0 ? project.tags.slice(0, 3) : [];
                return (
                  <div
                    key={project.id}
                    className="group rounded-2xl bg-gradient-to-br from-sky-400/70 via-indigo-500/40 to-violet-500/70 p-px shadow-lg shadow-black/20 transition-[transform,box-shadow] duration-200 active:scale-[0.99] md:rounded-xl md:bg-none md:p-0 md:shadow-none md:transition-all md:duration-300 md:hover:scale-[1.02] md:hover:shadow-lg md:hover:shadow-primary/5"
                  >
                    <div className="flex flex-col max-[479px]:flex-row overflow-hidden rounded-[15px] bg-[#1A2332] md:rounded-xl md:bg-card md:border md:border-border">
                      {/* Thumbnail */}
                      <div className="relative shrink-0 h-56 overflow-hidden md:w-full max-[479px]:w-[42%] max-[479px]:h-auto">
                        {project.image ? (
                          <ThumbImage
                            src={project.image}
                            alt={project.title}
                            className="object-cover group-hover:scale-105 transition-transform duration-500 max-[479px]:object-top"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#161E2E]">
                            <Folder className="size-8 text-slate-600" />
                          </div>
                        )}
                        <span className="absolute top-2 left-2 z-10 rounded-full border border-sky-400/40 bg-black/50 backdrop-blur-sm px-2 py-0.5 text-[9px] font-medium text-sky-300 max-[479px]:top-1.5 max-[479px]:left-1.5 max-[479px]:px-1.5 max-[479px]:text-[8px]">
                          {project.category}
                        </span>
                        {previewUrl && (
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Live Preview"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-3 right-3 z-10 flex items-center justify-center size-10 rounded-full bg-black/60 backdrop-blur-sm text-white border border-white/20 hover:bg-primary hover:scale-110 transition-all duration-200 max-[479px]:hidden"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col p-5 max-[479px]:p-3 md:p-5">
                        <h3 className="font-heading text-lg font-bold text-foreground group-hover:text-primary transition-colors max-[479px]:truncate max-[479px]:text-[15px] max-[479px]:text-white">
                          {project.title}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground leading-relaxed line-clamp-2 max-[479px]:text-xs max-[479px]:text-slate-400 max-[479px]:leading-snug">
                          {project.description}
                        </p>

                        <div className="mt-2 flex items-center justify-between gap-2 md:mt-3">
                          <div className="flex flex-wrap items-center gap-1.5 max-[479px]:gap-1">
                            {tags.length > 0 ? (
                              tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-md border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5 text-[9px] font-medium text-sky-600 dark:text-sky-400 max-[479px]:text-sky-300"
                                >
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[9px] font-medium ${statusColors[project.status] || "bg-muted text-muted-foreground"} max-[479px]:border max-[479px]:border-white/10 max-[479px]:bg-white/[0.06] max-[479px]:text-slate-300`}
                              >
                                {project.status}
                              </span>
                            )}
                          </div>

                          {previewUrl && (
                            <a
                              href={previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline max-[479px]:shrink-0 max-[479px]:min-h-11 max-[479px]:text-sky-400"
                            >
                              Case Study <ArrowRight className="size-3.5 max-[479px]:size-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
