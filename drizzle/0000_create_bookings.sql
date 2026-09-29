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
