# Simplicity laws

> U15 (R0), 2026-09-02. The refactor lane's rules, in this tree's voice. Each one is a register
> with a test that can fail; where a law has no register it says so, and that is a defect to fix
> rather than a rule to trust.
>
> **These laws are about SHAPE, not behaviour.** None of them may be satisfied by changing what the
> product does. Where a law and a compliance rule disagree, the compliance rule wins — the tree's
> §6 laws beat everything, and a smaller codebase that makes a clinical claim is not a win.

## Why these four

The one-year plan's §2 opens the refactor lane by measuring the tree (U14) and then stating what
the measurements are *for* (this unit). The measurements alone would be a dashboard. What makes
them a lane is a small number of rules that say which direction is better, and a register per rule
so "better" is checked by a machine on every `pnpm test` rather than remembered by whoever last
read the plan.

Four rules, because four is what the census actually exposed: things written twice, things nobody
reaches, files too long to hold in one head, and modules that exist for a single caller.

---

## Law 1 — one implementation per concept

**A block of code written twice is a defect.** Not a style preference: two copies drift, and the
drift is discovered by a reader who trusts the copy that was not fixed.

- **Register:** `ACCEPTED_DUPLICATES` in `src/quality/simplicity.ts`.
- **Detector:** `duplicateBlocks()` in `src/quality/simplicity-read.ts` — normalised 12-line
  windows compared across `src/` and `app/` together. Indentation and spacing are normalised away,
  so a copy somebody reindented is still a copy. Comment-only and blank lines are dropped, so
  prose does not create or hide a match.
- **Today:** zero. An empty register and a broken detector look identical from the outside, so the
  emptiness is not left to be trusted: `simplicity.test.ts` plants a real copied block in a real
  directory — reindented and respaced, to prove the normalisation is doing work — and requires the
  real walk to find it, then requires an acceptance to silence it. (`LEGITIMATELY_EMPTY` in
  `non-vacuous.ts` is not the right guard here and does not carry an entry for it: that register
  covers assertions that LOOP over an empty list, and this one asserts on findings.)
- **Twelve lines, and why:** long enough that two matching windows are a copied block rather than a
  shared idiom (an import list, a four-case switch, a props interface); short enough to catch a
  copy that was edited slightly afterwards.

**To accept a duplicate:** add an entry with both files, a date and a reason. There is no way to
silence one without saying who decided and why.

---

## Law 2 — reached, lawful, gated, or deleted

**Every module in `src/` is one of four things:** imported by the product, part of the machinery
that judges the product, held behind a named gate, or dead. There is no fifth category, and
"we might need it" is not a reason — it is the absence of one.

- **Register:** `MODULE_REASONS` in `src/quality/module-reasons.ts`, one entry per module the
  product's import closure does not reach.
- **Tags:**
  - `law` — read by a gate, a test, a script or a document generator in this tree. Unreached
    **by design**: a law the product imported would be a law the product could bend.
  - `gated:<ref>` — real product that may not run yet. The reference is a **founder gate**
    (`G1`–`G10`, `docs/FIVE-YEAR-PLAN.md` §4) or the **plan unit** whose surface will reach it
    (`W48`, `W97`, `W157`, `W214`). Both are named gates in this law's sense: somebody decided, on
    the record, that this may not run yet. A tag naming neither is not a reason, it is a shrug, and
    `moduleReasonFindings` reports it as `bad-gate`.
  - `delete` — nothing reads it, no gate holds it, no unit needs it. **U15 names; U30 removes.**
- **Both directions.** A module that leaves the product's closure and is not tagged fails. An entry
  naming a module that is now reached, or gone, fails too — a register that only fails one way rots
  into a list of things that used to be true.
- **Every `why` is the module's own first header line**, not a sentence composed here. A reason
  written about a module describes what somebody assumed on the day; quoting the module means the
  reason changes when the module does, and a module whose header says nothing has to earn one.

**Today: 133 modules — 50 `law`, 82 `gated`, 1 `delete`.** The one deletion is
`src/lib/version.ts`: two exports, no importer anywhere in `src/`, `app/`, `e2e/` or `scripts/`.

> The plan's U15 row says 127. That was the tree on the day the plan was laid; U1–U14 and O230 each
> added law modules the product does not import, and this unit's own three registers are the last
> of them — a register that judges the product is, by its own rule, a module the product must not
> reach. The register covers the **measured** set, and this paragraph is the recorded delta, the
> same way U14 recorded §1's drift rather than bending the tree to match a number.

---

## Law 3 — a long file carries a dated reason

**Over 600 lines, a file has to argue for itself.** The number is not sacred; the argument is. A
file nobody can hold in one head is where behaviour hides, and the cheapest moment to notice is
when it crosses the line rather than two years later.

- **Register:** `LONG_FILES` in `src/quality/simplicity.ts` — file, the length that was argued, a
  date, and a reason in sentences.
- **Four ways it fails:** a file over the floor with no entry (`unlisted`); a listed file that grew
  past the length its entry argued (`grown`); an entry for a file now under the floor
  (`stale` — bank the win rather than keeping the exemption); an entry whose reason is too short to
  be one (`no-reason`).
- **`stale` is the one that matters most.** An allowlist that never shrinks is a place things go to
  stop being measured. When a file comes back under the floor its entry must go, so the register
  always describes the tree as it is.

**Today: nine files.** Four are data (the compliance corpus, the roster, the example personas, the
taste register) and the census pins data separately for exactly that reason; four are the matching
engine and the finder's state machine, which the R2 units split; two are the story's scene list and
the fleet simulation, which shorten only by having less to say.

---

## Law 4 — one caller is a shape to look at

**A module imported by exactly one other module is usually an indirection nobody asked for.**

A module imported by nothing but its own test is the sharper case — usually it exists to be tested,
which is a module with no reason to exist. **Usually, not always, and this unit is the exception
that forced the qualifier.** `module-reasons.ts`, `simplicity.ts` and `simplicity-read.ts` are each
imported by exactly one file: `simplicity.test.ts`. That is not an accident to be exempted, it is
what `law` MEANS in this tree — W53's shape is a module that decides, a script or test that reads
it, and nothing in the product touching either. A law whose only caller is its enforcement point is
a law working correctly; a law with a second caller inside the product would be a law the product
could bend.

So the rule is: **a module imported only by its own test is a defect unless it is tagged `law` in
the module-reasons register.** The first draft of this document said "always wrong" and the census
caught it two hours later, on the three modules this very unit added — which is the register doing
its job to its author.

This law is a **ceiling, not a list.** Naming all 65 single-importer modules would produce a
register nobody reads and every unit would have to edit. What a refactor lane needs is the number,
moving down.

- **Register:** U14's ratchet, via `src-single-importer-modules` and `src-test-held-modules`. The
  constants in `simplicity.ts` name those census keys so the two files cannot describe the same law
  with different words.
- **Enforcement:** the census floor. Both counts may fall freely; either rising needs a dated,
  reasoned raise like any other measure — and `src-test-held-modules` rising for a NON-`law` module
  is the case the qualifier above does not cover, which the raise's reason has to say outright.

---

## What this unit deliberately did not do

It deleted nothing, moved nothing and renamed nothing. Every finding above is a **name**, and the
units that act on them are already in the plan: U16 (the linter and the junk), U30 (the `gated:`
tags executed and `delete` carried out), R1–R3 (the long files). Naming a thing and doing it are
separate units on purpose — this one has to be reviewable as a set of claims about the tree, and a
unit that also changed the tree could not be.
