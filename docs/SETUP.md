# Book a Call — Setup Guide

Self-hosted Cal.com booking flow for DEUX AI Factory. No proprietary SaaS:
PostgreSQL + Drizzle for storage, Nodemailer over SMTP for email, `wa.me`
click-to-chat links for WhatsApp.

---

## 1. Architecture

```
Website  ──►  BookCallButton  ──►  Cal.com (self-hosted, modal)
   │                                            │
   │  and  /book-a-call                          ├─► emails the client + .ics
   ▼  (our own Calendly-style UI)               └─► adds meeting to calendar
GET  /api/cal/slots ──────────► Cal.com /v2/slots            │
POST /api/cal/book  ──────────► Cal.com /v2/bookings         │
   │      (CAL_API_KEY stays server-side)                    │
   │                                                        ▼
   └──────────► booked ─────────► Cal.com  ──POST + X-Cal-Signature-256──►  /api/cal/webhook
                                                                             │
                                                verify HMAC → zod → upsert by cal_uid
                                                                             │
                                            ┌────────────────────────────────┴──────────────────────────────┐
                                            ▼                                                               ▼
                             owner notification email                                          client confirmation email
                             (full details + wa.me link)                                       (brief + Join + WhatsApp)

/api/cron/reminders ──► confirmed bookings in ~24h ──► client + owner reminder
                                                     └── reminder_sent = true
```

**Routes**

| Path | Auth | Purpose |
|---|---|---|
| `GET /book-a-call` | none | Calendly-style booking page (`?month=2026-10`) |
| `GET /api/cal/slots` | none (rate limited) | Availability proxy for the booking page |
| `POST /api/cal/book` | none (rate limited) | Creates the booking via Cal.com |
| `POST /api/cal/webhook` | `X-Cal-Signature-256` HMAC | Receive bookings |
| `GET /api/cron/reminders` | `CRON_SECRET` header | 24h reminders |
| `POST /api/contact` | none (rate limited) | Contact form submissions |
| `GET /admin/bookings` | HTTP Basic Auth | Bookings list |
| `GET /api/admin/bookings/export` | HTTP Basic Auth | CSV export |

> The existing middleware gates every `/api/*` route behind a next-auth session.
> `/api/cal/webhook`, `/api/cron/reminders`, `/api/cal/slots` and `/api/cal/book`
> are explicitly allow-listed in `src/middleware.ts` because they authenticate
> themselves or are public by design. Keep them listed.


---

## 2. Environment variables

Copy `.env.example` to `.env.local` and fill in every blank.

```bash
cp .env.example .env.local
```

| Variable | Example | Notes |
|---|---|---|
| `NEXT_PUBLIC_CAL_ORIGIN` | `https://cal.example.com` | No trailing slash. **Inlined at build time.** |
| `NEXT_PUBLIC_CAL_LINK` | `username/30min` | Event type slug only, no origin. **Inlined at build time.** |
| `CAL_WEBHOOK_SECRET` | `openssl rand -hex 32` | Must match Cal.com's webhook secret exactly. |
| `CAL_API_KEY` | `cal_xxx` | **Server-side only, never `NEXT_PUBLIC_`.** Powers the `/book-a-call` page. Create in Cal.com -> Settings -> Integrations -> API Keys. |
| `CAL_ORGANIZATION_SLUG` | `acme-corp` | Only if the Cal.com account is inside an organization. |
| `CAL_EVENT_KIND` | `user` | `user` or `team`. Disambiguates a two-segment `CAL_LINK` like `acme/intro`. |
| `DATABASE_URL` | `postgres://deux:pw@localhost:5432/deux` | No TLS parameters; TLS is configured in code with the CA (3.1a). |
| `SMTP_HOST` | `smtp.yourhost.com` | Any SMTP server. |
| `SMTP_PORT` | `587` | `465` switches to implicit TLS automatically. |
| `SMTP_USER` | `hello@yourdomain.com` | |
| `SMTP_PASS` | app password | Not the account password. |
| `EMAIL_FROM` | `DEUX AI Factory <hello@yourdomain.com>` | Sender shown to the client. Must be a real, replyable mailbox. |
| `NOTIFY_EMAIL` | `sobber.id@gmail.com` | Where the full-detail notification goes. |
| `CONTACT_TO_EMAIL` | `a@x.com, b@x.com` | Internal recipient(s) for new contact submissions. Comma-separated; blanks fall back to `DEFAULT_CONTACT_TO` in `src/lib/email/index.ts`. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `923001234567` | Digits only, country code, no `+`. |
| `CRON_SECRET` | `openssl rand -hex 32` | |
| `ADMIN_USER` | `admin` | |
| `ADMIN_PASSWORD` | long random string | |

Because `NEXT_PUBLIC_*` values are baked into the client bundle at **build
time**, changing them requires a rebuild — not just a restart. In
`docker-compose.yml` they are passed as build args for exactly this reason.

---

## 3. Database

> **Current state:** bookings use the **existing Supabase Postgres** project that
> already backs media and site-config. Nothing new was provisioned. `DATABASE_URL`
> is still empty until you paste the connection string (below).
>
> Only a plain TCP connection string is needed — the Supabase **service-role
> JWT** already in `.env.local` is an API key and is **not** a Postgres password.

### 3.1 Set the connection string

Supabase -> Project -> **Connect** -> OR **Settings -> Database -> Connection
string** -> copy the **Session pooler** URI:

```bash
npm run db:set-url -- "postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
```

The helper writes `DATABASE_URL` into `.env.local`, then connects as a smoke test
and prints the host only — never the password.

Pick the **Session** pooler, not the Transaction pooler: port `6543` breaks `pg`,
which uses prepared statements. The helper rejects `6543` if you paste it.

Percent-encode any reserved character in the password — `@` must be written
`%40`, otherwise the URI parser treats the rest of it as the host.

Leave the URL free of TLS parameters. The helper strips `sslmode` and
`sslrootcert` if they are present, because `pg` lets the URL override the `ssl`
option configured in code — see 3.1a.

#### 3.1a Trust the pooler certificate

The pooler host's certificate is signed by a Supabase-managed CA that is not in
Node's trust store, so verification fails with `self-signed certificate in
certificate chain`. Verify properly instead of disabling verification
(`sslmode=no-verify` would allow a man-in-the-middle to read booking PII):

1. Supabase -> **Settings** -> **Database** -> **SSL Configuration** ->
   **Download Certificate**
2. Save it as `certs/supabase-ca.pem`
3. `npm run ca:embed`

`ca:embed` generates `src/lib/db/supabase-ca.ts` from the `.pem`, and the app
passes that certificate to `pg` as `ssl: { ca, rejectUnauthorized: true }`. The
certificate is embedded in code rather than read from disk because Next.js only
traces files it can see referenced statically, so a path passed to `pg` through
`sslrootcert` is silently dropped from the deployment bundle. Vercel needs no
extra variable — commit both files and the connection works everywhere.

TLS parameters must stay out of `DATABASE_URL`: `pg` gives the connection string
priority over an `ssl` option, and `sslmode=require` is not a request to skip
verification — it maps to `rejectUnauthorized: true` against the system trust
store, reintroducing the error the CA exists to fix. `certs/README.md` has the
full reasoning.

### 3.2 Migrate

```bash
npm run db:migrate
```

Runs every `.sql` file in `drizzle/` in filename order inside a transaction and
records applied files in a `_migrations` table, so it is safe to re-run.

### 3.3 Why the migration locks the table down

`bookings` holds customer PII (name, email, whatsapp, meeting_url) and lives in the
`public` schema, which Supabase exposes through PostgREST. With RLS off, anyone
holding the **public anon key** — which ships in the client bundle — could
`SELECT * FROM bookings`. So the migration enables RLS and revokes access from
`anon`/`authenticated`.

RLS with no policies hides rows from *this app's own* connection too, and
Supabase does not grant `BYPASSRLS` to `postgres` on every project. The migration
therefore grants `BYPASSRLS` to the role when it is permitted to, and otherwise
falls back to an explicit policy for that same role — either way `anon` and
`authenticated` stay blocked. Verify after migrating:

```sql
SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('bookings','_migrations');
-- both rows must show relrowsecurity = true
```

### 3.4 Self-hosted Postgres instead

Skip 3.1 and point `DATABASE_URL` at any Postgres you control:

```bash
# local Postgres already running
npm run db:migrate

# or with Docker
docker compose up -d db
docker compose exec web npx tsx scripts/migrate.ts
```

To autogenerate a migration from schema changes later:

```bash
npm run db:generate
```

### 3.5 Contact form — `confirmation_sent` column

`/contact` stores every submission in the Supabase `contacts` table (via
PostgREST, not Drizzle) and fans out two emails: an internal notification to
`CONTACT_TO_EMAIL`, and a greeting to the sender. The greeting is secondary, so
its result is recorded separately from the notification:

| Column | Meaning |
|---|---|
| `email_sent` | internal notification reached the team |
| `email_provider` | which transport delivered it (`smtp` / `gmail` / `none`) |
| `confirmation_sent` | greeting reached the customer |

The `confirmation_sent` column does not exist on older installs. Add it once in
**Supabase → SQL Editor** (idempotent, safe to re-run):

```sql
alter table public.contacts
  add column if not exists confirmation_sent boolean;
```

`saveContact` detects the missing column and retries the insert without it, so
deploying the code before running this SQL degrades gracefully instead of
dropping submissions. It logs
`[contacts] confirmation_sent column missing` once per submission.

---

## 4. Cal.com

> **Current state:** the site is wired to the **hosted** Cal.com at
> `https://cal.com` (free tier) because no VPS is available yet. Everything in
> this repo is origin-agnostic, so self-hosting later is a **one-value change**.
>
> ```
> NEXT_PUBLIC_CAL_ORIGIN=https://cal.com
> NEXT_PUBLIC_CAL_LINK=bilal-sheikh-3qvs54/deux
> ```
>
> Note `CAL_LINK` is the slug **only** — never a full URL. The embed SDK builds
> `{CAL_ORIGIN}/{CAL_LINK}/embed`, so a full URL in `CAL_LINK` produces a broken
> path like `cal.com/https://cal.com/.../embed`.
>
> `https://cal.com` is proprietary SaaS (its *source* is AGPL, the hosted
> service is not). Self-hosting below is what satisfies the open-source rule.

### 4.0 API key (needed by the booking page)

Cal.com stays the booking engine; `/book-a-call` is our **own** Calendly-style UI
that talks to the Cal.com v2 API. That needs a key:

1. Cal.com -> **Settings -> Integrations -> API Keys** -> **Create API Key**
2. Put the value in `.env.local` as `CAL_API_KEY=` (hosted keys start `cal_`)
3. Optional: if the account is inside an organization, set
   `CAL_ORGANIZATION_SLUG=`
4. Optional: `CAL_EVENT_KIND=user|team` disambiguates a two-segment
   `CAL_LINK` like `acme/intro` (user or team?), which the URL cannot tell us.
   A literal `team/…` prefix in `CAL_LINK` wins regardless.

`CAL_API_KEY` is **server-side only** — never prefix it `NEXT_PUBLIC_`. The page
never sees it; `/api/cal/slots` and `/api/cal/book` proxy on its behalf.

**Without a key** the page still loads, shows a friendly error, and links out to
the plain Cal.com booking page. The modal keeps working either way.

### 4.0.1 How the booking page maps to the API

| Our code | Cal.com v2 |
| --- | --- |
| `GET /api/cal/slots?month=2026-10&tz=…` | `GET /v2/slots` (`cal-api-version: 2024-09-04`) |
| `POST /api/cal/book` | `POST /v2/bookings` (`cal-api-version: 2024-08-13`) |
| base URL | `https://api.cal.com` when hosted, `{CAL_ORIGIN}/api` when self-hosted |

`/v2/slots` returns wall-clock `HH:mm` strings keyed by date, in the requested
timezone. `zonedTimeToUtcISO()` (`src/lib/booking/time.ts`) converts those to
absolute UTC instants before booking, handling half-hour zones and both DST
edges — covered by `npm run verify:booking-page`.

The two public routes are allow-listed in `src/middleware.ts` (anonymous by
design) and rate-limited in `src/lib/booking/rate-limit.ts`: 5 bookings and 60
availability lookups per IP per 10 minutes. That limiter is in-process; move it
to Redis if you ever run multiple instances.

### 4.1 Run Cal.com (self-hosted)

```bash
git clone https://github.com/calcom/cal.com.git
cd cal.com
docker compose up -d
```

Default URL is `http://localhost:3000`. Production checklist for Cal.com:
set `NEXT_PUBLIC_WEBAPP_URL` to your real HTTPS origin, configure
`DATABASE_URL` for its own Postgres, and run its migrations.

### 4.2 Create the event type

1. **Event Types → Create** → name it (e.g. "Discovery Call"), set the duration.
2. Note the slug. The booking link becomes `<slug>` or `username/<slug>` —
   that whole string is `NEXT_PUBLIC_CAL_LINK`.
3. Put it on your timezone (`Asia/Karachi`) and set availability.

### 4.3 Jitsi Meet for meeting links

Self-hosted Cal.com ships without any conferencing provider configured, so
bookings have no join link by default.

1. **Integrations → Apps → Video** → install **Jitsi Meet**.
2. It needs no API key; meetings are created at `https://meet.jit.si/<room>`.
3. Optionally deploy your own Jitsi (Docker, `docker-compose.yml` in the Jitsi
   repo) and set `JITSI_URL` / `NEXT_PUBLIC_WEBAPP_URL` accordingly.

If you skip this, `meeting_url` is `null` and the emails simply omit the
"Join meeting" button — nothing breaks.

### 4.4 Add a WhatsApp / phone field

This is what populates the `whatsapp` column and the `wa.me` link.

1. **Event Types → your event → Booking Fields → Add**.
2. **Title:** `WhatsApp` (the webhook parser also matches `phone`, `phone_number`,
   `mobile`, `whatsapp`, `contact`).
3. **Type:** Phone number.
4. **Required:** recommended, but optional works — emails then say
   "Not provided".

Company and notes are picked up the same way. The parser matches keys named
`company` / `organisation` / `organization` / `business`, and
`notes` / `message` / `brief` / `comments`.

### 4.5 Register the webhook

**Settings → Webhooks → Add**, or `Organization Settings → Webhooks`.

| Field | Value |
|---|---|
| Subscriber URL | `https://yourdomain.com/api/cal/webhook` |
| Payload URL | same |
| Secret | the exact `CAL_WEBHOOK_SECRET` value |
| Booking events | `BOOKING_CREATED`, `BOOKING_RESCHEDULED`, `BOOKING_CANCELLED` |
| Enable at creation | yes |

Cal.com signs the raw body with HMAC-SHA256 and sends the hex digest in
`X-Cal-Signature-256`. Our route reads the **raw** body, so any middleware
that parses or re-serialises JSON will break verification.

Verify it works:

```bash
curl -i https://yourdomain.com/api/cal/webhook -X POST \
  -H 'Content-Type: application/json' \
  -H "X-Cal-Signature-256: $( \
      BODY='{"triggerEvent":"PING"}'; \
      printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$CAL_WEBHOOK_SECRET" -hex | awk '{print $NF}' \
    )" \
  -d '{"triggerEvent":"PING"}'
```

A `200` with `{"ok":true,"ignored":"PING"}` means signature verification passed.
A `401` means the secret does not match.

---

## 5. Reminder cron

`/api/cron/reminders` finds `confirmed` bookings starting within the next 25
hours where `reminder_sent = false`, emails the client and owner, then sets the
flag. The flag only flips if the **client** email succeeded, so transient SMTP
failures retry on the next run.

Run it every 15 minutes.

**System cron (on the VPS):**

```cron
*/15 * * * * curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/cron/reminders >/dev/null
```

`CRON_SECRET` is also accepted as an `X-Cron-Secret` header.

**GitHub Actions (no VPS, recommended on Vercel Hobby):**
`.github/workflows/reminders.yml` is already in the repo. Vercel Hobby allows only
one cron execution per day, so the 15-minute sweep is driven from Actions instead.

1. Repo -> **Settings -> Secrets and variables -> Actions -> New repository secret**
2. Name `CRON_SECRET`, value = the same `CRON_SECRET` as the site's environment
3. Optional: **Settings -> Secrets and variables -> Actions -> Variables** ->
   `SITE_URL` = your deployed origin (defaults to `http://localhost:3000`)
4. **Actions -> Booking reminders -> Run workflow** to trigger it once by hand

**Coolify:** add a **Scheduled Task** attached to the app — every 15 minutes,
command:

```
curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/cron/reminders
```

**Windows (dev):**

```powershell
$action = New-ScheduledTaskAction -Execute 'curl.exe' -Argument '-fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.com/api/cron/reminders'
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 15)
Register-ScheduledTask -TaskName deux-reminders -Action $action -Trigger $trigger
```

---

## 6. DNS: SPF, DKIM, DMARC

Applies to whichever host runs `SMTP_HOST`. Without these the notification emails
land in spam.

**SPF** — one record, and only one `v=spf1` per domain:

```
Type: TXT   Name: @   TTL: 3600
v=spf1 include:<your-smtp-provider> -all
```

If you relay through a mailbox on the same domain, use
`v=spf1 mx -all`.

**DKIM** — every host publishes a selector:

```
Type: TXT   Name: <selector>._domainkey   TTL: 3600
v=DKIM1; k=rsa; p=<public-key>
```

`selector` is whatever your mail host calls it (`default`, `google`, `mail`,
`protonmail`, …). Send one test mail and read the `DKIM-Signature` header if
you are unsure.

**DMARC** — start permissive, then tighten:

```
Type: TXT   Name: _dmarc   TTL: 3600
v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

After a week with clean reports, switch `p=none` → `p=quarantine` → `p=reject`.

**MX** — only needed if you send as your own domain. `dig MX yourdomain.com`
must point at the host in `SMTP_HOST`.

---

## 7. Admin

`/admin/bookings` is behind HTTP Basic Auth (`ADMIN_USER` /
`ADMIN_PASSWORD`), compared in constant time.

Filters: `upcoming` (default), `past`, `cancelled`, `all`. "Export CSV"
downloads the current filter. CSV cells starting with `=`, `+`, `-` or `@` are
prefixed with `'` so a spreadsheet cannot execute them as formulas.

---

## 8. Deploying with Coolify

```bash
git add -A && git commit -m "Book a Call via self-hosted Cal.com"
git push
```

1. **Coolify → New Resource → Application → Dockerfile** (buildpack will not
   detect `output: standalone` reliably).
2. Connect the repo, branch `main`.
3. Add the environment variables from `.env.example`. Set
   `NEXT_PUBLIC_CAL_ORIGIN`, `NEXT_PUBLIC_CAL_LINK` and
   `NEXT_PUBLIC_WHATSAPP_NUMBER` in the **Build Variables** tab too, otherwise
   they are empty in the bundle.
4. Generate a **PostgreSQL** resource in the same project and set
   `DATABASE_URL` to its internal URL. It runs on the internal Coolify network —
   no public port needed.
5. Generate a domain, set `NEXTAUTH_URL=https://yourdomain.com`.
6. Deploy. Then run migrations once:

```bash
docker compose exec <container> npx tsx scripts/migrate.ts
```

or `docker compose run --rm web npx tsx scripts/migrate.ts` if you deploy from
your own compose file.

7. Point Cal.com's webhook at `https://yourdomain.com/api/cal/webhook`.

### Docker compose directly

```bash
cat > .env <<'EOF'
POSTGRES_USER=deux
POSTGRES_PASSWORD=change-me
POSTGRES_DB=deux
WEB_PORT=3000
EOF
# then append every variable from .env.example

docker compose up -d --build
docker compose exec web npx tsx scripts/migrate.ts
```

Postgres is intentionally **not** published to the host — only `web` is.

---

## 9. End-to-end test with one booking

```bash
# 0. migrate
npm run db:migrate

# 1. start the site
npm run dev
```

**In the browser**

1. Open `http://localhost:3000`. Confirm the navbar shows **Book a Call** and
   the bottom-right WhatsApp button is visible (if
   `NEXT_PUBLIC_WHATSAPP_NUMBER` is set).
2. Click **Book a Call**. The Cal.com modal should open in **dark** mode.
3. Toggle the site theme to light, close, reopen — the modal follows.
4. Pick a slot, fill Name / Email / WhatsApp / Company, confirm.

**Expect within seconds**

- Your DB has one row:

```bash
psql "$DATABASE_URL" -c "select cal_uid,status,name,email,whatsapp,company,start_time,timezone,meeting_url from bookings order by created_at desc limit 5;"
```

- `NOTIFY_EMAIL` got the status-badge email with a clickable `wa.me` link.
- The client got the brief confirmation with **Join meeting** and
  **Chat on WhatsApp**.
- Cal.com itself also sent its own invite — that duplication is expected.

**Then test reschedule + cancel**

5. Reschedule the booking in Cal.com. The webhook fires
   `BOOKING_RESCHEDULED`; the row **count stays 1**, `status` flips to
   `rescheduled`, `start_time` changes and `reminder_sent` resets to `false`.
6. Cancel it. `status` becomes `cancelled`.
7. Open `http://localhost:3000/admin/bookings` — the booking appears under
   `cancelled`, and **Export CSV** downloads.

**Reminder without waiting 24h**

Temporarily set `LEAD_HOURS` low, or insert a booking starting in ~23h and
hit the endpoint:

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/reminders
# {"ok":true,"windowHours":25,"due":1,"sent":1,...}
```

Run it again — `sent` must be `0` the second time.

**Negative tests**

```bash
# wrong signature -> 401
curl -i -X POST -H "X-Cal-Signature-256: $(printf 'a%.0s' {1..64})" \
  -d '{"triggerEvent":"BOOKING_CREATED","payload":{"uid":"x"}}' \
  http://localhost:3000/api/cal/webhook

# unknown trigger, valid signature -> 200 + ignored
# admin without credentials -> 401
curl -i http://localhost:3000/admin/bookings
```

---

## 10. Troubleshooting

| Symptom | Cause |
|---|---|
| Button links to `/contact` | `NEXT_PUBLIC_CAL_ORIGIN` or `NEXT_PUBLIC_CAL_LINK` empty **at build time** |
| Webhook `401` | Secret mismatch, or the body was parsed/re-serialised before verification |
| Webhook `422` | Malformed payload; check server logs |
| Webhook `500` | `DATABASE_URL` wrong, or migrations not run |
| Reminder endpoint `401` | `CRON_SECRET` header missing or wrong |
| `/admin/bookings` `503` | `ADMIN_USER` / `ADMIN_PASSWORD` not set |
| Owner email missing | `NOTIFY_EMAIL` unset, or SMTP auth failed — check logs for `[email] all transports failed` |
| WhatsApp button missing | `NEXT_PUBLIC_WHATSAPP_NUMBER` empty or not digits |
| Reminders never fire | Cron not installed; check `reminder_sent` and `status = 'confirmed'` |
| Contact form "sends" but no email arrives | `email_provider = 'none'` in `contacts` means the deployed env has no `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`. Local `.env.local` is not the deployed env — check the host (Vercel/Coolify/Docker). |
| Contact form returns `502` | Expected, not a bug: the row is stored but the team notification failed. The user is told the message was saved. Check `[email] all transports failed` in the server logs. |
| Contact form returns `429` | Rate limit: 5 submissions per IP per hour (`CONTACT_LIMIT` / `CONTACT_WINDOW_MS` in `src/lib/booking/rate-limit.ts`). |
| Customer greeting missing, `confirmation_sent = false` | Secondary email only. `[contacts] confirmation email failed` in the logs; the submission itself is unaffected. |
| `confirmation_sent` column missing | Run the `ALTER TABLE` from 3.5. |