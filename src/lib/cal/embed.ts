"use client";

import { getCalApi } from "@calcom/embed-react";

/**
 * Thin singleton around Cal.com's embed SDK.
 *
 * We deliberately avoid importing types from @calcom/embed-core (it is a
 * transitive dependency) and describe the tiny surface we use instead.
 */
export interface CalApi {
  (instruction: string, ...args: unknown[]): void;
}

export interface BookingPrefill {
  name?: string;
  email?: string;
}

export const NAMESPACE = "deuvix";

/** Mirrors --primary in src/app/globals.css. */
const BRAND_COLOR = "#4CAF7D";

export function getCalOrigin(): string {
  return (process.env.NEXT_PUBLIC_CAL_ORIGIN ?? "").replace(/\/+$/, "");
}

export function getCalLink(): string {
  return (process.env.NEXT_PUBLIC_CAL_LINK ?? "").replace(/^\/+|\/+$/g, "");
}

export function isCalConfigured(): boolean {
  return Boolean(getCalOrigin() && getCalLink());
}

function readDomTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

let apiPromise: Promise<CalApi | null> | null = null;

export function getCalInstance(): Promise<CalApi | null> {
  if (apiPromise) return apiPromise;

  apiPromise = (async () => {
    if (!isCalConfigured()) {
      console.warn("[cal] NEXT_PUBLIC_CAL_ORIGIN / NEXT_PUBLIC_CAL_LINK are not set");
      return null;
    }
    try {
      const api = (await getCalApi({ namespace: NAMESPACE })) as unknown as CalApi;
      api("init", { calOrigin: getCalOrigin() });
      api("ui", themeInstruction(readDomTheme()));
      return api;
    } catch (err) {
      console.error("[cal] failed to initialise embed:", err instanceof Error ? err.message : err);
      return null;
    }
  })();

  return apiPromise;
}

function themeInstruction(theme: "dark" | "light") {
  return {
    theme,
    cssVarsPerTheme: {
      light: { "cal-brand": BRAND_COLOR },
      dark: { "cal-brand": BRAND_COLOR },
    },
  };
}

/** Keeps the popup in step with next-themes. Safe to call repeatedly. */
export async function syncCalTheme(theme?: string | null): Promise<void> {
  const api = await getCalInstance();
  if (!api) return;
  api("ui", themeInstruction(theme === "light" ? "light" : "dark"));
}

export async function openCalModal(prefill?: BookingPrefill): Promise<boolean> {
  const api = await getCalInstance();
  if (!api) return false;

  const config: Record<string, unknown> = {
    layout: "month_view",
    iframeAttrs: {
      title: "Book a call with Deuvix AI Factory",
    },
  };

  // Only ever prefill what the caller explicitly knows. No phone, no company.
  if (prefill?.name || prefill?.email) {
    config.prefill = {
      ...(prefill.name ? { name: prefill.name } : {}),
      ...(prefill.email ? { email: prefill.email } : {}),
    };
  }

  api("modal", {
    calOrigin: getCalOrigin(),
    calLink: getCalLink(),
    config,
  });

  return true;
}

/** Warms the embed so the first open feels instant. */
export function preloadCal(): void {
  if (!isCalConfigured()) return;
  void getCalInstance().then((api) => {
    api?.("preload", { calLink: getCalLink(), type: "modal" });
  });
}
