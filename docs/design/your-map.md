# Your map: a radar of a life, that is not a score of a person

Founder direction, 2026-09-11, with a reference image — the Pokémon IV judge screen, six axes round
a hexagon, a word on each:

> continue advancing ui for matching algorithm so the holistic care aspects are able to be seen
> with the my map which does bioecosocual and understands your needs which emotional regulation,
> creativity, an other key aspects that can be improved via a pokemon style IVS map, as you do
> games it shows your strengths and ability to recognise emotions and advance on the IVS map

## The one thing it must not be, and the reference solves it

A radar chart of a person is one adjective away from a score of one, and this tree has refused that
twice in writing: `app/my-adhd.tsx` opens "no graphs, no score; every line traces to something the
person said", and `src/model/events.ts` §68 refuses an event label that reads like an inferred
pathology. Nothing this app can observe — a mosquito caught, a run finished — measures anybody's
emotional regulation, and a chart implying it would be inventing the most consequential claim in
the product.

**The reference material had already solved this.** Pokémon's IV judge does not show the number
either. It says a word. So this does:

| Rung | What put it there |
|---|---|
| **Not yet** | Nothing has touched this. *Not a gap, unasked.* |
| **Named** | You said something that lands here — a need, a confirmed insight, or "yes, this happens to me" on a run |
| **Explored** | You went through a run about it |
| **Kept** | You are carrying a strategy from it |
| **Working** | You said a strategy from it worked |

Every rung is **an act the person took**, and the word names the act rather than the person. The
shape is therefore a map of what somebody has *built*: the long spikes are where they have got
somewhere, the flat edges are what nothing has asked them about, and playing moves it — which is
what was asked for. There is no number anywhere on the page, and an e2e test asserts that by
regex.

## Nothing here is a new vocabulary

Every part of the map was already in the tree, which is why it could be built as a reading rather
than as a second model:

- the **nine axes** are `src/wellness/nwia.ts`'s wellness dimensions, attributed there and on the
  page — and they are the bio-eco-social reading the direction asked for, with **Emotional** and
  **Intellectual** ("curiosity, learning and the interest that switches attention on") the two the
  direction named by hand;
- what feeds them are the eco-bio-psychosocial map's own subdomains, through the `NWIA_OF` table
  that already existed;
- the **strength** shown on an opened axis is the `strength` every interactive module already
  declares — the module says it, not the app, and only once something there has been finished;
- the **kinds of care** an axis opens are the `professions` those same modules already name. A
  dimension cannot point at a kind of care that nothing teaching it points at.

## The half the map alone did not do: the game says it moved

The map advances when somebody plays, and until this the *game* never said so — which leaves the
most motivating part of the direction ("as you do games it shows … and advance on the IVS map")
invisible from inside the thing that drives it. A run's last card now names the axes it just moved
and links to them: **"Your map: Physical"** at the end of the sleep run, at most two axes because
that card has a budget and the map is one tap away for the rest.

`dimensionsOf(moduleId)` is the one function behind it, and a test holds it to the same table the
map reads, in both directions — a run may only ever move an axis it is listed under. Two readings
of one table drifting apart is the failure `src/wellness/map.ts` exists to prevent.

## The matching wire-up: the holistic answer for one part of a life

Opening a dimension and pressing *Who helps here* narrows the finder to **all** of that dimension's
kinds, not one of them — Physical reaches a sleep clinician, an exercise physiologist and a
dietitian and does not reach a university support service; Environment reaches three of eleven.
That set is the holistic answer for that part of a life, and the results screen's own band of kinds
(built earlier the same day) is what chooses inside it.

**An ordering was built and thrown away.** Sorting a dimension's kinds by how few dimensions each
turns up on puts the particular one first — a sleep clinician leads Physical, a relationship
counsellor leads Social — and then puts a *dietitian* at the top of Work, because the eating runs
target `attention` and attention reads as work. Rarity is not relevance, and nothing displays the
first kind any more, so the rule went and the comment saying why stayed.

## Two dimensions nothing teaches, recorded rather than discovered

The test that asks "can every axis actually move?" failed on the first run, and it was right to:

- **Spiritual values** has no node on the eco-bio-psychosocial map at all. The goal set at the door
  is what names it — the same reading `nwiaBalance` already used.
- **Cultural values** is reached only through the `family` subdomain, which modules *ask* about
  ("who most often feels unheard?", and the survey's "with family") but none declares as a
  **target**. So it is nameable today and not explorable.

Both are in `NOT_TAUGHT` with their reason, the screen says *"No run is about this one yet"* rather
than leaving a flat edge somebody reads as a verdict, and a second test fails if a run is ever
written about one and the note is left behind.

## What it cost the rest of the product

My ADHD's balance line used to name all nine dimensions twice — about thirty words to say what a
shape says at a glance. It is now the count, the honest half ("the rest unasked") and the door to
the map. The naming of every touched and untouched dimension is asserted on the map instead.

## Verification

| Check | Result |
|---|---|
| Unit suite | 4,066 passed, 272 files |
| `src/wellness/map.test.ts` | 19 — the ladder climbs, every rung is an act, a strategy that did not work is *Kept* and not *Working*, a strength is only claimed once something is finished |
| e2e `my-map` | 4, including the loop end to end and with nothing seeded: an empty map, the sleep run played through the real UI to its last card, that card reading "Your map: Physical", its link followed, and the Physical axis moved off *Not yet* while Cultural values has not |
| Axe, WCAG 2.1 AA, on the empty map and a lived-in one | clean |
| Text budget | `/my-map` 54 words, lived in 57, against the 60 ceiling |
| e2e `controls`, `viewports` | 324 controls, 0 covered, 0 under 44px; no sideways scroll at 320 → 1440 |

## Three things the gates caught that review did not

All three were introduced by this change and found by a check rather than by looking:

1. **`e2e/controls.spec.ts`, on its first run after the map landed:** the toolkit's footer grew a
   third link, the line wrapped, and the `::after` that had been extending each link's hit area
   twelve pixels up and down now covered the link on the row above. The comment on that rule had
   said the extensions "never overlap each other" — true of two links on one line, false the moment
   there were three. The extension is gone; the row is a flex line whose links are real 44px
   targets whether the sentence fits on one line or three.
2. **The same gate, second run:** the toolkit's *Play* was 32px wide and the map's attribution link
   17px tall.
3. **`e2e/viewports.spec.ts`:** `/my-map` scrolled **168px sideways** at 320, 390 and 430. A grid
   track's default minimum is min-content, so the chip grid asked for nine 150px columns and made
   the page 490px wide inside a 320px screen. `grid-template-columns: minmax(0, 1fr)` is the fix.
   Neither the games-fit gate nor the controls gate could see it — they measure height and targets
   — which is the argument for the suite having layers rather than one check.

## A note on the count that was cut

The footer read "five of nine touched" and now reads only the attribution. The shape already says
how much is filled in, and a count of a person is the one thing this page is built not to be.

The chart is `aria-hidden` and the nine chips under it are the real controls: a nine-pointed polygon
cannot carry nine readable labels on a 390px screen, and vertices are not 44px targets. The chips
are both the text equivalent and the targets, and `e2e/controls.spec.ts` holds them to 44px like
everything else.
