# Supabase keep-alive (free plan)

**Why:** Supabase pauses free-tier projects after ~7 days of inactivity. A paused
project makes every Supabase query fail until someone opens the dashboard,
which blanks the Live Work / projects sections and breaks the admin media tools.

**What we do:** Vercel calls `GET /api/keep-alive` every **3 days** (schedule in
`vercel.json`). The route runs a trivial `head` count query against the
`projects` table and answers 200. If Supabase is paused/unreachable, it
answers **500** so the cron run is flagged red in the Vercel dashboard.

**Security:** the route is not public. It requires the same `CRON_SECRET`
used by the other cron routes, sent either as
`Authorization: Bearer <CRON_SECRET>` (Vercel Cron does this automatically)
or `x-cron-secret: <CRON_SECRET>` for manual triggers. Comparison is
timing-safe. `CRON_SECRET` must be set in the Vercel project env
(already used by `/api/cron/reminders` — see `.env.example`).

**Vercel Hobby note:** Hobby allows cron frequency of once per day; the
`0 3 */3 * *` (every 3rd day at 03:00 UTC) schedule is lower frequency and
is fine.

**Manual verification:**
```bash
curl -H "x-cron-secret: <CRON_SECRET>" https://deuvix-aifactory-3yqx.vercel.app/api/keep-alive
# expect: {"ok":true,"projects":5,"ms":80}
```

**Trigger reminder — after a domain change:** nothing to do; the path is
relative.

**If it fails:**
1. `500 supabase_unavailable` — project is likely paused. Open Supabase
   dashboard → project → "Restore project" (or add the database backup first).
2. `401` — CRON_SECRET mismatch between Vercel env and the request.
3. `503` style failures with `CRON_SECRET` unset — set `CRON_SECRET` in the
   Vercel env, then redeploy.

## Database backups (free plan = no automatic backups)

There is no pg_dump from this repo — Supabase free does **not** provide
Scheduled Exports/Point-in-Time Recovery. Do one of:

**Option A — one-off manual export (recommended quarterly):**
```bash
node scripts/export-backup.mjs
```
Writes `backups/supabase-<timestamp>.json` with every known table
(projects, leads, contacts, follow_ups, media, site_config, users[bcrypted
hashes only], agent_logs) using the service role from `.env.local`. The
file is git-ignored. Store it somewhere safe (password manager / private
drive), never in the repo.

**Option B — Supabase CLI:**
```bash
npx supabase link --project-ref sirxcjnszsumwnjhizrz
npx supabase db dump --schema public > backup-$(date +%F).sql
```
(Admin access to the Supabase account is required; keep the dump off the
repo as well.)

**Booking/AI chat data** (separate Neon/Postgres DB from `DATABASE_URL`):
```bash
pg_dump "$DATABASE_URL" --data-only --inserts > booking-$(date +%F).sql
```

**Recovery drill:** at least once, import a backup into a *new* free Supabase
project and confirm the site boots against it (`.env.local` swap) before
trusting it.
