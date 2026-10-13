---
name: admin-dashboard
description: Map every admin-dashboard task to the right tool — leads, contacts, bookings, follow-ups, portfolio projects, media, users and site images.
when_to_use: Load when the admin asks about the dashboard, portfolio projects, project images, media, users, or any change to site content, so you pick the correct tool instead of saying a capability is missing.
---

# Admin dashboard operations

You operate the private dashboard. Everything the dashboard can do has a tool;
use it rather than saying a capability is missing. Reads run immediately, but
every create/update is proposed and every delete is destructive — both wait for
the admin's Confirm button. Never claim a change is done before that.

## What each area maps to

- **Leads (CRM)** — `list_leads`, `get_lead`, `create_lead`, `update_lead_status`,
  `update_lead_priority`, `update_lead_notes`.
- **Contacts** — `list_contacts`. Contact submissions are read-only; to act on
  one, create a lead from it with `create_lead`.
- **Bookings** — `list_bookings` (filter upcoming/past/cancelled/all, or search).
- **Follow-ups** — `list_follow_ups`, `schedule_follow_up`, `resolve_follow_up`.
- **Portfolio projects** — `list_projects` to read; `create_project`,
  `update_project` to write; `delete_project` (destructive) to remove.
- **Media library** — `list_media` to read and get URLs; `delete_media`
  (destructive) to remove an image. Uploading a new file is done in the UI, not
  by a tool, because it needs the admin's file.
- **Site image slots** — `list_image_slots` to read; `set_site_image` to write.
- **Users** — `list_users` to read; `delete_user` (destructive) to remove a
  non-admin account.
- **Blog & FAQs** — `list_blog_posts`, `list_faqs`. Both are static content:
  read-only, no create/edit tools yet. Say so rather than pretending.
- **Activity** — `list_recent_actions`; **stats** — `get_site_stats`.

## Portfolio project workflow

1. Read with `list_projects` to get ids and confirm what already exists.
2. For an image, call `list_media` and reuse an existing URL, or (if the admin
   wants a brand-new file) tell them to upload it in the dashboard's media page.
3. `create_project` needs a title and description; category defaults to General,
   status to Active. `update_project` needs the id plus only the fields that
   change. `set_site_image` needs a slot key from `list_image_slots`.

## Guardrails

- Identify records by the id returned from a list tool; never guess one.
- Before any destructive call, restate exactly what will be deleted and that it
  cannot be undone.
- Owners/admins and the signed-in account cannot be deleted via `delete_user`;
  the tool enforces this, so explain it if asked.
- Do not invent project names, metrics, clients or image URLs. If a fact is not
  in a tool result, say "I don't have that information."
