# deux-ai

Marketing site for **DEUX AI Factory**, plus its Gemini-powered support chatbot.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Drizzle + Supabase Postgres · next-auth (JWT)

## Getting started

```bash
npm install
cp .env.example .env.local     # then fill in GEMINI_API_KEY and DATABASE_URL
npm run dev                        # http://localhost:3000
```

`npm run db:migrate` applies `drizzle/*.sql` to the database in `DATABASE_URL`.

## Chatbot

The widget mounts on every marketing route (client-only, see `layout-shell.tsx`).

| Layer | Where |
| --- | --- |
| SSE pipeline (rate limit → guard → route → retrieve → Gemini → output-guard → re-stream) | `src/app/api/chat/route.ts` |
| Lead + feedback endpoints | `src/app/api/chat/lead/route.ts`, `src/app/api/chat/feedback/route.ts` |
| System prompt + brand context | `src/lib/chat/systemPrompt.ts`, `data/deux-company.md`, `data/deux-faq.md` |
| Input guardrails (pricing, payment, injection, abuse, off-topic) | `src/lib/chat/guardrails.ts` |
| Output guard (prices, unlisted URLs, prompt leaks) | `src/lib/chat/output-guard.ts` |
| Routing + retrieval | `src/lib/chat/route-classify.ts`, `src/lib/chat/retrieve.ts` |
| Redaction, memory, lead handoff, Markdown renderer | `src/lib/chat/{redact,memory,lead-handoff,markdown}.ts(x)` |
| UI | `src/components/chat/*` |

Key behaviours:

- The model's output is buffered, run through `checkOutput`, then re-streamed to the
  browser as JSON lines (`meta` / `token` / `error` / `done`). Prices can never flash
  on screen, even for one frame.
- Prices are never quoted. Pricing questions are blocked before the model runs.
- `temperature` is hard-clamped to `0.3`; user input is capped at 1000 chars.
- Markdown is rendered as React elements only — no `dangerouslySetInnerHTML` anywhere.

### Required environment

```
GEMINI_API_KEY=...            # you add this; tests and ingestion are LIVE
GEMINI_API_KEY_INGEST=...     # optional: second Google project, used only by ingest
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
DATABASE_URL=postgres://...
```

> **Embedding quota.** The free tier allows **1000 embedding requests per day,
> per Google project**, and every chunk — plus every chat query before retrieval —
> counts as one request. Source A is ~160 requests; Source B's corpus is 5.9M
> characters, so ingesting all of it needs more than one day's budget unless it is
> split across projects (`GEMINI_API_KEY_INGEST`) or run in batches over several
> days.

See `.env.example` for the full `# --- Chatbot (Gemini) ---` block (rate limits,
founder contact, lead webhook, tuning knobs).

### Knowledge base

Two sources are stored in `kb_pages` / `kb_chunks`, namespaced by the `source` column:

- **`deux`** — every public page of this site, with the pricing section stripped
- **`agentfactory`** — <https://agentfactory.panaversity.org> (build guides, 300 ms
  between fetches, robots.txt honoured, pages pruned when they leave the sitemap)

Re-index after content changes:

```bash
# Source A needs the site running
npm run dev                                  # in one terminal
npm run ingest -- --source deux --base-url http://localhost:3000

# Source B is fetched from the public internet
npm run ingest -- --source agentfactory

# Both, plus prune pages that no longer exist
npm run ingest -- --all
```

Useful flags: `--dry-run` (no writes), `--force` (re-embed everything), `--limit N`,
`--no-prune`, `--base-url`. The script aborts with a clear message if
`DATABASE_URL` or `GEMINI_API_KEY` is missing.

**Add new pages:** append the path to `SOURCE_A_PATHS` in `scripts/ingest.ts`.

## Testing

```bash
npm test          # vitest: unit tests (guardrails, output-guard, redaction, routing, markdown XSS, rate limits, lead schema)
npm run test:e2e  # playwright: launcher, focus trap, Escape, mobile sheet
npm run lighthouse # lhci: a11y + best-practices assertions against a production build
```

Notes:

- Playwright uses the system-installed Chrome (`channel: "chrome"`) — no browser
  download needed. Tests run serially against a single dev server.
- `npm run lighthouse` builds and serves the production app on port 3000; stop any
  running `npm run dev` first.

## Known content gaps

The chatbot must never invent these. Each one is an explicit `TODO` in
`data/deux-company.md` / `data/deux-faq.md`, and the assistant answers
*"I don't have that information"*:

- No FAQ page, no "what we don't do" list
- No stated target clients, languages, or timezone
- No phone number (founders are reachable by email / WhatsApp / booking link only)
- `/projects` has no case studies; testimonials are placeholders
- **No stated affiliation with Agent Factory / Panaversity** — questions about it
  are refused rather than answered
- Pricing is never quoted
