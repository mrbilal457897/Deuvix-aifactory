-- 0003_contact_inquiries.sql
-- Contact inquiry submissions from the /contact page.
-- Tracked by scripts/migrate.ts (filename order, applied once).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_inquiry_status') THEN
    CREATE TYPE contact_inquiry_status AS ENUM ('new', 'replied', 'archived');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS contact_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id text NOT NULL UNIQUE,
  status contact_inquiry_status NOT NULL DEFAULT 'new',
  email_error text,
  source_path text NOT NULL DEFAULT '/contact',
  ip_hash text,
  user_agent text,
  units text[] NOT NULL DEFAULT '{}',
  brief text NOT NULL,
  channels text[] NOT NULL DEFAULT '{}',
  start_when text,
  website text,
  name text NOT NULL,
  email text NOT NULL,
  company text,
  phone text,
  via text NOT NULL DEFAULT 'Email',
  slot text,
  nda boolean NOT NULL DEFAULT false,
  expected_reply_at timestamptz NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_inquiries_inquiry_id_idx ON contact_inquiries (inquiry_id);
CREATE INDEX IF NOT EXISTS contact_inquiries_status_idx ON contact_inquiries (status);
CREATE INDEX IF NOT EXISTS contact_inquiries_created_idx ON contact_inquiries (created_at);
CREATE INDEX IF NOT EXISTS contact_inquiries_email_idx ON contact_inquiries (email);

ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  EXECUTE 'ALTER ROLE postgres BYPASSRLS';
EXCEPTION WHEN insufficient_privilege THEN
  NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres')
     AND NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'postgres') THEN
    EXECUTE 'DROP POLICY IF EXISTS contact_inquiries_server ON contact_inquiries';
    EXECUTE 'CREATE POLICY contact_inquiries_server ON contact_inquiries FOR ALL TO postgres USING (true) WITH CHECK (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON contact_inquiries FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON contact_inquiries FROM authenticated';
  END IF;
END $$;
