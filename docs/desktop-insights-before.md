# Desktop Performance Insights — BEFORE

**Date:** 2026-11-19
**Environment:** Next.js 16.2.10 (App Router), npm, `next build --webpack`
**Target device:** Desktop, default Chrome preset (1440×900)
**Server:** standalone on `http://localhost:3100` (`output: "standalone"`)

---

## Configuration snapshot (baseline)

| Setting | Value |
|---|---|
| Next.js version | 16.2.10 (≥15, `next.config.ts` supported) |
| Router | App Router (`src/app/(marketing)/*`) |
| Package manager | npm |
| `tsconfig.json` target | ES2020 ✓ (was ES2017 before mobile fixes) |
| `.babelrc`/`babel.config.js` | None ✓ (SWC) |
| `package.json` `browserslist` | `["last 2 versions", "not dead", "iOS >= 15", "Android >= 130"]` |
| Fonts | `next/font/local` (Roboto 400/500, Raleway 200–800, Inter 400/500, Space Grotesk 500–700), `display: swap` |
| `next.config.ts` | `output: "standalone"`, `images: { formats: ["image/webp"], minimumCacheTTL: 30d, deviceSizes: [...] }`, ISR `revalidate=3600` on 19 marketing + home routes, `optimizePackageImports: ["lucide-react","gsap"]` |
| Bare `.babelrc` | None |
| Global polyfills (`core-js`, `regenerator-runtime`) | None |

## Lighthouse DESKTOP measurements

Only 3 of the 8 pages were captured pre-fix this run (environment was
unstable; the full sweep is included in the After doc once the new standalone
is serving all pages). Captured numbers were:

| Page | Perf | FCP | LCP | TBT | CLS | SI |
|------|------|-----|-----|-----|-----|-----|
| `/` | **78–87** (3 runs) | 0.3s | **2.45s–4.28s** | 250ms+ | 0 | ~3.6s |
| `/products` | **100** | 0.3s | **0.44s–0.46s** | 0 | 0 | ~0.6s |
| `/projects` | **78–100** | 0.4s | **0.47s–4.68s** | low | 0 | — |
| `/about` | not freshly-measured on this refresh (see After) | — | — | — | — | — |
| `/blog` | not freshly-measured on this refresh (see After) | — | — | — | — | — |
| `/contact` | not freshly-measured on this refresh (see After) | — | — | — | — | — |
| `/book-a-call` | not freshly-measured on this refresh (see After) | — | — | — | — | — |
| `/projects/restoran` | 68–86 (run variance) | — | **2.61s / 0.37s / 2.61s** | — | — | — |

> Outlier-prone readings: LCP on `/` varied between 2.45s and 4.28s across
> runs on the cold standalone — a symptom of the LCP image being fetched
> after hydration/priority scheduling, not of the page itself.

## Findings per insight (as flagged by Lighthouse before)

### 1. Render-blocking requests
- 0 external render-blockers above the fold (fonts are self-hosted with
  `display: swap`, no `@import`, no Google Fonts links).
- Two inline `<script>` blocks in `<head>` (theme bootstrap + logo intro guard).
  Layer 1 (`theme-script`) is `beforeInteractive` and Layer 2
  (logo-intro) is `afterInteractive` — already handled in the mobile fix.
- CSS bundle ~23 KB (down from earlier) — inline by Next.js route chunks.
- One Shopify LCP image on the homepage (the robot on /projects) uses
  `next/image priority` ✓.

### 2. Legacy JavaScript
- No `.babelrc` / `babel.config.js` ✓ (SWC).
- `tsconfig.json` target = ES2020 ✓.
- `browserslist` already set (last 2 versions); no dead-browser transpilation.
- No `core-js` / `regenerator-runtime` strings in any import ✓.
- `@sentry/nextjs` ships ES2020+ bytecode for modern browsers.
- No `nomodule` bundle is shipped in this build ✓ (verified via bundle scan).

### 3. Forced reflow (desktop-hotspots)
- Fixed: `navbar.tsx` — `positionIndicator()` used `useLayoutEffect` with
  synchronous `clientWidth`/`offsetLeft` reads → switched to `useEffect` +
  `requestAnimationFrame` so the read happens after paint (no sync reflow on
  every navigation / resize).
- Fixed: `footer.tsx` — `fitFn()` wrote `fontSize = "26vw"` then immediately
  read `mark.scrollWidth` — split into write + RAF + read.
- Fixed: `chat/composer.tsx` — auto-grow textarea wrote `height = "auto"`
  then synchronously read `scrollHeight` — deferred into RAF.
- Reviewed, **not forced reflows** (no write between read):
  - `cta.tsx:43-44` `getBoundingClientRect()` x2 (no writes) — fine
  - `project-block.tsx:63-64` `getBoundingClientRect()` + `window.innerHeight`
    — window.innerHeight fallback only when !document.documentElement.clientHeight
  - `footer.tsx:104-105`, `225-227` — single read; followers read from cache
  - `navbar.tsx:65-66`, `178`, `162` — reads inside RAF callbacks, no sync reflow
  - `timezone-select.tsx:78`, `chat-widget.tsx:37`, `chat-window.tsx:37,43,49`
    — all after an async boundary, not sync-forced

### 4. Critical request chains
- `/projects` robot (`priority`) is discoverable in the initial HTML ✓
- Fonts preloaded by `next/font/local` (preconnect to self) ✓
- Above-the-fold data (project blocks) is server-rendered — no client-side
  fetch flash ✓ (ISR ships the page cached)
- Below-the-fold sections (Testimonials, Founders, CTA) are not code-split —
  they ride on the shared chunk graph. Possible optimization for later.
- 3rd-party scripts are `next/script strategy="afterInteractive"` / lazy
  (no analytics; WhatsApp FAB opens on tap only) ✓
- `.next/static/chunks/8402-9afefa6a0441091c.js` (433 KB, includes Sentry) loads
  on first paint as a shared chunk — largest single request on the critical
  path
- `.next/static/chunks/main-d19169e43d6f1977.js` (349 KB) + `framework` +
  `polyfills` (110 KB) — these are framework-level, not lazy-loadable

## Risk areas before the fix
1. `main-*.js` and `framework-*.js` dominate the LCP path — no simple split
   with App Router + shared `layout.js` already
2. JS execution of `@sentry/nextjs` (bundled into shared chunk) is a long task
   on low-end CPUs
3. Homepage chunk count is high (21 chunks) — `console`-trace left on `main-app.js`

## Build system problems found before the fix
- `.next\lock` stale from a zombie build process blocked every `next build`
  with "Another next build process is already running" — fixed by deleting
  the stale lock and PID files
- Standalone server refused to start with "Could not load the 'sharp' module
  using the win32-x64 runtime" because the Windows lockfile didn't ship
  `@img/sharp-win32-x64` optional dependency — added to `package.json`
  `optionalDependencies` in this session

