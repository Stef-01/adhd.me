// W213 verify gate: "W86's total-explanation posture extended to matching — every decision
// renders its reason, no fallback branch, adding a reason without copy fails to typecheck."
//
// The three assertions are of three different kinds on purpose, because the rule fails in three
// different ways. Exhaustive copy is a TYPE property, checked with `@ts-expect-error`. "No
// fallback branch" is a property of what the source may CONTAIN, so the test reads the file.
// Total accounting is a property of a plan, checked by feeding the floor plans that lie.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Patient, PatientId, PracticeId, ClinicianId } from "@/domain/types";
import {
  ALL_MATCH_REASONS,
  MATCHED_REASONS,
  MATCH_FLOOR_BREACH_COPY,
  MATCH_REASON_COPY,
  UnexplainedPlanError,
  candidateFrom,
  explainMatch,
  explainPlan,
  floorVerdict,
  type MatchCandidate,
  type MatchDecision,
  type MatchReason,
  type MatchSlot,
} from "./explain";

const SOURCE = readFileSync(path.join(process.cwd(), "src/matching/explain.ts"), "utf8");

const P = "prac-1";
const slot = (slotId: string, startsAt: string): MatchSlot => ({ slotId, practiceId: P, startsAt });
const candidate = (candidateRef: string, availableSlotIds: string[] = ["s1"]): MatchCandidate => ({
  candidateRef,
  practiceId: P,
  availableSlotIds,
  outstandingOffers: 0,
});

const SLOTS = [slot("s1", "2026-06-01T09:00:00Z"), slot("s2", "2026-06-01T10:00:00Z")];

const patient = (over: Partial<Patient> = {}): Patient => ({
  id: "pat-1" as PatientId,
  practiceId: P as PracticeId,
  usualClinicianId: "clin-1" as ClinicianId,
  smsConsent: true,
  optedOut: false,
  lastAttendedAt: "2025-01-01",
  futureBookingAt: null,
  activeRecall: false,
  chronicCare: false,
  holdout: false,
  ...over,
});

describe("W213 explanation is total, not best-effort", () => {
  it("has copy for every reason and no reason without copy", () => {
    expect(Object.keys(MATCH_REASON_COPY).sort()).toEqual([...ALL_MATCH_REASONS].sort());
    for (const reason of ALL_MATCH_REASONS) {
      expect(MATCH_REASON_COPY[reason].length, reason).toBeGreaterThan(40);
    }
  });

  it("fails to typecheck when a reason has no copy", () => {
    // The mechanism, asserted at the type level rather than described in a comment. If the
    // `Record` ever loosened to a partial map this directive would become unused and typecheck
    // would fail — which is how this test stays load-bearing.
    // @ts-expect-error — a map missing `fewer_slots_than_candidates` is not a total Record.
    const incomplete: Record<MatchReason, string> = {
      earliest_slot_the_candidate_can_take: "x",
      earliest_remaining_after_earlier_slots_were_assigned: "x",
      no_offered_slot_within_recorded_availability: "x",
      every_slot_they_could_take_was_assigned: "x",
      outstanding_offers_at_the_practice_limit: "x",
    };
    void incomplete;
  });

  it("renders a headline for every reason, matched and unmatched alike", () => {
    // W86's rule about kept decisions: "why was this person NOT offered one" is asked at least
    // as often, and a practice that turned matching on and saw nothing happen needs an answer.
    for (const reason of ALL_MATCH_REASONS) {
      const matched = MATCHED_REASONS.includes(reason);
      const explanation = explainMatch({ candidateRef: "c1", slotId: matched ? "s1" : null, reason });
      expect(explanation.headline, reason).toBe(MATCH_REASON_COPY[reason]);
      expect(explanation.headline.length, reason).toBeGreaterThan(0);
      expect(explanation.matched, reason).toBe(matched);
    }
  });

  it("contains no fallback branch, checked against the source rather than the output", () => {
    // The rule is about what this module may CONTAIN. A fallback returns correct-looking copy
    // for every input a test would think to try, which is exactly why testing the output cannot
    // find one. Each pattern below is a way an unexplained decision becomes renderable.
    const body = SOURCE.split("\n")
      .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"))
      .join("\n");
    expect(body, "a default: case is a home for an unexplained reason").not.toMatch(/\bdefault\s*:/);
    expect(body, "a ?? on a copy lookup renders a substitute for an unknown reason").not.toMatch(
      /_COPY\[[^\]]+\]\s*\?\?/,
    );
    expect(body, "a || fallback string is the same thing spelled differently").not.toMatch(
      /_COPY\[[^\]]+\]\s*\|\|/,
    );
    expect(body, "no reason may render as unknown").not.toMatch(/"(unknown|unspecified|other)"/i);
  });
});

describe("W213 a matcher cannot see a clinical attribute", () => {
  it("projects two patients differing only in a clinical marker to the same candidate", () => {
    // The structural assertion W214's gate asks for. Not "the sort does not read chronicCare" —
    // that is inspection, and inspection is what missed `rankCandidates` for eight quarters.
    // These two records are indistinguishable to any matcher built through this floor.
    const ordinary = candidateFrom(patient({ chronicCare: false, activeRecall: false }), ["s1"], 0);
    const clinical = candidateFrom(patient({ chronicCare: true, activeRecall: true }), ["s1"], 0);
    expect(clinical).toEqual(ordinary);
  });

  it("projects two patients differing only in how overdue they are to the same candidate", () => {
    // "Longest since last visit" is how an ordering by need arrives without looking like one,
    // and W5's ranker uses it today. The projection drops it too.
    const recent = candidateFrom(patient({ lastAttendedAt: "2026-05-01" }), ["s1"], 0);
    const overdue = candidateFrom(patient({ lastAttendedAt: "2019-01-01" }), ["s1"], 0);
    expect(overdue).toEqual(recent);
  });

  it("has nowhere on the candidate type to put one", () => {
    // The value test above holds for today's projection; this holds for any projection, because
    // there is no field to write to. A unit wanting to weigh a condition must widen a declared
    // interface, which is a visible change rather than a line inside a sort.
    expect(Object.keys(candidateFrom(patient(), ["s1"], 2)).sort()).toEqual([
      "availableSlotIds",
      "candidateRef",
      "outstandingOffers",
      "practiceId",
    ]);
  });

  it("names no condition, symptom or urgency anywhere in the reason vocabulary or its copy", () => {
    // Founder gate (plan §4). This is the surface where a triage would first become expressible:
    // a reason is the one place a matcher gets to say WHY, in words a practice reads.
    const vocabulary = [
      ...ALL_MATCH_REASONS,
      ...Object.values(MATCH_REASON_COPY),
      ...Object.values(MATCH_FLOOR_BREACH_COPY),
    ].join(" ");
    expect(vocabulary).not.toMatch(
      /diabet|renal|ckd|cardio|derm|symptom|severit|urgen|clinical need|priorit|diagnos|sicker|at risk/i,
    );
  });

  it("says in its own copy that nothing about the person was weighed", () => {
    // The sentence a practice manager reads when somebody was not reached. It has to say what
    // did NOT happen, because the natural reading of "not selected" is that they were assessed.
    expect(MATCH_REASON_COPY.fewer_slots_than_candidates).toContain(
      "Nothing about them was weighed against anybody else",
    );
  });
});

describe("W213 the floor refuses a plan that does not explain everything", () => {
  const CANDIDATES = [candidate("c1"), candidate("c2", ["s2"])];
  const GOOD: MatchDecision[] = [
    { candidateRef: "c1", slotId: "s1", reason: "earliest_slot_the_candidate_can_take" },
    { candidateRef: "c2", slotId: "s2", reason: "earliest_slot_the_candidate_can_take" },
  ];

  it("passes a plan that accounts for everybody", () => {
    expect(floorVerdict(CANDIDATES, SLOTS, GOOD).breaches).toEqual([]);
    expect(explainPlan(CANDIDATES, SLOTS, GOOD).map((e) => e.candidateRef)).toEqual(["c1", "c2"]);
  });

  it("catches a candidate the matcher silently dropped", () => {
    // The failure that looks like success: every decision rendered is correct, and the missing
    // one is invisible because there is nothing to render.
    const dropped = GOOD.slice(0, 1);
    expect(floorVerdict(CANDIDATES, SLOTS, dropped).breaches).toEqual([
      { breach: "candidate_with_no_decision", subject: "c2" },
    ]);
    expect(() => explainPlan(CANDIDATES, SLOTS, dropped)).toThrow(UnexplainedPlanError);
  });

  it("catches a decision about somebody the matcher was never given", () => {
    const invented: MatchDecision[] = [
      ...GOOD,
      { candidateRef: "c-nobody", slotId: null, reason: "fewer_slots_than_candidates" },
    ];
    expect(floorVerdict(CANDIDATES, SLOTS, invented).breaches).toEqual([
      { breach: "decision_for_an_unknown_candidate", subject: "c-nobody" },
    ]);
  });

  it("catches the same person decided twice and the same slot assigned twice", () => {
    const doubled: MatchDecision[] = [
      ...GOOD,
      { candidateRef: "c1", slotId: "s2", reason: "earliest_slot_the_candidate_can_take" },
    ];
    expect(floorVerdict(CANDIDATES, SLOTS, doubled).breaches).toEqual([
      { breach: "candidate_decided_twice", subject: "c1" },
      { breach: "slot_assigned_twice", subject: "s2" },
    ]);
  });

  it("catches a slot that was never offered", () => {
    const phantom: MatchDecision[] = [
      { candidateRef: "c1", slotId: "s-phantom", reason: "earliest_slot_the_candidate_can_take" },
      GOOD[1]!,
    ];
    expect(floorVerdict(CANDIDATES, SLOTS, phantom).breaches).toEqual([
      { breach: "decision_for_an_unknown_slot", subject: "s-phantom" },
    ]);
  });

  it("catches a reason that contradicts what was decided, both ways round", () => {
    // The subtlest one: the plan is complete and the copy renders, but the sentence on screen
    // explains the opposite decision. Checked in both directions because only one of them looks
    // wrong at a glance.
    const matchedWithUnmatchedReason: MatchDecision[] = [
      { candidateRef: "c1", slotId: "s1", reason: "fewer_slots_than_candidates" },
      GOOD[1]!,
    ];
    const unmatchedWithMatchedReason: MatchDecision[] = [
      { candidateRef: "c1", slotId: null, reason: "earliest_slot_the_candidate_can_take" },
      GOOD[1]!,
    ];
    expect(floorVerdict(CANDIDATES, SLOTS, matchedWithUnmatchedReason).breaches).toEqual([
      { breach: "reason_contradicts_the_assignment", subject: "c1" },
    ]);
    expect(floorVerdict(CANDIDATES, SLOTS, unmatchedWithMatchedReason).breaches).toEqual([
      { breach: "reason_contradicts_the_assignment", subject: "c1" },
    ]);
  });

  it("reports breaches in an order that is a property of the plan, not of discovery", () => {
    // W167's rule applied to a diagnostic: a refusal message that reorders between runs is a
    // refusal somebody will treat as flaky.
    const messy: MatchDecision[] = [
      { candidateRef: "c-nobody", slotId: null, reason: "fewer_slots_than_candidates" },
      { candidateRef: "c1", slotId: "s1", reason: "earliest_slot_the_candidate_can_take" },
    ];
    const forwards = floorVerdict(CANDIDATES, SLOTS, messy).breaches;
    const backwards = floorVerdict(CANDIDATES, SLOTS, [...messy].reverse()).breaches;
    expect(backwards).toEqual(forwards);
  });

  it("explains a refusal in words rather than only naming a breach", () => {
    for (const breach of Object.keys(MATCH_FLOOR_BREACH_COPY) as (keyof typeof MATCH_FLOOR_BREACH_COPY)[]) {
      expect(MATCH_FLOOR_BREACH_COPY[breach].length, breach).toBeGreaterThan(30);
    }
    expect(() => explainPlan(CANDIDATES, SLOTS, GOOD.slice(0, 1))).toThrow(
      /candidate_with_no_decision \(c2\)/,
    );
  });
});
