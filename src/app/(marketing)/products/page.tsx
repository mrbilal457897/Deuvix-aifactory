"use client";

import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  Check,
  Sparkles,
  MessageCircle,
  HeartPulse,
  GitBranch,
  BookOpen,
  Users,
  Plug,
  Database,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { BookCallButton } from "@/components/book-call-button";
import { ReadyCta } from "@/components/ReadyCta";
import { Badge } from "@/components/ui/badge";
import { CharReveal } from "@/components/split-text";
import { TrustBar } from "@/components/sections/trust-bar";
import { buildBusinessChatLink } from "@/lib/notify/whatsapp";
import { company } from "@config/company";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import "@/app/loop-anim.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const categories = ["All", "FTE", "FDE", "Agents", "E-books", "Web Apps", "Solutions"];

const products = [
  {
    id: 1,
    anchor: "digital-fte-deployment",
    title: "Digital FTE Deployment",
    description: "Deploy AI workers that operate 24/7, 168 hours a week. Domain-specific agents that handle your business tasks at 85% cost savings.",
    category: "FTE",
    color: "bg-primary/10 text-primary",
    features: ["24/7 Operation", "Domain Expertise", "Instant Scaling"],
  },
  {
    id: 2,
    anchor: "fde-consulting",
    title: "Forward Deployed Engineer",
    description: "Expert engineers deployed to your site to implement AI-native solutions. Spec-driven development with production-ready architecture.",
    category: "FDE",
    color: "bg-secondary/10 text-secondary",
    features: ["On-site Implementation", "Spec-Driven", "Full Stack AI"],
  },
  {
    id: 3,
    anchor: "ai-chatbots",
    title: "AI Chatbots",
    description: "Conversational AI assistants deployed on your website or product. Trained on your business data to qualify leads, answer questions, and resolve support tickets 24/7.",
    category: "Agents",
    color: "bg-sky-500/10 text-sky-600",
    features: ["Instant Deployment", "Trained on Your Data", "Human Handoff"],
  },
  {
    id: 4,
    anchor: "voice-agents",
    title: "Voice Agents",
    description: "AI phone agents that answer calls, qualify leads, and run support conversations in natural language. Your business never misses a call, day or night.",
    category: "Agents",
    color: "bg-violet-500/10 text-violet-600",
    features: ["Natural Conversations", "Lead Qualification", "24/7 Availability"],
  },
  {
    id: 5,
    anchor: "custom-agents",
    title: "Custom Agents",
    description: "Bespoke AI agents engineered for your domain-specific workflows. From triage to reporting, we design agents that act on your tools — not just suggest.",
    category: "Agents",
    color: "bg-teal-500/10 text-teal-600",
    features: ["Domain-Specific Design", "Tool Integration (MCP)", "Human-Gated Actions"],
  },
  {
    id: 6,
    anchor: "ai-agent-ebooks",
    title: "AI Agent E-books",
    description: "Comprehensive guides to building AI-Native companies. Learn to manufacture, deploy, and monetize Digital FTEs with co-learning philosophy.",
    category: "E-books",
    color: "bg-amber-500/10 text-amber-600",
    features: ["Step-by-Step Guides", "Real Case Studies", "Production Focus"],
  },
  {
    id: 7,
    anchor: "ai-powered-web-apps",
    title: "AI-Powered Web Apps",
    description: "Full-stack web applications built with AI-native architecture. From concept to deployment with intelligent automation baked in.",
    category: "Web Apps",
    color: "bg-rose-500/10 text-rose-600",
    features: ["AI-Native Architecture", "Real-time Processing", "Cloud Deployed"],
  },
  {
    id: 8,
    anchor: "business-ai-solutions",
    title: "Business AI Solutions",
    description: "End-to-end AI strategy, consulting, and implementation. Transform your business with intelligent systems built for your domain.",
    category: "Solutions",
    color: "bg-secondary/10 text-secondary",
    features: ["Strategy Consulting", "Custom Development", "Ongoing Support"],
  },
];

const plans = [
  {
    name: "Starter",
    price: "Custom quote",
    forWho: "Solo founders and small teams running one repeatable workflow.",
    description: "For small teams getting started with AI",
    features: ["1 Digital FTE", "Basic Agent Setup", "Email support", "Community access"],
    popular: false,
  },
  {
    name: "Professional",
    price: "Custom quote",
    forWho: "Growing companies scaling from one to many AI workers.",
    description: "Full power for growing AI-Native companies",
    features: ["5 Digital FTEs", "Custom Agent Training", "Priority support", "FDE consultation", "Analytics dashboard"],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom quote",
    forWho: "Organisations needing dedicated delivery and compliance.",
    description: "Tailored solutions with dedicated support",
    features: ["Unlimited FTEs", "Dedicated FDE team", "SLA guarantee", "On-premise option", "Custom integrations"],
    popular: false,
  },
];

const loopParts = [
  {
    number: "01",
    title: "Heartbeat",
    tagline: "starts the work",
    description: "A schedule or event that starts each beat. Without it, you have one run, not a loop.",
    role: "Starts the work",
    icon: HeartPulse,
  },
  {
    number: "02",
    title: "Worktree",
    tagline: "keeps work safe",
    description: "Isolation, so parallel agents never overwrite each other's work — one checkout per task.",
    role: "Keeps work safe",
    icon: GitBranch,
  },
  {
    number: "03",
    title: "Skill",
    tagline: "carries context",
    description: "Project knowledge written down once, so no run starts from nothing.",
    role: "Carries the context",
    icon: BookOpen,
  },
  {
    number: "04",
    title: "Subagents",
    tagline: "maker & checker",
    description: "The maker-checker split: the agent that builds is never the agent that grades.",
    role: "Checks the work",
    icon: Users,
  },
  {
    number: "05",
    title: "Connector (MCP)",
    tagline: "acts in your tools",
    description: "Reaches your real tools — PRs, tickets, databases — so the loop acts, not just suggests.",
    role: "Acts in your tools",
    icon: Plug,
  },
  {
    number: "06",
    title: "Spine",
    tagline: "remembers between runs",
    description: "State and memory between runs. The model forgets everything between runs; the repo does not.",
    role: "Remembers between runs",
    icon: Database,
  },
  {
    number: "07",
    title: "Human Gate",
    tagline: "keeps trust",
    description: "A loop never removes judgment — it removes typing. You keep intent and accountability: every risky call comes to you for approval. No spine, no loop; no human gate, no trust.",
    role: "Keeps trust in the loop",
    icon: ShieldCheck,
  },
];

const LOOP_NODE_COUNT = 7;
const LOOP_RADIUS = 0.4;

function loopPoint(i: number, scale = 1000) {
  const angle = ((-90 + (i * 360) / LOOP_NODE_COUNT) * Math.PI) / 180;
  return {
    x: (0.5 + LOOP_RADIUS * Math.cos(angle)) * scale,
    y: (0.5 + LOOP_RADIUS * Math.sin(angle)) * scale,
  };
}

const loopPathPoints = Array.from({ length: LOOP_NODE_COUNT }, (_, i) => loopPoint(i));
const loopPointsStr = loopPathPoints.map((p) => `${p.x},${p.y}`).join(" ");

function pointOnLoop(t: number) {
  const seg = LOOP_NODE_COUNT;
  const pos = t * seg;
  const idx = Math.floor(pos) % seg;
  const local = pos - Math.floor(pos);
  const a = loopPathPoints[idx];
  const b = loopPathPoints[(idx + 1) % seg];
  return { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local };
}

export default function ProductsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeNode, setActiveNode] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const particleRef = useRef<SVGCircleElement>(null);
  const particleGlowRef = useRef<SVGCircleElement>(null);

  const filteredProducts =
    activeCategory === "All"
      ? products
      : products.filter((p) => p.category === activeCategory);

  useEffect(() => {
    if (gridRef.current) {
      gsap.fromTo(
        gridRef.current.querySelectorAll(".product-card"),
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: "power2.out" }
      );
    }
  }, [activeCategory]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-loop-reveal]",
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: { trigger: section, start: "top 75%" },
        }
      );

      gsap.fromTo(
        "[data-loop-node]",
        { scale: 0.8, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: "back.out(1.6)",
          scrollTrigger: { trigger: section, start: "top 70%" },
        }
      );

      const dot = particleRef.current;
      const glow = particleGlowRef.current;
      if (dot && glow) {
        const proxy = { t: 0 };
        gsap.to(proxy, {
          t: 1,
          duration: 9,
          ease: "none",
          repeat: -1,
          onUpdate: () => {
            const p = pointOnLoop(proxy.t);
            dot.setAttribute("cx", String(p.x));
            dot.setAttribute("cy", String(p.y));
            glow.setAttribute("cx", String(p.x));
            glow.setAttribute("cy", String(p.y));
          },
        });
      }
    }, section);

    return () => ctx.revert();
  }, []);

  const active = loopParts[activeNode];
  const ActiveIcon = active.icon;

  return (
    <div>
      <section className="pt-8 sm:pt-12 pb-16 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-background/85" />
          <div className="absolute inset-0 bg-dots opacity-30" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 sm:px-6 lg:px-8 text-left">
          <Breadcrumb
            items={[{ label: "Home", href: "/" }, { label: "Services" }]}
            className="mb-4 sm:mb-6"
          />
          <h1 className="font-heading h2-lg mb-4">
            <CharReveal>AI-Native <span className="text-gradient">Solutions</span></CharReveal>
          </h1>
          <p className="max-w-2xl text-muted-foreground text-base">
            From Digital FTEs to full business transformation — we build the AI workforce your company needs.
          </p>
        </div>
      </section>

      <TrustBar />

      <section className="py-8 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`btn-sharp px-5 py-2 rounded-none text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                id={product.anchor}
                className="product-card scroll-mt-28 p-6 rounded-xl card-solid hover:border-primary/30 transition-all duration-200"
              >
                <div className={`inline-flex items-center justify-center size-10 rounded-xl ${product.color} mb-4`}>
                  <Sparkles className="size-5" />
                </div>
                <Badge variant="secondary" className="mb-3 text-xs">{product.category}</Badge>
                <h2 className="font-heading h3-sm mb-2">{product.title}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{product.description}</p>
                <ul className="space-y-1.5 mb-5">
                  {product.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="size-3.5 text-primary shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 mt-4">
                  <Link
                    href={`/contact?service=${encodeURIComponent(product.title)}`}
                    className={buttonVariants({ variant: "outline", size: "sm", className: "flex-1" })}
                  >
                    Learn More <ArrowRight className="size-3.5 ml-1.5" />
                  </Link>
                  <a
                    href={buildBusinessChatLink(`Hi! I'm interested in your ${product.title} service. Can you share more details?`) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className:
                        "shrink-0 border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary/20 hover:text-secondary dark:text-secondary dark:hover:bg-secondary/30 dark:hover:text-secondary",
                    })}
                  >
                    <MessageCircle className="size-3.5" />
                    <span className="sr-only sm:not-sr-only sm:ml-1.5">WhatsApp</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Loop Engineering */}
      <section id="loop-engineering" ref={sectionRef} className="relative overflow-hidden bg-[#0F172A] py-24 px-6">
        <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-sky-500/10 blur-[120px]" />
        <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-violet-500/10 blur-[120px]" />
        <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-indigo-500/10 blur-[100px]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <Badge className="mb-4 border-sky-400/30 bg-sky-400/10 text-sky-300" data-loop-reveal>Methodology</Badge>
            <h2 className="font-heading h2-lg mb-4 text-white" data-loop-reveal>
              Loop <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">Engineering</span>
            </h2>
            <p className="mx-auto max-w-2xl text-slate-400 text-base" data-loop-reveal>
              A loop starts work, checks it, records the result, and repeats on its own. The prompt was yesterday — today we design the loop. Each beat runs unattended; you only see the calls that matter.
            </p>
          </div>

          {/* Desktop orbital loop */}
          <div className="relative mx-auto hidden aspect-square w-full max-w-3xl lg:block">
            <div aria-hidden className="absolute inset-[16%] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.16),transparent_70%)]" />

            <svg viewBox="0 0 1000 1000" className="absolute inset-0 h-full w-full overflow-visible">
              <defs>
                <linearGradient id="loop-grad" x1="0" y1="0" x2="1000" y2="1000" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="55%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <polyline points={loopPointsStr} fill="none" stroke="url(#loop-grad)" strokeOpacity="0.12" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points={loopPointsStr} fill="none" stroke="url(#loop-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points={loopPointsStr} fill="none" stroke="url(#loop-grad)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 30" className="loop-flow" />
              <circle ref={particleGlowRef} r="10" fill="#818cf8" opacity="0.3" />
              <circle ref={particleRef} r="4.5" fill="#e0e7ff" />
            </svg>

            {/* Center hub — shows the active node detail */}
            <div className="absolute left-1/2 top-1/2 w-[40%] -translate-x-1/2 -translate-y-1/2">
              <div
                data-loop-node
                className="flex aspect-square flex-col items-center justify-center rounded-full border border-white/10 bg-[#0b1322]/85 p-8 text-center shadow-[0_0_80px_rgba(99,102,241,0.25)] backdrop-blur-xl"
              >
                <span className="font-mono text-xs uppercase tracking-[0.35em] text-sky-300/70">{active.tagline}</span>
                <div className="mt-3 flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-600 shadow-lg shadow-indigo-500/40">
                  <ActiveIcon className="size-5 text-white" />
                </div>
                <h3 className="mt-3 font-heading h3-sm text-white">{active.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{active.description}</p>
                <span className="mt-3 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-300">{active.role}</span>
              </div>
            </div>

            {/* Loop nodes */}
            {loopParts.map((part, i) => {
              const pos = loopPoint(i, 100);
              const isGate = i === loopParts.length - 1;
              const selected = i === activeNode;
              return (
                <div
                  key={part.title}
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                >
                  <button
                    type="button"
                    data-loop-node
                    onClick={() => setActiveNode(i)}
                    onMouseEnter={() => setActiveNode(i)}
                    className={`btn-sharp group relative text-left transition-all duration-300 ${
                      isGate ? "w-[196px]" : "w-[172px]"
                    } ${selected ? "scale-[1.06]" : "hover:scale-[1.03]"}`}
                  >
                    {isGate && (
                      <span aria-hidden className="pointer-events-none absolute -inset-2 rounded-2xl border border-sky-400/30 loop-node-pulse" />
                    )}
                    <div
                      className={`relative rounded-xl border p-3 backdrop-blur-md transition-colors duration-300 ${
                        selected
                          ? "border-sky-400/60 bg-gradient-to-b from-sky-500/20 to-violet-500/20 shadow-[0_0_30px_rgba(56,189,248,0.25)]"
                          : "border-white/10 bg-white/[0.04] hover:border-indigo-400/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-300 ${
                            selected
                              ? "bg-gradient-to-br from-sky-500 to-violet-600 text-white"
                              : "bg-white/[0.06] text-slate-300 group-hover:text-sky-300"
                          }`}
                        >
                          <part.icon className="size-4" />
                        </div>
                        <div className="min-w-0 text-left">
                          <span className={`block font-mono text-xs tracking-[0.3em] ${selected ? "text-sky-300" : "text-slate-500"}`}>{part.number}</span>
                          <span className="block truncate text-sm font-semibold text-white">{part.title}</span>
                        </div>
                      </div>
                      {isGate && selected && (
                        <span className="absolute -top-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-sky-500 to-violet-600 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-500/40">
                          Loop closes here
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Mobile timeline */}
          <div className="relative mx-auto max-w-xl lg:hidden">
            <span aria-hidden className="absolute bottom-2 left-0 top-2 w-px bg-gradient-to-b from-sky-500 via-indigo-500 to-violet-500" />
            <div className="space-y-8 pl-10">
              {loopParts.map((part, i) => {
                const isGate = i === loopParts.length - 1;
                return (
                  <div key={part.title} className="relative" data-loop-reveal>
                    <span
                      aria-hidden
                      className={`absolute -left-10 top-1.5 size-3 rounded-full ring-4 ring-[#0F172A] ${
                        isGate ? "bg-gradient-to-br from-sky-400 to-violet-500" : "bg-indigo-500/70"
                      }`}
                    />
                    <div
                      className={`rounded-xl border p-5 backdrop-blur-md ${
                        isGate
                          ? "border-sky-400/40 bg-gradient-to-b from-sky-500/10 to-violet-500/10"
                          : "border-white/10 bg-white/[0.04]"
                      }`}
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div
                          className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                            isGate ? "bg-gradient-to-br from-sky-500 to-violet-600 text-white" : "bg-white/[0.06] text-sky-300"
                          }`}
                        >
                          <part.icon className="size-4" />
                        </div>
                        <div>
                          <span className="block font-mono text-xs tracking-[0.3em] text-sky-300/70">
                            {part.number} — {part.tagline}
                          </span>
                          <h3 className="font-heading h3-sm text-white">{part.title}</h3>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-400">{part.description}</p>
                      <span className="mt-3 inline-block rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-0.5 text-xs font-medium text-sky-300">
                        {part.role}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-14 text-center" data-loop-reveal>
            <BookCallButton
              icon={null}
              size="lg"
              className="bg-gradient-to-r from-sky-500 to-violet-600 px-6 font-semibold text-sm text-white shadow-lg shadow-indigo-500/30 hover:from-sky-400 hover:to-violet-500"
            >
              Book a Consultation <ArrowRight className="size-4 ml-2" />
            </BookCallButton>
            <p className="mt-5 text-sm text-slate-400">
              Prefer email? Reach us at{" "}
              <a href={`mailto:${company.businessEmail}`} className="font-medium text-sky-400 hover:underline">
                {company.businessEmail}
              </a>
            </p>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 px-6 bg-section">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-amber-500/10 text-amber-600 border-amber-500/20">Plans</Badge>
            <h2 className="font-heading h2-lg mb-4">
              Simple, <span className="text-gradient">Transparent</span> Plans
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground text-base">
              Start with one Digital FTE, scale to an entire AI workforce. Every plan is scoped to your workflow and quoted for your scope.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-8 rounded-xl transition-all duration-200 ${
                  plan.popular
                    ? "bg-primary text-primary-foreground ring-2 ring-primary shadow-lg shadow-primary/20 scale-[1.02]"
                    : "card-solid"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    Most Popular
                  </div>
                )}
                <h3 className="font-heading h3-sm mb-1">{plan.name}</h3>
                <p className={`text-sm mb-1 font-medium ${plan.popular ? "text-primary-foreground/85" : "text-foreground/80"}`}>
                  Built for: {plan.forWho}
                </p>
                <p className={`text-sm mb-6 ${plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {plan.description}
                </p>
                <div className="mb-6">
                  <span className="text-2xl font-heading font-bold">{plan.price}</span>
                </div>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className={`size-4 shrink-0 ${plan.popular ? "text-primary-foreground" : "text-primary"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/contact?plan=${plan.name.toLowerCase()}`}
                  className={buttonVariants({
                    className: `w-full ${plan.popular ? "bg-card text-primary hover:bg-card/90" : "bg-primary text-primary-foreground hover:bg-primary/90"}`,
                  })}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ReadyCta />
    </div>
  );
}
