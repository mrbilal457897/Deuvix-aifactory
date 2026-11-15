-- ============================================================================
--  Deuvix AI Factory — Supabase RLS hardening migration
--
--  WHY:  The audit found every public table is readable by the anon key
--  (including the `users` table and its bcrypt `password` column, lead and
--  contact PII). In this codebase the browser NEVER talks to Supabase — all
--  access is server-side via the service role — so the safest posture is:

--    * NO anon SELECT/INSERT/UPDATE/DELETE policies anywhere
--    * public read-only `SELECT` only on published rows of `projects` —
--      the single content table the public site is driven by
--    * everything else is denied to anon/authenticated and stays available
--      to the service role (service keys bypass RLS).
--
--  HOW TO APPLY
--    1. Supabase Dashboard -> SQL Editor -> New query -> paste this file.
--    2. Run it once. It is idempotent (DROP POLICY IF EXISTS).
--    3. Verify: the verification SELECTs at the bottom must show
--       relrowsecurity = true for every table.
--    4. ROTATE THE KEYS anyway: Settings -> API -> "Reset anon/service_role
--       keys", update .env.local and Vercel env vars. The anon key was
--       previously able to read everything — consider it public.
--
--  ROLLBACK
--    After review you can delete policies again; that is the same state as
--    today and is not recommended.
-- ============================================================================

-- ---------- projects ---------------------------------------------------------
alter table public.projects enable row level security;

drop policy if exists "public read published projects" on public.projects;
create policy "public read published projects"
  on public.projects
  for select
  using (status = 'published');

-- No insert/update/delete policy: anonymous clients are fully denied.

-- ---------- media ------------------------------------------------------------
-- No public policy: the site reads it server-side (service role bypasses RLS)
-- and browsers receive public Storage URLs, which do not go through the table.
alter table public.media enable row level security;

-- ---------- site_config ------------------------------------------------------
-- No public policy: /api/site-config serves the config server-side.
alter table public.site_config enable row level security;

-- ---------- PII / internal tables: NO public access at all ------------------
-- (service_role keeps working; it bypasses RLS by definition)
alter table public.contacts   enable row level security;
alter table public.leads      enable row level security;
alter table public.follow_ups enable row level security;
alter table public.users      enable row level security;
alter table public.agent_logs enable row level security;

-- No policies are created for these tables at all. Default posture after
-- enabling RLS with zero policies is DENY for anon and authenticated roles.

-- ---------- Verification ------------------------------------------------------
-- Run this and confirm every row shows relrowsecurity = t:
--   select relname, relrowsecurity
--   from pg_class
--   where relnamespace = 'public'::regnamespace
--     and relkind = 'r'
--   order by relname;
--
-- Confirm only the projects policy remains:
--   select tablename, policyname, cmd, roles
--   from pg_policies
--   where schemaname = 'public'
--   order by tablename;
-- Expected: exactly one SELECT policy ("public read published projects")
-- on public.projects, roles = {public}.
