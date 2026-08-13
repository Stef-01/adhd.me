// W92 verify gate: fixtures for referral capture.

import { describe, expect, it } from "vitest";
import type { PatientId, PracticeId } from "@/domain/types";
import {
  OUTSTANDING_BASIS_COPY,
  type Referral,
  captureOutstanding,
  outstandingBySpecialty,
} from "./capture";

const PRACTICE = "prac-1" as PracticeId;
const WINDOW = { fromIso: "2026-01-01", toIso: "2026-06-30" };
const OBSERVED = "2026-08-10";

function referral(over: Partial<Referral> & { referralId: string }): Referral {
  return {
    practiceId: PRACTICE,
    patientId: "p1" as PatientId,
    specialtyCode: "spec_a",
    writtenOn: "2026-03-01",
    state: "written",
    stateAtIso: "2026-03-01T00:00:00Z",
    ...over,
  };
}

describe("W92 capturing what fell through", () => {
  it("captures a referral written with nothing recorded since", () => {
    const result = captureOutstanding([referral({ referralId: "r1" })], PRACTICE, WINDOW, OBSERVED);

    expect(result.outstanding).toHaveLength(1);
    expect(result.outstanding[0]!.basis).toBe("no_appointment_recorded");
    expect(result.outstanding[0]!.ageDays).toBe(162);
  });

  it("captures a referral with an appointment but no completion", () => {
    const result = captureOutstanding(
      [referral({ referralId: "r1", state: "appointment_recorded" })],
      PRACTICE, WINDOW, OBSERVED,
    );

    expect(result.outstanding[0]!.basis).toBe("appointment_but_no_completion");
  });

  it.each([
    ["completed", "completed"],
    ["cancelled", "cancelled"],
  ] as const)("excludes a %s referral, with the reason recorded", (state, reason) => {
    const result = captureOutstanding(
      [referral({ referralId: "r1", state })],
      PRACTICE, WINDOW, OBSERVED,
    );

    expect(result.outstanding).toEqual([]);
    expect(result.excluded).toEqual([{ referralId: "r1", reason }]);
  });

  it("ignores another practice's referrals and says so", () => {
    const result = captureOutstanding(
      [referral({ referralId: "r1", practiceId: "prac-2" as PracticeId })],
      PRACTICE, WINDOW, OBSERVED,
    );

    expect(result.outstanding).toEqual([]);
    expect(result.excluded[0]!.reason).toBe("other_practice");
  });

  it("ignores referrals written outside the window", () => {
    const result = captureOutstanding(
      [referral({ referralId: "r1", writtenOn: "2025-06-01" })],
      PRACTICE, WINDOW, OBSERVED,
    );
    expect(result.excluded[0]!.reason).toBe("outside_window");
  });

  it("does not treat a very recent referral as fallen through", () => {
    // A referral written yesterday is not evidence of anything.
    const result = captureOutstanding(
      [referral({ referralId: "r1", writtenOn: "2026-06-30" })],
      PRACTICE, WINDOW, "2026-07-05",
    );
    expect(result.outstanding).toEqual([]);
  });

  it("lets the caller set what counts as long enough", () => {
    const recent = [referral({ referralId: "r1", writtenOn: "2026-06-30" })];
    expect(captureOutstanding(recent, PRACTICE, WINDOW, "2026-07-05", 3).outstanding).toHaveLength(1);
  });

  it("treats an unparseable or future write date as a data error, not a gap", () => {
    for (const writtenOn of ["not-a-date", "2027-01-01"]) {
      const result = captureOutstanding(
        [referral({ referralId: "r1", writtenOn })],
        PRACTICE, { fromIso: "2000-01-01", toIso: "2030-01-01" }, OBSERVED,
      );
      expect(result.outstanding, writtenOn).toEqual([]);
    }
  });

  it("orders oldest first, stably", () => {
    const result = captureOutstanding(
      [
        referral({ referralId: "newer", writtenOn: "2026-05-01" }),
        referral({ referralId: "older", writtenOn: "2026-01-05" }),
      ],
      PRACTICE, WINDOW, OBSERVED,
    );

    expect(result.outstanding.map((o) => o.referral.referralId)).toEqual(["older", "newer"]);
  });

  it("counts by specialty for the practice summary", () => {
    const result = captureOutstanding(
      [
        referral({ referralId: "r1", specialtyCode: "spec_a" }),
        referral({ referralId: "r2", specialtyCode: "spec_a" }),
        referral({ referralId: "r3", specialtyCode: "spec_b" }),
      ],
      PRACTICE, WINDOW, OBSERVED,
    );

    expect(outstandingBySpecialty(result)).toEqual([
      { specialtyCode: "spec_a", count: 2 },
      { specialtyCode: "spec_b", count: 1 },
    ]);
  });
});

describe("W92 what the data cannot say", () => {
  it("never claims the patient did not attend", () => {
    // A specialist letter that never came back looks identical to an appointment never
    // made. The copy must not collapse the two.
    for (const copy of Object.values(OUTSTANDING_BASIS_COPY)) {
      const lower = copy.toLowerCase();
      expect(lower).toMatch(/no record|nothing has come back|has no record|not recorded/);
      for (const banned of ["did not attend", "failed to", "ignored", "non-compliant", "refused"]) {
        expect(lower, `must not claim: ${banned}`).not.toContain(banned);
      }
    }
  });

  it("makes no clinical reading of a referral", () => {
    // Specialty is an opaque code; nothing ranks by urgency or infers a condition.
    for (const copy of Object.values(OUTSTANDING_BASIS_COPY)) {
      for (const banned of ["urgent", "risk", "diagnos", "severity", "condition"]) {
        expect(copy.toLowerCase(), `must make no clinical reading: ${banned}`).not.toContain(banned);
      }
    }
  });

  it("nothing is dropped without a recorded reason", () => {
    const all = [
      referral({ referralId: "keep" }),
      referral({ referralId: "done", state: "completed" }),
      referral({ referralId: "gone", practiceId: "prac-2" as PracticeId }),
      referral({ referralId: "old", writtenOn: "2020-01-01" }),
    ];
    const result = captureOutstanding(all, PRACTICE, WINDOW, OBSERVED);

    expect(result.outstanding.length + result.excluded.length).toBe(all.length);
  });
});
