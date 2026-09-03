# Design QA checklist — practice console (W11)

Applies to every console surface (`/console/*`) and the patient booking page (`/book/*`).
Re-run this checklist whenever a console surface is added or restyled; it stands in for the
impeccable/taste-skill pass when those skills aren't installed in the building session
(note which in the ledger row).

## Checklist (W11 pass: 2026-08-08, builder-B — all items checked manually)

### Consistency
- [x] One type scale: page titles `text-2xl font-semibold tracking-tight`, section heads `font-medium`, body `text-sm`.
- [x] One palette: stone neutrals only; amber reserved for validation notes; no ad-hoc colors.
- [x] Shared primitives used (`app/console/ui.tsx`) — no page-local button/input styling.
- [x] Same header on every console page; sign-out always visible when signed in.

### Forms
- [x] Every input has a visible `<label>` (associated — Playwright drives pages via `getByLabel`).
- [x] Numeric constraints mirrored client-side (`min`/`max`/`required`) and enforced server-side (store validation).
- [x] Validation failure shows a visible, non-blaming note and loses no other page state.
- [x] Primary action is a single, obvious button; no competing calls to action.

### Copy (compliance posture — mirrors the W6 linter)
- [x] No clinical claims, urgency, or "overdue" framing on any surface.
- [x] No testimonials, ratings, or "specialist" anywhere.
- [x] Settings explained in plain English (e.g. holdout: "never invited, so incremental impact stays measurable").

### Accessibility (screening level — full WCAG pass is W49)
- [x] Focus states visible on all interactive elements (`focus:ring`).
- [x] Text contrast ≥ 4.5:1 (stone-900/-700/-500 on white/stone-50; checked against WCAG AA table).
- [x] All pages usable keyboard-only (forms are native HTML; no custom widgets).

### States
- [x] Signed-out access to any console page redirects to sign-in (e2e-verified).
- [x] Console with no practice routes to onboarding, not an empty dashboard (e2e-verified).
- [x] Booking page renders a designed state for every invitation status (offer/booked/expired/opted-out/invalid).

## Landing page (W23) — public B2B marketing site (`/`)

Pass 2026-08-09, builder-B — all items checked manually (taste-skill unavailable in loop env).

### Positioning & audience
- [x] Audience is general-practice owners/managers — B2B throughout; no patient-directed copy.
- [x] Positioning per venture brief §Phase 1: measured filling of unused appointment capacity.
- [x] Measurement (holdout, incremental-per-1,000) is a first-class section, not a footnote.

### Copy compliance (regulated-advertising exposure = zero)
- [x] No clinical/therapeutic claims, no condition targeting — enforced by `lintLandingCopy` (src/compliance/landing.ts), gated in CI via the copy bundle test.
- [x] No testimonials or ratings anywhere (CLAUDE.md law 6) — linter-enforced.
- [x] No superlatives, guarantees, urgency, or "specialist" — linter-enforced.
- [x] Footer states the B2B scope explicitly ("Not patient medical advice").

### Design & accessibility
- [x] One type scale and stone palette shared with the console; single primary CTA per section.
- [x] Semantic landmarks (`header`/`nav`/`main`/`footer`), ordered list for the steps, in-page anchors.
- [x] Focus-visible on all links/buttons; text contrast ≥ 4.5:1; responsive (single-column on mobile).
- [x] Public — renders with no auth; CTAs route to /demo and /console/signin (e2e-verified).

## Results page (W42) — practice-facing incrementality, `/console/results`

Pass 2026-08-09, builder-B. v1 (`/console/dashboard`) is unchanged and remains the
detailed measurement view; this page restates the same arithmetic for a practice
manager. Consolidating the two views is a follow-up (W49/W51), not this unit.

### Comprehension checklist — the W42 verification artifact

A practice manager should answer each of these correctly after ~60 seconds on the page.
Each is asserted in `e2e/results.spec.ts`, so the checklist cannot rot.

| # | Question they must be able to answer | Element that answers it |
|---|---|---|
| 1 | How many extra appointments did we get? | "Extra appointments" tile — a whole number, with "about N a week" underneath |
| 2 | Is anything going wrong? | Status line above the tiles, plain sentence + dot, before any number |
| 3 | Why is that smaller than the bookings ADHD.ME generated? | "Why the smaller number is the real one" card: prose, split bar, and the explicit "counting all N would let us claim $X" sentence |
| 4 | What is it worth? | "Extra billings, estimated" tile, with its per-visit assumption stated on the tile |
| 5 | How many patients asked us to stop? | "Patients who asked us to stop" tile, as a count and a percentage of messages |
| 6 | Which weeks were good or bad? | Two-group chart + the week-by-week table (same data, either route) |
| 7 | How is this measured, if I want to check? | "How this is measured" details block, closed by default |

### Copy compliance (linter-enforced)
- [x] Copy lives in `src/compliance/`-adjacent data (`src/console/results-copy.ts`) and is linted by `lintCopyBundle` — the same gate the public landing copy passes (no clinical claims, no testimonials/ratings, no superlatives, guarantees or urgency).
- [x] Measurement jargon is banned by test: no "incrementality", "holdout", "per 1,000", "attribution", "arm" — asserted in unit tests AND against the rendered page in e2e.
- [x] The raw generated-booking count never gets a headline tile (ATTRIBUTION v1 says it is never headlined); it appears only inside the card that explains why it is not the impact figure.
- [x] Continuity is described as a rule that held, never as a result — it is 100% by construction under usual-GP-only eligibility, so presenting it as an outcome would be a fabricated win.
- [x] Demonstration data is labelled as such, in neutral stone (nothing is wrong), not an alarm colour.

### Dataviz method (skill-conformant)
- [x] The headline is a **hero number, not a chart** — the anti-pattern catalog's most common miss is spending a chart on a one-number story.
- [x] Two-series categorical palette `#2a78d6` / `#eb6834` validated with `scripts/validate_palette.js`: light — CVD ΔE 24.7, normal 33.6, contrast ≥3:1; dark (`#3987e5` / `#d95926`) — CVD ΔE 26.8, normal 31.8. All six checks PASS in both modes.
- [x] Colour follows the entity: the two slots are fixed in the shared component, never repicked per page.
- [x] Single axis; no dual-axis chart anywhere.
- [x] Legend present for both series, plus direct end labels; identity is never colour-alone.
- [x] Hover layer (crosshair + tooltip) inherited from the shared chart; tooltip states both groups and their difference in the page's own unit.
- [x] Table view is the accessible equivalent of the chart, with a `<caption>` and scoped column headers.

### Design & accessibility
- [x] Shared `ConsoleShell`, type scale and stone palette — consistent with every other console surface.
- [x] Semantic structure: `h1` → `h2` sections, `figure`/`figcaption`, `table`/`caption`/`th[scope]`, `dl` for the method summary, `details`/`summary` for progressive disclosure.
- [x] Numbers use `tabular-nums` so columns align.
- [x] Null-safe: a practice with no comparison group renders an em dash, never a zero or the raw count dressed up as impact (unit-tested).
- [x] Signed-out access redirects to sign-in (e2e-verified).

## O24 — GP join landing (patient-mix hero) + whole-surface declutter audit (2026-08-18)

### The hero (/clinicians/join)
- [x] One idea at display scale: "I want ⟨N⟩% of my patients to be ⟨rotating condition⟩" — every
  control lives inside the sentence; nothing else competes above the fold.
- [x] The payoff line restates the mix as an illustrative daily figure ("about 3 matched
  patients a day") with the honesty line in the same breath — no invented booking forecast on a
  professional surface.
- [x] Rotation pauses under `prefers-reduced-motion`; the rotating sentence is `aria-hidden`
  with an sr-only slider as the accessible control; `role="status"` restates the figure.
- [x] Steppers 44px (O14 touch floor); accent reserved for the two live tokens; serif and
  tracking inherited from the page's own h1 scale; `to be` non-breaking so the sentence never
  strands a word.
- [x] Behaviour pinned in e2e/join-hero.spec.ts; captures in qa/join-o24/.

### Declutter audit of the prose surfaces (qa/ui-o24/, 390px full-page)
- `/` and `/practices`: long by design — the argument-at-length pages; hierarchy (numbered
  sections, stat panels, dark interludes) is consistent and scannable. No surgery.
- `/clinicians`: already the minimal pathway-builder ("what kind of GP do you want to
  become?", % slider). Now feeds the join hero coherently: explore the mix there, set it here.
- `/faq`, `/examples`, `/privacy`: linted single-column prose from the launch pass; unchanged.
- Verdict: the clutter debt was concentrated on the join page's cold open, which O24 replaced.
  Note: the mapped taste-skill is not installed in this session; this audit applies the
  standing rules from O11/O14 (one idea per screen, fold discipline, 44px targets, related
  facts share a row) in its place.

## O29 — Web-guidelines audit + micro-polish (2026-08-18)

Audited the patient surfaces against Vercel's Web Interface Guidelines (fresh fetch, full
ruleset) — the tree was already clean on transition scoping, focus-visible coverage,
text-wrap, ellipses and tabular numerals. Violations found and fixed:

- [x] `touch-action: manipulation` on all controls — kills the 300ms double-tap delay
  without touching pinch zoom (matters for readers who zoom).
- [x] `.cv2-focus-card` keyboard focus was a tint swap with `outline: none`; it now carries
  a real 2px accent ring at offset.
- [x] Consent dialog gets `overscroll-behavior: contain` so reading the policy cannot
  scroll the page behind it.
- [x] Mix-hero rotation gains its stop conditions: pauses under the pointer, stops for good
  the moment the reader engages the percent (autoplay >5s rule; reduced-motion already
  disabled it).
- [x] Attribution polish: /go segments by source surface (`?src=`, allow-listed, never
  echoed) and the booking screen carries the one-line "how you heard" nudge (layer 3 of
  docs/BOOKING-ATTRIBUTION.md), styled quiet.
- [x] `adhdme-taste` project skill authored — the tree's design law as a loadable skill,
  closing plan §2's missing taste-skill; bound in CLAUDE.md law 5.
## O26 — the hero's mix reaches the form (2026-08-18)

- The debt: O24's CTA said "Set my mix" and the form had no mix field — the sentence's whole
  promise was discarded at the fold.
- [x] One owner for the number (join-experience.tsx); the hero edits it, the form restates it
  in a single quiet line inside "What you see often" (`.join-mix-echo`, join-hint styling —
  no new visual weight, the `<strong>` percent is the only emphasis).
- [x] Honesty carried through: the echo says "your stated preference … not a booking
  promise, and it is never published" — the hero's honesty line at the point of capture.
- [x] Nothing renders and nothing submits until the GP actually uses the control: an
  untouched 30% default is not a declaration, so the field is absent, not zero, not 30.
- [x] No new motion; no touch-target change; behaviour pinned in e2e/join-hero.spec.ts
  ("the mix set above reaches the application below").

## O30 — the onboarding interview screen, `/console/interview` (2026-08-18)

Captures: qa/interview-o30/ (desktop full-page + 390×844). Taste-skill pass applied.

- [x] One idea per section, in the interview's own order: who is in the room → the
  conversation → heard so far → for after → record it. No form on screen while the doctor
  talks — the transcript IS the input.
- [x] Related facts share the card: the facet chip, the doctor's own sentence, and the
  structured interview's scripted question sit together; the answer buttons are inside the
  same card. Nothing to cross-reference.
- [x] The cross-check ("patients ask for this in their own words") is quiet accent caps —
  it informs which question to ask first and must not read as the machine grading the doctor.
- [x] Motion carries meaning only: a proposal ARRIVING fades/rises 8px via motion/react;
  `useReducedMotion` renders it static; nothing loops.
- [x] 44px floor on answer pills, inputs and the details summary; `touch-action:
  manipulation`; hover gated behind `(hover: hover)`; visible focus rings throughout.
- [x] Honesty gates: empty state says what will happen ("Proposals appear here as the doctor
  talks"), not that something is wrong; the save note states the G6 posture verbatim; the
  gap feed is disclosure-hidden ("For after the interview") so live work stays uncluttered.
- [x] Behaviour pinned in e2e/interview.spec.ts: signed-out redirect, interviewer-line
  exclusion, scripted question rendering, record/un-record, disabled save until named,
  draft-save message.

## O36 — the gap sweep on the interview screen (2026-08-18)

Captures: qa/interview-o36/ (desktop + 390×844, superseding the o30 set for this screen).

- [x] "Still to ask — N of M" is a live count that FALLS as the doctor talks — the screen's
  one argument (the conversation shrinks the checklist) rendered as a number, not stated as
  copy. A facet reached in conversation leaves the checklist because it moved up into the
  proposals: asked once, never twice.
- [x] Checklist rows are deliberately lighter than proposal cards — no card chrome, a rule
  between questions, the scripted question with its facet label in the same row (related
  facts share a row). The settled state is the same left-edge accent the proposals use, so
  "answered" reads identically everywhere on the screen.
- [x] Same three-state pills, same 44px floor, same un-record gesture; no new motion — a
  static list that shrinks needs none.
- [x] Honesty: an unanswered checklist question is recorded NOWHERE (absence, not a default);
  the note says so on the surface. Empty state ("Nothing left. The conversation reached every
  facet.") distinguishes finished from unstarted.

## O38 — the reach-gap feed on the matching console (2026-08-18)

Captures: qa/reach-o38/ (feed section, desktop + 390 widths).

- [x] The feed sits on the matching console where lexicon review already lives — no new
  route, no new nav. Real saved onboardings, explicitly distinguished from the worked
  example above them.
- [x] Two lists per entry, labelled by what they grow ("candidate lexicon cues" vs "unread
  by the proposer's vocabulary") — related facts share the entry; the reviewer never
  cross-references which reader missed what.
- [x] Entry heading carries provenance in one line: who, saved when, by whom.
- [x] Three states kept apart: no onboardings at all ("the feed starts with the first saved
  interview"), onboardings fully heard ("nothing is waiting for lexicon review"), and
  outstanding entries — W179's empty-state rule.
- [x] Static list, no motion, existing mc-* type scale and rhythm throughout.

## O46 — the unearned headline and the mic that stops on its own (2026-08-19)

Captures: qa/matching-o10/04-unmatched-says-so.png (re-rendered), e2e/voice.spec.ts pins.

- [x] The person's raw words render at display scale only when they earned a reading (a
  headline branch or an informed match). Unearned text is a quiet italic quote in the muted
  ink — still their words, no longer a proclamation. The founder's phone showed the failure:
  "Cx." in 40px serif above a banner admitting nothing was read.
- [x] The bare count ("3 of 3.") is dropped when everyone is shown anyway — the quality
  banner owns the whole explanation, one sentence instead of a number that says nothing.
  When rows genuinely are hidden, the line says "Showing N of M."
- [x] A browser-initiated recognition end no longer auto-searches: the words land in the
  editable box with one plain sentence ("The microphone stopped on its own…"), one tap from
  searching. Only a Done the person tapped searches directly. This restores the safety the
  collapsed review screen used to provide, without restoring the screen.
- [x] No new motion anywhere in the change; the quote inherits the existing type ramp and
  palette tokens.

## O48 — unmatched state, second pass (2026-08-19)

Captures: qa/matching-o10/04-unmatched-says-so.png (re-rendered).

- [x] The unmatched banner is one sentence; the clarifier owns the say-more invitation.
- [x] The eyebrow does not render above words the product could not read — the quote stands
  alone. Fewer stacked text blocks between the header and the clarifier: quote, change link,
  suburb field, one-line banner, one question.
- [x] The mic permission failure's "try once more" is a 44px control under the banner it
  answers, not a sentence pointing at a control two screens away.

## O51 — the profile names the asks this GP does not answer (2026-08-19)

Captures: qa/profile-o51/ (desktop + 390, missed line in frame). Taste-skill pass applied.

- [x] The two lists are one account: the missed asks sit directly under the matched evidence,
  same visual language, deliberately quieter (muted, no chips) — context, not the headline.
- [x] Honesty gates: declaration framing throughout ("not something they declare"), never a
  deficiency or competence claim beside a named clinician; "Another listing may" keeps the
  reader moving without disparaging anybody.
- [x] Capped at two lines so the page stays about the fit that exists; asks nobody on the
  roster declares remain covered by the finder's global note.
- [x] Rendered only when matched evidence exists — the no-match fallback already tells that
  story whole, and stacking misses onto it would pile on.
- [x] No new motion, no new touch targets; the partition property (evidence ∪ missed = asks,
  no overlap) is unit-pinned so the two lists can never contradict.

## O52 — the re-sort made visible (2026-08-19)

Captures: qa/motion-o52/ (the same three rows before and after a clarifier answer, order
changed). Taste-skill pass applied.

- [x] Motion carries meaning and nothing else: `layout="position"` on the result rows, so the
  ONE moment the product proves an answer mattered — the re-rank — is shown as rows gliding
  to their new places instead of a teleport that reads as a fresh list. A row pushed past the
  fold exits with a short fade rather than vanishing.
- [x] The static equal is automatic: the existing `MotionConfig reducedMotion="user"` disables
  layout tweens under prefers-reduced-motion, leaving an instant reorder — the same truth
  without the movement. Nothing loops; nothing moves unprompted.
- [x] Timing subordinate to reading: 340ms position ease, 160ms exit fade, no added delay —
  the glide finishes before a reader's eye settles on the new first row.
- [x] E2e pins what the tween animates BETWEEN: the same keyed rows, reordered, nobody minted
  and nobody lost; a chip that merely confirms the order is tolerated, per clarify.ts's own
  contract.

## O56 — capacity freshness on the matching console (2026-08-19)

Captures: qa/capacity-o56/ (the freshness panel, desktop and 390px). Taste-skill pass applied.

- [x] One idea per section: a declaration's age, said plainly. Grade and its evidence share a
  row (the tag carries "open, confirmed · declared 2026-08-14"); the nudge is the sentence
  beneath, so a reviewer joins fact to action without scanning two regions.
- [x] Console vocabulary reused whole (`mc-section`, `mc-clinician`, `mc-tag`, `mc-note`) — no
  new CSS, no accent spent: nothing on this panel is a live token, so nothing is coloured as
  one. Stale rows borrow `mc-missed`, the console's existing "needs attention" register.
- [x] Honesty gates: the panel never characterises the clinician — it dates OUR record of THEIR
  declaration. Dates come from this file's own git history, not a survey that never ran; the
  reconfirm nudge asks staff to ask the practice, never asserts what the practice will say.
- [x] Staff-only surface: patient-facing copy untouched (ordering only, and only within exact
  score ties). The closed-books sentence patients see is unchanged.
- [x] No motion, no new touch targets; grade boundaries (90/91 days, undated-open→stale) are
  unit-pinned with an injected clock so this panel can never disagree with the finder's sort.

## O57 — the applications register, present and closed (2026-08-19)

Captures: qa/applications-o57/ (the refusal state, desktop and 390px — the state this surface
actually ships in, because the staff list is empty by founder design). Taste-skill pass applied.

- [x] One idea per screen, both states: refused says whose register this is and that nobody
  has access yet, in W105's own sentence; granted (unit-pinned, unreachable until a founder
  grant) is one list where each row is one application said whole — name and email share a
  row, the Ahpra line sits under them as quiet small text because an unchecked shape must not
  read as a credential.
- [x] Honesty gates: every sentence is a report of a declaration ("says they", "asked for",
  "given by the applicant and not yet checked"); the mix renders only when the GP stated one,
  as stated preference with both failure modes denied by name (not a referral promise); no
  testimonials, no "specialist", no approve control anywhere — the page reads requests and
  cannot grant them.
- [x] Console vocabulary reused whole (ConsoleShell, the interest register's stone palette and
  list rhythm) — a second register should read as the first one's sibling, not a new idea.
- [x] The W153 attribution line renders once above the list, so an applicant's own words are
  framed as theirs before any of them appear.
- [x] No motion, no new touch targets; the granted view's sentences are pinned in
  src/onboarding/applications-view.test.ts so nothing here ships unverified while the gate
  stays shut.

## O58 — Dr Anusha Saxena's background, in her own supply (2026-08-19)

Captures: qa/matching-o34/ re-rendered (02-anusha-profile.png now carries the founder-supplied
background). Copy-only change on her profile; no layout, motion or control touched.

- [x] Honesty gates, word by word: every new sentence is her declaration reported ("has
  completed", "is currently training", "further qualifications underway"); in-progress study
  renders as underway, never as held; her approach paragraph is introduced with "In her own
  words"; "prescriber" never renders on a patient surface — the credential line stays
  "NSW ADHD training" and the experience row says "endorsed ADHD training course".
- [x] No manner invented: the approach prose did not become manner declarations — those stay
  behind mannerPending for her interview, and the about still says so.
- [x] Interest stays interest: functional/lifestyle medicine landed as `non-medication` at the
  "sometimes" grade, the same rule her other bio interests followed in PR #4.
- [x] Public-sweep e2e green over every patient surface after the change.

## O59 — the microphone in the roster's own languages (2026-08-19)

Captures: qa/voice-o59/ (the listening screen in Hindi mode, desktop and 390px — picker line,
own-script controls, honesty note). Taste-skill pass applied.

- [x] Controls live inside the statement: one quiet line in the disclosure block — "Listening
  in English." with the alternatives as the sentence's own controls, in their own script
  (हिन्दी, اردو), each with a `lang` attribute so screen readers pronounce them properly.
- [x] Honesty gates: the closed list's basis is stated and test-derived (English plus exactly
  what listed GPs declare — an invitation to speak Hindi is only honest where somebody
  consults in it); the honesty line ships WITH the picker and renders BEFORE anything is said
  — matching reads English for now, words are kept and shown but may not order the list. The
  note is quiet but louder than the disclosure, because it changes what the list will do.
- [x] No dead end: a request spoken in Hindi still lands in the editable box, still searches,
  still reaches the honest unordered fallback and the browsable profiles; the whole existing
  failure ladder (language-not-supported copy included) is unchanged.
- [x] Touch floor held: small type, full-height padded hit areas, touch-action manipulation;
  English default untouched, so the common path gained nothing but one quiet line.

## O60 — type in rem, so text follows the reader (2026-08-19)

Captures: qa/type-o60/ (the finder at the default root, and the same screens at a 20px root —
every size following the reader's setting, layout holding). Taste-skill pass applied.

- [x] The migration IS the taste rule: the reader's browser font-size preference is the one
  low-vision control that works without per-page zooming, and px type ignored it. All 344
  font sizes in globals.css are now exact rem equals (px ÷ 16, clamp() bounds included, the
  fluid vw middles untouched).
- [x] Zero visual drift bought honestly: before/after full-page captures of /, /finder,
  /clinicians/join and /approach at the default root are BYTE-IDENTICAL — the conversion is
  arithmetic, so any pixel that moved would have been a bug, and none did.
- [x] The root stays unset: 1rem is the reader's setting, and the new ratchet test refuses
  both a reintroduced px font size and any future `html { font-size }` re-anchoring.
- [x] px kept where px is right: borders, radii, shadows, fixed dimensions and breakpoints
  are not type and were deliberately not churned.
- [x] a11y e2e green across all public surfaces. Known and recorded, NOT from this unit: the
  /clinicians/join 390px fit test fails identically before and after this migration (an
  unstyled label+input pair overflowing) — ledgered for the next firing rather than widened
  into this one.

## O61 — the invisible overflow on the join page (2026-08-19)

No capture diff: zero visible pixels changed, by design. The evidence is the sweep itself —
e2e/mobile-fit.spec.ts "/clinicians/join fits a 390px phone" red before, green after, with
the sweep's strictness untouched.

- [x] The defect: the mix hero's screen-reader slider used a `.sr-only` WRAPPER; the wrapper
  clips to 1px but its inline children (label 485px, range input 614px) still lay out at
  natural width past a 390px viewport — invisible to the eye, honestly reported by the
  bounding-rect sweep, and one positioning change away from being a real overflow.
- [x] The fix is the standard pattern, not a loosened test: `sr-only` on each hidden element,
  so every box is its own 1px clip. The tripwire keeps its exact strictness for the next
  real overflow.
- [x] Accessibility unchanged and re-proven: the join-hero e2e still drives the slider
  through its accessible name, and the WCAG A/AA suite is green over the page.

## O62 — tie quality, the clarifier's KPI on the console (2026-08-19)

Captures: qa/tie-o62/ (the tie-quality block, desktop and 390px). Taste-skill pass applied.

- [x] One idea, four numbers: how often the words separated the top of the list, said as the
  console's existing tag vocabulary (label + weight share a row). The prose names what the
  unseparated count IS — the clarifier's work queue — so the number carries its action.
- [x] Honesty gates: the panel renders the same function the verify gate pins (W234), so the
  page cannot show a KPI CI does not hold; the note says the sentences are synthetic and the
  pipeline real; nothing here scores, filters or reorders anybody.
- [x] The baseline is measured, not aspired: 97/12/42 over 151 heard requests (64% separated),
  pinned in both directions so neither a regression nor a silent improvement can pass unread.
- [x] No new CSS, no motion, no new touch targets; e2e reads the rendered counts and asserts
  they partition the stated total, which is the same invariant the gate holds.

## O63 — one shell, every stage (2026-08-19)

Captures: qa/desktop-o63/ (welcome, results and profile at 1280px — the stages that were a
520px phone strip on desktop, now the same 640px seamless column the intro stages already
had). Taste-skill pass applied.

- [x] The shell width is ONE token (`--shell-w`: 520px, 640px at ≥820px) consumed by every
  rule that keys off it — the shell rules, the ≥600px block, and the fixed booking bar's
  centring offsets, which previously hard-coded 520px and already disagreed with the widened
  intro stages. A frame that cannot be told two widths cannot jump between them.
- [x] Motion carries meaning or goes: the 280ms width tween existed to paper over the
  stage-keyed width snap; with no width change left between stages, it is deleted rather
  than kept as decoration.
- [x] One theme end to end: the 2026-08-11 overhaul's seamless borderless paper, previously
  only on welcome/scenarios/type, now holds through listening, results, profile and booking
  — no hairline side borders popping in mid-flow.
- [x] Phone and 600–819px viewports change by nothing (mobile-fit 28/28 green, all seven
  surfaces); the fold discipline holds at 640px — the results screen shows the claim, the
  suburb control and the first rows above the fold, nothing cut mid-band.

## O66 — what would change this order, on the profile (2026-08-19)

Captures: qa/profile-o66/ (the profile's fit block with the question in context, desktop
element shot and 390px). Taste-skill pass applied.

- [x] One idea, one question: the TOP clarifier only, never a chip row — the profile is
  about this clinician, not a quiz. The label and its control share a sentence ("What would
  change this order: <question>"), in the missed-asks register: quieter than the evidence,
  present beside it.
- [x] Motion carries the meaning where it lives: tapping appends the answer in the reader's
  own words (exactly what the results chips do), re-reads the whole sentence, and RETURNS to
  results — so the O52 layout animation shows the order actually changing instead of the
  profile asserting that it did.
- [x] Honesty gates: clarifiers() only ever offers a facet the roster genuinely disagrees on
  and the reader has not asked — a question that could not reorder is never rendered; after
  answering, the same question cannot recur (the facet is now asked), pinned in e2e.
- [x] Touch floor held (44px padded hit area on quiet type); no new colour spent; fold
  discipline unchanged — the line rides inside the existing fit block.

## O67 — the chosen GP is one object, row to profile (2026-08-19)

Captures: qa/motion-o67/ (portrait-mid-flight.png — the shared element genuinely mid-morph,
thumb rounding still interpolating; portrait-settled.png — landed in the hero frame).
Taste-skill pass applied.

- [x] Motion carries the one continuity that matters: the person you tapped IS the person
  you are reading. The row's portrait slot and the profile's frame share a per-clinician
  layoutId, so the image travels as one object instead of a new one fading in.
- [x] One story per object: the portrait's old opacity/scale enter tween is REMOVED — a
  layout morph plus an enter pop on the same element is two stories about one thing.
  Everything below the portrait keeps the screen's own enter.
- [x] The static equal is automatic: MotionConfig reducedMotion="user" disables layout
  animations, leaving today's instant swap — the same truth without the movement.
- [x] The wiring is pinned, not hoped: both elements carry data-portrait-of, and the e2e
  asserts the profile frame declares the same id the tapped row declared — if either side
  loses its pairing, CI fails before anybody notices the motion is quietly gone.
- [x] No layout shift bought: the row anchor is exactly the 72px slot the portrait already
  occupied (mobile-fit 7/7 surfaces green), no new colour, no touch-target change.

## O71 — Dr Anusha Saxena, launch-ready from the published record (2026-08-19)

Captures: qa/matching-o34/02-anusha-profile.png re-rendered (the profile as it will launch).
Copy-only change on her surfaces.

- [x] Every added attribute has a citable published source (practice doctors page +
  her Healthengine profiles, listed with URLs in the entry comment): ANU medical degree,
  FRACGP, NSW hospital training with cardiology/paediatrics/psychiatry rotations, the
  Sydney Child Health Program, and her published special-interest list.
- [x] Testimonial law held under temptation: the research surfaced praise ("helpful and
  listens") and it landed NOWHERE — review content is banned however warm.
- [x] No facet inflation: published interests inform copy and keywords only; her care
  grades stay exactly where the interview left them, manner stays behind mannerPending,
  languages stay English-only until she names them — the about still says so.
- [x] Patient-copy sweep green over every public surface with the new credential lines;
  "weight management" deliberately kept OUT of rendered copy (keywords only).

## O74 — booking handoffs, counted where they can be read (2026-08-19)

Captures: qa/attribution-o74/ (the Booking handoffs section, desktop). Console vocabulary
reused whole; no new CSS.

- [x] One idea: outbound intent per clinician, said as the console's tag rows (label +
  weight share a row); the prose names the honest end of the count — Healthengine has no
  conversion endpoint, so the handoff IS the measurement.
- [x] Honesty gates: the serverless-ephemerality limit is said ON the panel, not discovered;
  a clinician with zero handoffs renders as a zero row, because an empty count is a fact;
  nothing about any person is stored or shown (clinician, surface, day — W235's whole row).
- [x] e2e proves the loop end to end: a real /go request lands a row the console then reads.

## O85 — Hornsby joins Dr Anusha's listing, distance honest about which rooms (2026-08-20)

Captures: qa/location-o85/ (row from a Hornsby origin; profile desktop + 390×844). No new
CSS — the existing row and meta lines carry the pair.

- [x] Related facts share a row: "Double Bay & Hornsby, in your suburb (their Hornsby
  rooms)" — every place she consults and the distance to the nearest, one line, one scan.
- [x] Honesty gates: the distance sentence NAMES the rooms it measured whenever they are
  not the primary suburb, so a kilometre figure to Hornsby never renders as though Double
  Bay were that close; from Double Bay the sentence stays plain because the label already
  says it. Nothing about the Hornsby rooms is invented — no practice name, no hours; the
  map link still targets the NAMED practice (Bay Health Clinic, Double Bay) rather than a
  guessed Hornsby address, and the booking route stays her Healthengine profile.
- [x] Founder-supplied fact, source cited in the entry comment (2026-08-20); the roster
  test now sweeps every declared location through the gazetteer and focus areas, so a
  second location can never be an unresolvable string.

## O86 — Beecroft & Double Bay on Dr Anubhav's listing (2026-08-20)

Captures: qa/location-o86/ (his row with the pair and the telehealth line). No new CSS —
the O85 label carries it.

- [x] Related facts share a row: "Beecroft & Double Bay, by telehealth, wherever you are"
  — every place he consults plus how an appointment actually reaches him, one line.
- [x] Honesty gates: telehealth-first means the second location changes the LABEL only —
  no kilometre figure appears, no rooms parenthetical, and the near-sort keeps his fit
  position (a distance to somebody nobody travels to answers no question, the standing
  law). Nothing about the Double Bay rooms is invented; booking stays his Healthengine
  profile and the map link his named practice.
- [x] Founder-supplied fact, source cited in the entry comment (2026-08-20); the roster
  sweep resolves the pair through the gazetteer and focus areas like every location.

## O89 — Dr Anusha's co-founder disclosure (2026-08-20)

Captures: qa/founder-o89/ (her profile with the disclosure line). No new CSS — the
existing .disclosure-line carries it, same position as her co-founder's.

- [x] Honesty gates: a material interest is stated exactly where the listing is read, one
  line, not an essay; the wording is the register's own ("appears in a directory her own
  company operates, and a reader cannot see the ranking that put her there").
- [x] The disclosure keeps its price: at an exact tie she now sorts BEHIND an undisclosed
  clinician — the founder-behind rule is not waived for a second founder, and the
  not-floated pin tightened to cover every disclosed founder on a generic request.
- [x] Founder-directed fact, source cited in the entry comment; nobody else's status
  changed, because nothing else was directed.

## O90 — the founders chapter becomes About us, four plates (2026-08-20)

Captures: qa/about-o90/ (the anchored section, desktop 2×2 and 390×844 stacked).

- [x] One idea per section: the sentence heading stays the idea ("We do not build this
  alone."); "About us" rides above it as a muted uppercase kicker — wayfinding, not a
  competing statement. The section anchors at /#about and the footer's doors link it.
- [x] Dr Anusha's plate: role and affiliations from her published record (FRACGP, Bay
  Health Clinic, ANU); portrait is the founder-supplied O82 photo centre-cropped to the
  row's 3:4 — crop-only, per the real-person law, which is why hers renders as a full
  photo card while the earlier plates use owner-supplied cutouts. Recorded as an accepted
  variance, not a gap: nothing in this tree edits a real person's image beyond a crop.
- [x] Grid moved 3-across → 2×2 at ≥900px: four abreast squeezed each portrait under the
  260px the row was designed around, and an orphan fourth row read as an afterthought —
  exactly wrong for the person the directive adds.
- [x] Honesty gates: no clinical claims in any remit line; the finder-profile disclosure
  line did NOT move here — its reason ("a reader cannot see the ranking") is listing-side
  law, so About us is where the story lives, not where the disclosure goes.

## O93 — the booking bar learns where the profile ends (2026-08-20, founder-directed)

Captures: qa/design-o93/ (the founder's reported overlap fixed at full scroll; the pinned
mid-scroll state; the 390 sweep of welcome, scenarios, results and booking).

- [x] The anchor bug: the profile's booking bar was position:fixed, so at the end of the
  page it floated over the acknowledgement-of-country band — a bar covering content it
  does not own. It is now position:sticky as the last child of the profile screen: pinned
  to the viewport while the profile scrolls, settling in flow at the profile's own end,
  with the acknowledgement band below it, uncovered. Three enablers, each recorded at the
  rule: .care-shell overflow hidden → clip (same clipping, no scroll container), the
  vestigial overflow-y:auto split off .profile-screen, and the framed-demo media block's
  overflow scoped away from .patient-v2 (the framed shell scrolls internally; the patient
  shell scrolls the body).
- [x] The dead space: both 154px/160px bottom reservations for the fixed bar are gone —
  a sticky bar takes its own space, so Languages now flows into the bar instead of into a
  void (the founder's second circled find).
- [x] Sweep: results and booking at 390 read clean; no other small fixes found; nothing
  larger surfaced to ledger. 27 e2e green across finder, mobile-fit, booking and a11y.

## O96 — globals.css sectioned, with a machine-checked proof (2026-08-20)

No visual change is claimed, and that is the entry: this is the refactor lane's second
queue item, and its whole deliverable is that the stylesheet became navigable while every
rendered pixel stayed put. The evidence is not a capture pair — 5,981 lines across every
surface is past what eyes can hold — it is `scripts/css-computed-dump.mjs`, which walks
every route and all seven finder stages at 390 and 1280, dumps ~110 computed properties
per element, and diffs before against after.

- [x] Proof, and the proof of the proof: the harness was validated by probe before it was
  trusted — one `letter-spacing: 0.021em` added to `.clinician-row small` moved 46 lines,
  so a silent pass means something. Final run: **byte-identical across all 4,232 rendered
  elements**, both viewports, every route, every finder stage.
- [x] The harness ignores `<head>` on purpose. Next.js varies its metadata tag order
  between builds, which produced a standing 20-line diff on a change that touched nothing
  visible; a proof tool that always shows noise is a proof tool nobody reads. `html` and
  `body` are dumped explicitly, since they carry the ground and the base type.
- [x] One rule block moved: the finder's results screen, stranded ~2,500 lines away inside
  the storybook-landing region since the landing pass. It moved into the patient-v2 region
  and NOT into the v1 finder block above it, because `.results-head .refine-compact` and
  `.patient-v2 .refine-compact` have equal specificity — moving it higher would have
  restyled "Change what you said" with nothing in the diff to show it.
- [x] Three blocks were examined and deliberately left where they are, each with the reason
  written at the rule: the O14 tap-target group (cross-surface, and `.show-all` is declared
  twice at equal specificity so file order decides its padding), the coverage diagram's
  finder overrides (they must stay below the base rules they override), and the duplicate
  `.match-quality`. Cascade-load-bearing order is a fact about the design, not untidiness.
- [x] Audit finding recorded, not fixed: `.match-quality` is declared twice at 0,1,0, so
  the finder's honesty banner renders at the /approach rule's 0.8125rem rather than the
  0.9375rem written beside it — the size O14 chose for a low-vision reader. Deciding which
  surface owns the class changes computed output, so it is a unit of its own. Noted at
  BOTH declarations so neither can be edited in ignorance of the other.
- [x] Comment repairs (provably invisible): a note describing a portrait rule that no
  longer exists was dropped, and two paragraphs about the founders' affiliations were moved
  from the coverage-map block down to the rules they actually describe.

## O99 — the honesty banner finally renders at the size O14 chose (2026-08-20)

Captures: qa/honesty-o99/ (the unranked results head at 390 and 1280, with the "not a
ranking" sentence at its intended size).

- [x] The finding, dated: a second unqualified `.match-quality` rule landed 2026-08-15 in
  the matcher-appraisal commit, ~4,900 lines below the finder's own. O14 raised the
  finder's rule to 0.9375rem AFTERWARDS, with the reason written beside it — the sentence
  was "12px faint grey: AA-compliant and functionally invisible to the low-vision reader
  the finder most needs to be honest with". The later rule won on equal specificity, so
  the raise never rendered: the banner has been 13px ever since. Measured, not assumed —
  before 13px/19.5px line-height, after 15px/22.5px.
- [x] Merged into one rule in the region where the only consumer lives (three elements in
  results-stage.tsx; nothing else in the tree uses the class). The misfiled rule's good
  parts — the 46ch measure and the line-height — came up with it, so the fix keeps the
  reading measure and gains the size.
- [x] Proof, and a hole found in the proof: the computed-style dump reported a ZERO-line
  diff at first. Not because nothing moved — because nothing on screen carried the class.
  The harness walked only the demo scenario, which ranks informed, and the entire honesty
  layer (match-quality, tie note, clarifier chips, unserved-ask line) renders only when the
  order is NOT earned. `scripts/css-computed-dump.mjs` now walks a second results state
  ("I think I might have ADHD", the year plan's own example of the commonest untypeable
  request) and asserts the banner is present before dumping. A proof that skips the
  conditional half of a screen is the kind of guard that looks like a guard.
- [x] With the hole closed, the diff is exactly what it should be: the `.match-quality`
  element and the ancestors whose height its taller text drives, on that one screen. No
  other route, no other surface, no other element.

## O102 — two clinicians, side by side (2026-08-20)

Captures: qa/compare-o102/ (the compare screen at 390 and 1280, from a four-ask query).

- [x] The lane's Q3. The results screen's founding note says a person choosing a GP is
  comparing — and every screen after it showed exactly one clinician. Rows are the asks the
  reader actually made; cells are read from `matchEvidence`, the same evidence the RANKING
  scored, so the table cannot tell a story the order disagrees with.
- [x] Grouped by what a row can tell the reader: **where they differ** first (the only rows
  that can decide anything), then **both**, then **neither** — the last carrying the
  listing-gap sentence the results screen already owns. A group with no rows never renders,
  so a heading never makes a promise the section does not keep.
- [x] Two layout fixes found by looking at the capture rather than the code. "Not declared"
  wrapped to two lines in 5.5rem columns, so the verdict columns are 6rem — measured against
  the actual string, not guessed — with `white-space: nowrap`. And the heads were a separate
  two-column strip while the rows were a three-column grid, which put one doctor's name over
  the ask column and left the reader joining a fact across two regions. The heads now sit in
  the SAME grid, so each name is directly above the column of verdicts it owns.
- [x] Honesty: no score, no total, no winner language — asserted by e2e, which fails the
  build if "better", "best", "winner", "score", "%" or "out of" ever appears in the table.
  W193's posture is stated ONCE beneath it ("what each GP declares about their own practice,
  not a check ADHD.ME performed. This is not a ranking of one against the other"), because
  "not something they declare" eight times is a drumbeat.
- [x] The entry control renders only when there is a second clinician AND the reader's words
  reached at least one ask; a query that reaches nothing offers no compare, pinned by e2e.
- [x] Taste: 44px hit areas on both controls (12px padding with a -12px margin, the O14
  pattern), palette tokens only — the first draft invented `--rule-faint` and `--paper-sunk`,
  which do not exist, and they are now `--line` and `--stone`. Neither column takes the
  accent: an accent here would read as a recommendation, and this screen makes none.
- [x] No motion of its own. The screen transition is the shared one; a portrait morph between
  profile and compare was considered and dropped rather than shipped half-working — motion
  carries meaning here or does not exist.

## O110 — the honesty line covers what it always claimed to (2026-08-20)

Captures: qa/unserved-o110/ (a bulk-billing ask at 390 and 1280, with the gap named).

- [x] `unservedAsks` filtered to `care` facets, so it was reading a quarter of what it claimed
  to cover. Measured against the real roster, the three facets nobody declares today are
  `pref:bulk-billing` (two GPs say mixed billing, one says billing is set by the practice) and
  the manner traits `steadying` and `motivating`. All three produced silence — including the
  cost ask, which is the one most likely to decide whether somebody books, and the one O109
  had just taught the lexicon to hear.
- [x] One sentence shape for every facet kind, in W193's declaration framing: "{label} is not
  something any GP listed today declares. That is a gap in our listing, not in what you asked
  for." Checked true against all three live gaps before it was written — the labels are noun
  phrases ("Bulk billing") and adjectival ones ("Calm and steadying", "Strengths-focused"),
  and the declaration form is the one shape all three read correctly in.
- [x] The sentence moved out of the JSX into the matching module. Copy that decides an honesty
  claim should be unit-testable, not only walkable in a browser; the screen now prints what
  the reader is owed rather than deciding it. Pinned both ways, including that it never
  appears beside a facet the ranking is simultaneously scoring, across all three facet kinds.
- [x] Languages are correct already and untouched: `languageNeeds` only creates a need for a
  language the roster speaks, so an unspoken one cannot become a silent miss.

**Found, not fixed, and it is the next unit.** The capture shows the new line sitting directly
under "We could not tell what you are looking for, so this is everyone we list — not an order."
On this query that banner is FALSE: the finder read "bulk billing" perfectly and then said it
could not tell. `matchQuality` routes two different situations to `unmatched` — nothing was
read, and something was read that nobody answers — and the copy only describes the first.
The code comment beside it already knew ("words that were READ but that nobody answers are not
a tie … `unservedAsks` names whose gap it is"), but the sentence was never split. The falsehood
predates this unit; O110 only put a true sentence beside it, which is what made it visible.

## O111 — the banner stops saying it could not read what it read perfectly (2026-08-20)

Captures: qa/honesty-o111/ (the same query as qa/unserved-o110/, with the two lines agreeing).

- [x] The defect O110's capture found. `matchQuality` routed two different situations to
  `unmatched` — nothing was read, and something was read that nobody on the roster answers —
  and the copy described only the first. A reader typing "gap fees are why I stopped going, I
  need a GP who bulk bills" was told "We could not tell what you are looking for", directly
  above a line naming bulk billing. Two sentences, one screen, contradicting each other, and
  the false one set louder.
- [x] Fixed at the value, not the sentence: a fourth `MatchQuality`, `unserved`, returned when
  needs were read and every score is zero. The genuine no-read case keeps the copy that was
  always true of it. `unserved` sits on the same side of every `!== "informed"` branch as the
  value it split from, so no other honesty rule changes — pinned.
- [x] The same falsehood existed one page over and is fixed with it: /examples described every
  non-informed verdict as "the words reached nothing", which is false for an unserved read and
  blames the reader for the roster's gap in the one place the product explains its own honesty.
- [x] Before: "We could not tell what you are looking for…" above "Bulk billing is not
  something any GP listed today declares." After: "We understood what you asked for. Nobody
  listed today answers it…" above the same line. The banner now hands off to the gap line
  instead of contradicting it.
- [x] Pinned so it cannot regress: the two banners must differ, and the unserved sentence must
  never contain "could not tell".

## O115 — the evidence list finally has the layout it was written with (2026-08-20)

Captures: qa/evidence-o115/ (before and after at 390, plus the scrolled state).

- [x] Found by running the lane's own review procedure over the profile — the surface today's
  work made denser. `.fit-evidence` is authored `display: flex; flex-direction: column`: one
  row per reason, each label beside the phrase from the reader's own words that reached it. It
  had never rendered that way. `.profile-content ul`, written for the two-up "Focus and
  experience" list, is 0,1,1 against its 0,1,0 — so every list on the profile was a two-column
  grid, including O51's missed-asks list, which also declares a single column and also lost.
- [x] The cost was not cosmetic. In two 164px columns the items had unequal heights, so a
  reason's label and its quote sat at different vertical offsets from the pair beside them and
  the reader could not tell which quote belonged to which chip — the layout law's own sentence
  ("if the reader must scan two regions to join one fact, the layout is wrong") failing on the
  one element whose entire purpose is joining a claim to its evidence (O21's provenance). The
  third reason's quote was also being cut by the sticky booking bar.
- [x] Fixed by scoping the generic rule to the list it was written for: the experience list is
  the only `ul` inside a `<section>` on this screen, which makes the scoping exact rather than
  a guess. Nothing else moves.
- [x] Proof: the computed-style dump diffed before/after is confined to the evidence list, its
  items and the ancestors whose height they drive — no other route, no other surface.
- [x] Second collision of this exact kind found today (O99 was the first, on `.match-quality`).
  Both were an unqualified or under-scoped selector in a 6,000-line stylesheet quietly beating
  a specific one. O96's sectioning pass is what made both findable by reading.

## O117 — a doctor can read what patients are told about them (2026-08-20)

Captures: qa/told-o117/ (the panel at 1280 and 390, as a doctor reads it).

- [x] The explaining-the-fit lane's Q4, and its only clinician-facing increment. Everything else
  in the matching console is QUERY-driven — pick a sentence, watch the roster score against it —
  which answers the staff question ("is the ranking behaving") and not the doctor's ("what does
  this thing say about me").
- [x] Built from DECLARATIONS rather than from a query, which is what makes it complete: what
  the finder can say about a GP is fixed by what they declared, so the panel enumerates all of
  it instead of sampling whichever query is typed. Three groups: the labels their declarations
  can put in front of a patient, the sentences those labels sit inside, and what a patient is
  told when they ask for something not declared.
- [x] Every line is composed by the functions the finder calls — the reason line from
  `getPersonalizedMatch`, the closed-books line from `closedBooksNote`, the distance line from
  `distanceTo`. A unit test asserts the panel and the finder cannot disagree, because a "what
  patients see" view that authored its own copy would become a reassuring fiction the first time
  a sentence changed.
- [x] Why it matters beyond transparency: W190 gives a clinician a path to correct a profile
  that is wrong about them, and that path is only real if the thing to be corrected is legible.
  A doctor cannot object to a sentence they have never been shown. Every row names the field
  that produced it, so a correction request can point at something.
- [x] Layout: two columns on desktop (said | source), one on a phone — a sentence and its source
  are one fact and side-by-side at 390px they stop reading as a pair.

**Found while building, fixed here:** `/console/matching` had NO guard. Its own first line says
"STAFF-ONLY AND SYNTHETIC, LIKE EVERY OTHER CONSOLE ROUTE" and it was the only console route
besides sign-in that never called `requireSession` — it answered 200 to anybody. Nothing on it
was patient data, but the handoff tallies and reach report are the practice's business, and a
page that enumerates what patients are told about three named real doctors should not be the one
route that skipped the door. Now 307s to sign-in, pinned by e2e.

**Found, not fixed — the next unit.** The O51 missed-asks line lowercases its label, so it renders
"You also asked for adhd in children and adolescents". O21 already learned this lesson on the
reason line ("Hindi-speaking" became "hindi-speaking", a typo on the one word a reader is
scanning for) and stopped lowercasing there; the missed-asks line never got the same treatment.
Neither pure approach works — "You also asked for A longer first appointment" is as wrong as
"adhd" — so it needs a small helper with its own test, which is a unit rather than a line.

## O118 — a label lowered into a sentence, without breaking the words that must not be (2026-08-20)

Captures: qa/casing-o118/ (the profile's missed-asks line, and the console panel where the
acronym case is live).

- [x] O117's panel made it visible: "You also asked for **adhd in children and adolescents**".
  O21 learned this exact lesson on the REASON line — its comment calls a lower-cased proper noun
  "a typo on the one word in the sentence a reader is scanning for" — and stopped lower-casing
  there. The missed-asks line never got the same treatment, and O117's own not-declared frame
  reproduced the bug by copying the call rather than the sentence.
- [x] Surveyed the whole vocabulary rather than the one label that showed. SIX of twenty-seven
  break when lowered (ADHD ×2, PTSD, GP, Hindi, Urdu); the other twenty-one read WORSE unlowered,
  because "You also asked for A longer first appointment" is as wrong as "adhd". So neither pure
  approach works, and this is a helper rather than a deletion.
- [x] Three rules, each from a real label: only the first character is ever touched (which alone
  saves "Trauma and PTSD" and "A woman GP"); an acronym at the start is left alone; a language
  facet is left alone entirely, because its label is a proper noun by construction and the caller
  already knows the facet kind.
- [x] Pinned by example rather than by restating the rule — a test that re-implemented it would
  agree with the code by construction and catch nothing. Plus a sweep asserting no authored
  capital is ever lost across the whole vocabulary, so a facet added tomorrow called "NDIS
  planning" fails before a patient reads "ndis planning".
- [x] **Accurate about where it was live.** On the profile the damage was LATENT: no currently
  missable label leads with an acronym, because the patient-facing label for child ADHD is
  "Children and adolescents". It was live on the console panel, which uses the fuller care-area
  vocabulary — visible in O117's own capture. Recorded that way rather than as a patient-facing
  bug it was not.
- [x] The sentence moved into the matching module beside `unservedCopy`, and both surfaces now
  call it instead of composing their own. The console panel having reproduced the bug by copying
  the wording is the argument for that in one line.

## O121 — the finder walked end to end, after a day that changed most of it (2026-08-20)

Captures: qa/flow-o121/ — six stages at 390 and 1280, from ONE continuous journey on one query
rather than a query per screen. That distinction is the unit: today changed the flow in eight
places and each was captured alone against a query chosen to show it, which is exactly the
condition under which every screen is correct and the sequence is not.

### Found and fixed

- [x] **The finder claimed a full fit directly above a gap it had just admitted.** "These 3 GPs
  do what you asked for." rendered immediately over "Bulk billing is not something any GP listed
  today declares. That is a gap in our listing, not in what you asked for." Two adjacent
  sentences flatly contradicting each other, at both viewports, and the louder one false — the
  same shape O111 fixed on the banner one line up, arriving from a different direction. The
  completeness claim now stands down when `unserved` is non-empty, which is the inverse of the
  rule this block already followed ("when the order is not earned the quality banner owns the
  whole explanation"). The reader loses nothing: everyone is shown anyway, which is what made
  the bare count redundant in O46. Pinned in e2e both ways — the claim must not appear beside a
  gap, and must still appear when the fit really is complete. The non-vacuity half needed a
  query the roster SEPARATES on: "adult ADHD assessment" alone is a tie, which renders no claim
  either, and would have passed for the wrong reason.

### Found and deliberately not fixed

- [ ] **The sticky booking bar bisects whatever sits at the fold** — in this walk, the "Compare
  with Dr Yadav" control, sliced horizontally at the bar's top edge. Raised in O115 as a fold
  question and measured then: the bar occludes real content at every content length. It is what
  a bottom-sticky action bar does, the bar carries an opaque ground and a top hairline so the
  cut reads as "there is more below" rather than as breakage, and the content is one scroll
  away. Reserving space cannot fix it — padding only clears the END of the document, not the
  band the bar holds mid-scroll. The honest options are removing the sticky bar or accepting the
  convention, and that is a product decision about how hard to push booking, not a CSS fix.
  Recorded here rather than quietly tolerated.

### Walked and clean

- [x] Welcome, scenarios, results, profile, compare and booking at both viewports. Compare
  (O102) holds its column alignment with real data, including a name that wraps to two lines
  while the other does not. The profile's evidence list reads one reason per row (O115). The
  banner and gap line agree (O111). No raw hex, no missing focus states, no claim rendering
  unearned other than the one fixed above.

## O126 — the doctor sees the provenance the patient sees (2026-08-20)

Capture: qa/provenance-o126/asked-desktop.png (the console's worked match, with provenance).

- [x] Explaining-the-fit Q4, the lane's last increment that is not roster-blocked. The patient
  profile has shown "from your words: …" under every reason since O21. The console showed the
  label and the weight and dropped the phrase — so a doctor reading their own listing saw
  "Titration and dose review 28" with no way to learn it came from somebody typing "wearing
  off". `matchAudit` computed `matched` all along and discarded it on the way out.
- [x] Why it matters beyond symmetry: this section exists so a NAMED REAL PERSON can check what
  is said about them, and W190's correction path assumes a doctor who thinks a reason is wrong
  can contest it. Without provenance they can see that a reason exists and not what produced
  it, which is the half that makes a correction possible.
- [x] Unity pinned rather than trusted: three unit tests assert the console's phrase for a facet
  is character-identical to the patient profile's, that every asked facet has one, and that the
  console shows nothing the patient-side read did not produce. This is the O1/F2 repair applied
  to provenance — the same failure mode as the ranker and explainer drifting apart.
- [x] Register: the patient side says "from your words", the console says "reached by". Both
  are true and neither claims to quote — `matched` is the lexicon's cue (every token
  stem-matched, in order), not a verbatim extract. An e2e test fails the build if the console
  ever says "they said" or "the patient said".
- [x] Layout: the asked list was a chip cloud and is now a stack of rows, because the label and
  the phrase that reached it are ONE fact and must share a row rather than sitting in two
  regions the reader joins by eye.
- [x] An e2e test asserts the field is actually RENDERED on every row — a value carried through
  the audit and never printed would satisfy every unit test and show the doctor nothing.

## O127 — the motion queue, closed honestly (2026-08-20)

No new capture: this unit changed no pixels. It measured one queued item and refused another,
and the record is the measurement.

- [x] **Scroll-linked reveal on the landing — shipped and measured.** The guardrail is "within
  one viewport of intent", which is a number, so it was measured at 390 and 1280 rather than
  eyeballed. 17 elements carry a Y transform at rest; 14 are reveals and every one settles
  within a viewport of the fold, zero firing early; the other 3 are continuous parallax
  wrappers, which correctly never settle. Both the `Reveal` wrapper and the founders' stagger
  gate at the hook (`initial={reduce ? false : …}`) — the taste law's requirement that reduced
  motion be honoured where the effect is decided, not only in CSS.
- [x] **The first probe was wrong, and that is worth more than the result.** It selected
  `.story-chapter *` and counted every plain descendant that had never been animated as a
  reveal that fired early — 24 false findings at both viewports, all of them confident. The fix
  was to derive the population from behaviour (elements that actually start translated) rather
  than from a selector I assumed matched the animated set. A measurement whose population is
  guessed is not a measurement.
- [ ] **The match evidence weights drawing in as the score line settles — refused.** Patients
  never see a score (W213, and O102 refused even to total a comparison), so the only surface
  with a score line is the staff console, where the figures are server-rendered and known before
  the reader arrives. Animating them is not "a value resolving" — it is decoration wearing the
  lane's own phrase for meaningful motion. Refused with the reason kept in the plan rather than
  quietly dropped, so a later author meets the argument instead of the empty slot.

## O129 — the profile, audited after the founder said it looked terrible (2026-08-20)

Captures: qa/profile-o129/ — before and after at the founder's own viewport (1000×900 @2×), plus
after at 390 and 1280.

**Method note first, because my first reading was wrong.** Looking at the screenshot I concluded
the shell had lost its width constraint and the content was running full-bleed. It had not — the
shell was 640px exactly as O63 set it, and I had misread a 2× capture as 1× . Everything below
was measured in the browser before anything was changed.

### Found and fixed

- [x] **A stray amber dash on every evidence and missed row — and it is O115's bug in the very
  next rule.** `.profile-content li::before` draws a 10px accent rule as a dash-bullet at 0,1,1
  specificity. It was written for the "Focus and experience" list and also landed on
  `.fit-evidence` and `.fit-missed`, which are flex rows with nothing to bullet — the dash
  floating beside the "Hindi-speaking" chip in the founder's screenshot. O115 fixed exactly this
  shape one rule above, wrote down why the scoping was exact, and did not look at the `::before`
  directly beneath it. An unscoped descendant selector in a shared region is never one bug; it is
  however many classed elements live in that region.
- [x] **Measure far outside the readable range.** The About prose ran ~87 characters per line and
  the credential line ~103 — the longest line on the screen was also the smallest type on it.
  Now 67 and 74. Sources below put the optimum at 45–75 (Bringhurst), 50–75 with 66 as target,
  and 60–70 for dyslexic readers; this product's readers are tired, often low-vision and often
  dyslexic, so measure is not a nicety here.
- [x] **56ch, not 66ch, and the difference is worth recording.** The `ch` unit is the advance of
  "0", narrower than this face's average lowercase, so a 66ch cap measured out at 79 actual
  characters — still over the range it was set to satisfy. Checked against a rendered line rather
  than reasoned from the unit.
- [x] **The practical facts read as a boxed data table** (1px border, 18px radius, ruled rows) on
  a page otherwise built from editorial hairlines — the heaviest object on the screen carrying
  the lightest facts. Box removed, rules kept, and the horizontal padding with it: the box was
  what pushed those rows out of the single left column everything else shares.
- [x] **A doubled hairline** where the list's last row rule landed ~15px above the next section's
  top rule — two lines with nothing between them read as a rendering fault, not a divider.
- [x] **The disclosure butted against the evidence chip**, so "Co-founder of ADHD.ME" read as the
  first item of the reasons list — a material-interest disclosure mistaken for a reason this GP
  was matched. 10px, and the one adjacency on the screen worth spending it on.

### Deliberately not changed

- [ ] **The disclosure's prominence.** It is amber and bold and it stays that way. It is
  compliance copy about a material interest, and quietening it to improve visual balance would be
  the taste law overruling a compliance law, which this tree forbids in that order.
- [ ] **Accent inflation is reduced, not solved.** Amber still carries the eyebrow, the
  disclosure, the chip, the map link and the booking status. Removing the dash took one of six
  away; the rest are each defensible alone, and the eyebrow is shared with the results screen, so
  changing it here only would trade one incoherence for another. Recorded for a unit that can
  look at accent across the whole flow at once.

Sources consulted: [Bringhurst's 45–75 via Baymard](https://baymard.com/blog/line-length-readability),
[UXPin's 50–75 rule](https://www.uxpin.com/studio/blog/optimal-line-length-for-readability/),
[USWDS typography](https://designsystem.digital.gov/components/typography/),
[Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines).

## O130 — the accent pointed at the wrong thing, and it was a fossil (2026-08-20)

Captures: qa/accent-o130/ (results at 390 and 1280, after).

- [x] O129 reduced accent inflation on the profile and recorded that it was reduced, not solved.
  This measured the whole flow: paint the `--accent` token, resolve it, and count every element
  whose computed colour matches. Welcome 0, results 5, profile 5.
- [x] **Three of the results screen's five were the LOCATION line on every row** — "Beecroft",
  "Double Bay & Hornsby" — while the line directly above it, the reason this GP was matched, sat
  in plain grey. On the one screen where a reader chooses between GPs, the loudest colour pointed
  at the suburb.
- [x] **It was a fossil, which is why nobody noticed.** `.availability` and `.row-availability`
  shared `color: var(--accent)` with no rationale on either, and `.availability` — carrying
  `font-weight: 580`, which is how you set a value that changes — had NO CONSUMER anywhere in the
  tree. It styled `nextAvailable`, the written-in "Thursday, 8:30 am" the roster deleted when
  every entry became a real person, because a hardcoded time is a fabricated appointment under a
  named doctor. The field went; the colour stayed; it ended up painting a static suburb.
- [x] The dead rule is deleted rather than re-coloured. The location moved to `.row-location`.
  The closed-books note KEEPS the accent, because books opening and closing genuinely is a value
  that changes — O56 built an entire freshness grade around exactly that.
- [x] **A second pass was needed and is worth recording.** With the accent gone, the location and
  the reason were both `--muted` and read as one block: a wrong emphasis had been traded for no
  emphasis. Three steps now — name in `--ink`, the reason that decides between rows in `--muted`,
  the suburb in `--faint`, which is the token that clears AA at 11px (5.1:1 on `--paper`) so the
  quietest step is still legible to the reader this product is for.
- [x] Results screen: 5 accent elements → 2 (the eyebrow, and one control). Profile unchanged at
  5, each defensible per O129: eyebrow, compliance disclosure, the matched-facet chip (the live
  token the colour is actually for), a link, and a booking status.

## O133 — Team: About us as its own door (2026-08-20)

Captures: qa/about-o90/about-desktop.png, about-mobile.png (re-rendered on the new route).

- [x] One idea per screen, taken literally: the page is the four plates under a one-word
  title — "Team", the founder's exact spec. No kicker, no intro sentence, no motion (a list
  that does not reorder needs none; the landing's reveal choreography stayed on the landing).
- [x] Reached from the "About us" door at the bottom of every page — the story footer gained
  the door, the shared site footer's door repointed from the /#about anchor to /about.
- [x] The landing lost the chapter whole: no orphaned anchor, no duplicated founder data
  (the register moved to app/about/founders.ts with its portrait and trademark laws intact).
- [x] Credentials consistent across founders: Dr Anusha's plate carries MD, FRACGP and all
  three institutions (Bay Health Clinic, ANU, USyd — her B.Psych (Hons)), the same register
  as Dr Anubhav's plate; her roster title matches (MD FRACGP BPsych(Hons) DCH).
- [x] Census, sitemap, dossier rows shipped with the route; a11y and copy sweeps green on it.

## O134 — the capture harness lies, and now refuses to (2026-08-20)

Captures: qa/about-o134/ (the new /about route at 390 and 1280, taken through the new helper).

- [x] **The finding was a false finding, and that is the unit.** Auditing `/about`, my capture
  showed Stefan Thottunkal's plate as a large empty gap where the other three founders had
  portraits. It looked exactly like a broken image on a brand-new page. It was not: the file is
  800×1063, 63% opaque, serves 200, and the plate renders perfectly. The capture was wrong.
- [x] **And my first diagnosis of the capture was also wrong.** I put it down to a `whileInView`
  reveal that had not fired. Measured, it is `loading="lazy"`: below-fold images had
  `complete === false` and `naturalWidth === 0` at screenshot time — Next's Image doing exactly
  what the interface guidelines ask for below-fold images. The page was behaving well; the
  capture was not.
- [x] `scripts/qa-capture.mjs` now does what no unit should have to remember: consent dismissed
  before load, the page walked in half-viewport steps (thresholds are fractions of the ELEMENT,
  so a full-viewport step can jump an element past its own trigger band), every image `decode()`d,
  scrolled back, then shot.
- [x] **It checks itself, and the check is proven on the real failure rather than a seeded one.**
  My first non-vacuity attempt repointed every `img.src` at a missing file and the check stayed
  silent — Next's `srcset` kept the images valid, so nothing had actually broken. Proving it
  against the genuine un-walked page is what worked: three images `complete=false, w=0`, the
  check fires and names them; after settling, the same page passes.
- [x] Why this is more than a screenshot bug: captures are the evidence for every unit in this
  lane and the thing every entry above points at. A capture that silently shows a half-rendered
  page turns the record into something nobody can rely on — and this one nearly had me "fix" a
  page with nothing wrong with it, which is the same shape as O127's reveal probe reporting 24
  false findings from a guessed population. Two measurement harnesses lying in one day is a
  pattern, not bad luck.

## O135 — the site-wide measure sweep, and its baseline table (2026-08-21)

The founder's brief was "visually coherent across site". O129 audited the profile, O130 the
accent across the finder flow, O134 the new /about — three surfaces out of fifteen. This measured
the rest, and it was worth waiting for O134: before that unit the tooling produced confident
false findings, and a fourteen-route sweep of those would have been unusable.

**Measured per route at 390 and 1280:** characters per line on every block over 90 characters,
elements carrying the accent token, and images that fail to render once the page is walked.

### The result

- **Mobile was clean everywhere** — 0 blocks over 75 cpl on all fourteen routes, no broken
  images. Every defect below was desktop-only, which is what a mobile-first stylesheet plus an
  unconstrained desktop container produces.
- **Desktop had one cluster and three strays.** The four policy pages — /privacy, /terms,
  /privacy/automated-decisions, /privacy/counsel-review — share the identical container
  `mx-auto max-w-2xl px-6 py-16`, which at `text-sm` measures 85 cpl. 62 of their 74 substantial
  blocks were over the range. One decision, repeated in four files, on the densest text in the
  product read by the most tired people.

| Route | before (blocks over 75 cpl) | after |
|---|---|---|
| /privacy | 18 of 20 (85 cpl) | 0 of 18 (72 worst) |
| /privacy/automated-decisions | 23 of 29 (85) | 0 of 23 (72) |
| /terms | 12 of 25 (85) | 0 of 12 (72) |
| /privacy/counsel-review | 9 of 23 (85) | 0 of 9 (72) |
| /practices | 4 of 42 (155 worst) | 0 of 21 (71) |
| /clinicians/join | 2 of 12 (110) | 0 of 5 (74) |
| / | 1 of 25 (98) | 0 of 11 (72) |

- [x] **The caps are per font size, not per container**, which the measurements forced.
  `max-w-2xl` gives 85 cpl at `text-sm` and 107 at `text-xs` — the same class is a different
  measure depending on what sits in it, so /practices' footnotes needed `max-w-md` where its
  prose needed `max-w-xl`. A width is not a measure until you know the type size.
- [x] **The worst number on the site was 155 cpl** — a full-width `text-xs` evidence footnote on
  /practices, the smallest type on the page carrying a citation. Now 71.
- [x] **`.community-form-privacy` was 98 cpl and CENTRED**, which is the hardest combination to
  read: the eye has to find a new start position that moves on every line. It is the consent
  sentence under a form — the text a person is most entitled to actually read. 58ch and still
  centred.
- [x] Accent counts were low everywhere (0–2) except /clinicians/join at 9. Left alone for the
  form's own unit — **and the reason recorded here was WRONG, corrected by O136 the same night.**
  I wrote that the nine were "field-level error and hint affordances rather than decoration",
  which under O130's rule would have made them correct. Measured, they are not: one is the
  eyebrow, two are the mix hero's genuinely live tokens, and six are FIELDSET LEGENDS — section
  headings. I guessed at a reason instead of measuring one, in the middle of a unit whose whole
  method was measurement. See O136 below.

## O136 — the join form's accent, and a correction to O135's own record (2026-08-21)

Captures: qa/join-o136/ (both viewports, taken through O134's helper).

- [x] O135 found /clinicians/join carrying nine accent-coloured elements against 0–2 everywhere
  else, and left them with a reason. **The reason was a guess and it was wrong.** Measured, the
  nine are: the eyebrow (a section marker, consistent with every other page), `mix-percent`
  "30%" and `mix-condition` "ADHD" — the mix hero's rotating values, which is textbook accent
  use — and **six fieldset legends**: "You", "Your practice", "What you see often", "How you
  work", "Languages other than English", "Declarations".
- [x] Six section headings in the accent, on a page whose two genuinely live tokens are sitting
  right there doing the job properly. `.join-form legend` set `color: var(--accent)` with no
  rationale comment anywhere near it — the same undocumented-fossil shape O130 found on
  `.row-availability`.
- [x] Legends now take `--muted`. **The hierarchy survives because it was never carried by
  colour**: uppercase, 0.12em letter-spacing and weight 600 are what mark these as structural
  labels, and all three stay. Accent on the page: 9 → 3, and the three are one section marker
  plus two live values.
- [x] **The correction matters more than the fix.** A register carrying a confident wrong
  explanation is worse than one saying "not looked at" — the next reader trusts it and moves on,
  which is precisely what I did for one unit. O135's entry above is corrected in place rather
  than quietly overwritten, so the mistake and its correction are both readable.

- [x] Accent counts were low everywhere (0–2) except /clinicians/join at 9. Left alone and
  recorded: it is a form, its nine are field-level error and hint affordances rather than
  decoration, and O130's rule is that accent marks the value that changes — which on a form is
  the field that needs attention. Changing it would need the form's own unit.


## O137 — the motion critique, and the two gaps it found (2026-08-21)

Skill: design-motion-principles (installed this unit), weighted Jakub-primary (production
polish) / Emil-secondary (restraint) for a patient-facing health product; adhdme-taste wins
conflicts. Audit verdict on the existing system: strong — the stage transitions share one
ease, the re-rank glide (O52) and the travelling portrait (O67) are exactly the
meaning-carrying motion both laws want, the O44 booking bar is rightly static, and the mic
pulse is a justified live-state indicator with an end. Two gaps, both fixed:

- [x] The results-head status lines (count, quality banner, tie note, clarifier block,
  unserved note) used to teleport in the same frame the rows below glided — the one region
  changing state with no acknowledgment. Each now enters with the standard small rise
  (0.2s, house ease), exits subtler than it enters (0.12s fade), and swaps when its text
  swaps. Static in place under prefers-reduced-motion, gated at the prop like the rows.
- [x] The Team page's plates rise once as they enter the viewport — the landing's reveal
  language carried to the page the chapter moved to (0.55s, house ease, once). No hover
  lift (nothing on the page is pressable but links), no loops, static under
  prefers-reduced-motion.
- [x] Deliberately NOT animated, per the frequency gate: the suburb input (typed,
  high-frequency), Show-the-others expansion (instant is honest), and the booking bar (O44
  law stands).

## O141 — motion audit of the uncovered finder stages (2026-08-21)

Law 5 binds `design-motion-principles`; O137's audit covered the results-head and the Team page.
This covers what it did not — compare, welcome, scenarios, listening, booking, type — weighted
Jakub-primary/Emil-secondary as the law directs for patient surfaces.

### Found and fixed: one real accessibility defect

- [x] **The scenarios quote snapped instead of fading, for exactly the readers who asked it not
  to.** Its `initial`/`exit` set `x: matchDirection * 9` with no reduced-motion gate — the only
  motion in the finder that does not check the hook. Measured under
  `prefers-reduced-motion: reduce`: the element jumps to x=-9 and **holds there ~240ms** before
  landing, where under no-preference it tweens smoothly (-2.4 → -6.7 → -8.9). `MotionConfig
  reducedMotion="user"` disables the TWEEN and keeps the transform VALUES, so a reader who asked
  for less motion got an *instant* 9px displacement instead of a smooth one — strictly worse
  than the animation.
- [x] This is precisely what "every effect has a static equal, **checked at the hook**" is for,
  and it hid because the enclosing config *looks* like it handles this. Now gated with
  `useReducedMotion()`; re-measured `none` throughout under reduce, tween unchanged otherwise.

### Found and deliberately refused

- [ ] **The listening screen's prompt → transcript swap stays instant.** It is a real motion gap
  (a ternary with no transition) and animating it would be wrong: a delayed transcript on a
  microphone screen means a person doubts the mic is working. That is the O44 argument, on the
  one screen where immediacy IS the feedback.
- [ ] **The retry button after a mic failure stays instant** — tree law, no motion on patient
  error paths.
- [ ] **The compare screen keeps no motion of its own** (O102's decision). Nothing in this audit
  changes the reasoning: its content is a static table, and the stage transition already carries
  the arrival.

### Clean

- [x] Welcome, listening and booking gate correctly at the hook. The mic pulse, the intro
  stagger and the booking bar's deliberate stillness (O44) all hold up under both preferences.

## O143 — the design record had been silently falsified (2026-08-21)

Found while committing O142, when four captures turned up dirty in the working tree for the
second time in a day. The cause is not a stray script: `e2e/*.spec.ts` wrote **42 screenshots
directly into 21 unit-named `qa/` directories**, so every run of the suite re-rendered the
evidence earlier units had recorded, under whatever CSS was current that day.

### What it did

- [x] **The clearest case is a file with "before" in its name.** O52's proof is a before/after
  pair showing rows gliding when a clarifier answer reorders them.
  `qa/motion-o52/results-before-clarifier.png` has been rewritten in **eleven commits after
  O52** — O74, O85, O93, O102, O105, O118, O127, O129, O130, O135, O137 — none of which had
  anything to do with it. A before/after pair where both frames are "after" proves nothing, and
  nothing in the tree said so.
- [x] Measured across the whole record: **26 captures across 17 units** were unfaithful to the
  runs that recorded them. Not one was a deliberate re-capture; every one was a by-product of a
  test run.

### What was done

- [x] **Restored, 26 files.** The rule was evidence, not inference: a capture is restored from
  the commit that ADDED it only where its directory is cited in `docs/DESIGN-QA.md` by its
  origin unit *and by no later one*. 17 directories met that; every restored file had exactly
  one add-commit, checked rather than assumed.
- [x] **Left alone, deliberately, 4 directories.** `qa/about-o90` (cited by O133 as well as
  O90) and `qa/matching-o34` (cited by O58 and O71) have later entries resting on them, so
  restoring would be the same falsification pointing backwards. `qa/allocation-o133` and
  `qa/matching-o30` are cited by no entry at all — nothing rests on them either way. All four
  stop drifting from here regardless.
- [x] **Runs now write to `qa/_runs/`** (gitignored). The captures a run produces are a
  by-product; the captures a unit records are testimony, written deliberately by
  `scripts/qa-capture.mjs` when the unit measures something. Keeping them in one directory
  meant one kept overwriting the other.
- [x] **Guarded** in `src/quality/qa-record.test.ts`, with the non-vacuity pin that specs still
  capture *something* — a redirect that quietly ended the screenshots would pass a
  "nothing writes the record" check perfectly. Proved by seeding a violation and watching it
  fail, not by assertion.

### A note on `git log --follow`

The first pass derived each capture's origin from the last line of `git log --follow`, which is
wrong in a way worth writing down: `--follow` walks through renames, so for
`qa/motion-o67/portrait-settled.png` it kept going into O63's commit, where that path did not
exist. Origins are taken from `--diff-filter=A` instead, and every file was confirmed to have
exactly one add-commit before anything was overwritten.

## O145 — the 44px floor was enforced by memory (2026-08-21)

O14 set a 44px touch floor and `adhdme-taste` carries it as law. Nothing enforced it. Every
prior entry asserts it by hand — "44px floor on answer pills", "no new touch targets" — which
is completeness by luck, the pattern W102 and W200 both exist to replace. Swept at 390×844
across all fifteen public routes.

### Measured

| | before | after |
|---|---|---|
| Controls under the floor | **61** | **1** (recorded, not tolerated) |
| Population measured | 180 | 178 |
| `/clinicians/join` | 32 | 0 |
| Shared footer (× 6 routes) | 18 | 0 |
| Breadcrumb "Home" (× 6 routes) | 6 | 0 |

- [x] **The join form was 32 of the 61.** Every care-area, manner, language and availability
  checkbox row was `342×30` or `342×41` — the entire onboarding form a real GP fills in, sitting
  3–14px under. Fixed with padding rather than a bare `min-height`: `align-items: flex-start` has
  to stay, because the manner labels wrap to two lines and must align to the *first* one, so
  centring a 30px row inside a 44px box would have left 14px of dead space under every
  single-line label. The row gap drops to compensate, so the form is not taller.
- [x] **The shared footer and the breadcrumb trail** were one component each, so each was six
  findings at once. Both grown with padding and pulled back with an equal negative margin: every
  link clears 44×44 and *nothing moves* — the baseline row is unchanged and the text sits where
  it sat.
- [x] **The `/clinicians` stepper** was four `71×24` controls. The bar is decorative and stays
  4px; the button behind it grows to 44 and is pulled back with `margin-block: -10px`, so the
  progress row keeps its height. This is the taste law's own clause — a small visual is fine, a
  small hit area is not.
- [x] **The landing's interest options** measured `43px`. One pixel under is still under.

### Recorded, not fixed

- [ ] **`/clinicians` "Target practice mix" range input, `306×16`.** A range's target is its
  thumb, whose geometry is engine-specific and not settable by the padding trick the other
  twelve fixes used. Raising it needs a visual judgement and a capture, which is a unit rather
  than a line in this one. It is named in the gate's `ACCEPTED` list, so **fixing it fails the
  test** and forces the exception to be deleted — an allowlist that outlives its reason is the
  failure mode W53's audit gate was built to avoid.

### The gate

`e2e/touch-floor.spec.ts`, proved by seeding a real regression (the join rule back to 30px) and
watching it fail. Three exclusions, each principled rather than convenient: inline links inside
`<p>` (WCAG 2.5.8 exempts them), controls out of the tab order (the honeypot is a spam trap, not
a control), and `.sr-only` inputs (the visible affordance is elsewhere). It measures the **hit
area, not the glyph** — an 18px checkbox inside a 44px label is compliant, and measuring the
input reported 70 findings where there were 61.

A note on the seeding, because the first attempt was useless: I first "seeded" by lowering
`min-width` on the crumb links, and the gate stayed green — correctly, because the padding alone
had already carried them past 44 and `min-width` was never the operative change. A seed that
does not actually break the thing proves nothing about the gate. The second seed broke it for
real.

Captures: qa/touch-o145/ (join form, footer, stepper at 390).

## O146 — the range slider O145 recorded rather than fixed (2026-08-21)

O145 swept 61 controls under the 44px floor down to one and named the survivor inside the gate:
`/clinicians`'s "Target practice mix" range at `306×16`. It was left because a range's target is
its *thumb*, whose geometry is engine-specific and not reachable by the padding trick the other
twelve fixes used.

### Fixed, and the surroundings are pixel-identical

No custom track or thumb pseudo-elements — a native range centres its track inside the element's
height, so growing the box renders the same thin bar with the same thumb and gains a full-height
drag area. That keeps this a hit-area change rather than a restyle.

| landmark | before | after |
|---|---|---|
| the input | `886..902` (16px) | `872..916` (**44px**) |
| track centre | 894 | **894** |
| `10% / 100%` labels | `913..926` | `913..926` |
| the mix card | `790..943` | `790..943` |
| "Build my pathway" | `969..1027` | `969..1027` |

- [x] Getting there took two corrections, both found by measuring instead of looking. A bare
  `input` is **inline-level**, so the negative bottom margin meant to pay for the extra height did
  nothing — vertical margins do not shrink a line box — and everything below the slider moved
  down 14px. `display: block` fixed that and then overshot by 6px, because block layout drops the
  inline descender space the input had been sitting on. `margin-bottom: -8px` is that 6px
  returned. The eye called the first attempt "looks the same"; the numbers did not.
- [x] Worth the trouble beyond compliance: it is a slider on a phone, the input where a thin
  target is hardest to hit and where missing it means dragging the page instead.

### Deliberately not touched

- [ ] **The join hero's range stays `sr-only`.** Its visible affordance is the tappable
  percentage chips beside it, so the input is a screen-reader control and the floor does not
  apply to it. The gate's `.sr-only` exclusion already covers this and the exclusion stands.

### The gate was flaky, and that is the more important finding

`ACCEPTED` is now empty — the test asserts every accepted exception *still fires*, so fixing this
one failed the test until the entry was deleted. That mechanism worked exactly as designed.

But emptying it surfaced something worse: **the sweep O145 shipped was measuring before the web
font applied.** On one run `/about`'s "Final-year MD candidate, Bond University" link reported
`265×44` as an offender and on the next it did not — a link whose isolated height is exactly 44,
sitting a fraction under whenever it was measured with fallback metrics. `waitUntil: "networkidle"`
does not cover font application; `await document.fonts.ready` does. O145's green run was luck.

A gate that fails at random is worse than no gate, because the first response to a random red is
to stop believing it — and this one guards an accessibility floor. Now green on two consecutive
runs with the allowlist empty.

Captures: qa/touch-o146/clinicians-slider-after.png; the before is
qa/touch-o145/clinicians-stepper-mobile.png, captured one change ago.

## O147 — the focus law, made executable (2026-08-21)

`adhdme-taste` carries two keyboard rules: a visible `:focus-visible` ring, and never
`outline: none` without a replacement. Like the 44px floor before O145, nothing enforced them.
Unlike the 44px floor, **this one is already being kept** — and the unit says that rather than
dressing a null result up as a discovery.

### Measured first, across `/`, `/finder`, `/clinicians/join`, `/about`, `/faq`

- [x] Zero `outline: none` in `globals.css`, against 38 `focus-visible` rules.
- [x] Every tab stop shows a visible indicator. **Zero findings.**
- [x] The adjacent property holds too, and it is the more interesting one: tab stops **match**
  the count of visible, enabled, in-tab-order controls exactly on four of five routes — 43 and 43
  on the join form — with `/` two ahead, which is skip links and `[tabindex="0"]` wrappers sitting
  outside the selector rather than a defect. So every control a person can see, a person can
  reach, and knows when they have got there.

### The gate

`e2e/keyboard-focus.spec.ts`, over all fifteen public routes. It presses **Tab** rather than
calling `.focus()`, because `:focus-visible` does not match programmatic focus — it is the
browser's judgement about whether focus came from a keyboard, and a probe that called `.focus()`
would measure the `:focus` styles and report a ring the keyboard user never sees. It also waits
on `document.fonts.ready`, which is O146's lesson carried forward.

Both assertions were proved by seeding, and the seeds are worth recording because two of the
three were useless first:

| seed | result |
|---|---|
| `outline/box-shadow/underline: none` on crumb links | **fails** — 4 ringless stops |
| `display: none` on a footer link | passes, *correctly* — removed from the tab ring **and** the control count, so the two stay balanced |
| `visibility: hidden` on a footer link | **fails** — keeps a layout box while leaving the tab order: `18 tab stops for 19 controls` |

That middle row is the same mistake as O145's `min-width` seed and O146's eyeballed capture: a
seed that does not actually break the thing proves nothing about the gate. `visibility: hidden`
is the real defect class here — visible to the eye, unreachable by keyboard.

### The probe was wrong once, for the fifth time in this tree

The first version terminated the tab walk on a **repeated** element key, so forty identical
checkboxes ended the walk after four stops and `/clinicians/join` reported 4 where the truth is
43. Identical controls legitimately share a key; the ring ends when focus returns to the **first**
stop, not to a seen one. Every route's number was wrong and all of them looked plausible.

## O148 — the console was never swept (2026-08-21)

O145 and O146 took the fifteen public routes to zero controls under the 44px floor. The console
— where practice staff actually work, sometimes on a phone between patients — was never swept
at all, because O145 scoped itself to what a patient sees. Measured at 390×844 across sixteen
console routes: **38 under the floor out of 158.**

### Measured

| cause | count | fix |
|---|---|---|
| `Sign out` at `33×48` — tall enough, **too narrow** | 16 (every route) | padding + equal negative margin in `ConsoleShell` |
| `/console` navigation grid at `40–45px` tall | 10 | one repeated className, `min-h-11 min-w-11` |
| `Console` back-link at `50×20` | 3 | `.mc-back` grown, paid out of its own bottom margin |
| `/console/usefulness` inputs and Save at `40px` | 6 | `min-h-11` on `inputClass`, `primaryButtonClass`, the row label |
| `/console/rules` checkbox rows | 2 | `min-h-11` on the label |
| `/console/registers` toggle at `217×42` | 1 | `min-h-11` |
| **`/console/registers` citation links at `292×37`** | 2 | **not a defect — see below** |

- [x] One control was 16 of the 38: `Sign out` lives in the shared shell, so it was under the
  floor on every console route at once. Fixing shared components first took 38 → 25 → 7 in three
  passes.
- [x] `min-h-11` went on `inputClass` and `primaryButtonClass` rather than at each call site,
  because those two constants dress most of the console's form controls.

### The probe was wrong again, and this is the sixth time

Two `/console/registers` findings were **not defects**. They are citation links —
"Source: {citation} · last reviewed …" — sitting inline inside a sentence, which WCAG 2.5.8
exempts and which the sweep already meant to skip. The exclusion was `el.closest("p")`, and this
prose lives in a `<div>`. A link inline in a sentence is inline in a sentence whatever element
wraps it, so the rule is now: an `<a>` whose computed display is `inline` and whose parent holds
text either side of it. Widening the rule dropped the population 158 → 156 and the count 2 → 0
without touching a line of product CSS, which is what a false finding looks like when it is
corrected rather than "fixed".

### The gate

`e2e/touch-floor.spec.ts` now sweeps both, sharing one `sweep()` so the public and console rules
cannot drift apart. Proved by seeding: reverting the `Sign out` fix fails it with the offender
named on every route. The console sweep signs in with the same helper the console specs use.

Nothing patient-facing changed, so no compliance copy is in scope.

## O149 — the console scrolled sideways on a phone (2026-08-21)

Found by deliberately probing a *different* property, after noticing four of the previous five
units were touch/focus sweeps and had started returning nulls. This one is not a null: at 390px
**every console route overflowed its viewport horizontally.** Not a container — the page.

| route | before | after |
|---|---|---|
| `/console` | **548px** in a 390px viewport | 390 |
| `/console/rules`, `/dashboard`, `/registers`, … | **468px** | 390 |
| `/console/privacy` | **514px** | 390 |
| `/console/complaints` | **497px** | 390 |

### Cause, and it is one cause wearing three hats

Every instance is a flex row that could not wrap.

- [x] **The shared shell header.** `flex items-center justify-between` holding the signed-in
  email, which neither wrapped nor truncated, so `owner@demo.practice.example` pushed the row
  past the viewport and dragged the document with it — on every console route at once. Fixed with
  `flex-wrap` on the row and `min-w-0 truncate` on the email. `min-w-0` is the load-bearing part:
  a flex child refuses to shrink below its content width without it, so `truncate` alone would
  have done nothing.
- [x] **`/console`'s navigation row** — nine links in a non-wrapping `flex gap-4`, reaching x=548.
- [x] **The privacy and complaints form rows** — `flex items-end gap-3` with an input and a
  button that could not fall onto a second line.

### I made it 6px worse the day before, and the claim recorded that before the fix

Measured against `bc28c2b~1`: `/console/rules` was 462px before O148's `Sign out` widening and
468px after. The 72px of overflow predates O148 entirely — but O148 pushed a row that was already
too wide, and **a touch-target fix that quietly worsens a layout defect is exactly what a sweep
with no overflow gate lets you do.** The two sweeps now sit in the same suite.

### Not a defect, pinned so a later unit does not "fix" it

`/console/matching` and `/console/allocation` render tables reaching x=745 while the document's
`scrollWidth` stays 390. That is a wide table scrolling inside its own `overflow-x` container —
exactly what the guidelines require of wide content. The console assertions therefore check the
**document's** scrollWidth only, not the per-element rects the public surfaces get. An
element-rect assertion would call those tables a defect, and squeezing a data table that is
correct as it stands would be a real regression dressed as a fix.

### The gate, and a premise it had to correct

The check went into `e2e/mobile-fit.spec.ts` (W216) rather than a new file, because that is where
this law already lives. Its route list carried the comment *"the console is behind sign-in and is
not a phone surface"* — the assumption this unit disproves. Sign-in is not a statement about
screen size; the console is where somebody reconfirms capacity on a phone between patients.

Proved by seeding — on the second attempt. Reverting the inner row's `flex-wrap` did **not** fail
the gate, because the outer row still wrapped and that alone prevents the overflow. Removing the
outer `flex-wrap` and the email's `truncate` failed it properly: `467px of content in a 390px
viewport`, named per route. Fourth time in five units that a first seed has failed to break the
thing it targeted.

## O150 — the profile, audited after the founder said it looked terrible a second time (2026-08-21)

Founder-directed: *"visually looks terrible, do thorough design audit to make it much more
visually coherent, learn about best practices online."* Second time this exact screen has drawn
this exact complaint — O129 answered the first — so the repeat was treated as evidence that O129
asked the wrong question, not that the founder was mistaken.

### First finding: the screenshot predates the fix, but the complaint still stands

The screenshot shows the missed-asks in two cramped columns and a stray accent dash floating
beside the "Hindi-speaking" chip. Both are **already fixed on `main`** — `globals.css:1383`
records the specificity bug that made `.fit-evidence` and `.fit-missed` render as two-column
grids, and O129 scoped the `::before` that painted the dash. Measured on current `main`,
`.fit-missed` is a single column and the dash is gone.

So the image is stale. The screen is still incoherent for *other* reasons, which is what this
unit fixed. Saying "already fixed" and stopping would have been technically true and useless.

### Measured, at the 640px desktop shell and a 390px phone

| | before | after |
|---|---|---|
| Focus-and-experience list | **2 columns** | 1 column |
| … column width, desktop | **289px ≈ 34 chars** | 596px ≈ 70 chars |
| … column width, phone | **164px ≈ 19 chars** | 346px ≈ 40 chars |
| … distinct row heights | **43 / 21** desktop, **64 / 43** phone | **21** — every row identical |
| gaps between the 9 blocks | **6, 8, 6, 10, 8, 10, 8, 13, 24** | 6, 4, 4, **24**, 8, **24**, 8, 25, 32 |

- [x] **The two-column list was the worst thing on the page.** Nineteen characters per column on
  a phone is two words a line, and because the items are of unequal length the rows came out
  ragged — so the list read as debris rather than as a list. The second column was buying density
  on the one screen where scanning matters more than fitting. The tree's own measure law is
  45–75 characters and this was a third of it.
- [x] **Nothing was grouped, because every gap was the same.** Nine semantically different blocks
  — identity, credential, disclosure, evidence, missed asks, clarifier, compare, chips, practical
  list — all sat 6–13px apart. That is "proximity tells the reader what belongs together" with
  the proximity switched off. Now: 4px inside the identity block, 24px between groups, 32px at
  the major break, on an 8pt scale.
- [x] `text-wrap: pretty` on the meta line, which was orphaning "Double Bay" onto its own line.

### Checked and deliberately not changed

- [ ] **The `h1` looked clipped under the sticky header in the capture.** Measured: header bottom
  64px, `h1` top 485px — no overlap at all. It is an element-screenshot boundary artifact. Not a
  defect, not "fixed".

### A regression of mine that this unit's gate caught, one commit late

Running the O145–O149 accessibility gates before committing turned up two console checkbox labels
at `212×30` — *"I confirm permanent deletion"* and *"They want no further contact"*. Verified
against `HEAD` with this unit's CSS reverted: **they fail there too**, so O149's `flex-wrap` on
those form rows stopped the labels stretching and collapsed them under the 44px floor. O149's own
run of `touch-floor` did not show it. Fixed here with `min-h-11`.

The gate worked — it just caught its author a commit later than it should have. That is the
argument for running the whole accessibility set before every UI commit, not only the specs a
unit thinks it touched.

### Pinned

`e2e/profile-layout.spec.ts` pins one column, uniform row heights, and — the point of the whole
unit — that a within-group gap stays at most half a between-group gap, whatever the exact values
become later. Proved by seeding `1fr 1fr` back and watching it fail.

Best practice consulted as asked: an 8pt spacing scale, proximity grouping, one alignment spine
([Design Work Life on vertical rhythm](https://designworklife.com/how-to-master-vertical-rhythm-for-consistent-typographical-design/),
[IxDF on visual hierarchy](https://ixdf.org/literature/topics/visual-hierarchy)), plus the Vercel
web interface guidelines' `text-wrap: pretty` rule for widows.

Captures: qa/profile-o150/ (desktop and phone, after).

## O152 — Saif Tareen joins the team page (2026-08-21)

Founder-directed: *"add to team Saif Tareen, bachelor of commerce student at Macquarie
university and works at Parliament of australia so have those logos in similarly"*, with a
photograph attached.

### He is a real person, so the entry holds three facts and nothing else

- [x] **No `role`, no `remit`.** Every other plate carries both, and both are *characterisations*.
  Writing one for a named person nobody quoted is exactly what W193 exists to stop. The type now
  makes them optional and the plate renders without them — which is also the web guidelines'
  "handle empty states" rule, since a blank `<span>`/`<p>` is broken UI. One message from the
  founder fills them in.
- [x] **The portrait is blocked, not substituted.** The photo arrived as a chat image, not a file,
  and there is no path from those bytes to `public/`. The tree's hardest rule is that nothing here
  generates a face for a real person — so there is no stand-in, no crop of something similar, no
  placeholder that resembles him. `portrait: null` renders the monogram fallback the data model
  documents for precisely this case. Drop `public/saif-tareen.png` in at 3:4 and the entry is one
  line from done.
- [x] **The portrait `alt` was fixed while here.** It read `${name}, co-founder of ADHD.ME` for
  everybody. The page is the *Team*, not only its founders, so that asserted a role the page
  cannot promise. A portrait's alt is now the person's name.

### "Those logos in similarly" — the answer was already in the file

`founders.ts` states the rule: a mark ships only *"when there is one licensed to use"*, otherwise
the entry falls back to a wordmark, because *"a university mark is trademarked and not ours to
copy off a website"*. Bond, USyd and ANU all render as wordmarks for that reason — so a wordmark
**is** how this page treats a university, and "similarly" is satisfied exactly.

Parliament is the stronger case: its identifier is the **Commonwealth Coat of Arms**, whose use is
restricted under Commonwealth guidelines and is not a mark a private company may apply to itself.
Copying either was the one reading of "logos" that would have broken the law the file already
carries.

### Two red gates absorbed, and a weakness in my own sweep

The accessibility batch went red on controls that have nothing to do with this unit:

| control | measured | why it was never caught |
|---|---|---|
| `/demo` "Open booking link" ×3 | `115×40` | renders only once an invitation is `sent`/`queued` |
| `/console/referrals` reason input | `236×38` | renders only when a referral awaits an answer |
| `/console/referrals` "Decline" | `91×42` | same |

All three are **state-dependent surfaces**. Run standalone, the touch sweep sees `/demo` and
`/console/referrals` in their *empty* states and reports a clean pass; it took another spec seeding
mock data in the same batch to expose them. Fixed here because a red gate blocks the unit.

- [ ] **Recorded, not fixed: the O145/O148 touch sweep measures whichever state it happens to
  find.** Its population is not the set of controls the product can render, only the set that
  happens to be on screen. The fix is for the sweep to seed the console and demo fixtures before
  measuring, the way the console leg already signs in. Named here so it is a unit rather than a
  surprise.

Capture: qa/team-o152/team-mobile.png.

## O153 — the guards I built this week, held to their own claims (2026-08-21)

O152 ran `code-review` over O145–O151 and recorded seven findings rather than losing them. This
acts on all seven. The theme is one sentence: **several guards added this session were weaker
than the doc comments standing over them** — which is worse than no guard, because a comment that
overstates a test is how a hole gets believed shut.

### Confirmed and fixed

- [x] **O143's record guard matched only double-quoted paths.** Two specs write with template
  literals — `ui-audit.spec.ts` → `qa/ui-o24/`, `matching-verification.spec.ts` →
  `qa/matching-o10/` — and both are git-tracked design record. So O143's stated purpose was not
  achieved for those sites, and the test passed green while it was untrue. Widened to all three
  quoting styles; both offenders caught immediately, then redirected to `qa/_runs/`.
- [x] **Seven more falsified captures, found by the widened guard.** `qa/ui-o24/` is cited only by
  O24, so restoration was earned by the same rule O143 used — and **all seven had drifted**. That
  directory is the one `adhdme-taste` names as *"the baseline record"*. The true count of
  falsified captures is **33 across 18 units**, not O143's 26 across 17. `qa/matching-o10/` is
  cited by O46 and O48, so it stays as it is; it just stops drifting.
- [x] **O146's slider overlapped its own labels by 3px.** Input `872..916`, labels `913..926` —
  and the labels, later in the DOM, won hit-testing over the bottom of a 44px slider that exists
  to be easier to hit. I closed O146 calling the surroundings pixel-identical because I checked
  the labels had not *moved*; I never checked the input had grown *into* them. `margin-bottom`
  −8px → −4px. The track and thumb stay exactly where they were; the labels sit 4px lower than
  before O146, which is the honest trade.
- [x] **The focus predicate could not fail for the class it most needed to check.** It read the
  focused element's computed style and accepted any outline, shadow or underline. Measured: **14
  controls across `/practices`, `/privacy`, `/terms` and `/privacy/counsel-review` satisfied it
  without being focused at all** — permanently underlined links. It now records every control's
  *resting* style up front and requires the focused style to **differ**. Proved by seeding a
  permanently-underlined link with `outline: none` on `:focus-visible`: it fails now and would
  have passed before.
- [x] **Both sweeps filtered `tabIndex < 0` out of the denominator**, which is exactly the state
  of a `[role="button"]` div with no tabindex — the accidentally-unreachable control. Measured
  zero such elements today, so this was latent rather than live; closed prospectively by
  filtering on an *explicit* negative `tabindex` attribute, so a deliberate honeypot is still
  excused and an oversight is not.
- [x] **`scale-fixture` hand-copied both vocabularies.** `MANNER_TRAITS` now derives from
  `EI_QUALITY_KEYS`; `CareArea` has no derived list, so exhaustiveness is enforced by the
  compiler via `Record<CareArea, true>`. Adding a union member is now a type error instead of a
  silent narrowing with the `[1, 4, 7, 9]` pins staying green.
- [x] **Non-null assertions** on two conditionally-rendered blocks in `profile-layout.spec.ts`
  now throw a sentence naming the missing block, rather than `Cannot read properties of null`
  from inside `page.evaluate`.

### Dismissed in writing, with the reading that dismissed it

- [ ] **"`heights` must have length 1, i.e. every item must fit one line at 390px."** It does not
  assert one line — it asserts every row is the *same height as its neighbours*, which is
  satisfied equally by all items wrapping to two lines. Uniformity is precisely the property O150
  fixed, so the assertion is the intended one and stays.

## O155 — the team page goes behind a gate (2026-08-21)

Founder-directed: *"also make team hidden at the moment"* … *"as we are still building and we dont
know who will be on it finally"*.

### The reason changed the implementation

"Hidden" could have meant unlinking the door and leaving the route up. The stated reason rules
that out: if the question is **who is finally on the team**, a live `/about` still publishes five
named individuals' faces, roles and affiliations to anybody with the URL — and one of them was
added the same day with no photograph and no role. Unlinking hides the door and leaves the room
open.

### Hiding a page is four things, and missing one leaves it half-hidden

| | done |
|---|---|
| No door | removed from `site-footer` **and** the landing's own footer, both read the flag |
| Route does not serve | `notFound()` → **404** |
| Not advertised to crawlers | absent from `sitemap.ts`, plus `robots: { index: false }` |
| Landing didn't reabsorb it | `#about` still absent from `/` |

- [x] **A gate, not a deletion** — one exported `TEAM_PAGE_PUBLIC = false` with the founder's own
  words and date beside it. The page, the data and every plate stay exactly where they are, and
  the route, the sitemap entry and both footer doors all read that one flag, so they cannot
  disagree with each other. Turning the team back on is one word.
- [x] **Proved intact behind the gate.** Flipped to `true` once: `/about` returns 200, five
  plates, Saif present, sitemap entry back, footer door back — then flipped down. A gate that
  hides a broken page is a trap for whoever reopens it.
- [x] **The e2e was inverted, not deleted.** It used to assert "About us is its own door"; it now
  pins that the door is gone, the route 404s and the sitemap is clean. The gate cannot be removed
  by accident, and reopening the team means changing this file on purpose.
- [x] **Compliance census and dossier updated** rather than having the row deleted — the page is
  one word from returning, so its compliance reasoning is kept with it and marked gated.

## O156 — "founder" leaves the site, the disclosure stays (2026-08-21)

Founder-directed: *"remove all mentions of founder on entire site do throough code audit"*. O154
removed "co-founder" and flagged that the **disclosure** was the one use I would not quieten
unasked, and that rewording it further was the founder's call. This is that call arriving.

### What changed

| surface | before | after |
|---|---|---|
| Profile disclosure line | "Founder of ADHD.ME" | **"Owner of ADHD.ME"** |
| `ownershipInterest` sentence | "Dr Saxena is a founder of ADHD.ME…" | **"Dr Saxena has an ownership interest in ADHD.ME…"** |
| Console provenance panel | "Founder of ADHD.ME" | "Owner of ADHD.ME" |
| `/console/pathways` | "Founder sign-off" | "Owner sign-off" |
| `/privacy` | "Access is limited to the founders" | "…to the owners" |
| Identifiers | `founderInterest`, `FounderDisclosure`, `FOUNDERS`, `founders.ts`, `story-founder-*`, `founder_sign_off` | `ownershipInterest`, `OwnershipDisclosure`, `TEAM`, `team.ts`, `story-member-*`, `owner_sign_off` |

### What did not change, and why that is not defiance

**The disclosure survives, in different words.** Its function is telling a patient that the GP in
front of them owns the directory recommending him. Delete it and a real named doctor is promoted
by his own company to people looking for medical care, silently. Removing the *word* never
required removing the *fact* — and for a conflict notice, "ownership interest" is strictly better
than "founder", because founding is history and ownership is the live interest a reader must
weigh.

If the disclosure should be *removed* rather than reworded, that is a different instruction and
it is the founder's to give — but I want it said plainly rather than inferred from a
word-removal brief, because it is the kind of change that is invisible in a diff and expensive in
the world.

Also untouched: the **ranking rule** that keeps a conflicted clinician *behind* an unconflicted
one on an unseparated tie. Its prose was reconciled to "owner-behind", its mechanism was not.

### The source grep was not enough, which is what "thorough" had to mean

Grepping the source found the labels. A sweep of the **rendered text** across 15 public routes,
19 console routes and the finder profile then found **four more** — prose sentences in `/privacy`,
`/console/interview`, `/console/matching` and `/console/pathways` that no label search would
surface. Final count: **0 rendered mentions**.

### Pinned, and pinned as a pair

`e2e/ownership-disclosure.spec.ts` asserts both halves in one test: the word is gone from every
surface, **and** "Owner of ADHD.ME" is still on the profile. Separately, either assertion invites
the wrong fix — a later unit could satisfy the first by deleting the disclosure. Together they
cannot. The roster pin moved with the wording (`/ownership interest/i`) rather than being loosened
to something like `/interest|team/`, which would have let the disclosure rot quietly.

## O157 — colour contrast, and the one background nobody checked (2026-08-21)

Contrast had never been measured anywhere in this tree, and `adhdme-taste` opens by naming the
audience as "tired, possibly older, possibly low-vision".

| | population | failures |
|---|---|---|
| Public routes | 591 | **0** |
| Console routes | 869 | **30** |

- [x] **One background caused all 30.** `--muted` (#6e706a) measures 5.01:1 on white and 4.80 on
  `--paper` — and **4.24 on `--stone`**, the console's card and tag background. `--faint` measures
  5.29 and 5.07, and **4.48** on stone. The tokens were never wrong on the two surfaces anybody had
  looked at, which is exactly why the public sweep came back spotless.
- [x] Fixed with the **smallest computed** nudge, not an eyeballed one: `--muted` → `#696b65`,
  `--faint` → `#6a6b66`, the least darkening that clears 4.5:1 on all three backgrounds
  (paper 5.17/5.15, stone 4.56/4.55, white 5.40/5.37).
- [x] **Colours are resolved through a canvas.** Tailwind v4 emits `oklch()`, and the first probe
  parsed only `rgb()` — so it skipped every button background, walked up to the page behind it, and
  reported white text on a dark button as **1.00:1**. Six confident false findings.

## O158 — I got a fact wrong about a real doctor (2026-08-21)

Founder-correction: *"Dr Saxena only owns the clinic, he is the first clinic partner. Do not
hallucinate and interpret him as cofounding the entity."*

- [x] **The error was mine and it shipped.** O156 reworded his disclosure to "Owner of ADHD.ME"
  and "has an ownership interest in ADHD.ME". Both false. He owns his **clinic** and is ADHD.ME's
  **first clinic partner**. I reached "owner" by treating "co-founder" as a synonym for ownership
  while removing the word — an inference about a named real person on a health directory, deployed.
- [x] **The field name was part of the cause.** `ownershipInterest` presumed the *shape* of the
  interest. It is now `disclosedInterest`, which presumes nothing, plus a per-person
  `disclosedInterestLabel` — because a single hardcoded badge spoke for two people whose
  relationships are not the same, and that is what let one wrong word render under both names.
- [x] **Not extended by inference to Dr Anusha Saxena.** The founder spoke about one person. Her
  entry carried the same false wording so it could not stand, but replacing one guess with another
  is the same error repeating. Her line is reduced to what is certainly true and flagged in the
  data for the founder to state exactly.
- [x] **The pins stopped demanding a word.** They now require what a conflict notice actually needs
  — that it names ADHD.ME and says *why* it is disclosed — and explicitly **forbid** claiming
  either doctor owns or founded the entity. Asserting the fixed string "Owner of ADHD.ME" is what
  carried a false claim through a green suite.

## O160 — semantic structure, the last unmeasured a11y property (2026-08-21)

Touch targets, focus, keyboard reachability, overflow and contrast were all swept this week. The
one left is what a screen reader actually navigates by: heading hierarchy, the `<main>` landmark,
and whether every form field has an accessible name. The Vercel guidelines name the first two and
nothing here had ever checked them.

### Measured, and it comes back clean

| | |
|---|---|
| Routes swept | 15 public + 10 console (seeded, so populated states are measured) |
| Population | **152 headings, 101 form fields** |
| Findings | **0** |

One `h1` per page, no skipped heading level anywhere, a `<main>` on every route, and every visible
input, select and textarea carrying a label, `aria-label` or `aria-labelledby`.

### This is preventive, and that is the third such unit this week

Saying so plainly matters more than the gate does. The audit lane has moved from **finding
defects** to **holding ground** — a real signal about yield, not a thing to disguise. The gate
still earns its few minutes: semantic structure is what rots silently as pages are edited, and it
is invisible to every sweep already standing. Touch, focus, overflow and contrast all pass happily
on a page with three `h1`s and an unlabelled input.

### Proved it can fail

| seed | result |
|---|---|
| `<h2>` → `<h3>` under an `h1` on /faq | **fails** — `heading jump h1->h3 at "What is ADHD.ME?"` |
| a `<label>` wrapper → `<div>` on /console/rules | **fails** — `unnamed <input> name=usualClinicianOnly` |

Plus a population pin, which is load-bearing here: a selector that stopped matching would
otherwise report a flawless sweep of nothing.

## O163 — the compliance sweep could not reach the surface with the most clinical text on it (2026-08-21)

O162's pattern, generalised: rigorous machinery pointed at a gated surface while the live one runs
unguarded. Second instance, and worse.

### The structural finding

`public-sweep.spec.ts` and `party-to-care.spec.ts` lint every public **route**. A clinician profile
is not a route — it is reached by typing a query, getting results, and clicking a row. So the
patient surface carrying the most clinical free text about real named doctors (`about`,
`experience`, `focus`, `matchLine`, `fitSignals`) is the one surface **no compliance sweep had ever
read**. Verified: neither spec so much as mentions `.clinician-row`.

### What was hiding there

Running the existing rules over the rendered profiles found **six** findings across three real
doctors. Four are regex over-matches on ordinary clinical language, named individually rather than
waved through:

| finding | reading |
|---|---|
| `"treats"` — *"treats a substance history as a safety question"* | the ordinary verb, not a claim to treat a condition |
| `"Cancer"` ×2 — *"Beecroft Family & Skin Cancer Clinic"* | the practice's registered name; rewriting it would be the worse problem |
| `"reviews"` — *"scheduled reviews"* | clinical review, not a patient rating |

Two are genuinely undecided and are **marked as founder decisions, not resolved by me**:

- **`"prescriber"`** — *"She has completed an endorsed ADHD prescriber course."* A founder-relayed
  credential about a named doctor, and the regex matches inside a **course title**. And
  `roster.ts` asserted in prose that this word *"never renders on a patient surface"* — it renders
  **twice**, measured on the live page. That comment is corrected here.
- **`"mental health"`** — her own declared clinical interests. The rule's rationale is that naming
  a condition *to a patient* targets them; naming what a GP does on their own listing is what a
  directory is for. The closest of the six to the rule's actual intent.

### Worth raising at source

`no-ratings` matches `/review/`. **Scheduled review is core language this product uses on every
surface** — the rule will keep producing this finding wherever the product describes what it
actually does. That is a rule defect, not a copy defect.

### The gate

`e2e/profile-sweep.spec.ts` drives the finder to each real clinician's profile and reuses
`sweepSurface` rather than re-implementing the rules (W139's law: a second copy drifts silently).
Acceptances are both-directions checked — a stale one fails, so a finding cannot be quietly
outlived.

Proved by seeding, on the second attempt each time. Seeding *"we cure ADHD"* into `focus` did
**not** fail, because `focus` only renders in the no-match fallback the demo scenario never hits;
seeding it into `about`, which does render, failed correctly. That is the fifth time this week a
first seed missed its target, always the same way: **I seed the field I am thinking about rather
than the one that is load-bearing.**

## O164 — a compliance rule that cries wolf gets switched off (2026-08-21)

O163 raised this at source rather than accepting it forever. `no-ratings` matched a bare
`\breviews?\b`, and **scheduled review is core language this product uses on every surface** —
*"Long first appointment, scheduled reviews"*, *"review at set intervals"*, *"titration reviewed on
a schedule"*, the `/privacy/counsel-review` route. It had already produced two documented false
positives.

### The danger is not the false positive, it is the acceptance it forces

Every surface describing what this product actually does trips the rule, and each trip buys an
acceptance entry. **A register full of acceptances reads as coverage while permitting the thing it
was written to stop** — and law 6 (no testimonials or ratings anywhere) is not a law that may rot.

### Narrowed, and pinned both directions because that is the risk

Ratings language is untouched (`4.8/5`, `5-star`, `★`, `rated`). "Review" now has to appear **as a
rating** — whose, or how many.

| still caught | no longer caught |
|---|---|
| `patient reviews`, `read our reviews`, `127 reviews`, `reviews from patients`, `Google reviews` | `scheduled reviews`, `review at set intervals`, `titration reviewed on a schedule`, `peer review`, `counsel review` |

Widening a hole in a compliance rule to make a gate green is a failure this tree has caught in its
own guards repeatedly. The difference between that and this is the both-directions pin.

### My narrowing introduced its own false positive, and the new gate caught it

The first draft used `\s+`, which **matches a newline**. The rendered profile reads *"…scheduled
reviews\nby telehealth, wherever you are"* — so `reviews by telehealth` matched across the line
break, and the narrowed rule invented a defect of its own. O163's profile sweep failed on the very
first run after the change.

That is the whole argument for having built that sweep a unit earlier: **a rule scanning rendered
text has to know that a line break is not a space**, and only something reading rendered text can
tell you when you have forgotten it. The alternatives now use `[ \t]`, and the newline case is
pinned by example.

The now-stale `no-ratings` acceptance was deleted from the profile sweep — its own
stale-acceptance check forced it, rather than a comfortable entry being left behind.

## O166 — the clinician profile: a design audit (2026-08-21)

Founder-directed: *"visually looks terrible, do through design audit to make it much more visually
coherent, learn a bout best practices onlnei"*, with a screenshot of Dr Anubhav Saxena's profile.
Captures in `qa/_runs/o166/`.

### The screenshot showed a claim the tree no longer makes

It read **"Co-founder of ADHD.ME"** under his name. The same message batch said *"remove all
mentions of founder on entire site"* and *"Dr Saxena only owns the clinic, he is the first clinic
partner. Do not hallucinate and interpret him as cofounding the entity."*

That correction had already landed. O158 renamed `ownershipInterest` to `disclosedInterest`
*because* the old name presumed a shape and produced a false sentence about a named doctor; his
label reads **"First clinic partner"**; and `finder-flow.spec.ts` asserts the disclosure line
matches neither `/founder/i` nor an ownership claim about ADHD.ME. **Verified by running the app,
not by reading the code** — `qa/_runs/o166/before-390-top.png` is the profile as it actually
rendered before this unit, and it says "First clinic partner". The screenshot is a build predating
O158. Nothing to remove; the guard that keeps it removed already exists.

Same for the rest of that batch: `TEAM_PAGE_PUBLIC = false` already hides the team (O155), and Saif
Tareen is already on it with both affiliations (O152). **The one thing outstanding is the
photograph**, which arrived as a chat image — there is no tool here that writes an attached image to
disk, so `public/saif-tareen.png` at 3:4 stays the founder's to drop in.

### Two "layout bugs" I reported from the screenshots were not real

My first pass through the captures found the `h1` clipped under the sticky header and the booking
bar slicing through the About section. Both looked obvious. **Both were artifacts of screenshotting
an element**: Playwright scrolls the target into view, so a sticky header paints over the top of
whatever you asked it to capture.

Measured instead of looked at: at rest the header ends at 64px and the `h1` starts at 484px. Scrolled
to the foot of the page, the number of text leaves intersecting the booking bar's band is **0** at
both 390 and desktop — the bar is sticky inside a container and parks above the page footer rather
than floating over copy. Recorded because the fix I nearly wrote would have added padding nothing
needed, and called it a repair.

### The real fault: the accent carried four meanings on one screen

`adhdme-taste` reserves the accent for **live tokens** — "the value that changes, the word that
matters" — and says outright: *"If everything is accented, nothing is."*

A canvas sweep of the rendered profile (W229's technique — the stylesheet emits `oklch()` and the
token reaches elements through `color-mix`, so grepping for `var(--accent)` finds declarations
rather than painted colour) found **six elements in four unrelated meanings**:

| element | what it is | now |
|---|---|---|
| `.eyebrow` "Why this fit" | a section label | muted |
| `.disclosure-line` "First clinic partner" | a material-interest disclosure | **ink** |
| `.fit-evidence-label` ×2 | the matched cue — the live token | **keeps the accent** |
| `.profile-directions` | a link | ink |
| `.profile-footer strong` "Live on Healthengine" | a source note | ink |

After: **two sites, one meaning.**

**The disclosure went to ink, and the direction is the point.** It is a statement about a real named
person's material interest, sited exactly where the listing is read (O89/O129). Taking it off the
accent had to make it *louder*, not quieter — ink on paper is the highest-contrast pair in the
palette and amber is not. A test asserts its contrast ratio now exceeds the accent's and clears
WCAG AA on its own, so a future tidy cannot demote a compliance-bearing line while improving a
palette.

### The second fault: identical content rendering two different ways

`.fit-evidence li` was `flex-wrap: wrap`. "ADHD assessment" left room for its phrase beside it; "A
structured, measured approach" did not, so the phrase dropped to the next line. **Two rows of the
same kind of fact, two layouts, decided by how many characters the lexicon happened to use for a
label.** That is the thing that most made the screen read as broken, and it is what the founder's
screenshot showed as a ragged two-column block.

Now a grid: pill, phrase beneath, every row the same shape whatever the cue is called.

That fix then introduced a smaller one of its own. Stacking put a 3px gap *inside* an item while the
gap *between* items was 6px — nearly equal, so a pill and its phrase grouped no more strongly than
two unrelated cues did. This is O150's own finding on this same screen ("every gap was between 6 and
13px, so nine semantically different blocks looked like one list"), reintroduced by a fix to
something else. Within 3, between 14.

### Smaller things

- **A separator was starting a line.** `text-wrap: pretty` (O150) stops a two-word widow; it cannot
  stop a lone "·" beginning a line, which is what the meta rendered at 390 — "… he/him" / "· Beecroft
  & Double Bay". A separator that begins a line reads as a bullet for the line under it. Bound to the
  token before it with `&nbsp;`.
- **`text-wrap: balance` on the display name.** The Vercel guidelines' rule for headings; at display
  scale a widow is one word of somebody's name alone on a second line.
- **An action was a peer of two facts.** `.fit-list` is a divider-separated stack giving every row
  identical treatment, and it held two facts about an appointment, a link that leaves the site, and a
  caveat — three kinds of thing, one visual language, no label on the group. The list now holds the
  parallel pair; the map link sits after it as an action.

### What I deliberately did not change

"Have you been treated for anxiety before?" and "Compare with Dr Yadav" sit adjacent with different
weights and both underlined. It looks like an inconsistency and is not one: the first reorders the
list, the second navigates to a comparison. Different jobs, different weights. Changing everything
that looks uniform-able is how an audit removes information.

### Guards

`e2e/profile-accent.spec.ts`, three tests, each watched failing: the eyebrow re-accented, the
disclosure demoted to muted instead of ink, and the wrap restored. The accent sweep also asserts it
finds *something* — a detector that matched nothing would pass the "only one meaning" check while
proving the live token had lost its own accent.

---

## O167 — the finder against the whole guidelines checklist (2026-08-21)

O166 audited the profile by eye and by canvas and fixed real faults on the screen the founder had
screenshotted. Fetching the Web Interface Guidelines afterwards and walking them found more, on
screens I had already decided were fine. **That is the argument for the checklist: it does not get
bored, and it does not agree with the person who wrote the CSS.** Two of the four are invisible in
any desktop capture.

### Fixed

- **A widow in the results headline.** At 390 it read "…the prescription, not / after." — one word
  alone on the final line of a display-scale serif statement. `text-wrap: balance` on
  `.results-head h1`. O150 established this rule for headings and O166 applied it to the profile
  name while this screen sat one route away.
- **No `theme-color`.** The browser chrome rendered its own default against a paper page, so the
  address bar showed a seam above the design on every mobile visit. Now declared in `viewport`.
- **The wordmark was translatable.** ADHD.ME is a name, a wordmark and the address somebody typed to
  get here; several locales will translate "ADHD" given the chance, and a reader with translation on
  then sees a product whose name is not the address they used. `translate="no"` on every wordmark.

### One finding was a false positive, recorded rather than quietly dropped

The probe flagged an `<img>` with no `width`/`height` on the profile — the guidelines' named CLS
anti-pattern. It is Next's `fill` variant, whose parent `.profile-portrait` carries an explicit
`height: 388px`, so no shift is possible; the rule's **intent** is met by a different mechanism.
Adding the attributes would have been redundant markup Next ignores, dressed up as a fix.

### And the checklist found the founder sweep was not sweeping the site

The founder's instruction was *"remove all mentions of founder on entire site do thorough code
audit"*, and O156 built a guard over rendered text to enforce it. Writing this unit's guard against
the same instruction turned up two ways that one was passing over live copy.

- **The head is part of the site.** The sweeps read `document.body.innerText`, so they structurally
  could not reach `app/page.tsx`'s exported title and description — both still reading "Why we
  founded ADHD.ME". A reader meets the tab before the page, and a shared link shows the description
  instead of the page. Title, description and `og:title` are now swept as text a reader meets.
- **A sweep whose coverage depended on test ordering.** `/console/verticals` has two zero states,
  and the one carrying "each item needs a specialist to review it and **the founder** to sign it
  off" only renders when vertical specs exist in a process-global store that
  `/api/mock/console` does not reset. Run alone the sweep saw the *other* zero state and passed; run
  after `verticals.spec.ts` it failed. `a11y.spec.ts` had already drawn this line for this exact
  route ("scanned POPULATED, not on its zero state"); the ownership sweep now seeds too.

Both are the same fault this session found in four registers: **the check ran in the direction its
author was facing.**

The copy replacing it corrects a second, older error in the same sentence. "A specialist to review
it" overstates the gate: W119's chain is a reviewer and then a signatory who is not that reviewer,
and `completeness.ts` says outright that it "does not require the reviewer to be a specialist". The
page now names the chain the operator actually has to satisfy.

### Guards

`e2e/guidelines-sweep.spec.ts`, four tests, each watched failing. The widow is **measured** — line
boxes via `Range.getClientRects()`, then the words falling in the last one — because asserting
`text-wrap: balance` is set would pass on a heading the browser then broke anyway; the property is a
request, and what matters is the lines it produced. `theme-color` is compared to `--paper` through a
canvas rather than string-compared, so a palette change to an `oklch()` or a `color-mix` cannot
leave it stale and green.

The founder sweep is scoped deliberately, and the reasoning is the interesting part. The first
wordmark version swept every leaf node containing "ADHD.ME" and caught three things the rule is not
for: `<title>`, JSON inside `<script>`, and the brand's name **inside a sentence**. A wordmark is an
identifier displayed as itself and must survive translation intact; a brand name inside prose is a
word in a sentence the reader has asked to be translated, and wrapping each one would fragment copy
this tree's compliance linters scan as text. Considered and declined, rather than swept up because
the pattern matched.

---

## O168 — the site-wide sweeps stop hardcoding what "site-wide" means (2026-08-21)

Not a design change. It is the guard behind three of them, and it had the same fault they did.

`e2e/ownership-disclosure.spec.ts` enforced the founder's *"remove all mentions of founder on entire
site"* by sweeping two hardcoded route arrays. Those arrays covered **34 of the 45 static routes in
`app/`**. Eleven console screens — about a quarter of the site — were swept by nothing, under a test
named *"the word is gone from every surface"*.

**This is the O167 fault one level up.** O167 found the same sweep could not see the `<head>`, and
could not see `/console/verticals` unless an unrelated spec had happened to seed it first. Both were
the check running in the direction its author was facing. A hardcoded route array is that applied to
the route list itself: it covers the pages somebody remembered on the day and stays green beside
everything added afterwards. **Adding the eleven missing strings would have fixed the gap and kept
the shape that produced it**, so the twelfth route would escape identically.

So the routes are derived from the filesystem. `discoverSurfaces` (W102) already did this — it walks
the App Router's conventions, strips route groups, skips `_private` folders — and
`public-surfaces.test.ts` already pins its output against a register in both directions. Nothing new
was built; `e2e/site-routes.ts` is an adapter. The tree could always enumerate its routes. This sweep
just was not asking.

### The hole a derived list opens, and closing it

Filter out everything with a bracket and the *dynamic* routes silently become the new unswept set.
`DYNAMIC_ROUTE_PLAN` gives each one a sample to visit or a named exclusion with a reason, and a route
missing from it fails the test — so adding a dynamic route forces its author to decide which.
Checked in both directions, W102's own rule: a plan entry naming a route that has moved is the
failure that makes a register actively misleading rather than merely incomplete.

### What the sweep found on the eleven

**Nothing.** Rendering them produced zero founder hits, and the row reports that because it measured
it rather than assuming. The gap was still real: the sweep spent eleven routes' worth of coverage on
nothing, and it would not have reported *that* either.

### Guards

Five seeds, each watched failing. A page planted in a directory no array named (caught; count went
45→46 with nothing edited). An undeclared dynamic route. A stale plan entry. O167's head sweep. And
a **collapsed derivation**, which is the one worth keeping — it printed `FOUNDER_HITS 0 over 4
routes` and would otherwise have read as a clean sweep, so the floor asserts the derived list is at
least as large as the arrays it replaced. A route that redirects is now recorded as redirected
rather than counted as swept, because a guarded screen bouncing to `/console` is a screen nobody
read.

### Measured, not fixed

Six more sweeps have the same shape. Against the 45 static routes: `a11y` covers 35, `contrast` 33,
`touch-floor` 33, `semantics` 27, `mobile-fit` 25, `keyboard-focus` 15 — every one a hardcoded array
under a name implying completeness, and the first two compliance-bearing. Converting them is not
mechanical: axe runs per page, `keyboard-focus` drives interactions, and each needs a decision about
what a sensible per-route assertion is. That is a unit, not an appendix to this one. The figures are
here so the next one starts from a measurement.

---

## O170 — the touch floor gets the derived route list (2026-08-21)

Third of the six sweeps O168 measured, and **the first one where the coverage gap was hiding real
defects.**

`e2e/touch-floor.spec.ts` covered all 15 public routes and 16 of the 30 console screens. The fourteen
it never measured were the *same twelve* `contrast` was missing — both arrays were copied from one
list on one day and neither grew afterwards.

### I said before running it that this one would find something

O169's two sweeps came back zero twice, and that was the honest result there. Predicting zero a
third time would have been assuming the tree is tidy rather than checking. O148's own row records 61
findings when it first swept the console, and a 44px floor is the rule a new screen breaks most
easily: **a control can look finished at 32px, and only a measurement disagrees.**

Three real findings, all on `/console/results`, a page nothing had ever measured:

| Control | Measured | Fix |
|---|---|---|
| `<summary>` "How this is measured" | 292×**24** | `py-[10px]` |
| `<a>` "Back to the console" | 131×**20** | `inline-flex min-h-[44px] items-center` |
| `<a>` "Detailed measurement view" | 186×**20** | same |

**Every fix is in the component, none in the sweep.** The sweep has three exclusions — inline links
inside a sentence (WCAG 2.5.8 exempts them), controls out of the tab order, `.sr-only` inputs — and
all three are principled and already written. These two links are standalone navigation, not links
inside prose, so the sweep was right not to exempt them; widening an exclusion to absorb them would
have been tuning the detector to green.

The `<summary>` fix is padding rather than `flex items-center`, which would have dropped
`display: list-item` and taken the disclosure triangle with it — a fix that trades a touch-target
defect for a missing affordance is not a fix.

### The timeout was predicted, not discovered

O169 found `contrast` sitting under Playwright's 30s default, survivable only because its route list
was short. This spec had the same shape and the same short list, so the same latent failure was
named in the claim before it was hit. 180s public, 300s console.

### The floor was stale in the way floors go stale

`population > 120` was set when this sweep visited 16 console routes. It now visits 28 and draws
**196**, so 120 would no longer notice the sweep collapsing back to roughly the list it replaced. Now
170, with the observed 196 recorded beside it — measure first, then state the figure next to the
ceiling. Both floors were seeded by narrowing the derivation, and both fired.

### Guards

Two seeds, watched failing: a 60×28 button planted on a route neither array named (caught), and a
collapsed derivation (both floors caught it). Remaining unconverted: `semantics` 27/45,
`mobile-fit` 25, `keyboard-focus` 15 — the three that need a per-route decision about what the
assertion means, rather than a mechanical swap.

---

## O172 — mobile-fit gets the derived route list (2026-08-21)

Fifth of the six sweeps O168 measured. The route change found nothing; **the run found that O167
shipped a red test**, which is the part of this entry worth reading.

### The route change

`mobile-fit` applies two different assertions and that is deliberate. Public surfaces get a strict
**per-element** check — nothing may extend past the 390px viewport's right edge. The console gets the
**document's `scrollWidth`** only, because `/console/matching` and `/console/allocation` render wide
tables reaching x=745 inside their own `overflow-x` container, which is what the guidelines require
of wide content. A per-element assertion would call those tables a defect, and "fixing" them would
mean squeezing a data table that is correct as it stands.

**I had mis-read this gap in aggregate.** O168 reported the sweep at 25/45 and I took that for a
console problem, as it was for every other sweep. The public list held **7 of 15** — eight public
pages never checked for horizontal overflow at 390px, and those are the ones under the strict
assertion. W216 exists because exactly that went wrong once: a tap-target rule revived three
`hidden sm:inline` links, `/practices` measured 453px in a 390px viewport, and every existing spec
passed while it was true.

All 15 public and 30 console routes now, per-element and per-document respectively. Zero findings.

### A generated-test loop has a vacuity shape the other sweeps don't

Every other derived sweep loops over routes *inside* one test, so a collapsed derivation trips a
population floor. Here the loop generates the tests themselves — if `PUBLIC_ROUTES` came back empty,
Playwright would report a clean run and nothing would be red, because **the assertions cannot fire
if the tests do not exist**. No floor placed inside a generated test can catch that, so the count is
asserted in a test of its own.

The seed for this was the most convincing of the session: a page planted at `/o172-seed` with a
900px div **generated its own test** and failed on it.

### O167 shipped a red test, and my batch selection is why

`e2e/landing.spec.ts:91` asserted `getByText("Why we founded ADHD.ME")`. O167 changed that eyebrow
under the founder's instruction to remove every founder-family word, and did not update the
assertion. It fails alone, not only in a batch — this was not subtle.

**It survived because I chose the verification batch by hand.** Five units in a row I picked "the
affected specs" from memory and ran those. That is a hardcoded list, selected by whoever was looking,
going green beside everything it does not name — **the exact fault these five units have been fixing
in the sweeps.** I have been deriving route lists all session while choosing my own test lists the
old way.

The fix here is the assertion. The correction to the practice is that `pnpm verify` does not include
e2e, so "green" has meant "green on what I remembered"; this unit ran the **full 55-spec suite**
instead, and that is what a unit touching shared route lists needs.

### One gotcha worth recording

Removing a seeded route does not clear `.next/types` — three stale `TS2307`s survived the delete and
failed the typecheck. `rm -rf .next` before re-verifying after any route seed.

---

## O174 — three mock fixtures failed silently, and the touch sweep measured the empty pages (2026-08-21)

The debt I recorded in O169, re-counted in O173, and twice wrote *"the unit that sizes it is still
owed"* about. Sized here, and it was worse than logged: **four controls under O14's 44px floor that
no sweep could see.**

### The mechanism

`POST /api/mock/console` **resets** the console store. `e2e/touch-floor.spec.ts` posted its fixtures
in a fixed order beginning with `console`, so the three that read `console_.practices[0]` —
`credentials`, `capability`, `education` — then read an empty list through a **non-null assertion**,
threw a `TypeError`, and returned 500. Nothing checked the status, so all three silently did not
seed.

W113 and W151 wrote those seeds precisely so `/console/credentials` and `/console/education` would
be scanned **populated** rather than on their unlinked refusal — "one paragraph and no form". The
comment directly above the offending loop says it outright: *"A gate whose population depends on run
order is a gate that gives false assurance."* O159 wrote that line, and the ordering beneath it
reintroduced the fault it describes.

A probe measured it rather than inferring it: `credentials=500 capability=500 education=500`, and
`/console/credentials` rendering **3 controls where 11 exist**. It also turned up a fourth silent
no-op I had not predicted — **`preferences` answered 405 to every run**, because that route has no
POST handler at all.

### What the sweep had never measured

| Route | Control | Measured |
|---|---|---|
| `/console/credentials` | `<input>` "Why are you withdrawing this?" ×2 | 236×**38** |
| `/console/case-mix` | `<button>` "Save" ×2 | 71×**42** |

Both fixed in the component (`min-h-[44px]`), never in the sweep. The case-mix button at 42px is the
size a control reaches when nobody measures it — two pixels under, invisible to the eye, and exactly
what a mechanical floor exists to catch.

### Where my prediction was wrong, and the measurement that caught it

The claim said the population figure would **rise** if the mechanism was real. My first restructure
dropped `console` from the fixture list entirely and the population went **196 → 190** — *down*.
That fixture is not only a reset: it seeds the demo memberships and clinicians the console pages
read. Posting it **first**, creating the practice, then seeding everything practice-dependent gives
**196 → 207**, and the four findings appeared with it.

Had I trusted the mechanism instead of the figure, I would have shipped a sweep covering *less* than
before while reporting a fix.

### The fix, and why it is not about mocks

All three routes now return **409 with a stated reason** instead of throwing; 23 false non-null
assertions went with them. A `!` is a claim to the type system that a value cannot be absent, and
when the claim is false the failure surfaces as far as possible from the decision that caused it —
here, as a silently shrunken compliance sweep two files away. W201 and W253 made the same correction
in product code.

The spec now posts `console` first, creates the practice, passes `linkEmail` on the two fixtures
that need it (a11y already did; this spec did not), and **asserts every response is ok** — so a
fixture that stops seeding fails the test instead of quietly shrinking what the sweep covers.

### Guards

`e2e/mock-fixtures.spec.ts`, two tests: the practice-less case refuses with 409 and a reason, and —
the non-vacuity half — the same fixtures seed normally once a practice exists, with the credentials
page asserted **populated** rather than merely 200. The touch sweep's own seeded failure reports
`credentials -> 409, capability -> 409, education -> 409` instead of passing over three empty pages.
The stale `observed 196` beside the population floor is re-measured to 207, one row after O170 found
the same figure stale for the same reason.

---

## O175 — the keyboard sweep reaches the console (2026-08-21)

Sixth and last of the sweeps O168 measured. **All six now derive their routes from `app/`.**

### This gap was not a partial list, it was a missing half

`a11y`, `contrast`, `touch-floor`, `semantics` and `mobile-fit` each covered the console partially.
`keyboard-focus` covered the 15 public routes and **zero console routes** — its 15/45 was 15 public
and nothing else. Every screen practice staff work on had never been checked for keyboard
reachability or a visible focus indicator.

O174 made the case concrete rather than theoretical: one unit earlier, the touch sweep — once its
fixtures actually seeded — found a withdraw-reason input and a Save button under the 44px floor on
`/console/credentials` and `/console/case-mix`. Both are **form controls on screens no keyboard test
had ever tabbed through.**

### Findings: none, and the cost objection was mine and wrong

**30 console routes, 247 tab stops, zero findings.** Every console control is reachable and every
one shows an indicator attributable to focus.

The claim said the wall-clock cost was the open question and would be measured rather than
estimated. Measured: **the whole spec, both halves, runs in 1m45s.** I had reasoned that 30 routes ×
up to 200 tab presses with a round-trip each "could be minutes per route", and a density probe
settled it instead — 240 controls across the console, concentrated in two pages
(`/console/interview` 68, `/console/usefulness` 32). No bounding, no splitting, no dropped routes.

### The walk is shared, not copied

The console gets the *same* function as the public half, not a lighter variant. A console-only copy
would drift, and the first thing to drift out of a copy is the resting-style comparison that keeps
this test able to fail at all — O153 found 14 controls that satisfied the old "has an indicator"
predicate **without being focused**, because they are permanently underlined links.

Seeding is inherited from O174 rather than re-learned: `console` first, practice second, everything
that reads `practices[0]` after, and every fixture response asserted ok.

### A figure I had wrong in five units

`CONSOLE_ROUTES` is **30**, not 28. I wrote "28 console routes" in O169, O170, O172 and O174 and in
four spec comments — eleven places, all corrected here with verified counts (`a11y`'s array covered
24 of 30, not 25 of 28; `contrast` and `touch-floor` covered 16 of 30, missing fourteen, not twelve).
The error came from adding a sweep's array length to its missing-list length instead of counting the
derived list. Correcting figures in other people's registers all session while carrying a wrong one
of my own is worth recording plainly.

### Guards

Four seeds, each watched failing **independently** — the ringless and unreachable seeds were run
separately, because the first assertion throws before the second is evaluated and running them
together would have demonstrated only one. A ringless `<button>` (caught by class and route), a
visible `role="button"` with no tabindex (`1 tab stops for 2 controls`), and both collapse floors.
The console stop floor is **measured for this walk** at `> 150` against an observed 247, not borrowed
from the public half's `> 100` — O170, O171 and O174 each found a floor that had gone stale when the
thing it bounded grew, and inheriting one here would have been that mistake made deliberately.

---

## O176 — accent discipline stops being a one-screen finding (2026-08-22)

Nine units made the *mechanical* properties measurable everywhere — contrast, touch floor, keyboard,
semantics, overflow and axe now sweep all 45 routes and all pass. **None of them can see whether a
screen is legible as a composition**, which is the half the founder actually complained about:
*"visually looks terrible … make it much more visually coherent"*.

`adhdme-taste` reserves the accent for **live tokens** — "the value that changes, the word that
matters" — and says outright: *"If everything is accented, nothing is."* O166 enforced that on the
clinician profile, where a canvas sweep found the accent painting six elements in four unrelated
meanings. It was then enforced on exactly one screen and nowhere else.

### Measured first, capped afterwards

| Surface | Before | After |
|---|---|---|
| `/clinicians` | **4** — eyebrow, checkbox, join-link, step rail | **2** |
| `/finder` | **4** — input field, action, toggle icon (×2 nodes) | **2** |
| `/clinicians/join` | 2 — mix-percent, mix-condition | 2 |
| 7 other surfaces | 0 | 0 |
| 5 other surfaces | 1 | 1 |

Three demotions, each with a stated direction:

The step rail is **kept** on the accent, and that is a judgement rather than an oversight: it shows
where the reader is in a four-step form and it changes as they advance, which is precisely "the value
that changes". So `/clinicians` settles at two defensible live tokens — progress and selection — not
one.

- **`.cv2-eyebrow` → `--muted`.** An eyebrow is a label; it never changes with what the reader did,
  so it is not a live token. O166 made exactly this demotion to `.eyebrow` on the profile.
- **`.cv2-join-link` → `--ink`, not muted.** O166's *direction* rule: taking something off the
  accent must not make it quieter when it is something the reader may want to act on.
- **`.scenario-toggle svg` → `inherit`.** The icon was accented while the control's own label is
  `--muted` and its hover is `--ink`. An icon louder than the words it belongs to is decoration
  drawing the eye — the one thing the founder's directive excludes by name.

### Three blind spots in one probe, in one unit, and all three UNDER-reported

1. **SVG `className` is an `SVGAnimatedString`**, so `String(el.className)` yields
   `"[object SVGAnimatedString]"` and collapses every SVG on a page into one bogus meaning. The
   finder read 3 where the truth was 4, and the concealed one was the accented toggle icon — an
   actual defect.
2. **`getComputedStyle(el)` does not see pseudo-elements.** `.cv2-progress button.is-current::after`
   paints the accent, so the step rail on `/clinicians` was invisible to the sweep: it reported 1
   site on a screen that had 2, and reported 3 before the fix where the truth was 4.
3. And the first design of the rule would have been an **allow-list**, which hides everything by
   construction.

**A `qa/` capture caught the second one** — the cadence requirement I nearly satisfied by filing a
screenshot without opening it. The rail is plainly accent-coloured in the image while the canvas
reported one site.

That is worth stating precisely, because this session spent nine units establishing that measurement
beats inspection and it would be easy to over-learn: the eye and the instrument fail *differently*.
The canvas cannot see what it does not query; the eye cannot resolve `oklch()` through a
`color-mix`. Here the screenshot is what made the canvas's blind spot visible, and the instinct to
assume a broken probe **over**-reports was wrong three times in a row.

### A cap, not an allow-list

O166 could name its one permitted site because it audited one screen. Listing every accent site that
exists today across fifteen surfaces would be a transcription of the current state wearing a rule's
clothes — the detector tuned until it agrees with the code, which this session has refused four
times. **A cap cannot be satisfied that way: adding a fourth accented thing fails whatever it is
called.**

The cap is **2**, and the reason it is not 1 is stated rather than hidden. "Meaning" is counted by
class, and class is a rough proxy: `/finder` paints `dual-input-field` and `dual-input-action` — two
classes, one meaning to anybody looking ("the thing you are doing right now") — and
`/clinicians/join` paints the two halves of the mix hero, the taste law's own example of a live
token. So the cap permits one meaning expressed as a pair and refuses a genuine third.

### Guards

`e2e/accent-discipline.spec.ts`. Seeded by restoring the exact pre-O176 state, which fails with
*"4 distinct accent meanings — is-current::after, cv2-eyebrow, cv2-checkbox, cv2-join-link"* on
`/clinicians` and four on `/finder`. An intermediate seed of only **one** demotion was run first and
correctly **passed at 2**, which is the more useful check: it proves the cap is a threshold rather
than a tripwire that fires on any change.
Non-vacuity is load-bearing here more than anywhere — a cap is satisfied perfectly by a detector
that finds nothing, and nothing would also mean the live tokens had lost their own accent.

Captures in `qa/accent-o176/`.

## O185 — the join form shows one question and almost nothing else (2026-08-23)

Founder-directed, with an Airtable form as the reference: *"make the short dr onboarding form
system drastically show less at once … minimalist amount of things per page."*

### What was actually on screen, counted rather than felt

O181 gave the form a sectioned view and the founder's report is that it was still a wall. Counting
step one before this unit: a two-button view toggle, a `Go to` select carrying every section name,
a progress sentence, a progress bar, then the legend and three fields. **Eight interactive controls
before the first question, five of them about the form rather than in it.** The chrome had become
most of what "at once" meant.

And one screen was a wall on its own terms: **"What you see often" was twelve checkboxes under
three sub-headings**, plus a framing paragraph and the mix echo — by some distance the busiest
thing in the form, and it stayed busy in sectioned mode because sectioning stopped at the fieldset.
`before-mobile-section3-care-wall.png` is it running past the viewport.

### Two subtractions, and one refusal

**The chrome left the top.** The counter is four characters (`Step 3 of 8`), tabular so digits do
not shuffle the line, sharing a row with a hairline rail — {#layout.shared-row}, one row instead of
two stacked. The view toggle moved BELOW the card, where something about the form belongs. The
`Go to` select is gone outright: it was a second navigation model for a form that already has
"Show the whole form", which reaches any question in one tap.

**The wall was split.** `CARE_AREA_GROUPS` was already the seam a GP reads by, so each group became
its own step — 4, 2 and 6 boxes. Six sections became eight. The sub-heading markup
(`.join-check-group`) went with them; the headings are legends now.

**What was NOT split, which is the part worth arguing.** "How you work" (9 statements) and
"Languages" (10) are longer than any care group, and {#layout.five-then-rest} would have them show
five with the rest one tap away. Both were left whole. **Splitting a flat set needs a principle for
which items come first, and neither set has one that is ours to invent**: ranking the manner
statements is this tree deciding which way of working matters most, and ranking the languages is
deciding whose language is primary. The care areas split cleanly because their seam already
existed. A rule applied where it has no honest cut produces an arbitrary order wearing the
authority of a design law, which is worse than a slightly longer screen.

### The rail was wrong first, and the measurement is why it moved

It was built full-bleed across the head of the card. A 2px bar inside a box with `overflow: hidden`
and a 14px radius **has both ends eaten by the corner curve**, so at step 1 the 12.5% fill rendered
as a detached dash floating near the corner rather than the start of a track. Inset inside the card
padding, beside the counter, it is a full-width line that begins where the content begins.

### What did not change

Every O181 safety property. Sections are hidden, never unmounted, so nothing typed is lost across
steps or a view switch; the server action still receives ONE native submit carrying every field, so
`submitApplication` is untouched; without JavaScript the whole form renders as it always did; a
server error still pulls the reader to the section holding it. **No new accent** — the sweep still
reports `/clinicians/join sites=2 meanings=2 [mix-percent, mix-condition]`, and the rail is ink for
the reason the old bar was.

### Guards

`e2e/join-form.spec.ts`, rewritten around the new shape and carrying two new assertions that pin
this unit's own claim rather than describing it: *"shows one question and almost nothing else above
it"* (no select in the card; the toggle's top edge is below the card's bottom edge, measured from
the rendered rectangles) and a **cap** — `no single step carries more than ten checkboxes` —
asserted over every step, so a future step that quietly grows past the wall fails whatever it is
called.

### A red e2e found on `main`, and it was not this unit's

The full suite surfaced `profile-accent.spec.ts` failing on `.disclosure-line`. **Established rather
than assumed**: stashing this unit's diff and re-running against `origin/main` fails identically.
It is a **fourth fossil** from `4b9c9ab`, which deleted the ownership disclosure and rewrote three
e2e assertions to require its absence — O184 restored the disclosure and swept
ownership-disclosure, profile-sweep and profile-layout, and this fourth assertion lives in a spec
about accent discipline that nothing in that sweep had reason to open. `pnpm verify` is green
either way because it does not run a browser. **That is O183's finding in a third form**, and the
standing argument for AR14's gate-state signal, still `available`. Fixed as a stale assertion, not
a product change: `contradictions.ts`'s `DISCLOSE-2` requires the disclosure by name, so a test
demanding its absence contradicted the register guarding it. Rewritten POSITIVELY, asserting the
label's text, so it cannot pass on an empty profile the way `toHaveCount(0)` could — and its
negative half re-anchored to a clause appearing only in the long form, because the phrase it used
before occurs in the short label too and would have passed either way.

Captures in `qa/join-o185/` — before and after, mobile and desktop.

## Join page (O188) — the form retired, joining is one email (`/clinicians/join`)

Founder-directed 2026-08-24 ("retire whole onboarding form for now as we want things to be
simple, make it instead send email"). The eight-section application form (O181/O185), the mix
hero (O24/O26) and the server action are gone; the page is the pitch header and one email
invitation. Captures: `qa/_runs/join-o188/email-{mobile,desktop}.png` (390×844 and 1280).

- One idea per screen: the serif statement, then a single bordered CTA — nothing competes.
- The CTA is the page's only control: 52px tall (44px floor cleared), `touch-action:
  manipulation`, hover inversion gated behind `@media (hover: hover)`, visible
  `:focus-visible` ring in accent.
- Accent discipline: ZERO accent sites on this page now (the hero's two live tokens left with
  it) — the address is a way in, not a live token, so it renders in ink. Site-wide accent
  distribution re-measured: 10 sites, cap 2 nowhere exceeded.
- Copy makes no process promise the page cannot keep: "five minutes" and every form word are
  gone (pinned in `e2e/join-page.spec.ts`), registration details are named as collected later,
  and no clinical claim, testimonial or "specialist" appears.
- Real ellipses/dashes: the em-dashes in the lead and note are typographic, names carry
  non-breaking spaces where they appear elsewhere; `tabular-nums` n/a (no changing numbers).
- The absence is pinned, not assumed: the spec asserts the form's furniture at count 0 —
  hidden-but-rendered would fail it.

## Join funnel & public navigation (O189) — logo, one journey, nine headerless pages fixed

Founder-directed 2026-08-24, verdict quoted in the ledger ("looks ugly … obviously disconnected,
there is no logo, noone can navigate clearly, the clinicians text looks weird and not obviously
clickable … do thorough design audit deploy impeccable design, rectify"), plus the follow-up to
double-check navigation consistency against published best practice. Audited under impeccable
(craft-floor loaded) with the Vercel web-interface-guidelines fetched as the online source
(navigation is real links, visible hover states, no dead zones, sticky headers must not cover
focus).

**The census finding**: the join page's missing logo was not a one-page defect — eight more
public pages (examples, faq, practices, terms, thanks, privacy ×3, about) carried breadcrumbs
but no wordmark and nothing shaped like a control. `app/public-header.tsx` is the one fix: the
sticky serif-wordmark-plus-one-pill-link shape /approach already carried, in the base palette
(story tokens are deliberately .story-scoped), on all nine pages; the join page uses it with
"For clinicians" as its right link, replacing the floating text the founder called out.

**The funnel**: /clinicians' four-stage journey used to end at "Restart pathway" — persuasion
with no destination. Its final stage now ends in the founder's phrase, "Start your journey
today", as the stage's primary act (58px pill, the stage's own button shape), landing on the
join page's email invitation, whose CTA section now opens with the same phrase in serif —
funnel language end-to-end. Restart demoted to a quiet underlined text control. The mid-journey
aside uses the same phrase.

**The sweeps policed the unit as it was built**: the first draft's wordmark shipped at 113×36
and the touch sweep went red on all nine pages at once; fixed with the story-wordmark group's
hit-area treatment (glyphs unchanged, target ≥44px). /about is founder-gated (O155) and the new
public-nav sweep skips a 404 by name rather than judging it headerless.

Pins: `e2e/public-nav.spec.ts` (every public route shows the mark and reaches home from it —
route-derived, 404-aware, non-vacuous) and the funnel walk in `e2e/join-page.spec.ts` (twelve
actions max, must meet the funnel, restart must survive demoted). Captures:
`qa/_runs/join-o188/` now shows the connected page (same path, current state).

**Copy correction (founder, same day)**: "For GPs who have completed the NSW training" removed
from the join lead and metadata — the product covers Queensland too, and the story pages already
said "NSW and Queensland" correctly. The lead now opens at the email itself; no state-scoped
training claim remains anywhere on the public surfaces (swept, not spot-fixed).

## SEO, micro-refinements & the one-screen walkthrough (O190)

Founder /goal ("implement more SEO and online learnings for optimising the site ui with
microinforments…") plus the follow-up: the /clinicians flow must "always fit on one screen, no
weird scrolling after clicking each time and make it instead have fades". Sources fetched: the
Vercel web-interface-guidelines (micro-interaction, scroll and semantic-HTML sections quoted in
the ledger row).

**SEO**: the sitemap now derives from the compliance census (it was hand-typed and missing
/demo), pinned both directions in `src/quality/sitemap.test.ts`; `theme-color` was checked and
found already present (viewport export). **Guideline items landed**: a skip link (first tab stop
on every page, hidden until focused, targeting the `id="main-content"` now on all 21 `<main>`
landmarks); `scroll-margin-top: 84px` on `[id]` so /practices' in-page anchors settle clear of
its sticky bar; explicit-property transitions on the new nav controls (never `transition: all`);
reduced-motion-gated `:active` press states on the three primary CTAs.

**The walkthrough**: the smooth scroll that travelled against the stage fade was the "weird
scrolling" — stage changes now reset instantly and the existing `cv2-stage-in` fade carries the
transition alone. The fit was measured, not assumed: stages overflowed 390×844 by up to 539px;
four measured compression rounds (height-chain probes recorded in the ledger) brought every
stage inside the viewport at 390×844 AND 1280×900 — the decisive causes were the condition list
collapsing to one column on mobile (six rows where three fit) and the practice stage's
single-file loop (now 2×2). The Acknowledgement of Country band DELIBERATELY stays on the page,
one scroll below the fold — fitting the flow is not a licence to remove the acknowledgement.
Pinned forever in `e2e/support/stage-heights.spec.ts`: every stage's bottom within the viewport
at both widths, non-vacuous (walk must cross all four stages). Captures:
`qa/_runs/walkthrough-o190/{goal,practice}-{390,1280}.png`.

## O191 — the founder's clutter verdict on the practice stage, and the scenarios that differentiate nobody (2026-08-24)

**The verdict, in the founder's words**: "why did you put unrelated content like GP skin test and
make it look so cluttered and ugly and betrayed the minimalism principle and impeccable design no
AI slop design rules, this is a huge regression aesthetically." Diagnosis owned: the skin-cancer
sentence was ORIGINAL walkthrough copy, but O190's compression restyled it into a tinted band
stacked between the stat card, a 2×2 numbered grid with sub-sentences, and three CTA elements —
six bands, no air. **The fix is deletion, not rearrangement**: the skin-cancer analogy band is
GONE (unrelated clinical content on an ADHD funnel, whatever its age); the loop's four
sub-sentences are GONE (they restated the stage lead in smaller type); the loop is now four words
in one quiet bordered band; and the height the deletions freed was RETURNED as rhythm — the
compression rounds' tightest squeezes (progress padding, back margin, hero margins) relaxed, the
O190 CSS rounds consolidated into one block so the palimpsest of overrides does not outlive its
cause. The one-screen pin re-ran green at both widths on the loosened rhythm.

**The scenarios (folded in at the founder's word mid-unit)**: "GP that will check blood pressure
before stimulants… what GP would not do that" — correct, and "takes sleep seriously" had the same
disease. Both replaced with journeys that differentiate on what the roster actually DECLARES:
(1) *Help me actually hold on to what was said* — the AI-notetaker/working-memory journey, matched
on Dr Anubhav Saxena's declared sense-making + unhurried manner; (2) *My childhood happened in
another country* — the refugee journey (founder's example), matched on Dr Anusha Saxena's declared
culturally-sensitive care and languages; a `refugee` cue added to `culturally_attuned` with its
corpus pin so the ask is heard by the matcher, all six KPI baselines re-derived from the new
447→448-sentence run. The refugee journey claims cultural attunement the roster declares, never
refugee-health expertise nobody has — if that should be CLAIMED, it needs a clinician who declares
it. Captures: `qa/_runs/walkthrough-o190/practice-{390,1280}.png` (regenerated by the pin).

## AR20 — reduced-motion equality, and the half-gate its first sweep caught (2026-08-24)

The census half proves every motion-importing file CHECKS the preference (hook, drilled prop, or
a declared `MotionConfig reducedMotion="user"` boundary — profile-stage's state, which a naive
hook-grep cannot see and is now written down and verified in both directions). The sweep half
proves the RESULT under emulated reduce across every public route: no element rests transformed,
no text rests at opacity 0. **Its first run caught a live bug**: `Reveal` (landing, y:20) and
`Rise` (sequence, y:18) gated only `initial` on the hook — but `initial={false}` tells motion to
never take ownership, so the SERVER-rendered entrance offset was never cleaned up, and reduce
users rested 20px/18px displaced on / and /approach (46 elements), then got the very slide the
gate exists to prevent when `whileInView` fired. Fixed: under reduce the element snaps to rest at
duration 0 and never watches the viewport. The visual baseline moved on EXACTLY the four cells
the fix predicts — home/approach × reduce × both widths, no-preference untouched — re-accepted
through a fresh three-run zero-diff protocol with AR20's entry in the accepted-diff register.
Captures: the visual matrix's reduce cells ARE the record (`qa/baselines/manifest.json`, AR16
entry AR20). Probe-backed: planted transformed/hidden elements are reported by the sweep's own
detector each run.

## AR21 — type from the tokens, and the training copy /practices was still carrying (2026-08-25)

The px floor O60 earned is now a law: globals.css holds zero px font-sizes (325 rem sites) and
the census fails the first one to land; inline px type is confined to the two files that already
carry AR17 exceptions for the same reason (Satori render, SVG chart debt). `tabular-nums` added
to the walkthrough's CHANGING numbers — the live mix percentage and the practice-stage figures —
and a TABULAR_SITES register asserts every declared selector's rule carries it. Honest
measurement: the tabular glyphs moved NO baseline cells (Newsreader's figures render at identical
widths in both variants at these sizes) — the rule is protection for future digits, recorded as
such. Deliberately NOT on the story stat rail: its values are phrases, not aligned numerals.
**Folded founder correction**: /practices still carried four training references O189's sweep
missed ("GP who has done the training", "required training" ×2, "Training-gated") — reworded to
say what GPs do, inside the W23 linter's constraints; its four baseline cells moved and were
accepted with AR21's register entry.

## AR26 — the three weakest zeros, strengthened to carry their kinds (2026-08-25)

AR25 classified the register's weak sentences as found; AR26 is the copy unit their entries
called for. "None open." → "No complaint is open right now." (no-results); "None yet." → "No
complaint has been resolved yet." (no-data); the register's weakest — privacy's one-word
"None." — → "No deletion has been recorded yet — the retention policy has not removed anything."
(no-data, naming the mechanism whose output the list is). Register entries updated in the same
commit (the contains-assert forces it); exactly the eight predicted baseline cells moved
(complaints + privacy × both widths × both motions), accepted with AR26's entry after a
three-run zero-diff protocol. The visual matrix's console cells are the capture record.

## O192 — the network: two interfaces over one roster, audited in rounds (2026-08-26)

Founder-directed. `/finder` asks you to describe what you need and ranks the roster against it;
`/network` shows the same people and lets you read them. Same entries, same declared strings,
same disclosure — query-first versus browse-first. The design work was four screenshot rounds
against the production build at 390×844 and 1280×900, and each round is here because each round
found something the round before had been looking straight at.

**Round 1 → 2: the dialog became routes.** The first build opened a person in a `layoutId` modal.
Three findings, one direction: the sheet was taller than a laptop viewport, so a reader scrolled
inside a scrim with the deck greyed out behind them; the shared-element flight ran the portrait
from a large card to a 132px thumbnail, so *choosing somebody made them smaller*; and no profile
had a URL, which for a surface whose job is introducing people is a missing feature rather than a
missing nicety — you could not send a friend the doctor you had just read. `/network/[clinician]`
is the fix, statically generated per GP with its own metadata. The portrait demotion is pinned as
a measured regression test (`e2e/network.spec.ts`: the profile portrait may never be smaller than
the card that led to it), and fixing it honestly moved BOTH ends — the deck narrowed 1080→760px
and the profile portrait grew 260→300px, because only widening the profile would have left the
deck's cards too wide to read.

**Round 3: the page did not know who he was.** The section heading read "What Dr Saxena says
**they** see often" for a doctor whose roster entry declares `he/him`. Singular they is not
ungrammatical; it is the sentence a reader notices, and what they notice is inattention on a
surface whose entire claim is "these are people who will understand you". `subjectPronoun()` and
`seesVerb()` derive it from the pronoun the clinician DECLARED, never from the gender field, with
"they" as the fallback that is correct for anybody. The same round found a hierarchy inversion:
`.gp-about` — the warmest content in the dataset, including the line about giving spare time to
the long-suffering cause of the Parramatta Eels — rendered in `--muted`, the faintest colour on
the page. Moved to `--ink`.

**Round 4: the deck never said how many.** "Sydney GPs today" let a reader assume a directory and
then meet two people. `honesty.claim-earned` says a count stands alone, and the honest form of a
small network is to say it is small — so the count is spelled from `NETWORK_SIZE` ("Two Sydney
GPs today"), which means a third GP joining rewrites the sentence instead of leaving it quietly
wrong. Also: the heading's "make up" is held together with a NBSP so it never wraps apart, and
the cards became flex columns with `margin-top: auto` on the last line so a short bio and a long
one still end level.

**What the compliance sweep found when the route went in**, recorded because a green gate that
was green for the wrong reason is worse than a red one. `/network` and `/network/[clinician]`
serve, in indexable server HTML, four strings the patient linters flag — and every one of them is
a real GP's own declaration that `/finder` has served since O163 behind a query. Two are the open
founder gates `prescriber-on-profile` and `mental-health-on-profile`, accepted here in the
FOUNDER DECISION OUTSTANDING form rather than answered; the other two are proper nouns ("Beecroft
Family & Skin Cancer Clinic") and ordinary English ("treats a substance history as a safety
question"). O192's contribution to those gates is recorded in the gate register itself: the
question is unchanged in kind, and the answer is now worth more, because client state behind a
query and the served HTML of a statically-generated page are not the same audience.

Captures: `qa/_runs/o192/` (deck, profile and the finder launch control, both viewports).

## O192 rounds 5–6 — the round where the audits found what the eye had been excusing (2026-08-26)

Rounds 1–4 were about arrangement. Round 5 ran the tree's own sweeps over the new routes for the
first time, and every one of them found something the screenshots had been looking straight at.

**The serif was never loading.** Eight `font-family` declarations named a CSS variable that does
not exist — seven `var(--font-newsreader)` written by this unit and one `var(--font-display)` on
`.compare-content h1` that had been in the tree far longer. An undefined `var()` in a font stack
does not fail; and — corrected by O193, which measured it — it does not fall through to the rest of
the stack either. It makes the whole declaration invalid at computed-value time, and `font-family`
is inherited, so the element computes to its parent's stack: the body's Inter. The Georgia sitting
in the same declaration never gets a chance, and neither does the bare `Newsreader` (the fonts
arrive as **"Newsreader Variable"** via `@fontsource-variable/newsreader`). So every statement on
these pages, and one heading on the finder's compare screen, had been rendering in the BODY FACE —
indistinguishable from the paragraphs beneath it — not in a serif fallback. Fixed at all eight sites, and `DECLARED_FONT_STACKS` in
`src/design/type-scale.ts` now pins the closed set of stacks the stylesheet may name, both
directions, so the next invented stack fails at unit speed instead of being read as a design
choice.

**The accent carried three meanings on the deck** (`type.accent-live-tokens`, cap 2, caught by
`accent-discipline.spec.ts`): the eyebrow, the card's way-in, and the arrow inside it. The eyebrow
gave the colour up — it is a category label sitting directly above a heading that already says
"network", and on a deck of people the word that matters is the one that opens somebody's page.

**Round 4's "cards end level" fix had never run.** It was appended as a second
`.network-card-open` rule while the original `display: block` sat further down the file, so at
equal specificity the later declaration won and the flex column was dead CSS — visible in the
captures as the two "Read what … says" lines still sitting 24px apart. Merged into one rule.

**The statement was the narrowest text on the profile.** Beside a 300px portrait inside a 720px
page, the sentence a doctor leads with had a 348px measure — about four words a line — while the
bio two sections below ran the full 680px. Round 3's hierarchy inversion again, in space instead
of colour. It now runs across the measure at `clamp(1.25rem, 2.6vw, 1.5rem)`, which is what
`type.serif-display` asks a statement to be. Round 6 then bottom-aligned the identity block to the
foot of the portrait: with the sentence gone from that column it held a name, a pronoun and a
practice against a 375px photograph, and a gap at the bottom of a composition reads as unfinished
rather than as air.

**Two people, presented unequally, by accidents.** Dr Anubhav's headshot has a grey backdrop and
Dr Anusha's is near-white, so on paper one read as a photograph and the other as a cutout floating
loose — every portrait now carries a hairline of its own. And the deck's call to action used
`shortName`, which the roster disambiguates for her ("Dr Anusha Saxena") and leaves bare for him
("Dr Saxena") — correct in a result row read one at a time, and side by side it quietly makes him
the default Saxena. Both cards use the full name. The onward "also in the network" portrait went
from 64px to 96px for the same reason round 1 exists: a face is why somebody clicks, and a 64px
face is an avatar.

**Two gate defects found off this unit's own surfaces, fixed rather than excepted.** The contrast
detector (`e2e/support/contrast-load.ts`) read `backgroundColor` only, so a `linear-gradient`
ground — the landing page's `.story-chapter-country` — computed as transparent and the walk
climbed past a solid brown band to the body's cream, reporting that section's deliberately cream
text at 1.06:1. The false PASS is the worse half and the reason it is fixed: dark text on a dark
gradient would have been measured against the light body and waved through. The detector now
reads gradient colour stops and takes the worst case against the foreground; both mutation probes
still go red on genuinely bad text. And the working-truth sweep listed its dynamic visits by hand
rather than reading `DYNAMIC_ROUTE_PLAN`, so `/network/[clinician]` arrived with a proof no test
could reach — which also hid that the proof itself was wrong (`innerText` returns RENDERED text,
and the heading is `text-transform: uppercase`).

Captures: `qa/_runs/o192/`, re-taken after each round at 390×844 and 1280×900.

## O192 round 7 — the two things that were written but not published (2026-08-26)

Both findings are the same shape: work that exists in the source, passes every check around it,
and reaches no reader.

**A copy constant nobody could see.** `NETWORK_COPY.finderBridge` — "Would rather describe what
you are looking for and have the list ordered around it?" — was written in round 1, linted by
`gallery.test.ts`, counted by `networkCopyStrings()`, and rendered nowhere. Kept-but-unused code
is this tree's own named disease (O186/O187) and a copy constant is its quietest form: every test
around it goes green while the sentence is invisible. Rendered rather than deleted, at the end of
the purpose band, because a reader who has read everybody and is still unsure needs a next step in
the prose and not only in a floating corner control — and stating the relationship between the two
interfaces in a sentence is the differentiation the founder asked the two URLs to carry. The link
reads "Open the finder", deliberately near-identical to the corner control's "Launch the finder"
rather than identical: the e2e caught the first attempt, where matching the label exactly put two
links with one accessible name on the same page. The spec was scoped to `.interface-launch` in the
same change, so it tests the corner control it names instead of any link with that text.

**Every GP's page was missing from the sitemap.** `app/sitemap.ts` dropped all dynamic paths — the
right rule while `/book/[token]` was the only one, since a tokened page is reached by invitation
and robots.ts disallows the whole prefix. `/network/[clinician]` is its opposite in every respect:
statically generated from a build-time roster, linked from `/network`, crawlable, and precisely
the pages whose indexing hold the founder lifted. Caught by the same filter, they were findable by
following a link and by nothing else, which left that decision half-implemented. A dynamic census
path now either declares an expansion into real URLs (`EXPANDED_DYNAMIC_PATHS`) or is deliberately
absent, and the invariant that mattered is unchanged and still asserted: no path template is ever
advertised, and every URL traces back to a census entry. The booking page's exclusion has its own
test now, so the case the original rule existed for cannot be lost while the rule is generalised.

The accent stayed inside its cap through both: the bridge link is ink with an underline, because
`/network` already spends its two permitted meanings on the card's way-in, and putting one colour
on "open this doctor" and "go use the other interface" would say they are the same invitation.

## O192 round 7b — round 3's fix, finished (2026-08-26)

Round 3 taught the profile heading to use the pronoun a clinician declared, and stopped there. A
re-read of the same page found the same mistake twice more in smaller type: the fact list said
"How **they** consult" and "Yes, as at the date **they** told us" for a doctor whose roster entry
declares he/him, and the voice label read "In **their** words" on a page about one man. That last
one was inherited from the deck, where "in their own words" is correct because the deck is about
everybody — the subject changed from a roster to a person and the sentence did not.

The cause was shape, not oversight: round 3 shipped a `seesVerb()` helper, one function for the
one verb it happened to need, which makes the next verb somebody else's problem. It is now
`verbFor(clinician, base)` — `seesVerb` is defined in terms of it, so the two can never disagree —
plus `possessiveFor()` for his/her/their. Both fall back to the form that is correct for anybody
and wrong for nobody, and a test walks the real roster so no profile can render "In undefined
words".

Small, and worth the round: a page whose whole claim is that these people will pay attention to
you cannot be the thing that gets somebody's pronoun wrong three times.

## O192 round 7c — the corner control was sitting on the disclaimer (2026-08-26)

Found in the mobile capture of `/finder`, not on the network's own screens: the return control
("‹ The network") is fixed bottom-right, and at 390px the demo disclaimer runs the full width, so
the pill landed on its last line — "…are p[rovided by the] destination." A sentence that exists to
tell a reader what this demo is was the one thing on the page you could not finish reading. At
1280 the note is centred and the control clears it entirely, which is why four rounds of desktop-
first looking never showed it.

Fixed by reserving the control's own height (44px plus its 20px offset, plus air) at the widths
where the collision happens, scoped to `.patient-v2` — the finder's wrapper and nothing else. The
words move up rather than shrinking: a disclaimer nobody can finish is not a disclaimer.

## O192 round 8 — the states nobody had looked at (2026-08-27)

Rounds 1–7 audited the deck and a profile at 390 and 1280. This round went after what that misses:
tablet width, `prefers-reduced-motion`, the keyboard path, and the page a reader meets when a
`/network/…` link is wrong. Two of the four produced findings.

**The launch control sat on a doctor's own sentence at 768px.** At 1280 the 760px content column
ends at x≈1020 and the wide two-line pill starts there — touching, not clear. At 768 the column
runs the full width, so the pill landed on Dr Anusha's card, covering her declared line and her
first signal chip. No amount of bottom padding fixes this, because the page scrolls underneath a
fixed control; the honest fix is to make the control smaller wherever content passes beneath it.
The hint line now hides below 1300px rather than below 700px. A floating control overlapping
generic chrome is an accepted convention; one covering a named doctor's own words on a page whose
premise is "these are their words" is not. The sentence the hint carried was not lost — round 7
had already put it in the purpose band as prose, where it cannot cover anybody.

**The 404 for an unknown GP pointed away from the network.** `network.spec.ts` asserted the status
code and stopped, so nobody had looked at the page: a reader following a stale link to a doctor got
the site 404, was told the link was dead, and was offered "Find a GP" and "Start from the
beginning" — everything except the list they were reaching for. `app/network/not-found.tsx` is the
scoped boundary Next renders instead: same manners as the site page (plain sentence, nothing
blamed on the reader), and it can now say which list this was and how many GPs are in it, derived
from the roster. It deliberately does not guess a clinician — "did you mean Dr X?" would be this
product recommending a named doctor to somebody who described nothing, which is the finder's job
and only ever on what a reader asked for. The test was widened from a status check to the status,
the heading, and the door back working.

**Clean, and recorded as clean so the next round does not re-check them.** The keyboard path is
skip-link → wordmark → Questions → card → card → the in-prose finder link → footer, every stop with
a visible 2px ring; round 7's bridge link turns out to also give a keyboard user a route to the
finder well before the fixed corner control, which sits last in DOM order. Reduced motion renders
the deck static with no residual transform, as `motion.reduced-motion` requires. The deck at 768
keeps two columns and stays readable.

## O192 round 9 — the round that found nothing, and why that ends it (2026-08-27)

320px: the width where the deck's `minmax(280px, 1fr)` plus 20px of padding either side finally
meets the room available, and the last one the earlier rounds had not measured. Deck and profile
both render at `scrollWidth == innerWidth` — no sideways scroll — in one readable column, with the
compact launch control landing over a portrait rather than over anybody's words.

Nothing was wrong, so nothing changed. What the round produced instead is a **pinned guarantee**:
`e2e/network.spec.ts` now asserts no horizontal overflow on both routes at 320, with a vacuity
guard on the viewport itself. A card gaining one padding step is all it would take to break this,
and a page that scrolls sideways on a small phone is discovered by the reader rather than by a
screenshot taken at a comfortable width.

**This closes the audit.** Nine rounds, and every one before this produced a finding: the modal
that made people smaller, the pronoun a heading got wrong, the warmest copy in the faintest colour,
the count the deck never stated, the serif that was never loading, the accent spending three
meanings, dead CSS from a duplicate selector, a statement narrower than the prose beneath it, two
things written and never rendered, a control sitting on a doctor's own sentence, a 404 pointing
away from the network. Round 9 is the first to come back empty, and an audit that stops finding
things is finished rather than in need of a tenth pass. The surface is now as warm as the roster's
own declarations allow — going further would mean writing sentences about real doctors that they
did not say, which `honesty.clinician-declaration` refuses and which no amount of design polish
would make acceptable.

What is deliberately still open, so the next reader does not mistake silence for resolution: two
founder gates (`prescriber-on-profile`, `mental-health-on-profile`) recorded rather than answered,
and the CI blocker on PR #21, which is an account-level GitHub Actions problem predating this
branch by weeks.

## O193 — the one site O192 changed and nobody looked at (2026-08-27)

O192 corrected eight `font-family` declarations naming an undefined CSS variable. Seven were on
`/network*` and its own rounds verified them by screenshot. The eighth — `.compare-content h1`, on
the finder's compare screen, and older than O192 by a long way — was corrected in the same sweep
and shipped **unverified**, which is precisely the shape of the defect O192 existed to catch: a
change every test accepts and no eye has checked.

**The screen is fine, and that was worth confirming rather than assuming.** Captured at 390 and
1280 with the pre-fix stack restored for a true before/after, not a remembered one. "What each of
them answers" now renders in Newsreader at the same 30px / 400 / −0.3px it always declared —
identical box (45 × 572 at desktop), one line at mobile — so nothing had been tuned around the
wrong face. No change needed.

**The measurement corrected the record, and that is this unit's real finding.** O192 wrote — here,
in `type-scale.ts`, and in the ledger — that the undefined `var()` "falls through" to the next name
and left those headings in **Georgia**. It does not, and they were not. An undefined `var()` makes
the whole declaration *invalid at computed-value time*; `font-family` is inherited, so the element
computes to its **parent's** stack — the body's Inter. The Georgia sitting in the same declaration
never gets a chance, and neither does the bare `Newsreader`. So the headings were rendering in the
**body face**, indistinguishable from the paragraphs beneath them.

That is a worse defect than the one recorded, and a more useful lesson: a fallback placed after a
`var()` in a font stack buys nothing. The wrong version implied the stack degrades gracefully. All
three copies of the explanation are corrected, and `e2e/compare.spec.ts` now pins the computed
family on this heading, so the one site that shipped unverified is the one site that can no longer
regress silently.

Captures: `qa/_runs/o193/` (before and after, both viewports).

## O197 — an Emil pass on the network, and a landing page for it (2026-08-27)

Two founder instructions in one unit: apply Emil Kowalski's motion lens to the network, and give
the network a landing page of its own that says what it is for. The finder was parked on
`finder/standalone-deployment` at the same time, unchanged, for the separate domain the founder
wants it on later.

**The motion inventory found less motion than expected and worse motion than expected.** Five
transitions on the network used a bare `ease` — the browser default, which nobody chooses, they
just fail to replace. One ran at 420ms, well past Emil's 300ms ceiling, on the portrait hover. One
was dead: `.network-card-open` declared `transition: transform 180ms ease` and nothing in the sheet
ever transformed that element. And there was **no press feedback anywhere on the route** — the
deck's cards, the launch control and the profile links all changed nothing at the moment of the
tap, which on a touch screen is the one moment feedback is actually load-bearing.

Fixed as one named curve and one honest use of it. `--ease-ui: cubic-bezier(0.32, 0.72, 0, 1)` is
now the tree's single UI curve; the portrait hover came down to 240ms and its scale from 1.03 to
1.02; the dead transform transition became a real one behind a new `:active` state. Press feedback
is `scale(0.99)` on postcard-sized cards and Emil's canonical `scale(0.97)` on the pill-sized
launch control — the smaller the control, the larger the proportional squeeze needed to read.

**Reduced motion keeps the press states and drops the hover.** Both are "static equals" and they
are not the same static equal: feedback's is INSTANT feedback, not absence, so `:active` still
applies with the transition removed; a decorative hover flourish's is genuinely nothing, so the
portrait scale becomes `transform: none`. Getting this backwards — killing both — is the common
mistake and it makes a reduced-motion user's interface feel broken rather than calm.

**`/mission` is the landing page.** One idea, one door. The founder's mission sentence is set in
the serif directly under the heading, then how the network works in the present tense, then how big
it actually is — two GPs, one state, derived from the roster — and then a single door to
`/network`. The scope paragraph sits **above** the door deliberately: somebody about to meet two
doctors should learn there are two on the screen that told them what the network is aiming at, not
after the click.

The header's right-hand door is `/network` rather than `/finder`, and there is no launch control in
the corner, because a landing page with exits to two products makes the reader choose before it has
told them anything. The footer gained a "Why this exists" door directly after "The network" — a
public route nobody can navigate to is reachable only by somebody who already knows the URL.

**One thing the footer edit found on its way past.** The gated About-us door was spliced in at
`slice(0, 4)` — "after Questions", written as a number. Adding a door above it moved About up a
slot without failing anything, because `TEAM_PAGE_PUBLIC` is false and the branch is dead. It is
now a lookup on `/faq`'s position. A dead branch that quietly means something different is worse
than one that is simply dead: the day the founder ungates the team page, nobody re-derives the four.

Captures: `qa/_runs/o197/{mission,network}-{390,1280}.png`.

## O198 — the network argued its purpose twice, and a hover found a rule (2026-08-27)

**The duplication was mine, one unit old.** O197 built `/mission` to argue why the network exists.
`/network` has argued the same thing since O192 in its purpose band, and the mission page's `howBody`
was written without reading the paragraph it was about to duplicate. Side by side they carried the
same facts (languages, where they consult, how long a first appointment runs), the same two claims
(their own words, not ranked) and the same closing move (you decide who sounds like a fit / like
somebody you could talk to). Two copies of one idea in two files, which drift the first time either
is edited.

`layout.one-idea` decides which half survives and it is not a coin toss: the mission page's one idea
IS the argument — that is why a separate page was asked for — and the deck's one idea is the people.
So the band gave the argument up and became what it now says it is: **"Two other ways to go from
here."**, the mission door first, the finder door second. The mission door leads because a reader who
has just read two people has the bigger question, and because ending the page on the finder would
end it on the thing that leaves this interface entirely. `finderBridge` stays rendered for the reason
round 7 restored it: the corner control is not prose, and this sentence is what says what the two
interfaces are to each other. `.network-purpose-body` was deleted with the paragraph it styled —
kept-but-unused CSS is this tree's named disease (O186/O187).

**"Two" is a claim, so it is checked.** The band says two and the e2e asserts the band holds exactly
two links (`honesty.claim-earned`). And the duplication itself is pinned as a phrase-overlap test
rather than a string equality, because the defect was never two identical strings — it was two
paraphrases. Proven non-vacuous by restoring the old copy and watching it fail.

**The re-capture found a defect nine audit rounds had missed, and the reason it hid is the
interesting part.** `.network-card-more` — a card's "Read what Dr X says →" — is the last item in a
column flex container, so it stretched to the card's full width and its hover `border-bottom` ran
**110px past the end of its own text at 1280 and 114px at 390** (measured: box 346, text 236). At
that ratio it stops reading as a link underline and starts reading as a rule drawn across the card,
which is the more emphatic thing and the wrong one.

It hid because **a hover state only exists under a cursor, and full-page captures are taken without
one.** O192's nine rounds all captured at rest; this unit's re-capture happened to leave the pointer
on a card after dismissing the consent bar. `align-self: flex-start` is the whole fix — `margin-top:
auto` still does the pushing — and the box now equals its text to the pixel at both widths, pinned in
`e2e/network.spec.ts` as a measurement so the next person does not have to park a pointer to find it.

**Two things in these captures are stitching artefacts, not defects**, recorded so the next reader
does not chase them: the sticky site header appears mid-page at 390 (Chromium's full-page capture
stitches scroll positions, and a `position: sticky` element lands where the viewport was), and the
fixed launch control appears over a card for the same reason. Both are correct in a live viewport,
and O192 round 8 already ruled on where the compact pill may sit.

Captures: `qa/_runs/o198/{network,mission}-{390,1280}.png` — the network shots taken WITH the first
card hovered, so the state that was wrong is the state on the record. They also replace the O197
captures, which were shot before the footer door landed and so never showed what shipped.

## O199 — the hover clause nobody was keeping (2026-08-27)

**A rule the register reported as covered, that no check had ever read.** `adhdme-taste`
`interaction.hover-focus` says hover styles are gated behind `@media (hover: hover)`. The AR1
register named three enforcers against it — the two keyboard-focus tab-walks and AR23's focus-ring
census — and every one of them enforces the FOCUS half of that sentence. **37 of the stylesheet's 53
`:hover` rules broke the hover half.**

The question came from O198, which found its defect by luck: a hover underline running 110px past
its own text, latent since O192 and invisible to nine screenshot rounds, because a hover state only
exists under a cursor and every capture in this tree is taken without one. Luck is not a control.

**Measured before building, and the first two measurements were wrong.** A crude scan said 42 of
54 — one of the 42 was a sentence of PROSE inside a comment that quoted a deleted selector, and four
more were `prefers-reduced-motion` blocks, which are legitimately outside a hover gate because they
override an already-gated rule. Masking comments and classifying the overrides gives the real
figures: **53 rules, 12 gated, 4 reduced-motion overrides, 37 ungated.**

**What this unit does not claim.** The obvious harm is sticky hover on a phone, and it was probed
rather than asserted. `(hover: hover)` is indeed false under device emulation, so ungated rules do
apply there — but after tapping a card and navigating back, nothing matched `:hover`. The first
probe reported a stuck style and that was the instrument, not the product: the tap navigated, so the
element it re-read was null. Emulated Chromium is not iOS Safari and this does not clear the rule;
it does mean the record says **a law nobody was keeping**, not a bug anybody has seen.

**The trap that makes a mechanical fix worse than the violation.** 14 of the 37 paired `:hover` with
`:focus-visible` (or `:focus-within`) in one selector list. Wrapping those whole would have deleted
the FOCUS style on touch devices — a real regression, and a worse one than the unenforced law it
fixes. They were **split**: the focus half stays ungated, the hover half moves inside the gate. Every
rule kept the declarations it had; nothing was restyled, and nothing moved position — a media query
adds no specificity, so wrapping in place preserves the cascade exactly.

**All 37 fixed rather than a remainder pinned**, unlike O196's 146 vacuous assertions: these were
mechanical and fully classified before the first edit, so a ratchet above zero would only have
invited somebody to satisfy the census by editing a number. `HOVER_EXCEPTIONS` ships empty and is
declared in `LEGITIMATELY_EMPTY` for exactly that reason — a check that needs a violation to exist
in order to be non-vacuous is the wrong check.

**One ratchet rose, and it is worth reading carefully: AR17's raw-hex census, 87 → 91, with not one
new raw hex authored.** Four of the split rules already carried a hex in their declarations, and a
split necessarily copies the declarations, so each appears twice where it appeared once. Verified
rather than assumed — the multiset difference between the sheet before and after this unit is
exactly `#ffffff`, `#fff`, `#6f1e31`, `#000` and nothing else.

Captures: `qa/_runs/o199/` — the same control on a pointer device and on an emulated touch device.
At rest nothing changed, which is the point: this unit changes *when* a hover style applies, not
what it looks like.

## O200 — a tenth of the stylesheet styled nothing (2026-08-27)

**Found by accident, for the second unit running.** O199 ended by checking whether gating hover had
broken two reveal-on-hover affordances — `.match-portrait:hover .portrait-nav` and
`.cv2-coming-grid button:hover .cv2-coming-tooltip`. It had not, and the reason was worse than the
bug being looked for: **neither selector matches any markup.** Both style elements the application
never renders. Kept-but-unused code is this tree's named disease (O186/O187), and twice in two units
a dead selector turned up while looking for something else. That is the argument for asking the
general question instead of waiting for a third.

**95 of 596 styled classes — 16% — were dead.** Measured as the sheet's own before/after rather than
as a sum of the two passes, because seven of the eight the second pass caught were already in the
first pass's 92 and adding the lists would have double-counted them. The removal is **23,358 bytes
and 1,280 lines: 9.7% of the stylesheet every visitor downloads.** Ten more rules paired a dead selector with a live one, so
those had the dead *selector* pruned rather than the rule deleted; one `@media` block was left empty
and went with them.

**The first deletion pass missed 8, and the census agreed with it — because both shared a blind
spot.** The selector pattern matched a rule only when it followed a closing brace or the start of
the file, which skips **the first rule inside every `@media` block**. So `.match-count:hover,
.icon-button:hover`, sitting first inside a hover gate, survived a deletion pass AND a census that
reported the sheet clean. One of the eight — `story-change-grid` — had never even been counted as
*styled*. The pattern now matches after `{` as well; a media prelude cannot be swept up by accident
because it contains `@`, which the selector class excludes. This is the third scanner bug in three
units, and the reason each was caught is the same: the check was landed in the tree, where it keeps
disagreeing, rather than run once from a script.

**The classifier was wrong three times before it was right, and the third one is the good one.**
A bare "never appears in source" scan said 122 — but `` `seq-w-${i}` `` builds a live class that
never appears as a literal. Crediting every `prefix-${` rescued 46 — but most of those prefixes were
**data ids**, not class names: `iv-${code}` is an interval id, `row-${index}` a record id,
`clinician-${i}` an error key. Only nine template prefixes are ever used inside a `className`.

Then the corrected classifier reported **89 where the unit had measured 92**, and the three it lost
were `match-portrait`, `portrait-nav` and `cv2-coming-grid` — **the very selectors named in the new
module's own header comment as examples of dead code.** Writing the documentation made the classes
look alive. It is O199's scanner bug in the mirror: that one read a CSS comment as a rule, this one
read a TypeScript comment as a usage. With comments stripped, two independent implementations — one
Python, one TypeScript — agree exactly on 92.

**The verification is that nothing moved, and it took two instruments because one was not sound.**
Fifteen public routes captured at 390 and 1280 on the pre-deletion sheet and again on the
post-deletion sheet: **28 of 30 byte-identical.** The two that differed were both `/` — and before
reading anything into that, the page was captured twice against the *same* sheet and differed from
itself. The story landing is not deterministic; its scroll-linked reveals are mid-flight and it even
mounts a different number of DOM nodes between runs, so pixels cannot decide it.

So `/` was decided by computed style instead: every rendering element identity present in both
builds, across 23 properties, at both widths. **100 element identities compared, zero non-transform
differences.** The only differences anywhere were `transform` on six scroll-animated elements
(sub-micron mid-flight values like `matrix(1,0,0,1,0,3.46e-05)`) and three properties on `<script>`
elements, which never render.

Captures: `qa/_runs/o200/{before,after}/` — 15 routes × 2 widths × 2 sheets.

## O201 — the profile said a doctor's degrees were what she sees often (2026-08-27)

**The heading described a field it did not render, and it said so to a patient.**
`/network/[clinician]` carried *"What Dr Anusha Saxena says she sees often"* over
`clinician.experience` — which is career history and qualifications: "Medical degree, Australian
National University", "Diploma of Child Health", "Fellow of the Royal Australian College of General
Practitioners", "Hospital training across NSW". A reader deciding whether this GP handles their
situation was being told a CV was her caseload.

What she says she sees often is `fitSignals` — "ADHD assessment", "Mental health focus", "Women's
health" — and the deck card already renders it correctly.

**Not a taste call: two other surfaces in this tree label the same things correctly.** `/finder`'s
profile renders `clinician.experience` under `Credentials and experience`. And
`src/directory/render.ts` holds the canonical heading for the *other* concept — "Areas this
clinician sees often" — shipped with an attribution ("Told to us by the clinician…") and an explicit
denial: *"This is not a specialty and not a qualification."* The network profile was the only
surface pairing that heading with that field, while the tree's own framing for the concept exists
specifically to deny that those entries are qualifications.

**Whose sentence was fixed matters.** `honesty.clinician-declaration` forbids characterising a
doctor, and every string in that list is hers. The heading is ours — the page's own header says "the
headings are ours and they say so" — so this changed our sentence and not one word of hers. The
section now reads **"Credentials and experience"**, matching `/finder`'s wording, and the list under
it is unchanged.

**Relabelled rather than rewired, and the reason is a founder gate.** The richer fix — render
`fitSignals` under the existing heading — would owe the reader `SCOPE_FRAMING`'s attribution and
denial, and that constant lives in `src/directory/`, which this surface deliberately does not
import: `gallery.test.ts` enforces the absence on the import lines because minting directory copy is
**G6**. A properly framed sees-often section on the network profile is real follow-on work and it is
the founder's to authorise, not this unit's to take.

**Why nine audit rounds missed it.** Every round read the list as a credentials list — which is what
it is — and none read it against the heading above it. The pin added here is a content agreement
rather than a string match: no `.gp-label` on any profile may claim a caseload, on every clinician
in the roster, and the credentials section must still render every entry. Proven by restoring the
pre-fix heading and watching it fail.

`seesVerb` went with the heading — a one-line wrapper over `verbFor(clinician, "see")` whose only
production caller was that sentence. Keeping it for a section that may return under G6 would be the
kept-but-unused code O200 spent a whole unit deleting.

Captures: `qa/_runs/o201/` — the profile at 390 and 1280, before and after.

## O202 — the network became a gallery (2026-08-27, founder-directed)

Founder verdict, verbatim: *"network section it does not look aesthetic enough and is too wordy to
navigate, make it a more modern gallery."*

**Measured, because "too wordy" is checkable.** Each card stacked six things under the portrait:
name, suburbs, a full declared sentence, three chips, a languages line, and a way-in naming the
doctor a second time. **74 words across two cards.** Every fact in it is repeated on the profile one
tap away. The gallery card carries three: name, where they consult, and the areas as chips — **27
words, 64% less.** Page height at 390px fell from 2,893px to 2,556px.

**What went, and where it went.** The declared sentence (`matchLine`) and the languages line are on
the profile, and an e2e pins that they are one tap away rather than gone — a gallery that dropped a
doctor's own words would be a different and worse change than one that relocated them. The six-word
way-in became an arrow: on a card whose whole surface is already a link, *"Read what Dr Anubhav
Saxena says →"* was a button drawn on a door.

**This supersedes O192 rounds 2 and 5 rather than forgetting them.** Round 2 put the signal chips on
the card because it said too little; round 5 spelled the way-in with the full name so two Saxenas
were addressed identically. Both were right answers to the question being asked then. The founder
has now looked at the built thing and asked the opposite question, which is better evidence than
either round had. Round 5's equality survives where it now lives — the name itself, which is the
card's heading.

**The first arrow placement was wrong and the capture killed it.** `justify-content: space-between`
pinned it to the card's right edge, about 150px from a short name — floating rather than belonging.
A far-edge arrow is a common gallery pattern and it is the wrong one here: `layout.shared-row` is
about joining two things in one glance. Set directly after the name, the pair reads as one phrase:
"Dr Anubhav Saxena →".

**The hero lost 14 words and none of its honesty.** Its middle clause enumerated what the pages
carry — "their languages, where they consult, and what they say they see often" — which is now the
mission page's own paragraph, near word for word. That is the O198 duplication in the hero. All
three things the sentence exists to do survive and are each pinned: the count derived from the
roster (`honesty.claim-earned` — a two-GP network may not read as a directory), that the pages are
the doctors' own words, and the denial that any of it is ours
(`honesty.clinician-declaration`). What got cut is the part that repeated another page.

**Section rhythm.** `.network-purpose`'s 72px top margin was measured against cards that stretched to
level themselves against a bio. A gallery card ends at its chips, so the same margin read as a hole
between the people and the doors — 56px now.

Kept throughout: every string is the roster's, the 44px card target, palette tokens, hover gated
behind `@media (hover: hover)` (O199), press feedback (O197), and a static equal under
`prefers-reduced-motion` — the arrow stays accented and pointing, it just does not travel.

Captures: `qa/_runs/o202/{before,after}-{390,1280}.png`.

## O203 — the worked examples were a template run three times (2026-08-27)

**Found by reading a capture I already had.** O200 shot fifteen public routes to prove its deletions
changed nothing; the proof passed and the pictures were never read for their own sake. `/examples`
opens with *"this page shows what the product actually does, not what a brochure says it does"* — and
then rendered, three times over, the same sentence differing by one digit, every one ending "Shown
first: Dr Saxena". The page's own opening sentence was the standard it failed.

**Three defects, and the measurement corrected my reading of the third.**

**One — the name was ambiguous, and O192 already ruled on it.** `shortName` is "Dr Saxena" for BOTH
GPs on this roster; the roster disambiguates hers and leaves his bare. Round 5 fixed exactly this on
the network deck. Here it was worse: three examples all reading "Shown first: Dr Saxena" left a
reader unable to tell whether that was one doctor three times or two different people — quietly
erasing the difference the page exists to show. Full names now.

**Two — "From that request" had no antecedent.** No request appears anywhere on the page, and none
can: the page's own header records that a first draft rendered the demo requests verbatim and the
rendered-copy sweep REFUSED the page, because those sentences carry clinical vocabulary a
patient-facing page may not repeat. That control is working and this unit does not touch it. So the
constraint is disclosed rather than hidden — *"The scenarios themselves are not printed here: they
are written as somebody would really say them, and a public page may not repeat that language. What
is printed is what the finder made of them."* — and the dangling phrase is simply deleted. That is
the more honest version of the page, not a softer one.

**Three — I claimed the page discarded per-scenario detail. It does not, and measuring said so.**
All three archetypes genuinely rank the same GP first and produce the same order; the only thing
that differs is how many asks the finder read (2, 2, 3). The sameness is not a rendering failure,
it is the true answer. So it is now stated rather than left looking like variety: *"All three land
on the same GP first, and that is what a network this size looks like rather than a finding about
anybody: with two listed GPs there are not many orders available."* Derived from the results and
from the roster count, so the day a third GP joins and the orders diverge, the sentence stops
appearing on its own.

`honesty.claim-earned` is what makes that a defect rather than a nitpick: three sections that look
like three demonstrations, when they are one demonstration run three times, is a page overstating
itself.

Verified where it matters: `e2e/public-sweep.spec.ts` — the rendered honesty sweep that refused the
first draft of this page — is green on the new copy, and both candidate sentences were run through
the W23 and W6 linters before either was written into the page.

Captures: `qa/_runs/o203/{before,after}-{390,1280}.png`.

## O204 — the FAQ said ADHD.ME was "a finder" (2026-08-27)

**Found the same way O203 was: by reading another of O200's captures for its own sake** rather than
as a deletion proof. `/faq` answered the product's most basic question with *"A finder. You describe
what you are looking for in your own words…"* — true until O192, which gave the product a second
interface. The word "network" appeared nowhere on the page for five units afterwards.

**Three things made this worse than a stale sentence.**

**`/network`'s own header sends readers here.** O192 chose `/faq` as the network's top-right door
precisely because it "offers the door the network does not: the questions a reader has before they
read anybody". The network was routing its readers to a page that did not describe the network.

**"How is the order of GPs decided?" answered "only by matching what you asked for."** On `/network`
nothing is matched and there is no order beyond the roster's — so a reader who had just browsed the
network was told their experience had been ranked when it had not. On the page the compliance
register calls the likeliest in the product to be quoted back to somebody.

**The FAQPage JSON-LD is generated from the same list.** So the out-of-date answer was published to
search engines as structured data, not merely rendered as prose. Verified after the fix by parsing
the served HTML: three `ld+json` blocks, the FAQPage one now carries all three corrected answers and
no longer contains the old sentence anywhere.

**And the founder's own plan sharpens it.** O197 parked the finder on `finder/standalone-deployment`
for a separate domain. On the network's own domain, "A finder" would not be out of date — it would
describe a product that is not there.

Three answers changed, not a rewrite. What ADHD.ME is, said as the two interfaces it has. How the
order is decided, made true of both. And a new question — *"What is the difference between the
network and the finder?"* — which is the founder's own differentiation question and the one a reader
arriving at either URL actually has. It is answered in the same terms the launch control is built
on: the network is a place you arrive at, the finder is a tool you start; nobody is added or removed
by the choice.

All three answers were run through the W23 and W6 linters **before** either was written into the
page — the order that made O203 safe — and `e2e/public-sweep.spec.ts` is green on the rendered page.

Captures: `qa/_runs/o204/{before,after}-{390,1280}.png`.

## O205 — the privacy notice described one of two interfaces (2026-08-27)

**Asked as the general question this time.** O203 and O204 were the same shape — copy that went
stale when O192 added a second interface — so instead of reading one more capture, the whole public
surface was scanned for it: rendered text of fourteen routes, counting mentions of the finder against
mentions of the network. Three surfaces named the finder and never the network: `/` (1/0),
`/approach` (2/0), and **`/privacy` (7/0)**.

**The privacy notice is the one that mattered, and its own header is the argument.**
`app/privacy/page.tsx` line 6 records the O35 restructure: the draft "led with the B2B
practice-software story — a product that is NOT YET RUNNING — while the product people actually use
today, the public finder, appeared nowhere. That inverted the reader's risk." **The page had the same
defect again, one interface later.** A notice already fixed once for describing part of the product
is the strongest evidence available that this is a recurring failure, not an oversight.

**What was missing is good news the notice was not telling.** Every privacy claim was scoped to the
finder — "the whole finder runs in your browser", "you can use every part of the finder without
telling us who you are". `/network` and `/network/[clinician]` are statically generated with no
input at all: nothing to type, so nothing to hold. A reader browsing named doctors had no statement
covering the page they were on, and the honest statement is the reassuring one — which is exactly
why leaving it unsaid was a loss rather than a neutral omission.

Three changes. A section of its own — *"The network, and what it does not hold"* — saying the pages
are built ahead of time and served the same for everybody. The anonymity sentence widened to cover
both ("you can read every page of the network, and use every part of the finder, without telling us
who you are"). And the automated-decisions scope line, which read as a complete list for the whole
product: it now says the network is neither of the two automated things — it lists every GP in
roster order and decides nothing. On a page whose job is saying what decides things about you, that
is a fact rather than filler.

Balance after: 16 finder / 8 network on the rendered page, from 7/0.

No new claim about the finder, no restructure, and the draft/counsel-gate framing untouched — this
is a notice made complete about a surface that already exists, not a policy change. All three
sentences were linted **before** being written into the page, and `/privacy` is classified
`patient_notice`, so every marketing rule applies to it; the rendered sweep, `privacy.spec.ts` and
`party-to-care.spec.ts` are all green.

`/` and `/approach` are the same class and were deliberately left: they are marketing copy rather
than a legal notice, and rewriting the front door's argument is a bigger unit that should be its own.

Captures: `qa/_runs/o205/{before,after}-{390,1280}.png`.

## O206 — /practices stacked two site bars, and the top one was presenter chrome (2026-08-27)

**Visible in the first 133 pixels of the B2B landing page.** `/practices` rendered its own
`<header>` — a 66px bar — and then `PublicHeader` beneath it, another 67px. Two bars, two wordmarks,
before a single word of content. Measured across every public route: it was the **only** one where
the site header did not start at y=0. Everywhere else 0; here 66, pushed down by the bar above it.

**Two scanner corrections on the way to that number, both worth recording.** A first pass counting
`<header>` elements and "ADHD.ME" links flagged nine routes — because every page has a wordmark in
the header *and* one in the footer, and because `/network` and `/mission` use a semantic `<header>`
for their hero block. A second pass counting top-of-page bars flagged `/examples`, `/faq`, `/thanks`
and `/terms` — those are **breadcrumbs**, which is what they are supposed to be. Only measuring the
site bar's own `top` offset isolated the real case.

**The top bar was the wrong component entirely, which is the more interesting half.**
`DemoNavigator` is a demo *tour* switcher: a dropdown of four "demo stops" — Patient finder,
Clinician pathway, Practice story, Operations demo — for walking somebody through the product. It is
presenter chrome, and it sat on a public B2B landing page addressed to practice owners who are not
on a guided tour. It is the page W23's copy linter was written for.

**How both came to be there — a census with a blind spot, again.** O189's own comment records adding
`PublicHeader` to eight surfaces that "carried breadcrumbs but NO wordmark", listing `practices`
among them. This page *did* have a wordmark — inside `DemoNavigator`, which renders it as a dropdown
trigger rather than as the plain home link the census looked for. So a fix for "no wordmark
anywhere" put a second one on the one page in its list that already had one. The stray empty `<>`
fragment left beside the inserted `PublicHeader` — with its `</>` 200 lines below — was the
fingerprint of that edit, and removing the opening half is how the dangling other half surfaced.

Now one bar: `PublicHeader` carries the wordmark and the patient door O189 wanted, and the page's
own section nav keeps its in-page anchors and its sign-in directly beneath, where a B2B landing's
section nav belongs. `DemoNavigator` is untouched on `/demo`, `/console` and the clinician
walkthrough — the presenter and staff contexts it was built for.

**The perf gate caught the improvement and refused to let it go unbanked.** Removing a
`"use client"` dropdown from an otherwise static page cut `/practices` from 359 KB to 351 KB, and
the gate failed with `stale-budget` until the budget was re-derived — "an untracked drop is progress
nobody recorded", the same law AR17's raw-hex ratchet applies to colour. Exactly one line moved.

**Named and deliberately not swept along:** whether `DemoNavigator` belongs on `/clinicians` — also
a public professional surface — is the same question one page over, and deserves its own claim.

Captures: `qa/_runs/o206/{before,after}-{390,1280}.png`.

## O207 — O189 gave every public page a spine at the top; nobody checked the bottom (2026-08-27)

**Three public prose pages had no footer at all** — not a different footer, zero `<footer>`
elements: `/clinicians/join`, `/privacy` and `/privacy/automated-decisions`. Each carried
`PublicHeader` and then simply stopped, with the Acknowledgement-of-Country band abutting the copy.
On the join page that left about 350px of dead space and no way onward. It is the page the founder
said *"feels disconnected from the site"* — and it was: there was no site navigation on it below the
header.

**This is O189's own census run in one direction.** That unit found eight surfaces that "carried
breadcrumbs but NO wordmark and nothing shaped like a control", gave them all `PublicHeader`, and
made the top permanent with `public-nav.spec.ts` — derived from the route list so a new page cannot
ship headerless. Nobody asked the same question about the foot of the page, so the same class of
defect survived at the other end.

**The census then found a fourth case the claim did not know about.** `/practices` *had* a
`<footer>` — holding two spans, the B2B tagline and the not-medical-advice note, and **zero links**.
A practice owner who read to the bottom was as stranded as on the three pages with no footer at all.
O206 worked on that page one unit earlier and missed it, because it was measuring the top. The
colophon is kept — those two lines are a disclaimer, not decoration — but it is now a plain block
above the shared footer, so the page has one `<footer>` and it is the one carrying the doors.

**Measured carefully, because this session's first scans keep being wrong.** A "links in the bottom
quarter" proxy flagged six routes, and `/thanks` was among them — it carries the full footer, and the
Acknowledgement band simply occupies that quarter and pushes the doors above the line. The fourth
crude scan of the session to mis-report, which is why the finding rests on counting `<footer>`
elements and their links rather than on link positions.

**The exceptions are named and argued, which is the difference between a census and an allowlist.**
`/finder` and `/clinicians` are stage machines with their own controls and exits; `/demo` is the
presenter view; `/book/[token]` is a tokened flow reached by invitation. Each entry states why, a
second test checks the register against the derived routes in both directions, and the sweep refuses
to pass if everything was skipped or exempt. A page with a footer of its **own** satisfies the rule —
it is "the reader can leave from the bottom", not "this component is present".

The new spec carries **no** `taste-rule:` tag, deliberately: a first draft tagged
`interaction.hover-focus` and AR2 refused it, because the register checks that every tag is claimed
by an entry and tagging the nearest-looking rule would put a false claim into the coverage document.
`public-nav.spec.ts`, the sweep this mirrors, carries none either.

Proven non-vacuous by deleting `/faq`'s footer, rebuilding, and watching the sweep name it.

Captures: `qa/_runs/o207/`.

## O208 — three units fixed the same defect and left no check behind (2026-08-27)

**The pattern, as a count.** O203 (`/examples`), O204 (`/faq`) and O205 (`/privacy`) were the same
defect three times: a surface describing the product as it was before O192 added a second interface.
`/faq` answered "What is ADHD.ME?" with *"A finder"* five units after that stopped being true — and
that answer was in its FAQPage JSON-LD too, so it reached search engines as structured data.
`/privacy` scoped every claim to the finder, which is the defect its own header records fixing once
before, one interface earlier.

Each was found by a person reading a page. Each was fixed as a one-off. **None left a check behind.**
O199, O200 and O207 each turned their finding into a census; these three did not, and that asymmetry
is what this unit pays off. The trigger is already planned: O197 parked the finder for a separate
domain at the founder's instruction, and on the day that lands every surface describing "the product"
needs revisiting.

**A register, not a lint.** Every public surface now has a decided stance: *describes-both* (it
describes the product, so it owes an account of both interfaces), *is-one* (it IS an interface, or
that interface's landing page), *describes-neither* (it is about something else — a GP funnel, the
B2B product, a presenter view), or *declared-debt*. Checked against the derived route list in both
directions, so a new public page forces the decision rather than inheriting one, and every entry
argues itself in a sentence somebody can disagree with.

**The Goodhart risk is named rather than designed around.** The mechanical half — does the rendered
text name each interface — is a weak proxy: a page could satisfy it by saying "network" once,
meaninglessly. `docs/AR-DOSSIER.md` warns in its own words that a proxy can become the rule, and the
module says so at the top. The register carries the weight; the word check is a backstop for the one
failure that actually happened three times, and a green run is **not** evidence that any surface
describes the product well.

**Two deferred prose notes became dated debt.** `/` (1 finder / 0 network) and `/approach` (2/0) are
the last one-sided surfaces. I raised both with the founder and deferred them — rewriting the front
door's argument is a scope call, not a loop unit. A sentence in a ledger row nobody re-reads is not a
record; a register entry the suite reads every run is, and each carries an owner and the date it was
raised. A second sweep checks the *other* direction: if somebody answers that decision and fixes a
page, the stale debt entry fails rather than sitting there looking considered.

**My first non-vacuity probe did not work, and that is worth recording.** I reverted `/faq`'s three
answers to their pre-O204 shape expecting the sweep to catch it; it passed, because the page names
the network elsewhere and reverting three answers was not enough to make it one-sided. Proven
properly instead by temporarily marking `/mission` — which genuinely names one interface — as
`describes-both` and watching the sweep name it, and by marking `/faq` as debt and watching the other
direction fail.

**And O196's scanner has a small blind spot this unit ran into.** It reads a loop's collection by
capturing the expression after `of`, so in a file that imports `eachOf` the captured root *is*
`eachOf` and the guard it looks for never matches — a properly wrapped site can still read as
unguarded. Rather than bump that unit's pinned remainder, the block here also asserts above the loop,
which is what the census recognises. Worth its own unit: the pinned 133 may include other
already-guarded sites for the same reason.

No `qa/` capture: this unit renders nothing and changes no copy.

## O209 — the vacuity census did not recognise its own guard (2026-08-27)

**O196's census has overstated its debt by ten since the day it landed**, and the ten are the sites
that unit was proudest of.

The scan reads a loop's collection by capturing the expression after `of`, and that capture swallows
a call. So `for (const x of eachOf(REG, "…"))` captured `eachOf(REG, "…"` — whose **root is
`eachOf`**. In any file that uses the guard, that root is an imported name, so the site counted as a
register loop; the guard check then looked for `eachOf(eachOf(…` and never found it. **A correctly
guarded site read as unguarded.**

**Measured both ways before anything was changed.** Current scan: 140 sites, minus 7 declared, pins
at 133. With `eachOf(` recognised as the guard it is: 130 sites, 123 undeclared. Ten sites recorded
as debt while properly guarded.

**And the ten were that unit's central achievement.** O196's ledger row names the 13 it guarded
"chosen by STAKES rather than convenience: the W55 provenance intervals, the W148 advice linter, the
directory renderer, the finder's patient-visible labels, the sitemap-to-census trace." Among the
miscounted: `registers/store.test.ts` twice ("every placeholder interval says outright that it is
not guidance" — W55 provenance), `quality/sitemap.test.ts` (the sitemap-to-census trace),
`matching/clarify.test.ts`. The census was refusing to credit the work it was written to record.

**The number fell because it was measured wrong, not because anything was fixed**, and the constant
says exactly that. O196's own law is that an untracked *drop* is progress nobody recorded — an
untracked *correction* is worse, because it reads as progress. Nothing was guarded by this unit; ten
things stopped being described wrongly. The real debt was always 123.

**Found by walking into it.** O208 wrapped a register loop in `eachOf`, watched the census count it
as debt anyway, and worked around it by also asserting above the loop rather than bumping the pin to
hide the discrepancy. That workaround is now belt-and-braces rather than required, and it is kept:
the assertion it adds — that the register is non-empty — is worth making on its own.

The fix is pinned in both directions on fixtures rather than on the tree, so it cannot pass by the
tree happening to be clean: the raw capture is asserted to still root at `eachOf` (which is *why*
filtering on the prefix is the fix rather than tightening the regex), the guarded fixture is
credited, and an unguarded sibling in the same shape is still caught. The `LEGITIMATELY_EMPTY`
register was re-checked in both directions after the fix — all 7 entries still match live unguarded
sites, so none of them was only matching because of the bug.

No `qa/` capture: this unit renders nothing and changes no product code.

## O210 — three plain ways of asking reached nothing (2026-08-27)

**Two candidates were measured and dismissed before the real one was found.** Driving the finder, a
stitched capture appeared to show the launch control sitting on the privacy disclaimer; measured in a
live viewport at 360, 390, 768 and 1280 it overlaps **nothing** — a stitching artefact, the class
O198 already recorded. The mic-blocked banner above the heading is the O18/O46/O48 error ladder
working as designed. Both dismissed on evidence rather than fixed on appearance.

**The real finding, with a number.** Eighteen plain-English phrasings for facets the roster already
holds: **15 reach the right facet, 3 reach nothing** — "a GP who takes their time", "a doctor with
patience" (`manner:unhurried`) and "a doctor who hears me out" (`manner:attuned`). Everything around
them works. A narrow hole in a lexicon that is mostly right.

**Why it matters to a reader rather than to a metric.** Someone who types the most natural phrasing
gets nothing read — and the finder then *honestly* tells them the order means nothing, because by its
own rules it does. The product is truthful and useless in the same breath, while holding exactly the
facet they asked for. Nothing on screen suggests anything went missing.

**One of the three was refused, and the refusal is the better record.** "takes their time" is the
most natural phrasing of all, and it cannot ship: "their" is a stopword, so the cue degenerates to
`[take time]` and matched "the wait takes time", "an ADHD assessment takes time" and "getting a
diagnosis takes time" — a reader stating a fact about how long the process takes, read as asking for
an unhurried doctor. That is a false read of a patient's words, which is worse than not reading them.
Same shape as O7's finding that "in and out" tokenised to nothing. Pinned as behaviour: those three
sentences must stay unread, and so must the phrasing that motivated the refusal.

**"patience" was checked before it was written**, because "patient" is the most overloaded word in
this product. `stem("patience")` is `patience` and `stem("patient")` is `patient` — distinct, so the
cue cannot reach "new patients welcome" or any of the roster's own copy. Verified against exactly
that.

**The tree's own pin caught what my probe missed.** All three cues collapse to a single token, and
O25's "a multi-word cue must not quietly become a one-word cue" refused them until each was reviewed
and listed. That check turned out to *validate* them: the O45 collapse rule means a one-token phrase
can only fire beside its authored adjacent pair in the raw stream, which is precisely why "I hear the
wait is long" stays clean. Each is now registered with the sentences it was verified against.

**Six exact-baseline registers moved, each re-derived with the cause named** — O190's precedent, that
one corpus sentence moves the KPI chain. M6's extractor report (448 → 451 sample, 560 → 563 gold
facets, 298 → 301 informed), M5's separation curve and real-roster baseline (0.672 → 0.674), W234's
tie-quality (301 → 304 separated, `unseparated` and `partialTie` unmoved), and M8's declaration-state
audit.

**And one of my own notes was wrong and is corrected in place.** I wrote that M8's `ambiguous` count
was unmoved; it moves 308 → 311. The corrected reading is the more interesting one: each new sentence
reaches a manner facet exactly one clinician declares, so the pair's scores differ (+3
`valueDiffers`) while the other clinician is *undeclared* rather than declared-no — which is
precisely M8's "we cannot tell", so it is ambiguous too (+3). Both counters moving together is the
right shape for a two-person roster where one has answered and one has not. `intervalSeparates` is
genuinely unmoved at 25.

No `qa/` capture: this unit renders nothing.

## O211 — paying down the vacuity debt: src/compliance (2026-08-27)

**The previous firing ended quietly and should not have.** It concluded nothing was claimable while
O196's own row said the opposite: *"Paying it down is ordinary future work, best done a directory at
a time; `src/matching` carries much the largest share, then `src/compliance`, `src/quality` and
`src/demo`."* Recorded, unblocked, non-founder work. Judging it thin was a misjudgement.

**A stale clone was found and reconciled before any work started.** This firing opened on a working
copy at `d136355` — the end of O208 — while `origin/main` carried O209 and O210. The container had
been reset to an older snapshot with no restart notice, and `git status` reporting "behind by 6
commits" is what surfaced it. Nothing was lost: those six commits are this session's own, pushed and
intact. Fast-forwarded, wipe detection run per the concurrency law (O210's DONE row is present on
`main`), and the measurement re-run on the reconciled tree — the first pass had been taken against
the stale one.

**Compliance before matching, on O196's own criterion — stakes, not convenience.** `src/matching` is
larger at 20 sites, but these eleven are the checks standing behind the product's honesty claims,
where an assertion running over nothing is a compliance control reporting success over an empty
register.

**Eight guarded, three declared, and the split is the work.** Guarded with `eachOf`, because
emptiness would be a failure nobody would see: the G7 rail properties (×4, across `cdss-boundary` and
`g7-at-five-years` — a rail with no properties is the silent catastrophe that register exists
against), the operator-copy surfaces (×2 — one of those tests is *itself* about vacuity, its own
comment reading "a lint that reaches no string cannot fail"), `PUBLIC_SURFACES`, and W23's
`LANDING_RULES`.

Declared legitimately empty, because emptiness is the *desired* state: the three acceptance
registers. Each says what an acceptance must carry, which over zero acceptances is vacuously true and
correct — and `CONSOLE_ACCEPTED_FINDINGS` has a founder gate (`console-honesty-wording-review`) whose
answer empties it, so a floor there would make answering a gate break the suite. That is the exact
inversion O196 named when it declared `REACH_CORPUS.awaitingFounder` legitimate.

**The count caught me being one short.** After the first pass the census read 113, not the 112 that
eleven paid sites would give. One guard had not taken: my edit pattern matched only the first of two
`RAIL_PROPERTIES` loops in `cdss-boundary`. Finding it also found something better — that block has a
**nested** loop over `property.rederivations` which can go empty independently, skipping the check for
one property while the suite stays green. Both are now guarded. The number was the check, and
adjusting it to fit would have hidden a real site.

**112 remain**, and the shape is unchanged: `src/matching` 20, `src/demo` 10, `src/design` 9,
`src/quality` 8, `src/platform` 8, then a long tail.

No `qa/` capture: this unit renders nothing and changes no product code.

## O216 — the reskin: the finder deployment joins the network's colour scheme (2026-09-01)

**Founder-directed:** make the adhdme.au deployment carry the `Stef-01/ADHD` (network) repo's
colour scheme. Since the 2026-08-28 split the two deployments had drifted into two products: the
network tree's O271–O304 landing redesign gave it a warm-orange-to-periwinkle brand gradient,
carried by the header of every page (its O290), the closing footer/Acknowledgement band
(O293/O300) and the landing hero — while this tree kept the pre-split chrome: a translucent paper
header, a cream footer strip, a beige Acknowledgement band, and a landing in a third colourway
(the story page's scoped deep rose). One product on two domains read as two.

**What moved, and from where.** The seven brand hues (`--hero-glow` … `--hero-dusk`) and the four
band definitions (`--band-gradient`, `--band-scrim`, `--band-fall-upper`, `--band-fall-lower`)
are copied VERBATIM from the network tree's `:root` — a re-derivation here would be exactly the
drift the split's own banner warns about. They land on:

- `.site-nav` — the shared public header carries the across band (opaque `--ground` base under
  the scrim and gradient, the arrangement the network derived so a contrast sweep measures the
  real ground), white wordmark, paper-pill link, `--on-ground` focus rings.
- `.story-header` — the landing's own header gets the identical treatment, so the most-seen page
  and every page one click away are one continuous scheme. Its demo pill becomes a paper pill
  (an accent-filled pill fought the gradient), its read-progress hairline moves to `--on-ground`.
- `.site-footer` and `.story-footer` — the top of the closing band (`--band-fall-upper`), full
  `--on-ground` links per the network's O300 measurement (a dimmed white fails where full white
  clears), with `.site-footer-inner` keeping the links on their 640px measure.
- `.aoc-band` — the Acknowledgement sits on the closing fall (`--band-fall-lower`), footnote-size
  left-set text in a paper tint; the artwork is UNTOUCHED — retinting an Acknowledgement to match
  a brand palette would be exactly backwards, and its transparent-sky SVG composites straight
  onto the band.

**The story landing's rose is retired.** `--s-accent` and family now resolve to the tree's own
amber (#8A5A16 / #f7efe3 / #E9D6B4), `--community-accent` likewise; the three hand-written rose
darkening stops (#6f1e31) became `color-mix(… 82%, #000)` derived from the token they darken; the
throughline's rose tint (#e0aeba) became `--on-band`, the palette's own dark-band accent.

**Contrast, measured, not assumed.** #8A5A16 as text: 5.36:1 on `--s-paper`, 4.77:1 on the
chapter tint, 5.91:1 under white (all ≥ 4.5). White on amber: 5.91:1. `--on-band` on `--s-dark`:
7.2:1. The band's own type sits on the network-derived scrim over an opaque `--ground` base —
the same values the network tree measured against its rendered-pixel sweep, re-verified here by
this tree's own e2e contrast sweep. All five new dark chrome surfaces are declared in the
dark-ground census (AR18) with same-rule foregrounds.

**Captures:** `qa/o216-landing-390.png`, `qa/o216-landing-1280.png`, `qa/o216-faq-390.png`,
`qa/o216-faq-1280.png` (the band header on a PublicHeader page), and `qa/o216-footer-aoc-1280.png`
(the footer→Acknowledgement seam reading as one continuous fall).

## O217 — twenty example profiles behind a tickbox, labeled everywhere they render (2026-09-01)

**Founder-directed** (decision `synthetic-roster-tickbox`, all three messages recorded verbatim in
`founder-gates.ts`): invented example GP profiles return for testing — a controlled reversal of
the persona purge, with every defence against "invented presented as real" now machinery in
`synthetic-roster.test.ts`. The results screen carries the opt-in tickbox (default OFF) as a
bordered control whose label and meaning share a row: **Include example profiles** / "Fictional
GPs for trying the finder — not real people, and not bookable." The 44px floor is met by the
wrapping label, the sweep's own measurement rule.

Everywhere a persona renders it says so: a quiet bordered tag on the result row (muted on stone —
a signpost, never the accent), the same tag on a compare column head, a plain sentence directly
under the profile name (the O184 siting logic: a notice met after a view has formed has already
failed), and the booking bar renders "There is nobody to book" where the control would be — an
explanation, not a disabled button that reads as a real doctor with a broken page. Portraits are
the roster's own monogram state; nothing generates a face.

**Captures:** `qa/o217-results-off-{390,1280}.png`, `qa/o217-results-on-{390,1280}.png`,
`qa/o217-results-on-list-{390,1280}.png`, `qa/o217-profile-synthetic-390.png`,
`qa/o217-profile-booking-390.png`.

## O218 — the motion vocabulary arrives, and the brand enters the finder at 2px (2026-09-01)

The network tree's named motion system (its O197/O239/O252) ported verbatim: `--ease-spring` (a
sampled `linear()` spring), `--ease-soft`, and the three named durations. Twelve literal-motion
sites snapped to the vocabulary — presses acknowledge at `--dur-tap`, nudges at `--dur-move`,
screens arrive on the soft ramp at `--dur-enter`, and the demo-scenario popover, the one RELEASED
element, alone gets the spring. Largest single duration move: 20ms. The cv2 console's own tokens
and the story page's choreographed timelines are deliberately untouched.

The finder's header hairline becomes the band itself at 2px — the brand present inside the
Operate surface without a gradient field shouting over a task screen. **Captures:**
`qa/o218-finder-hairline-{390,1280}.png`.

## O219 — the story landing joins the accent law (2026-09-01)

The full e2e run caught what the reskin had actually done: retiring the rose to amber made the
landing's scoped palette the PRODUCT accent by value, and the accent-discipline sweep counted the
page for the first time — ten meanings on `/` against a cap of two, four on `/approach`. The
answer is O166's, applied rather than evaded: the accent keeps its two earned meanings on the
landing — the claim's drawn underline (the word that matters) and the "Now in-practice" stat (the
value that changed) — and everything else moves to the tree's own idioms. Eyebrows and step
numbers to muted; the primary CTA and the approach door to the dark-pill treatment; the
clinician-door band to the page's own dark beat with `--on-band` as its sanctioned accent; the
community submit to ink. `/approach` now spends zero accent.

The finder hairline also moved to a `::after` after the contrast sweep measured the header's
Home link against the band's worst stop (the ancestor walk treats any gradient on an ancestor as
the painted ground and cannot know a 2px strip at the far edge — 4.01:1 of fiction; the
pseudo-element renders identically and owns no text). Both fixes verified by re-running the
sweeps that caught them.

## Product-wide daylight-wayfinding redesign (2026-09-01)

**Direction.** The redesign was re-derived from the live product rather than the retired sage
document: a calm daylight route-planning instrument. Concept seed `f009e50c` selected the
wayfinding direction from five product-grounded candidates. The resulting contract is embedded
in `app/layout.tsx` and documented in `DESIGN.md`: porcelain and ink establish the working
ground; periwinkle carries route, selection, and progress; orange marks the next consequential
decision. The redesign-existing-projects and frontend-design passes set the system; the motion
pass was Jakub-primary / Emil-secondary, with spatial continuity taking priority over flourish.

**What changed.** This is one migration layer over the order-sensitive stylesheet rather than a
partial component demo:

- `/` now opens as an inspectable departure field: geographic context, one claim, one action,
  three route stops, and the existing map used as a product instrument. The long story alternates
  fields and rules instead of repeating cream cards. Public header/footer navigation is shared
  and direct.
- `/finder` keeps its eight-stage state machine and fixed shell, but gains a clear progress route,
  action/state colour roles, quieter result comparison, and standalone safe-area handling.
- `/clinicians` uses the same roles while preserving its four-step practice-pathway model and
  learning/case behavior.
- All 31 console screens now sit inside one route-aware application shell. Five direct routes
  stay visible; “All tools” exposes the full workspace in five groups. Matching, allocation, and
  interview no longer break out into isolated pages. Home shortcuts became scannable actions
  without changing their routes or test-visible names.
- Manifest, browser chrome, generated icon, Apple icon, and Open Graph artwork were brought into
  palette parity. Standalone mode respects safe-area insets.

**Accessibility and truthfulness.** The first rendered sweep found four real issues: one
light-on-light GP-directory action, three secondary-text contrast sites, hidden menu links counted
as visible controls, and a geographic context string removed from the JavaScript-off contract.
All four were fixed in the product. The complete unit suite is green (4,391 passed, 13 skipped),
the production build compiles all 48 budgeted routes, the public/console WCAG 2.2 AA scans pass,
595 public and 2,024 console text samples clear their contrast floors, 662 keyboard stops show a
focus change, and every route fits a 390px phone without horizontal document scroll.

**Captured record.** Every image below is Playwright against the production build with reduced
motion, after fonts and network settled:

- `qa/redesign-2026-09-01/01-home-desktop.png`
- `qa/redesign-2026-09-01/02-home-phone.png`
- `qa/redesign-2026-09-01/03-finder-welcome-phone.png`
- `qa/redesign-2026-09-01/04-finder-results-phone.png`
- `qa/redesign-2026-09-01/05-clinician-path-desktop.png`
- `qa/redesign-2026-09-01/06-practices-desktop.png`
- `qa/redesign-2026-09-01/07-console-signin-desktop.png`
- `qa/redesign-2026-09-01/08-console-home-desktop.png`
- `qa/redesign-2026-09-01/09-console-workspace-desktop.png`
- `qa/redesign-2026-09-01/10-console-home-phone.png`
- `qa/redesign-2026-09-01/11-console-workspace-phone.png`

**Boundary.** The interface is app-ready; the runtime is not represented as launch-ready.
Authentication is still a synthetic flow, stores are process-memory fixtures, live SMS and real
patient operation remain founder-gated, and no service worker promises offline behavior.

## O225 — the installed app stops showing a paper seam at the notch (2026-09-01)

STANDALONE-APP-PLAN.md Phase 1b, the safe-area half. Without `viewport-fit: cover` the installed
app letterboxes below the status bar and the strip above the brand band renders as a paper seam —
the exact "changes brand at the door" defect O218's hairline closed at the finder, reintroduced by
the device. With cover set, the four top bars (`.site-nav`, `.story-header`, the finder's
`.minimal-header`, `.profile-header`) pad themselves back out of the notch with
`env(safe-area-inset-top)` while their grounds paint to the device edge, and the two chrome inners
take `max(24px, env(safe-area-inset-*))` for landscape's rounded corners. Every inset rule
collapses to the old values wherever insets are zero — proven by the gate's visual comparison
passing unchanged against the standing baseline, which is this unit's capture: the change is
DESIGNED to be invisible in a browser tab and only exists on device. The plan's other 1b half —
reproducing the MIC B2 standalone-flag failure — stays owed to the plan and is not claimed here.

## O226 — the results screen finds its rhythm, and the switch moves to the door (2026-09-01)

A production iPhone capture went to review against the Gestalt literature (Full Clarity and
Uxcel's proximity/common-region write-ups, Toptal's design-principles overview, O'Donnell on
grouping) and the diagnosis was consistent: the screen had no harmony because it had no grouping
logic — five bordered regions in the first viewport each announcing itself (head hairline, place
field, refine box, demo-tools box, list head hairline), an amber "Change what you said" reading
as the page's loudest element over a task control, and the example-profile switch sitting between
the reader and their results — configuration interleaved with outcome, a proximity violation at
the screen's centre.

The fixes follow the sources rather than taste-by-fiat. **Fewer regions:** the results head and
the refine details lose their borders and boxes — whitespace does the grouping (proximity beats
enclosure); the one hairline left belongs to the list head, where the content actually changes
kind. **Quieter controls:** the edit action drops amber for ink + underline — a link-shaped verb,
not a second brand moment (the later `.results-head` cascade twin that kept re-ambering it is
fixed too); the place input sits on paper so field and card read as one surface. **The count
moves to where its noun is:** "Showing 5 of 22" leaves the place field for a quiet tabular
"5 of 22" beside the **Matches** heading. **Concentric geometry:** row thumbnails at 6px inside
18px cards (outer − padding), with a proper `.clinician-monogram-thumb` block so monogram and
portrait share one shape. **And the founder's amendment lands:** the example roster ships ON for
this testing deployment, and the switch folds into a `details` ("Testing options") under the
voice entry on the welcome screen — configuration at the door, not between reader and results.
The founder-gate register carries the amendment verbatim; `e2e/support/real-roster.ts` is how a
real-roster ranking law switches the examples off the way a person would, through that door.

**Captures:** `qa/o226-welcome-390.png`, `qa/o226-welcome-tools-open-390.png`,
`qa/o226-results-390.png`, `qa/o226-results-polish-{390,1280}.png`,
`qa/o226-welcome-polish-390.png`.

## U3 — the error boundaries (2026-09-02)

**Subject:** the screen nobody designs on purpose. Until U3 a render error anywhere fell through to
Next's own "Application error" frame, in the framework's words, with a digest a reader cannot use.
**Mode:** Operate — a person mid-task needs to know what happened and what to do, nothing more.
**The choice:** the boundaries (`app/error.tsx`, `app/console/error.tsx`, `app/global-error.tsx`)
wear the 404's register exactly — the same `.notfound-*` classes, so whatever the 404 wears (as of
the founder's 2026-09-01 redesign: an Inter heading, one muted sentence, a filled primary door and
an outlined second) the boundaries wear too, without a rule of their own — because
a boundary is what a surface becomes when it fails, and the product already has one calm dead end;
a second register would have been a second thing to learn at the worst moment. Three sentences and
no more: what happened, that the reader did not cause it, and the way out. Retry is the primary
door because it is what a boundary can actually offer; the second door is a plain anchor (`/` or
`/console`), a full navigation out of the broken tree. No eyebrow, no code, no digest — the error
goes to the log, the reader gets the sentence (taste-rule `interaction.errors-plain`). The loading
states are one announced line where the screen will be. **Compliance:** every sentence is a
`BOUNDARY_COPY` constant and sweeps clean under the full patient rule set. **Verified in a real
browser:** `e2e/error-boundary.spec.ts` throws through the fault fixture and lands on this screen,
status 500, framework wording absent, second door landing on the landing page.

**Captures:** `qa/u3-error-390.png`, `qa/u3-error-1280.png` — taken at the tree U3 lands on, i.e.
after the redesign, so they show the register the boundary actually ships in.

## O229 — the redesign comes back inside the laws (2026-09-02)

**Subject:** the seven places where the 2026-09-01 redesign, gated against unit tests and its own
sweeps, crossed one of this tree's browser laws — laws the full e2e enforces and the redesign's
gate had not run. The rule for the unit was the redesign's own: *blue carries route and state;
orange marks the next consequential action.* Every fix is a rule in the redesign's layer of
`app/globals.css`; no component changed, no gate, sweep or census floor moved.

**The accent, counted (taste-rule `type.accent-live-tokens`, two meanings at 390).** The landing
had been painting the accent on the header pill, the nav underline, the claim's ornament, the
first route stop, the pillar counters and the join link — nine meanings for a colour the law
reserves for live tokens. Under the redesign's own roles each of those is route (a way somewhere)
or decoration, not a next consequential action, so the pill and the underline now paint the
route blue and the rest sit on route-strong; the claim's ornament is gone. What the landing keeps
is exactly two: the primary door and the live-token stat. `/clinicians` had the same colour on its
progress rail (a route, so route-strong now), and `/examples`, `/thanks`, `/faq`, `/approach` were
over the cap only through the pill.

**The floor and the fold.** The pill was 42px at phone width; it is 44. The finder's briefing card
at 390×844 stood 40px under the one-screen pin because Inter's wider set wraps the longest
guideline title to five lines where Newsreader took four — its heading is 2rem under 640px, the
one size that brings the card back inside the viewport with the title still reading as a title.
While measuring it: a shared heading rule had put ink on the card's route-strong ground (about
1.6:1); the heading keeps the card's light foreground.

**The console's neutrals.** Two console screens (`/console/interop`, `/console/capacity`) are
sworn to show no state colour at all — a page that reports nothing was attempted must not look
like a success — and the sweep that holds them to it reads any channel spread of 24 or more as a
tint. The redesign's ink (`#172033`) is a blue-cast neutral with a spread of 28; on a marketing
page that cast is the palette's character, on an instrument reporting zero it is a colour. The
console shell therefore scopes its own neutrals: each site token with a touch of the accent mixed
in, which pulls the blue cast back to hue-free (ink spread 15, muted 10, faint 9, line 8) without
leaving the palette, and the Tailwind stone scale — resolved at `:root` — is re-declared over them
so a `text-stone-600` in a card reads the console's grey, not the site's. Card borders and table
rows use `--line` rather than the route line. Contrast held or rose everywhere (muted 6.49:1 on
white, faint 5.52:1). One more contrast site: the primary button's hover had lightened to
accent-mid (3.21:1 with white); it darkens toward ink instead (6.56:1), which is also the
direction a pressed thing should move.

**Verified in a real browser:** the seven specs 32/32; the full `pnpm e2e` green; the AR15 baseline
re-accepted after three agreeing runs (the entry in `src/design/accepted-diffs.ts` names what moved).

**Captures:** `qa/o229-landing-390.png`, `qa/o229-landing-1280.png`,
`qa/o229-clinicians-briefing-390.png`, `qa/o229-console-interop-390.png`.

## U9 — focus, the live line and one microphone control (2026-09-02)

**Subject:** the finder for a keyboard or a screen reader, and the four pixels that moved while
proving it. Before this unit every stage transition unmounted the control the person was on and
dropped focus to the top of the document, an `aria-live` wrapper around the whole machine read the
entire new screen aloud (the results list included, on every re-rank), and the listening screen
carried two controls that did the same thing — a microphone labelled "Finish voice description"
and a "Done" button under it.

**Mode:** Operate. The finder is a task; the person is meant to leave it with a GP, and the sound
of the screen must never get in the way of the words they are saying into it.

**The choice:** one sentence per arrival, one control per action. `src/finder/announce.ts` scripts
the sentence ("Listening.", "12 matches.", "Re-ranked: 9 matches near Hornsby.", "Profile: Dr
…", "Listening again in हिन्दी.") and each stage owns exactly one `role="status"` line; the shell
has no live region at all. Focus lands on the new stage's heading — the first result on the results
screen, the text box on the typing screen — and only when the person arrived by their own action,
never on a fresh visit. The microphone is one toggle: `aria-pressed` while listening, `aria-busy`
and a "Finishing…" caption between the tap and the recogniser's last phrase, the caption under it
saying what a tap does. The transcript is no longer live: a person hears their own words as they
say them, and a region reading every revision back talked over them.

**The pixels.** The breathing pulse moves off the microphone and onto a halo behind it — the
same 9px `--accent-soft` ring, on the same gradient stage — because the whole control used to
scale on a loop and the one tap target on the screen never held still. The button holds still
now; the ring breathes. Two floor defects the sweeps had never reached, because they enter
`/finder` by URL and the welcome screen has neither control: every finder header's round control
(cancel, back) was 42px and the compare screen's `.compare-open` name button 41px tall; both are 44.
One hover reading on the results rows (`.row-location` on a hovered row, 4.32:1 on the route
ground) is `--muted` (5.17:1). The welcome screen is untouched: the gradient aesthetic, the
wordmark, the door and the `qa/` captures stay byte-identical.

**Compliance:** the scripted sentences are counts, names and states; none makes a claim about a
GP, and the request text is never in a sentence, a URL or a history entry (plan §2.8 Q-A).

**Verified in a real browser:** `finder-a11y.spec.ts` walks the eight stages under reduced motion
and without it, proves the focus/live-line landing on each, the toggle's states and the language
restart, and runs axe (WCAG 2.2 AA) on every stage; the keyboard-focus and touch-floor sweeps now
cover every finder stage (51 stops, 53 controls, nothing under the floor); voice and
finder-history green on the one control. Full `pnpm e2e` green at the U9 tree (the ledger holds
the count). Walked on the built route at 390×844 and 1280×720: the halo breathes behind a still
microphone, the caption reads under it, and the header controls sit on the floor without the
header growing.

**Captures:** `qa/u9-listening-390.png`, `qa/u9-listening-1280.png`, `qa/u9-compare-390.png`.

## O234 — the map, the filters and one shell (2026-09-02)

**Founder-directed.** "Everything must be symmetrical … the floating privacy policy is weirdly
floating and all the text input and everything is all over the place." Then: a map of nearby
clinicians on the finder, and a Profile tab that sets standing filters.

**What was wrong, measured.** The welcome question sat 30px in inside a 560px centred column with
its own 26px inset, the compose box 22px in on the gutter, the example link centred under a
left-aligned screen; the box wore two borders at two radii (16 inside 22). The tab bar widened to
640px at 700px while the shell widened at 820px; the consent notice was 760px wide over a 640px
app; the Profile tab was 640px beside a 520px finder. Four widths, three insets, two alignments.

**What changed.** One `--shell-w` on `:root` read by the shell, the bar, the sheet, the notice and
the profile; one `--shell-gutter`; the question, box and link on that edge as one vertically
centred group; the box one pill. The Profile tab is the person's standing filters (switch rows,
language chips, distance segments), held in `localStorage`, applied to the roster before ranking,
and said on results as a strip with Edit and Clear; no listed GP answering every filter is a named
`no-results` state with both ways out. Results gain the nearby map: gazetteer-projected, rings at
true radius, route-blue stops keyed to the rows, a stop finding its row by focus.

**Against the reference apps.** NHS App: one hub bar, left-aligned headings, list rows with
trailing switches — matched. Zocdoc: cold-opens on search, filters live off the query, numbered
map pins tied to the list — matched, with the tile map refused for the privacy reason in
`src/geo/local-map.ts`. Apple Health: a settings control top-right, one shell — matched.

**Verified.** `pnpm verify` green; `e2e/app-shell.spec.ts` gained four tests (filters narrow and
clear, the map keys and finds rows, the no-results way out, the one-shell geometry); the a11y,
touch, contrast and focus sweeps in the full `pnpm e2e` run; captures at 390 and 1280 from the
production build.

**Captures:** `qa/o234-welcome-consent-390.png`, `qa/o234-welcome-1280.png`,
`qa/o234-results-map-390.png`, `qa/o234-results-map-1280.png`, `qa/o234-results-filtered-390.png`,
`qa/o234-results-empty-390.png`, `qa/o234-profile-filters-390.png`,
`qa/o234-profile-filters-1280.png`.

## O235 — the map, on a real basemap (2026-09-02)

**Founder-directed.** "Map looks terrible, find a repo online to get a good one implemented."

**What was wrong.** O234's map was an SVG of rings and dots from the gazetteer. A map with no
streets is a diagram; a person deciding whether they can get somewhere reads streets, and every
reference finder (Zocdoc, HealthEngine, the NHS service finder) shows a basemap with numbered pins.

**What changed.** Leaflet 1.9.4 (github.com/Leaflet/Leaflet) over OpenStreetMap's standard tiles,
loaded as a client-only chunk the first time a suburb resolves so the front door carries none of
it. One 44px marker per consulting suburb with the row key inside and the suburb name beside it;
an ink "you" marker on the typed suburb; the app's own 44px zoom buttons in place of Leaflet's
30px ones; OpenStreetMap's attribution restyled into the app's type. A marker's tap or Enter
finds its row by focus, as before. The CSP admits `tile.openstreetmap.org` for images alone, pinned
by the headers test; the privacy page says what the tile server learns (the typed suburb's area)
and that nothing is fetched until a suburb is given.

**Verified.** `pnpm verify` green; app-shell, headers, privacy and public-sweep e2e green; full
`pnpm e2e`; captures at 390 and 1280 from the production build with live tiles.

**Captures:** `qa/o235-results-map-390.png`, `qa/o235-results-map-1280.png`.

## O236 — the search summary, and the note-taking filter (2026-09-02)

**Founder-directed.** "Remove the where are you, make it more modern looking"; "add in concepts
that modern patients [are] interested in, like GPs that will allow AI recording of consult or
won't use AI transcription."

**What was wrong.** The results head stacked a quoted fragment ("Kind."), a grey underlined pill,
a labelled form field and an underlined "Improve my matches" down the screen — four idioms for two
facts. Every reference finder opens results on one compact search bar instead.

**What changed.** One **search summary** card: the words (a button that reopens the box, with the
pencil that says so) and the place (a pill field with a pin, its label read to screen readers and
not painted, still re-ranking in place as it is typed — finder-flow, finder-history and finder-a11y
prove that behaviour and were left unchanged). The earned headline sits under the card at a
calmer size; the clarifier chips stand in the open under a sparkle-led "Improve my matches" line.
The retired quote, pill and disclosure rules were deleted with their markup.

A declared practice fact joined the roster — `consultRecording`: AI scribe with consent, or no AI
recording — on the example profiles only (the real-person law: nothing is asserted about a named
doctor that they have not stated). The Profile tab filters it three ways (Any / AI scribe / No AI
recording) with a note that a choice shows only GPs who have declared it, and a clinician's page
carries the fact among its pills.

**Verified.** `pnpm verify` green; finder-flow, finder-a11y, finder-history, matching-verification,
voice, keyboard-focus, public-sweep, touch-floor, results and fold e2e on the new head; full
`pnpm e2e`; captures at 390 and 1280 from the production build.

**Captures:** `qa/o236-results-map-390.png`, `qa/o236-results-filtered-390.png`,
`qa/o236-profile-filters-390.png`, `qa/o236-results-map-1280.png`.

## O237–O239 — the results screen shows the results; the map behind a button; the Learn tab as modules (2026-09-02)

**Founder-directed.** "Improve aesthetic and minimalism of this whole page, remove the where are
you and all of the text saying no GP matched … just show the results." "Make map open up with a
button, it causes too much clutter. Highest impact metric and North Star is simplicity of the
entire platform." "Make the learning page a real functioning minimalist Headspace-inspired
learning module section."

**Results (O237, O238).** The place field and every verdict sentence left the screen. What they
said is still enforced in structure: the list heading reads "Matches" only when the words produced
an order and "All listed GPs" when they did not; the fold never cuts a tied band; the clarifier
chips stand ready when the words reached nothing. The map sits behind a "Map" control on the list
header, closed by default; the row keys render only while it is open. The place arrives from the
Profile tab or a link; the specs that typed a suburb into results now reach it that way.

**Learn (O239).** The eight-scene scroll sequence became three modules — Finding a GP, Time,
money, distance, What changed — as Headspace-shaped tiles (a drawn mark in one of the three token
families, a title, a length, a tick when done) on the app's own shell. Inside, one card at a
time with a dot rail, Back, Next and Finish; every card is in the DOM from the first paint so the
argument survives without JavaScript, and finishing is remembered on the device
(`src/learn/progress.ts`). The cards are the scenes word for word (`src/learn/scenes.ts`); the
sequence, its 170 rules and its register entries were deleted, and the raw-hex ceiling fell from
66 to 62 with them.

**Verified.** `pnpm verify` green; app-shell, landing, guidelines, public-sweep, keyboard-focus,
touch-floor, contrast, fold, semantics, a11y, finder-flow, finder-history, finder-a11y,
matching-verification, voice, results, told and reduced-motion e2e; full `pnpm e2e`; captures at
390 and 1280 from the production build.

**Captures:** `qa/o239-results-390.png`, `qa/o239-results-map-390.png`, `qa/o239-learn-390.png`,
`qa/o239-learn-1280.png`.

## O240 — simpler, and moving like a modern app (2026-09-02)

**Founder-directed.** "Make it much more simplified and minimalist for the UI and have much more
modern and polished framer motions."

**Simpler.** Results rows lightened — a 60px portrait, a 16px radius, the hairline mixed toward
paper, a hover lift on pointer devices only — so five rows read as a list rather than five boxes.
The welcome disclaimer is one quiet line instead of a tinted panel. Nothing new was added to any
screen.

**Motion.** One house spring (`STAGE_SPRING`) replaces the tween-with-blur on every stage
transition; results rows stagger on it; the map panel unfolds and folds on it; the Learn module
view and its cards arrive on it, from the side they were asked for, and the finished tick pops;
the tab bar's marker is one element with a shared layout id that travels between tabs; the consent
card arrives on the spring curve. Every effect is gated by `useReducedMotion` at the hook (the
AR20 census holds every motion-importing file to a hook, a prop or a declared boundary) or by
`prefers-reduced-motion` in CSS, and the server render carries no `opacity: 0` (the Learn tiles
deliberately do not animate on first paint so the no-JavaScript reader gets them at once).

**Verified.** `pnpm verify` green; reduced-motion, keyboard-focus, touch-floor, contrast, a11y,
landing, app-shell and finder e2e; full `pnpm e2e`; captures at 390 and 1280 from the production
build.

**Captures:** `qa/o240-results-390.png`, `qa/o240-welcome-390.png`, `qa/o240-learn-module-390.png`.

## O242 — portraits on the example profiles (2026-09-02)

**Founder-directed.** "Add in dr profile photos with unsplash and pexels."

**The line held.** The roster forbade an image on an example persona because a generated face is
a fabricated person presented as genuine. A stock photograph is the opposite: a real person who
licensed their likeness for this use, from a source anybody can check. Eighteen portraits were
chosen to fit each persona (ten women, eight men), cropped head-and-shoulders, downloaded once
and served from this origin — no visit reaches Unsplash or Pexels, and the CSP admits no image
host beyond the map tiles. `src/demo/portrait-credits.ts` names source, photographer, page and
licence for each; `public/portraits/CREDITS.md` repeats it for a reader of the repository. The
two non-binary personas keep the drawn monogram, because a stock library cannot say how the
person photographed identifies. The alt text says "stock portrait standing in for the example
profile", so a screen reader is never told it is a photograph of a doctor who does not exist.
Real clinicians are untouched: the test refuses a stock path on any real entry.

**Verified.** `synthetic-roster.test.ts` holds every example image to the register and the file
on disk, the register to the personas, no portrait twice, and never a real clinician; full
`pnpm e2e`; captures at 390 and 1280 from the production build.

**Captures:** `qa/o241-results-390.png`, `qa/o241-results-map-1280.png`.

## O243–O245 — more motion; the star; the Learn tab as ADHD learning; the listening screen uncluttered (2026-09-03)

**Founder-directed.** "Add even more framer motion." "Make improve my matches a pop out so you
press the star symbol, no label text. Also make the learning page look infinitely more aesthetic
and completely redesign with impeccable design skill." "Remember the learn tab is to help people
learn about ADHD and managing symptoms and little Buzzfeed-style trendy cutesy quizzes … It should
not look vibe coded or blocky at all." "This looks terrible so fix, do thorough RCA and impeccable
design audit and compare to Wispr Flow and other text-to-speech app interfaces that are far less
cluttered."

**Motion (O243).** The compose control morphs mic to arrow on a spring as the first character
lands; the example link rises after the box; the results summary settles first, then the head,
chips and rows; the profile's switch rows stagger in after hydration and its "n on" count pops;
the Learn list and module hand over to each other; the tab glyph settles up. Every effect checks
`useReducedMotion` and the AR20 census holds every motion-importing file to a hook, a prop or a
declared boundary.

**The star (O244).** "Improve my matches" is a star with no label, beside the map control, that
opens the app's sheet with the questions; tapping one re-ranks and closes it. The specs that
reached the chips through the old text now open the star.

**Learn (O244).** The tab now teaches ADHD itself: two reading modules ("What ADHD is",
"Everyday strategies" — eight cards of general information written against the patient-copy
rules and linted by `progress.test.ts`), two knowledge quizzes ("Myth or fact?", "Words you'll
hear") with a reveal per question and a score card that says the quiz was about ADHD and never
about the reader, and the route-to-care three. An inverted route field opens the tab with a rail
that fills as modules are finished; tinted cards on two shelves, no hairline boxes; inside, one
card at a time with its number set large and faint. No quiz asks about the reader — the test
refuses a prompt with "you"/"your" in it — because a quiz that sorted a person by symptoms would
be the triage the founder gates forbid.

**Listening (O245).** RCA: seven things competed for one job — a display headline, an example
paragraph, the transcript in a third size, a 102px near-black microphone whose glyph said "start"
on a screen already listening, a floating waveform, a two-line caption, a left-aligned full-width
"Type instead", a four-line disclosure, then the language line with its choices stacked as pills.
Wispr Flow, the iOS dictation surface and Otter do the opposite. Now: "Listening" is the small
heading (the a11y landing line it always was), the transcript is the hero in serif and grows as
words arrive, the one control carries five sound bars while it listens and the microphone glyph
while it finishes, one caption, two chips side by side ("Type instead"; the language, opening its
choices in place), the disclosure as one faint line. The language flow's specs open the chip first.

**Verified.** `pnpm verify` green; voice, finder-a11y, finder-history, app-shell (with the quiz
played through), matching-verification, finder-flow, landing, public-sweep, keyboard-focus,
touch-floor, contrast, reduced-motion, public-foot, fold and a11y e2e; full `pnpm e2e`; captures
at 390 and 1280 from the production build.

**Captures:** `qa/o245-learn-390.png`, `qa/o245-learn-module-390.png`, `qa/o245-results-390.png`,
`qa/o245-learn-1280.png`.
