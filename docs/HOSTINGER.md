# Hostinger Node.js web apps — migration guide

Target: move Deuvix AI Factory from Vercel to Hostinger's Node.js web apps
product (built-in CDN, standalone Next.js server, limited CPU/RAM).
**No visual change. No behavior change. Same code.**

---

## 1. Next.js version & build

- Next.js `16.2.10` (>= 15 required by Hostinger for `next.config.ts`) — kept as-is.
- `next.config.ts` uses `output: "standalone"`. This is mandatory for
  Hostinger Node.js web apps. The build emits a self-contained server at
  `.next/standalone/server.js`.
- Hostinger "Build Command" should be `npm run build`.
  This runs `next build --webpack && node scripts/check-localhost.mjs`.
- **Start command Hostinger needs:**
  ```bash
  node .next/standalone/server.js
  ```
  Hostinger asks for this at deploy time (or exposes it as the "entry point").
  `npm run start` (`next start`) is NOT used — it doesn't work with
  `output: "standalone"`.
- **Hostinger Node.js runtime**: set Node 20+ (Hostinger support confirms Node 20/22/24
  are available; this app requires >= 20.9).

---

## 2. Environment variables — checklist

Copy every variable from the Vercel project to the Hostinger project
environment (Settings -> Environment variables):

```
SITE_URL / NEXT_PUBLIC_SITE_URL
NEXTAUTH_URL   (= https://<your-domain>, no trailing slash)
NEXTAUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
CRON_SECRET                      # required by /api/keep-alive and /api/cron/follow-up-reminders
ADMIN_EMAILS
GEMINI_API_KEY                   # used by the public Sara chatbot
GMAIL_APP_PASSWORD
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
CONTACT_TO_EMAIL, NOTIFY_EMAIL
CAL_API_KEY, CAL_WEBHOOK_SECRET, CAL_ORGANIZATION_SLUG, CAL_EVENT_KIND
NEXT_PUBLIC_CAL_ORIGIN, NEXT_PUBLIC_CAL_LINK
ADMIN_USER, ADMIN_PASSWORD       # /admin bookings basic-auth
DATABASE_URL                     # Supabase pooler (Session mode, port 5432) + CA cert configured in code
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_WHATSAPP_NUMBER      # wa.me click-to-chat (kept off when missing)
FOUNDERS_CONTACT_EMAIL, FOUNDERS_CONTACT_URL, FOUNDERS_WHATSAPP
NEXT_PUBLIC_CONTACT_EMAIL        # optional — falls back to config/company.ts
```

After migration, `SITE_URL` and `NEXTAUTH_URL` both point at the new domain.
Nothing else needs to change to flip domains — `SITE_URL` drives
metadataBase, canonicals, the sitemap, robots and OG tags.

---

## 3. Caching & capacity posture (after this change)

| Route / asset                                                  | Behavior after migration |
|----------------------------------------------------------------|--------------------------|
| `/` (homepage)                                                 | SSG + ISR, `revalidate = 3600`, invalidated on admin save via `revalidatePath("/")` |
| `/about`, `/products`, `/projects`, `/blog`, `/careers`, …     | SSG + ISR, `revalidate = 3600` |
| `/projects/[slug]`, `/blog/[slug]`                             | SSG + ISR (`generateStaticParams`), 1h |
| `/testimonials`, `/faq`, `/docs`, `/changelog`, legal pages    | SSG + ISR, 1h |
| `/book-a-call`                                                 | SSG + ISR, 1h (embed script still pulls live Cal.com slots) |
| `/sitemap.xml`, `/robots.txt`, `/rss.xml`, `/icon.svg`         | Prerendered static |
| `/api/site-config`                                             | `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` |
| `/uploads/<timestamp>.ext`                                     | `public, max-age=2592000, immutable` (30 days) |
| `/uploads/<stable-name>.ext` (e.g. `deuvix-poster.jpg`)        | `public, max-age=86400, stale-while-revalidate=86400` (1 day) |
| `proxy-image` (`/api/proxy-image`)                             | `public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400` |
| `/_next/image`                                                 | `minimumCacheTTL` 30 days; format `image/webp`; immutable timestamped URLs from Supabase Storage |
| `/deuvix`, `/admin`, `/api/admin/*`, `/api/contacts`, `/api/follow-ups`, `/api/tickets/*`, `/api/keep-alive` | `private, no-store, no-transform` — never cached |

**Admin saves** still invalidate the public pages immediately:
- Project save/update/delete/reorder/duplicate → `revalidateProjectSite()` → `revalidatePath("/", "/projects", "/projects/[slug]", "/sitemap.xml")`
- Site-config save → `revalidateTag("site-config", "max")` (the tag used by `unstable_cache`)

**Static content with dynamic timestamps** (project screenshots in Supabase Storage) are immutable by URL hash — safe for the 30-day image cache.

---

## 4. Cron jobs — replacements for Vercel Cron

**Vercel is gone.** The two cron jobs previously registered in `vercel.json`
are now plain protected API routes. Schedule them from Hostinger's cron
scheduler, OR an external runner such as GitHub Actions / cron-job.org.

### (a) `/api/cron/follow-up-reminders` — once daily, 04:00 UTC
Sends follow-up reminder emails for due leads. Was `0 4 * * *`.

Hostinger cron (replace `<DOMAIN>` and `$CRON_SECRET`):
```bash
0 4 * * * curl -sS -m 60 \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Accept: application/json" \
  https://<DOMAIN>/api/cron/follow-up-reminders
```

GitHub Actions equivalent (tested against this endpoint):
`.github/workflows/reminders.yml` already exists in the repo — point it at
the final domain (`SITE_URL` variable) and set `CRON_SECRET` as a secret.

### (b) `/api/keep-alive` — every 3 days, 03:00 UTC
Pings the DB so the free Supabase project doesn't pause. Was `0 3 */3 * *`.

```bash
0 3 */3 * * curl -sS -m 60 \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Accept: application/json" \
  https://<DOMAIN>/api/keep-alive
```

### (c) Manual manual-trigger / health-check
```bash
Anytime:
curl -sS -H "Authorization: Bearer $CRON_SECRET" https://<DOMAIN>/api/keep-alive
curl -sS -H "Authorization: Bearer $CRON_SECRET" https://<DOMAIN>/api/cron/follow-up-reminders
```

### Hobby-plan limits
Hostinger's free/starter cron may restrict to **one run per day** or
**specific times**. In that case, use `.github/workflows/keep-alive.yml`
(every 3 days via GitHub Actions) and `.github/workflows/reminders.yml`
(daily) — both are already in the repo. `CRON_SECRET` must match on both sides.

---

## 5. After deploy — verify with `curl -I`

Run these against the new origin and compare the headers.
Expected: 200 responses, correct `Cache-Control`, correct content type.

Static asset with a long/immutable name (`deuvix-poster.jpg` example — stable, 1d):
```bash
curl -I https://<DOMAIN>/uploads/deuvix-poster.jpg
# Expect: Cache-Control: public, max-age=86400, stale-while-revalidate=86400
```

Timestamped upload (immutable, 30 days):
```bash
curl -I https://<DOMAIN>/uploads/1786824376990.jpg
# Expect: Cache-Control: public, max-age=2592000, immutable
```

An ISR marketing page (e.g. `/careers`):
```bash
curl -I https://<DOMAIN>/careers
# Expect: 200, Cache-Control: public, s-maxage=3600, stale-while-revalidate=3600
```

The image optimizer (Next.js serves WebP, 30-day cache):
```bash
curl -I "https://<DOMAIN>/_next/image?url=%2Fimages%2Fdeuvix-poster.jpg&w=1080&q=75"
# Expect: Cache-Control: public, max-age=2592000, immutable
#        (minimumCacheTTL=30d), Content-Type: image/webp
```

Interactive/dynamic endpoints (must NOT be cached):
```bash
curl -I https://<DOMAIN>/api/keep-alive
# Expect: Cache-Control: no-store
curl -I https://<DOMAIN>/api/cron/follow-up-reminders
# Expect: Cache-Control: no-store
curl -I https://<DOMAIN>/deuvix
# Expect: Cache-Control: private, no-store, no-transform
curl -I https://<DOMAIN>/admin/bookings
# Expect: Cache-Control: private, no-store, no-transform
```

Image origin (Supabase):
```bash
curl -I https://<DOMAIN>/_next/image?url=%2Fimages%2Fdeuvix-robot.webp&w=828&q=75
# Expect: 200, Content-Type: image/webp, Cache-Control: public, max-age=2592000, immutable
```

---

## 6. Rollback

Keep the Vercel deployment live until Hostinger passes all curl checks. To roll
back, just point DNS at the previous provider — no code change is required.
Do not tear down the Vercel project until Hostinger has been running stably for
at least a week with the same traffic shape.

## 7. What this change did NOT touch
- No component, animation, image path, video, or copy changed.
- `vercel.json` was the only file deleted; both crons moved to the two routes
  above and are covered by the existing protected endpoints.
- The admin UI is completely unchanged.
