// W83 verify gate: e2e + isolation. This file is the isolation half — the console e2e is in
// e2e/capability.spec.ts.
//
// Two properties carry the unit: one practice cannot see another's capability graph, and the
// panel view is genuinely coarser than the self view rather than the same query rendered
// twice. The second is easy to lose in a refactor, so it is asserted structurally.

import { beforeEach, describe, expect, it } from "vitest";
import type {
  ClinicianCompetence,
  ClinicianExperience,
  ClinicianId,
  ClinicianInterest,
  ConditionCode,
  PracticeId,
} from "@/domain/types";
import {
  getCapability,
  ownProfile,
  panelView,
  putCompetence,
  putExperience,
  resetCapability,
  stateInterest,
} from "./graph";

const A = "prac-a" as PracticeId;
const B = "prac-b" as PracticeId;
const GP1 = "clin-1" as ClinicianId;
const GP2 = "clin-2" as ClinicianId;
const COND = "placeholder_register_a" as ConditionCode;
const TODAY = "2026-08-10";

const interest = (practiceId: PracticeId, clinicianId: ClinicianId, statedAt = "2026-06-01"): ClinicianInterest => ({
  practiceId, clinicianId, conditionCode: COND, strength: 4, source: "clinician_self_reported", statedAt,
});
const experience = (practiceId: PracticeId, clinicianId: ClinicianId, attendedVisits = 12): ClinicianExperience => ({
  practiceId, clinicianId, conditionCode: COND, attendedVisits,
  windowFrom: "2026-01-01", windowTo: "2026-06-30", source: "derived_case_mix", computedAt: "2026-07-01T00:00:00Z",
});
const competence = (practiceId: PracticeId, clinicianId: ClinicianId): ClinicianCompetence => ({
  practiceId, clinicianId, conditionCode: COND, credential: "Placeholder credential",
  attestedBy: "External Body", verifiedOn: "2026-01-01", expiresOn: "2027-01-01", source: "external_verification",
});

beforeEach(() => {
  resetCapability();
  stateInterest(interest(A, GP1));
  stateInterest(interest(B, GP2));
  putExperience([experience(A, GP1), experience(B, GP2, 99)]);
  putCompetence([competence(A, GP1), competence(B, GP2)]);
});

describe("W83 practice isolation", () => {
  it("a practice's panel view contains only its own clinicians", () => {
    expect(panelView(A, TODAY).map((c) => c.clinicianId)).toEqual([GP1]);
    expect(panelView(B, TODAY).map((c) => c.clinicianId)).toEqual([GP2]);
  });

  it("own-profile is scoped by practice AND clinician", () => {
    // Passing another practice's clinician id returns nothing rather than their row.
    expect(ownProfile(A, GP2, TODAY)).toEqual([]);
    expect(ownProfile(B, GP1, TODAY)).toEqual([]);
    expect(ownProfile(A, GP1, TODAY)).toHaveLength(1);
  });

  it("no accessor can reach another practice's numbers", () => {
    // GP2's 99 visits belong to practice B and must not appear anywhere in A's views.
    const serialised = JSON.stringify([panelView(A, TODAY), ownProfile(A, GP1, TODAY)]);
    expect(serialised).not.toContain("99");
    expect(serialised).not.toContain(B);
  });
});

describe("W83 the two views answer different questions", () => {
  it("own profile shows what was DERIVED, not only what was typed", () => {
    // A capability graph a clinician cannot inspect is one they cannot correct.
    const [row] = ownProfile(A, GP1, TODAY);
    expect(row?.experience?.attendedVisits).toBe(12);
    expect(row?.experience?.windowFrom).toBe("2026-01-01");
    expect(row?.interest?.strength).toBe(4);
    expect(row?.competence?.attestedBy).toBe("External Body");
  });

  it("the panel view carries NO raw counts — structurally, not by omission in a template", () => {
    // Surfacing tallies to a manager turns a capability graph into a productivity board,
    // which is not what a clinician agreed to when they stated an interest.
    const cells = panelView(A, TODAY);
    const serialised = JSON.stringify(cells);
    expect(serialised).not.toContain("12"); // the visit count
    expect(serialised).not.toContain("attendedVisits");
    expect(serialised).not.toContain("strength");
    expect(serialised).not.toContain("credential");
    // What it DOES carry: presence and freshness per field.
    expect(cells[0]).toMatchObject({ clinicianId: GP1, conditionCode: COND, interest: "current", experience: "current", competence: "current" });
  });

  it("reports 'absent' for a field the clinician has no record in", () => {
    resetCapability();
    stateInterest(interest(A, GP1));
    expect(panelView(A, TODAY)[0]).toMatchObject({ interest: "current", experience: "absent", competence: "absent" });
  });

  it("carries staleness through to the panel", () => {
    resetCapability();
    stateInterest(interest(A, GP1, "2024-01-01")); // long past the 12-month policy
    expect(panelView(A, TODAY)[0]?.interest).toBe("stale");
  });
});

describe("W83 stating an interest", () => {
  it("replaces the previous statement rather than accumulating", () => {
    stateInterest({ ...interest(A, GP1, "2026-08-01"), strength: 2 });
    const mine = getCapability().interests.filter((i) => i.practiceId === A && i.clinicianId === GP1);
    expect(mine).toHaveLength(1);
    expect(mine[0]?.strength).toBe(2);
  });

  it("does not disturb another practice's statement for the same clinician id", () => {
    stateInterest({ ...interest(A, GP1), strength: 1 });
    expect(getCapability().interests.find((i) => i.practiceId === B)?.strength).toBe(4);
  });
});
