// W82 verify gate: a property test — enthusiasm never outranks the competence floor.
//
// Hand-picked cases prove the rule holds for the cases the author thought of, which is the
// weakest possible evidence for a safety property. These generate the whole space that
// matters (deterministically, so failures reproduce) and assert the law over all of it.

import { describe, expect, it } from "vitest";
import type {
  ClinicianCompetence,
  ClinicianExperience,
  ClinicianId,
  ClinicianInterest,
  ConditionCode,
  PracticeId,
} from "@/domain/types";
import {
  DEFAULT_FLOOR,
  FLOOR_FAILURE_COPY,
  type Candidate,
  type CompetenceFloor,
  clearsFloor,
  eligibleForRouting,
  rankByCapability,
} from "./threshold";

const PRACTICE = "prac-1" as PracticeId;
const CONDITION = "cond_diabetes" as ConditionCode;
const TODAY = "2026-08-10";

function experience(attendedVisits: number): ClinicianExperience {
  return {
    practiceId: PRACTICE,
    clinicianId: "x" as ClinicianId,
    conditionCode: CONDITION,
    attendedVisits,
    windowFrom: "2026-01-01",
    windowTo: "2026-06-30",
    source: "derived_case_mix",
    computedAt: "2026-07-01T00:00:00Z",
  };
}

function competence(expiresOn: string | null): ClinicianCompetence {
  return {
    practiceId: PRACTICE,
    clinicianId: "x" as ClinicianId,
    conditionCode: CONDITION,
    credential: "Example credential",
    attestedBy: "Example verifier",
    verifiedOn: "2026-01-01",
    expiresOn,
    source: "external_verification",
  };
}

function interest(strength: number): ClinicianInterest {
  return {
    practiceId: PRACTICE,
    clinicianId: "x" as ClinicianId,
    conditionCode: CONDITION,
    strength,
    source: "clinician_self_reported",
    statedAt: "2026-08-01T00:00:00Z",
  };
}

function candidate(
  id: string,
  over: { visits?: number; credential?: string | null | undefined; interest?: number } = {},
): Candidate {
  return {
    clinicianId: id as ClinicianId,
    experience: over.visits === undefined ? null : experience(over.visits),
    competence: over.credential === undefined ? null : competence(over.credential),
    interest: over.interest === undefined ? null : interest(over.interest),
  };
}

describe("W82 the floor itself", () => {
  it("treats unmeasured experience as zero, never as sufficient", () => {
    // A clinician with no telemetry must not clear every floor by default.
    const verdict = clearsFloor(candidate("a"), { ...DEFAULT_FLOOR, minAttendedVisits: 1 }, TODAY);
    expect(verdict.clears).toBe(false);
    expect(verdict.failures).toContain("insufficient_experience");
  });

  it("requires a credential when the practice asks for one", () => {
    const floor: CompetenceFloor = { minAttendedVisits: 0, requireVerifiedCredential: true };
    expect(clearsFloor(candidate("a", { visits: 500 }), floor, TODAY).failures).toContain(
      "no_verified_credential",
    );
    expect(clearsFloor(candidate("a", { credential: null }), floor, TODAY).clears).toBe(true);
  });

  it("treats an expired credential as expired, not as absent", () => {
    const floor: CompetenceFloor = { minAttendedVisits: 0, requireVerifiedCredential: true };
    const verdict = clearsFloor(candidate("a", { credential: "2026-01-31" }), floor, TODAY);

    expect(verdict.clears).toBe(false);
    // Distinct reasons: "never had one" and "had one, it lapsed" need different actions.
    expect(verdict.failures).toEqual(["credential_expired"]);
  });

  it("accepts a credential with no stated expiry as current", () => {
    const floor: CompetenceFloor = { minAttendedVisits: 0, requireVerifiedCredential: true };
    expect(clearsFloor(candidate("a", { credential: null }), floor, TODAY).clears).toBe(true);
  });

  it("reports every reason a candidate fell short, not just the first", () => {
    const floor: CompetenceFloor = { minAttendedVisits: 10, requireVerifiedCredential: true };
    expect(clearsFloor(candidate("a"), floor, TODAY).failures.sort()).toEqual([
      "insufficient_experience",
      "no_verified_credential",
    ]);
  });

  it("has readable copy for every failure reason", () => {
    for (const [reason, copy] of Object.entries(FLOOR_FAILURE_COPY)) {
      expect(copy.length, reason).toBeGreaterThan(20);
    }
  });
});

describe("W82 PROPERTY: enthusiasm never outranks the floor", () => {
  const FLOORS: CompetenceFloor[] = [
    { minAttendedVisits: 0, requireVerifiedCredential: false },
    { minAttendedVisits: 5, requireVerifiedCredential: false },
    { minAttendedVisits: 0, requireVerifiedCredential: true },
    { minAttendedVisits: 20, requireVerifiedCredential: true },
  ];
  const VISITS = [undefined, 0, 1, 4, 5, 19, 20, 200];
  const CREDENTIALS: Array<string | null | undefined> = [undefined, null, "2026-12-31", "2026-01-31"];
  const INTERESTS = [undefined, 1, 3, 5];

  /** Every combination that matters: 8 × 4 × 4 = 128 candidate shapes. */
  function everyCandidate(): Candidate[] {
    const all: Candidate[] = [];
    let n = 0;
    for (const visits of VISITS) {
      for (const credential of CREDENTIALS) {
        for (const strength of INTERESTS) {
          all.push(candidate(`clin-${String(n++).padStart(3, "0")}`, { visits, credential, interest: strength }));
        }
      }
    }
    return all;
  }

  it.each(FLOORS.map((f, i) => [i, f] as const))(
    "floor %i: no below-floor candidate ever outranks an above-floor one",
    (_i, floor) => {
      const ranked = rankByCapability(everyCandidate(), floor, TODAY);
      const firstBelow = ranked.findIndex((c) => !c.clearsFloor);
      const lastAbove = ranked.map((c) => c.clearsFloor).lastIndexOf(true);

      if (firstBelow !== -1 && lastAbove !== -1) {
        // The partition is total: every clearing candidate precedes every failing one,
        // whatever their interest.
        expect(lastAbove).toBeLessThan(firstBelow);
      }
    },
  );

  it.each(FLOORS.map((f, i) => [i, f] as const))(
    "floor %i: maximum enthusiasm below the floor still loses to minimum enthusiasm above it",
    (_i, floor) => {
      // The adversarial pair, constructed rather than hoped for: the keenest possible
      // unqualified candidate against the most indifferent qualified one.
      const keenButUnqualified = candidate("z-keen", { visits: 0, interest: 5 });
      const qualifiedButIndifferent = candidate("a-qualified", {
        visits: 1000,
        credential: null,
        interest: undefined,
      });

      const ranked = rankByCapability([keenButUnqualified, qualifiedButIndifferent], floor, TODAY);

      if (
        clearsFloor(qualifiedButIndifferent, floor, TODAY).clears &&
        !clearsFloor(keenButUnqualified, floor, TODAY).clears
      ) {
        expect(ranked[0]!.clinicianId).toBe("a-qualified");
      }
    },
  );

  it("interest is not merely ignored below the floor — it is not carried", () => {
    // So no downstream consumer can reintroduce it into a comparison.
    const floor: CompetenceFloor = { minAttendedVisits: 10, requireVerifiedCredential: false };
    const ranked = rankByCapability(everyCandidate(), floor, TODAY);

    for (const c of ranked) {
      if (!c.clearsFloor) expect(c.interestStrength).toBeNull();
    }
  });

  it("interest DOES order candidates inside the cleared group", () => {
    // The other half of the law: below the floor it counts for nothing, above it, it counts.
    const floor: CompetenceFloor = { minAttendedVisits: 1, requireVerifiedCredential: false };
    const ranked = rankByCapability(
      [
        candidate("a-low", { visits: 10, interest: 1 }),
        candidate("b-high", { visits: 10, interest: 5 }),
      ],
      floor,
      TODAY,
    );

    expect(ranked.map((c) => c.clinicianId)).toEqual(["b-high", "a-low"]);
  });

  it("no amount of interest closes an experience gap, at any floor", () => {
    // The additive-scoring failure mode, checked directly: if interest were weighted into a
    // single score, a strength-5 candidate would eventually overtake. It never does.
    for (const floor of FLOORS) {
      for (const strength of [1, 2, 3, 4, 5]) {
        const ranked = rankByCapability(
          [
            candidate("keen", { visits: 0, interest: strength }),
            candidate("able", { visits: 1000, credential: null, interest: 1 }),
          ],
          floor,
          TODAY,
        );
        const keen = ranked.find((c) => c.clinicianId === "keen")!;
        const able = ranked.find((c) => c.clinicianId === "able")!;
        if (able.clearsFloor && !keen.clearsFloor) {
          expect(ranked.indexOf(able)).toBeLessThan(ranked.indexOf(keen));
        }
      }
    }
  });

  it("ranking is total and reproducible", () => {
    const floor = FLOORS[3]!;
    const once = rankByCapability(everyCandidate(), floor, TODAY).map((c) => c.clinicianId);
    const again = rankByCapability([...everyCandidate()].reverse(), floor, TODAY).map((c) => c.clinicianId);

    expect(again).toEqual(once);
  });

  it("below-floor candidates are returned, not dropped", () => {
    // W86 has to explain why someone was not chosen, and a missing candidate cannot be
    // explained. Routing filters separately.
    const floor: CompetenceFloor = { minAttendedVisits: 1000, requireVerifiedCredential: true };
    const all = everyCandidate();
    const ranked = rankByCapability(all, floor, TODAY);

    expect(ranked).toHaveLength(all.length);
    expect(eligibleForRouting(ranked)).toHaveLength(0);
    for (const c of ranked) expect(c.failures.length).toBeGreaterThan(0);
  });
});

describe("W91 tenancy: a foreign record is not evidence about this panel", () => {
  const OTHER = "prac-2" as PracticeId;

  function foreign(id: string, visits: number): Candidate {
    return {
      clinicianId: id as ClinicianId,
      experience: { ...experience(visits), practiceId: OTHER },
      competence: { ...competence(null), practiceId: OTHER },
      interest: { ...interest(5), practiceId: OTHER },
    };
  }

  it("another practice's attended visits do not clear this practice's floor", () => {
    // Found in W91's sweep: Candidate carries records that each name a practice, and
    // nothing checked them, so 500 foreign visits cleared a local floor.
    const floor: CompetenceFloor = { minAttendedVisits: 10, requireVerifiedCredential: false };
    const candidate = foreign("outsider", 500);

    expect(clearsFloor(candidate, floor, TODAY, PRACTICE).clears).toBe(false);
    expect(clearsFloor(candidate, floor, TODAY, PRACTICE).failures).toContain("insufficient_experience");
    // Unscoped call keeps the old permissive behaviour for single-tenant data.
    expect(clearsFloor(candidate, floor, TODAY).clears).toBe(true);
  });

  it("another practice's credential does not satisfy a credential requirement", () => {
    const floor: CompetenceFloor = { minAttendedVisits: 0, requireVerifiedCredential: true };
    expect(clearsFloor(foreign("outsider", 0), floor, TODAY, PRACTICE).failures).toContain(
      "no_verified_credential",
    );
  });

  it("another practice's stated interest does not order this practice's ranking", () => {
    const floor: CompetenceFloor = { minAttendedVisits: 0, requireVerifiedCredential: false };
    const ranked = rankByCapability([foreign("outsider", 0)], floor, TODAY, PRACTICE);

    expect(ranked[0]!.interestStrength).toBeNull();
    expect(ranked[0]!.attendedVisits).toBe(0);
  });
});
