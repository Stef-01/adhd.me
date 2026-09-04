// W252 verify gate: the vertical machinery at twenty verticals — same answers whatever the order,
// and a stated cost.
//
// WHY TWENTY AND NOT ONE MORE OF WHAT ALREADY PASSES. Every vertical test in this tree so far runs
// against one bundle, or three. Three is enough to prove a factory generalises and not enough to
// prove anything about ORDER: with three members you can shuffle a list and get the same answer by
// luck, and with one vertical there is no such thing as the order verticals arrive in.
//
// AND THE UNIT LANDS ONE UNIT AFTER I CHANGED A FOLD IN THIS EXACT MACHINERY. W250 moved the
// completeness report's grouping key from the member's kind to the ACT it waits on. Grouping is
// where order-dependence hides: a `Map` iterates in insertion order, insertion order is
// declaration order, and the sort that follows tie-breaks on the group key. I reasoned that this
// is a total order. W167 exists on the argument that reasoning is not the control — eight
// historical instances, and the register was built because a rule depending on the next reviewer
// remembering it is the control this tree has watched fail.
//
// W167'S DETECTOR CANNOT SEE THAT FOLD, WHICH IS WORTH WRITING DOWN. It matches `.reduce(`,
// `.at(-1)` and `[x.length - 1]`. A `Map` accumulated in a `for` loop and emitted through a sort
// matches none of them and is a fold by every meaning that matters: a collection collapsed to
// grouped answers, with an order somebody chose. A sweep run for W252 found TWENTY modules in this
// tree that group-then-emit, sixteen of them undeclared. Unlike the gap W247 measured in W106 —
// where a blanket rule would have been 39 exceptions — this rule is CORRECT and every one of those
// sixteen genuinely needs a disposition; what makes it a unit of its own is the sixteen pieces of
// analysis, not the rule. Recorded rather than half-done, and this file is the disposition for the
// one fold W250 added: `{kind: "tie_break_test"}` in substance, pinned by the sweep below.
//
// FOUR ORDERS, NOT ONE. A vertical's answers must not depend on the order its MEMBERS were
// declared in, the order the VERTICALS arrive in, the order the EVIDENCE arrives in, or the order
// of the optional `known` pool. Shuffling one and calling it order-independence is a guard that
// passes while the defect lives in a different argument.

import { describe, expect, it } from "vitest";
import { loadIntervals } from "@/registers/intervals";
import { assessCompleteness, renderCompletenessReport, type KnownMembers } from "./completeness";
import { declareVertical, type DeclaredMember } from "./declare";
import { usableVertical, verticalHash, type VerticalEvidence, type VerticalMemberKind } from "./model";

const KINDS: VerticalMemberKind[] = ["pathway", "content", "education_item", "interval"];

/**
 * A deterministic shuffle.
 *
 * `Math.random` would make a failure unreproducible — the worst property a scaling test can have,
 * since the whole point is to find an order that answers differently. A seeded LCG gives a
 * different permutation per seed and the same one on every run, so a red test is a red test again
 * tomorrow.
 */
function shuffled<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  let state = seed * 2654435761 + 1;
  const next = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Twenty synthetic verticals that differ from each other.
 *
 * The vacuity trap this closes: twenty copies of one bundle shuffle identically, run fast and
 * prove nothing. Size varies from 2 to 11 members, the mix of kinds varies, and — the case that
 * matters most for W250's grouping — some verticals declare SEVERAL members of one kind waiting on
 * DIFFERENT acts while others declare several waiting on the SAME act. Both are what the act
 * grouping has to get right, and only one of them existed anywhere in the tree before this file.
 */
function syntheticVerticals(): ReturnType<typeof declareVertical>[] {
  return Array.from({ length: 20 }, (_, v) => {
    const size = 2 + (v % 10);
    const members: DeclaredMember[] = Array.from({ length: size }, (_, m) => {
      const kind = KINDS[(v + m) % KINDS.length]!;
      // Three shapes, because the grouping has three cases and only one of them existed in the
      // tree before this file. `v % 3 === 0`: every member of a kind shares one act, so groups
      // collapse within a kind. `v % 3 === 1`: every member has its own act, so every group is a
      // singleton — the case W248 found reported wrongly under by-kind grouping. `v % 3 === 2`:
      // ONE act shared across the whole vertical regardless of kind, which is the only way a group
      // spans two kinds, and is only expressible at all now the key is the act rather than the kind.
      const act =
        v % 3 === 0
          ? `act shared by kind ${kind}`
          : v % 3 === 1
            ? `act ${v}-${m} for one member only`
            : `act shared across every kind in vertical ${v}`;
      return { kind, ref: `v${v}-m${m}`, waitsOn: act };
    });
    return declareVertical({ verticalId: `vert-synth-${v}`, name: `Synthetic ${v}`, members });
  });
}

const NOTHING: VerticalEvidence = {
  pathways: [],
  content: [],
  educationItems: [],
  intervals: loadIntervals([]),
};

describe("W252 the population is real, so everything below is measuring something", () => {
  const verticals = syntheticVerticals();

  it("declares twenty verticals that differ in size and in shape", () => {
    expect(verticals.length).toBe(20);
    const sizes = new Set(verticals.map((v) => v.members.length));
    expect(sizes.size, "every synthetic vertical is the same size").toBeGreaterThan(5);
    const profiles = new Set(
      verticals.map((v) => JSON.stringify(v.members.map((m) => m.kind).sort())),
    );
    expect(profiles.size, "twenty copies of one shape prove nothing").toBeGreaterThan(5);
  });

  it("includes both grouping cases: members of one kind on the same act and on different acts", () => {
    const reports = verticals.map((v) => v.outstanding(NOTHING));
    // A vertical whose groups span more than one member — the collapse case.
    expect(reports.some((r) => r.outstanding.some((o) => o.count > 1))).toBe(true);
    // And one where every group is a single member — the case W248 found broken under by-kind.
    expect(reports.some((r) => r.outstanding.every((o) => o.count === 1))).toBe(true);
    // And a group spanning two kinds, which is only possible now the key is the act.
    expect(reports.some((r) => r.outstanding.some((o) => o.kinds.length > 1))).toBe(true);
  });
});

describe("W252 the answer does not depend on the order anything arrived in", () => {
  const verticals = syntheticVerticals();

  /**
   * Everything the machinery ANSWERS about one vertical, as one comparable value.
   *
   * Note what is not in here and why, because the first version of this helper included the
   * rendered report and the test failed — correctly, and not for the reason it looked like. The
   * ANSWERS are order-independent: the same members, the same statuses, the same groups. What
   * moves under a reordering is the ROW ORDER of the rendered member table, which follows
   * declaration order. That is a presentational property, it is pinned by its own test below
   * rather than folded in here, and conflating the two would have meant either a failing test
   * about the wrong thing or — much worse — "fixing" it by sorting somebody else's rendered output
   * to make my sweep go green.
   */
  const answersFor = (vertical: ReturnType<typeof declareVertical>, evidence: VerticalEvidence, known?: KnownMembers) => {
    const result = vertical.assemble(evidence);
    const report = vertical.outstanding(evidence, known);
    return JSON.stringify({
      hash: verticalHash(vertical.spec.members),
      usable: result.usable,
      unusable: result.usable ? [] : result.unusable.map((u) => u.member.ref).sort(),
      outstanding: report.outstanding,
      // Statuses by ref rather than in list order: the answer is what each member's status IS.
      statuses: report.members.map((m) => `${m.member.ref}:${m.status}`).sort(),
      shippable: report.shippable,
      readyMembers: report.readyMembers,
      totalMembers: report.totalMembers,
      noSignedOffClinicalContent: report.noSignedOffClinicalContent,
      coverage: report.coverage,
    });
  };

  it("is unchanged when the MEMBERS are declared in a different order", () => {
    for (const vertical of verticals) {
      const baseline = answersFor(vertical, NOTHING);
      for (const seed of [1, 2, 3]) {
        const reordered = declareVertical({
          ...vertical.declaration,
          members: shuffled(vertical.members, seed),
        });
        // The hash first, on its own: W157 stakes the claim that reordering the same members is
        // the SAME vertical, because identity is membership and the hash sorts. That has a test at
        // one vertical; this is the same property over twenty with three permutations each.
        expect(
          verticalHash(reordered.spec.members),
          `${vertical.spec.verticalId} changed identity when its members were reordered`,
        ).toBe(verticalHash(vertical.spec.members));
        expect(answersFor(reordered, NOTHING), `${vertical.spec.verticalId} seed ${seed}`).toBe(
          baseline,
        );
      }
    }
  });

  it("is unchanged when the VERTICALS arrive in a different order", () => {
    const byId = (list: ReturnType<typeof declareVertical>[]) =>
      list
        .map((v) => `${v.spec.verticalId}:${answersFor(v, NOTHING)}`)
        .sort()
        .join("\n");
    const baseline = byId(verticals);
    for (const seed of [4, 5, 6]) {
      expect(byId(shuffled(verticals, seed)), `seed ${seed}`).toBe(baseline);
    }
  });

  it("is unchanged when the EVIDENCE arrives in a different order", () => {
    // Evidence with several members through their gates, so there is an order to vary. Refs are
    // taken from the verticals themselves so the evidence actually matches something — evidence
    // for nothing would shuffle into the same empty answer every time.
    const vertical = verticals[7]!;
    const pathwayRefs = vertical.members.filter((m) => m.kind === "pathway").map((m) => m.ref);
    expect(pathwayRefs.length, "the fixture vertical has no pathways to supply evidence for").toBeGreaterThan(0);
    const supply = (refs: readonly string[]): VerticalEvidence => ({
      ...NOTHING,
      pathways: refs.map((ref) => ({ version: { versionHash: ref } })) as unknown as VerticalEvidence["pathways"],
    });
    const baseline = answersFor(vertical, supply(pathwayRefs));
    for (const seed of [7, 8, 9]) {
      expect(answersFor(vertical, supply(shuffled(pathwayRefs, seed))), `seed ${seed}`).toBe(baseline);
    }
  });

  it("is unchanged when the KNOWN POOL arrives in a different order", () => {
    const vertical = verticals[11]!;
    const refsOf = (kind: VerticalMemberKind) =>
      vertical.members.filter((m) => m.kind === kind).map((m) => m.ref);
    const pool = (seed: number): KnownMembers => ({
      pathwayVersionHashes: shuffled(refsOf("pathway"), seed),
      contentIds: shuffled(refsOf("content"), seed + 1),
      educationItemIds: shuffled(refsOf("education_item"), seed + 2),
      intervalIds: shuffled(refsOf("interval"), seed + 3),
    });
    const baseline = answersFor(vertical, NOTHING, pool(0));
    // Non-vacuity: the pool must actually reach the report, or every answer is `indeterminate`
    // and the shuffle below is comparing one constant to itself.
    const report = vertical.outstanding(NOTHING, pool(0));
    expect(report.coverage.poolSupplied).toBe(true);
    expect(report.members.some((m) => m.status === "awaiting_gate")).toBe(true);
    for (const seed of [12, 13, 14]) {
      expect(answersFor(vertical, NOTHING, pool(seed)), `seed ${seed}`).toBe(baseline);
    }
  });

  it("catches an order-dependent grouping, so the four checks above mean something", () => {
    // The seeded failure, in the test file rather than in the product: a grouping whose emission
    // order follows insertion rather than a total sort answers differently under a shuffle. If
    // this does NOT differ, the comparison used above is too coarse to detect what it is for.
    const vertical = verticals[4]!;
    const insertionOrder = (members: readonly DeclaredMember[]) => {
      const seen = new Map<string, number>();
      for (const m of members) seen.set(m.waitsOn, (seen.get(m.waitsOn) ?? 0) + 1);
      return [...seen.keys()]; // no sort — insertion order, which is declaration order
    };
    const forward = insertionOrder(vertical.members);
    const backward = insertionOrder([...vertical.members].reverse());
    expect(forward, "the fixture has only one group — it cannot show an order difference").not.toEqual(
      backward,
    );
    // And the real implementation, given the same reversal, does not move.
    const reversed = declareVertical({
      ...vertical.declaration,
      members: [...vertical.members].reverse(),
    });
    expect(reversed.outstanding(NOTHING).outstanding).toEqual(
      vertical.outstanding(NOTHING).outstanding,
    );
  });
});

describe("W252 the one thing that DOES follow declaration order, stated rather than discovered", () => {
  const verticals = syntheticVerticals();

  it("renders the member table in the order the members were declared", () => {
    // FOUND BY THIS UNIT'S OWN SWEEP, and kept rather than changed. The rendered report lists
    // members in declaration order, so the same vertical — same identity, W157's hash is over
    // SORTED refs and does not move — renders two byte-different documents when somebody reorders
    // the list.
    //
    // THE CONSEQUENCE, WHICH IS THE HALF WORTH WRITING DOWN: a founder comparing this quarter's
    // report to last quarter's, after somebody tidied the member list, sees every row move and no
    // substantive change. That is a real cost, and the argument for keeping it anyway is that the
    // order is the AUTHOR'S: they grouped those members that way, nothing in the tree reads meaning
    // from the sequence, and sorting it here would be this unit rewriting another unit's pinned
    // output to make its own sweep tidier. Pinned so the next person to meet it meets a decision.
    const vertical = verticals[5]!;
    const declaredOrder = vertical.members.map((m) => m.ref);
    const rendered = vertical.outstanding(NOTHING).members.map((m) => m.member.ref);
    expect(rendered).toEqual(declaredOrder);
    expect(declaredOrder.length, "a one-member vertical cannot show an order at all").toBeGreaterThan(2);

    const reversed = declareVertical({
      ...vertical.declaration,
      members: [...vertical.members].reverse(),
    });
    expect(reversed.outstanding(NOTHING).members.map((m) => m.member.ref)).toEqual(
      [...declaredOrder].reverse(),
    );
    // The identity does NOT move with it, which is the asymmetry this test exists to name.
    expect(verticalHash(reversed.spec.members)).toBe(verticalHash(vertical.spec.members));
  });

  it("changes no ANSWER when it changes that order, which is why the above is tolerable", () => {
    const vertical = verticals[5]!;
    const reversed = declareVertical({
      ...vertical.declaration,
      members: [...vertical.members].reverse(),
    });
    const before = vertical.outstanding(NOTHING);
    const after = reversed.outstanding(NOTHING);
    expect(after.outstanding).toEqual(before.outstanding);
    expect(after.readyMembers).toBe(before.readyMembers);
    expect(after.shippable).toBe(before.shippable);
    expect(after.members.map((m) => `${m.member.ref}:${m.status}`).sort()).toEqual(
      before.members.map((m) => `${m.member.ref}:${m.status}`).sort(),
    );
  });
});

describe("W252 what twenty verticals cost", () => {
  it("assembles and reports on twenty verticals inside a stated budget", () => {
    // W48'S SHAPE: measure, then state the observed figure NEXT TO the ceiling. A budget with no
    // measurement beside it is a number somebody picked, and a later slowdown reads as a mysterious
    // red test rather than as "we spent the headroom".
    //
    // Observed on the build container at W252, over three runs: 1.02–1.16ms for 20 verticals and
    // 130 members — assemble, full completeness report and render, per vertical. Call it 1.2ms.
    //
    // THE FIRST VERSION OF THIS COMMENT SAID 11ms AND A BUDGET OF 400ms, AND I HAD NOT RUN IT.
    // Both numbers were invented, and the budget was picked to sit comfortably above an imagined
    // measurement — which is precisely the thing W48's shape exists to prevent, and the same error
    // as W219 writing a holdout figure it had not read. Recorded rather than quietly corrected.
    //
    // The budget is 100ms against ~1.2ms observed: a ~80× margin, loose because CI timing on shared
    // hardware is noisy and a tight budget on a machine nobody controls fails for reasons that have
    // nothing to do with this code. It is a CONTRACT that the machinery is cheap, not a benchmark.
    // At 130 members a quadratic report would cost roughly 130× — about 150ms — so this ceiling
    // still catches the failure it is for, which is what stopped 400ms from being defensible.
    const verticals = syntheticVerticals();
    const started = performance.now();
    let members = 0;
    for (const vertical of verticals) {
      vertical.assemble(NOTHING);
      const report = vertical.outstanding(NOTHING);
      renderCompletenessReport(report);
      members += report.totalMembers;
    }
    const elapsed = performance.now() - started;

    // Non-vacuity: the loop did the work. A sweep over an empty population is instant and passes.
    expect(verticals.length).toBe(20);
    expect(members, "the sweep assessed almost nothing").toBeGreaterThan(100);
    expect(elapsed, `20 verticals (${members} members) took ${elapsed.toFixed(1)}ms`).toBeLessThan(100);
  });

  it("stays linear in members rather than quadratic, which is what the budget is really for", () => {
    // A wall-clock budget with 80× headroom would not notice a quadratic report until the tree got
    // much bigger. The shape is checked directly instead: ten times the members should cost roughly
    // ten times, not a hundred times.
    //
    // Observed over three runs at W252: 11.8×, 12.2× and 13.5× for a tenfold increase in members —
    // linear with a small constant. The threshold is 40×, between the ~12× this actually costs and
    // the ~100× a quadratic report would, so it has somewhere to fail rather than sitting past any
    // reachable value. Timing at this scale is dominated by noise, so the point is an
    // order-of-magnitude change in SHAPE, not a regression of a few percent.
    const build = (count: number) =>
      declareVertical({
        verticalId: `vert-size-${count}`,
        name: `Size ${count}`,
        members: Array.from({ length: count }, (_, i) => ({
          kind: KINDS[i % KINDS.length]!,
          ref: `s${count}-m${i}`,
          waitsOn: `act ${i}`,
        })),
      });
    //
    // O194 REWROTE THE MEASUREMENT, NOT THE CLAIM, AND THE REASON IS THAT THIS TEST WENT RED ON
    // `main`. The first full `pnpm gate` run on main's head in six days (CI has been dead since
    // 2026-08-21, standing debt 11) failed here at 59.9× — then passed five times out of five in
    // isolation. It fails only under full-suite load, and the mechanism is visible in its own
    // failure message: `small=0.55ms`. A sub-millisecond denominator on a shared, loaded container
    // is not a measurement, it is a coin toss — one scheduler slice lands on the small case and the
    // ratio doubles. The claim ("tenfold members costs about tenfold, not a hundredfold") was never
    // wrong; the instrument could not hold it steady.
    //
    // Two changes, both standard for timing and neither weakening the assertion:
    //   * MORE WORK PER SAMPLE, so the small case clears the noise floor instead of sitting in it;
    //   * BEST OF N, because the minimum of several samples is the one least contaminated by other
    //     work on the machine. An interrupted run can only ever be slower, so taking the fastest is
    //     the honest estimate of the cost of the code rather than the cost of the container.
    //
    // A test that fails at random on `main` teaches a reader to re-run rather than to look, which
    // is how a real regression gets waved through. Making it steady is what keeps it a gate.
    const ITERATIONS = 200;
    const SAMPLES = 5;
    const time = (count: number) => {
      const vertical = build(count);
      let best = Infinity;
      for (let sample = 0; sample < SAMPLES; sample += 1) {
        const started = performance.now();
        for (let i = 0; i < ITERATIONS; i += 1) vertical.outstanding(NOTHING);
        best = Math.min(best, performance.now() - started);
      }
      return best;
    };
    time(20); // warm-up, so the first measurement is not paying for JIT
    const small = Math.max(time(20), 0.01);
    const large = time(200);
    expect(
      large / small,
      `200 members cost ${(large / small).toFixed(1)}× what 20 did (small=${small.toFixed(2)}ms large=${large.toFixed(2)}ms) — quadratic would be ~100×`,
    ).toBeLessThan(40);
  });

  it("the shape check can still tell linear from quadratic, measured on the same harness", () => {
    // NON-VACUITY, AND O194 ADDED IT BECAUSE THE FIX ABOVE MAKES THE TEST STEADIER AND A STEADIER
    // TEST IS WORTH NOTHING IF IT CAN NO LONGER FAIL. Best-of-N could in principle smooth away the
    // very difference the threshold exists to catch, so the difference is measured rather than
    // assumed: a deliberately quadratic workload, timed through the identical harness at the
    // identical sizes, must land past the 40× line that the real report clears.
    //
    // O194 APPLIED ITS OWN FIX TO THE TEST ABOVE AND NOT TO THIS ONE, AND THIS ONE THEN FAILED ON
    // `main` FOR THE IDENTICAL REASON. Under full-suite load it reported 32.7× — under the 40× line,
    // i.e. claiming a deliberately quadratic workload looks linear — then passed in isolation. The
    // mechanism is the one named twenty lines up: at 200 iterations the small sample is 400 inner
    // steps × 200 = 80k trivial ops, and it measures **0.052ms**. Fifty-two microseconds is not a
    // measurement on a loaded machine, it is a coin toss, and here the bias runs the dangerous way:
    // an over-measured denominator makes the quadratic workload look LESS quadratic, so the flake
    // reads as "the shape check has stopped discriminating" when the shape check is fine.
    //
    // Measured across iteration counts, best-of-5, same harness, same sizes (20 and 200):
    //   200 →  small 0.052ms, ratio 50.4×   (noise floor; true shape understated by half)
    //  1000 →  small 0.170ms, ratio 97.0×
    //  2000 →  small 0.364ms, ratio 92.7×
    //  5000 →  small 0.903ms, ratio 94.5×   ← converged, and the denominator finally clears 1ms
    //
    // 5000 is the first count whose small sample is not sub-millisecond, which is the bar the test
    // above set for itself. It also converges the ratio on the ~95× a quadratic workload actually
    // costs at a tenfold size increase — so the assertion now sits 2.4× clear of its threshold
    // instead of 1.3× clear of it. The threshold, the sizes and the claim are unchanged; only the
    // sample is large enough to state them. Costs ~0.5s, which is what a gate that does not lie
    // about its own instrument is worth.
    const ITERATIONS = 5000;
    const SAMPLES = 5;
    const quadratic = (count: number) => {
      let sink = 0;
      for (let a = 0; a < count; a += 1) for (let b = 0; b < count; b += 1) sink += (a ^ b) & 1;
      return sink;
    };
    const time = (count: number) => {
      let best = Infinity;
      for (let sample = 0; sample < SAMPLES; sample += 1) {
        const started = performance.now();
        for (let i = 0; i < ITERATIONS; i += 1) quadratic(count);
        best = Math.min(best, performance.now() - started);
      }
      return best;
    };
    time(20);
    const small = Math.max(time(20), 0.01);
    const large = time(200);
    expect(
      large / small,
      `a genuinely quadratic workload measured ${(large / small).toFixed(1)}× — if this is under 40 the shape check above has stopped discriminating`,
    ).toBeGreaterThan(40);
  });
});
