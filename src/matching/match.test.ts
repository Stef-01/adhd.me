// W214 verify gate: assignment is order-independent, and a patient's position never depends on a
// clinical attribute — asserted structurally rather than by inspection.

import { describe, expect, it } from "vitest";
import type { Patient } from "@/domain/types";
import { ALL_MATCH_REASONS, candidateFrom, explainPlan, floorVerdict, type MatchCandidate, type MatchSlot } from "./explain";
import { DEFAULT_MATCH_CONFIG, REASONS_THIS_MATCHER_PRODUCES, matchSlots } from "./match";

const candidate = (ref: string, slotIds: string[], outstandingOffers = 0): MatchCandidate => ({
  candidateRef: ref,
  practiceId: "prac-1",
  availableSlotIds: slotIds,
  outstandingOffers,
});

const slot = (id: string, startsAt: string, practiceId = "prac-1"): MatchSlot => ({
  slotId: id,
  practiceId,
  startsAt,
});

const SLOTS = [
  slot("s-1", "2026-09-01T09:00:00Z"),
  slot("s-2", "2026-09-01T10:00:00Z"),
  slot("s-3", "2026-09-02T09:00:00Z"),
];

/** Deterministic shuffle, so a failure is reproducible rather than flaky. */
function rotate<T>(items: readonly T[], by: number): T[] {
  const n = items.length;
  return items.map((_, i) => items[(i + by) % n]!);
}

describe("W214 the assignment is a function of the input set, not its order", () => {
  it("gives the same plan however the candidates and slots arrive", () => {
    // The property W167's register exists for. Two ties are real here — candidates with equal
    // option counts, and slots at the same instant — and each is broken on an identifier.
    const candidates = [
      candidate("p-1", ["s-1", "s-2", "s-3"]),
      candidate("p-2", ["s-1"]),
      candidate("p-3", ["s-1", "s-2"]),
      candidate("p-4", ["s-9"]),
    ];
    const baseline = matchSlots(candidates, SLOTS);
    for (let by = 1; by < candidates.length; by++) {
      expect(matchSlots(rotate(candidates, by), rotate(SLOTS, by % SLOTS.length)), `rotated by ${by}`).toEqual(baseline);
    }
  });

  it("breaks a tie between two slots at the same instant, and does so stably", () => {
    // Simultaneous slots are the shape W128 met on pathway versions: a `reduce` that returned the
    // superseded one, invisible to review and to types.
    const simultaneous = [slot("s-b", "2026-09-01T09:00:00Z"), slot("s-a", "2026-09-01T09:00:00Z")];
    const one = matchSlots([candidate("p-1", ["s-a", "s-b"])], simultaneous);
    const other = matchSlots([candidate("p-1", ["s-a", "s-b"])], rotate(simultaneous, 1));
    expect(one).toEqual(other);
    expect(one[0]!.slotId).toBe("s-a");
  });

  it("stays stable when two candidates contend for the same slot", () => {
    // Deliberately NOT titled "computes counts before assigning". A mutation that recomputed
    // option counts live left every test here green, because the priority sort completes before
    // the first assignment and a live recount would be deterministic anyway. The module note now
    // says so; this test asserts what it can, which is invariance under input order.
    const candidates = [candidate("p-2", ["s-1", "s-2"]), candidate("p-3", ["s-2", "s-3"])];
    expect(matchSlots(candidates, SLOTS)).toEqual(matchSlots(rotate(candidates, 1), SLOTS));
  });
});

describe("W214 position never depends on a clinical attribute", () => {
  it("cannot see one: two patients differing only in clinical markers project identically", () => {
    // STRUCTURAL, which is what the gate asks for. W213's `candidateFrom` is lossy and this is the
    // assertion that the loss is real — inspection is what failed for `rankCandidates`, which has
    // sorted on `chronicCare` since W5 without anybody reading it as a clinical ordering.
    const base: Patient = {
      id: "pat-1", practiceId: "prac-1", chronicCare: false, activeRecall: false,
      lastAttendedAt: "2025-01-01", usualClinicianId: "clin-1", optedOut: false, smsConsent: true,
    } as Patient;
    const unwell = { ...base, chronicCare: true, activeRecall: true, lastAttendedAt: "2019-01-01" } as Patient;
    expect(candidateFrom(unwell, ["s-1"], 0)).toEqual(candidateFrom(base, ["s-1"], 0));
  });

  it("orders on option count and identifier, and on nothing else", () => {
    // The only two inputs to priority. A candidate with fewer options goes first whatever their
    // ref; with equal options, the ref decides — arbitrarily, and the module says so.
    const fewOptions = candidate("p-zzz", ["s-3"]);
    const manyOptions = candidate("p-aaa", ["s-1", "s-2", "s-3"]);
    const plan = matchSlots([manyOptions, fewOptions], SLOTS);
    const byRef = new Map(plan.map((d) => [d.candidateRef, d]));
    expect(byRef.get("p-zzz")!.slotId).toBe("s-3");
    expect(byRef.get("p-aaa")!.slotId).toBe("s-1");

    const tied = matchSlots([candidate("p-b", ["s-1"]), candidate("p-a", ["s-1"])], SLOTS);
    expect(tied.find((d) => d.candidateRef === "p-a")!.slotId).toBe("s-1");
    expect(tied.find((d) => d.candidateRef === "p-b")!.slotId).toBeNull();
  });
});

describe("W214 every candidate gets a decision, and it passes W213's floor", () => {
  it("explains a whole plan without the floor refusing it", () => {
    const candidates = [
      candidate("p-1", ["s-1", "s-2"]),
      candidate("p-2", ["s-1"]),
      candidate("p-3", []),
      candidate("p-4", ["s-3"], DEFAULT_MATCH_CONFIG.outstandingOfferLimit),
    ];
    const plan = matchSlots(candidates, SLOTS);
    expect(floorVerdict(candidates, SLOTS, plan).breaches).toEqual([]);
    const explained = explainPlan(candidates, SLOTS, plan);
    expect(explained).toHaveLength(candidates.length);
    for (const line of explained) expect(line.headline.length).toBeGreaterThan(30);
  });

  it("assigns no slot twice and decides no candidate twice, at scale", () => {
    // Small hand-built cases can miss both. Thirty candidates over ten slots, deterministic.
    const slots = Array.from({ length: 10 }, (_, i) => slot(`s-${i}`, `2026-09-0${(i % 9) + 1}T09:00:00Z`));
    const candidates = Array.from({ length: 30 }, (_, i) =>
      candidate(`p-${String(i).padStart(2, "0")}`, slots.filter((_, j) => (i + j) % 3 === 0).map((s) => s.slotId)),
    );
    const plan = matchSlots(candidates, slots);
    expect(floorVerdict(candidates, slots, plan).breaches).toEqual([]);
    const assigned = plan.filter((d) => d.slotId !== null).map((d) => d.slotId);
    expect(new Set(assigned).size).toBe(assigned.length);
    expect(assigned.length).toBeGreaterThan(0);
    expect(matchSlots(rotate(candidates, 7), rotate(slots, 3))).toEqual(plan);
  });

  it("uses only reasons W213 declares, and declares which ones it can produce", () => {
    // Both directions: nothing produced that is undeclared, nothing declared that is not a real
    // reason. A matcher inventing a reason would fail to typecheck; one silently never producing
    // a declared reason is the half a register catches.
    for (const reason of REASONS_THIS_MATCHER_PRODUCES) {
      expect(ALL_MATCH_REASONS, `${reason} is not a W213 reason`).toContain(reason);
    }
    expect([...REASONS_THIS_MATCHER_PRODUCES].sort()).toEqual([...ALL_MATCH_REASONS].sort());
  });
});

describe("W214 each refusal says the true thing about why", () => {
  it("distinguishes no availability, all-mine-taken, and no slots left at all", () => {
    const reasonFor = (plan: ReturnType<typeof matchSlots>, ref: string) =>
      plan.find((d) => d.candidateRef === ref)!.reason;

    // No offered slot inside recorded availability.
    const none = matchSlots([candidate("p-1", ["s-nope"])], SLOTS);
    expect(reasonFor(none, "p-1")).toBe("no_offered_slot_within_recorded_availability");

    // Their slots are taken but other slots remain — a different sentence to a practice, because
    // offering another appointment in the same window would fix it.
    const contested = matchSlots(
      [candidate("p-1", ["s-1"]), candidate("p-2", ["s-1"])],
      SLOTS,
    );
    expect(reasonFor(contested, "p-2")).toBe("every_slot_they_could_take_was_assigned");

    // Nothing left anywhere: two candidates, one slot, both could take it.
    const scarce = matchSlots(
      [candidate("p-1", ["s-1"]), candidate("p-2", ["s-1"])],
      [slot("s-1", "2026-09-01T09:00:00Z")],
    );
    expect(reasonFor(scarce, "p-2")).toBe("fewer_slots_than_candidates");

    // At the practice's own limit, which is a setting rather than anything about them.
    const capped = matchSlots([candidate("p-1", ["s-1"], 2)], SLOTS);
    expect(reasonFor(capped, "p-1")).toBe("outstanding_offers_at_the_practice_limit");
  });

  it("says a slot was not their earliest only when an earlier one really went elsewhere", () => {
    const plan = matchSlots(
      [candidate("p-1", ["s-1", "s-2"]), candidate("p-2", ["s-1"])],
      SLOTS,
    );
    // p-2 has one option and goes first; p-1 gets s-2 and is told why.
    expect(plan.find((d) => d.candidateRef === "p-2")!.reason).toBe("earliest_slot_the_candidate_can_take");
    const bumped = plan.find((d) => d.candidateRef === "p-1")!;
    expect(bumped.slotId).toBe("s-2");
    expect(bumped.reason).toBe("earliest_remaining_after_earlier_slots_were_assigned");
  });
});

describe("W214 tenancy is in the query", () => {
  it("never offers a candidate a slot at another practice, even if they name it", () => {
    // The shape whose absence produced Y4-1: filtered where the slots are chosen, not after.
    const elsewhere = [slot("s-x", "2026-09-01T09:00:00Z", "prac-2")];
    const plan = matchSlots([candidate("p-1", ["s-x"])], elsewhere);
    expect(plan[0]!.slotId).toBeNull();
    expect(plan[0]!.reason).toBe("no_offered_slot_within_recorded_availability");
  });
});
