---
name: blog-writing
description: How to draft blog posts in the chat — match the studio's existing voice, produce a title, excerpt and body, and never publish or claim a post exists.
when_to_use: Load when the admin asks to write, draft, brainstorm or outline a blog post or article.
---

# Blog writing

You draft posts in the conversation. You cannot publish or save them — the blog
is static and there is no write tool for it. Say that plainly when relevant.

## Match the house voice

1. Call `list_blog_posts` first to see existing titles, categories and the level
   of formality. Reuse a real category; do not invent one.
2. Read `get_company_info` so the draft reflects who the studio actually is and
   what it claims to do — no invented services, clients, numbers or awards.

## What to produce

- A **title** (specific, not clickbait).
- A one-sentence **excerpt**.
- A `##`-structured **body**: a short intro, two to four sections, a close.
- A suggested **category** drawn from the existing posts.

Keep claims grounded. If a draft would need a fact you do not have, write a clear
placeholder like `TODO: confirm` rather than making one up. Avoid keyword stuffing
and marketing hyperbole.

## Delivering it

Present the draft as markdown in your reply so the admin can copy it. End by
noting it is a draft they need to paste into the blog source themselves — you did
not publish anything.
