# 1. Answer engines read a derived `llms.txt`, and are told what the product is not

Date: 2026-09-05

## Status

Accepted.

## Context

Answer engines — ChatGPT, Claude, Perplexity — increasingly stand between a person and this
product. Someone asking "how do I get assessed for ADHD in Australia" is handed a paragraph
synthesised from a handful of passages, not a list of links.

Two things follow, and only one of them is the obvious one.

The obvious one is being retrievable at all. `app/robots.ts` said `User-agent: *` and nothing else,
which allowed every AI crawler by silence. Silence is not a decision.

The one that matters more is being described *correctly*. A health-adjacent product that does not
say plainly what it is gets described as the average of everything that shape: a clinic, a booking
platform, a directory with star ratings. Every one of those is a claim this product may not make
and cannot correct once a model has made it on its behalf.

The generic SEO advice for this — add statistics, cite sources, publish comparison tables — cannot
be followed honestly here. The open founder decisions include source confirmation for the
indicative public figures, so there is no confirmed statistic in the tree to publish. Inventing one
to satisfy a checklist would put a fabrication into a machine-readable file, which is the worst
place to put one.

## Decision

1. **`/llms.txt` and `/llms-full.txt` are generated, never committed as static files.** They derive
   from `SEO_PAGES` (titles and descriptions the pages actually serve) filtered through the same
   hidden-route register the sitemap reads. A hand-kept copy of the site map is the copy that goes
   stale; a derived one cannot name a route the sitemap would not.
2. **The files lead with a summary and then state the boundaries, at equal weight.**
   `PRODUCT_BOUNDARIES` is the load-bearing half: not a clinic, decides nothing about anybody's
   health, no ratings or reviews, no appointment book, matching runs in the reader's own browser,
   example profiles are labelled. Every line is true of the code rather than aspirational.
3. **No statistics, no outcome figures, no comparisons, no superlatives** in any of it.
4. **AI crawlers are named and split by purpose** (`src/seo/ai-crawlers.ts`). Retrieval bots —
   GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-User, PerplexityBot, Google-Extended,
   Applebot-Extended — are allowed, because they hand a reader the source and blocking them only
   removes this product from an answer someone is already receiving. CCBot is disallowed: a bulk
   corpus with no reader at the end of it offers nothing back in that trade.
5. **Every robots.txt rule carries the same disallow list**, built once. A per-bot rule that forgot
   the hidden routes would hand an AI crawler what the wildcard rule refuses, and robots.txt would
   still look correct at a glance.
6. **No `AggregateRating` or `Review` markup**, whatever a rich-results checklist says. Prohibited
   for a regulated health service and ruled out by `PRODUCT.md`.

## Consequences

- The FAQ answers moved to `src/seo/faq.ts` so the page, its `FAQPage` JSON-LD and `/llms-full.txt`
  read one list. Three surfaces, one source.
- Answers are held to 40–60 words, the band a passage is extracted at whole, and run through the
  same copy linter as a rendered page. Nothing had ever linted copy that lives outside a screen.
- `/` gained a register entry. The strip made the finder indexable and it came out from behind the
  old posture still carrying a ten-character title.
- The compliance linter matches words, not the denials around them: "no testimonials" trips
  `no-testimonials`. The boundary lines are phrased around that rather than exempted from it.
