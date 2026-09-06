# Aesthetic refinement

A working list, not a register. The prior design ethos (from the deleted `DESIGN.md` /
`DESIGN-QA.md`, visible in commit history like O246 "the listening screen reads from the top and
keeps its control near the thumb" and O247 "delete before you shrink") was minimalism earned by
subtraction, not decoration. Keep that ethos; don't keep the paperwork.

Use the `apple-design` skill's vocabulary (feedback, spatial consistency, restraint, physical
motion, interruptible transitions, materials, optical type sizing) when doing this work — read it
before making motion or material decisions, not after.

## How to work through this

For each screen: capture it (mobile + desktop), compare against the product principles in
`PRODUCT.md` (one consequential decision at a time; tired/older/low-vision/keyboard/voice users;
44px touch targets; visible focus; reduced motion honoured), fix what's actually wrong, re-capture,
move on. Don't write a new `DESIGN-QA.md`-style audit doc per screen — the before/after screenshots
and a one-line commit message are the record.

## Finder (`app/finder-stages/*`) — patient-facing, mobile-first, highest priority

**RADIANT, unit 1 of 3 (2026-09-06, founder-directed: "make it exactly as the redesign").** The
founder drew three screens — the results list, the filters, the learn tab — in a warm palette with
Newsreader and Plus Jakarta Sans, and asked for them exactly. This unit is the palette and the
results screen. What changed, and where "exactly" met a law:
- *The palette, everywhere, from the five tokens.* Paper #fff8f6, ink #221a16, muted #58423a,
  faint #7a655d, line #e6d3ca; the accent family is the mockups' terracotta. Two values are not
  the mockups' because they failed AA: the meta grey #8c7168 (4.3:1) became #7a655d (5.2:1), and
  the button fill #d95c2b (3.8:1 under white text) became #bf481b (5.1:1), which is the mockups'
  own hover shade. #d95c2b stays as `--accent-mid` for the dot, the progress fill, borders, icons
  and the italic noun — never under small text. Every figure was computed, not eyeballed.
- *Plus Jakarta Sans replaces Inter* as the sans (self-hosted, variable). The founder chose it
  over my recommendation to keep Inter; Newsreader stays for statements and is now also the
  wordmark on the app pages and the clinician's name on each card, as drawn.
- *The route tokens follow the accent on the app pages only* (`.care-app`, `.me-screen`,
  `.app-tabs`). A first cut re-pointed them at `:root` and the story's hero band, its stats and
  its joins — which read the same tokens — went terracotta. The story is its own palette and
  stays navy; the finder's wide-screen backdrop is the dark ground now, as the mockups frame it.
- *The results screen as drawn:* the wordmark with the terracotta dot, a place pill beside it
  when a suburb is set, "Start over"; the search summary as one white card with the magnifier
  in accent and the words on one line; a scrolling row of quick-filter pills that switch the six
  yes/no filters in place (filled when on), a "Filters" pill with the count of the others, and
  Clear; the heading in Newsreader with "GPs" in italic accent; 64px rounded-square portraits,
  the name in Newsreader, one focus line, the place row with its pin, the chevron.
- *Where it is not exact, and why.* "All Specialists" is banned by the linter, so the chips are
  the real filters. "Next Wed" is a time the roster does not hold; the closed-books note stays.
  The generated headshots of invented doctors are not used: the portrait pipeline (credited
  stock or the monogram) fills the slot. The lead card's accent edge and the sparkle beside the
  count appear only when the order was earned — the screen's oldest honesty rule — and in the
  demo's usual query they appear, so the screen reads as drawn. The tab bar's current tab is in
  the accent as drawn, which spends the accent's third meaning on this surface; the marker keeps
  colour from being the only signal.

**RADIANT, unit 2 of 3 (2026-09-06).** The filters screen, which is the Profile tab: the
founder's mockup is that tab one for one — its labels, the ten languages, the distance and
consult segments and the ways of working were already the live filter model — so this unit is
the chrome and the controls as drawn, plus the one thing the tab lacked.
- *The head as drawn:* "FILTER GPS" eyebrow in the accent with "Reset all" on its row; "Search
  *Filters*" in Newsreader with the suburb beside it and a round close control that goes back
  to the finder. Reset all is the same act as "Clear the filters" at the foot of the list.
- *The controls as drawn:* the six switches in one white card with divided rows, a 48×28 track
  and a 24px knob, the track in the terracotta when on; language and way-of-working pills in
  white with the on ones on the soft tint, accent text and terracotta edge; the distance and
  consult segments in a stone track with the chosen one a white card in accent text. The pills
  are 36px tall as drawn and their hit area still reaches 44px above and below (O14).
- *The sticky bar,* which the tab did not have: "Show N GPs" above the tab bar, N being the
  listed GPs the filters leave from the suburb above, live as each control changes; it goes to
  the finder, which resumes the search. N counts the listed roster with its example profiles;
  the examples switch is the finder's own state and this tab cannot see it.
- *Kept against the mockup:* the "Where you are" field (the suburb the distance and the pill
  need), the "This search" section with the words and the way to forget them, and the small
  tick on a chosen pill, so a chosen pill is never told by colour alone. The mockup shows two
  switches; all six stay — dropping four is a product cut, not a restyle.

**RADIANT, unit 3 of 3 (2026-09-06).** The learn tab as the founder's card stack: one line
under the header, a row of topic chips (All, and the two shelves), the progress line, then the
seven modules as coloured pill cards with the mockup's stickers as static art. The hero card is
gone as drawn; what it carried — the count finished — is the line under the chips. Each module
sits on one of the mockup's eight colours (the eighth, night, is unused with seven modules) and
every pairing was measured: titles are 20px bold, so large text; three subtitle colours were
lifted where the mockup's failed 4.5:1 (amber and coral carry the ink, forest carries white),
the rest are the mockup's own. The mockup's topics are not the tab's content — podcasts,
dopamine loops, RSD, somatics, sleep — and no content exists for them; the seven modules keep
their titles and their cards. The app header on the profile and learn tabs closes on a plain
hairline now rather than the brand ramp, as drawn.

**RADIANT, desktop and one type scale (2026-09-06, founder-directed: "not stuck with the iPhone
window shape and size; consistent text across the whole site").** Two laws in one layer at
the end of the stylesheet:
- *One type scale for every page but the console.* Statements (h1) in Newsreader 500 with the
  same tracking and leading; h2, h3 and h4 in the sans at 600; body and list lines at 1.55.
  Sizes stay each page's own — family, weight, tracking and leading are one law, and the rule
  is unlayered so it outranks a page's utility classes. The story's display line and the
  practices page's serif h2 both fall into line; the learn tab's line under its header, which
  is the page's h1 for the outline's sake, keeps the sans at a line's weight.
- *A desk-width shell above 900px:* 1040px wide, the gutter 2.5rem. The finder's single-column
  stages keep a 780px reading measure inside it; the results list is two columns of cards; the
  filters screen is two columns, switches left and the rest right, with the sticky button on
  the right so the dock never covers it; the learn stack is two columns and its reader keeps
  the measure. The tab bar becomes a dock: a floating pill, icon beside label, the current tab
  on the soft tint, so a desktop is not a phone bar stretched across a page.

- [x] `welcome-stage.tsx` (2026-09-03) — **hierarchy reads:** question → compose box → example
      link → disclaimer, one column, nothing competing; the mic sits inside the box at thumb
      height. Two things were wrong and are fixed. **The wordmark moved between screens:**
      `.minimal-header.has-settings` was a `44px 1fr 44px` grid that centred the mark, and it was
      the only header in the app that did — welcome, `/approach` and the Profile tab centred while
      the other seven finder stages left-aligned the same `Wordmark`, so the flow's very first
      transition (welcome → listening) slid the brand mark ~130px sideways. It is now `1fr 44px`,
      mark on the leading edge, which is the majority rule and the honest one: the wordmark is a
      home link, not a screen title. All three call sites render exactly two children, and the
      24px padding comes from the base `.minimal-header`, so the leading edge is now identical
      across every stage. **The disclaimer was the odd alignment out:** it was centred inside a
      52ch measure while the question, compose box and example link all sat on the shell gutter —
      one screen, two alignments. Now left, same gutter. **Copy:** the bare "Sydney." opening a
      disclaimer read as a coverage claim the tree doesn't support in either direction (the
      gazetteer covers northern Sydney *and* the Gold Coast, but only Beecroft/Double Bay entries
      carry `realPerson`), so it now says what is actually true of the listing —
      "Listed doctors consult in Sydney" — and leaves gazetteer coverage to `coverage-map.tsx`.
- [x] `listening-stage.tsx` (2026-09-03) — verified the O246/O247 shape still holds and has not
      drifted: reads from the top (LISTENING eyebrow → "Say what you're looking for…"), the tap
      target sits low near the thumb, "Type instead" is the one escape, and there is exactly one
      disclosure line at the foot. Nothing needed changing here — the defect was on the screen
      before it (see `welcome-stage.tsx`), and with that fixed the wordmark now holds still across
      the welcome → listening transition. Confirmed on mobile + desktop captures.
- [x] `type-stage.tsx`, `scenarios-stage.tsx` (2026-09-04) — checked against listening, and one of
      the two was a separate mode. **`scenarios-stage.tsx` is fine and was left alone:** back arrow,
      wordmark, one heading sized like a heading (O232 already fixed that), one quote, one primary
      action at the foot on the same `.bottom-action` spring as every other stage. It reads as the
      same product taking a different door. **`type-stage.tsx` was still running the tagline O233
      deleted.** "ADHD assessment / that takes you seriously." was removed from the welcome as a
      marketing claim on the screen whose only job is getting a sentence out of somebody — but the
      type screen is the *same box behind another door*, and it kept the slogan, at display scale
      (3rem, rising to 3.5rem past 820px), above a box that scale had pushed down. So a person who
      tapped "Type instead" on the listening screen — where their own words are the hero — landed
      on a retracted claim shouting over a smaller field. `app-shell.spec.ts` even asserts
      `/takes you seriously/i` has count 0, but only on `/`, so the leftover was invisible to the
      suite; a CSS comment at the old `span`/`em` rules already claimed both had been deleted with
      the tagline, and on this screen neither had. It now asks the welcome's question, word for
      word — "What kind of GP are you looking for?" — set in the welcome's own type (Newsreader,
      520, `clamp(1.5rem, 4.4cqw, 1.9375rem)`, balanced, 440px measure), so the two doors into one
      field are one screen with one question. **Deleted rather than shrunk:** the `In your own
      words` eyebrow was the question again in label type, and the placeholder is now the welcome's
      (`e.g. a woman GP near Beecroft who bulk bills`) rather than a second, longer example for the
      same field. The `span`/`em` rules and the ≥820px display-size override went with the markup
      they styled. **Not changed, deliberately:** the header. Listening and welcome put the wordmark
      hard left with a dismiss control right; type, scenarios, profile and the rest put a back arrow
      left and the wordmark centred. That is two consistent header modes — entry vs. inner screen —
      and moving type to match listening would break its consistency with the four screens it
      actually shares a control with.
- [x] `profile-stage.tsx` (2026-09-04) — density check done, and the screen passes it: one
      decision is on it (the single footer button; "Compare" lives inside the closed *Why matched*
      disclosure, so it costs nothing until asked for), the body is identity → six-fact strip →
      About → three closed disclosures, and everything that could have accumulated is already
      capped in code — `profileFacts` `.slice(0, 6)`, evidence `.slice(0, 3)`, missed `.slice(0, 2)`.
      Nothing was cut. **What was wrong was the facts strip's alignment, twice over.** Five kinds of
      fact exist and only three (`telehealth`, `language`, `availability`) have ever had an icon,
      but the icon `<span>` was rendered unconditionally — an empty flex child still consumes the
      row's 8px gap, so `recording` and `approach` facts sat one gap in from their iconed
      neighbours with no mark to earn it. The slot is now drawn only when something goes in it
      (`FACT_ICONS` lookup, `{Icon && …}`). **And the strip's dividers were only correct on one
      row:** it was an auto-fit grid with a `li + li` border-left, which at 390px wraps to two
      columns, and `+` cannot tell a wrap from a neighbour — so every row after the first opened
      with a hairline hanging against the gutter, while `li:first-child { padding-left: 0 }`
      unindented only the very first cell and left the wrapped rows 13px inside the shell gutter
      the rest of the screen shares. The strip is a wrapping flex row now with no dividers: space
      already separates six short facts, and a rule that is right on the first row and wrong on the
      next is worse than no rule. (The React `key` was `fact.kind`, which collides as soon as a GP
      declares two `approach` values — it is `kind + label` now.)
- [x] `nearby-map.tsx` (2026-09-03) — checked the three things this line names. **Touch targets are
      fine and the comment is honest:** `stopIcon`/`youIcon` pass `iconSize: [44, 44]`, which
      Leaflet writes as an inline width/height on the `.nearby-marker` button, so the target is the
      44px box and the 26–36px pin is only the drawing inside it. **Chrome has not crept back:** the
      caption is still one small chip on the map, not the card O247 removed. **Faces-on-map contrast
      was a real gap, now fixed:** the numbered pin gets its edge for free — a navy fill inside a
      white border reads against any tile the basemap can draw — but the face pin has no fill, only
      a white ring around a photograph, so against the pale greys and creams of an OSM tile at this
      zoom its outer boundary vanished and the portrait floated on the street. It now carries a 1px
      navy hairline outside the white ring: the white still separates face from map, the navy states
      where the object ends, and 1px keeps it findable rather than decorative. While there, the map
      pins were added to the `prefers-contrast: more` list they had been missed from — as an outer
      ink ring, not the `border-color: var(--ink)` the other pressables take, because the pin's
      white border *is* its separation from the tile and replacing it would have made the marker
      harder to see under a setting asking for the opposite. That override deliberately sits below
      `.has-face` in the file: a media query adds no specificity, so an equally-specific rule
      declared later would otherwise beat it.
- [x] `compare-stage.tsx` (2026-09-03) — it was presenting one decision, but it was charging for
      three tables to do it. **Two of the three groups were columns with nothing in them.** The
      screen groups asks into "where they differ", "both" and "neither", and every group rendered
      the same three-column grid with a verdict cell per GP. But the heading of the second and
      third group already fixes both verdicts: under "Both" every cell read "Declared", under
      "Neither" every cell read "Not declared". On the suite's own multi-ask request that is up to
      two-thirds of the verdicts on screen restating their own heading, twice per row, in the
      columns a reader has to track across. Columns are earned by two answers that can differ;
      where they cannot, they are scanning cost with no information behind them. Only "Where they
      differ" is a table now. The other two are plain lists of the asks, same rule, same padding,
      same type, and the ask gets the full measure instead of 1fr of three. **The verdict moved
      into the heading rather than being deleted:** "Both" → "Both declare", "Neither" →
      "Neither declares", so the sentence a screen reader gets is unchanged — a heading is read
      before its list — and the two bare headings that never said *both what?* now say it.
      **The heads are a table head only while a table follows them,** so when the two answer every
      ask identically (differ group empty) the screen now says so in one line under the heads
      instead of leaving the reader to derive it from three group headings. **And the one control
      in the heads was unnamed:** the right-hand column's name is a button to that profile, and
      its whole accessible name was a person's name — a screen reader heard "Dr X, button" with no
      indication of what pressing it does. It carries `aria-label="Open {name}'s profile"` now.
      No score, no total, no accent on either column — that posture is untouched, and the e2e
      test that forbids ranking vocabulary in the body still passes. 260 e2e green.
- [x] `results-stage.tsx` (2026-09-03) — **the order now explains itself, in one line.** The screen
      was correct and mute: each row said why *it* was a match (`distinguishingSignals`), and
      nothing anywhere said what the *sequence* was built from. A reader could not tell a list
      their own words earned from the listing's arbitrary order — which is the product's whole
      claim (Product Principle #1). O237 was right to delete the four verdict paragraphs that used
      to sit on top of this screen, but deleting them took the honest half out with the wordy half:
      the list heading kept "Matches" vs "All listed GPs", which says *what* the list is and never
      *why it is in this order*. There is now a `.results-order-note` under that heading, from a
      new `orderNote()` in `src/demo/clinicians.ts`. **It branches on `matchQuality`, so it cannot
      dress up an order that isn't there** — "Ordered by what you asked for: X and Y." only in the
      `informed` case; `tied` says the GPs answer too similarly to rank and to read it as a list,
      `unserved` says no listed GP declares the ask, `unmatched` says nothing said was comparable.
      The distance clause appears on exactly the condition `rankCliniciansNear` reorders on. It
      reads `needsFor`/`matchQuality` — the ranking's own read — so it can't describe a different
      order, it names the asks strongest-weight-first so the label that moved the list most is read
      first, and it caps at three labels with "and N more" rather than silently dropping the rest.
      **Casing is deliberate on both sides:** after a colon the labels are a list and keep their
      authored case (O21's "hindi-speaking is a typo" finding); in the running prose of the other
      branches they go through `labelInSentence`, because "No listed GP declares Bulk billing" is
      the same error the other way. **Restraint:** one line of small muted text, on the head's own
      spring at the head's own delay so it reads as part of that block rather than a second event;
      it sits *under* the heading so a reader who already trusts the order skips a line, not a
      paragraph; and the existing `tieNote` — computed and passed to this component all along, and
      never rendered since O237 — joins it as a second sentence in the same paragraph rather than a
      second grey line. Same gutter and 760px measure as the heading and rows, so the left edge is
      unchanged. Covered by `src/demo/order-note.test.ts` (6 property tests tied to `matchQuality`,
      not to wording) and one e2e walk asserting the earned and unearned states are not
      confusable. 261 e2e green.
- [x] `booking-stage.tsx` (2026-09-04) — the exit point was **ambiguous in the one sentence whose
      job is to remove ambiguity, and it lost bottom room in the one mode that needs it most.**
      Three defects, all on the last screen before a reader leaves the product.
      **1. The caption named the wrong destination.** The outbound button's label was branched on
      `booking.via` ("See times on Healthengine" / "Open the practice page") and the caption under
      it was a flat `Opens Healthengine in a new tab.` for both routes. On the `practice` route the
      href resolves to the practice's own `booking.url` — and that variant exists *because* the
      clinician is "not synced to any online platform" — so the line telling a reader where they
      were about to be sent named the single destination it provably was not. Every other sentence
      on the screen is branched on `via`; this one alone was not. Unreachable from the live roster
      (both real entries are `healthengine`), which is exactly why no screenshot pass or e2e walk
      could have caught it, and why the fix is a pure function with a unit test rather than another
      ternary: `bookingHandoff` in `src/demo/clinicians.ts` returns the label and the caption
      *together* from one `switch`, and returns `null` for `synthetic-none` so the absence of the
      control and the words on it are one decision instead of two reads of `via` that can diverge.
      `src/demo/booking-handoff.test.ts` (6 tests) pins the relationship that actually broke — a
      handoff names Healthengine in its caption **iff** it names Healthengine in its label — over
      every `via` the type admits, plus new-tab disclosure on every route that has a control, and
      it was mutation-checked (reinstating the flat string fails 2 of the 6).
      **2. Installed display took 10–12px of bottom padding away from the exit control.** A
      `@media (display-mode: standalone)` block set `padding-bottom: max(16px, var(--safe-bottom))`
      on `.patient-v2 .bottom-action`, `.patient-v2 .profile-footer`, `.story-sticky-cta` and
      `.consent-bar`, on the premise that "the app supplies the insets" once browser chrome is
      gone. That premise is false for all four, and `viewportFit: "cover"` in `app/layout.tsx` is
      why — **the insets are live in an ordinary tab too**, so every one of those rules already
      resolved `env()` correctly in both modes, and the override only replaced each element's own
      designed padding with a flat floor: the finder's exit went from a `max(26px, env())` floor to
      `max(16px, …)`, and the profile footer and story CTA went from *additive* `calc(12px +
      env())` / `calc(10px + env())` to a flat `max(16px, …)`, which on a 34px-inset phone is 46px→
      34px and 44px→34px — the design padding vanishing entirely and the primary button coming to
      rest on the home indicator. So the installed app, the mode with no chrome and the control
      nearest the indicator, was the only mode that got *less* room, and it cost the finder's exit,
      the profile's exit and the story's CTA. Deleted rather than raised to a bigger floor: there
      is no correct single floor for four elements with three different designed paddings, and each
      already states its own. The header half of the block is kept — `.site-nav-inner`,
      `.story-header-inner` and `.cv2-header` genuinely have no `safe-top` of their own.
      **3. The small print was 10px, and inverted.** `.patient-v2 .bottom-action > p` was
      `0.625rem` — ten pixels, centred, in `--faint`, smaller than anything else the app draws on
      purpose (next smallest deliberate step is `0.6875rem`). Two finder lines use it and both
      carry an instruction: booking's new-tab disclosure and the type screen's "Don't include
      identifying or urgent health details". It sat directly beside `.booking-heard` at
      `0.8125rem`, so the *loudest* small text on the booking screen was the optional "you can say
      ADHD.ME" nudge and the quietest was the disclosure — the hierarchy exactly backwards. Both
      are now `0.75rem`: up from 10px for the lines that instruct, down from 13px for the one that
      suggests. One size, because they are one class of thing — a caption under a control — and
      what separated them was not emphasis but which one mattered more. Contrast was already
      passing and is unchanged (`--faint` `#626b7b` on `--paper` `#f7f8fc` is 5.06:1); the defect
      was size alone.
      `pnpm verify` green (3698 unit tests, 6 of them new); `pnpm e2e` **262 passed in 7.0m**.
- [x] `shared.tsx` / the fixed finder shell (2026-09-04) — **the container queries were never
      running.** Three finder rules size in `cqw` (the welcome question's `4.4cqw`, the type
      question's `4.4cqw`, and a `5cqw` inline padding on `.voice-core`), and nothing in the tree
      declared `container-type` anywhere — no `@container` query, no `container` shorthand, in any
      CSS or module file. Per spec an unresolved container unit falls back to the **small
      viewport**, so all three were `vw` wearing another name, and the failure was invisible
      because on a phone the shell *is* the viewport. It diverges exactly where this shell is
      unusual: `--shell-w` is **fixed** (520px, 640px past 820px) and does not track the window, so
      on a 601px window and an 819px window the frame is the same 520px while the question went
      from 26.4px to its 31px ceiling inside it. Type scaled with the window; the box it sat in did
      not — the one thing "container-aware, not viewport-aware" was written to prevent.
      `.patient-v2 .care-shell` now declares `container: finder-shell / inline-size`, and measured
      after: 24px at 390/601/819 (shell 390/520/520) and 28.07px at 1024/1440 (shell 640). One
      optical size per shell width, changing exactly where the frame does. **Safe to contain, and
      checked rather than assumed:** the shell's width is explicit (inline-size containment forbids
      a content-derived inline size), and the containing block + stacking context containment
      creates capture nothing, because every fixed-position surface in the app — `.app-tabs`, the
      sheet layer, `.consent-bar` — renders outside `.care-shell` or portals to `body`, and no
      `z-index` inside the shell exceeds the tab bar's 40. **Two dead rules deleted while
      confirming it:** the `5cqw` padding had been superseded by the later `.voice-core` `padding`
      shorthand on the shell gutter, and the `max-width: 599px` block still sized the welcome
      question at 3.25rem and the type question at 2.75rem — a media query adds no specificity, and
      both are re-declared later by rules of equal or greater weight, so neither had applied since
      those landed. (Only the booking heading is still sized there.) **And one responsive rule in
      `shared.tsx` itself genuinely cannot be container-aware:** `<Image sizes>` is resolved before
      layout, so viewport conditions are all there is — which makes it the one place the shell
      width is restated by hand, and it had drifted to a flat `440px` above 520px against a
      portrait that is `calc(100% - 36px)` of a 520/640px shell. It upscaled a stock portrait by a
      third on desktop. Now the shell's own three regimes.

## Story / public surfaces

- [x] `story-landing.tsx` (2026-09-05) — **the page's typography was written three times and only
      the last copy ran.** The typography pass found nothing to retune, because the thing wrong
      with this page's type was not its values but that a reader could not find out what they
      were. Six blocks in `globals.css` set the story surface's type in Newsreader — two full
      `.story-hero-copy h1` rules a hundred lines apart (22ch at `clamp(2.5rem, 4.5vw, 4.125rem)`
      with a comment arguing the measure *down* from 15.5ch, then 15.5ch at
      `clamp(2.625rem, 5vw, 4.875rem)` arguing it back), two identical `.story-hero-sub` rules,
      `.story-heading`, `.story-approach-title`, and `.story-throughline-line` — and the redesign
      layer 1,400 lines further down restates **every** property each of them set, in Inter, at a
      different scale. None of the six had applied since that layer landed. This is the same defect
      as the finder shell's container queries one entry up, one layer higher: the first description
      a reader hits is authoritative-looking and inert, and an edit to it changes nothing on
      screen. All six deleted; the handful of declarations the redesign layer did *not* restate
      (`margin: 0` on the two `h2`s, `text-wrap: pretty` on the sub, `text-wrap: balance` and
      `margin: 0` on the pull-line, `font-style: italic` on its `em`) carried down to the live
      rules rather than left behind as the working remainder of dead blocks. **And an animated
      underline that was documented but switched off:** 26 lines drew a 3px accent rule under
      "with one GP" and animated it on scroll, and the redesign layer killed it with
      `content: none; display: none`. Deleted with its disabling line rather than kept as a comment
      nobody can trust — what marks the claim now is italic Newsreader against the h1's Inter,
      a typographic distinction rather than a decoration to animate. Net −95 lines of CSS, no
      rendered change. **The logo half of this item does not exist any more:** the founder
      portraits and the HSIL/partner logo moved to `/about` with the founders register
      (`about/team-plates.tsx`, `/hsil-logo.png`), so nothing on this page renders an `<Image>` —
      the hero's figure is the drawn `CoverageMap` — and the now-unused `next/image` import went
      with them. Contrast/alignment for that logo belongs to the `/about` line below.
      `pnpm verify` green; `pnpm e2e` **262 passed in 7.1m**.
- [ ] `app/practices`, `app/clinicians` (walkthrough), `app/faq`, `app/about`, `app/examples` —
      pass for consistent type scale, spacing rhythm, and motion restraint across all public pages;
      these are visited far less often than the finder, so drift is easy to miss.
      **Cold look at 390, 2026-09-05** (faq, examples, practices, clinicians, approach, story,
      join, privacy, full-page captures read one by one). Type scale and rhythm hold across the
      set: Newsreader on every public h1, the same footer band, the same consent bar. Four things
      did not, all fixed the same day:
      1. *The figures had drifted.* One label, "common out-of-pocket cost of a private adult
         assessment", carried "$1k to $2k" on the story, "$1k to $5k" on the learn page and the
         practices copy; the wait was "6–12 months" on two pages and "Months to years" on the
         third — under a comment on the story rail promising the figures were copied from one
         file so they could not drift. A copy is what drifts. They are one exported constant now
         (`INDICATIVE_FIGURES`, `src/compliance/landing-copy.ts`) that every renderer and the
         learn scene's footnote read, held by `indicative-figures.test.ts`. The story's third
         figure, "$270 to $600 via a GP-led pathway", has no register entry and is the one still
         written by hand; it is on the founder's source-confirmation list with the rest.
      2. *The story header wrapped.* At 390 the wordmark, both text links and the pill all broke
         onto two lines. A 900px rule already hid the links — and lost to the phone-width
         `nav a:not(.hidden)` touch-floor rule, whose own comment claimed it never set `display`
         while it did. The hide rule now outranks it (`.story-nav > .story-nav-link`) and the
         touch-floor comment tells the truth. One line: wordmark and pill.
      3. *A stranded control on /practices.* The section nav hid its three anchor links on a
         phone and left "Practice sign-in" alone on a row of its own, above a hero that repeats
         it. The row is desktop furniture now (`hidden sm:block`).
      4. *One pill said "For clinicians".* The join page's header pill, where every other surface
         says GPs — the glossary's word. It says "For GPs".
      Not changed, noted: the clinician walkthrough keeps its own chrome ("ADHD.ME ⌄ · Patient
      view ↗") and its own footer, which reads as deliberate for a stepped tool rather than as
      drift; and two of the three worked examples land on the same first GP, which a two-GP
      roster makes unavoidable.
- [x] `learn-modules.tsx` — content-heavy; check line length, contrast, and quiz interaction
      feedback (the O243–O245 "motion pass" touched this — confirm it still reads well).
      **Walked 2026-09-05 at 390**: a read module card by card, then a quiz answered wrong and
      right. The read card holds a comfortable measure inside its rounded panel; the quiz's
      answered state shows the tick on the right answer and the cross on the chosen wrong one,
      the "Not quite." line beneath in the same warm panel, Back and Next below it at the 44px
      floor. The score card names the count. Contrast passed the axe sweep the same day. And the
      page pads for the fixed tab bar: scrolled to the bottom, the last line of the footer ends
      exactly at the viewport's edge, nothing under the bar. Nothing to change.

## Practice console (`app/console/*`)

- [ ] Desktop-first density is correct here per PRODUCT.md ("calm, dense where useful,
      operationally explicit") — don't import finder-style whitespace wholesale. Different
      surface, different rules.
- [ ] Pick a handful of representative screens (dashboard, matching, capacity, referrals) for a
      real pass before touching all 25+ subsections — see Roadmap Q4.
- [ ] Table/list density, empty states, and keyboard navigation are the highest-value console
      aesthetic work — more so than color or type on a tool people use mid-shift.

**Cold look at 390, 2026-09-05** — home, dashboard, matching, capacity, referrals, outcomes,
results, signed in and seeded, full-page captures read one by one. Nothing scrolled sideways
(`scrollWidth` 390 on all seven). Referrals, outcomes and results read cleanly on a phone: one
column, the empty and awaiting states in their own words, tables that fit. Two did not:
1. *The dashboard's title row.* "Incrementality" and "26 simulated weeks · 4,000 synthetic
   patients" shared a non-wrapping flex row and collided at 390. It wraps now.
2. *Capacity's recommendations.* Seventy sessions, seventy two-line paragraphs in one flat list —
   12,388px of the page's 17,128px — under the drift verdict and the score that are what the
   page is for. Grouped by weekday behind seven closed disclosures ("Monday · 10 sessions"); the
   engine's sentences are untouched, each states its own basis on purpose.
Noted, not changed: `matching` is 10,000px at 390 and is an audit tool for a desk, not a phone.
The dashboard's chart labels, first noted here as needing a phone chart, needed less: the SVG
scaled its 720-unit box into 326px and its labels with it, to five pixels. Below 560px the chart
now keeps its size and its box scrolls sideways (labels ten pixels; the page still 390 wide).
The same component draws the results page's chart, so both are fixed.

**Public pages at 1280, the same day.** Nothing to change: the FAQ and the legal pages hold a
74–75 character measure, the story's and practices' widest boxes are short bullets and rows,
and the learn tab's phone-width column on a desktop is the app shell's frame, not drift.

## Cross-cutting

- [x] **Monthly design audit — 2026-09-05 (first).** Run under the standing ROADMAP item the founder
      set today ("there is so much AI slop everywhere"). The pass this month was fluidity, because
      the founder's verdict on the previous transitions.dev pass was that it declined too much:
      "the aesthetics need to be 10x more responsive and fluid". Second pass, on states the app
      already has: every stage arrival clears a 3px blur as it rises (`shared.tsx` — the page-slide
      lane); the map panel comes into focus as it unfolds; results rows resolve line by line on the
      stagger they already had; the settings scrim blurs what it covers on its existing fade; the
      results count pops per digit when it changes; the settings tickbox is a drawn box whose tick
      strokes in; the story page's three arrow links open their arms on hover; the Profile tab
      wears a badge with the number of filters on. Twelve of the library's thirty-two are now in
      play; the ledger at the top of the `t-*` block in `globals.css` says which and why, and
      names each one still declined with its reason (a skeleton where there is no load is a lie
      told in motion; an accordion would hide the FAQ answers from answer engines; a tooltip helps
      the one device this product is least used on). Same day, the finder re-walk at a real 390 viewport turned up the booking screen twice — its
      heading in Inter where every other stage heading is Newsreader (a `.patient-v2` leftover), and
      an example profile's note promising a phone route with no number. Both fixed. Listening and
      compare followed: listening reads clean; compare's two heads were one plain label beside one
      underlined button wrapping a full name over two lines, so the table opened on an asymmetric
      pair — the link keeps its role and floor and trades the underline for a trailing mark, and
      both names balance. Every finder stage has now been looked at cold at 390. **Next due
      2026-10-05**, per ROADMAP.

- [x] Motion vocabulary audited against the transitions.dev scale (2026-09-05) — see
      `docs/adr/0002-a-close-is-not-an-open-played-backwards.md` for the reasoning. The house
      durations already agreed with that scale where they overlapped; the finding was a **missing
      rung**. Nothing in the vocabulary said how fast a thing LEAVES, so every open/close pair used
      one duration in both directions, and the sheet — the app's primary modal idiom — closed on the
      same spring it opened on. A spring overshoots both ways, so a dismissed sheet dipped past the
      screen edge and bobbed back before settling out of view. `--dur-exit` (150ms) and
      `--dur-stagger` (40ms) are now in the token block with the rules attached: **a close is
      shorter than the open it undoes and never overshoots**, and a stagger's cap is on the total
      (offset x items, under ~300ms) rather than the offset. Fixed with them: the sheet's exit and
      its scrim, and `story-landing.tsx`'s six-child cascade, which ran 480ms — long enough that the
      last item landed after the reader had read the first and looked away.
      Also tokenised in the same pass: every bare `<n>ms ease` in `globals.css`. About a dozen lived
      in the cv2 console, which the token block's own comment had exempted as "keeping its own
      tokens" — it had none, only literals on the browser default curve, which is the exact thing
      `--ease-ui` was introduced to remove. Matched on **usage, not nearest number**: a stage
      arriving takes `--dur-enter` on `--ease-soft`, a control acknowledging a press takes
      `--dur-tap` on `--ease-ui`. The story page's choreographed sequences stay timelines and were
      left alone; only its hover values were tokenised, and its
      `cubic-bezier(0.16, 1, 0.3, 1)` was replaced with `--ease-soft`, which it already was.

- [x] Motion: `prefers-reduced-motion` audited across every `motion/react` call site in `app/` and
      `src/` (2026-09-03). The finder was clean — `MotionConfig reducedMotion="user"` in
      `care-finder.tsx` plus per-prop guards. Four gaps outside it, all now fixed:
      `story-landing.tsx`'s two nav/hero `whileHover`/`whileTap` lifts and its `whileHover="lift"`
      step rows were ungated entirely, and both `story-landing.tsx`'s pillar list and
      `about/team-plates.tsx` carried the *half-gate* AR20 had already named and fixed in `Reveal`
      on that same page — `initial` gated, `whileInView` not, so a reduce user got the full slide
      anyway. `team-plates.tsx` even had a header comment asserting the static equal it did not
      deliver. All four now use the `Reveal` shape: resolve on mount at duration 0, never watch the
      viewport. Worth knowing for next time: **the AR20 detector cannot catch these.** It samples
      the rest state after load, so hover/tap states are invisible to it and a half-gate is only
      visible on scroll. This audit was a read of every call site, not a test run.
- [x] Focus visibility (2026-09-03) — swept every focusable in `app/` by extracting the class list
      off each `<button|a|input|select|summary|textarea>` and checking it against every
      `:focus`/`:focus-visible` selector in `globals.css`. Two things worth recording. **Nothing is
      suppressed:** there is no `outline: none` anywhere in `globals.css`, and no element in the
      tree is made focusable with `tabIndex={0}`, so there is no invisible-ring case to fix — the
      thing the item was written to look for does not exist. **But the base rule only covered three
      of the six kinds:** `button`, `a`, `textarea` got the app's 2px accent ring, while `input`,
      `select` and `summary` fell through to the browser's own hairline — the platform's blue, not
      the accent, and blind to the high-contrast and forced-colours overrides the rest of the
      product answers. That left the console's workspace-menu `summary` (a primary nav control),
      every console field and `select`, and the finder's `.profile-more`/`.profile-disclosure`
      disclosures wearing focus from a different design system than the button beside them. All
      three now take the same ring at `outline-offset: 2px` rather than the 4px buttons use:
      buttons and links are shapes the size of their own text and need air to read as a ring, while
      fields, selects and disclosure rows are already boxed and a 4px halo detaches into a second
      floating rectangle. That is the offset `.nearby-marker:focus-visible` and the console's
      per-class rings had each arrived at on their own. Class-level rules still win on specificity,
      so every deliberate custom ring is untouched.
- [x] Dark-mode / theme parity (2026-09-03) — **the app has no second theme, and that is a
      decision, not a gap.** Checked all three places it could live: `globals.css` contains zero
      `prefers-color-scheme` blocks, `:root` declares `color-scheme: light`, and no theme toggle,
      `data-theme` attribute or `darkMode` flag exists anywhere in `app/` or `src/`. The palette
      header states the rule outright — "One theme, one accent, one place to change either" — and
      `e2e/support/visual.ts` already encodes it honestly: its capture matrix is a list of one
      theme with the reason recorded and a note that adding a second there doubles the matrix by
      construction. **The half-finished pass this item was written to look for was real, but it
      was a comment, not a stylesheet.** A ~28-line "DARK MODE" banner sat in `globals.css`
      describing a token re-declaration, an accent that "steps up to Tulip Bloom", and olive-cast
      dark grounds — none of which exist; the section body had been removed and only the heading
      survived. It also called the accent Crushed Rose, which the palette has since replaced with
      amber, so it had been stale across at least two accent changes. Deleted and replaced with a
      short note saying no dark mode exists and why, because documentation for absent code is
      worse than none: the next reader believes both themes are covered and stops checking.
      Building dark mode was deliberately *not* done here — it is a founder call on the brand
      (see "Explicitly not doing"), not a refinement task.
- [x] Palette header (2026-09-03) — `globals.css` opened with **two** "THE PALETTE" blocks, stacked,
      appended one accent change apart. The second still quoted `#8A5A16` with contrast figures for
      a colour the tree no longer uses; `--accent` is `#a14f19`. Two descriptions of one palette is
      worse than one: the reader believes whichever they hit first. Merged into a single block with
      the current token, measured figures for it (5.42:1 on `--paper`, 5.76:1 on white — computed,
      not carried over), and a pointer to the "THERE IS NO DARK MODE" note further down so the
      one-theme rule and its reason sit one search apart. No token values changed.
- [x] Type scale (2026-09-05) — confirmed on all three legs of optical sizing, and **two of them
      already passed while the third had never been switched on.** Measured rather than eyeballed:
      every rule in `globals.css` setting both a size and a tracking or leading was parsed out and
      the pairs sorted by size. **Tracking passes** — 97 pairs, no global `letter-spacing`
      anywhere, running from `+0.1em` at 10.5px down to `−0.065em` at 86px, monotone in the right
      direction. The four apparent outliers are all correct on inspection: the one large positive
      is `.story-member-monogram`, which is *initials*, and letterspacing uppercase is right at any
      size (the real rule is that tracking follows size *within a case*, which a size-only
      heuristic can't see); the three small negatives are `−0.005em` to `−0.01em`, i.e. under
      0.15px, and two of them are logotypes. **Leading passes** — 129 pairs, median line-height
      1.50 below 14px → 1.55 (14–20px) → 1.15 (20–32px) → 1.05 (32–48px) → 0.98 above 48px, inverse
      and monotone, with zero large-type outliers. **Optical sizing itself failed, completely.**
      Both faces come from `@fontsource-variable`, and the bare package name resolves to
      `index.css`, which is the wght-only cut. Read out of the `fvar` tables of the files actually
      being served: `inter-latin-wght-normal.woff2` carries `wght 100–900` and no other axis,
      `newsreader-latin-wght-normal.woff2` carries `wght 200–800` and no other axis — while the
      `opsz` builds sitting unused in the same directory carry `opsz 14–32` and `opsz 6–72`. So
      `font-optical-sizing: auto`, which is the CSS default and needs no declaration, had nothing
      to act on: the console's 10px tabular labels and the story hero's 90px headline were one
      drawing at two magnifications, which is the exact "linear scaling" this item was written to
      rule out. Inter now imports `opsz.css` — it is the face that spans the whole scale, setting
      both ends of that 9x range since the redesign, and the axis costs 25KB on the latin subset
      (48KB → 73KB). **Newsreader is deliberately left on the wght-only cut:** its `opsz` build is
      the single largest item available in the type budget (58KB → 132KB) and the redesign moved
      the display sizes to Inter, leaving it a narrow band of accents and mid-size serif — a 6–72pt
      axis for a face living between ~16 and 32px is the most expensive way to buy the least.
      **And a fourth thing the audit was not looking for: no italic face was loaded at all.**
      `index.css` declares only `font-style: normal`, for either family, so all six
      `font-style: italic` rules were the browser shearing the roman ~12°. Newsreader's italic is a
      separate drawing and not a slant — of 33 letters sampled out of `hmtx`, all 33 differ in
      advance from their roman (`e` is 794 units against 923, 14% narrower). That was worst exactly
      where it showed most: `.story-claim` and `.story-throughline-line em` are the two rules
      naming Newsreader and italic together, they are the device marking the hero's central claim
      (see `story-landing.tsx` above), and they sit at display size. `newsreader/wght-italic.css`
      is now imported; it is `font-display: swap` and scoped to `font-style: italic`, so only a
      page rendering italic Newsreader fetches it — `/story`, not the finder. The three remaining
      italics (`.mc-quote` 14px, `.cv2-eyebrow` 11px, `.listen-transcript.is-empty`) inherit Inter
      and stay synthetic on purpose: Inter's italic is a true oblique by design, so the browser's
      version is much closer to it than it would be for a serif, and ~48KB on the finder's critical
      path to redraw three small labels is the wrong trade. Verified in the built output — the
      emitted CSS now references `inter-latin-opsz-normal` (replacing `inter-latin-wght-normal`)
      and `newsreader-latin-wght-italic`, with 9 italic `@font-face` declarations where there were
      0. `pnpm verify` green (3733 tests); `pnpm e2e` **282 passed in 9.3m**.

## Explicitly not doing

- No new screenshot-diff register or automated design-QA gate. Capture, compare, fix, commit.
- No wholesale visual rebrand without a founder call — this is refinement of the existing direction
  (Product Principles + prior DESIGN.md ethos), not a new brand exercise.
