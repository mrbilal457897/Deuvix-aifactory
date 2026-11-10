"use client";

import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Badge } from "@/components/ui/badge";
import { User, FolderOpen, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { CharReveal } from "@/components/split-text";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { blogCategories, posts } from "./posts";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const POSTS_PER_PAGE = 6;

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  const filteredPosts = posts.filter((post) => {
    return activeCategory === "All" || post.category === activeCategory;
  });

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  useEffect(() => {
    if (gridRef.current) {
      const cards = gridRef.current.querySelectorAll(".blog-card");
      gsap.fromTo(
        cards,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power2.out" }
      );
    }
  }, [activeCategory, currentPage]);

  return (
    <div>
      {/* Hero */}
      <section className="pt-8 sm:pt-12 pb-16 bg-hero-pattern relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="relative mx-auto max-w-7xl px-6 sm:px-6 lg:px-8 text-left">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Blog" }]}
          className="mb-4 sm:mb-6"
        />
        <h1 className="font-heading h2-lg mb-4">
          <CharReveal>Insights & <span className="text-gradient">AI-Native</span></CharReveal>
        </h1>
        <p className="max-w-2xl text-muted-foreground text-base">
          Deep dives into building AI-Native companies, Digital FTEs, and the future of intelligent work.
        </p>
        </div>
      </section>

      {/* Category Filters */}
      <section className="pt-12 pb-8 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap justify-center gap-2">
            {blogCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setCurrentPage(1);
                }}
                className={`btn-sharp px-5 py-2 rounded-none text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="pb-16 px-6">
        <div className="mx-auto max-w-7xl" ref={gridRef}>
          <h2 className="sr-only h2-sm">Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paginatedPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="blog-card group block bg-card rounded-xl overflow-hidden border border-border hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                {/* Image */}
                <div className="relative h-52 overflow-hidden">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <span className="absolute top-3 left-3 bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1 rounded">
                    {post.date}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-heading h3-sm text-foreground group-hover:text-primary transition-colors duration-200 mb-2 line-clamp-2">
                    {post.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <User className="size-3" />
                      {post.author}
                    </span>
                    <span>/</span>
                    <span className="flex items-center gap-1">
                      <FolderOpen className="size-3" />
                      {post.category}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>

                  <hr className="border-border mb-4" />

                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary group-hover:gap-2.5 transition-all duration-200">
                    Read More <ArrowRight className="size-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {paginatedPosts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No articles found.</p>
            </div>
          )}
        </div>
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <section className="pb-16 px-6">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn-sharp size-10 flex items-center justify-center rounded-none border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`btn-sharp size-10 flex items-center justify-center rounded-none text-sm font-medium transition-colors ${
                  currentPage === page
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "border border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn-sharp size-10 flex items-center justify-center rounded-none border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
