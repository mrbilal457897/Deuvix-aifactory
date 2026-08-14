"use client";

import { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { CharReveal } from "@/components/split-text";
import { useSiteConfig } from "@/hooks/use-site-config";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const categories = ["All", "FTE", "FDE", "E-books", "Web Apps", "Solutions"];

const products = [
  {
    id: 1,
    title: "Digital FTE Deployment",
    description: "Deploy AI workers that operate 24/7, 168 hours a week. Domain-specific agents that handle your business tasks at 85% cost savings.",
    category: "FTE",
    color: "bg-primary/10 text-primary",
    features: ["24/7 Operation", "Domain Expertise", "Instant Scaling"],
  },
  {
    id: 2,
    title: "Forward Deployed Engineer",
    description: "Expert engineers deployed to your site to implement AI-native solutions. Spec-driven development with production-ready architecture.",
    category: "FDE",
    color: "bg-accent/10 text-accent",
    features: ["On-site Implementation", "Spec-Driven", "Full Stack AI"],
  },
  {
    id: 3,
    title: "AI Agent E-books",
    description: "Comprehensive guides to building AI-Native companies. Learn to manufacture, deploy, and monetize Digital FTEs with co-learning philosophy.",
    category: "E-books",
    color: "bg-amber-500/10 text-amber-600",
    features: ["Step-by-Step Guides", "Real Case Studies", "Production Focus"],
  },
  {
    id: 4,
    title: "AI-Powered Web Apps",
    description: "Full-stack web applications built with AI-native architecture. From concept to deployment with intelligent automation baked in.",
    category: "Web Apps",
    color: "bg-rose-500/10 text-rose-600",
    features: ["AI-Native Architecture", "Real-time Processing", "Cloud Deployed"],
  },
  {
    id: 5,
    title: "Business AI Solutions",
    description: "End-to-end AI strategy, consulting, and implementation. Transform your business with intelligent systems built for your domain.",
    category: "Solutions",
    color: "bg-emerald-500/10 text-emerald-600",
    features: ["Strategy Consulting", "Custom Development", "Ongoing Support"],
  },
];

const plans = [
  {
    name: "Starter",
    price: "500",
    description: "For small teams getting started with AI",
    features: ["1 Digital FTE", "Basic Agent Setup", "Email support", "Community access"],
    popular: false,
  },
  {
    name: "Professional",
    price: "2,000",
    description: "Full power for growing AI-Native companies",
    features: ["5 Digital FTEs", "Custom Agent Training", "Priority support", "FDE consultation", "Analytics dashboard"],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Tailored solutions with dedicated support",
    features: ["Unlimited FTEs", "Dedicated FDE team", "SLA guarantee", "On-premise option", "Custom integrations"],
    popular: false,
  },
];

export default function ProductsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const gridRef = useRef<HTMLDivElement>(null);
  const { img } = useSiteConfig();

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

  return (
    <div className="pt-24">
      <section className="py-16 text-center px-4 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src={img("product-bg")} alt="" fill className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-background/85" />
          <div className="absolute inset-0 bg-dots opacity-30" />
        </div>
        <div className="relative">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Services</Badge>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">
          <CharReveal>AI-Native <span className="text-gradient">Solutions</span></CharReveal>
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground text-lg">
          From Digital FTEs to full business transformation — we build the AI workforce your company needs.
        </p>
        </div>
      </section>

      <section className="py-8 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
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
                className="product-card p-6 rounded-xl card-solid hover:border-primary/30 transition-all duration-200"
              >
                <div className={`inline-flex items-center justify-center size-10 rounded-xl ${product.color} mb-4`}>
                  <Sparkles className="size-5" />
                </div>
                <Badge variant="secondary" className="mb-3 text-xs">{product.category}</Badge>
                <h3 className="font-heading text-lg font-semibold mb-2">{product.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{product.description}</p>
                <ul className="space-y-1.5 mb-5">
                  {product.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="size-3.5 text-primary shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full" size="sm">
                  Learn More <ArrowRight className="size-3.5 ml-1.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 px-4 bg-section">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-amber-500/10 text-amber-600 border-amber-500/20">Pricing</Badge>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
              Simple, <span className="text-gradient">Transparent</span> Pricing
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground text-lg">
              Start with one Digital FTE, scale to an entire AI workforce.
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
                <h3 className="font-heading text-xl font-bold mb-1">{plan.name}</h3>
                <p className={`text-sm mb-6 ${plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {plan.description}
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-heading font-bold">${plan.price}</span>
                  {plan.price !== "Custom" && (
                    <span className={`text-sm ${plan.popular ? "text-primary-foreground/60" : "text-muted-foreground"}`}>/month</span>
                  )}
                </div>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className={`size-4 shrink-0 ${plan.popular ? "text-primary-foreground" : "text-primary"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${plan.popular ? "bg-card text-primary hover:bg-card/90" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                >
                  Get Started
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
