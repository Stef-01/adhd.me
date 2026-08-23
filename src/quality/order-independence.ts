// W167: order-dependence, made mechanical.
//
// A fold turns a collection into one answer. When two records tie on whatever the fold compares,
// the answer becomes whichever one the input happened to list first — and the input order comes
// from a store query, an ingest, or a `Map` iteration, none of which anybody chose. So the bug
// is not that the fold is wrong; it is that the fold is RIGHT ONLY ABOUT THE ORDER IT WAS GIVEN,
// and nothing in the code says so.
//
// This is not hypothetical in this tree. W118's `pathwayAt` picked "the most recently published
// version at or before this instant" with a `reduce`, and on two versions published at the same
// timestamp it returned the superseded one — which W128 then found only because a mutation check
// showed the guard compensating for it was untested. That bug was invisible to review, to types
// and to every existing test, and the shape recurs: three of this tree's twelve fold modules had
// the same tie-sensitivity when this register was first built.
//
// Two things make it mechanical rather than another thing to remember.
//
//   THE REGISTER IS CHECKED AGAINST THE TREE, both directions, the way W102's surface census and
//   W106's record classes are. A new fold site fails the suite until it is declared; a declared
//   site that no longer exists fails too, because a register describing code that has moved
//   reads as coverage. Nothing here depends on anyone remembering the rule.
//
//   EVERY ENTRY CARRIES A DISPOSITION, and there are only two: a tie-break TEST, or a written
//   RATIONALE for why ties cannot arise or cannot matter. "Someone looked at it" is not one of
//   them. Most sums earn a rationale in a sentence — addition is commutative — and that is the
//   point: the cheap cases stay cheap, so the expensive ones stand out.
//
// The property helper is deliberately tiny. It runs the fold over a collection and over its
// reverse and requires the same answer, because "both orders, same answer" is the whole property
// and a more elaborate harness would be a thing to maintain rather than a thing to use.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Assert a fold gives the same answer whichever way round its input arrives.
 *
 * Takes the records ALREADY TIED on the fold's comparison key — constructing the tie is the
 * caller's job, because only the caller knows what this fold compares. A helper that guessed
 * would pass on collections that never tie, which is the vacuous version of this test.
 */
export function foldIsOrderIndependent<T, R>(
  fold: (items: readonly T[]) => R,
  tiedRecords: readonly T[],
): { stable: boolean; forward: R; reversed: R } {
  const forward = fold(tiedRecords);
  const reversed = fold([...tiedRecords].reverse());
  return { stable: JSON.stringify(forward) === JSON.stringify(reversed), forward, reversed };
}

export type Disposition =
  /** A test that constructs a tie and pins the answer. */
  | { kind: "tie_break_test"; test: string }
  /** Why a tie cannot arise, or cannot change the answer. */
  | { kind: "rationale"; why: string };

export interface FoldSite {
  /** Repo-relative module path. */
  module: string;
  /** How many folds it contains, so adding one to a declared module still fails. */
  folds: number;
  disposition: Disposition;
}

/**
 * Every module that folds a collection to one answer.
 *
 * Ordered by path. `folds` is a count rather than a line number on purpose: line numbers churn
 * with every edit above them, and a register that fails on unrelated edits gets its numbers
 * bumped without anyone reading the code.
 */
/*
 * KNOWN GAP, MEASURED UNDER W252 AND NOT CLOSED THERE.
 *
 * `discoverFoldSites` finds a fold by matching `.reduce(`, `.at(-1)` and `[x.length - 1]`. Those
 * are the shapes the eight historical instances had, and they are a PROXY. A collection
 * accumulated into a `Map` in a `for` loop and emitted through a sort is a fold by every meaning
 * that matters here — a collection collapsed to grouped answers, with an emission order somebody
 * chose — and it matches none of the three patterns.
 *
 * W250 added exactly such a fold to `src/verticals/completeness.ts` (grouping blockers by the act
 * they wait on) and this register said nothing. A sweep for W252 found TWENTY modules in `src/`
 * that group-then-emit, SIXTEEN of them undeclared here.
 *
 * The difference from the gap W247 recorded in W106 is worth stating, because the two look alike
 * and want opposite treatment. There, a blanket rule would have carried 39 exceptions, so the rule
 * itself was wrong. Here the rule is RIGHT: every one of those sixteen genuinely needs a
 * disposition, because every one of them chooses an emission order. What makes it a unit of its
 * own is the sixteen pieces of analysis — each needs somebody to establish whether its sort is a
 * total order, which is the same work this register demands of every entry below and cannot be
 * done sixteen times in passing.
 *
 * Until then: W252's `src/verticals/scaling.test.ts` is the disposition for the one fold W250
 * added, pinning it order-independent over twenty verticals under four separate shuffles, with a
 * seeded order-dependent grouping proving the sweep can fail. It is not in `FOLD_SITES` because a
 * declaration for a module the detector cannot find registers as STALE, which is the register
 * working correctly and is also why the gap cannot be papered over one entry at a time.
 */
export const FOLD_SITES: readonly FoldSite[] = [
  {
    module: "src/capacity/drift.ts",
    folds: 1,
    disposition: {
      kind: "rationale",
      why: "Reads the last element of a window to stamp its end date. The array is sorted by `dayIso` immediately before, in the same function, so \"last\" is a total order on the date rather than on however the predictions arrived — and the first element is read the same way for the start date. It aggregates nothing: the value it produces is a label on the window, not a figure anybody compares.",
    },
  },
  {
    module: "src/demo/clinicians.ts",
    folds: 2,
    disposition: {
      kind: "rationale",
      why: "TWO folds, both order-independent, and the second is the reason the first's rationale had to be edited. (1) `rankBands` reads the last band accumulated so far to decide whether the next clinician's score extends it or opens a new one. The input is `rankClinicians`' output, whose order is total and already carries its own declared tie-break — score, then capacity grade, then declared-interest-behind, then O182's request-seeded hash of the clinician id. The phrase \"then file order\" is deliberately GONE from this sentence: O182 removed file order as the terminal tie-break precisely because it was not a tie-break at all but a hand-off to whoever edits roster.ts, so a rationale still naming it would be describing a mechanism the tree no longer has. The fold walks a sequence that cannot arrive reordered, and grouping adjacent equal scores is the same partition whichever member of a tie is seen first. (2) `declaredMass` (O182) sums each clinician\u2019s declaration strength for one facet across the roster. Addition is commutative, every term is read from the clinician\u2019s own record rather than from its position, and the fold produces a scalar the whole roster shares \u2014 it cannot prefer anybody, because its output is not per-clinician at all.",
    },
  },
  {
    module: "src/demo/emotional-fit.ts",
    folds: 1,
    disposition: {
      kind: "rationale",
      why: "`emotionalFitScore` sums a fixed per-facet weight over the qualities a clinician declared. Addition is commutative, the declared list is a literal on the roster record, and the fold produces a total rather than a winner — no clinician can be preferred over another by the order their facets were written in.",
    },
  },
  {
    // W188: a same-day join/leave pair is a real tie on a day-granular date, and the tie-break
    // is a safety decision rather than a guess — see the test.
    module: "src/directory/membership.ts",
    folds: 1,
    disposition: {
      kind: "tie_break_test",
      test: "src/directory/membership.test.ts :: W188 a join and a leave on the same day resolve to NOT a member, either way round",
    },
  },
  {
    module: "src/engine/continuity.ts",
    folds: 1,
    disposition: {
      kind: "rationale",
      why: "Sums a number array before dividing. Floating-point addition is not strictly associative, but the inputs are same-magnitude ratios in [0,1] and the result feeds a displayed percentage, so no reordering can move it by a displayable amount.",
    },
  },
  {
    module: "src/guardrails/condition-monitors.ts",
    folds: 1,
    disposition: {
      kind: "rationale",
      why: "Math.max over a severity RANK, returning the number rather than the alert. Two alerts of equal severity yield the same rank either way round, so the answer cannot depend on order.",
    },
  },
  {
    module: "src/interop/exchange.ts",
    folds: 1,
    disposition: {
      kind: "rationale",
      why: "Reads the last attempt of an exchange history when the other side never spoke. The attempts are a RECORD OF A SEQUENCE — attempt two happened after attempt one — so \"last\" is the order the events occurred in rather than an order a store imposed, and reordering them would be reordering history rather than presenting it differently. It aggregates nothing: every attempt in that case has the same outcome (`unknown`), so the fold picks a representative rather than combining values, and which one it picks changes only the recorded reason and timestamp.",
    },
  },
  {
    module: "src/matching/allocation.ts",
    folds: 2,
    disposition: {
      kind: "rationale",
      why: "Two folds (W236). `scorePair` sums five per-item-rounded weighted criterion scores — addition over a FIXED five-element list built in declared criterion order, so no input ordering exists to vary, and the O8 per-item rounding makes the total reproducible to the thousandth. The second fold reads the last element of the top-three slice to ask whether the cut fell inside a tie; its input is sorted by a total comparator with a declared arbitrary tie-break (total descending, then doctorRef), and both patient and doctor lists are ref-sorted before any work, so the read walks a sequence that cannot arrive reordered — the suite's determinism test permutes both inputs and pins identical output. (Following read.ts's note below, this rationale does not spell either expression out.)",
    },
  },
  {
    module: "src/matching/extractor-quality.ts",
    folds: 4,
    disposition: {
      kind: "rationale",
      why: "FOUR folds (M6), all the same shape as `emotional-fit.ts`'s and `separation-effect.ts`'s: `extractorReport` sums `gold.length`, `hits.length`, `extracted.length` and `extras.length` across `results = entries.map(gradeExtraction)` to four scalar totals (goldFacetCount, hitCount, extractedCount, extraCount). Addition is commutative and every term is read from its own entry's own extraction result, never from its position in the array — permuting `entries` permutes which term contributes which addend, not the sum. None of the four selects a winner or reads a specific index; all four are counts.",
    },
  },
  {
    module: "src/matching/read.ts",
    folds: 1,
    disposition: {
      kind: "rationale",
      why: "`trimDouble` reads the LAST CHARACTER OF A STRING, not the last record of a collection. The detector is right to see it — it cannot tell a string from an array, and one that guessed would miss the family it exists for — but there is no order to depend on, because a word's letters do not arrive in a different sequence depending on how a store returned them. Declared rather than rewritten to dodge the pattern, since dodging a detector is how a register stops describing the tree. NOTE FOR THE NEXT EDITOR: this rationale deliberately does not spell the index expression out. Only comments are stripped before scanning, so writing the literal here makes this file match its own detector — which is exactly what happened on the first draft.",
    },
  },
  {
    module: "src/matching/separation-effect.ts",
    folds: 2,
    disposition: {
      kind: "rationale",
      why: "TWO folds (M5), both order-independent for the same reason `emotional-fit.ts`'s is: `separationEffect` sums a FIXED-length array of K null-shuffle separation rates to a mean, then sums squared deviations from that mean to a variance. Both are addition over a total (a mean and a variance are scalars nobody is ranked by), not a selection of a winner — `nullRates[i]` is one shuffle's own measured rate, not a position-dependent read, so permuting which index holds which shuffle's result changes nothing either sum accumulates. The array itself is built by `Array.from({length: k}, (_, i) => ...)`, a fixed 0..k-1 walk with a seeded, index-keyed shuffle per `i` — the SAME index order every run, which is what makes the whole report a pin rather than a flake, but is a determinism property of the seed, not of this fold.",
    },
  },
  {
    module: "src/messaging/approval.ts",
    folds: 1,
    disposition: {
      kind: "tie_break_test",
      test: "src/messaging/approval.test.ts :: W167 two withdrawals at the same instant pick the same one",
    },
  },
  {
    module: "src/onboarding/background-store.ts",
    folds: 1,
    disposition: {
      kind: "rationale",
      why: "`latestBackground` takes the LAST row for a clinician, and that fold is order-dependent on purpose: latest-wins is the whole read model. The order it depends on is not incidental, it is guaranteed by the write — the file is append-only, every save appends one line, so position in file IS chronological order and there is no path that rewrites or reorders rows. Merging the rows instead would be worse, not safer: a reviewer's save is a complete statement of what they decided, and a merge of two would produce a background nobody ever approved. The earlier rows are kept deliberately and read by `backgroundHistory`, which is the audit trail.",
    },
  },
  {
    module: "src/onboarding/background.ts",
    folds: 2,
    disposition: {
      kind: "rationale",
      why: "Two sites, both benign. `matchAudit` sums the weight of the facets a clinician matched: addition is commutative and it produces a TOTAL rather than a winner, so no clinician can be preferred over another by the order their facets were declared in — the ordering that decides a match lives in `rankClinicians`, which has its own tie-break and its own test. `asList` reads the final item of a list it is joining into a sentence, which is grammar rather than selection: the caller has already decided which facets are in the sentence, and reversing them would change the reading order of a list, not which clinician is preferred.",
    },
  },
  {
    module: "src/onboarding/interview.ts",
    folds: 1,
    disposition: {
      kind: "rationale",
      why: "`interviewMinutes` sums the per-question minute budget over `INTERVIEW`, which is a literal in the same file. Addition is commutative and there is no tie to break — the fold produces a total, not a winner, so no record can be preferred over another by the order they arrived in.",
    },
  },
  {
    // W218: the disclosure floor sums the disclosed kinds' totals to recompute the top-level
    // count. The register caught it on the first run after the fold was added, as intended.
    module: "src/outcomes/response-graph.ts",
    folds: 1,
    disposition: {
      kind: "rationale",
      why: "Sums the per-kind intervention totals of the disclosed kinds to one scalar, to recompute the top-level count over what is shown. Addition is commutative, so the total does not depend on the order the kinds are visited, and the kinds come from a Map keyed by intervention kind rather than from anything a store ordered.",
    },
  },
  {
    // W176: declared as the register intends — a new fold site fails the suite until it is here.
    module: "src/outcomes/time-to-escalation.ts",
    folds: 1,
    disposition: {
      kind: "rationale",
      why: "Takes the last element of a list sorted by day count and reads the NUMBER off it rather than returning the record. Two measurements tied on days give the same number either way round, so there is nothing to break — the same argument as src/pms/ingest.ts. The sort itself already tie-breaks by key.",
    },
  },
  {
    module: "src/pathways/approval.ts",
    folds: 1,
    disposition: {
      kind: "tie_break_test",
      test: "src/pathways/approval.test.ts :: W167 two attestations at the same instant name the same attester",
    },
  },
  {
    module: "src/pathways/audit.ts",
    folds: 1,
    disposition: {
      kind: "rationale",
      why: "Takes the final element of an append-only trail that REFUSES an event dated before the last one (`out_of_order`). The last element is the latest by construction, so there is no tie to break — the ordering is enforced at write time rather than recovered at read time.",
    },
  },
  {
    // W168: found by widening the detector past `.reduce(`. This one WAS defective — a same-day
    // given/refused pair resolved by array order — and is fixed in the same unit.
    module: "src/pathways/consent.ts",
    folds: 2,
    disposition: {
      kind: "tie_break_test",
      test: "src/pathways/consent.test.ts :: W168: two decisions on one day do not resolve by array order",
    },
  },
  {
    module: "src/pathways/versioning.ts",
    folds: 1,
    disposition: {
      kind: "rationale",
      why: "Takes the final element of a list where replay guarantees at most one version in force at an instant. The index is belt-and-braces rather than a selection, and W128's mutation check already proved the surrounding rule is tested rather than compensated for.",
    },
  },
  {
    module: "src/pms/ingest.ts",
    folds: 1,
    disposition: {
      kind: "rationale",
      why: "Folds to the maximum capturedAt VALUE, not to the record holding it. Two records sharing the maximum produce the same string either way round.",
    },
  },
  {
    // W178: the register caught the corpus on its first run — the corpus's own pre-fix
    // reconstructions are folds, because they are copies of folds. Declared rather than
    // excluded by name: an excluded file is a place to hide something (W168's rule).
    module: "src/quality/order-regressions.ts",
    folds: 5,
    disposition: {
      kind: "tie_break_test",
      test: "src/quality/order-regressions.test.ts :: W178 the fixture still discriminates the fix (every entry, both orders)",
    },
  },
  {
    module: "src/referrals/store.ts",
    folds: 1,
    disposition: {
      kind: "tie_break_test",
      test: "src/referrals/store.test.ts :: W142 two return reports filed on the same date are AMBIGUOUS, not resolved by position",
    },
  },
  {
    module: "src/security/audit-gate.ts",
    folds: 1,
    disposition: {
      kind: "rationale",
      why: "Takes the final element of a review list written by hand in `audit-allowlist.ts`, in the order the reviews happened. Not a query result and not an ingest — the order is the author's, which is the one case where position IS the fact.",
    },
  },
  {
    module: "src/sim/fleet.ts",
    folds: 1,
    disposition: {
      kind: "rationale",
      why: "Sums integer send counts across runs before dividing. Integer addition is commutative and the divisor does not depend on order.",
    },
  },
  {
    module: "src/sim/scale.ts",
    folds: 1,
    disposition: {
      kind: "rationale",
      why: "Sums measured per-practice durations to project a total. Same-magnitude addends, and the projection is reported to whole milliseconds.",
    },
  },
  {
    module: "src/spine/spine.ts",
    folds: 1,
    disposition: {
      kind: "rationale",
      why: "Folds events onto a log with `append`, which is order-PRESERVING by design — the spine's whole purpose is that sequence is meaningful. Reordering the input is a different history, not the same one seen differently, and W10's sequence check is what guards it.",
    },
  },
  {
    module: "src/tenancy/multisite.ts",
    folds: 3,
    disposition: {
      kind: "rationale",
      why: "Three integer sums across sites for the aggregate totals. Commutative, and W97 asserts the totals carry no per-site field that could make position observable.",
    },
  },
  {
    module: "src/tenancy/rollout.ts",
    folds: 1,
    disposition: {
      kind: "rationale",
      why: "Sums error counts to decide whether a plan has any. Commutative, and the decision is against zero.",
    },
  },
  {
    module: "src/verticals/binding.ts",
    folds: 1,
    disposition: {
      kind: "tie_break_test",
      test: "src/verticals/binding.test.ts :: W167 two acceptances at the same instant resolve the same way",
    },
  },
];

// W168 widened this. It matched `.reduce(` only, and W167's ledger row concluded from that
// "there are no sort-then-take-first sites". There were five: `.at(-1)` and `[xs.length - 1]`
// fold a collection to one answer just as much as a reduce does, and one of them — consent — was
// order-dependent and is fixed in this unit. A detector that cannot see a whole family of folds
// reports zero for that family, and zero reads as clean.
//
// The patterns are assembled from fragments so this module does not match ITSELF, which is
// W153's trick for the same problem: the alternative is excluding the file by name, and an
// excluded file is a place to hide something.
const FOLD_RE = new RegExp(
  [
    ["\\.redu", "ce\\("].join(""),
    ["\\.a", "t\\(-1\\)"].join(""),
    ["\\[\\s*[\\w.]+\\.len", "gth - 1\\s*\\]"].join(""),
  ].join("|"),
  "g",
);

/** Line and block comments removed, so prose about a fold is not counted as one. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Modules under `root` that fold a collection, with how many folds each contains. */
export function discoverFoldSites(root: string): Array<{ module: string; folds: number }> {
  const found: Array<{ module: string; folds: number }> = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir).sort()) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      // Tests are excluded: a fold in a test is the test's own arithmetic, not a product answer.
      if (!entry.endsWith(".ts") || entry.includes(".test.")) continue;
      // W168: comments are stripped first. A fold NAMED IN PROSE is not a fold, and this
      // module's own header naming the patterns was enough to make it match itself. Counting
      // comment mentions also inflates a declared count, which then has to be "corrected" by
      // somebody who has not read the code — the failure mode a register exists to prevent.
      const source = stripComments(readFileSync(full, "utf8"));
      const count = (source.match(FOLD_RE) ?? []).length;
      // Repo-relative with posix separators on every platform: the register is written
      // with "/" and Windows walks produce "\", which read as 20 phantom drifts.
      if (count > 0) found.push({ module: full.slice(root.length + 1).replaceAll("\\", "/"), folds: count });
    }
  };

  walk(join(root, "src"));
  return found.sort((a, b) => a.module.localeCompare(b.module));
}

export interface FoldRegisterDiff {
  /** Modules that fold but are not declared. */
  undeclared: string[];
  /** Declared modules that no longer fold — a register describing code that has moved. */
  stale: string[];
  /** Declared modules whose fold count has changed: a fold was added or removed. */
  countChanged: Array<{ module: string; declared: number; actual: number }>;
}

export function diffFoldRegister(
  actual: ReadonlyArray<{ module: string; folds: number }>,
  declared: readonly FoldSite[] = FOLD_SITES,
): FoldRegisterDiff {
  const declaredBy = new Map(declared.map((d) => [d.module, d]));
  const actualBy = new Map(actual.map((a) => [a.module, a]));

  return {
    undeclared: actual.filter((a) => !declaredBy.has(a.module)).map((a) => a.module).sort(),
    stale: declared.filter((d) => !actualBy.has(d.module)).map((d) => d.module).sort(),
    countChanged: actual
      .filter((a) => declaredBy.has(a.module) && declaredBy.get(a.module)!.folds !== a.folds)
      .map((a) => ({ module: a.module, declared: declaredBy.get(a.module)!.folds, actual: a.folds }))
      .sort((x, y) => x.module.localeCompare(y.module)),
  };
}
