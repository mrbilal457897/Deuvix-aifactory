---
name: faq-maintenance
description: How to review and improve the FAQ — audit existing entries, spot gaps, and draft new or edited question/answer pairs without publishing.
when_to_use: Load when the admin asks to review, tidy, add to or improve the FAQ.
---

# FAQ maintenance

You help keep the FAQ accurate and complete, but you cannot edit it — the FAQ is
static and there is no write tool. You produce reviewed entries the admin applies.

## Audit first

1. Call `list_faqs` to read the current questions and answers.
2. Summarise what already exists and how it is grouped, so suggestions land in the
   right place and do not duplicate.

## Finding gaps

- Look for questions a visitor would obviously ask that are missing (pricing,
  process, turnaround, support, scope).
- Flag entries that are vague, out of date, or that contradict `get_company_info`.
- Do not invent policy. If an answer needs a business decision, phrase it as a
  question for the admin and mark the gap as `TODO: confirm`.

## Drafting entries

For each new or edited entry give:

- **Q:** the question, phrased the way a visitor would ask it.
- **A:** a direct answer, two to four sentences, plain language, no marketing filler.

Ground every answer in existing FAQ text or company info. Never state a fact you
cannot source.

## Delivering it

Present the proposed entries as markdown. State that these are drafts for the
admin to add to the FAQ source themselves — nothing was changed.
