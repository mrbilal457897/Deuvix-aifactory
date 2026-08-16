"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Send, CheckCircle, Clock } from "lucide-react";
import Image from "next/image";
import { CharReveal } from "@/components/split-text";
import { useSiteConfig } from "@/hooks/use-site-config";

const contactCards = [
  { icon: MapPin, label: "Visit Us", value: "Pakistan", sub: "Remote-first, serving globally" },
  { icon: Mail, label: "Email Us", value: "deuxaiinfo786@gmail.com", sub: "We reply within 24 hours" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const reasons = [
  "Free initial consultation",
  "Response within 24 hours",
  "No sales pressure — ever",
  "Spec-driven development approach",
  "Production-ready from day one",
];

const services = [
  "Select a service",
  "Digital FTE Deployment",
  "FDE Consulting",
  "AI Chatbots",
  "Voice Agents",
  "Custom Agents",
  "Loop Engineering",
  "AI Agent E-books",
  "AI-Powered Web Apps",
  "Business AI Solutions",
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    portfolio: "",
    message: "",
    website: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [emailSent, setEmailSent] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { img } = useSiteConfig();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preselected = params.get("service");
    if (preselected && services.includes(preselected)) {
      queueMicrotask(() => {
        setFormData((prev) => ({ ...prev, service: preselected }));
      });
    }
  }, []);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!formData.name.trim()) next.name = "Please enter your name.";
    if (!formData.email.trim()) next.email = "Please enter your email.";
    else if (!EMAIL_REGEX.test(formData.email.trim())) next.email = "Please enter a valid email address.";
    if (!formData.service) next.service = "Please select a service.";
    if (!formData.message.trim()) next.message = "Please enter a message.";
    else if (formData.message.trim().length < 10) next.message = "Message should be at least 10 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        setEmailSent(data?.emailSent !== false);
        setStatus("success");
        setFormData({ name: "", email: "", phone: "", service: "", portfolio: "", message: "", website: "" });
        setErrors({});
      } else {
        const data = await res.json().catch(() => null);
        setStatus("error");
        console.error(data?.error || "Failed to send message");
      }
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative dark">
      {/* Full background image */}
      <div className="fixed inset-0 -z-10">
        <Image
          src={img("contact-bg")}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-background/90 dark:bg-black/60" />
      </div>

      {/* Hero */}
      <section className="relative pt-32 pb-16 text-center px-6">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 backdrop-blur-sm">Contact</Badge>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold text-foreground dark:text-white mb-4">
          <CharReveal>Let&apos;s <span className="text-gradient">Connect</span></CharReveal>
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground text-lg">
          Have a question or want to discuss a project? We&apos;d love to hear from you.
        </p>
      </section>

      {/* Info Cards */}
      <section className="relative pb-12 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            {contactCards.map((card) => (
              <div
                key={card.label}
                className="text-center p-6 rounded-2xl bg-card/80 dark:bg-white/10 backdrop-blur-md border border-border dark:border-white/20 hover:bg-card dark:hover:bg-white/15 transition-all duration-300"
              >
                <div className="size-12 rounded-xl bg-primary/10 dark:bg-white/10 flex items-center justify-center mx-auto mb-3">
                  <card.icon className="size-6 text-primary dark:text-white" />
                </div>
                <h5 className="font-heading font-semibold text-foreground dark:text-white mb-1">{card.label}</h5>
                <p className="text-sm text-foreground/90 dark:text-white/90 font-medium">{card.value}</p>
                {card.sub && (
                  <p className="text-xs text-muted-foreground dark:text-white/50 mt-1">{card.sub}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Split Section: Form + Side Panel */}
      <section className="relative py-12 px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Form - Left Side */}
            <div className="flex-[7] p-8 sm:p-10 rounded-2xl bg-card/80 dark:bg-white/10 backdrop-blur-md border border-border dark:border-white/20">
              <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-2 block">Send a Message</span>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground dark:text-white mb-2">
                Book a <span className="text-gradient">Free Consultation</span>
              </h2>
              <p className="text-sm text-muted-foreground dark:text-white/60 mb-8">
                Fill in the form and we&apos;ll contact you within one business day.
              </p>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Honeypot (anti-spam) — intentionally hidden from humans. Bots fill this and the API silently discards the submission. */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input
                    id="website"
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={formData.website || ""}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground/80 dark:text-white/80 mb-1.5 block">Full Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your full name"
                      aria-invalid={Boolean(errors.name)}
                      className="bg-background dark:bg-white/10 border-border dark:border-white/20 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/40 focus:border-primary"
                      required
                    />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground/80 dark:text-white/80 mb-1.5 block">Email Address</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Your email"
                      aria-invalid={Boolean(errors.email)}
                      className="bg-background dark:bg-white/10 border-border dark:border-white/20 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/40 focus:border-primary"
                      required
                    />
                    {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground/80 dark:text-white/80 mb-1.5 block">Phone Number</label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Your phone"
                      className="bg-background dark:bg-white/10 border-border dark:border-white/20 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/40 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground/80 dark:text-white/80 mb-1.5 block">Service Interested In</label>
                    <select
                      value={formData.service}
                      onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                      aria-invalid={Boolean(errors.service)}
                      className="w-full h-10 px-3 rounded-md bg-background dark:bg-white/10 border border-border dark:border-white/20 text-foreground dark:text-white text-sm focus:border-primary focus:outline-none"
                      required
                    >
                      {services.map((s) => (
                        <option key={s} value={s === "Select a service" ? "" : s} className="bg-card dark:bg-gray-900 text-foreground dark:text-white">
                          {s}
                        </option>
                      ))}
                    </select>
                    {errors.service && <p className="text-xs text-destructive mt-1">{errors.service}</p>}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground/80 dark:text-white/80 mb-1.5 block">
                    Website / Portfolio <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <Input
                    type="url"
                    value={formData.portfolio}
                    onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                    placeholder="https://yourwebsite.com"
                    className="bg-background dark:bg-white/10 border-border dark:border-white/20 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/40 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground/80 dark:text-white/80 mb-1.5 block">Your Message</label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us about your project..."
                    rows={5}
                    aria-invalid={Boolean(errors.message)}
                    className="resize-none bg-background dark:bg-white/10 border-border dark:border-white/20 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/40 focus:border-primary"
                    required
                  />
                  {errors.message && <p className="text-xs text-destructive mt-1">{errors.message}</p>}
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-8 py-6 text-base rounded-xl shadow-lg shadow-primary/20"
                >
                  {submitting ? (
                    "Sending..."
                  ) : status === "success" ? (
                    "Message Sent!"
                  ) : (
                    <>Send Message <Send className="size-5 ml-2" /></>
                  )}
                </Button>
                {status === "success" && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    Thank you! Your message has been sent.
                    {emailSent
                      ? " We'll get back to you within one business day."
                      : " Our team will reach out to you soon."}
                  </p>
                )}
                {status === "error" && (
                  <p className="text-sm text-destructive">
                    Something went wrong. Please try again or email us at deuxaiinfo786@gmail.com.
                  </p>
                )}
              </form>
            </div>

            {/* Side Panel - Right Side */}
            <div className="flex-[3] space-y-6">
              {/* Why Choose Us */}
              <div className="p-6 rounded-2xl bg-card/80 dark:bg-white/10 backdrop-blur-md border border-border dark:border-white/20">
                <h4 className="font-heading font-bold text-foreground dark:text-white mb-4">Why Choose Deux</h4>
                <ul className="space-y-3">
                  {reasons.map((reason) => (
                    <li key={reason} className="flex items-center gap-3">
                      <CheckCircle className="size-5 text-primary shrink-0" />
                      <span className="text-sm text-foreground/80 dark:text-white/80">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Office Hours */}
              <div className="p-6 rounded-2xl bg-card/80 dark:bg-white/10 backdrop-blur-md border border-border dark:border-white/20">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="size-5 text-primary" />
                  <h5 className="font-heading font-bold text-foreground dark:text-white">Office Hours</h5>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between text-muted-foreground dark:text-white/70">
                    <span>Monday – Friday</span>
                    <span className="text-foreground/90 dark:text-white/90 font-medium">9:00 AM – 6:00 PM</span>
                  </li>
                  <li className="flex justify-between text-muted-foreground dark:text-white/70">
                    <span>Saturday</span>
                    <span className="text-foreground/90 dark:text-white/90 font-medium">10:00 AM – 2:00 PM</span>
                  </li>
                  <li className="flex justify-between text-muted-foreground dark:text-white/70">
                    <span>Sunday</span>
                    <span className="text-muted-foreground dark:text-white/50">Closed</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
