# AUDIT-AR — the aesthetic-review quarter, re-derived from source

> **AR34** (2026-08-25). Method is W51's: every number below is **re-derived from the live
> registers at audit time**, not summarised from ledger rows — and `src/quality/ar-audit.test.ts`
> re-derives each one on every `pnpm verify`, so this document cannot rot into prose. A number
> here disagreeing with the tree is a build failure, not a stale report.

## 1. What the system is

The AR lane built an enforcement stack over how the product looks and whether it works, in five
layers, each with its own register and its own both-directions census:

1. **Taste law** — `src/design/taste-register.ts` binds `adhdme-taste` rules to the tests that
   enforce them (`enforcedBy`, tag-verified in both directions), with the unenforced remainder
   pinned so it can only shrink deliberately.
2. **Pixel truth** — AR15's deterministic capture harness plus AR16's accepted-diff register:
   `qa/baselines/manifest.json`'s sha256 must equal the newest `ACCEPTED_DIFFS` entry, so every
   visual change is attributed or the build is red.
3. **Liveness proof** — the AR9–AR13 mutation-probe architecture: detector families whose probes
   plant violations and must see them found, plus a pinned list of enforced rules that
   deliberately have no probe.
4. **Behavioural sweeps** — route-derived (never hand-listed) sweeps for touch, contrast, focus,
   semantics, fold, reduced motion, honesty (public and console), working truth, a11y (WCAG 2.2
   AA), and the three outcome journeys (finder ranking, booking, console practice flow).
5. **Gates** — `pnpm verify` runs typecheck · test · build · `audit:gate` · `perf:gate`; the
   e2e half is the sweeps above.

## 2. The inventory, derived

Every row below is asserted against the live source by `ar-audit.test.ts`.

| what | derived value |
|---|---|
| taste rules in the register | 22 |
| …enforced (non-empty `enforcedBy`) | 9 |
| …unenforced, pinned (`UNENFORCED_COUNT`) | 13 |
| mutation-probe families | 5 |
| enforced rules without a probe (pinned) | 6 |
| accepted-diff entries (AR15 initial + 7 attributed changes) | 9 |
| baseline captures in the manifest | 180 |
| manifest sha256 == newest acceptance | **true, checked live** |
| per-route shipped-JS budgets | 49 |
| working-truth route proofs | 47 |
| …fixture-derived / copy proofs | 20 / 27 |
| public surfaces classified by audience | 16 |
| public accepted findings | 0 |
| console accepted findings (data-vs-copy argued) | 2 |
| standing flags / product flags | 2 / 1 |
| zero-states classified | 32 (+2 not-a-zero) |
| store functions tenancy-classified (W209) | 87 across 12 modules |
| touch-floor exemptions | 0 |
| a11y exemptions (WCAG 2.2 AA, all 47 routes) | 0 |

## 3. Cross-checks performed at audit time

- **The baseline chain held through the whole Phase-4 run.** Nine consecutive units (AR29–AR33,
  AR37–AR40) each claimed "no baseline movement"; the manifest's sha256 still equals AR26's
  acceptance, which is those nine claims proven at once rather than trusted nine times.
- **The pins agree with the things they pin.** `UNENFORCED_COUNT` (13) equals the derived
  unenforced remainder (22−9); `PROBED_FAMILY_COUNT` (5) equals the register's family count.
- **Every acceptance register that could go stale has a stale-check** (public sweep, console
  sweep, accepted-diffs, working-truth proofs, route budgets, store-reads, a11y) — verified by
  reading each test, not by convention.

## 4. Findings

**AR34-S1 — two "every route" derivations disagree by one route, and the disagreement is
understood rather than papered over.** `ROUTE_BUDGETS` (50) derives from the *build manifest*;
`ROUTE_PROOFS` (49) derives from the *filesystem census*. The difference is exactly
`/_not-found` — Next's synthesized 404 page, which is a shippable JS payload (so the perf gate
must budget it) but not a visitable route (so the working-truth sweep cannot goto it as itself).
The 404 *surface* is still proof-swept: `/about` is founder-gated behind `notFound()` and its
working-truth proof IS the 404 copy. Recorded as a seam, not a defect; it becomes one only if a
third "every route" derivation appears without naming which census it follows. **U3 (2026-09-02)
adds a second named member to the seam:** `/api/mock/fault/[kind]`, the fault fixture, is a
budgeted payload (the build ships it) with no working-truth proof, because the route exists to
throw — the content it "renders" is `app/error.tsx`, which `e2e/error-boundary.spec.ts` holds to
its copy and the working-truth register refuses by construction. The test pins both members.

**AR34-S2 — the taste register is 9/22 enforced, and that bound belongs in the dossier.** The
13 unenforced rules are pinned and can only shrink deliberately, but a green verify today
enforces 41% of the written taste law mechanically; the rest is review discipline. This is the
honest input to AR35 ("what the review system guarantees, what it explicitly does not").
**AR18 update:** `type.palette-tokens` moved from unenforced to enforced in the same unit that
wired it — AR17 had already shipped the check (`theme-parity.ts`/`.test.ts`) but never wired it
into the register, so this is a bookkeeping close, not new coverage; the 8/22 → 9/22 and
36% → 41% movement above is that one rule.

**AR34-S3 — six enforced rules have no mutation probe**, pinned in `ENFORCED_WITHOUT_PROBE`:
`honesty.claim-earned`, `honesty.no-testimonials`, `interaction.errors-plain`,
`interaction.hover-focus`, `motion.reduced-motion`, `type.palette-tokens` (AR18: newly enforced,
its `whatAProbeWouldMutate` asks for a probe against the LIVE ceiling constants, not just the
fixture-string test theme-parity.test.ts already runs). Each carries its recorded reason; the
honesty pair is the strongest candidate for a future probe (a planted testimonial on a real
route), costed in AR35 rather than built here.

**AR34-S4 — the review horizon is real and dated.** The two console-honesty acceptances fall
due 2027-02-25; the two dependency-advisory acceptances carry their own dates in
`AUDIT_ALLOWLIST`. Nothing else in the stack expires silently.

No new defect was found by this audit. The last three found by measurement inside Phase-4 units
were each fixed in the unit that found them (AR37: `/about` understood as founder-gated, not
broken; AR39: the state-fixture rail reset documented at both sites; AR40: the unaudited
register toggle, fixed).

## 5. What this audit does not establish

- Hash-equality baselines prove **sameness**, not beauty: a wrong design that never changes
  stays green. Taste stays with the founder and the review skills.
- The working-truth copy proofs (28 of 50) prove the page *rendered its sentence*, not that the
  sentence is the best one.
- The honesty linters hold a short vocabulary (recorded in `public-surfaces.ts`): drug names and
  instrument names pass unexamined.
- One theme lane is live at audit time: AR17 (light) done, AR18 (dark) claimed by another
  session; this audit's numbers do not cover a second theme's parity.
