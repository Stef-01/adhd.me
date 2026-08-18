# Launch checklist — 20 items, executed (O15, 2026-08-18)

Every item on the founder's launch list, with what shipped and where. One item is a recorded
refusal rather than a build, because an absolute founder gate and Australian law both forbid
it — the argument is in its row. Everything else is live on the branch.

| # | Item | Disposition |
|---|---|---|
| 1 | Custom 404 page | **Built** — `app/not-found.tsx`: says what happened, offers the finder and home. |
| 2 | CTA above the fold | **Already true, verified** — the hero's "Find a GP near you" sits above the fold on `/`; the sticky bar (item 9) keeps it present after scroll on phones. |
| 3 | Internal links | **Built** — shared `SiteFooter` (7 doors) on every prose page; the landing footer now links finder, examples, FAQ, approach, practices, privacy, contact. |
| 4 | Thank-you page | **Built** — `/thanks`; the interest form navigates there on success, so a conversion has a URL. |
| 5 | Breadcrumbs | **Built** — `app/breadcrumbs.tsx`, on-screen trail + `BreadcrumbList` JSON-LD generated from the same list. |
| 6 | Case studies | **Built, compliant form** — `/examples`: worked examples computed live by the finder's own pipeline over demo scenarios. No patient stories: a patient outcome used as marketing is a testimonial (see item 15). |
| 7 | FAQs | **Built** — `/faq`: eight administrative questions, `FAQPage` JSON-LD from the same list the page renders. |
| 8 | Response time promise | **Built** — "a person reads every registration, and we reply within two business days", beside the form and on `/thanks`. Same phrase both places so the promise cannot fork. |
| 9 | Sticky mobile CTA | **Built** — landing-page bottom bar under 640px, safe-area padded, same words as the hero action. |
| 10 | robots.txt | **Built** — `app/robots.ts`: console, API and tokened booking pages disallowed; sitemap referenced. `app/sitemap.ts` added alongside. |
| 11 | Unique page titles | **Built** — title template in the root layout; every public page sets its own first half (three pages had none; two had hand-glued suffixes that would have doubled). |
| 12 | Meta descriptions | **Built** — unique description on every public page. |
| 13 | Social sharing | **Built** — OpenGraph/Twitter defaults with `metadataBase` from one `SITE_URL`; generated card in `app/opengraph-image.tsx` (no binary in the repo). |
| 14 | Maps + directions | **Built** — "Map and directions to {practice}" on every profile, from the practice's own name and suburb; no API key, no location asked of the reader. |
| 15 | Real reviews | **Dropped by the founder** (2026-08-18: “ignore real reviews as we don’t need that”) — and it was already **REFUSED, on the record.** Tree law 6 bans testimonials and ratings anywhere, and it bans them because s133 of the Health Practitioner Regulation National Law prohibits testimonials in advertising a regulated health service — for a directory of named practitioners this is not a style preference but a legal line. Fabricating reviews would additionally breach founder gate 4 (synthetic data only, presented as synthetic). The standing control is the copy linter's no-ratings rule, which fails the build if review markup ever appears. What serves the same reader need lawfully is item 6: the product demonstrating itself. |
| 16 | Alt text on images | **Audited** — founder portraits ("{name}, co-founder of ADHD.ME"), affiliation logos (label), profile portraits ("Portrait of {name}") all carry alts; the result-row thumbnail is `alt=""` deliberately, because the name it would repeat is the adjacent text and a double announcement helps nobody. |
| 17 | Local schema | **Built, compliant subset** — `Organization` + `WebSite` JSON-LD with `areaServed` (Beecroft, Gold Coast) in the layout; `FAQPage` and `BreadcrumbList` per page. Deliberately absent: `aggregateRating`/`Review` (item 15) and `Physician` markup (public directory copy sits behind founder gate G6). |
| 18 | Privacy policy page | **Extended to the standard shape, plus the agreement control the founder asked for** — `/privacy` gains the standard sections (storage/security, cookies and local storage, complaints incl. OAIC, contact and changes) on top of the earlier measurement section; and a site-wide one-time **agreement bar with a pop-out policy dialog** (`app/privacy-consent.tsx`): native `<dialog>` modality, the ack stored on the person’s device only, every other e2e spec runs pre-agreed while `e2e/consent.spec.ts` exercises the bar and sweeps its copy. Original text: **Already existed, extended** — `/privacy` (draft, linked in both footers) gains a site-measurement section that renders only when analytics is on, so the notice and the behaviour share one switch. |
| 19 | Google Analytics | **Built, dark by default** — GA4 loads only when `NEXT_PUBLIC_GA_ID` is set at deploy time (no measurement ID lives in this repository, same posture as gate 4's "no production credentials"); advertising signals off. Setting the variable turns on both the script and the privacy section. |
| 20 | Team photo | **Already done, verified** — the founders section on `/` renders all three portraits with named alts. |

## Verification

`pnpm verify` (typecheck · unit suites incl. the public-surface census, which fails on any
unclassified page · build · audit gate) plus the rendered-copy sweep and axe pass over every
public surface (`e2e/public-sweep.spec.ts`, `e2e/a11y.spec.ts`), which now crawl `/faq`,
`/examples` and `/thanks` too.
