// W177: the practice's own audit trail, as a document it can take away.
//
// A practice under a pilot agreement, a PHN asking how a decision was made, an APP 12 request
// from the practice about its own configuration — all three want the same artefact: what was
// changed here, when, and by whom.
//
// THE LINE THIS UNIT DRAWS IS WHICH TRAIL. There are two, and conflating them would turn a
// configuration history into a patient-data disclosure:
//
//   THE CONSOLE TRAIL (`ConsoleState.auditEvents`) records what the PRACTICE decided — onboarding,
//   eligibility rules, session settings, setup completion. Its `subjectId` is a practice id, a
//   rules version or a setup step. No patient identity appears in it, which is what W106's
//   registry says and what a test in this file re-checks rather than trusts.
//
//   THE RAIL TRAIL (the booking store's) records what happened to PATIENTS — holdout assignment,
//   invitations, opt-outs — and its `subjectId` is a patient or invitation id. That is patient
//   data, W33's `exportPatientData` already owns it, and it is deliberately NOT in this export.
//
// Exporting the second under the name of the first is the specific mistake available here: both
// are `AuditEvent[]`, both are "the audit trail", and the type system cannot tell them apart. So
// this module takes the console events explicitly and asserts the absence rather than assuming it.
//
// W149'S PATTERN: THE EXPORT CARRIES ITS OWN CAVEATS. A document leaves the product that explains
// it, and a reader supplies their own meaning for anything unexplained. Three things need saying
// on the page, not in a footnote somewhere else:
//
//   IT SAYS WHAT CHANGED, NOT WHETHER THE CHANGE WAS RIGHT. A configuration history is not a
//   quality record and cannot be read as one.
//
//   SILENCE IS NOT ABSENCE OF ACTIVITY. Nothing recorded before a practice was onboarded means
//   the product was not there, not that nothing happened — W120's rule, in the place where a
//   reader is most likely to draw the wrong conclusion from a short list.
//
//   IT IS ONE PRACTICE'S. In a multi-practice group (W166) the obvious misreading is that this
//   is the group's trail, and the export names the practice it belongs to for that reason.

import type { AuditEvent, AuditEventKind, PracticeId } from "@/domain/types";

/**
 * The kinds this export is for: what the PRACTICE decided.
 *
 * Declared as a closed list rather than filtered by exclusion, so a new patient-keyed kind added
 * to `AuditEventKind` does not join the export by default. Defaulting to include is how a
 * configuration document quietly becomes a patient-data disclosure.
 */
export const CONFIGURATION_KINDS: readonly AuditEventKind[] = ["config_changed"];

export class PatientTrailInExportError extends Error {
  constructor(readonly kinds: readonly string[]) {
    super(
      `refusing to build a configuration audit export containing patient-keyed events: ${kinds.join(", ")}. ` +
        "Those belong to the rail's trail and are answered by a patient's own access request " +
        "(W33), not by a practice's configuration history.",
    );
    this.name = "PatientTrailInExportError";
  }
}

export interface AuditExport {
  practiceId: string;
  practiceName: string;
  /** The window the export covers, stated because a reader cannot infer it from the rows. */
  from: string;
  to: string;
  events: AuditEvent[];
  /** Kinds present, so a reader can see what this trail does and does not record. */
  kindsPresent: string[];
}

/**
 * One practice's configuration trail for a window.
 *
 * Takes the practice id as the QUERY (W123's rule) rather than filtering a group-wide fetch, and
 * the window is inclusive at both ends because a reader asking for "March" means all of March.
 *
 * Deterministic: sorted on time, then kind, then subject, then detail. A tie on all four is two
 * genuinely identical rows, where order cannot matter. The order-dependence class this tree has
 * found nine times is not going to arrive in an export nobody can reproduce byte for byte.
 *
 * FAILS CLOSED ON THE WRONG TRAIL. Both trails are `AuditEvent[]` and the type system cannot tell
 * them apart, so handing in the rail's events is a live mistake — and a silent one, because the
 * practice and window filters would happily pass them through into a document that leaves the
 * tenancy. Anything outside `CONFIGURATION_KINDS` throws rather than being dropped: quietly
 * discarding them would hide the caller's error and produce a document missing rows it never
 * announced.
 */
export function buildAuditExport(
  events: readonly AuditEvent[],
  practiceId: PracticeId,
  practiceName: string,
  from: string,
  to: string,
): AuditExport {
  const foreign = [...new Set(events.map((e) => e.kind))].filter(
    (kind) => !CONFIGURATION_KINDS.includes(kind),
  );
  if (foreign.length > 0) throw new PatientTrailInExportError(foreign.sort());

  const mine = events
    .filter((e) => e.practiceId === practiceId)
    .filter((e) => e.at.slice(0, 10) >= from && e.at.slice(0, 10) <= to)
    .sort(
      (a, b) =>
        a.at.localeCompare(b.at) ||
        a.kind.localeCompare(b.kind) ||
        a.subjectId.localeCompare(b.subjectId) ||
        a.detail.localeCompare(b.detail),
    );

  return {
    practiceId: practiceId as string,
    practiceName,
    from,
    to,
    events: mine,
    kindsPresent: [...new Set(mine.map((e) => e.kind))].sort(),
  };
}

/**
 * The caveats, as data rather than as prose buried in the renderer.
 *
 * Exported so a console surface can show the same sentences the document carries — the two must
 * not be allowed to drift into saying different things about the same export.
 */
export const AUDIT_EXPORT_CAVEATS: readonly string[] = [
  "This is a record of what was CHANGED in Meherr for this practice, and by whom. It does not say whether a change was correct, and it is not a measure of care.",
  "Nothing recorded for a period means nothing was recorded — most often because Meherr was not in use yet. It does not mean nothing happened at the practice.",
  "It covers this practice only. If your organisation runs more than one, each has its own trail and they are not combined here.",
  "It does not contain any patient's record. Changes about a patient — invitations, opt-outs, bookings — are held separately and are answered by a patient's own access request.",
];

/** The document. Structured object first, rendered from it — the W20 pattern. */
export function renderAuditExport(exported: AuditExport, generatedAt: string): string {
  const lines: string[] = [
    `# Configuration audit trail — ${exported.practiceName}`,
    ``,
    `Practice \`${exported.practiceId}\`. Covering ${exported.from} to ${exported.to} inclusive.`,
    `Generated ${generatedAt}. ${exported.events.length} entr(y/ies).`,
    ``,
    `## What this document is`,
    ``,
    ...AUDIT_EXPORT_CAVEATS.map((caveat) => `- ${caveat}`),
    ``,
    `## Entries`,
    ``,
  ];

  if (exported.events.length === 0) {
    // The zero state says which of the two things it means, because they lead a reader to
    // opposite conclusions — W127's rule, applied to a document rather than a page.
    lines.push(
      `No changes were recorded in this window. That means no configuration change was made`,
      `through Meherr between ${exported.from} and ${exported.to} — not that the practice made`,
      `no decisions in that time.`,
      ``,
    );
    return lines.join("\n");
  }

  lines.push(`| When | What | Subject | Detail |`, `|---|---|---|---|`);
  for (const event of exported.events) {
    lines.push(`| ${event.at} | ${event.kind} | ${event.subjectId} | ${event.detail} |`);
  }
  lines.push(``, `Kinds present in this window: ${exported.kindsPresent.join(", ")}.`, ``);
  return lines.join("\n");
}
