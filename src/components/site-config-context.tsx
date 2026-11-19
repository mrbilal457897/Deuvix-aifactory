"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SiteConfig } from "@/lib/site-config";
import { DEFAULTS } from "@/lib/site-config";

const SiteConfigContext = createContext<SiteConfig>({ ...DEFAULTS });

/** Server holds the config; clients read it from context — no fetch, no pop-in. */
export function SiteConfigProvider({
  config,
  children,
}: {
  config: SiteConfig;
  children: ReactNode;
}) {
  return (
    <SiteConfigContext.Provider value={config}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfigValue(): SiteConfig {
  return useContext(SiteConfigContext);
}
