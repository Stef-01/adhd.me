// W88 verify gate: stale profiles are flagged.
//
// The tests are organised around the claim the unit actually makes — that the three fields go
// stale in DIFFERENT ways — because a suite that checked one threshold three times would pass
// while the distinction quietly collapsed.

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
  competenceFreshness,
  DEFAULT_STALENESS,
  experienceFreshness,
  flagStaleProfiles,
  interestFreshness,
  usableCompetence,
} from "./provenance";

const PRACTICE = "prac-1" as PracticeId;
const GP = "clin-1" as ClinicianId;
const COND = "placeholder_register_a" as ConditionCode;
const TODAY = "2026-08-10";

const interest = (statedAt: string): ClinicianInterest => ({
  practiceId: PRACTICE, clinicianId: GP, conditionCode: COND, strength: 4,
  source: "clinician_self_reported", statedAt,
});

const experience = (windowTo: string, computedAt = "2026-08-01T00:00:00Z"): ClinicianExperience => ({
  practiceId: PRACTICE, clinicianId: GP, conditionCode: COND, attendedVisits: 12,
  windowFrom: "2024-01-01", windowTo, source: "derived_case_mix", computedAt,
});

const competence = (over: Partial<ClinicianCompetence> = {}): ClinicianCompetence => ({
  practiceId: PRACTICE, clinicianId: GP, conditionCode: COND,
  credential: "Placeholder credential", attestedBy: "External Body",
  verifiedOn: "2026-01-01", expiresOn: null, source: "external_verification", ...over,
});

describe("W88 interest decays because people change their minds", () => {
  it("recent interest is current", () => {
    expect(interestFreshness(interest("2026-06-01"), TODAY).freshness).toBe("current");
  });

  it("interest past the policy window is stale but STILL USABLE", () => {
    // Dropping it would silently reshape a panel view the practice never asked to change.
    const v = interestFreshness(interest("2025-01-01"), TODAY);
    expect(v.freshness).toBe("stale");
    expect(v.usable).toBe(true);
    expect(v.reason).toMatch(/still holds/);
  });

  it("interest stated in the future is refused rather than believed", () => {
    expect(interestFreshness(interest("2027-01-01"), TODAY).usable).toBe(false);
  });
});

describe("W88 experience expires against its WINDOW, not its computation date", () => {
  it("is measured from windowTo", () => {
    // Recomputing an old window today does not make it describe today.
    const recomputedYesterday = experience("2023-01-01", "2026-08-09T00:00:00Z");
    const v = experienceFreshness(recomputedYesterday, TODAY);
    expect(v.freshness).toBe("stale");
    expect(v.reason).toMatch(/2023-01-01/);
    expect(v.reason).toMatch(/describes that period, not now/);
  });

  it("a recent window is current even if computed a while ago", () => {
    expect(experienceFreshness(experience("2026-06-30", "2026-07-01T00:00:00Z"), TODAY).freshness).toBe("current");
  });

  it("an open window that has not closed yet is current", () => {
    expect(experienceFreshness(experience("2026-12-31"), TODAY).freshness).toBe("current");
  });

  it("stale experience stays usable — it is a true statement about its period", () => {
    expect(experienceFreshness(experience("2023-01-01"), TODAY).usable).toBe(true);
  });
});

describe("W88 competence goes VOID, not stale, when it expires", () => {
  it("an expired credential is no evidence at all", () => {
    const v = competenceFreshness(competence({ expiresOn: "2026-01-31" }), TODAY);
    expect(v.freshness).toBe("void");
    expect(v.usable).toBe(false);
    expect(v.reason).toMatch(/Expired on 2026-01-31/);
  });

  it("an unexpired credential is current and names its verifier", () => {
    const v = competenceFreshness(competence({ expiresOn: "2027-01-01" }), TODAY);
    expect(v.freshness).toBe("current");
    expect(v.reason).toMatch(/External Body/);
  });

  it("no stated expiry does NOT mean never expires", () => {
    // W79 says so explicitly; this is the unit where that decision gets its cost.
    const old = competence({ verifiedOn: "2020-01-01", expiresOn: null });
    const v = competenceFreshness(old, TODAY);
    expect(v.freshness).toBe("stale");
    expect(v.reason).toMatch(/due for re-attestation/);
    // Still usable: unverified-recently is not the same as disproven.
    expect(v.usable).toBe(true);
  });

  it("a recent unexpiring credential is current", () => {
    expect(competenceFreshness(competence({ verifiedOn: "2026-01-01" }), TODAY).freshness).toBe("current");
  });

  it("usableCompetence drops the void and keeps the merely stale", () => {
    const records = [
      competence({ conditionCode: "a" as ConditionCode, expiresOn: "2026-01-01" }), // void
      competence({ conditionCode: "b" as ConditionCode, verifiedOn: "2020-01-01" }), // stale
      competence({ conditionCode: "c" as ConditionCode, expiresOn: "2027-01-01" }), // current
    ];
    expect(usableCompetence(records, TODAY).map((r) => r.conditionCode)).toEqual(["b", "c"]);
  });
});

describe("W88 unreadable dates fail closed", () => {
  it.each([
    ["interest", () => interestFreshness(interest("not a date"), TODAY)],
    ["competence", () => competenceFreshness(competence({ verifiedOn: "whenever" }), TODAY)],
  ])("%s with an unreadable date is void and unusable", (_label, run) => {
    const v = run();
    expect(v.freshness).toBe("void");
    expect(v.usable).toBe(false);
  });
});

describe("W88 flagging", () => {
  it("flags every non-current record with its field and reason", () => {
    const flagged = flagStaleProfiles(
      {
        interests: [interest("2025-01-01")],
        experience: [experience("2023-01-01")],
        competence: [competence({ expiresOn: "2026-01-01" })],
      },
      TODAY,
    );
    expect(flagged).toHaveLength(3);
    expect(flagged.map((f) => f.field).sort()).toEqual(["competence", "experience", "interest"]);
    expect(flagged.every((f) => f.verdict.reason.length > 0)).toBe(true);
  });

  it("puts void records first — those change what the system may do", () => {
    const flagged = flagStaleProfiles(
      {
        interests: [interest("2025-01-01")],
        experience: [],
        competence: [competence({ expiresOn: "2026-01-01" })],
      },
      TODAY,
    );
    expect(flagged[0]?.verdict.freshness).toBe("void");
  });

  it("flags nothing when everything is current", () => {
    expect(
      flagStaleProfiles(
        {
          interests: [interest("2026-06-01")],
          experience: [experience("2026-06-30")],
          competence: [competence({ expiresOn: "2027-01-01" })],
        },
        TODAY,
      ),
    ).toEqual([]);
  });

  it("the thresholds are a visible policy, not a hidden constant", () => {
    // A threshold nobody can see is a threshold nobody can disagree with (W64's posture).
    expect(DEFAULT_STALENESS).toEqual({ interestMonths: 12, experienceMonths: 18, competenceMonths: 36 });
    const strict = { interestMonths: 1, experienceMonths: 1, competenceMonths: 1 };
    expect(interestFreshness(interest("2026-06-01"), TODAY, strict).freshness).toBe("stale");
  });
});
