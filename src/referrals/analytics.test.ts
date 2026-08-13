// W141 verify gate: "golden report; no patient ranking; coverage stated (W96 shape)."
//
// The golden covers the whole rendered document including the caveats, so the wording cannot
// drift without a deliberate edit. The two absences are tested as properties of the SHAPE, not
// of the words: a report type with no field that could hold a patient or a per-practice score
// cannot grow one without failing here.

import { describe, expect, it } from "vitest";
import type { PatientId, PracticeId } from "@/domain/types";
import type { AcceptanceAct } from "./acceptance";
import { buildReferralAnalytics, renderReferralAnalytics } from "./analytics";
import { buildReferral, type ReferralDocument } from "./document";
import type { ReferralEvent } from "./leakage";

const A = "prac-a" as PracticeId;
const OTHER = "prac-other" as PracticeId;

function doc(id: string, from: string, to: string, patient: string): ReferralDocument {
  const result = buildReferral(
    {
      referralId: id, fromPracticeId: from, toPracticeId: to, patientId: patient,
      createdAt: "2026-02-01", createdBy: "clin-a", reason: "capacity", request: "advice_only",
      conditionCode: null, recordedFactCodes: [], narrative: null,
    },
    "2026-08-11",
  );
  if (!result.ok) throw new Error(result.errors.join(", "));
  return result.document;
}

const ev = (referralId: string, patientId: string, kind: ReferralEvent["kind"], at: string): ReferralEvent => ({
  practiceId: A, patientId: patientId as PatientId, referralId, kind, at,
});

const DOCUMENTS = [
  doc("ref-1", "prac-a", "prac-other", "pat-1"),
  doc("ref-2", "prac-a", "prac-other", "pat-2"),
  doc("ref-3", "prac-a", "prac-other", "pat-3"),
  // Sent TO this practice — the other practice's process to report on, not this one's.
  doc("ref-in", "prac-other", "prac-a", "pat-4"),
];

const EVENTS = [
  ev("ref-1", "pat-1", "referral_written", "2026-02-01"),
  ev("ref-2", "pat-2", "referral_written", "2026-02-01"),
  ev("ref-2", "pat-2", "appointment_recorded", "2026-02-10"),
  ev("ref-2", "pat-2", "completion_recorded", "2026-02-20"),
];

const ACTS: AcceptanceAct[] = [
  { kind: "sent", referralId: "ref-1", at: "2026-02-01", by: "clin-a", fromPracticeId: A, toPracticeId: OTHER, patientId: "pat-1" as PatientId },
  { kind: "sent", referralId: "ref-2", at: "2026-02-01", by: "clin-a", fromPracticeId: A, toPracticeId: OTHER, patientId: "pat-2" as PatientId },
  { kind: "accepted", referralId: "ref-2", at: "2026-02-03", by: "clin-o", byPracticeId: OTHER },
];

const report = () => buildReferralAnalytics(A, "2026-08-11", DOCUMENTS, EVENTS, ACTS);

const GOLDEN = `# Referral process — prac-a

As at 2026-08-11. 3 referral(s) sent by this practice.

## Where referrals stop

| Stage | Referrals | Share |
|---|---|---|
| Finished | 1 | 33% |
| No referral recorded | 1 | 33% |
| Written, nothing booked | 1 | 33% |

## Whether the other practice answered

| Answer | Referrals | Share |
|---|---|---|
| Accepted | 1 | 33% |
| Waiting for an answer | 1 | 33% |
| Nothing recorded | 1 | 33% |

## What this report does not say

- This report is about the practice's referral PROCESS. It does not rank or list patients, and no patient appears in it.
- No clinician or receiving practice is scored. 'Which practice answers fastest' reads as neutral and works as a league table, and the first time it is quoted at somebody it becomes a reason to accept a referral they should have declined.
- Only referrals this practice SENT are counted. A referral sent here is the other practice's process to report on, not this one's.
- 1 of 3 referrals have NO acceptance record at all. They are not 'unanswered' — nobody wrote anything down, which is a different problem and a different fix.
- 1 of 3 referrals have no chain events recorded, so their stage is unknown rather than 'not written'.
`;

describe("W141 golden report", () => {
  it("renders the golden exactly", () => {
    expect(renderReferralAnalytics(report())).toBe(GOLDEN);
  });

  it("counts only what this practice sent", () => {
    // A referral sent HERE is the other practice's process. Counting it would flatter or
    // damn this practice for somebody else's follow-through.
    expect(report().sentCount).toBe(3);
  });

  it("orders tallies by count then by state key, never by insertion", () => {
    // Count first, so the biggest stall is at the top and the order IS meaningful. Ties break
    // on the state key rather than the label — arbitrary, but fixed, which is what a golden
    // needs. The golden was first written from the labels and had to be corrected to match.
    const built = report();
    for (const rows of [built.byStage.map((r) => r.count), built.byAcceptance.map((r) => r.count)]) {
      expect([...rows].sort((a, b) => b - a)).toEqual(rows);
    }
  });

  it("is stable under input order", () => {
    const shuffled = buildReferralAnalytics(
      A, "2026-08-11", [...DOCUMENTS].reverse(), [...EVENTS].reverse(), [...ACTS].reverse(),
    );
    expect(renderReferralAnalytics(shuffled)).toBe(GOLDEN);
  });

  it("handles a practice with no referrals without dividing by zero", () => {
    const empty = buildReferralAnalytics(A, "2026-08-11", [], [], []);
    expect(empty.sentCount).toBe(0);
    expect(renderReferralAnalytics(empty)).toContain("0 referral(s) sent");
  });
});

describe("W141 no patient appears, at all", () => {
  it("carries no patient id anywhere in the report", () => {
    // W96's rule carried through: a patient is a unit of arithmetic here and never a subject.
    const serialised = JSON.stringify(report());
    for (const patient of ["pat-1", "pat-2", "pat-3", "pat-4"]) {
      expect(serialised, `report carries ${patient}`).not.toContain(patient);
    }
    expect(renderReferralAnalytics(report())).not.toContain("pat-");
  });

  it("has no field that could hold a patient list", () => {
    const built = report();
    expect(Object.keys(built)).toEqual([
      "practiceId",
      "asOf",
      "sentCount",
      "byStage",
      "byAcceptance",
      "coverage",
      "caveats",
    ]);
    for (const key of Object.keys(built)) {
      expect(key).not.toMatch(/patient|person|individual|worst|slowest|ranking/i);
    }
  });

  it("carries no referral id either — a row identifies a stage, not a case", () => {
    const serialised = JSON.stringify(report());
    for (const referral of ["ref-1", "ref-2", "ref-3"]) {
      expect(serialised, `report carries ${referral}`).not.toContain(referral);
    }
  });
});

describe("W141 no clinician or practice is scored", () => {
  it("has no per-receiving-practice breakdown", () => {
    // The new absence this unit adds. "Which practice answers fastest" reads as neutral and
    // functions as a league table, and once quoted it becomes a reason to accept a referral
    // somebody should have declined.
    const serialised = JSON.stringify(report());
    expect(serialised).not.toContain("prac-other");
    for (const key of Object.keys(report())) {
      expect(key).not.toMatch(/byPractice|byClinician|byReceiver|fastest|responseTime|score/i);
    }
  });

  it("says so in the output, with the reason rather than the rule", () => {
    const rendered = renderReferralAnalytics(report());
    expect(rendered).toContain("No clinician or receiving practice is scored");
    expect(rendered).toContain("reason to accept a referral they should have declined");
  });

  it("names no clinician anywhere", () => {
    expect(JSON.stringify(report())).not.toContain("clin-");
  });
});

describe("W141 coverage is stated", () => {
  it("counts referrals with nothing recorded, and calls that its own problem", () => {
    // W135's distinction and W115's argument together: nothing recorded is not "unanswered",
    // and a report showing only what it can see implies the rest is fine.
    const built = report();
    expect(built.coverage).toEqual({ withNoAcceptanceRecord: 1, withNoChainEvents: 1 });
    const rendered = renderReferralAnalytics(built);
    expect(rendered).toContain("NO acceptance record at all");
    expect(rendered).toContain("a different problem and a different fix");
  });

  it("keeps its caveats when coverage is complete", () => {
    // The case where a report is most likely to be quoted as clean.
    const complete = buildReferralAnalytics(
      A, "2026-08-11", [DOCUMENTS[0]!], [EVENTS[0]!], [ACTS[0]!],
    );
    expect(complete.coverage).toEqual({ withNoAcceptanceRecord: 0, withNoChainEvents: 0 });
    const rendered = renderReferralAnalytics(complete);
    expect(rendered).toContain("does not rank or list patients");
    expect(rendered).not.toContain("NO acceptance record at all");
  });

  it("reports `unknown` acceptance rather than folding it into 'not sent'", () => {
    const built = report();
    expect(built.byAcceptance.find((row) => row.state === "unknown")?.count).toBe(1);
    expect(built.byAcceptance.find((row) => row.state === "not_sent")).toBeUndefined();
  });
});
