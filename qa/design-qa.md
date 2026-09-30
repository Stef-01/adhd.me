# Main introduction reference design QA

> **PRE-FORK RECORD.** This documents the landing page of the Meherr product, before this tree was
> reoriented to ADHD assessment. The hero, the PMOS/PCOS naming and the "South Asian women"
> positioning it evaluates were all replaced — see `app/story-landing.tsx`. Kept because the
> typography and hierarchy reasoning still applies to the page that replaced it.

## Evidence

- Source visual truth: `/Users/devasiathottunkal/Desktop/web design/IMG_5251.PNG` and `/Users/devasiathottunkal/Desktop/web design/IMG_5252.PNG`.
- Source pixel dimensions: 2796 × 1290 each. The references include a tablet frame; the app-owned areas were evaluated for hierarchy, type pairing, restraint and negative space rather than copied as device chrome.
- Desktop hero implementation: `qa/main-intro-desktop-final.png`.
- Desktop statement implementation: `qa/main-intro-desktop-statement.png`.
- Mobile hero implementation: `qa/main-intro-mobile-final.png`.
- Mobile registration implementation: `qa/main-intro-mobile-register.png`.
- Desktop viewport: 1440 × 900 CSS px at 1× screenshot density.
- Mobile viewport: 390 × 844 CSS px at 1× screenshot density.
- State: main introduction at rest; registration CTA followed to the form.
- Full-view comparison evidence: the source hero and `qa/main-intro-desktop-final.png` were opened together; the source editorial content view and `qa/main-intro-desktop-statement.png` were opened together.
- Focused region evidence: `qa/main-intro-mobile-final.png` checks hero wrapping and `qa/main-intro-mobile-register.png` checks form density and the primary conversion path.
- Density normalization: the browser captures match their CSS viewport at DPR 1. The 2796 × 1290 reference images were viewed fitted to the same comparison surface because their outer tablet frame is reference context, not implementation content.

## Findings

No actionable P0, P1 or P2 differences remain.

- Fonts and typography: the implementation now follows the references' restrained sans-serif display type with a serif italic accent. The hero is seven words, wraps deliberately and leaves PMOS/PCOS naming to the supporting sentence.
- Spacing and layout rhythm: the main page uses a quiet masthead, one large statement per section, asymmetric alignment and generous negative space. Desktop and mobile captures show no clipping or horizontal overflow.
- Colors and visual tokens: warm paper, near-black olive and muted sage replace decorative UI surfaces. Text contrast is clear in the checked light and dark sections.
- Image quality and asset fidelity: no generic stock or generated photograph was added. This is intentional: the request was to transfer the references' formatting, while generic health imagery would make the early community venture feel less credible. No reference image was replaced with CSS art or a placeholder.
- Copy and content: the parenthetical “formerly PCOS” has been removed from the headline. The new visible hierarchy is promise first, plain-language naming second, then only the facts required to understand the model.
- Interaction and accessibility: the registration CTA scrolls to the real form, the form remains keyboard- and label-accessible, the early demo route remains available, and the synthetic-profile disclosure is visible before the hero.
- Browser console: no warnings or errors were present during the checked path.

## Comparison history

### Pass 1

- P1: the original introduction used a long medical sentence as the hero, including a parenthetical rename, so the core promise was difficult to scan.
- P2: the first revised desktop hero aligned both text groups to the bottom, leaving unearned empty space above the promise.

Fixes made:

- Replaced the hero with “Helping South Asian women find answers earlier.”
- Moved PCOS naming into one supporting sentence: “PMOS — the condition long known as PCOS”.
- Anchored the main statement to the upper part of the hero while retaining the low, quiet registration action from the reference composition.
- Reduced every following section to one statement, one short supporting thought and only the minimum useful detail.

Post-fix evidence:

- `qa/main-intro-desktop-final.png`
- `qa/main-intro-desktop-statement.png`
- `qa/main-intro-mobile-final.png`
- `qa/main-intro-mobile-register.png`

## Follow-up polish

- P3: owned community-session photography could later replace some negative space, but only once authentic imagery exists; it should not be simulated for this early-stage page.

## Final result

final result: passed

# Minimalism review — matching surfaces (O11, 2026-08-18)

Scope: every UI the matching pipeline renders through — the finder's results, clarifier,
profile and listening screens (`app/care-finder.tsx`) and the console's matching audit
(`app/console/matching/page.tsx`). Reviewed against the screenshots in `qa/matching-o10/`.

## Verdict

The surfaces are already spare: one field, one dual-function control, one count line, one
quality banner that only renders when it has something to add, rows that carry exactly one
distinguishing reason each. The earlier collapse (eleven screens to seven) is holding. One
real defect and no removable elements were found.

## The defect, fixed

- **The count line claimed a ranking beside the banner denying one.** On an unmatched query
  the screen read "2 of 2, ranked on what you asked for." two lines above "this is everyone
  we list rather than an order." — two sentences about the same fact, one false. The count
  line now claims "ranked on what you asked for" only when `matchQuality` is `informed`;
  otherwise the count stands alone and the quality banner owns the explanation. (The
  nearest-first variant is exempt: since O3, an unmatched query with an origin genuinely IS
  distance-sorted, so that sentence is true in every quality state.)

## Reviewed and kept, with reasons

- **Quality banner + clarifier block stacking** (unmatched state shows both): not
  duplication — the banner says what happened, the questions are the way out. Removing
  either orphans the other.
- **Top-tie note (O3)**: renders only when `informed` with a tied first band, which the
  quality banner cannot say; never stacks with it.
- **Closed-books line (O4)**: one sentence, only on affected rows, only claiming fit when
  fit exists (Codex P2 fix).
- **Profile**: eyebrow flips between "Why this fit" / "About this GP" on evidence; signal
  pills deduplicate against the row reasons; no repeated sentence found.
- **Console audit table**: the O2 "Declares" column and O8 "books closed" tag each add one
  cell of operator-facing fact; the table remains the only place scores render.

## Evidence

`qa/matching-o10/*.png` (before), refreshed after the count-line fix by re-running
`e2e/matching-verification.spec.ts`.

final result: passed, one fix applied

# Low-vision audit — matcher and results screens (O14, 2026-08-18)

Audience audited for: a visually impaired elderly reader — the person most likely to be
choosing a GP with someone else's phone in their hand. Method: measured contrast ratios of
every text pair on the matcher/results screens, type sizes against what each element is FOR,
touch targets, focus visibility, and the two platform behaviours (iOS input zoom, sticky
hover) visible in the production screenshot that triggered O13.

## Contrast: passes AA, measured

| Pair | Ratio | Verdict |
|---|---|---|
| ink `#191a17` on paper `#fbfaf7` (body) | 16.75:1 | AAA |
| accent `#8A5A16` on paper (links, distance, closed-books) | 5.66:1 | AA |
| faint `#6b6c67` on paper (count line) | 5.07:1 | AA |
| muted `#6e706a` on paper (row reasons, clarify lead) | 4.80:1 | AA |
| ink on accent-soft `#f7efe3` (clarifier chips) | 15.32:1 | AAA |

No contrast fixes needed; the token discipline (`--faint`'s own comment pins its floor) held.

## The real defect: an inverted size hierarchy

AA contrast at 12px is compliant and still unreadable for this audience — and the 12px text
was exactly the text the screen turns on: the match REASON on each row (the one line that
decides between GPs), the match-quality banner ("this is not a ranking"), and the
closed-books warning. Meanwhile the decorative headline runs at 27px serif. The reader with
the least vision was given the least legibility on the most consequential sentences.

Fixed: row reasons 12→14px, row names 15→16px, count line 12→14px, match-quality banner and
tie note 12→15px in `--muted`, clarify lead 13→14px, clarifier chips 13.5→15px.

## Platform behaviours fixed

- **iOS force-zoom on the suburb field**: any input under 16px makes iOS zoom the whole page
  on focus — disorienting for a reader who has already zoomed where they want. 15→16px.
- **Sticky hover**: after a touch, iOS keeps `:hover` styles until the next tap, so one
  clarifier chip stayed white-with-border and read as a selected state meaning nothing —
  visible in the production screenshot. Hover styles now apply only under
  `@media (hover: hover)`.

## Verified and kept

- Touch targets: clarifier chips `min-height: 44px`; clinician rows ~100px; the suburb field
  46px. All at or above the 44px floor.
- Focus: `:focus-visible` outlines (2px accent) on chips, rows and the field.
- Screen reader: the banner, tie note and count line carry `role="status"`; rows are real
  buttons named by their content; the results heading order is h1-first.
- Minimalism for this audience: fewer, larger elements is the same direction O11 pushed;
  nothing needed removing — the screen's element count was already minimal, only its
  emphasis was upside down.

## Known bound, recorded

Type is sized in px throughout the tree, so browser zoom scales everything but a user's
OS/browser font-size *preference* does not. A rem migration is a tree-wide unit refactor —
out of an audit's scope, filed here so it is a decision rather than a discovery.

final result: passed after fixes; evidence `qa/matching-o10/` (re-rendered)

---

# Design QA — matched doctor profile

final result: passed

## Comparison target

- Source visual truth: `design/doctor-profile-selected.png`
- Rendered implementation: `qa/design-qa-implementation-mobile-final.png`
- Normalized side-by-side evidence: `qa/design-qa-comparison-mobile-final.png`
- Additional responsive evidence: `qa/design-qa-implementation-desktop.png`
- State: Dr Anu Saxena profile, all optional disclosures closed, booking CTA visible.
- CSS viewport: 390 × 844 px at device scale factor 1 for the primary comparison; 1280 × 900 px for the desktop check.
- Source pixels: 852 × 1846. The source was proportionally normalized to 390 × 844 for comparison.
- Implementation pixels: 390 × 844. No density conversion was required.

## Findings

No actionable P0, P1, or P2 findings remain.

- Fonts and typography: Newsreader remains the display face and Inter the UI/body face. The final name stays on one line at 390 px, the bio is readable at 15 px/1.56, disclosure labels are medium rather than heavy, and no text truncates.
- Spacing and layout rhythm: identity, highlights, bio, disclosures, and CTA align to the same 22 px mobile inset. The portrait measures 126 × 144 px. The last closed disclosure ends at 761.54 px and the sticky footer begins at 767 px, leaving a visible gap with no overlap. There is no horizontal overflow.
- Colors and tokens: the existing paper, ink, muted, line, stone, and accent tokens are preserved. The previous colored highlight bubbles are now transparent text with typographic separators; no filled bubble, border, radius, or shadow remains.
- Image quality and asset fidelity: the implementation uses the repository's real clinician portrait, with the same subject, crop direction, rounded frame, and off-white treatment as the source. No substitute, generated face, CSS drawing, or placeholder is used.
- Copy and content: the short biography is visible before optional details. “Declared interest in ADHD.ME” is absent from the roster, UI, matching provenance, onboarding question set, and public profile. “Live on Healthengine” is absent from the footer; the footer contains one direct “See available times” action.
- Affordances and interaction: “More about”, “Why matched”, “Appointment and access”, and “Credentials and experience” use native progressive disclosure. Comparison and match refinement live on the results screen. Back navigation returns to results. Keyboard-sized targets and focusable native summaries are retained.

## Full-view comparison evidence

The normalized source and implementation were placed together in `design-qa-comparison-mobile-final.png` and reviewed at original size. The header, portrait/identity geometry, one-line highlights, About content, three disclosure rows, and single rounded CTA are all directly legible in the combined image. The implementation intentionally begins the biography about 30 px earlier than the generated target; this is an accepted product-directed deviation because the request explicitly prioritized seeing the bio sooner, and it does not change the source hierarchy.

## Focused region evidence

A separate cropped comparison was not needed: the 800 × 844 combined image renders the header/identity and footer/disclosure regions at 1:1 implementation pixels, so typography, portrait crop, dividers, CTA radius, and spacing are all readable without enlarging or downsampling those areas. Browser measurements separately confirmed the footer/disclosure boundary and overflow state.

## Comparison history

### Iteration 1 — blocked

- [P2] The 390 × 844 render wrapped the doctor's name onto two lines while the source kept it on one.
- [P2] The sticky footer began at 759 px while the last disclosure ended at 796 px, obscuring the final row.
- Fixes: reduced the mobile display size, tightened bio typography, matched the source portrait geometry, reduced the CTA height, and rebalanced intro/fact spacing.

### Iteration 2 — passed after refinement

- Post-fix evidence: the name occupies one line in a 199 px identity track; portrait is 126 × 144 px; last disclosure ends at 761.54 px; footer begins at 767 px; CTA is 52 px high; no horizontal overflow.
- Additional polish: normalized row font weight, aligned portrait track and grid gap to the source, and corrected thumbnail sizing so a clean browser session reports no console errors or warnings.
- Result: no actionable P0/P1/P2 differences.

## Verification

- `pnpm typecheck` — passed.
- `pnpm vitest run --reporter=dot` — passed, exit code 0.
- `pnpm build` — passed.
- Profile/compare end-to-end suite — 10/10 passed.
- Finder, matching, booking, location, ownership-removal, and route checks — passed after updating assertions for progressive disclosure.
- Full end-to-end regression run isolated two failures: the voice case passed on immediate retry; the profile compliance sweep identified a newly introduced word, the copy and sweep coverage were corrected, and the profile sweep passed on rerun.
- Clean in-app browser session — no console errors or warnings.
- Primary interactions checked: results → profile, profile back → results, disclosure open/close, results comparison open/back, and comparison-to-profile navigation.

## Follow-up polish

- No required follow-up. The earlier About position is the only intentional visual deviation from the source target and directly serves the stated usability goal.

# The profile under the sentence — two asks not in the listing (O255, 2026-09-29)

The budget instrument measured the AI "Why matched" screen with nothing missed (57 words) and
the keys screen with two asks missed (59), and called the profile within its ceiling. The state
a person meets most, four asks of which the listing answers two and the model's sentence above
the missed line, was never reached: probed across five requests and the first six rows of each,
it read 67 to 75 on the heaviest profile (a disclosure, two languages, a three-word name to
compare with).

## What changed

- The missed line is "Not in their listing: **bulk billing**, **a woman clinician**." (four words
  and the asks) in place of "You also asked for … and …, not in their listing." (eight and the
  asks): the sentence above it already says what was asked. Semicolons part the asks when one
  holds a comma. It is 14px now, not 12, with a little room under the sentence (O14: the reader
  may be tired or low-vision).
- Every manner is asked for in six words at most (`asked` on each quality in
  `src/demo/emotional-fit.ts`): "a structured approach", not "someone who works to a documented
  baseline and follows up on a schedule" (13 words, which alone put a missed line at 24).
- The why sentence is at most 20 words, not 26: the model's clause gets what the frame leaves
  (never more than twelve; the input names the number), and a frame that leaves fewer than five
  words makes no call.
- The two lower folds are "Appointments" and "Background", one word each, in place of
  "Appointment and access" and "Credentials and experience".
- Two states join the instrument and the e2e gate: the keys and the sentence over the same
  heaviest profile with two asks not in the listing.

## Evidence

Captures in `qa/roster-o254/`: `profile-missed-keys-{390,1280}.png` (46 words),
`profile-missed-words-{390,1280}.png` (60), `why-words-{390,1280}.png` (49, was 57). The probe
across the five requests: worst 60 (was 75), every other row 52 to 59.

## Verification

- `pnpm typecheck` — passed. `pnpm vitest run` — 4678 passed, 1 skipped.
- Text budget over every screen: 142 screens measured, 127 of 127 app screens within their ceiling, 0 over, median 29 words (90 at or under the 40-word target). The finder profile states: 44, 44, 49, 46 and 60.
- e2e: finder-flow, finder-read, compare, matching-verification, profile-layout, text-budget and headings specs — 42 passed (12.2 min) on the production build.

# The filters screen gains a switch that changes the list (O257, 2026-09-29)

"Lived experience" joins the switches on `/profile`, second, after "Woman clinician", with the
line "Clinicians who say they have ADHD." under it: three of the 37 say it of themselves, and the
founder named it as the kind of question that should be asked (docs/matching/HIGH-YIELD.md). The
switch, its chip and the heard chip share the two words (the chip cap), so a screen reader hears
one name for one thing. The screen measures 38 words at 390 and at 1280, under the
40-word target; captures `qa/roster-o254/filters-lived-{390,1280}.png`.

# Manner leaves every patient screen (O259, 2026-09-29)

The founder: "taken seriously is so useless, remove that; it's a bad look to say we have certain
clinicians that take people seriously." The rule applied as a default across the finder: a manner
trait is never shown as a thing the finder heard (no "Taken seriously", "Not rushed" or "Shared
decisions" chip), never a key under "Why matched" and never in the "Not in their listing" line, is
not given to the model that writes the why sentence (the "How they work" labels are out of the
listing text it reads), and is never a clarifier question in the typed finder or the voice one.
The words are still read, for the ranking's last tier, and change nothing a person can see. The
text budget's own request ("an adult ADHD assessment, telehealth, not rushed") shows two chips now,
not three. The nine manner traits themselves, and their cues, are left for a planned removal.

# The results card prints twenty words of any request (O260, 2026-09-29)

A spoken request is now every answer the person gave, each its own sentence (stage 2 of
docs/matching/RCA-NIGHT-2026-09-29.md), and a rambling caller's ran to 156 words in the text eval.
The card at the top of the results ("Your search") printed the whole request, which put one
screen over its 60 words on the request alone. The card prints the first twenty words and an
ellipsis; "Change what you said" still opens the box with every word in it, and the heard chips
say what was read. Pinned in `e2e/voice-mode.spec.ts` on the scripted nine-answer call. The typed
screens are unchanged for a request under twenty words, which is every measured one.

# What they work with, as pills (O261, 2026-09-30)

The founder (2026-09-29): "think about what people need in life; how can this be key pill tags?"
The profile now shows up to three pills of what the clinician declares they work with, in the
chips' own words ("Getting organised", "At work", "Parenting", "Sleep" …), the ones this person
asked for first, in place of the "Best for" line that showed five profiles' legacy expertise tags
(those tags now sit inside the care areas). The pills are the same closed vocabulary the heard
chips, the why keys and the clarifier use, so a word on the profile is a word the ranking read.
An NDIS switch joins the filters screen ("Clinicians who say they see NDIS participants."). The
pills cost six words, and the heaviest profile (the why sentence in the clinician's words, with
two asks not in the listing) went from 60 to 66, so two things that said nothing went: the
"Accepting new patients" chip (every listed clinician accepts new patients, so the chip carried no
information; closed books still say so on the row) and the compare button's visible name (it reads
"Compare"; the accessible name and the compare screen still say with whom). Word counts
(node scripts/text-budget.mjs, final build): the finder profile 47, with "Why matched" open 36, in
the clinician's words 50, with two asks not in the listing 45 and 59; the filters screen holds the
NDIS switch within its ceiling; 127 of 127 app screens within their ceiling, median 32.
CI (2026-09-30) then caught what the local runs had not: inside the identity column the three
pills wrapped onto three lines at 390px, which pushed the bio below the half-viewport line
(profile-layout.spec.ts) and the last section under the fixed booking bar, where axe read its
summary as a target with three visible pixels. The pills now sit under the intro at full width, one
line of three. And the map's problem fit (`src/support/problem-fit.ts`) reads the life-domain
areas beside the legacy expertise tags, so "help me start work tasks" from a person whose map says
starting is hardest now finds the coaches, who declare focus and getting things done, not only the
seven profiles with expertise tags.

# The voice finder asks its own questions, and speaks at once (O263, 2026-09-30)

The founder (2026-09-30): "there is load time for when you open the AI orb … there should be more
standardized questions, like asking someone from your culture … Should also have asked for more
detail about what the struggle at work is." The screen is unchanged to the eye: the orb and one stop
button, no words on it (text budget 0, 127 of 127 app screens within their ceiling, median 32). What
changed is what it says and when. The heading a screen reader lands on is now one of the app's own
sentences, as written (`src/voice/plan.ts`): after "I need help at work" it reads "What's hardest at
work?" (qa/voice/o263-voice-hardest-at-work-390.png), where the model used to choose its own words
and asked where the person lived. Each sentence is a recording in the call's voice, played the
moment the microphone opens: the first sound came 0.26 to 0.40 s after the tap in nine local calls,
where production that morning took 3.5, 7.4 and 12.8 s. The orb goes live with that first sound and
swells with the recording as it does with the model's voice. The matches the call reveals for
"I need help at work. deadlines, and my boss. Hornsby, or telehealth" are the coaches who declare
work and getting organised (qa/voice/o263-voice-matches-390.png): Alex Lawson, Donna Italiano, Kate
Dallimore. Nothing about medication is heard, because nothing about medication was said (R18).
Reduced motion: the orb holds still and the call still runs (e2e/voice-mode.spec.ts).

# A yes that names no culture is asked which; a garble is asked again (O264, 2026-09-30)

The founder's 10:53 call: "me saying yes I want someone from my culture but the ai didn't prompt to
ask what the culture was, this is a very clear failure and omission." Two failures under it, on the
record: the transcriber wrote his yes as "ja ta pi grejda", and the rules that read answers took it
for an answer; and his "Yes, I want someone from my culture" would have been read as a yes with words
after it, which the rule for asking "which" did not cover. Each answer is now heard three ways
(docs/matching/VOICE-FINDER.md): the transcriber's words and its confidence, the model's eight-field
form heard from the audio, and a one-word check for danger. Nothing on the screen changed (text
budget: the voice screen 0 words; 127 of 127 within their ceiling, median 32); what the screen reader
hears did: after "Yes, I want someone from my culture" the heading is "Which culture or language?"
(e2e/voice-mode.spec.ts), and after a garble it is "Sorry, I didn't catch that." then the question
again. His call replayed with real audio through a local production build: opening, "What's hardest
at work?", where (Sydney), lived experience (no), culture (yes), "Which culture or language?"
(Indian), anything else; heard as Getting organised, At work, Cultural background; Alex Lawson, Kate
Dallimore, Donna Italiano, Dr Anu Saxena, Fiona Alexander.


# From your words, in their words (R19, 2026-09-30)

The founder (2026-09-30): "this should be very simple, not overengineered … explicitly name what the
failures are." The reader behind the finder is now one model call that must quote the person for
every tag it reads, and a tag it cannot quote is not read (docs/matching/SIMPLE.md). No screen
changes shape; two change what they say. The results for "I need help at work with focus and
getting things done, telehealth is fine" (qa/matching/r19-finder-results-390.png, 34 words) list
Alex Lawson, Donna Italiano, Kate Dallimore: the coaches who declare work and getting organised,
and nothing about medication, because nothing about medication was said. Alex Lawson's profile
(qa/matching/r19-finder-profile-from-your-words-390.png, 47 words) says under Why matched: Work and
career, "From your words: 'help at work'"; Focus and getting things done, "From your words: 'with
focus and getting things done'"; By phone or telehealth, "From your words: 'telehealth is fine'".
The quote is what the model read the tag from, so it is the person's own words every time, where
before it was the lexicon's phrase when the lexicon happened to hear the same key and nothing when
it did not (R15). Short requests are read by the model too; the rule that skipped them is gone. Text
budget: 127 of 127 app screens within their ceiling, median 32, no screen over.

# The list first, the read after (R21, 2026-09-30)

The founder (2026-09-30): "Show me the results, then re-sort when the read lands." The model's read
takes four to five seconds (docs/matching/SIMPLE.md §6), and the results used to hold three blank
rows for it. Now the list is on screen at once, in the finder's own order, with "Reading what you
asked" where the chips go (qa/matching/r21-finder-results-reading-390.png); when the read lands the
chips fade into that line's place and the rows glide into the model's order, the O52 re-sort, no
row moving under reduced motion (qa/matching/r21-finder-results-read-390.png). For "I need help at
work with focus and getting things done, telehealth is fine" the first three names do not change
(Alex Lawson, Donna Italiano, Kate Dallimore); the fourth and fifth do. The screen reader's live
line says "Reading what you asked", then the count with "Re-ranked". The search's record still
waits for the read, so `shown` is the settled list. Text budget: finder results 34 words (target
40), 127 of 127 app screens within their ceiling, median 32.
