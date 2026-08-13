// W115 verify gate: "golden report; states its own coverage; ranks no clinician."
//
// The golden is the whole rendered document, so any change to the wording — including the
// caveats — has to be made deliberately. The other two gates are asserted as properties
// rather than read off the golden, because a golden only proves what today's output looks
// like, not that tomorrow's cannot become a league table.

import { describe, expect, it } from "vitest";
import {
  buildProvenanceReport,
  renderProvenanceReport,
  type ProvenanceReportInput,
} from "./provenance-report";
import {
  appendVerification,
  EMPTY_VERIFICATION_LOG,
  replayVerification,
  type CredentialLifecycle,
  type VerificationEvent,
  type VerificationLog,
} from "./verification";

function build(...events: VerificationEvent[]): VerificationLog {
  return events.reduce((log, event) => {
    const result = appendVerification(log, event);
    if (!result.ok) throw new Error(`refused ${event.kind}: ${result.reason}`);
    return result.log;
  }, EMPTY_VERIFICATION_LOG);
}

/** Three credentials: one confirmed, one lapsed, one still waiting. */
function fixture(): CredentialLifecycle[] {
  const log = build(
    { kind: "submitted", at: "2026-01-10", credentialId: "cred-a", subjectClinicianId: "clin-1", submittedBy: "manager@a.example" },
    { kind: "checked", at: "2026-01-12", credentialId: "cred-a", checkedBy: "owner@a.example", examined: ["ev_1", "ev_2"] },
    { kind: "verified", at: "2026-01-14", credentialId: "cred-a", verifiedBy: "owner@a.example", expiresOn: "2027-01-14" },
    { kind: "submitted", at: "2026-02-01", credentialId: "cred-b", subjectClinicianId: "clin-2", submittedBy: "owner@a.example" },
    { kind: "checked", at: "2026-02-02", credentialId: "cred-b", checkedBy: "owner@a.example", examined: ["ev_3"] },
    { kind: "verified", at: "2026-02-03", credentialId: "cred-b", verifiedBy: "owner@a.example", expiresOn: "2026-05-31" },
    { kind: "submitted", at: "2026-06-01", credentialId: "cred-c", subjectClinicianId: "clin-1", submittedBy: "manager@a.example" },
  );
  return replayVerification(log, "2026-08-10").credentials;
}

const input = (over: Partial<ProvenanceReportInput> = {}): ProvenanceReportInput => ({
  practiceName: "Demo Family Practice",
  asOf: "2026-08-10",
  credentials: fixture(),
  rosterClinicianIds: ["clin-1", "clin-2", "clin-3"],
  ...over,
});

const GOLDEN = `# Credential provenance — Demo Family Practice

As at 2026-08-10.

## Coverage

| Measure | Count |
|---|---|
| Clinicians on the roster | 3 |
| Clinicians with no credential recorded | 1 |
| Credentials confirmed and current | 1 |
| Credentials lapsed | 1 |
| Credentials awaiting a check | 1 |
| Credentials withdrawn or not accepted | 0 |

**No credential recorded for:** clin-3.
This is a gap in the practice's records, not a statement about those clinicians.

## What was checked

| Credential | Clinician | Status | Checked by | Confirmed by | Documents | Expiry |
|---|---|---|---|---|---|---|
| cred-a | clin-1 | verified | owner@a.example on 2026-01-12 | owner@a.example on 2026-01-14 | 2 | 2027-01-14 |
| cred-b | clin-2 | expired | owner@a.example on 2026-02-02 | owner@a.example on 2026-02-03 | 1 | 2026-05-31 |
| cred-c | clin-1 | submitted | — | — | 0 | — |

**Lodged and checked by the same person:** cred-b.
Recorded so it is visible, not because it is disallowed — a small practice where one
person does both is ordinary, and a rule forbidding it would buy a second pair of eyes
by inviting a second account.

## What this report does and does not say

- Ordered by credential id. The order is arbitrary and carries no meaning — this report is not a comparison between clinicians, and a clinician with more rows has had more credentials recorded, which says nothing about their work.
- This report describes what the practice CHECKED. It is not an assessment of anyone's competence and does not say what any clinician may or may not do.
- Registration is not checked here. Reading the Ahpra register is a separate act with its own record; a credential verified in this report may still need that lookup.
- Evidence documents are counted, not included. They stay in the vault behind their own authorization.
- A date marked as a review date was set by the practice's re-attestation policy, not stated by the issuer.
- 1 of 3 clinicians on the roster have NO credential recorded at all. They are absent from the table above, not cleared by it.
`;

describe("W115 golden report", () => {
  it("renders the golden exactly", () => {
    expect(renderProvenanceReport(buildProvenanceReport(input()))).toBe(GOLDEN);
  });

  it("counts from the replayed lifecycles rather than from a stored status", () => {
    const report = buildProvenanceReport(input());
    expect(report.counts).toEqual({ verified: 1, lapsed: 1, awaiting: 1, ended: 0 });
  });

  it("is stable under input order — the report is not a function of how rows arrived", () => {
    const forwards = renderProvenanceReport(buildProvenanceReport(input()));
    const shuffled = renderProvenanceReport(
      buildProvenanceReport(input({ credentials: [...fixture()].reverse() })),
    );
    expect(shuffled).toBe(forwards);
  });
});

describe("W115 states its own coverage", () => {
  it("names the clinicians it knows nothing about", () => {
    // The number most likely to change what somebody does. A report showing only what exists
    // implies everything absent is fine.
    const report = buildProvenanceReport(input());
    expect(report.coverage.clinicianIdsWithNoRecord).toEqual(["clin-3"]);
    const rendered = renderProvenanceReport(report);
    expect(rendered).toContain("Clinicians with no credential recorded | 1");
    expect(rendered).toContain("not a statement about those clinicians");
  });

  it("flags records about people who are not on the roster", () => {
    const report = buildProvenanceReport(input({ rosterClinicianIds: ["clin-1"] }));
    expect(report.coverage.subjectsNotOnRoster).toEqual(["clin-2"]);
    expect(renderProvenanceReport(report)).toContain("Records for people not on the roster");
  });

  it("says what it does NOT cover, every time", () => {
    const rendered = renderProvenanceReport(buildProvenanceReport(input()));
    expect(rendered).toContain("not an assessment of anyone's competence");
    expect(rendered).toContain("Registration is not checked here");
    expect(rendered).toContain("Evidence documents are counted, not included");
  });

  it("keeps its caveats even when there is nothing to report", () => {
    // The empty case is where a report is most likely to be quoted as "all clear".
    const report = buildProvenanceReport(input({ credentials: [], rosterClinicianIds: [] }));
    const rendered = renderProvenanceReport(report);
    expect(rendered).toContain("No credentials have been recorded.");
    expect(rendered).toContain("not an assessment of anyone's competence");
  });

  it("distinguishes a review date from an issuer's expiry in the output", () => {
    const log = build(
      { kind: "submitted", at: "2026-01-10", credentialId: "cred-x", subjectClinicianId: "clin-1", submittedBy: "m@a.example" },
      { kind: "checked", at: "2026-01-12", credentialId: "cred-x", checkedBy: "o@a.example", examined: [] },
      { kind: "verified", at: "2026-01-14", credentialId: "cred-x", verifiedBy: "o@a.example", expiresOn: null },
    );
    const rendered = renderProvenanceReport(
      buildProvenanceReport(
        input({ credentials: replayVerification(log, "2026-08-10").credentials, rosterClinicianIds: ["clin-1"] }),
      ),
    );
    expect(rendered).toContain("(review date)");
    expect(rendered).toContain("not stated by the issuer");
  });
});

describe("W115 ranks no clinician", () => {
  it("has no per-clinician tally anywhere in the report", () => {
    // Not "avoids ranking language" — there is no field that could BE a ranking. A count of
    // credentials per person is a league table however it is captioned (W83's lesson).
    const report = buildProvenanceReport(input());
    const rowKeys = Object.keys(report.rows[0] ?? {});
    expect(rowKeys).not.toContain("score");
    expect(rowKeys).not.toContain("rank");
    expect(Object.keys(report)).toEqual([
      "practiceName",
      "asOf",
      "rows",
      "counts",
      "coverage",
      "caveats",
    ]);
    // The practice-level counts are about CREDENTIALS, never about a clinician.
    expect(Object.keys(report.counts)).toEqual(["verified", "lapsed", "awaiting", "ended"]);
  });

  it("orders by credential id, not by anything that could imply a standing", () => {
    const report = buildProvenanceReport(input());
    expect(report.rows.map((r) => r.credentialId)).toEqual(["cred-a", "cred-b", "cred-c"]);
    // A clinician with two credentials is not gathered to the top or into a block.
    expect(report.rows.map((r) => r.subjectClinicianId)).toEqual(["clin-1", "clin-2", "clin-1"]);
  });

  it("says in the output that the order means nothing", () => {
    const rendered = renderProvenanceReport(buildProvenanceReport(input()));
    expect(rendered).toContain("The order is arbitrary and carries no meaning");
    expect(rendered).toContain("not a comparison between clinicians");
  });

  it("makes no claim about how good anyone is", () => {
    const rendered = renderProvenanceReport(buildProvenanceReport(input())).toLowerCase();
    for (const banned of ["specialist", "expert", "best", "top", "rating", "score", "excellent"]) {
      expect(rendered, `report contains "${banned}"`).not.toContain(banned);
    }
  });

  it("surfaces single-handled credentials without scoring the person", () => {
    // W110 said this was for W115 to surface. It names the CREDENTIAL, not the handler.
    const rendered = renderProvenanceReport(buildProvenanceReport(input()));
    expect(rendered).toContain("**Lodged and checked by the same person:** cred-b.");
    expect(rendered).toContain("not because it is disallowed");
  });
});
