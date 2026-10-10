-- 0002_admin_agent_audit.sql
-- Audit log for the admin AI agent: one row per request, every tool call recorded.
-- Tracked by scripts/migrate.ts (filename order, applied once).

CREATE TABLE IF NOT EXISTS admin_agent_audit (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      text,
  admin_email   text,
  input_mode    text NOT NULL DEFAULT 'text',
  prompt        text,
  transcript    text,
  skills_loaded jsonb NOT NULL DEFAULT '[]'::jsonb,
  tool_calls    jsonb NOT NULL DEFAULT '[]'::jsonb,
  status        text NOT NULL DEFAULT 'ok',
  error         text,
  duration_ms   integer,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_agent_audit_created_idx ON admin_agent_audit (created_at);

-- Server-only, same reasoning as bookings: this row set can contain admin prompts
-- and customer data quoted from tool results, and the `public` schema is exposed
-- through PostgREST. RLS with no anon policy + REVOKEs keeps it private.
ALTER TABLE admin_agent_audit ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  EXECUTE 'ALTER ROLE postgres BYPASSRLS';
EXCEPTION WHEN insufficient_privilege THEN
  NULL;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres')
     AND NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'postgres') THEN
    EXECUTE 'DROP POLICY IF EXISTS admin_agent_audit_server ON admin_agent_audit';
    EXECUTE 'CREATE POLICY admin_agent_audit_server ON admin_agent_audit FOR ALL TO postgres USING (true) WITH CHECK (true)';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON admin_agent_audit FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON admin_agent_audit FROM authenticated';
  END IF;
END
$$;
