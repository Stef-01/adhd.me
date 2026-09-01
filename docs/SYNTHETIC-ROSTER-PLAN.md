# Seeding the finder with synthetic GP profiles — the plan (O217 lane)

> Founder-requested 2026-09-01: "make the finder seeded with some dr profiles that are synthetic."
> This document is the plan, not the work. Nothing below is built; the first unit records the
> founder's answers to the gate questions in §2 and only then does data exist.

## 1. Where the tree stands, and why this is not a green-field ask

The roster (`src/demo/roster.ts`) holds **two real GPs** and carries a law written in its own
header: *"EVERY ENTRY IS NOW A REAL PERSON."* It used to hold fifteen invented personas —
invented people, invented availability, invented suburbs — and they were removed deliberately,
because fabricated details under plausible names read as real doctors and let the finder be shown
without practice agreements. Seeding synthetic profiles is therefore a **partial, controlled
reversal of a recorded decision**, and the plan's job is to get the demonstration value back
without re-importing the harm the purge removed.

What already exists and shapes the work:

- **`src/demo/synthetic-clinician.ts`** — a neutral engine-test template whose own header says
  *"it must never reach the roster, a fixture that renders, or any surface."* That law stays.
  The seeded personas are a NEW module; the test blank stays boring and unrendered, or fifty
  ranking tests are once again coupled to data somebody will edit for looks.
- **`src/synthetic/generate.ts` (W3)** — a deterministic synthetic-practice engine (seeded RNG,
  10 GPs, calibration targets) already trusted for the console and sim. Precedent for how this
  tree does synthetic data: deterministic, seeded, calibrated, never mistaken for real.
- **`src/demo/real-person-fields.ts` (W193/O162)** — a per-field basis register for claims about
  real doctors, checked both directions. Synthetic entries need the mirror of it (§5), not an
  exemption from the idea.
- **`src/demo/pending-clinicians.ts` (W228)** — the staging area proving the tree already
  distinguishes "asked-for but not declarable" from live. Synthetic is a third, explicit state.
- **The type already almost allows it**: `realPerson?: true` is optional on `Clinician`. That
  looseness is a bug under this plan, not a convenience — §4 makes the distinction a
  discriminated union so an unlabeled entry cannot exist.

## 2. The founder gates — answered BEFORE any data lands (AR36 register entries)

**G-SYN-1 — Where do synthetic profiles render?** Three options, priced:

| Option | What a visitor sees | Price |
|---|---|---|
| **A. Demo-scoped (recommended)** | The live `/finder` stays real-only. Synthetic personas appear only inside the demo-scenario flow (`scenarios-stage`, `/demo`, `/examples`) — surfaces already framed as demonstration — plus the full labeling of §3. | Lowest exposure. The live finder still shows two GPs, which is the honest state of the network. |
| B. Live finder, labeled | Synthetic rows interleave with real ones on `/finder` results, each carrying an unmissable "Example profile — not a real doctor" marking, unbookable, always ranked below every real clinician. | The finder looks fuller than the network is. Even labeled, a stressed reader can mis-take the shape ("12 GPs near me") — the exact misleading-count failure `honesty.claim-earned` exists to prevent. Requires the strictest copy: every count on every page excludes synthetic. |
| C. Dev/e2e-only | Personas exist behind an env flag for local demos and tests; production never renders them. | Cheapest; gives the founder nothing to show. |

Recommendation: **A**, because it is what the demo surfaces are for, and because option B makes
the product's central honesty claim ("it lists every GP in the network") require a footnote.

**G-SYN-2 — Does the sibling repo follow?** Both deployments *"share one roster"*
(`src/demo/clinicians.ts`; the split banner says a shared-code change must be made in both).
The network tree renders each doctor's own page and states "Two Sydney GPs" on its landing —
synthetic profiles on THAT surface would be example people in a gallery presented as the real
network. Recommendation: **finder-only; the network tree does not take the personas**, and both
trees' CLAUDE.md banners record the divergence so the "made in both" rule is consciously waived
for this module rather than forgotten.

**G-SYN-3 — How many, and who are they?** Recommendation: 8–10 personas (with the two real GPs
that puts a demo list at 10–12, enough for "five, then the rest" to mean something). The set is
DESIGNED to exercise every dimension the matcher reads — see §4 — not sampled for realism.

## 3. Non-negotiables, whatever G-SYN-1's answer

These are the laws that made the purge necessary, restated as build requirements:

1. **Marked in the type, not the copy.** `synthetic: true` on every persona; `realPerson` and
   `synthetic` become a discriminated union (§4) so an unlabeled entry is a type error.
2. **Unmistakably fictional on every surface.** Every rendered context — result row, profile,
   compare column, demo walkthrough — carries a visible "Example profile — not a real doctor"
   marking. Not a tooltip, not small print below the fold (`layout.fold-governed`).
3. **Never bookable.** A new `booking: { via: "synthetic-none" }` variant; the profile's booking
   bar renders an explanation ("This is an example profile — there is nobody to book"), never an
   external URL, never a disabled-looking real control. `nextAvailable`-style invented times stay
   deleted; a synthetic profile shows NO availability claim at all beyond open/closed books,
   which the ranking needs (§4).
4. **No faces.** `image: null` on every persona — the monogram is the roster's own supported
   no-portrait state. Nothing generates a photorealistic face: a generated face IS a fabricated
   person presented as genuine, the thing the purge removed.
5. **Names cannot collide with real practitioners.** Obviously-constructed names (the W3 engine's
   name pools, checked against the two real entries), and the label in (2) does the real work —
   a name alone is never the disclosure mechanism.
6. **Counts, coverage and claims stay real-only.** `ROSTER_SIZE`/`rosterSizeInWords`, the
   coverage map (drawn from the gazetteer), the FAQ's "listed Sydney GPs", privacy's "lists
   every GP in the network" — every consumer is audited and fed from `realClinicians`, never the
   seeded set. A count that includes example people is a fabricated network.
7. **The compliance linter reads every synthetic string.** Bios, focus lines, match lines pass
   the same linter as real copy: no clinical claims, no testimonials, no "specialist" beside a
   niche scope. Synthetic does not mean exempt — it renders to the same patients.
8. **Real outranks synthetic at every fit level** in any mixed view (moot under option A's
   default, but pinned as a ranking law with a `syntheticClinician()`-based test either way).

## 4. Data design — `src/demo/synthetic-roster.ts` (new module)

- **Shape**: the same `Clinician` type, via a discriminated union:
  `type RosterEntry = RealClinician | SyntheticClinician` where `RealClinician` requires
  `realPerson: true` and forbids `synthetic`, and `SyntheticClinician` requires
  `synthetic: true`, `image: null`, `booking.via: "synthetic-none"`, and a name from the
  registered fictional pool. `clinicians` (the live export) remains real-only under option A;
  a new `demoRoster` export is real + synthetic, ordered real-first.
- **Authored as committed literals, generated once.** A small script may use the W3 rng
  (`src/synthetic/rng.ts`, fixed seed) to draft the set, but what lands is reviewed literal data —
  the linter, the censuses and e2e need stable strings, and a runtime generator would put
  invented copy on a patient surface that no review ever read.
- **Coverage by construction** (why each persona exists is written on it):
  - every `CareArea` in the closed vocabulary held by ≥2 personas (results never empty per
    archetype);
  - ≥3 languages beyond English (the language-preference path demos);
  - gender mix incl. at least two women (the woman-GP preference path);
  - manner/EI qualities spread across the declared set (the emotional-fit path);
  - suburbs from the REAL gazetteer only (`src/geo/suburbs.ts`) so computed distance works —
    but see §3.6: the coverage map never counts them;
  - books: 2 closed (`acceptingNewPatients: false`), staggered `capacityDeclaredAt` dates so
    the O56 freshness grades render all their states;
  - one persona with long `experience`, one with empty (zero-state rendering);
  - **no `disclosedInterest` on any persona** — the founder-behind tie law stays testable against
    real data only, and an invented disclosure is an invented conflict.

## 5. The synthetic census — `synthetic-person-fields` (mirror of W193/O162)

A register + both-direction test asserting, per persona: `synthetic: true`; `image: null`;
booking is `synthetic-none`; the name is in the fictional pool and collides with no
`realPerson` name; every rendered string passes the compliance linter; and — the mirror of
`REAL_PERSON_FIELDS` — a single recorded basis: *invented, for demonstration; a claim about
nobody*. Plus the negative space: `syntheticClinician()` (the test template) still reaches no
surface, and no synthetic entry reaches `clinicians`/`ROSTER_SIZE`/coverage under option A.

## 6. Surface work

- Result row + profile + compare: the "Example profile" marking, styled from palette tokens
  (no new raw hex — the AR17 ratchet is at 73), muted not accent (`type.accent-live-tokens`),
  44px-clear if interactive (`interaction.touch-44`).
- Profile booking bar: the §3.3 explanation state.
- Demo-scenario flow: seeds `demoRoster` instead of the live list; the existing "Demo
  scenarios" framing already says what the surface is.
- `/examples`: worked examples may reference personas by name once they exist.

## 7. Blast-radius inventory (what will go red, and what re-derivation it demands)

| Check | Impact |
|---|---|
| `real-person-fields.test.ts` | Untouched under the union (it walks `realPerson` entries only) — verify direction-2 still passes. |
| `clinicians.test.ts`, corpus/oracle matching tests | Run over `clinicians` (real-only) — assert unchanged; add `demoRoster` laws (real-first, §3.8). |
| `roster-size.ts` consumers (`/examples`) | Stay real-only; test pins it. |
| e2e sweeps (results counts, profile walk, touch/contrast/fold) | New badge and booking-explanation states enter the walked surfaces; contrast measured, not assumed. |
| AR15/AR16 visual baselines | Any rendering change is a manifest re-acceptance under the three-run protocol with this unit's id. |
| Perf budgets (`/finder` heaviest at 653 KB) | +8–10 text-only entries; re-run `perf:gate`, re-pin only if it genuinely moves. |
| Compliance linter + W200 copy census | New module needs its `// W<n>` header and its strings linted. |
| AR36 founder-gate register | G-SYN-1/2/3 recorded as decisions with dates and the founder's words. |

## 8. Unit breakdown (one per firing, ledger-claimed in order)

1. **O217 — the gates and the seam.** Record G-SYN-1/2/3 answers in `founder-gates.ts`; split
   `RosterEntry` into the discriminated union; add the `synthetic-none` booking variant and its
   rendering stub behind the flag; nothing renders yet. Verify: `pnpm verify` green, censuses
   untouched.
2. **O218 — the personas and their census.** `synthetic-roster.ts` data + `synthetic-person-fields`
   register/test + linter coverage. Verify: `pnpm verify`, both-direction census tests, linter over
   every string.
3. **O219 — the surfaces.** Badges, booking-explanation state, demo-flow wiring per G-SYN-1's
   answer. Verify: `pnpm verify` + targeted e2e (results, profile, compare) + qa/ captures at
   390 and 1280 + DESIGN-QA entry.
4. **O220 — the honesty sweep.** Audit every count/coverage/claim consumer against §3.6; pin each
   with a test. Verify: `pnpm verify` + the guidelines/compliance e2e sweeps.
5. **O221 — baselines and the gate.** AR15 three-run re-acceptance, full `pnpm e2e`, gate line
   updated with real figures.

Rollback at any point is deleting `synthetic-roster.ts` and its census — the union and the
booking variant are harmless without data, which is the same shape the purge proved works.
