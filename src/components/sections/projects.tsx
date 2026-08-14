"use client";

import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Badge } from "@/components/ui/badge";
import { Folder, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { CharReveal } from "@/components/split-text";
import { ThumbImage, projectPreviewUrl } from "@/components/project-thumb";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

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

export function ProjectsSection() {
  const [projects, setProjects] = useState<Project[]>([]);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!sectionRef.current || projects.length === 0) return;

    const cards = sectionRef.current.querySelectorAll(".project-card");
    gsap.fromTo(
      cards,
      { y: 30, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [projects]);

  if (projects.length === 0) return null;

  return (
    <section id="projects" className="py-24 px-4" ref={sectionRef}>
      <div className="mx-auto max-w-6xl">
        {/* Section Title */}
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Portfolio</Badge>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
            <CharReveal>Our <span className="text-gradient">Projects</span></CharReveal>
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Explore the AI solutions we&apos;ve built and deployed.
          </p>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="project-card group rounded-xl bg-card border border-border overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
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
      </div>
    </section>
  );
}
