# AR-DOSSIER — what the review system guarantees, what it does not, and what closing costs

> **AR35** (2026-08-25). The companion to [`AUDIT-AR.md`](AUDIT-AR.md): the audit derived the
> inventory; this document states what that inventory **means** — every guarantee as a
> falsifiable sentence naming the test that goes red, every non-guarantee by name, every gap
> priced against what this lane actually paid for the same shape. `src/quality/ar-dossier.test.ts`
> derives the rule lists and counts from the live registers on every verify, so the dossier's
> claims track the tree or fail the build (W207's shape).

## 1. Guarantees — each one falsifiable, with the test that falsifies it

| if this regresses | this goes red |
|---|---|
| Any pixel changes on any of the 180 baselined captures without an attributed acceptance | `src/design/visual-baselines.test.ts` / `accepted-diffs.test.ts` (manifest sha ≠ newest `ACCEPTED_DIFFS` entry) |
| A fold cuts a tied band, or the idea leaves the first viewport (`layout.fold-governed`) | `e2e/fold.spec.ts`; its detector's plumbing is probe-proven by `e2e/support/fold-probe.spec.ts` |
| Accent colour spent on a non-live token (`type.accent-live-tokens`) | the accent census, probe-proven (`accent` family) |
| A control under the 44px floor (`interaction.touch-44`), with **zero** standing exemptions | `e2e/touch-floor.spec.ts`, probe-proven (`touch-floor` family) |
| A hover style ungated, a focus ring suppressed (`interaction.hover-focus`) | `e2e/keyboard-focus.spec.ts` (real Tab presses) + `src/design/focus-ring.test.ts` |
| Error-code language on a patient surface (`interaction.errors-plain`) | the refusal/error copy tests over `src/platform/refusals.ts` |
| A motion effect with no static equal at rest (`motion.reduced-motion`) | `e2e/reduced-motion.spec.ts` (rendered rest-state under emulated reduce) |
| An unearned claim, a testimonial, a rating, "specialist" beside patient copy (`honesty.claim-earned`, `honesty.no-testimonials`) | `e2e/public-sweep.spec.ts` + `e2e/console-honesty.spec.ts` + `e2e/profile-sweep.spec.ts`, all through one `sweepSurface` |
| A new page route escaping any sweep | it cannot: every sweep derives its route list, and the censuses fail on unclassified routes in both directions |
| A route's shipped JS growing past its derived headroom | `pnpm perf:gate` (48 budgets), liveness proven by kill-and-restore |
| A page rendering a styled nothing — error shell, dead fixture, unresolved skeleton | `e2e/working-truth.spec.ts` (47 declared proofs, both directions) |
| A store read crossing the tenant boundary by accident | `src/tenancy/store-reads.test.ts` (87 functions classified, both directions) + AR31's browser assertions |
| A WCAG 2.2 AA violation on any scanned rule, any of 47 routes, **zero** exemptions | `e2e/a11y.spec.ts` |
| The finder's rendered order diverging from the engine's, an invitation not reaching the staff queue, a register change leaving no audit trace | the three outcome journeys (AR38, AR39, AR40) |

## 2. Explicitly NOT guaranteed

**The thirteen unenforced taste rules.** Pinned in `UNENFORCED_COUNT`; a green verify says
nothing mechanical about them. By name, classified by *why*:

| rule | why it is unenforced |
|---|---|
| `layout.one-idea` | judgment-call — "one idea" has no honest machine proxy |
| `layout.shared-row` | judgment-call — relatedness of facts is editorial |
| `layout.five-then-rest` | mechanizable — no detector built yet |
| `type.serif-display` | mechanizable — no computed-style sweep built yet |
| `type.numeric-typography` | mechanizable — no census built yet |
| `motion.carries-meaning` | judgment-call — meaning is reviewed (design-motion-principles audit mode), not detected |
| `motion.autoplay-stop` | mechanizable — no detector built yet |
| `motion.consult-view-transitions` | process rule — governs how authors work, not what renders |
| `honesty.clinician-declaration` | partially covered (profile sweep, O163's registers); full guarantee needs provenance types |
| `honesty.qa-capture` | process rule — partially checked by `src/quality/qa-record.test.ts` |
| `review.screenshot-both-viewports` | process rule — the review procedure itself |
| `review.walk-fix-smallest` | process rule — the review procedure itself |
| `review.recapture-record` | process rule — the review procedure itself |

**AR18 closed `type.palette-tokens`'s covered-but-unlinked gap** (§3 had priced it *trivial*,
and it cost exactly that): `enforcedBy` now cites theme-parity's hex ratchet, tagged and
route-scoped, `UNENFORCED_COUNT` 14 → 13. It moved to the probe-less list below, not off it —
§3 now prices that probe instead of the link.

**The six enforced rules with no mutation probe** (their detectors run, but nothing plants a
violation to prove they would catch one): `honesty.claim-earned`, `honesty.no-testimonials`,
`interaction.errors-plain`, `interaction.hover-focus`, `motion.reduced-motion`,
`type.palette-tokens`.

**Bounds that are properties of the method, not backlog:**

- Hash baselines guarantee **sameness, not beauty** — a wrong design that never changes stays
  green. Taste remains with the founder and the review skills.
- The honesty linters hold a **short vocabulary**; drug and instrument names pass unexamined.
- 27 of 47 working-truth proofs are **copy proofs**: they prove the page rendered its sentence,
  not that the sentence is right.
- **One theme, still.** AR18 measured and reported rather than built a second one: this tree ships
  exactly one literal theme (no `prefers-color-scheme`, no `data-theme` — AR15's own finding), so a
  toggled dark MODE has nothing to assert about. What AR18 built instead is a census of the site's
  real second surface — inverted grounds (`--ground`/`--cv2-ground`/`--s-dark`/`--ink` as a
  *background*, light text on top): 18 such sites across 4 tokens, every one's same-rule foreground
  resolved and measured 13.30–17.48:1, all clear of the WCAG floor (`src/design/dark-grounds.ts`).
- **Two simultaneous sessions** are out of e2e scope (W83's no-theatre rule); cross-practice
  write isolation is unit-tested, browser-witnessed only within one session (AR31).

## 3. What each closable gap costs

Priced in loop units against what the same shape actually cost this lane.

| gap | cost | grounds |
|---|---|---|
| `layout.five-then-rest` detector | one unit | a rendered-list census (rows visible vs a "more" control) — the touch-floor shape |
| `type.serif-display` sweep | one unit | computed `font-family` on display headings, all routes — the contrast-sweep shape |
| `type.numeric-typography` census | one unit | `tabular-nums`/glyph scan over rendered numerals — the type-scale shape |
| `motion.autoplay-stop` detector | one unit | infinite-animation census with a pause-control assertion; reduced-motion's loader is adjacent |
| Probe for the honesty pair | one unit | plant a testimonial on a real route, `probeVerdict` contract — AR9–AR12's exact shape, paid five times already |
| Probe for `interaction.hover-focus` | one unit | suppress a ring under the detector and require red |
| Probe for `interaction.errors-plain` | one unit | plant coded-error copy on a refusal surface |
| Probe for `motion.reduced-motion` | one unit — **and its recorded blocker is stale**: the entry's `whatAProbeWouldMutate` says the rendered-behaviour half must be built first, but AR20's rest-state sweep already built it; only the note survived | inject an animating element with no static equal under emulated reduce |
| Probe for `type.palette-tokens` | one unit | plant a raw-hex literal in a real component/CSS rule and assert theme-parity's ratchet goes red against the LIVE ceiling constants, not just a fixture string |
| `honesty.clinician-declaration` full guarantee | one to two units | provenance types (the W152 class): declaration-sourced strings become unrepresentable otherwise |
| Judgment-call rules (`one-idea`, `shared-row`, `carries-meaning`) | **not honestly mechanizable** — priced as review discipline, not units | a detector would enforce a proxy, and the proxy would become the rule (Goodhart) |
| Process rules (qa-capture, the three `review.*`, `consult-view-transitions`) | **not test-shaped** — they govern the loop's conduct; `qa-record.test.ts` already pins the record-keeping half | — |

The order to spend units, if the founder wants the bound raised: the honesty-pair probe first
(it guards law 6), then the three mechanizable detectors, then the remaining probes. The
trivial link should ride along with whichever unit next touches the taste register.
