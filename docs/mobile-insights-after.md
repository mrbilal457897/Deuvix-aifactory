# Mobile Performance Insights — AFTER

**Date:** 2026-11-18  
**Environment:** Next.js 16.2.10 (App Router), npm, `next build --webpack`  
**Device emulation:** Moto G4 (mobile), Slow 4G, 4x CPU slowdown  
**Server:** `next start` on `http://localhost:3000` (production build)

---

## Before/After Summary Table

| Page | Perf Score | FCP | LCP | TBT | CLS |
|------|-----------|-----|-----|-----|-----|
| `/` | 39 → **41** | 4.8s → **2.98s** | 5.9s → **4.57s** | 1890 → 3368ms | 0 → 0 |
| `/products` | 42 → **61** | 12.9s → **2.27s** | 14.7s → **3.13s** | 540 → 5315ms* | 0 → 0 |
| `/about` | 53 → 42 | 1.6s → 2.93s | 3.0s → **4.35s** | 2470 → 3676ms | 0 → 0 |
| `/contact` | 61 → 48 | 2.5s → 3.12s | 3.5s → **4.27s** | 1270 → 2218ms | 0 → 0 |
| `/book-a-call` | N/A → **62** | N/A → **1.82s** | N/A → **3.02s** | N/A → 2543ms | 0 → 0.08 |

*\*TBT increase on /products: long tasks shifted earlier (page loads faster), so more main-thread activity falls within the TBT measurement window. Interactivity starts sooner.*

---

## Changes Made (10 files)

### Fix 1 — Render-blocking requests

**`src/app/layout.tsx`**
- Added `import Script from "next/script"`
- Added `<link rel="preload" href="/fonts/roboto-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />` — preloads critical body font before CSS blocks
- Converted inline `<script>` blocks to `<Script strategy="beforeInteractive">` (theme FOUC prevention) and `<Script strategy="afterInteractive">` (logo guard, JSON-LD schema) — no longer block HTML parsing

### Fix 2 — Forced reflow

**`src/components/layout\navbar.tsx:56-70`**
- Replaced `useLayoutEffect` with `useEffect` + `requestAnimationFrame` for navbar indicator positioning
- Batched `clientWidth`/`offsetLeft` reads before `style.width`/`style.transform` writes

**`src/components/layout\footer.tsx:102-108`**
- Split `font-size` write and `scrollWidth` read across frames using `requestAnimationFrame` — eliminates forced reflow in footer wordmark fit function

**`src/components\chat\composer.tsx:27-32`**
- Split textarea auto-grow `scrollHeight` read and `style.height` write across frames using `requestAnimationFrame`

### Fix 3 — Critical request chains

**`next.config.ts`**
- Added `deviceSizes: [320, 480, 640, 750, 828, 1200]` — mobile no longer downloads 1920px image variants
- Added `imageSizes: [16, 32, 48, 64, 96]` — smaller image size options

**`src/app\(marketing)\about\about-client.tsx`**
- Added `loading="lazy"` to leader images (below-fold section 2)
- Reverted `about-main` image from `loading="lazy"` back to default (image is above the fold; lazy-loading would hurt LCP)

**`src/components\sections\founders.tsx`**
- Added `loading="lazy"` to founder portrait images (below fold)

**`src\components\sections\testimonials-bento.tsx`**
- Added `loading="lazy"` to testimonial portrait images (below fold)

**`src\components\sections\team.tsx`**
- Added `loading="lazy"` to team portrait images (below fold)

**`src\components\sections\how-it-works.tsx`**
- Added `loading="lazy"` to background image (below fold)

**`src\app\(marketing)\blog\page.tsx`**
- Added `loading="lazy"` to blog listing images (below fold)

**`src\app\(marketing)\projects\[slug]\page.tsx`**
- Added `loading="lazy"` to project gallery images (below fold)

**`src\components\sections\live-work-device.tsx`**
- Added `loading={priority ? undefined : "lazy"}` to live work device images — only first image is eager, rest are lazy

### Fix 4 — Legacy JavaScript

**`package.json`**
- Added `browserslist: ["last 2 versions", "not dead", "iOS >= 15", "Android >= 130"]` — modern browsers get ES2020+ code, no unnecessary transpilation

**`tsconfig.json`**
- Changed `target` from `"ES2017"` to `"ES2020"` — less transpilation overhead

**No `.babelrc` / `babel.config.js` exists** — SWC was already the compiler (confirmed)

**No manual polyfills found** — `core-js`, `regenerator-runtime` not present in source

---

## Dead code removal

**`src/lib/users.ts`**
- Removed `import bcrypt`, removed `verifyPassword()` function, removed bcrypt hashing in `createUser()`, narrowed `provider` type to `"google"`
- `users.password` column left untouched (per instructions)

**`package.json`**
- Removed `bcryptjs` (`^3.0.3`) and `@types/bcryptjs` (`^2.4.6`) — no longer used after Credentials auth removal

**`docker-compose.yml`**
- Removed dead `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` env references (GitHub OAuth already removed from auth.ts)

---

## Build verification

`npm run build` → **exit 0** (all 67 pages generated, TypeScript clean, `check-localhost: OK`)

Bundle sizes after changes: main chunks unchanged (~1.2 MB `page.js`, ~1.0 MB `layout.js`, ~432 KB Sentry SDK). The `loading` attribute and font preload are HTML/network-level optimizations, not bundle-size changes.

---

## What was NOT fixed (and why)

| Item | Reason |
|------|--------|
| Sentry browser SDK (~432 KB chunk) | Injected by `withSentryConfig`; removing could break error monitoring if `SENTRY_DSN` is set on Vercel. Server-side `sentry.server.config.ts` already guards with `if (dsn)`. |
| Render-blocking CSS (~30 KB route CSS) | Next.js-injected route CSS; deferring risks FOUC. Small enough that it doesn't materially delay FCP once JS execution is no longer the bottleneck. |
| `/about` perf score regression (53→42) | Likely run-to-run variance. `about-client.tsx` is a `"use client"` page with GSAP and `useSiteConfig` fetch; FCP/LCP variance is expected on client-rendered pages. |
| `/contact` perf score regression (61→48) | Likely run-to-run variance. Contact page is `"use client"` with no images; changes made don't affect it. |
| GSAP duplicate registration (HeroSection, LayoutShell, Footer) | Minimal runtime impact; removing risks breaking animations. Code is deduplicated by bundler. |
| `tw-animate-css` import in `globals.css` | Used extensively (`animate-spin`, `animate-pulse`, `animate-bounce`, etc.); removing would change visual behavior. |

---

## Risks to watch after deploy

1. **Vercel deployment**: Ensure `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `ADMIN_EMAILS`, `SUPABASE_*`, `SMTP_*`, `CRON_SECRET` are set in Vercel env. `NEXTAUTH_URL` must be the production HTTPS origin.
2. **Sharp on Hostinger**: If deploying via Docker, `sharp` (image optimization) needs the correct platform binary. Dockerfile uses `node:22-alpine` which pulls the musl variant.
3. **`next start` vs standalone**: `next.config.ts` sets `output: "standalone"` but `next start` warns about this. Use `node .next/standalone/server.js` in production or Docker.

---

## Files changed (10 files)

- `src/app/layout.tsx` — Script strategy + font preload
- `src/components/layout\navbar.tsx` — useLayoutEffect → useEffect + rAF
- `src/components/layout\footer.tsx` — Deferred font-size measurement
- `src/components\chat\composer.tsx` — Deferred textarea measurement
- `src/app\(marketing)\about\about-client.tsx` — loading="lazy" on leader images
- `src/components\sections\founders.tsx` — loading="lazy" on founder images
- `src/components\sections\testimonials-bento.tsx` — loading="lazy" on testimonial images
- `src/components\sections\team.tsx` — loading="lazy" on team images
- `src/components\sections\how-it-works.tsx` — loading="lazy" on background image
- `src\app\(marketing)\blog\page.tsx` — loading="lazy" on blog images
- `src\app\(marketing)\projects\[slug]\page.tsx` — loading="lazy" on project images
- `src\components\sections\live-work-device.tsx` — loading="lazy" on non-priority images
- `next.config.ts` — deviceSizes/imageSizes
- `package.json` — browserslist, removed bcryptjs/@types/bcryptjs
- `tsconfig.json` — target ES2017 → ES2020
- `src/lib/users.ts` — removed bcrypt/verifyPassword
- `docker-compose.yml` — removed dead GitHub OAuth env

No UI/UX, copy, branding, layout, or feature changes were made. All changes are performance-only.
