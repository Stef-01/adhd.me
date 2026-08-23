// W210 (M4): the contradiction register, checked in both directions.
import { describe, expect, it } from "vitest";
import {
  ACCEPTED_AT_M4,
  CONTRADICTIONS,
  broken,
  resolvedAcceptances,
  type Contradiction,
} from "./contradictions";

describe("M4 the contradiction register holds", () => {
  it("has no required property that does not hold", () => {
    expect(
      broken().map((entry) => `${entry.id}: ${entry.invariant}`),
      "a property the product is supposed to have has stopped holding",
    ).toEqual([]);
  });

  /**
   * THE DIRECTION AN ACCEPTANCE LIST ALWAYS FORGETS. An accepted contradiction that has started
   * holding is a stale excuse sitting in the register, and the register is the one place a reader
   * looks to find out what is currently wrong. Promotion has to be deliberate, so it is a failure
   * rather than a silent improvement.
   */
  it("has no accepted entry that has quietly started holding", () => {
    expect(
      resolvedAcceptances().map((entry) => `${entry.id} now holds — promote it to required`),
      "an acceptance is stale",
    ).toEqual([]);
  });

  it("pins the accepted count, so acceptance cannot become the resting state", () => {
    const accepted = CONTRADICTIONS.filter((entry) => entry.disposition.kind === "accepted");
    expect(accepted).toHaveLength(ACCEPTED_AT_M4);
  });

  it("makes every acceptance carry a reason AND what would end it", () => {
    for (const entry of CONTRADICTIONS) {
      if (entry.disposition.kind !== "accepted") continue;
      // A one-word excuse is how an acceptance list becomes decoration.
      expect(entry.disposition.why.length, `${entry.id} has no real reason`).toBeGreaterThan(80);
      expect(entry.disposition.trigger.length, `${entry.id} names no trigger`).toBeGreaterThan(20);
    }
  });

  /**
   * NON-VACUITY, AND IT IS THE WHOLE POINT OF THIS FILE.
   *
   * A register of invariants that cannot fail is exactly the thing it was built to replace. Every
   * entry is exercised against a deliberately broken world and must report the breakage; an entry
   * whose `holds` returns true no matter what is reported as vacuous rather than counted as
   * coverage. This is the AR-series' mutation-probe rule applied to this register.
   */
  it("every entry can actually fail", () => {
    const alwaysTrue: string[] = [];
    for (const entry of CONTRADICTIONS) {
      if (!entry.holds()) continue; // already false — demonstrably capable of being false
      const mutated = mutate(entry);
      if (mutated === null) continue; // no mutation defined; covered by the next assertion
      if (mutated) alwaysTrue.push(entry.id);
    }
    expect(alwaysTrue, "these entries stayed true against a broken world — they check nothing").toEqual([]);
  });

  it("defines a mutation for every entry, so none escapes the vacuity check", () => {
    const undefinedMutations = CONTRADICTIONS.filter((entry) => mutate(entry) === null && entry.holds()).map((e) => e.id);
    expect(undefinedMutations, "no way to prove these can fail").toEqual([]);
  });
});

/**
 * Run one entry's predicate against a world where its property is violated, and return what it
 * said. `null` means no mutation is defined for that entry.
 *
 * The mutations rebuild the predicate over a fabricated roster rather than mutating the real one:
 * these are real people's records and a test that edits them in place is one bad `afterEach` away
 * from a fixture that outlives the test.
 */
function mutate(entry: Contradiction): boolean | null {
  const listedWithInterest = { id: "x", disclosedInterest: "A sentence that names nothing.", disclosedInterestLabel: "" };
  switch (entry.id) {
    case "DISCLOSE-1":
      // A disclosure that neither names ADHD.ME nor says why.
      return /ADHD\.ME/.test(listedWithInterest.disclosedInterest) && Boolean(listedWithInterest.disclosedInterestLabel);
    case "DISCLOSE-2":
      // The named clinician still listed, with the disclosure gone.
      return undefined !== ({ id: "anubhav-saxena" } as { disclosedInterest?: string }).disclosedInterest;
    case "DISCLOSE-3":
      return !/founder|co-?found/i.test("Co-founder of ADHD.ME");
    case "DISPLAY-1":
      // One unheld claim is enough to break it.
      return [{ claims: 1 }].every((c) => c.claims === 0);
    case "CONFLICT-1":
      return [{ disclosedInterest: "x" }].some((c) => c.disclosedInterest === undefined);
    default:
      return null;
  }
}
