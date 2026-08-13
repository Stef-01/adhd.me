// W178 verify gate: each historical defect has a test that fails against its own pre-fix
// behaviour, and the fix that replaced it still holds — both checked on every run rather than
// once by hand at the time.

import { describe, expect, it } from "vitest";
import { addReturnReports, resetReferralRail, returnFor } from "@/referrals/store";
import { FOLD_SITES } from "./order-independence";
import { ORDER_REGRESSIONS, Q11_2, bothOrders } from "./order-regressions";

describe("W178 every entry reproduces the defect it records", () => {
  it("holds every documented defect, and is not empty", () => {
    // Vacuity guard: an empty corpus satisfies every loop below.
    expect(ORDER_REGRESSIONS.length).toBe(6);
    // One of the six is a residual: its original symptom is fixed, its tie is not.
    expect(ORDER_REGRESSIONS.filter((r) => r.residual !== undefined)).toHaveLength(1);
    // Both pre-fix symptoms are represented, so neither branch below is dead code.
    expect(new Set(ORDER_REGRESSIONS.map((r) => r.preFixSymptom))).toEqual(
      new Set(["order_dependent", "wrong_either_way"]),
    );
    expect(new Set(ORDER_REGRESSIONS.map((r) => r.id)).size).toBe(ORDER_REGRESSIONS.length);
  });

  for (const entry of ORDER_REGRESSIONS) {
    describe(entry.id, () => {
      it("the fixture still discriminates the fix", async () => {
        // The unit's gate — "proven by reverting each fix once" — made permanent. If the pre-fix
        // fold and the shipped one AGREE on this input, the fixture has stopped telling them
        // apart, and the corpus goes on passing while testing nothing. That is the failure every
        // register in this tree exists to prevent, so it is asserted rather than assumed.
        const before = await bothOrders(entry.preFix, entry.tied);
        const after = await bothOrders(entry.shipped, entry.tied);
        // At least ONE order, not the forward one: an order-dependent fold agrees with the fix
        // in one direction by definition — that is what made it survive review. Comparing only
        // forward would have made this assertion fail on the four entries it is most about.
        const disagrees =
          JSON.stringify(before.forward) !== JSON.stringify(after.forward) ||
          JSON.stringify(before.reversed) !== JSON.stringify(after.reversed);
        expect(
          disagrees,
          `${entry.id}: the pre-fix fold agrees with the shipped one in both orders, so this fixture no longer proves anything`,
        ).toBe(true);
      });

      it.runIf(entry.preFixSymptom === "order_dependent")(
        "the pre-fix fold gave a different answer depending on input order",
        async () => {
          const { stable, forward, reversed } = await bothOrders(entry.preFix, entry.tied);
          expect(
            stable,
            `${entry.id} is recorded as order-dependent but its pre-fix fold is stable (${JSON.stringify(forward)} both ways)`,
          ).toBe(false);
          expect(forward).not.toEqual(reversed);
        },
      );

      it.runIf(entry.preFixSymptom === "wrong_either_way")(
        "the pre-fix fold was consistently wrong, which is why re-ordering would not have caught it",
        async () => {
          // W128 is the reason this branch exists. Its fold returned null in BOTH orders — a tie
          // it could not represent rather than a tie it resolved badly — so the "run it the other
          // way round" check that catches the rest would have passed. A mutation check found it.
          const { stable } = await bothOrders(entry.preFix, entry.tied);
          expect(
            stable,
            `${entry.id} is recorded as wrong-either-way but its pre-fix fold varies with order`,
          ).toBe(true);
        },
      );

      it.skipIf(entry.residual !== undefined)(
        "the shipped function gives the same answer either way round",
        async () => {
          const { stable, forward, reversed } = await bothOrders(entry.shipped, entry.tied);
          expect(
            stable,
            `${entry.id}: ${entry.site} is order-dependent again — ${JSON.stringify(forward)} vs ${JSON.stringify(reversed)}`,
          ).toBe(true);
        },
      );

      it.skipIf(entry.residual !== undefined)(
        "and gives the safe answer, not merely a stable one",
        async () => {
          // Order-independence alone is satisfied by returning the same wrong thing every time.
          const { forward } = await bothOrders(entry.shipped, entry.tied);
          expect(forward, `${entry.id}: ${entry.safeBecause}`).toEqual(entry.expected);
        },
      );

      it.runIf(entry.residual !== undefined)(
        "is pinned as a KNOWN-OPEN tie, with the finding written down",
        async () => {
          // Deliberately asserts the defect is STILL THERE. When somebody fixes it this test
          // fails, which is the intended way to find out that the entry needs promoting — a
          // corpus that silently started passing would have lost the finding.
          const { stable, forward, reversed } = await bothOrders(entry.shipped, entry.tied);
          expect(
            stable,
            `${entry.id}: the residual tie is fixed — good. Promote this entry: drop \`residual\`, set \`expected\`, and update the ledger.`,
          ).toBe(false);
          expect(forward).not.toEqual(reversed);
          // The finding has to be legible, not just flagged.
          expect(entry.residual!.length).toBeGreaterThan(200);
          expect(entry.expected).toBeUndefined();
        },
      );

      it("says what tied and why the shipped answer is the safe side", () => {
        // A corpus entry without its argument is a fixture somebody will later "simplify".
        expect(entry.tie.length).toBeGreaterThan(40);
        expect(entry.safeBecause.length).toBeGreaterThan(40);
        expect(entry.site).toMatch(/^src\/.+\.ts :: \S/);
      });
    });
  }
});

describe("W178 Q11-2 — returnFor, which reads a store rather than taking a collection", () => {
  const seedAndAsk = (reports: readonly (typeof Q11_2.tied)[number][]) => {
    resetReferralRail();
    addReturnReports(reports);
    return returnFor("ref-1");
  };

  it("the pre-fix fold took the first match, so storage order decided", () => {
    const forward = Q11_2.preFix(Q11_2.tied);
    const reversed = Q11_2.preFix([...Q11_2.tied].reverse());
    expect(forward).not.toEqual(reversed);
  });

  it("the shipped lookup reports the same thing either way round", () => {
    // Seeded in both orders rather than folded, because the real function reads module state.
    // Going through the real store is the point: a copy of the fix would test the copy.
    expect(seedAndAsk(Q11_2.tied)).toEqual(seedAndAsk([...Q11_2.tied].reverse()));
  });

  it("and reports the ambiguity rather than picking one", () => {
    // W111's rule: two matches are ambiguous, never the first one. A superseded return report
    // shown as current attaches the wrong clinical communication to a patient.
    expect(seedAndAsk(Q11_2.tied)).toEqual({ found: false, ambiguous: true, count: 2 });
  });

  it("still finds an unambiguous report, so the fix has not degraded into refusing everything", () => {
    const only = Q11_2.tied[0]!;
    expect(seedAndAsk([only])).toEqual({ found: true, report: only });
  });
});

describe("W178 the corpus and W167's register agree", () => {
  it("every corpus entry is either a declared fold site or a replay the register cannot see", () => {
    // Building this cross-check is what surfaced the gap. W167's detector matches folds that
    // pick ONE ELEMENT — `.reduce(`, `.at(-1)`, `[length - 1]` — and two of these defects lived
    // in SORT-THEN-REPLAY code, which folds a collection into one answer just as much but
    // matches none of those patterns. So the register does not watch them and never did.
    //
    // Named here rather than fixed by widening the detector: that is W168's unit again, and a
    // replay is a genuinely different shape from a pick (there is no "last element" to tie on —
    // the whole ITERATION ORDER is the answer). What matters is that the omission is written
    // down instead of being invisible, and that this list cannot grow silently.
    const REPLAY_SHAPED = new Set([
      "src/referrals/acceptance.ts", // acceptanceStatus: sort, then a state machine over the list
      "src/referrals/leakage.ts", // replayReferral: same shape, and Y3-2 lived in it
    ]);
    const declared = new Set(FOLD_SITES.map((site) => site.module));
    const sites = [...ORDER_REGRESSIONS.map((r) => r.site), Q11_2.site];
    expect(sites.length).toBeGreaterThan(0);
    for (const site of sites) {
      const module = site.split(" :: ")[0]!;
      expect(
        declared.has(module) || REPLAY_SHAPED.has(module),
        `${site} is in the corpus, is not in W167's fold register, and is not recorded as replay-shaped`,
      ).toBe(true);
    }
    // Non-vacuous both ways: the register really is being consulted, and the exemption really
    // is doing work rather than covering everything.
    expect(declared.size).toBeGreaterThan(10);
    expect(sites.filter((s) => REPLAY_SHAPED.has(s.split(" :: ")[0]!))).toHaveLength(2);
  });

  it("every module that earned a tie-break test has a corpus entry or is a pre-emptive catch", () => {
    // The three W167 caught pre-emptively (messaging/approval, pathways/approval,
    // verticals/binding) are NOT in the corpus and should not be: nothing shipped wrong there,
    // so there is no pre-fix behaviour to reproduce. Naming them here keeps that a stated
    // distinction rather than an omission somebody later reads as a gap.
    const PRE_EMPTIVE = new Set([
      "src/messaging/approval.ts",
      "src/pathways/approval.ts",
      "src/verticals/binding.ts",
      // W188, added by this control catching it on the day the module landed — which is the
      // register working rather than the register being edited around. A same-day join/leave
      // tie was resolved at design time (departure wins, so a practice is never published on an
      // unresolvable day), so nothing shipped wrong and there is no pre-fix behaviour to
      // reproduce.
      "src/directory/membership.ts",
    ]);
    const inCorpus = new Set(
      [...ORDER_REGRESSIONS.map((r) => r.site), Q11_2.site].map((s) => s.split(" :: ")[0]!),
    );
    // The corpus module itself now carries a tie-break disposition — its pre-fix
    // reconstructions are folds, because they are copies of folds — but it is the instrument
    // rather than a site the instrument covers, so it is not an entry in itself.
    const tested = FOLD_SITES.filter(
      (s) => s.disposition.kind === "tie_break_test" && s.module !== "src/quality/order-regressions.ts",
    );
    expect(tested.length).toBeGreaterThan(0);
    for (const site of tested) {
      expect(
        inCorpus.has(site.module) || PRE_EMPTIVE.has(site.module),
        `${site.module} has a tie-break test but is neither in the regression corpus nor recorded as a pre-emptive catch`,
      ).toBe(true);
    }
  });
});
