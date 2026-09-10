# ADR 0007: Bidirectional GP matching (the matching-model brief) on this app

**Date:** 2026-09-09 · **Status:** accepted (founder-directed: "advance the consolidated plan to implement these features as a 6 month sprint into the adhd.me repo")

## Context

The founder handed a third brief: upgrade the matching model from one-directional search (patients
search, GPs are passive listings, the shape of Meddle, OpenCare and My Specialist GP) to a
bidirectional model with rich structured GP bios, GP-declared caseload preferences and capacity,
a two-stage pipeline (candidate generation by hard filters plus cosine similarity of embeddings,
then a stable-matching refinement by deferred acceptance presenting a top three with a rationale
each), and a post-consult mutual feedback loop. It names five entities (Patient, GP, Match,
Feedback, Document_Checklist), five surfaces (intake, GP profile, GP dashboard, pre-appointment
prep, mutual feedback), and asks for a modular service under `lib/matching/` generalisable to
other conditions.

This repository already had two matchers: the finder's lexical ranker (`src/demo/clinicians.ts`,
`src/matching/needs.ts`) and an allocator with hard filters and weighted scoring
(`src/matching/allocation.ts`), plus a greedy slot assigner whose header names deferred
acceptance as its successor (`src/matching/match.ts`). It had no embeddings, no vectors, no
feedback or rating type, and a compliance rule refusing ratings and testimonials on every public
surface (`src/compliance/landing.ts`, `src/directory/profile.ts`).

## Decisions

1. **A new service under `src/lib/matching/`, composed of the existing readers, not a fork of
   them.** Candidate generation, both-sided ranking and the deferred-acceptance loop are separate
   modules with one composing pipeline. The intake reader introduces no reading of its own: care
   asks and manner come from `readNeeds`, distance from the gazetteer, and the only new reader is
   the embedder's closed concept vocabulary. Generalising to another condition is a change to
   `types.ts` and the vocabularies, not to the pipeline.
2. **The embedding is lexical, behind an `Embedder` interface.** `read.ts` refused a
   sentence-embedding model for the finder (20MB download, a threshold where a sentence should be)
   and that argument holds. The brief's cosine is real: a 259-dimension vector with a concept
   layer (one dimension per closed concept) and a hashed, IDF-weighted stem layer, unit-normalised
   so the dot product is a cosine. The concept layer is what the rationale reads back, which is how
   "why this GP" is generated from the embedding overlap without ever quoting the patient. A dense
   model replaces it behind the same interface in Phase M5 without any caller changing.
3. **Deferred acceptance, many-to-many, patient-proposing.** Patients propose in their own order
   until they hold three; a GP holds up to declared capacity and keeps the best by their own
   ranking. Stability is asserted by a property test over generated markets (`blockingPairs` is
   exported so a reviewer can run it on any result). The mechanism is strategyproof for the
   proposing side, which is the reason `match.ts` named it: with a GP-facing capacity screen, a
   first-come queue would pay GPs to under-declare.
4. **The GP side ranks fit to a declaration, never need.** Age group, comorbidity mix, consult
   style, billing, similarity, capacity, with a declared minimum fit below which a patient is
   unacceptable before any proposal. This is the brief's "decline low-fit matches before booking",
   done up front. Nothing anywhere orders patients by how unwell they are (G7).
5. **Feedback is recorded fact, not a published rating.** Both sides answer 1 to 5 questions about
   fit and appropriateness; the records feed the GP's aggregate and a bounded learning loop that
   moves the global patient-side weights by at most half of themselves, from at least eight
   records, from the declared base every time. The one thing a patient may read is a count of
   people who said they felt understood, with a floor of five, because a share of three is a
   testimonial with a denominator. The `no-ratings` rule stands on every public surface, and the
   linter holds every rationale, checklist and expectation sentence.
6. **The real-person law holds.** For the two listed clinicians nothing is invented: undeclared
   credentials are null and the page says "not declared". Synthetic examples get deterministic
   declarations from a hash of their id, labelled as examples on every surface.
7. **Persistence is the tree's mock posture, mirrored in SQL.** The store is in memory behind
   `globalThis`, registered with the reset registry and the privacy record-classes register as a
   stored class with erase and export. `supabase/migrations/0006_matching.sql` carries the shape
   for the wiring unit. A patient's request is keyed by a random id that lives only in the
   person's session storage, never in a URL or a log line.

## Consequences

- **On a serverless host the store is per instance, and the two sides only meet on one process.**
  Found on the first live probe after shipping: the intake succeeded on one instance and the
  results read landed on another, which had never seen it. The patient side therefore keeps the
  view it was given in the tab's session storage and reads it back when the server has moved on,
  saying so on the screen; the GP dashboard and the mutual feedback are a single-process
  demonstration (the e2e suite, `pnpm dev`, `/demo`) until Phase M5 wires the store. This is the
  same posture every other store in the tree has, made visible by the first surface where the
  two sides have to meet. **2026-09-10:** the wiring exists as a journal
  (`src/lib/matching/persistence.ts`): with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set,
  every write is mirrored to the `0006_matching.sql` tables in order and a cold instance
  hydrates from them before its first read, so the two sides meet across instances; without
  them nothing changes. Switching it on is a founder act, because it is the first time a
  narrative leaves the process.

- `PLAN.md` gains Phase M, the six-month sprint, with M1 to M4 shipped in this unit and M5 to M6
  planned. `CONTEXT.md` gains the vocabulary.
- Three founder decisions are opened rather than answered here: whether a GP-facing evidence upload
  may exist before the practice-scoped vault is wired (the credentials lane deliberately had no
  add form); whether "felt understood" counts may appear on a public profile at all under the
  Ahpra testimonial guidance, given they are counts rather than scores; and whether the existing
  finder should route to `/match` or the two coexist.
- The console gains `/console/gp` under Configure. Since 2026-09-10 a profile is managed by the
  practice that claimed it (`src/lib/matching/access.ts`, `practiceId` on the GP row, migration
  0007): unclaimed profiles are claimable by any practice, a claimed one is reachable by that
  practice's members and ADHD.ME staff only, and every action re-checks. A claim is a declaration,
  not a verification; the list says so.
