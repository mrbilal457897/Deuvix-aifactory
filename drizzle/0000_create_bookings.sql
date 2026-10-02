-- 0000_create_bookings.sql
-- Bookings table for self-hosted Cal.com.
-- Idempotent enough to be safe on a fresh database; tracked by scripts/migrate.ts.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    CREATE TYPE booking_status AS ENUM ('confirmed', 'rescheduled', 'cancelled');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS bookings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cal_uid        text NOT NULL UNIQUE,
  status         booking_status NOT NULL DEFAULT 'confirmed',
  event_title    text,
  start_time     timestamptz NOT NULL,
  end_time       timestamptz NOT NULL,
  timezone       text,
  name           text,
  email          text,
  whatsapp       text,
  company        text,
  notes          text,
  meeting_url    text,
  raw_payload    jsonb,
  reminder_sent  boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookings_start_time_idx ON bookings (start_time);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status);
CREATE INDEX IF NOT EXISTS bookings_reminder_idx ON bookings (reminder_sent, start_time);

-- Lock the table down to the server only.
-- This table holds customer PII (name, email, whatsapp, meeting_url) and lives in
-- the `public` schema, which Supabase exposes through PostgREST. With RLS off,
-- anyone holding the *public* anon key could SELECT every row. Enabling RLS with
-- no policies means anon/authenticated get zero rows.
--
-- The REVOKEs are guarded because anon/authenticated only exist on Supabase; on
-- a plain Postgres they would abort the migration. The sequence is guarded too:
-- `id` is a uuid with a gen_random_uuid() default, so no serial sequence is ever
-- created for it.
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS with no policies also hides every row from *this app's own* connection
-- unless its role carries BYPASSRLS. Supabase does not grant that on every
-- project, so grant it when permitted and otherwise fall back to an explicit
-- policy for the same role. Either path leaves anon/authenticated blocked.
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
    EXECUTE 'DROP POLICY IF EXISTS bookings_server ON bookings';
    EXECUTE 'CREATE POLICY bookings_server ON bookings FOR ALL TO postgres USING (true) WITH CHECK (true)';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON bookings FROM anon';
    IF to_regclass('bookings_id_seq') IS NOT NULL THEN
      EXECUTE 'REVOKE ALL ON bookings_id_seq FROM anon';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON bookings FROM authenticated';
    IF to_regclass('bookings_id_seq') IS NOT NULL THEN
      EXECUTE 'REVOKE ALL ON bookings_id_seq FROM authenticated';
    END IF;
  END IF;
END
$$;
