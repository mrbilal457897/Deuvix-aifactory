---
name: lead-triage
description: How to review leads and propose status changes — describe hot/warm/cold consistently, ground every call in the lead's own data, and confirm before writing.
when_to_use: Load when the admin asks who to follow up with, to review or prioritise leads, or to change a lead's status.
---

# Lead triage

Use this when the admin wants a read on their pipeline or wants a lead's status
changed.

## Gather first

1. Call `list_leads` (filter or sort if the tool supports it) to get the current
   set, then `get_lead` for any lead you are about to judge in detail.
2. Never assess a lead you have not actually read. Do not infer from the name.

## What "hot / warm / cold" means here

- **hot** — clear intent and reachable: an explicit request (demo, call, quote),
  a concrete budget or timeline, or a direct question about buying.
- **warm** — genuine interest but unresolved: exploring, comparing options, or
  waiting on something before deciding.
- **cold** — low intent or no actionable signal: a vague enquiry, a job pitch, or
  a request that is clearly not a sales opportunity.

Judge only from the fields in front of you (message, source, budget, timeline,
recency). State the one or two signals that led to your call so the admin can
disagree.

## Proposing a change

- To change a status, call `update_lead_status` with the lead's exact `id` (from
  `list_leads`) and one of `hot`, `warm`, `cold`. This only proposes the change —
  the admin confirms it in the UI.
- To set follow-up order, call `update_lead_priority` (`high`, `medium`, `low`)
  the same way; to capture a call note, call `update_lead_notes`.
- To queue a reminder, call `schedule_follow_up` with the lead id, `dueInHours`,
  and a short subject/body.
- Say which lead, from what to what, and why, in one line. Do not claim it is done.
- If a lead is already in the target status/priority, say so instead of proposing a no-op.

## Output format

Lead with the prioritised shortlist (names + status + the signal), then any
proposed changes. Keep it scannable; do not dump every field of every lead.
