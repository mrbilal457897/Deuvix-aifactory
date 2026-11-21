/**
 * MCP Server Card for the public Deuvix AI Factory MCP endpoint.
 *
 * Hybrid document: the current SEP-2127 shape (identity, transport, protocol
 * versions) plus the legacy SEP-1649 discovery fields that older audits look
 * for. `capabilities` is deliberately an exact copy of the live /mcp
 * `initialize` response — this server implements tools only.
 *
 * This constant is the single source of truth for every hosted location of
 * the card.
 */

export const SERVER_CARD_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, If-None-Match",
  "Cache-Control": "public, max-age=3600",
  ETag: '"deuvix-mcp-server-card-v2"',
};

const NAME = "com.deuvix-ai/mcp";
const TITLE = "Deuvix AI Factory";
const VERSION = "1.0.0";
const PROTOCOL_VERSION = "2025-06-18";
const DESCRIPTION =
  "Read-only MCP server for Deuvix services, live projects and public contact details.";

export const SERVER_CARD = {
  // --- current spec (SEP-2127) -------------------------------------------
  $schema: "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json",
  name: NAME,
  title: TITLE,
  description: DESCRIPTION,
  version: VERSION,
  websiteUrl: "https://deuvix-ai.com",
  remotes: [
    {
      type: "streamable-http",
      url: "https://deuvix-ai.com/mcp",
      supportedProtocolVersions: [PROTOCOL_VERSION],
    },
  ],
  supportedProtocolVersions: [PROTOCOL_VERSION],

  // --- legacy SEP-1649 discovery fields ----------------------------------
  serverInfo: { name: NAME, title: TITLE, version: VERSION },
  protocolVersion: PROTOCOL_VERSION,
  transport: { type: "streamable-http", endpoint: "/mcp" },
  capabilities: { tools: { listChanged: false } },
  documentationUrl: "https://deuvix-ai.com/",
  authentication: { required: false },
} as const;
