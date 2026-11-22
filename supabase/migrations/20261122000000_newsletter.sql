-- Newsletter subscribers for double opt-in.
-- Run in Supabase SQL editor. Server-side service role is the only writer.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'unsubscribed')),
  confirm_token text unique,
  unsubscribe_token text unique,
  source text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz
);

-- No public access. All reads/writes go through server routes with the
-- service role key, which bypasses RLS.
alter table public.newsletter_subscribers enable row level security;

create index if not exists newsletter_subscribers_status_idx
  on public.newsletter_subscribers (status);
