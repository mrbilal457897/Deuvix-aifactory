/**
 * MCP Server Card for the public Deuvix AI Factory MCP endpoint.
 *
 * The Server Card schema deliberately does NOT enumerate tools/resources —
 * those are discovered at runtime via tools/list. This constant is the single
 * source of truth for both hosted locations of the card.
 */
export const SERVER_CARD = {
  $schema: "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json",
  name: "com.deuvix-ai/mcp",
  title: "Deuvix AI Factory",
  description:
    "Read-only MCP server for Deuvix services, live projects and public contact details.",
  version: "1.0.0",
  websiteUrl: "https://deuvix-ai.com",
  remotes: [
    {
      type: "streamable-http",
      url: "https://deuvix-ai.com/mcp",
      supportedProtocolVersions: ["2025-06-18"],
    },
  ],
} as const;
