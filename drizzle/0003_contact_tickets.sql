-- 0003_contact_tickets.sql
-- Job ticket submissions from the /contact page.
-- Tracked by scripts/migrate.ts (filename order, applied once).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_ticket_status') THEN
    CREATE TYPE contact_ticket_status AS ENUM ('new', 'in_progress', 'replied', 'closed');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS contact_tickets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id      text NOT NULL UNIQUE,
  status         contact_ticket_status NOT NULL DEFAULT 'new',
  email_error    text,
  source         text NOT NULL DEFAULT '/contact',
  ip_hash        text,
  user_agent     text,
  source_path    text,

  -- Submitted fields
  units          text[] NOT NULL DEFAULT '{}',
  brief          text NOT NULL,
  channels       text[] NOT NULL DEFAULT '{}',
  start_when     text,
  website        text,
  name           text NOT NULL,
  email          text NOT NULL,
  company        text,
  phone          text,
  via            text NOT NULL DEFAULT 'Email',
  slot           text,
  nda            boolean NOT NULL DEFAULT false,

  -- Server-computed
  expected_reply_at timestamptz NOT NULL,

  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_tickets_ticket_id_idx ON contact_tickets (ticket_id);
CREATE INDEX IF NOT EXISTS contact_tickets_status_idx ON contact_tickets (status);
CREATE INDEX IF NOT EXISTS contact_tickets_created_idx ON contact_tickets (created_at);
CREATE INDEX IF NOT EXISTS contact_tickets_email_idx ON contact_tickets (email);

-- Lock the table down to the server only.
ALTER TABLE contact_tickets ENABLE ROW LEVEL SECURITY;

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
    EXECUTE 'DROP POLICY IF EXISTS contact_tickets_server ON contact_tickets';
    EXECUTE 'CREATE POLICY contact_tickets_server ON contact_tickets FOR ALL TO postgres USING (true) WITH CHECK (true)';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON contact_tickets FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON contact_tickets FROM authenticated';
  END IF;
END
$$;
