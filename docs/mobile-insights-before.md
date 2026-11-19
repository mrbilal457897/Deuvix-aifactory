# Mobile Performance Insights — BEFORE

**Date:** 2026-11-18  
**Environment:** Next.js 16.2.10 (App Router), npm, `next build --webpack`  
**Device emulation:** Moto G4 (mobile), Slow 4G, 4x CPU slowdown  
**Server:** `next start` on `http://localhost:3000` (production build)

## Homepage (`/`) — Lighthouse Baseline

| Metric | Value | Score |
|---|---|---|
| Performance (overall) | — | **39** |
| First Contentful Paint (FCP) | 4.8s | 0.11 |
| Largest Contentful Paint (LCP) | 5.9s | 0.14 |
| Total Blocking Time (TBT) | 1,890ms | 0.09 |
| Cumulative Layout Shift (CLS) | 0 | 1.00 |
| Speed Index | 4.9s | 0.66 |

### Render-blocking requests
- Score: 1.0 (0 items flagged by Lighthouse)
- CSS: `layout.css` (31KB) + `page.css` (9KB)
- Two inline `<script>` blocks in `<head>` (theme script + logo-intro guard)

### Legacy JavaScript
- Score: 0.5
- Flagged: `_next/static/chunks/app/layout.js`, `_next/static/chunks/main-app.js` (report 0 bytes — webpack chunk quirk)

### Critical request chains
- Chain depth appears shallow (single root) but individual assets load sequentially

### Network breakdown (top resources by size)
| Resource | Type | Size |
|---|---|---|
| `_next/static/chunks/app/page.js` | Script | 1,251,266 B (1.2MB) |
| `_next/static/chunks/app/layout.js` | Script | 1,075,702 B (1.0MB) |
| `_next/static/chunks/app/error.js` | Script | 160,628 B |
| `_next/static/chunks/app/not-found.js` | Script | 89,025 B |
| `d9b491decc0ea3af-s.p.woff2` | Font | 36,522 B |
| `32a254422883c2af-s.p.woff2` | Font | 35,498 B |
| `_next/static/css/app/layout.css` | Stylesheet | 31,187 B |
| 5 more font files | Font | ~110KB combined |
| **TOTAL** | — | **~2.98MB** |

## Issues identified

### Issue 1 — Render-blocking requests
No external stylesheets block render (fonts are self-hosted via `next/font/local` with `display: swap`). However:
- Two blocking inline `<script>` blocks in `<head>` (theme + logo-intro)
- CSS (`layout.css` 31KB, `page.css` 9KB) loads in parallel but still on critical path

### Issue 2 — Forced reflow
Not yet flagged by Lighthouse on homepage, but codebase uses GSAP/Framer Motion and geometry reads (`offsetWidth`, `getBoundingClientRect`) in several sections — needs code audit.

### Issue 3 — Critical request chains
- LCP image loads via `next/image` (next/image optimization) — needs `priority` + `fetchpriority="high"`
- Font chain: HTML → CSS → font files (7 font weights loaded, though only some used above the fold)
- Large JS chunks load before content can hydrate

### Issue 4 — Legacy JavaScript
- `tsconfig.json` `target: "ES2017"` — should be ES2020+
- No `browserslist` in `package.json` — Next defaults may over-transpile
- No `.babelrc` / `babel.config.js` (good — SWC is active)
- 7 font-weight files loaded (subsetting needed)

## Next steps
Run baseline on `/products`, `/about`, `/contact`, `/book-a-call`, then apply fixes per issue and re-measure.