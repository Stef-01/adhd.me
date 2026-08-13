// W123 verify gate: "in-panel only; a foreign practice's capability record is absent
// (W91/W103)."
//
// "Absent" rather than "filtered" is the whole assertion, and the way to test it honestly is
// to give two practices the SAME clinician id with different capability rows. If a foreign row
// were merely filtered late, a clinician who clears the floor at practice B would leak into
// practice A's answer — so the test seeds exactly that and asserts each practice sees only its
// own rows.

import { beforeEach, describe, expect, it } from "vitest";
import type { ClinicianId, ConditionCode, PracticeId } from "@/domain/types";
import { getCapability, putCompetence, putExperience, resetCapability, stateInterest } from "@/capability/graph";
import { DEFAULT_FLOOR } from "@/capability/threshold";
import {
  cliniciansForPathway,
  describeOutcome,
  SHIPPED_BINDINGS,
  type PathwayBinding,
} from "./binding";
import { usablePathway, type PathwayAttestation, type UsablePathway } from "./approval";
import { versionHash, type PathwayCriteria, type PathwayVersion } from "./versioning";

const A = "prac-a" as PracticeId;
const B = "prac-b" as PracticeId;
const COND = "placeholder_register_a" as ConditionCode;
const TODAY = "2026-08-10";

const CRITERIA: PathwayCriteria = {
  inclusion: [{ factCode: "fact_in", requires: "present", rationale: "Placeholder rationale." }],
  exclusion: [],
  escalation: [],
};

function signedPathway(): UsablePathway {
  const version: PathwayVersion = {
    pathwayId: "path-1",
    versionHash: versionHash(CRITERIA),
    ordinal: 1,
    criteria: CRITERIA,
    state: "published",
    draftedAt: "2026-01-01",
    draftedBy: "author@x.example",
    publishedAt: "2026-01-02",
    publishedBy: "author@x.example",
    supersededAt: null,
    withdrawnAt: null,
    withdrawnBy: null,
    withdrawnReason: null,
    publications: [],
  };
  const attestations: PathwayAttestation[] = [
    {
      pathwayId: "path-1", versionHash: version.versionHash, kind: "specialist_review",
      byEmail: "reviewer@x.example", at: "2026-01-03",
      finding: "Placeholder review finding — fixture only.", revokedAt: null,
    },
    {
      pathwayId: "path-1", versionHash: version.versionHash, kind: "founder_sign_off",
      byEmail: "founder@x.example", at: "2026-01-04",
      finding: "Placeholder sign-off finding — fixture only.", revokedAt: null,
    },
  ];
  const result = usablePathway(version, attestations);
  if (!result.usable) throw new Error(`fixture is not usable: ${result.reason}`);
  return result.pathway;
}

const binding = (over: Partial<PathwayBinding> = {}): PathwayBinding => ({
  pathwayId: "path-1",
  versionHash: versionHash(CRITERIA),
  conditionCode: COND,
  floor: { minAttendedVisits: 5, requireVerifiedCredential: false },
  rationale: "Placeholder rationale — fixture only, not clinical content.",
  ...over,
});

/**
 * Append one experience row.
 *
 * `putExperience` REPLACES the whole array — it is a bulk put, not an insert — so this reads
 * the current rows and writes them back with one more. Calling it per clinician without this
 * silently keeps only the last seed, which is how the first draft of these tests passed the
 * isolation case for entirely the wrong reason.
 */
function seedExperience(practiceId: PracticeId, clinicianId: string, attendedVisits: number): void {
  putExperience([
    ...getCapability().experience,
    {
      practiceId,
      clinicianId: clinicianId as ClinicianId,
      conditionCode: COND,
      attendedVisits,
      windowFrom: "2026-01-01",
      windowTo: "2026-06-30",
      source: "derived_case_mix",
      computedAt: "2026-07-01T00:00:00Z",
    },
  ]);
}

beforeEach(resetCapability);

describe("W123 no binding means nobody, not everyone", () => {
  it("returns no_binding rather than an empty list", () => {
    // Three different claims, and only one is true: "nobody has said who may deliver this".
    // An empty list would read as a statement about the clinicians instead.
    seedExperience(A, "clin-1", 50);
    const outcome = cliniciansForPathway(signedPathway(), A, TODAY);
    expect(outcome.kind).toBe("no_binding");
    expect(describeOutcome(outcome)).toContain("different from nobody qualifying");
  });

  it("ships zero bindings, so the default answer is nobody", () => {
    // Shipping empty is only safe BECAUSE absence fails closed — it makes pathways
    // undeliverable rather than universally deliverable.
    expect(SHIPPED_BINDINGS).toEqual([]);
    seedExperience(A, "clin-1", 50);
    expect(cliniciansForPathway(signedPathway(), A, TODAY).kind).toBe("no_binding");
  });

  it("distinguishes a stale binding from no binding at all", () => {
    seedExperience(A, "clin-1", 50);
    const outcome = cliniciansForPathway(signedPathway(), A, TODAY, [
      binding({ versionHash: "written-against-something-else" }),
    ]);
    expect(outcome.kind).toBe("binding_for_another_version");
    expect(describeOutcome(outcome)).toContain("re-reviewing");
  });

  it("an empty eligible list is a DIFFERENT answer from no binding", () => {
    seedExperience(A, "clin-1", 1); // below the floor
    const outcome = cliniciansForPathway(signedPathway(), A, TODAY, [binding()]);
    expect(outcome.kind).toBe("resolved");
    expect(outcome.kind === "resolved" && outcome.eligible).toEqual([]);
    expect(describeOutcome(outcome)).toContain("No clinician on this practice's panel");
  });
});

describe("W123 in-panel only — a foreign practice's record is absent", () => {
  it("does not see another practice's rows for the same clinician id", () => {
    // The honest form of the test: the SAME clinician id exists at both practices with
    // different capability. A late filter would leak B's qualifying row into A's answer.
    seedExperience(A, "clin-shared", 1); // below A's floor
    seedExperience(B, "clin-shared", 99); // well above it, at another practice
    const outcome = cliniciansForPathway(signedPathway(), A, TODAY, [binding()]);
    expect(outcome.kind === "resolved" && outcome.eligible).toEqual([]);
    expect(outcome.kind === "resolved" && outcome.excluded.map((e) => e.clinicianId)).toEqual([
      "clin-shared",
    ]);
  });

  it("each practice gets its own answer from the same store", () => {
    seedExperience(A, "clin-shared", 1);
    seedExperience(B, "clin-shared", 99);
    const atA = cliniciansForPathway(signedPathway(), A, TODAY, [binding()]);
    const atB = cliniciansForPathway(signedPathway(), B, TODAY, [binding()]);
    expect(atA.kind === "resolved" && atA.eligible).toEqual([]);
    expect(atB.kind === "resolved" && atB.eligible).toEqual(["clin-shared"]);
  });

  it("a clinician known only at another practice is not even considered", () => {
    // Absent, not excluded: they must not appear in EITHER list, because appearing as
    // "excluded" would still disclose that a clinician by that id exists elsewhere.
    seedExperience(B, "clin-elsewhere", 99);
    seedExperience(A, "clin-here", 50);
    const outcome = cliniciansForPathway(signedPathway(), A, TODAY, [binding()]);
    expect(outcome.kind).toBe("resolved");
    if (outcome.kind !== "resolved") throw new Error("unreachable");
    const mentioned = [...outcome.eligible, ...outcome.excluded.map((e) => e.clinicianId)];
    expect(mentioned).toEqual(["clin-here"]);
    expect(JSON.stringify(outcome)).not.toContain("clin-elsewhere");
  });

  it("ignores rows for another condition, so a binding cannot borrow unrelated experience", () => {
    putExperience([
      {
        practiceId: A, clinicianId: "clin-1" as ClinicianId,
        conditionCode: "placeholder_register_b" as ConditionCode,
        attendedVisits: 99, windowFrom: "2026-01-01", windowTo: "2026-06-30",
        source: "derived_case_mix", computedAt: "2026-07-01T00:00:00Z",
      },
    ]);
    const outcome = cliniciansForPathway(signedPathway(), A, TODAY, [binding()]);
    expect(outcome.kind === "resolved" && outcome.eligible).toEqual([]);
  });
});

describe("W123 the floor decides, and says why", () => {
  it("admits a clinician who clears it", () => {
    seedExperience(A, "clin-1", 50);
    const outcome = cliniciansForPathway(signedPathway(), A, TODAY, [binding()]);
    expect(outcome.kind === "resolved" && outcome.eligible).toEqual(["clin-1"]);
  });

  it("reports every reason a clinician fell short, not the first", () => {
    seedExperience(A, "clin-1", 1);
    const outcome = cliniciansForPathway(signedPathway(), A, TODAY, [
      binding({ floor: { minAttendedVisits: 5, requireVerifiedCredential: true } }),
    ]);
    expect(outcome.kind === "resolved" && outcome.excluded[0]?.failures.sort()).toEqual([
      "insufficient_experience",
      "no_verified_credential",
    ]);
  });

  it("treats an expired credential as failing, not as weak evidence", () => {
    // W112's rule, arriving through W82's floor: expired is absent, never softer.
    seedExperience(A, "clin-1", 50);
    putCompetence([
      {
        practiceId: A, clinicianId: "clin-1" as ClinicianId, conditionCode: COND,
        credential: "Placeholder credential", attestedBy: "External Body",
        verifiedOn: "2024-01-01", expiresOn: "2025-01-01", source: "external_verification",
      },
    ]);
    const outcome = cliniciansForPathway(signedPathway(), A, TODAY, [
      binding({ floor: { minAttendedVisits: 5, requireVerifiedCredential: true } }),
    ]);
    expect(outcome.kind === "resolved" && outcome.excluded[0]?.failures).toEqual([
      "credential_expired",
    ]);
  });

  it("interest alone never clears the floor", () => {
    // W79's distinction: what a clinician SAYS is not what someone verified. Stated interest
    // puts them on the panel; it must not put them through the gate.
    stateInterest({
      practiceId: A, clinicianId: "clin-1" as ClinicianId, conditionCode: COND,
      strength: 5, source: "clinician_self_reported", statedAt: "2026-06-01",
    });
    const outcome = cliniciansForPathway(signedPathway(), A, TODAY, [binding()]);
    expect(outcome.kind === "resolved" && outcome.eligible).toEqual([]);
    expect(outcome.kind === "resolved" && outcome.excluded.map((e) => e.clinicianId)).toEqual([
      "clin-1",
    ]);
  });
});

describe("W123 the result is a set, not a ranking", () => {
  it("returns clinicians in id order, and says so", () => {
    // W82 owns ordering by capability and is deliberately not used: an ordered list of
    // clinicians for a clinical pathway is a recommendation about who is better.
    seedExperience(A, "clin-3", 50);
    seedExperience(A, "clin-1", 99);
    seedExperience(A, "clin-2", 60);
    const outcome = cliniciansForPathway(signedPathway(), A, TODAY, [binding()]);
    expect(outcome.kind === "resolved" && outcome.eligible).toEqual(["clin-1", "clin-2", "clin-3"]);
    expect(describeOutcome(outcome)).toContain("not a ranking");
  });

  it("carries no score, rank or ordering field", () => {
    seedExperience(A, "clin-1", 50);
    const outcome = cliniciansForPathway(signedPathway(), A, TODAY, [binding()]);
    for (const key of Object.keys(outcome)) {
      expect(key).not.toMatch(/rank|score|best|order|top/i);
    }
  });

  it("a permissive floor is still a decision somebody made", () => {
    // DEFAULT_FLOOR admits everyone on the panel. That is fine — what matters is that a
    // binding EXISTS saying so, rather than the absence of one being read as permission.
    seedExperience(A, "clin-1", 0);
    const outcome = cliniciansForPathway(signedPathway(), A, TODAY, [
      binding({ floor: DEFAULT_FLOOR }),
    ]);
    expect(outcome.kind === "resolved" && outcome.eligible).toEqual(["clin-1"]);
  });
});
