import { NextResponse, type NextRequest } from "next/server";
import { company } from "@config/company";
import { listPublishedProjects } from "@/lib/projects";
import { pricingItems } from "@/lib/pricing";
import { SERVER_CARD } from "@/lib/mcp/server-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;
const ORIGIN = "https://deuvix-ai.com";
const PROTOCOL_VERSION = "2025-06-18";

/** Minimal in-memory per-IP rate limit (per server instance, no persistence). */
const rateState = new Map<string, { count: number; resetAt: number }>();

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, MCP-Protocol-Version",
};

function json(body: unknown, status = 200): NextResponse {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function rpcError(id: unknown, code: number, message: string, status = 200): NextResponse {
  return json(
    { jsonrpc: "2.0", id: id ?? null, error: { code, message } },
    status
  );
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const current = rateState.get(ip);
  if (!current || now >= current.resetAt) {
    rateState.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    if (rateState.size > 2000) {
      for (const [key, value] of rateState) {
        if (now >= value.resetAt) rateState.delete(key);
      }
    }
    return false;
  }
  current.count += 1;
  return current.count > RATE_MAX;
}

/** Public, read-only tools. Each tool's data comes from the site's own sources. */
const TOOLS = [
  {
    name: "list_services",
    description:
      "List the six services Deuvix AI Factory offers, with a description and the public URL for each.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: "list_projects",
    description:
      "List published Deuvix AI Factory projects with a short summary and their public case-study URLs.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: "get_contact_info",
    description:
      "Return the public contact details: business email, booking page and LinkedIn company page.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
] as const;

type ToolName = (typeof TOOLS)[number]["name"];

function toolResult(data: unknown): Record<string, unknown> {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

async function runTool(name: ToolName): Promise<Record<string, unknown>> {
  switch (name) {
    case "list_services":
      return toolResult(
        pricingItems.map((item) => ({
          name: item.name,
          description: item.description,
          url: `${ORIGIN}/products#${item.anchor}`,
        }))
      );
    case "list_projects":
      try {
        const projects = await listPublishedProjects();
        return toolResult(
          projects.map((project) => ({
            name: project.name,
            description: project.description,
            url: `${ORIGIN}/projects/${project.slug}`,
            liveUrl: project.liveUrl || null,
          }))
        );
      } catch {
        return {
          ...toolResult({ projects: [], note: "Project data is temporarily unavailable." }),
          isError: true,
        };
      }
    case "get_contact_info":
      return toolResult({
        email: company.businessEmail,
        bookCallUrl: `${ORIGIN}/book-a-call`,
        linkedIn: company.socials.linkedin,
      });
  }
}

export async function POST(request: NextRequest) {
  if (isRateLimited(clientIp(request))) {
    return json(
      { jsonrpc: "2.0", id: null, error: { code: -32000, message: "Rate limit exceeded" } },
      429
    );
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    return rpcError(null, -32600, "Request too large", 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    (body as Record<string, unknown>).jsonrpc !== "2.0" ||
    typeof (body as Record<string, unknown>).method !== "string"
  ) {
    return rpcError(null, -32600, "Invalid Request");
  }

  const message = body as Record<string, unknown>;
  const id = message.id;
  const method = message.method as string;

  // JSON-RPC notifications have no id and MUST NOT receive a response body.
  if (id === undefined) {
    return new NextResponse(null, { status: 202, headers: CORS });
  }

  switch (method) {
    case "initialize":
      return json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: SERVER_CARD.name, version: SERVER_CARD.version },
        },
      });

    case "ping":
      return json({ jsonrpc: "2.0", id, result: {} });

    case "tools/list":
      return json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });

    case "tools/call": {
      const params = message.params as Record<string, unknown> | undefined;
      const name = params?.name;
      if (
        !params ||
        typeof name !== "string" ||
        !TOOLS.some((tool) => tool.name === name) ||
        (params.arguments !== undefined &&
          (typeof params.arguments !== "object" ||
            params.arguments === null ||
            Array.isArray(params.arguments)))
      ) {
        return rpcError(id, -32602, "Invalid params");
      }
      return json({
        jsonrpc: "2.0",
        id,
        result: await runTool(name as ToolName),
      });
    }

    default:
      return rpcError(id, -32601, "Method not found");
  }
}

export function GET() {
  return new NextResponse(null, {
    status: 405,
    headers: { ...CORS, Allow: "POST, OPTIONS" },
  });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
