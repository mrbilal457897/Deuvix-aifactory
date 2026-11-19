# Monitoring

Better Stack (https://betterstack.com) is what watches this site from the
outside. It costs $0 for the free tier — you don't need a paid plan for the
three monitors below.

Status page: keep 1 to 3 monitors max until you actually have users. A dozen
alerts on a quiet day train you to ignore alerts.

---

## 1) Health monitor — `https://<domain>/api/health`

**Purpose.** "Is the server alive AND can it reach the database?" No UI
involved. A 200 means the Node server is up and Supabase is answering.

**What it checks.** Trivial `head` count query on the `projects` table — no
rows are returned to the wire, no PII, no internal config leaks.

**How to create it in Better Stack:**

1. Sign up / log in at betterstack.com.
2. Dashboard → **Monitors** → **Create monitor** → **HTTP(S)**.
3. Settings:
   - **Name**: `Deuvix health`
   - **URL**: `https://<your-domain>/api/health`
   - **Check frequency**: **1 minute**
   - **Expected status code**: **200**
   - **Alerts**: Email (and/or Slack/Telegram if configured)
   - **Timeout**: 15 seconds
   - **Verify SSL**: ON
4. Save. Better Stack will now ping every minute and tell you (and only you)
   if the site or Supabase goes down.

**WHAT IT WILL NOT TELL YOU.** Whether the homepage *renders* correctly or
the chatbot answers — for those you need the home-URL monitor (#2) and, for
content correctness, a human.

**WHAT TO DO IF IT STARTS FLICKERING (sporadic 503s).** Free-plan Supabase                       projects pause after ~7 days of inactivity — check the Supabase dashboard
   (a no-cost service restart unpause them, but that is a manual step on the
   free tier). The `/api/keep-alive` endpoint exists for exactly this; the
   GitHub Action `.github/workflows/keep-alive.yml` keeps it warm as long as
   `SUPABASE_URL` and `SUPABASE_ANON_KEY` repository secrets are set.

---

## 2) Home monitor — `https://<domain>/`

**Purpose.** "Does the public website actually load?" If the HTML shell,
static assets or ISR cache ever breaks (bad deploy, full disk, expired
certificate), your visitors see a broken page and you want to know before
they do.

**How to create it in Better Stack:**

1. Same dashboard → **Monitors** → **Create monitor** → **HTTP(S)**.
2. Settings:
   - **Name**: `Deuvix site`
   - **URL**: `https://<your-domain>/`
   - **Check frequency**: **5 minutes** (1 min is overkill for content)
   - **Expected status code**: **200**
   - **Alerts**: Email (phone/SMS only if your budget allows)
   - **Verify SSL**: ON
3. Save.

**OPTIONAL CHECK — body marker.** If your plan supports content assertions,
verify that the response contains the string `"Built to run"` or similar
static hero text. That catches "200 OK but wedge in an error template" cases.

---

## 3) SSL certificate monitor — `<your-domain>`

**Purpose.** SSL certs expire silently at 90 days; you don't want your
visitors to ever see a browser warning. This watches the cert expiry itself,
independent of uptime.

**How to create it in Better Stack:**

1. **Monitors** → **Create monitor** → **SSL certificate**.
2. Settings:
   - **Name**: `Deuvix SSL`
   - **URL / Hostname**: `<your-domain>`
   - **Alert before expiry**: e.g. **14 days** notice
   - **Alerts**: Email
3. Save.

**NOTE.** If you use Hostinger's or Vercel's managed certificates, renewal
usually happens automatically — but set this anyway. It costs nothing and
catches failures (domain mismatch, suspended hosting, business-day outage).

---

## 4) Sentry — runtime error monitoring (already wired up)

Better Stack tells you the site is **down**. Sentry tells you the site is
**throwing** while remaining up.

### What was added

- `src/instrumentation.ts` — Next.js instrumentation hook, loads server/edge
  configs based on runtime.
- `src/instrumentation-client.ts` — client-side init (errors in the browser).
- `src/sentry.server.config.ts` — server init.
- `src/sentry.edge.config.ts` — edge/proxy init.
- `next.config.ts` — wrapped with `withSentryConfig`.

### Required env vars

```text
SENTRY_DSN=<your-dsn>                       # server + edge config
NEXT_PUBLIC_SENTRY_DSN=<same-value>          # browser bundle
```

Optional — only if you want source-map upload on build:

```text
SENTRY_AUTH_TOKEN=<token>
SENTRY_ORG=<org>
SENTRY_PROJECT=<project>
```

**Leave `NEXT_PUBLIC_SENTRY_DSN` equal to `SENTRY_DSN`** — they hold the
same value; the browser just can't read non-`NEXT_PUBLIC_` names.

If either var is missing at build time, the Sentry SDK boots inert — zero
errors, zero performance cost, zero noise. It initialises only when the DSN
is present.

### Where errors land

1. Log in to sentry.io → your org → your project → **Issues**.
2. Set **Alert rules**:
   - Alert on **first seen** of any issue (else you may see it in silence).
   - Alert on **issue frequency > 10/min** (stops noise from a single bot).
   - Route alerts to Slack/email.
3. **Attach user ID only** — session tokens/cookies are stripped by
   `beforeSend` (`sendDefaultPii` is off and cookies/authorization headers
   are deleted before events are transmitted).

### What Sentry will NOT tell you

- Whether Supabase is down (use the `/api/health` Better Stack monitor).
- Whether your domain resolves or cert is valid (use the SSL monitor).
- Whether the deploy went out (use the home-URL monitor).

### What the free plan covers

- 5,000 errors/month (server + edge + client combined) — enough for a quiet
  site; if you exceed it, Sentry starts to drop events, not fail requests.
- Traces Sample Rate 0.1 (10%) — enough for performance snapshots without
  filling your plan quota.

---

## Manual verification after the first deploy

```bash
# 1) Health responds 200 (and 503 if Supabase is down — check uptime dashboard)
curl -i https://<domain>/api/health

# 2) Home returns 200 with HTML body
curl -I https://<domain>/

# 3) SSL cert details (CN, expiry date)
echo | openssl s_client -connect <domain>:443 -servername <domain> 2>/dev/null | \
  openssl x509 -noout -subject -issuer -enddate
```
