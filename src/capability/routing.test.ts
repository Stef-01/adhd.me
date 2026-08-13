// W84 verify gate: routing fixtures, and usual-GP continuity preserved unless the practice
// opts otherwise.

import { describe, expect, it } from "vitest";
import type {
  ClinicianCompetence,
  ClinicianExperience,
  ClinicianId,
  ClinicianInterest,
  ConditionCode,
  PracticeId,
} from "@/domain/types";
import type { Candidate, CompetenceFloor } from "./threshold";
import {
  ROUTING_OFF,
  ROUTING_REASON_COPY,
  type RouteInput,
  routeFor,
  routedShare,
} from "./routing";

const PRACTICE = "prac-1" as PracticeId;
const DIABETES = "cond_diabetes" as ConditionCode;
const CKD = "cond_ckd" as ConditionCode;
const TODAY = "2026-08-10";
const FLOOR: CompetenceFloor = { minAttendedVisits: 10, requireVerifiedCredential: false };

function experience(n: number): ClinicianExperience {
  return {
    practiceId: PRACTICE, clinicianId: "x" as ClinicianId, conditionCode: DIABETES,
    attendedVisits: n, windowFrom: "2026-01-01", windowTo: "2026-06-30",
    source: "derived_case_mix", computedAt: "2026-07-01T00:00:00Z",
  };
}
function interest(n: number): ClinicianInterest {
  return {
    practiceId: PRACTICE, clinicianId: "x" as ClinicianId, conditionCode: DIABETES,
    strength: n, source: "clinician_self_reported", statedAt: "2026-08-01T00:00:00Z",
  };
}
function competence(): ClinicianCompetence {
  return {
    practiceId: PRACTICE, clinicianId: "x" as ClinicianId, conditionCode: DIABETES,
    credential: "Example", attestedBy: "Verifier", verifiedOn: "2026-01-01",
    expiresOn: null, source: "external_verification",
  };
}
function cand(id: string, visits: number, opts: { interest?: number; credential?: boolean } = {}): Candidate {
  return {
    clinicianId: id as ClinicianId,
    experience: experience(visits),
    competence: opts.credential ? competence() : null,
    interest: opts.interest === undefined ? null : interest(opts.interest),
  };
}
function route(over: Partial<RouteInput> = {}) {
  return routeFor({
    practiceId: PRACTICE,
    conditionCode: DIABETES,
    usualClinicianId: "usual" as ClinicianId,
    candidates: [],
    config: { enabledConditions: [DIABETES], floor: FLOOR },
    onIso: TODAY,
    ...over,
  });
}

describe("W84 continuity is the default", () => {
  it("routing is off unless the practice opts in for this register", () => {
    const decision = route({
      config: ROUTING_OFF,
      candidates: [cand("usual", 0), cand("better", 500)],
    });

    expect(decision.routed).toBe(false);
    expect(decision.clinicianId).toBe("usual");
    expect(decision.reason).toBe("routing_disabled_for_condition");
  });

  it("opting in for one register does not opt in for another", () => {
    const decision = route({
      conditionCode: CKD,
      config: { enabledConditions: [DIABETES], floor: FLOOR },
      candidates: [cand("usual", 0), cand("better", 500)],
    });

    expect(decision.routed).toBe(false);
    expect(decision.reason).toBe("routing_disabled_for_condition");
  });

  it("keeps the patient with a usual GP who clears the floor, however good the alternative", () => {
    // Routing covers gaps; it does not optimise. This is the case most likely to be
    // "improved" by a careless change, so it is pinned hard.
    const decision = route({
      candidates: [cand("usual", 12), cand("far-better", 999, { interest: 5, credential: true })],
    });

    expect(decision.routed).toBe(false);
    expect(decision.clinicianId).toBe("usual");
    expect(decision.reason).toBe("usual_gp_clears_floor");
  });

  it("keeps the patient with their usual GP when nobody else clears the floor", () => {
    // A worse match than the status quo is not an improvement.
    const decision = route({ candidates: [cand("usual", 0), cand("other", 3)] });

    expect(decision.routed).toBe(false);
    expect(decision.clinicianId).toBe("usual");
    expect(decision.reason).toBe("no_candidate_clears_floor");
  });
});

describe("W84 routing fixtures", () => {
  it("routes when the usual GP is below the floor and someone else clears it", () => {
    const decision = route({ candidates: [cand("usual", 1), cand("able", 50)] });

    expect(decision.routed).toBe(true);
    expect(decision.clinicianId).toBe("able");
    expect(decision.reason).toBe("routed_to_better_match");
  });

  it("picks the W82 ranking's top qualified candidate, not the keenest", () => {
    // Interest orders inside the cleared group only — a keen but below-floor clinician
    // must not be chosen.
    const decision = route({
      candidates: [
        cand("usual", 0),
        cand("keen-unqualified", 2, { interest: 5 }),
        cand("qualified-quiet", 40),
        cand("qualified-keen", 40, { interest: 4 }),
      ],
    });

    expect(decision.clinicianId).toBe("qualified-keen");
  });

  it("never names the usual GP as a routing target", () => {
    const decision = route({
      usualClinicianId: "usual" as ClinicianId,
      candidates: [cand("usual", 1), cand("able", 50)],
    });

    expect(decision.clinicianId).not.toBe("usual");
  });

  it("handles a patient with no usual GP recorded", () => {
    const withCandidate = route({ usualClinicianId: null, candidates: [cand("able", 50)] });
    expect(withCandidate.routed).toBe(true);
    expect(withCandidate.clinicianId).toBe("able");

    const without = route({ usualClinicianId: null, candidates: [cand("nope", 1)] });
    expect(without.clinicianId).toBeNull();
    expect(without.reason).toBe("no_usual_gp_recorded");
  });

  it("routes only inside the practice it was given", () => {
    // In-panel is the whole constraint: the decision carries the practice it was made for,
    // and the caller supplies only that practice's clinicians.
    const decision = route({ candidates: [cand("usual", 1), cand("able", 50)] });
    expect(decision.practiceId).toBe(PRACTICE);
  });

  it("carries the ranked field it decided from", () => {
    const decision = route({ candidates: [cand("usual", 1), cand("able", 50), cand("third", 0)] });

    expect(decision.considered).toHaveLength(3);
    // Every considered candidate is explainable: cleared, or with reasons why not.
    for (const c of decision.considered) {
      if (!c.clearsFloor) expect(c.failures.length).toBeGreaterThan(0);
    }
  });

  it("every reason has practice-facing copy that names continuity or the threshold", () => {
    for (const [reason, copy] of Object.entries(ROUTING_REASON_COPY)) {
      expect(copy.length, reason).toBeGreaterThan(30);
      expect(copy.toLowerCase()).toMatch(/usual gp|threshold/);
      // Never a clinical claim about the patient.
      for (const banned of ["needs", "should be seen", "at risk", "diagnos"]) {
        expect(copy.toLowerCase(), `${reason} must not make a clinical claim`).not.toContain(banned);
      }
    }
  });

  it("reports the share of patients moved away from their usual GP", () => {
    const decisions = [
      route({ candidates: [cand("usual", 1), cand("able", 50)] }),
      route({ candidates: [cand("usual", 40)] }),
    ];

    expect(routedShare(decisions)).toBe(0.5);
    expect(routedShare([])).toBe(0);
  });
});
