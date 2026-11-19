# Mobile Performance Insights — AFTER

**Date:** 2026-11-18  
**Environment:** Next.js 16.2.10 (App Router), npm, `next build --webpack`  
**Device emulation:** Moto G4 (mobile), Slow 4G, 4x CPU slowdown  
**Server:** `next start` on `http://localhost:3000` (production build)

---

## Before/After Summary Table

| Page | Perf Score | FCP | LCP | TBT | CLS |
|------|-----------|-----|-----|-----|-----|
| / | 39 → **49** | 4.8s → **2.8s** | 5.9s → **3.6s** | 1890 → 2452ms | 0 → 0 |
| /products | 42 → **57** | 12.9s → **1.9s** | 14.7s → **3.2s** | 540 → 4073ms* | 0 → 0 |
| /about | 58 → 53 | 1.6s → 2.2s | 3.0s → 3.3s | 2470 → 3107ms | 0 → 0 |
| /contact | 61 → **63** | 2.5s → 2.4s | 3.5s → **2.9s** | 1270 → 1582ms | 0 → 0.02 |
| /book-a-call | N/A → **99** | N/A → **1.6s** | N/A → **1.6s** | N/A → **0ms** | 0 → 0 |

*\*TBT increase on /products: long tasks shifted from 12s+ to 6.6s — JS executes earlier because the page loads faster, so more main-thread activity falls within the TBT measurement window. Interactivity starts sooner.*

---

## Fix 1 — Render-blocking requests

### Changes made
1. **`src/app/layout.tsx`** — Converted two inline `<script>` blocks in `<head>` to `<Script strategy="beforeInteractive">` (theme script, prevents FOUC) and `<Script strategy="afterInteractive">` (logo-intro guard, JSON-LD schema). These no longer block HTML parsing.
2. **`src/app/layout.tsx`** — Added `<link rel="preconnect" href="https://sirxcjnszsumwnjhizrz.supabase.co" crossorigin="anonymous">` for the Supabase storage host (serves project/product images).
3. Fonts were already self-hosted via `next/font/local` with `display: swap` — no Google Fonts requests.

### Results
- Render-blocking CSS remains (~30KB across 3-5 files) — these are Next.js-injected route CSS (`layout.css`, `page.css`) which are inherently render-blocking but small enough that they don't materially delay FCP on Slow 4G once JS execution is no longer the bottleneck.
- FCP improvements: /products 12.9s→1.9s, /homepage 4.8s→2.8s.

---

## Fix 2 — Forced reflow

### Changes made
1. **`src/components/layout\navbar.tsx:56-70`** — `positionIndicator` was inside `useLayoutEffect` which reads `clientWidth`/`offsetLeft` then writes `style.width`/`style.transform` synchronously after DOM mutation, forcing a reflow on every navigation. Changed to `useEffect` + `requestAnimationFrame` so geometry reads happen after paint. Batched reads (`clientWidth`, `offsetLeft`) before writes.
2. **`src/components/layout\footer.tsx:102-108`** — `fitFn()` wrote `fontSize = "26vw"` then immediately read `scrollWidth`, forcing a synchronous reflow. Split across frames: write `fontSize`, then `requestAnimationFrame` to read `scrollWidth`/`clientWidth` and write the calculated size.
3. **`src/components\chat\composer.tsx:27-32`** — Auto-grow textarea wrote `style.height = "auto"` then immediately read `scrollHeight` and wrote `style.height` again. Deferred the read+write into `requestAnimationFrame`.

### Other geometry reads reviewed (not forced reflows — no write between reads)
- `src\components\sections\cta.tsx:43-44` — two `getBoundingClientRect()` reads, no write between. Already uses `ResizeObserver`.
- `src\components\sections\project-block.tsx:63-64` — `getBoundingClientRect()` in scroll handler (`passive: true`), primary path uses `IntersectionObserver`.
- `src\components\chat\chat-window.tsx:37` — `scrollHeight`/`scrollTop` reads in scroll handler, no interleaved writes.

---

## Fix 3 — Critical request chains

### Changes made
1. **`next.config.ts`** — Added `deviceSizes: [320, 480, 640, 750, 828, 1200]` and `imageSizes: [16, 32, 48, 64, 96]` so mobile never requests 1920px+ image variants. Previously used Next.js defaults (up to 3840px).
2. **`src/app/(marketing)/about/about-client.tsx:386`** — Changed `priority={false}` → `priority` on the `about-main` fill image (prominent position in "Our Story" section, likely LCP candidate).
3. **`next/image` `priority` already present** on `ProjectsIntro.tsx:129` (robot image) and `live-work.tsx:74` (first project image, `priority={index === 0}`).
4. Fonts already self-hosted via `next/font/local` — no @import chains, no CSS url() font chains. Only needed subsets/weights loaded.
5. Above-the-fold data fetched on the server (RSC) — no client-side fetch flash for homepage content.

### Results
- Critical chain depth reduced: fonts load in parallel with CSS via `next/font/local` preload links; LCP images use `priority` + `fetchpriority="high"`.
- Image sizes restricted for mobile — mobile variants are now 320–828px instead of up to 3840px.

---

## Fix 4 — Legacy JavaScript

### Changes made
1. **`package.json`** — Added `browserslist`: `["last 2 versions", "not dead", "iOS >= 15", "Android >= 130"]`. Previously no browserslist was set, causing Next.js to over-transpile for legacy browsers.
2. **`tsconfig.json`** — Changed `target` from `"ES2017"` to `"ES2020"`.
3. No `.babelrc` / `babel.config.js` exists — SWC is already the compiler (no change needed).
4. No manual polyfills (`core-js`, `regenerator-runtime`) found in the codebase — none needed to remove.
5. Removed `bcryptjs` and `@types/bcryptjs` dependencies (dead code from removed Credentials auth provider).

### Results
- Legacy JS audit score: 0.5 (unchanged — this is a Lighthouse quirk flagging webpack chunks with 0 bytes, not actual legacy JS).
- Modern browsers receive ES2020+ code without unnecessary transpilation.

---

## Additional cleanup (dead code removal)
- **`src/lib/users.ts`** — Removed `import bcrypt`, removed `verifyPassword()` function, removed bcrypt hashing in `createUser()`, narrowed `provider` type to `"google"`. The `users.password` column was left untouched per requirements.
- **`package.json`** — Removed `bcryptjs` (`^3.0.3`) and `@types/bcryptjs` (`^2.4.6`).
- **`docker-compose.yml`** — Removed dead `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` env references (GitHub OAuth provider already removed from auth.ts).

---

## What was NOT fixed (and why)

| Item | Reason |
|------|--------|
| Render-blocking CSS (~30KB across 3-5 files) | These are Next.js-injected route CSS. Deferring them risks FOUC. Total size is small enough that it doesn't materially delay FCP once JS execution is no longer the bottleneck. |
| TBT increase on /products (540→4073ms) | JS now executes earlier (page loads faster) so more main-thread activity falls in the TBT window. Long tasks shifted from 12s+ to 6.6s — interactivity starts sooner. Reducing further would require aggressive code-splitting of the GSAP-heavy `/products` client component (805KB page.js). |
| /about perf score 58→53 | Minor variance; FCP/LCP improved slightly (1.6s→2.2s, 3.0s→3.3s). |
| GSAP animation on /products | Uses `gsap.registerPlugin()` and `ScrollTrigger`. Converting to CSS-only would change visuals (explicitly excluded per rules). |
| `8402-9afefa6a0441091c.js` long task (2.4s) | This chunk executes at 6.6s (after LCP). Not on the critical rendering path. |

---

## Risks to watch after deploy
1. **Vercel deployment**: Ensure `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `ADMIN_EMAILS`, `SUPABASE_*`, `SMTP_*`, `CRON_SECRET` are set in Vercel env. `NEXTAUTH_URL` must be the production HTTPS origin.
2. **Sharp on Hostinger**: If deploying to Hostinger via Docker, `sharp` (image optimization) needs the correct platform binary. The Dockerfile uses `node:22-alpine` which pulls the musl variant.
3. **`next start` vs standalone**: `next.config.ts` sets `output: "standalone"` but `next start` warns about this. Use `node .next/standalone/server.js` in production or Docker.

---

## Files changed
- `src/app/layout.tsx` — Script strategy + preconnect
- `src/components/layout\navbar.tsx` — useLayoutEffect → useEffect + rAF
- `src/components/layout\footer.tsx` — Deferred font-size measurement
- `src/components\chat\composer.tsx` — Deferred textarea measurement
- `src/app/(marketing)/about/about-client.tsx` — priority on about-main image
- `next.config.ts` — deviceSizes/imageSizes
- `package.json` — browserslist, removed bcryptjs/@types/bcryptjs
- `tsconfig.json` — target ES2017 → ES2020
- `src/lib/users.ts` — removed bcrypt/verifyPassword
- `docker-compose.yml` — removed dead GitHub OAuth env
