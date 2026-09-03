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

- [ ] `welcome-stage.tsx` — first impression; confirm hierarchy reads in under 2 seconds on a
      small phone screen with one hand.
- [ ] `listening-stage.tsx` — voice + typed input; the O246/O247 work already pushed this toward
      "reads from the top, control near the thumb, one disclosure line." Verify that still holds
      and hasn't drifted since.
- [ ] `type-stage.tsx`, `scenarios-stage.tsx` — check these feel like one continuous flow with
      listening, not a separate mode.
- [ ] `profile-stage.tsx` — density check: is this the "one consequential decision at a time"
      screen, or has it accumulated fields since the last pass?
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
- [ ] `compare-stage.tsx` — the comparison view is cognitively the heaviest screen in the flow;
      make sure it isn't presenting more than one consequential decision at once.
- [ ] `results-stage.tsx` — result ordering explanation should be visible, not just correct
      (ties to Roadmap Q4 "why this order" item).
- [ ] `booking-stage.tsx` — the exit point; confirm it's unambiguous and low-friction on mobile.
- [ ] `shared.tsx` — the fixed finder shell (PRODUCT.md calls this a cross-stage constraint);
      re-verify responsive rules are container-aware, not viewport-aware, everywhere it's used.

## Story / public surfaces

- [ ] `story-landing.tsx` — founder story; typography and pacing should feel like a person wrote
      it, not a template. Re-check the HSIL/partner logo treatment for contrast and alignment.
      (Its reduced-motion gaps are closed — see Cross-cutting below — but the typography and logo
      pass has not been done.)
- [ ] `app/practices`, `app/clinicians` (walkthrough), `app/faq`, `app/about`, `app/examples` —
      pass for consistent type scale, spacing rhythm, and motion restraint across all public pages;
      these are visited far less often than the finder, so drift is easy to miss.
- [ ] `learn-modules.tsx` — content-heavy; check line length, contrast, and quiz interaction
      feedback (the O243–O245 "motion pass" touched this — confirm it still reads well).

## Practice console (`app/console/*`)

- [ ] Desktop-first density is correct here per PRODUCT.md ("calm, dense where useful,
      operationally explicit") — don't import finder-style whitespace wholesale. Different
      surface, different rules.
- [ ] Pick a handful of representative screens (dashboard, matching, capacity, referrals) for a
      real pass before touching all 25+ subsections — see Roadmap Q4.
- [ ] Table/list density, empty states, and keyboard navigation are the highest-value console
      aesthetic work — more so than color or type on a tool people use mid-shift.

## Cross-cutting

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
- [ ] Dark-mode / theme parity, if the app has one (check `globals.css` and any theme toggle) —
      confirm it isn't a half-finished pass.
- [ ] Type scale: confirm optical sizing (not just linear scaling) between the finder's large,
      single-idea headlines and the console's dense tabular text.

## Explicitly not doing

- No new screenshot-diff register or automated design-QA gate. Capture, compare, fix, commit.
- No wholesale visual rebrand without a founder call — this is refinement of the existing direction
  (Product Principles + prior DESIGN.md ethos), not a new brand exercise.
