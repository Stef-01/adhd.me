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
