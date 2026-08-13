// W115: the credential provenance report — what the practice actually checked, and what it
// has not checked at all.
//
// The temptation with a report like this is to list the credentials on file and call it
// credentialing. That is the failure mode, and it is a quiet one: a report that shows only
// what EXISTS implies that everything absent is fine. A clinician nobody ever credentialed
// appears nowhere and reads as no problem. So the coverage section is not an appendix here —
// it is the part of the report most likely to change what somebody does.
//
// Two constraints shape everything else.
//
//   IT RANKS NO CLINICIAN. Not "avoids ranking language" — it has no per-clinician tally at
//   all, because a count of credentials per person is a league table however it is captioned,
//   and W83 already refused to let a capability graph become a productivity board. The report
//   is organised BY CREDENTIAL, ordered by credential id, which is arbitrary on purpose and
//   said so in the output. A clinician appears as the subject of a row, never as a heading
//   with a score under it.
//
//   IT STATES ITS OWN COVERAGE. W99 put its assumptions in the output because a projection
//   whose assumptions are invisible gets quoted as a measurement. The same applies harder
//   here: a credentialing report quoted without its coverage is evidence of diligence that
//   was never done.
//
// What it is NOT: an opinion about anyone's competence, a register check (W111 is its own
// module and its own act), or a way to read evidence documents (W109 gates those behind a
// grant this report never holds — it counts them and stops).

import { effectiveExpiry, type ExpiryPolicy } from "./attestation";
import type { CredentialLifecycle } from "./verification";

export interface ProvenanceRow {
  credentialId: string;
  subjectClinicianId: string;
  status: string;
  /** Who examined the evidence, and when. Null until checked. */
  checkedBy: string | null;
  checkedOn: string | null;
  /** Who accepted it, and when. Null until verified. */
  verifiedBy: string | null;
  verifiedOn: string | null;
  /** How many documents a reviewer looked at. The refs themselves stay in the vault. */
  evidenceCount: number;
  /** Lodged and checked by the same person. Surfaced, never scored — see the module note. */
  singleHandled: boolean;
  expiresOn: string | null;
  /** False when the date came from the practice's review policy rather than the issuer. */
  expiryStated: boolean;
}

export interface ProvenanceCoverage {
  rosterSize: number;
  clinicianIdsWithNoRecord: string[];
  /** Subjects of credentials who are not on the roster — records about people who left. */
  subjectsNotOnRoster: string[];
}

export interface ProvenanceReport {
  practiceName: string;
  asOf: string;
  /** Ordered by credential id. Arbitrary, deliberately — see `caveats`. */
  rows: ProvenanceRow[];
  counts: { verified: number; lapsed: number; awaiting: number; ended: number };
  coverage: ProvenanceCoverage;
  caveats: string[];
}

export interface ProvenanceReportInput {
  practiceName: string;
  asOf: string;
  credentials: readonly CredentialLifecycle[];
  /** The practice's own roster. Without it there is no coverage question to answer. */
  rosterClinicianIds: readonly string[];
  policy?: ExpiryPolicy;
}

export function buildProvenanceReport(input: ProvenanceReportInput): ProvenanceReport {
  const rows: ProvenanceRow[] = input.credentials
    .map((credential) => {
      const expiry = effectiveExpiry(credential, input.policy);
      return {
        credentialId: credential.credentialId,
        subjectClinicianId: credential.subjectClinicianId,
        status: credential.status,
        checkedBy: credential.checkedBy,
        checkedOn: credential.checkedOn,
        verifiedBy: credential.verifiedBy,
        verifiedOn: credential.verifiedOn,
        evidenceCount: credential.examined.length,
        singleHandled: credential.singleHandled,
        expiresOn: expiry?.on ?? null,
        expiryStated: expiry?.stated ?? false,
      };
    })
    // By credential id. NOT by status, date or anything that would put a clinician's rows
    // above another's — the order must carry no meaning at all.
    .sort((a, b) => a.credentialId.localeCompare(b.credentialId));

  const counts = { verified: 0, lapsed: 0, awaiting: 0, ended: 0 };
  for (const row of rows) {
    if (row.status === "verified") counts.verified++;
    else if (row.status === "expired") counts.lapsed++;
    else if (row.status === "submitted" || row.status === "checked") counts.awaiting++;
    else counts.ended++;
  }

  const subjects = new Set(input.credentials.map((c) => c.subjectClinicianId));
  const roster = new Set(input.rosterClinicianIds);
  const coverage: ProvenanceCoverage = {
    rosterSize: roster.size,
    clinicianIdsWithNoRecord: [...roster].filter((id) => !subjects.has(id)).sort(),
    subjectsNotOnRoster: [...subjects].filter((id) => !roster.has(id)).sort(),
  };

  const caveats = [
    "Ordered by credential id. The order is arbitrary and carries no meaning — this report is not a comparison between clinicians, and a clinician with more rows has had more credentials recorded, which says nothing about their work.",
    "This report describes what the practice CHECKED. It is not an assessment of anyone's competence and does not say what any clinician may or may not do.",
    "Registration is not checked here. Reading the Ahpra register is a separate act with its own record; a credential verified in this report may still need that lookup.",
    "Evidence documents are counted, not included. They stay in the vault behind their own authorization.",
    "A date marked as a review date was set by the practice's re-attestation policy, not stated by the issuer.",
  ];
  if (coverage.clinicianIdsWithNoRecord.length > 0) {
    caveats.push(
      `${coverage.clinicianIdsWithNoRecord.length} of ${coverage.rosterSize} clinicians on the roster have NO credential recorded at all. They are absent from the table above, not cleared by it.`,
    );
  }
  if (coverage.subjectsNotOnRoster.length > 0) {
    caveats.push(
      `${coverage.subjectsNotOnRoster.length} credential subject(s) are not on the current roster — records about people who have left, or a roster that is out of date.`,
    );
  }

  return { practiceName: input.practiceName, asOf: input.asOf, rows, counts, coverage, caveats };
}

const dash = (value: string | null) => value ?? "—";

export function renderProvenanceReport(report: ProvenanceReport): string {
  const lines = [
    `# Credential provenance — ${report.practiceName}`,
    ``,
    `As at ${report.asOf}.`,
    ``,
    `## Coverage`,
    ``,
    `| Measure | Count |`,
    `|---|---|`,
    `| Clinicians on the roster | ${report.coverage.rosterSize} |`,
    `| Clinicians with no credential recorded | ${report.coverage.clinicianIdsWithNoRecord.length} |`,
    `| Credentials confirmed and current | ${report.counts.verified} |`,
    `| Credentials lapsed | ${report.counts.lapsed} |`,
    `| Credentials awaiting a check | ${report.counts.awaiting} |`,
    `| Credentials withdrawn or not accepted | ${report.counts.ended} |`,
    ``,
  ];

  if (report.coverage.clinicianIdsWithNoRecord.length > 0) {
    lines.push(
      `**No credential recorded for:** ${report.coverage.clinicianIdsWithNoRecord.join(", ")}.`,
      `This is a gap in the practice's records, not a statement about those clinicians.`,
      ``,
    );
  }
  if (report.coverage.subjectsNotOnRoster.length > 0) {
    lines.push(
      `**Records for people not on the roster:** ${report.coverage.subjectsNotOnRoster.join(", ")}.`,
      ``,
    );
  }

  lines.push(`## What was checked`, ``);
  if (report.rows.length === 0) {
    lines.push(`No credentials have been recorded.`, ``);
  } else {
    lines.push(
      `| Credential | Clinician | Status | Checked by | Confirmed by | Documents | Expiry |`,
      `|---|---|---|---|---|---|---|`,
    );
    for (const row of report.rows) {
      const expiry =
        row.expiresOn === null ? "—" : row.expiryStated ? row.expiresOn : `${row.expiresOn} (review date)`;
      lines.push(
        `| ${row.credentialId} | ${row.subjectClinicianId} | ${row.status} | ${dash(row.checkedBy)}${row.checkedOn ? ` on ${row.checkedOn}` : ""} | ${dash(row.verifiedBy)}${row.verifiedOn ? ` on ${row.verifiedOn}` : ""} | ${row.evidenceCount} | ${expiry} |`,
      );
    }
    lines.push(``);
    const single = report.rows.filter((r) => r.singleHandled).map((r) => r.credentialId);
    if (single.length > 0) {
      lines.push(
        `**Lodged and checked by the same person:** ${single.join(", ")}.`,
        `Recorded so it is visible, not because it is disallowed — a small practice where one`,
        `person does both is ordinary, and a rule forbidding it would buy a second pair of eyes`,
        `by inviting a second account.`,
        ``,
      );
    }
  }

  lines.push(`## What this report does and does not say`, ``, ...report.caveats.map((c) => `- ${c}`), ``);
  return lines.join("\n");
}
