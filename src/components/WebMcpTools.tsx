"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { company, companyProfileUrls } from "@config/company";
import { ORIGIN } from "@/lib/json-ld";
import { pricingItems } from "@/lib/pricing";

/** Only the public fields the tool needs — passed down from the server layout. */
export interface WebMcpProject {
  name: string;
  slug: string;
  description: string;
}

interface ModelContextLike {
  registerTool?: (tool: Record<string, unknown>) => void | Promise<void>;
}

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
}

const asResult = (value: unknown): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify(value) }],
});

const EMPTY_SCHEMA = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

/**
 * Registers read-only WebMCP tools when the browser exposes the native API.
 * Without WebMCP this component renders nothing and does nothing — no throw.
 */
export function WebMcpTools({ projects }: { projects: WebMcpProject[] }) {
  const router = useRouter();

  useEffect(() => {
    const mc = (document as unknown as { modelContext?: ModelContextLike }).modelContext ??
      (navigator as unknown as { modelContext?: ModelContextLike }).modelContext;
    if (!mc?.registerTool) return;

    const controller = new AbortController();

    const tools: Record<string, unknown>[] = [
      {
        name: "list_services",
        description:
          "List the six services Deuvix AI Factory offers, with a one-line description and a link for each. Use when someone asks what the company does or which AI workers and engineering services are available.",
        inputSchema: EMPTY_SCHEMA,
        annotations: { readOnlyHint: true },
        execute: async () =>
          asResult(
            pricingItems.map((service) => ({
              name: service.name,
              description: service.description,
              url: `${ORIGIN}/products#${service.anchor}`,
            })),
          ),
      },
      {
        name: "list_projects",
        description:
          "List the live, published projects with their name, summary and URL. Use when someone asks for examples of Deuvix AI Factory's work or case studies.",
        inputSchema: EMPTY_SCHEMA,
        annotations: { readOnlyHint: true },
        execute: async () =>
          asResult(
            projects.map((project) => ({
              name: project.name,
              summary: project.description,
              url: `${ORIGIN}/projects/${project.slug}`,
            })),
          ),
      },
      {
        name: "get_contact_info",
        description:
          "Get the public contact email, the book-a-call URL and the company LinkedIn page. Use when someone wants to reach or book a call with Deuvix AI Factory.",
        inputSchema: EMPTY_SCHEMA,
        annotations: { readOnlyHint: true },
        execute: async () =>
          asResult({
            email: company.businessEmail,
            bookACallUrl: `${ORIGIN}/book-a-call`,
            linkedInUrl: companyProfileUrls.find((url) => url.includes("linkedin.com")) ?? null,
          }),
      },
      {
        name: "open_book_a_call",
        description:
          "Navigate the current page to the public Book a Call page so the user can pick a slot themselves. Use only when the user explicitly asks to book a call.",
        inputSchema: EMPTY_SCHEMA,
        annotations: { readOnlyHint: false },
        execute: async () => {
          router.push("/book-a-call");
          return asResult({ navigatedTo: `${ORIGIN}/book-a-call` });
        },
      },
    ];

    for (const tool of tools) {
      try {
        void Promise.resolve(mc.registerTool(tool)).catch(() => {
          // A rejected registration must never break the page.
        });
      } catch {
        // No WebMCP support or a non-compliant implementation — ignore.
      }
    }

    return () => controller.abort();
  }, [router, projects]);

  return null;
}
