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
