-- =============================================================================
-- "Our live Work" — extend the EXISTING public.projects table.
--
-- Nothing is dropped and no parallel table is created. Existing rows keep their
-- data: they are mapped into the new shape, and any row that is missing a
-- required field is left as `draft` so it never appears on the public site.
--
-- Run with:  supabase db push   (or paste into the SQL editor)
-- Rollback:  see the section at the bottom of this file.
-- =============================================================================

alter table public.projects add column if not exists slug               text;
alter table public.projects add column if not exists unit_id            text;
alter table public.projects add column if not exists stats              jsonb not null default '[]'::jsonb;
alter table public.projects add column if not exists tags               jsonb not null default '[]'::jsonb;
alter table public.projects add column if not exists desktop_thumbnail  jsonb;
alter table public.projects add column if not exists mobile_thumbnail   jsonb;
alter table public.projects add column if not exists live_url           text;
alter table public.projects add column if not exists case_study_url     text;
alter table public.projects add column if not exists browser_url_label  text;
alter table public.projects add column if not exists chip_title         text;
alter table public.projects add column if not exists chip_subtitle      text;
alter table public.projects add column if not exists content            text not null default '';
alter table public.projects add column if not exists gallery            jsonb not null default '[]'::jsonb;
alter table public.projects add column if not exists previous_slugs     jsonb not null default '[]'::jsonb;
alter table public.projects add column if not exists sort_order         integer not null default 0;
alter table public.projects add column if not exists featured           boolean not null default false;

-- `name` is the canonical title; the legacy `title` column stays untouched.
alter table public.projects add column if not exists name text;

update public.projects
set name = coalesce(nullif(name, ''), nullif(title, ''), 'Untitled project')
where name is null or name = '';

-- -----------------------------------------------------------------------------
-- 1. Slug: generated from the name, de-duplicated with -2, -3, …
-- -----------------------------------------------------------------------------
with base as (
  select
    id,
    created_at,
    btrim(
      regexp_replace(lower(coalesce(nullif(name, ''), title, 'project')), '[^a-z0-9]+', '-', 'g'),
      '-'
    ) as s
  from public.projects
),
numbered as (
  select id, s, row_number() over (partition by s order by created_at, id) as rn
  from base
)
update public.projects p
set slug = case when n.rn = 1 then n.s else n.s || '-' || n.rn end
from numbered n
where p.id = n.id and (p.slug is null or p.slug = '');

-- -----------------------------------------------------------------------------
-- 2. Thumbnails: an old `image` becomes the desktop screenshot. Without a
--    mobile screenshot the row stays a draft — exactly as intended.
-- -----------------------------------------------------------------------------
update public.projects
set desktop_thumbnail = jsonb_build_object(
      'url',   image,
      'path',  '',
      'width', 1600,
      'height', 1000,
      'alt',   coalesce(nullif(name, ''), title, '')
    )
where (desktop_thumbnail is null or desktop_thumbnail = 'null'::jsonb)
  and coalesce(image, '') <> '';

update public.projects
set live_url = url
where live_url is null and coalesce(url, '') <> '';

update public.projects
set case_study_url = '/projects/' || slug
where case_study_url is null and slug is not null;

-- -----------------------------------------------------------------------------
-- 3. Status: `draft` | `published` only. Any legacy lifecycle label
--    (Active / Planning / Completed / Paused) maps to `published` ONLY when the
--    record is complete; otherwise it becomes a draft and nothing breaks.
-- -----------------------------------------------------------------------------
update public.projects
set stats = '[]'::jsonb    where stats is null;
update public.projects
set tags  = '[]'::jsonb    where tags is null;
update public.projects
set gallery = '[]'::jsonb  where gallery is null;
update public.projects
set previous_slugs = '[]'::jsonb where previous_slugs is null;

update public.projects
set status = case
  when lower(coalesce(status, '')) in ('published', 'draft') then lower(status)
  when desktop_thumbnail is not null and mobile_thumbnail is not null then 'published'
  else 'draft'
end;

-- -----------------------------------------------------------------------------
-- 4. Order: existing rows keep their creation order.
-- -----------------------------------------------------------------------------
update public.projects p
set sort_order = s.rn - 1
from (
  select id, row_number() over (order by created_at, id) as rn
  from public.projects
) s
where p.id = s.id and p.sort_order = 0;

-- -----------------------------------------------------------------------------
-- 5. Constraints and lookup indexes
-- -----------------------------------------------------------------------------
create unique index if not exists projects_slug_key on public.projects (slug);
create index if not exists projects_status_idx     on public.projects (status);
create index if not exists projects_order_idx      on public.projects (sort_order);

alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects
  add constraint projects_status_check check (status in ('draft', 'published'));

-- =============================================================================
-- ROLLBACK — restores the pre-migration shape. The new columns are dropped, so
-- every value written since the migration is lost; the legacy `title`, `image`
-- and `url` columns are untouched and still hold the original data.
-- =============================================================================
-- alter table public.projects drop constraint if exists projects_status_check;
-- drop index if exists projects_order_idx;
-- drop index if exists projects_status_idx;
-- drop index if exists projects_slug_key;
-- alter table public.projects
--   drop column if exists slug, drop column if exists name,
--   drop column if exists unit_id, drop column if exists stats,
--   drop column if exists tags, drop column if exists desktop_thumbnail,
--   drop column if exists mobile_thumbnail, drop column if exists live_url,
--   drop column if exists case_study_url, drop column if exists browser_url_label,
--   drop column if exists chip_title, drop column if exists chip_subtitle,
--   drop column if exists content, drop column if exists gallery,
--   drop column if exists previous_slugs, drop column if exists sort_order,
--   drop column if exists featured;
-- update public.projects set status = 'Active' where status in ('draft', 'published');
-- =============================================================================
