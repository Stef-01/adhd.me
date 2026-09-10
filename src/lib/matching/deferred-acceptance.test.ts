// M1 verify gate: deferred acceptance is STABLE (no blocking pair, asserted over generated
// markets rather than named examples), respects quota and capacity, refuses unacceptable
// proposals, and is a function of the two preference sets rather than of arrival order.

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { blockingPairs, deferredAcceptance, type Proposer, type Receiver } from "./deferred-acceptance";

const SEED = 20260909;

/** A random market: n proposers over m receivers, each side ranking a random subset of the other. */
const market = fc
  .record({
    n: fc.integer({ min: 1, max: 8 }),
    m: fc.integer({ min: 1, max: 8 }),
    quota: fc.integer({ min: 1, max: 3 }),
  })
  .chain(({ n, m, quota }) => {
    const pIds = Array.from({ length: n }, (_, i) => `p${i}`);
    const rIds = Array.from({ length: m }, (_, i) => `r${i}`);
    return fc.record({
      proposers: fc.tuple(...pIds.map((id) => fc.shuffledSubarray(rIds).map((prefs): Proposer => ({ id, preferences: prefs, quota })))),
      receivers: fc.tuple(
        ...rIds.map((id) =>
          fc
            .tuple(fc.shuffledSubarray(pIds), fc.integer({ min: 0, max: 4 }))
            .map(([prefs, capacity]): Receiver => ({ id, preferences: prefs, capacity })),
        ),
      ),
    });
  });

describe("M1 deferred acceptance is stable", () => {
  it("has no blocking pair on any generated market", () => {
    fc.assert(
      fc.property(market, ({ proposers, receivers }) => {
        const result = deferredAcceptance(proposers, receivers);
        expect(blockingPairs(result, proposers, receivers)).toEqual([]);
      }),
      { seed: SEED, numRuns: 400 },
    );
  });

  it("respects every quota and capacity, and holds only mutually acceptable pairs", () => {
    fc.assert(
      fc.property(market, ({ proposers, receivers }) => {
        const result = deferredAcceptance(proposers, receivers);
        for (const p of proposers) {
          const held = result.held.get(p.id) ?? [];
          expect(held.length).toBeLessThanOrEqual(p.quota);
          for (const r of held) {
            expect(p.preferences).toContain(r);
            expect(receivers.find((x) => x.id === r)!.preferences).toContain(p.id);
          }
        }
        for (const r of receivers) expect((result.holding.get(r.id) ?? []).length).toBeLessThanOrEqual(r.capacity);
      }),
      { seed: SEED, numRuns: 400 },
    );
  });

  it("is a function of the preference sets, not the arrays' order (W214)", () => {
    fc.assert(
      fc.property(market, ({ proposers, receivers }) => {
        const a = deferredAcceptance(proposers, receivers);
        const b = deferredAcceptance([...proposers].reverse(), [...receivers].reverse());
        expect([...b.held.entries()]).toEqual([...a.held.entries()]);
        expect([...b.holding.entries()]).toEqual([...a.holding.entries()]);
      }),
      { seed: SEED, numRuns: 300 },
    );
  });
});

describe("M1 deferred acceptance, read as a story", () => {
  it("gives a patient their top three when nobody contests them", () => {
    const result = deferredAcceptance(
      [{ id: "p", preferences: ["a", "b", "c", "d"], quota: 3 }],
      ["a", "b", "c", "d"].map((id) => ({ id, preferences: ["p"], capacity: 2 })),
    );
    expect(result.held.get("p")).toEqual(["a", "b", "c"]);
    expect(result.proposals).toBe(3);
  });

  it("frees a displaced patient to keep proposing down their list", () => {
    // Both want `a` first; `a` holds one and prefers p2, so p1 is released and lands at `b`.
    const result = deferredAcceptance(
      [
        { id: "p1", preferences: ["a", "b"], quota: 1 },
        { id: "p2", preferences: ["a", "b"], quota: 1 },
      ],
      [
        { id: "a", preferences: ["p2", "p1"], capacity: 1 },
        { id: "b", preferences: ["p1", "p2"], capacity: 1 },
      ],
    );
    expect(result.held.get("p1")).toEqual(["b"]);
    expect(result.held.get("p2")).toEqual(["a"]);
    expect(result.log.some((e) => e.kind === "released" && e.proposer === "p1" && e.displacedBy === "p2")).toBe(true);
  });

  it("never holds a proposer the receiver did not list, and says it refused", () => {
    const result = deferredAcceptance([{ id: "p", preferences: ["a"], quota: 1 }], [{ id: "a", preferences: [], capacity: 3 }]);
    expect(result.held.get("p")).toEqual([]);
    expect(result.log).toContainEqual({ kind: "refused", round: 1, proposer: "p", receiver: "a", because: "unacceptable" });
  });

  it("treats a receiver with no capacity as unacceptable rather than looping", () => {
    const result = deferredAcceptance([{ id: "p", preferences: ["a"], quota: 1 }], [{ id: "a", preferences: ["p"], capacity: 0 }]);
    expect(result.held.get("p")).toEqual([]);
    expect(result.rounds).toBe(1);
  });

  it("returns held lists in the proposer's own preference order", () => {
    const result = deferredAcceptance(
      [{ id: "p", preferences: ["c", "a", "b"], quota: 3 }],
      ["a", "b", "c"].map((id) => ({ id, preferences: ["p"], capacity: 1 })),
    );
    expect(result.held.get("p")).toEqual(["c", "a", "b"]);
  });
});
