"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProjectBlock } from "@/components/sections/project-block";
import { fieldError, parseProjectInput, slugify } from "@/lib/live-work/schema";
import { DESCRIPTION_MAX, TAGS_MAX, type Project, type PublicProject, type Thumbnail } from "@/lib/live-work/types";

/**
 * Create + edit form for a single "Our live Work" block.
 *
 * The live preview renders the SAME `<ProjectBlock>` the site uses, fed with
 * the unsaved form values, so what the admin sees is what publishes.
 */

const DESKTOP_RATIO = 16 / 10; // 1600 × 1000
const MOBILE_RATIO = 9 / 19.5; // phone body the device frame renders
const RATIO_TOLERANCE = 0.05; // warn beyond 5% off
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Warns when a screenshot is far enough off-ratio that the frame crops it. */
function ratioWarning(thumb: Thumbnail, expected: number): string {
  if (!thumb.width || !thumb.height) return "";
  const actual = thumb.width / thumb.height;
  if (Math.abs(actual - expected) / expected <= RATIO_TOLERANCE) return "";
  const percent = Math.round((Math.abs(actual - expected) / expected) * 100);
  return `Ratio is ${thumb.width}×${thumb.height} — ${percent}% off the recommended size. It will be cropped.`;
}

interface StatRow {
  value: string;
  label: string;
}

interface FormState {
  name: string;
  slug: string;
  slugTouched: boolean;
  unitId: string;
  status: "draft" | "published";
  featured: boolean;
  description: string;
  stats: StatRow[];
  tags: string[];
  desktop: Thumbnail | null;
  desktopAlt: string;
  desktopWarning: string;
  mobile: Thumbnail | null;
  mobileAlt: string;
  mobileWarning: string;
  liveUrl: string;
  caseStudyUrl: string;
  browserUrlLabel: string;
  chipTitle: string;
  chipSubtitle: string;
  content: string;
  gallery: Thumbnail[];
}

const EMPTY_STATS: StatRow[] = [
  { value: "", label: "" },
  { value: "", label: "" },
  { value: "", label: "" },
];

function emptyState(): FormState {
  return {
    name: "",
    slug: "",
    slugTouched: false,
    unitId: "",
    status: "draft",
    featured: false,
    description: "",
    stats: EMPTY_STATS.map((row) => ({ ...row })),
    tags: ["", "", "", ""],
    desktop: null,
    desktopAlt: "",
    desktopWarning: "",
    mobile: null,
    mobileAlt: "",
    mobileWarning: "",
    liveUrl: "",
    caseStudyUrl: "",
    browserUrlLabel: "",
    chipTitle: "",
    chipSubtitle: "",
    content: "",
    gallery: [],
  };
}

function stateFromProject(project: Project): FormState {
  const stats = EMPTY_STATS.map((row, index) => ({
    value: project.stats[index]?.value ?? "",
    label: project.stats[index]?.label ?? "",
  }));
  const tags = ["", "", "", ""].map((_, index) => project.tags[index] ?? "");

  return {
    name: project.name,
    slug: project.slug,
    slugTouched: true,
    unitId: project.unitId ?? "",
    status: project.status,
    featured: project.featured,
    description: project.description,
    stats,
    tags,
    desktop: project.desktopThumbnail,
    desktopAlt: project.desktopThumbnail?.alt ?? "",
    desktopWarning: "",
    mobile: project.mobileThumbnail,
    mobileAlt: project.mobileThumbnail?.alt ?? "",
    mobileWarning: "",
    liveUrl: project.liveUrl ?? "",
    caseStudyUrl: project.caseStudyUrl ?? "",
    browserUrlLabel: project.browserUrlLabel ?? "",
    chipTitle: project.chipTitle ?? "",
    chipSubtitle: project.chipSubtitle ?? "",
    content: project.content,
    gallery: project.gallery,
  };
}

function payloadFrom(state: FormState, order: number) {
  return {
    name: state.name,
    slug: state.slug,
    unitId: state.unitId,
    status: state.status,
    featured: state.featured,
    description: state.description,
    order,
    stats: state.stats,
    tags: state.tags.filter(Boolean).slice(0, TAGS_MAX),
    // The alt input is the source of truth: it survives an upload that
    // happens after the text was typed.
    desktopThumbnail: state.desktop ? { ...state.desktop, alt: state.desktopAlt } : null,
    mobileThumbnail: state.mobile ? { ...state.mobile, alt: state.mobileAlt } : null,
    liveUrl: state.liveUrl,
    caseStudyUrl: state.caseStudyUrl,
    browserUrlLabel: state.browserUrlLabel,
    chipTitle: state.chipTitle,
    chipSubtitle: state.chipSubtitle,
    content: state.content,
    gallery: state.gallery,
  };
}

/** Empty image fields are not sent — the schema treats them as "not provided". */
function previewPayload(state: FormState) {
  const payload = payloadFrom(state, 0) as Record<string, unknown>;
  for (const key of ["liveUrl", "caseStudyUrl", "browserUrlLabel", "chipTitle", "chipSubtitle"]) {
    if (!String(payload[key] ?? "").trim()) delete payload[key];
  }
  return payload;
}

export interface LiveWorkFormProps {
  project: Project | null;
  /** Slugs already used by other projects, for the inline uniqueness check. */
  takenSlugs: string[];
  /** Next `order` value for a brand-new project. */
  nextOrder: number;
  onClose: () => void;
  onSaved: (project: Project) => void;
}

export function LiveWorkForm({
  project,
  takenSlugs,
  nextOrder,
  onClose,
  onSaved,
}: LiveWorkFormProps) {
  const [state, setState] = useState<FormState>(() =>
    project ? stateFromProject(project) : emptyState()
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [mirrored, setMirrored] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureNote, setCaptureNote] = useState("");
  const [generatingCaseStudy, setGeneratingCaseStudy] = useState(false);
  const [caseStudyNote, setCaseStudyNote] = useState("");
  // The URL already rendered on both screens: opening an existing project must
  // never re-capture and overwrite the screenshots saved with it.
  const capturedUrlRef = useRef((project?.liveUrl ?? "").trim());
  const captureBusyRef = useRef(false);
  const [uploading, setUploading] = useState<"desktop" | "mobile" | "gallery" | null>(null);
  // A snapshot of the last saved state — kept as state (not a ref) so `dirty`
  // is derived during render and the form re-renders when it stops being dirty.
  const [saved, setSaved] = useState(() =>
    JSON.stringify(project ? stateFromProject(project) : emptyState())
  );

  const dirty = JSON.stringify(state) !== saved;

  const built = useMemo(() => {
    const result = parseProjectInput(previewPayload(state));
    return result;
  }, [state]);

  const errors = useMemo(
    () => ({
      name: fieldError(built, "name"),
      slug: fieldError(built, "slug") ?? slugConflict(state.slug, takenSlugs),
      description: fieldError(built, "description"),
      stats: fieldError(built, "stats"),
      tags: fieldError(built, "tags"),
      desktopThumbnail: fieldError(built, "desktopThumbnail"),
      mobileThumbnail: fieldError(built, "mobileThumbnail"),
      liveUrl: fieldError(built, "liveUrl"),
      caseStudyUrl: fieldError(built, "caseStudyUrl"),
    }),
    [built, state.slug, takenSlugs]
  );

  const valid = built.success && !errors.slug;

  /* ------------------------------------------------------- unsaved guard -- */

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const close = useCallback(() => {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  /* ------------------------------------------------------- hero capture -- */

  /**
   * Snapshots the live URL's hero (first section) for BOTH device screens and
   * drops the files into the two thumbnail slots. The debounced URL change and
   * the "Capture hero" button share this; `manual` only decides whether a
   * half-typed URL shows a note.
   */
  const runCapture = useCallback(async (raw: string, manual = false) => {
    const url = raw.trim();
    if (!url || captureBusyRef.current) return;

    let target: URL;
    try {
      target = new URL(url);
    } catch {
      if (manual) setCaptureNote("Enter a full URL, e.g. https://example.com");
      return;
    }
    if (target.protocol !== "https:" && target.protocol !== "http:") {
      if (manual) setCaptureNote("Only http(s) URLs can be captured.");
      return;
    }

    captureBusyRef.current = true;
    setCapturing(true);
    setCaptureNote("");
    try {
      const res = await fetch("/api/projects/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target.toString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not capture the hero");

      const desktop = data.desktop as Thumbnail;
      const mobile = data.mobile as Thumbnail;
      capturedUrlRef.current = url;
      setState((prev) => ({
        ...prev,
        desktop: { ...desktop, alt: prev.desktopAlt },
        desktopWarning: ratioWarning(desktop, DESKTOP_RATIO),
        mobile: { ...mobile, alt: prev.mobileAlt },
        mobileWarning: ratioWarning(mobile, MOBILE_RATIO),
      }));
      setCaptureNote("Hero captured for both screens.");
    } catch (error) {
      setCaptureNote(error instanceof Error ? error.message : "Could not capture the hero");
    } finally {
      captureBusyRef.current = false;
      setCapturing(false);
    }
  }, []);

  // Re-capture a moment after typing stops — never on mount (the ref starts as
  // the saved URL) and never twice for the same URL.
  useEffect(() => {
    const url = state.liveUrl.trim();
    if (!url || url === capturedUrlRef.current) return;
    const timer = setTimeout(() => void runCapture(url), 1200);
    return () => clearTimeout(timer);
  }, [state.liveUrl, runCapture]);

  /** Generate the case study with AI, or leave the textarea for manual writing. */
  const generateCaseStudy = async () => {
    if (generatingCaseStudy) return;
    if (state.content.trim() && !window.confirm("Replace the current case study with AI-generated copy?")) return;

    setGeneratingCaseStudy(true);
    setCaseStudyNote("");
    try {
      const res = await fetch("/api/projects/generate-case-study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name,
          description: state.description,
          liveUrl: state.liveUrl,
          browserUrlLabel: state.browserUrlLabel,
          unitId: state.unitId,
          tags: state.tags.filter(Boolean).slice(0, TAGS_MAX),
          stats: state.stats.filter((row) => row.value && row.label).slice(0, 3),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not generate the case study");
      patch({ content: String(data.content ?? "") });
      setCaseStudyNote("Generated with AI — review it, then save.");
    } catch (error) {
      setCaseStudyNote(error instanceof Error ? error.message : "Could not generate the case study");
    } finally {
      setGeneratingCaseStudy(false);
    }
  };

  /* ------------------------------------------------------------ helpers -- */

  const patch = (changes: Partial<FormState>) => setState((prev) => ({ ...prev, ...changes }));

  const onName = (value: string) => {
    setState((prev) => ({
      ...prev,
      name: value,
      slug: prev.slugTouched ? prev.slug : slugify(value),
    }));
  };

  const onSlug = (value: string) => {
    patch({ slug: slugify(value), slugTouched: true });
  };

  const upload = async (
    file: File,
    kind: "desktop" | "mobile" | "gallery"
  ): Promise<Thumbnail | null> => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFormError("Only PNG, JPG or WEBP images are allowed.");
      return null;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setFormError("Images must be 4 MB or smaller.");
      return null;
    }

    setUploading(kind);
    setFormError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/projects/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      return {
        url: data.url,
        path: data.path,
        width: Number(data.width) || 0,
        height: Number(data.height) || 0,
        alt: "",
      } satisfies Thumbnail;
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Upload failed");
      return null;
    } finally {
      setUploading(null);
    }
  };

  const onDesktopFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const thumb = await upload(file, "desktop");
    if (thumb) {
      patch({
        desktop: { ...thumb, alt: state.desktopAlt || thumb.alt },
        desktopWarning: ratioWarning(thumb, DESKTOP_RATIO),
      });
    }
  };

  const onMobileFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const thumb = await upload(file, "mobile");
    if (thumb) {
      patch({
        mobile: { ...thumb, alt: state.mobileAlt || thumb.alt },
        mobileWarning: ratioWarning(thumb, MOBILE_RATIO),
      });
    }
  };

  const onGalleryFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const thumb = await upload(file, "gallery");
    if (thumb) {
      setState((prev) => ({ ...prev, gallery: [...prev.gallery, thumb].slice(0, 12) }));
    }
  };

  const updateStat = (index: number, key: keyof StatRow, value: string) => {
    setState((prev) => ({
      ...prev,
      stats: prev.stats.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    }));
  };

  const updateTag = (index: number, value: string) => {
    setState((prev) => ({
      ...prev,
      tags: prev.tags.map((tag, i) => (i === index ? value.slice(0, 24) : tag)),
    }));
  };

  /* -------------------------------------------------------------- save -- */

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || saving) return;

    setSaving(true);
    setFormError("");
    try {
      const res = await fetch("/api/projects", {
        method: project ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          project
            ? { ...payloadFrom(state, project.order), id: project.id }
            : payloadFrom(state, nextOrder)
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not save the project");

      setSaved(JSON.stringify(state));
      onSaved(data as Project);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save the project");
    } finally {
      setSaving(false);
    }
  };

  /* ----------------------------------------------------------- preview -- */

  const previewProject: PublicProject = {
    id: project?.id ?? "preview",
    slug: state.slug || "preview",
    name: state.name || "Project name",
    unitId: state.unitId || undefined,
    description: state.description || "Your description will show up here, big and readable.",
    stats: state.stats.filter((row) => row.value && row.label).slice(0, 3),
    tags: state.tags.filter(Boolean).slice(0, TAGS_MAX),
    desktopThumbnail: state.desktop ? { ...state.desktop, alt: state.desktopAlt } : null,
    mobileThumbnail: state.mobile ? { ...state.mobile, alt: state.mobileAlt } : null,
    liveUrl: state.liveUrl || undefined,
    caseStudyUrl: state.caseStudyUrl || `/projects/${state.slug || "preview"}`,
    browserUrlLabel:
      state.browserUrlLabel || hostnameOf(state.liveUrl) || undefined,
    chipTitle: state.chipTitle || undefined,
    chipSubtitle: state.chipSubtitle || (state.unitId ? `${state.unitId} · just now` : undefined),
    content: state.content,
    gallery: state.gallery,
    order: project?.order ?? nextOrder,
    featured: state.featured,
    updatedAt: new Date().toISOString(),
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lw-form-title"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />

      <div className="relative my-4 w-full max-w-6xl rounded-2xl bg-card border border-border shadow-2xl">
        <form onSubmit={submit} noValidate>
          <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
            <div>
              <h2 id="lw-form-title" className="font-heading text-lg font-bold text-foreground">
                {project ? "Edit project" : "New project"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {state.status === "published" ? "Published" : "Draft"} · order {project?.order ?? nextOrder}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMirrored((value) => !value)}
                className="border-border text-foreground hover:bg-muted"
              >
                Preview: {mirrored ? "text left" : "devices left"}
              </Button>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* --------------------------------------------------- fields -- */}
            <div className="space-y-6 order-2 lg:order-1">
              <Section title="Basics">
                <Field label="Project name" error={errors.name}>
                  <Input
                    value={state.name}
                    onChange={(event) => onName(event.target.value)}
                    placeholder="Outbound Qualification Agent"
                    className="bg-muted border-border text-foreground"
                  />
                </Field>

                <Field label="Slug" error={errors.slug} hint={`/${state.slug || "…"}`}>
                  <Input
                    value={state.slug}
                    onChange={(event) => onSlug(event.target.value)}
                    placeholder="outbound-qualification-agent"
                    className="bg-muted border-border text-foreground font-mono"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Unit ID (optional)">
                    <Input
                      value={state.unitId}
                      onChange={(event) => patch({ unitId: event.target.value })}
                      placeholder="FTE-004"
                      className="bg-muted border-border text-foreground"
                    />
                  </Field>
                  <Field label="Status">
                    <select
                      value={state.status}
                      onChange={(event) =>
                        patch({ status: event.target.value as FormState["status"] })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary/40"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </Field>
                </div>

                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={state.featured}
                    onChange={(event) => patch({ featured: event.target.checked })}
                    className="size-4 accent-[var(--primary)]"
                  />
                  Featured on the home page
                </label>
              </Section>

              <Section title="Description">
                <Field label="Description" error={errors.description}>
                  <Textarea
                    value={state.description}
                    onChange={(event) => patch({ description: event.target.value.slice(0, DESCRIPTION_MAX) })}
                    rows={3}
                    className="resize-none bg-muted border-border text-foreground"
                  />
                </Field>
                <p
                  className={`text-xs ${state.description.length > DESCRIPTION_MAX ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {state.description.length} / {DESCRIPTION_MAX}
                </p>
              </Section>

              <Section title="Stats">
                <p className="text-xs text-muted-foreground">
                  Optional — leave every row empty to hide stats (up to 3).
                </p>
                {errors.stats && <p className="text-xs text-destructive mb-2">{errors.stats}</p>}
                {state.stats.map((row, index) => (
                  <div key={index} className="grid grid-cols-2 gap-3">
                    <Input
                      value={row.value}
                      onChange={(event) => updateStat(index, "value", event.target.value)}
                      placeholder={index === 0 ? "7 days" : "312"}
                      aria-label={`Stat ${index + 1} value`}
                      className="bg-muted border-border text-foreground"
                    />
                    <Input
                      value={row.label}
                      onChange={(event) => updateStat(index, "label", event.target.value)}
                      placeholder={index === 0 ? "To go live" : "Leads per wk"}
                      aria-label={`Stat ${index + 1} label`}
                      className="bg-muted border-border text-foreground"
                    />
                  </div>
                ))}
              </Section>

              <Section title="Tags">
                <div className="grid grid-cols-2 gap-3">
                  {state.tags.map((tag, index) => (
                    <Input
                      key={index}
                      value={tag}
                      onChange={(event) => updateTag(index, event.target.value)}
                      placeholder={`Tag ${index + 1}`}
                      aria-label={`Tag ${index + 1}`}
                      className="bg-muted border-border text-foreground"
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Up to {TAGS_MAX}. Leave unused slots empty.</p>
              </Section>

              <Section title="Thumbnails">
                <ImageField
                  label="Desktop screenshot"
                  hint="1600 × 1000 (16:10)"
                  thumb={state.desktop}
                  alt={state.desktopAlt}
                  warning={state.desktopWarning}
                  busy={uploading === "desktop"}
                  onFile={onDesktopFile}
                  onAlt={(value) => patch({ desktopAlt: value })}
                  onClear={() => patch({ desktop: null, desktopWarning: "" })}
                />
                <ImageField
                  label="Mobile screenshot"
                  hint="900 × 1920 (9:19.5)"
                  thumb={state.mobile}
                  alt={state.mobileAlt}
                  warning={state.mobileWarning}
                  busy={uploading === "mobile"}
                  onFile={onMobileFile}
                  onAlt={(value) => patch({ mobileAlt: value })}
                  onClear={() => patch({ mobile: null, mobileWarning: "" })}
                />
              </Section>

              <Section title="Links & chip">
                <div className="space-y-2">
                  <Field label="Live URL (button hides when empty)" error={errors.liveUrl}>
                    <Input
                      type="url"
                      value={state.liveUrl}
                      onChange={(event) => patch({ liveUrl: event.target.value })}
                      placeholder="https://example.vercel.app"
                      className="bg-muted border-border text-foreground"
                    />
                  </Field>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void runCapture(state.liveUrl, true)}
                      disabled={capturing || !state.liveUrl.trim()}
                      className="border-border text-foreground hover:bg-muted disabled:opacity-50"
                    >
                      {capturing ? "Capturing…" : "Capture hero"}
                    </Button>
                    <p className="text-xs text-muted-foreground" role="status">
                      {capturing ? "Screenshotting both screens…" : captureNote}
                    </p>
                  </div>
                </div>
                <Field label="Case study URL (optional)" error={errors.caseStudyUrl}>
                  <Input
                    type="url"
                    value={state.caseStudyUrl}
                    onChange={(event) => patch({ caseStudyUrl: event.target.value })}
                    placeholder="Defaults to this project's own page"
                    className="bg-muted border-border text-foreground"
                  />
                </Field>
                <Field label="Browser URL label (optional)" hint="Defaults to the live URL's hostname">
                  <Input
                    value={state.browserUrlLabel}
                    onChange={(event) => patch({ browserUrlLabel: event.target.value })}
                    placeholder="deuvix-aicompany.vercel.app"
                    className="bg-muted border-border text-foreground"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Chip title (optional)">
                    <Input
                      value={state.chipTitle}
                      onChange={(event) => patch({ chipTitle: event.target.value })}
                      placeholder="Call booked: Tue 3:00 PM"
                      className="bg-muted border-border text-foreground"
                    />
                  </Field>
                  <Field label="Chip subtitle (optional)">
                    <Input
                      value={state.chipSubtitle}
                      onChange={(event) => patch({ chipSubtitle: event.target.value })}
                      placeholder="FTE-004 · just now"
                      className="bg-muted border-border text-foreground"
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Single-page content">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Case study</p>
                    <p className="text-xs text-muted-foreground">
                      Hand it over to the AI agent, or write it manually below.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void generateCaseStudy()}
                    disabled={generatingCaseStudy || !state.name.trim() || state.description.trim().length < 10}
                    className="border-border text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    {generatingCaseStudy ? "Generating…" : "Generate with AI"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground" role="status">
                  {generatingCaseStudy ? "AI is drafting the case study…" : caseStudyNote}
                </p>
                <Field label="Content (Markdown supported)">
                  <Textarea
                    value={state.content}
                    onChange={(event) => patch({ content: event.target.value })}
                    rows={6}
                    placeholder={"## What we shipped\n\n- Lead scoring loop\n- CRM sync"}
                    className="resize-y bg-muted border-border text-foreground font-mono text-xs"
                  />
                </Field>

                <div className="flex items-center gap-3">
                  <label className="flex items-center justify-center size-16 rounded-xl border border-dashed border-border hover:border-primary/30 cursor-pointer transition-colors">
                    {uploading === "gallery" ? (
                      <span className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="text-2xl text-muted-foreground">+</span>
                    )}
                    <input
                      type="file"
                      accept={ACCEPTED_TYPES.join(",")}
                      onChange={onGalleryFile}
                      className="hidden"
                      aria-label="Add gallery image"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {state.gallery.map((image, index) => (
                      <div
                        key={`${image.url}-${index}`}
                        className="relative size-16 rounded-xl overflow-hidden bg-muted border border-border"
                      >
                        <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
                        <button
                          type="button"
                          onClick={() =>
                            patch({ gallery: state.gallery.filter((_, i) => i !== index) })
                          }
                          aria-label="Remove gallery image"
                          className="absolute top-1 right-1 size-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>
            </div>

            {/* ------------------------------------------------- preview -- */}
            <div className="order-1 lg:order-2">
              <div className="sticky top-4 rounded-2xl border border-border bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  Live preview
                </p>
                <ProjectBlock project={previewProject} index={0} mirrored={mirrored} reveal={false} />
              </div>
            </div>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
            <p className="text-sm text-destructive" role="status">
              {formError}
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={close}
                className="border-border text-foreground hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!valid || saving}
                className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {saving ? "Saving…" : project ? "Save changes" : "Create project"}
              </Button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Small building blocks                                                       */
/* -------------------------------------------------------------------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
      <legend className="px-1 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5 flex items-baseline justify-between gap-2">
        {label}
        {hint && <span className="normal-case font-mono">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

function ImageField({
  label,
  hint,
  thumb,
  alt,
  warning,
  busy,
  onFile,
  onAlt,
  onClear,
}: {
  label: string;
  hint: string;
  thumb: Thumbnail | null;
  alt: string;
  warning: string;
  busy: boolean;
  onFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAlt: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <label className="flex flex-col items-center justify-center size-16 shrink-0 rounded-xl border border-dashed border-border hover:border-primary/30 cursor-pointer transition-colors">
          {busy ? (
            <span className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : thumb ? (
            <span className="text-xs text-muted-foreground">Replace</span>
          ) : (
            <span className="text-xs text-muted-foreground">Upload</span>
          )}
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={onFile}
            className="hidden"
            aria-label={label}
          />
        </label>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
          {thumb ? (
            <div className="mt-2 flex items-center gap-2">
              <div className="relative size-12 shrink-0 rounded-lg overflow-hidden bg-muted border border-border">
                <Image src={thumb.url} alt="" fill sizes="48px" className="object-cover object-top" />
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {thumb.width}×{thumb.height}
              </span>
              <button
                type="button"
                onClick={onClear}
                className="ml-auto text-xs text-destructive hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <p className="mt-2 text-xs text-destructive">Required</p>
          )}
          <input
            value={alt}
            onChange={(event) => onAlt(event.target.value)}
            placeholder="Alt text (describe the screenshot)"
            aria-label={`${label} alt text`}
            className="mt-2 w-full rounded-lg bg-muted border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/40"
          />
          {warning && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{warning}</p>}
        </div>
      </div>
    </div>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/** Inline uniqueness check against the slugs the other projects already use. */
function slugConflict(slug: string, taken: string[]): string | undefined {
  const clean = slug.trim().toLowerCase();
  if (!clean) return undefined;
  if (taken.includes(clean)) return "That slug is already in use";
  return undefined;
}
