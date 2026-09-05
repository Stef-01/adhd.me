# Context

The vocabulary this repo actually uses, so a word means one thing across the engine, the screens
and the copy. Written lazily — a term earns a place here when it has already been ambiguous once.

## Roster

- **Clinician** — an entry in the roster. Always one of two kinds, never both, and never neither:
  - **Listed clinician** (`realPerson`) — a real GP who has agreed to be listed. Two of them today,
    consulting in Sydney (`src/demo/roster.ts`).
  - **Example profile** (`synthetic`) — an invented persona used to demonstrate the finder without
    anyone's real details (`src/demo/synthetic-roster.ts`). Labelled as an example on every surface
    that renders it. Several are on the Gold Coast, which is why the map reaches further than the
    listings do.

  **The distinction is load-bearing in copy.** "ADHD.ME lists GPs in Sydney and on the Gold Coast"
  is false: it merges the two kinds. Coverage claims describe the *listed* clinicians; the map
  describes the *gazetteer*. `app/finder-stages/shared.tsx` and `src/seo/faq.ts` both say so.

- **Declaration** — what a clinician says about their own work (care areas, languages, billing,
  appointment length, access). The product describes clinicians *only* through declarations; it
  never characterises them itself, and it holds no rating or review of any kind.

## Matching

- **Ask** — one thing a person's words asked for, read out of their sentence by `needsFor`.
- **Match quality** — how well the asks separated the roster: `informed`, `tied`, `unserved`,
  `unmatched`. Only `informed` licenses the word "order"; the other three say plainly that the list
  is not a ranking (`orderNote()` in `src/demo/clinicians.ts`).
- **Order** — a claim, not a layout. If the words did not separate the list, the page says so.

## Geography

- **Gazetteer** — the suburbs the product can place (`src/geo/`): northern Sydney and Double Bay
  (NSW), and the Gold Coast (QLD). Wider than the roster on purpose, so a person outside the listed
  areas still gets honest distance context instead of an implied listing.

## Crawlers and answer engines

- **Indexable route** — a public page with an entry in `src/seo/pages.ts` carrying its target
  title, description and primary keyword. The sitemap, `/llms.txt` and each page's own `metadata`
  all derive from that one register.
- **Hidden route** — a route `src/security/robots.ts` withholds from crawlers. **The register is
  empty today**: the 2026-09-03 strip opened the whole site. The shape is kept because one entry
  still reaches robots.txt, the sitemap and the page's meta tag together.
- **Retrieval crawler** vs **training crawler** — the distinction `src/seo/ai-crawlers.ts` turns
  into robots.txt rules. A retrieval bot fetches to answer somebody's question now and cites the
  source; a training bot bulks the site into a corpus with no reader and no citation. The first is
  allowed, the second is not.
