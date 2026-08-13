# W154 — Q12 hardening (education engine)

Scope: W144–W153 (boundary document, curation, case triggers, CPD trail, pre-consult updates,
education console, provenance, prompt-injection posture). W146 and W147 are blocked on the
proposed gate G8 and were not built, so nothing here reviews them.

**Reviewer's independence:** W152 is mine and the rest of Q12 is builder-A's. The finding below
is against the seam between the two, and it is as much a gap in my unit as in theirs — W152
built a gate and did not wire its only consumer. The method is the one the earlier audits
settled on: sweep for known bug classes mechanically, rather than reread code I already believe
is correct.

## Verdict

**One critical, fixed.** Gate green at HEAD: 140 test files, 1748 tests, typecheck, build and
`audit:gate` clean.

## Findings

### Q12-1 — CRITICAL: the education console never applied the provenance gate — FIXED

`app/console/education/page.tsx` (W151) called `curate(getLibrary(), …)` and rendered the
result directly. It never went through `renderableItems`/`renderable`, so W152's guarantee —
*an item with no signed-off source is unrenderable* — was enforced by the type system and
applied by nobody, on the only surface in the tree that renders education material.

The seed made the consequence concrete rather than theoretical. `/api/mock/education` gave each
item a `sourceRef` like `"signed-off-source-a1"`: a string pointing at nothing. The console
rendered those strings in a field labelled **Source**. That is exactly the failure W152's header
says it exists to prevent — not fabricated material, but material that *looks* sourced — and it
was live on the page while the module claiming to prevent it sat one import away.

Worth being precise about why the type gate did not catch this: a brand stops you passing the
wrong thing to a function that asks for the right one. It cannot make a surface *ask*. W151 was
written before W152 landed and simply took `RankedItem`, which is a legitimate type; nothing was
bypassed, the gate was just never joined up. **A type-level guarantee is only as wide as the set
of call sites that opted into it, and nothing in the tree checks that set.**

**Fix, three parts:**

1. The console runs the curated order through `renderable()` and renders only what passes.
   Withheld items are **named with their reason**, not dropped — W68's rule, and the reason
   W145's "must not withhold" is not violated here: that rule protects against hiding material
   on a *patient-level* judgement, and this is a content-governance fact reported in full.
2. `getSignedOffSources()` was added to the education store, fed only by `addSignedOffContent`,
   which takes `ApprovedContent[]`. The store cannot be handed a source that never cleared G5,
   because the parameter type refuses it.
3. The mock now drives **W69's real sign-off workflow** to produce its sources, instead of
   typing ref strings. `usableContent()` is the only way to obtain the branded value the store
   requires, so the synthetic world demonstrates a sourced item because something was actually
   signed off in it. One seeded item deliberately keeps an unbacked ref so the withholding path
   is exercised on every run.

**Also corrected while fixing it:** the page rendered `libraryAllShown` — "Every item about a
register this practice runs is above, in full" — unconditionally. Alongside a list of what was
held back, that is the page contradicting itself. It is now rendered only when nothing was
withheld, and the withheld panel says outright that the ordering figures below it count material
from before the check. An e2e asserts both directions, so the honest claim survives when it is
true and disappears when it is not.

## Confirmed-clean controls

| Control | Evidence |
|---|---|
| G8 (proposed) — no third-party model reached | Zero `fetch`, zero `anthropic`/`claude-*` references anywhere in `src/education` or W153's modules. W146/W147 remain unbuilt and blocked, which is why |
| G7 — no symptom inference | `triggers.ts` matches recorded fact codes only; `curate` has no parameter that lets a patient-level fact affect membership, asserted as a multiset identity |
| CPD is the clinician's | `trailFor` and `cpdEntriesFor` both filter on `clinicianId`; `recordCpdEntry` refuses `not_your_entry`; the seed plants a colleague's entry and an e2e asserts it never appears |
| Practice/clinician scoping | The W103 sweep over every Q12 module: zero modules that iterate an id-bearing collection without comparing the id |
| W150's advice linter reaches the new copy | Confirmed non-vacuously — injecting "Consider reviewing…" into the sentence added by this unit fails `advice-lint.test.ts` |
| Reachability | `reachability.test.ts` still green: no education module pulls a build-time-only package into a request-serving path |

## Process observations (for the plan owner, not defects)

1. **Nothing checks that a branded gate has consumers.** Q12-1 is the second bug of this shape
   in two quarters — W103's B1 was a function nobody could call correctly, this is a function
   nobody called at all. Both are invisible to type checking, which verifies the call sites that
   exist and says nothing about the ones that should. A cheap check would be a test per branded
   type asserting that at least one non-test module consumes it; a better one would name the
   expected consumers, the way the census names expected surfaces.
2. **Two of Q12's specs carry no vacuity guard** (`store.test.ts`, `triggers.test.ts` have no
   non-empty assertion before their scans). Not defects — both operate on fixtures they
   construct — but the tree has been caught twice by vacuous tests, and the guard is one line.
3. **Mock seeds are product claims.** The `"signed-off-source-a1"` strings were not a test
   shortcut; they were rendered to a user in a field labelled Source. Synthetic data that stands
   in for a governed fact should be produced by the governing workflow, not typed — which is now
   how this seed works, and is worth applying wherever else a mock fabricates a provenance
   field.
