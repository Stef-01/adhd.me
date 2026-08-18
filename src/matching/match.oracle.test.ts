// O6: the greedy's distance from optimal, measured instead of asserted (F8).
//
// The module note in `match.ts` refuses augmenting paths because a reassignment chain cannot be
// one sentence — and until this file, the PRICE of that refusal was a claim in a comment ("would
// sometimes offer one more appointment"). The field's baseline makes the price measurable for
// free: an augmenting-path maximum matching is ~30 lines with no dependency, so it lives HERE,
// in the suite, as an oracle the production matcher is measured against and never imports.
//
// TWO KINDS OF ASSERTION, deliberately different in strength:
//
//   THE THEOREM. `matchSlots` produces a MAXIMAL matching (every unmatched candidate had all
//   their feasible slots taken), and any maximal matching is at least half a maximum one. That
//   bound holds for every input there will ever be, so it is asserted per-instance.
//
//   THE MEASUREMENT. Over a fixed generated corpus, the observed gap is pinned. This is a fact
//   about these instances, not a theorem — the pin exists so that if a change to the greedy
//   widens the gap, somebody looks, because a wider gap means `fewer_slots_than_candidates` is
//   quietly overstating scarcity to practices.
//
// The generator is a seeded LCG rather than Math.random so the corpus, and therefore the pinned
// gap, is the same on every run — the reach-ratchet pattern applied to optimality.

import { describe, expect, it } from "vitest";
import { matchSlots } from "./match";
import type { MatchCandidate, MatchSlot } from "./explain";

/**
 * Maximum bipartite matching via augmenting paths (Kuhn's algorithm) — the standard whose first
 * phase IS the production greedy; Hopcroft–Karp is this with a BFS layering the corpus sizes
 * here do not need. Test-only: nothing in src/ may import this, and a test pins that.
 */
function maximumMatchingSize(feasible: ReadonlyMap<string, readonly string[]>): number {
  const matchedSlotTo = new Map<string, string>();

  const tryAugment = (candidate: string, seen: Set<string>): boolean => {
    for (const slot of feasible.get(candidate) ?? []) {
      if (seen.has(slot)) continue;
      seen.add(slot);
      const holder = matchedSlotTo.get(slot);
      if (holder === undefined || tryAugment(holder, seen)) {
        matchedSlotTo.set(slot, candidate);
        return true;
      }
    }
    return false;
  };

  let size = 0;
  for (const candidate of feasible.keys()) {
    if (tryAugment(candidate, new Set())) size += 1;
  }
  return size;
}

/** Deterministic LCG so the corpus, and the pinned gap, never drift between runs. */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function generateInstance(rand: () => number): { candidates: MatchCandidate[]; slots: MatchSlot[] } {
  const slotCount = 1 + Math.floor(rand() * 8);
  const candidateCount = 1 + Math.floor(rand() * 8);
  const slots: MatchSlot[] = Array.from({ length: slotCount }, (_, i) => ({
    slotId: `s${i}`,
    practiceId: "p1",
    startsAt: `2026-09-01T0${i}:00:00Z`,
  }));
  const candidates: MatchCandidate[] = Array.from({ length: candidateCount }, (_, i) => ({
    candidateRef: `c${i}`,
    practiceId: "p1",
    availableSlotIds: slots.filter(() => rand() < 0.4).map((s) => s.slotId),
    outstandingOffers: 0,
  }));
  return { candidates, slots };
}

describe("O6 the greedy is measured against the maximum matching (F8)", () => {
  it("the oracle agrees with brute force on every tiny instance", () => {
    // Exhaustive check over all bipartite graphs with 3 candidates x 3 slots (2^9 edge sets),
    // so the oracle itself is verified before anything is measured against it.
    const bruteMax = (adj: boolean[][]): number => {
      let best = 0;
      const used = new Set<number>();
      const walk = (candidate: number, size: number) => {
        best = Math.max(best, size);
        if (candidate === adj.length) return;
        walk(candidate + 1, size);
        for (let slot = 0; slot < 3; slot += 1) {
          if (adj[candidate]![slot] && !used.has(slot)) {
            used.add(slot);
            walk(candidate + 1, size + 1);
            used.delete(slot);
          }
        }
      };
      walk(0, 0);
      return best;
    };

    for (let mask = 0; mask < 512; mask += 1) {
      const adj = [0, 1, 2].map((c) => [0, 1, 2].map((s) => Boolean(mask & (1 << (c * 3 + s)))));
      const feasible = new Map(
        adj.map((row, c) => [`c${c}`, row.flatMap((edge, s) => (edge ? [`s${s}`] : []))]),
      );
      expect(maximumMatchingSize(feasible)).toBe(bruteMax(adj));
    }
  });

  it("holds the maximal-matching theorem and pins the observed gap", () => {
    const rand = lcg(20260818);
    let widest = 0;
    let instancesWithAGap = 0;

    for (let i = 0; i < 400; i += 1) {
      const { candidates, slots } = generateInstance(rand);
      const decisions = matchSlots(candidates, slots);
      const greedySize = decisions.filter((d) => d.slotId !== null).length;

      const feasible = new Map(
        candidates.map((c) => [
          c.candidateRef,
          slots.filter((s) => c.availableSlotIds.includes(s.slotId)).map((s) => s.slotId),
        ]),
      );
      const maximumSize = maximumMatchingSize(feasible);

      // The theorem: a maximal matching is never less than half a maximum one.
      expect(greedySize).toBeGreaterThanOrEqual(Math.ceil(maximumSize / 2));
      // And never more, which would mean the oracle is broken.
      expect(greedySize).toBeLessThanOrEqual(maximumSize);

      if (greedySize < maximumSize) instancesWithAGap += 1;
      widest = Math.max(widest, maximumSize - greedySize);
    }

    /**
     * THE MEASUREMENT, pinned. On this fixed 400-instance corpus the greedy leaves at most ONE
     * appointment unoffered, and only rarely. These are measured facts about this corpus, not
     * theorems: if either number grows after a change to the matcher, the explainability trade
     * documented in match.ts has become more expensive and needs re-arguing with the new number.
     */
    expect(widest).toBeLessThanOrEqual(1);
    expect(instancesWithAGap).toBeLessThanOrEqual(40);
  });

  it("keeps the oracle out of production", async () => {
    // The oracle exists to measure the greedy, never to replace it: an import from src/ would
    // put an unexplainable optimum one refactor away from a practice manager's screen.
    const { readFileSync, readdirSync } = await import("node:fs");
    const { join } = await import("node:path");
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) return walk(full);
        return entry.name.endsWith(".ts") && !entry.name.includes(".test.") ? [full] : [];
      });
    for (const file of walk(join(__dirname, ".."))) {
      // Imports only: the module note in match.ts NAMES this file, and naming the oracle is
      // exactly what the note is for.
      expect(readFileSync(file, "utf8")).not.toMatch(/from\s+"[^"]*match\.oracle/);
    }
  });
});
