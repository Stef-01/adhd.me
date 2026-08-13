// W149: the CPD trail — what a clinician read, and when.
//
// W144's boundary document recorded the position this implements, and it is the whole unit:
//
//   THE TRAIL BELONGS TO THE CLINICIAN. It is a record of a person's professional development,
//   and it is one small step from a monitoring tool — "who has not read this month's update" is
//   a management report nobody asked for and every practice would eventually run. So there is no
//   practice-level read. Not a permission on one; there is no function that returns another
//   clinician's trail, and a test asserts the export list contains nothing that could.
//
// Two consequences that follow, and are the reason the position is worth enforcing rather than
// stating:
//
//   IT IS CORRECTABLE BY ITS SUBJECT. A CPD record is used for professional obligations, so an
//   entry logged in error matters to the person it is about. `correctEntry` is theirs, and the
//   correction is APPENDED rather than overwriting — the reading really did get logged, and a
//   record that can be silently rewritten is not evidence of anything.
//
//   IT RECORDS READING, NOT COMPREHENSION. An entry says material was opened at a time. It does
//   not say it was understood, agreed with, or acted on, and there is no field that could —
//   because the moment there is, a practice has a measure of whether its clinicians are learning
//   properly, which is a different product and a worse one.
//
// Export is the point rather than a feature: a clinician needs to hand this to a college, so the
// exportable form is the record, and it carries its own caveats.

export type CpdEntryKind =
  /** The clinician opened the material. */
  | "opened"
  /** The clinician marked it read. Their claim about their own activity. */
  | "marked_read"
  /** The clinician says a previous entry was wrong. Appended, never overwriting. */
  | "corrected";

export interface CpdEntry {
  entryId: string;
  /**
   * Which practice minted the clinician id below.
   *
   * W209: REQUIRED, because a clinician id is only unique inside its practice — W166 mints
   * `clin-${n}` from a per-practice counter and said so at the time ("a clinician id is only ever
   * resolved inside the practice that minted it"). This module resolved one WITHOUT a practice,
   * so `clin-1` at two practices shared one trail: a reader saw another person's reading record
   * rendered as their own, and a correction could be made about somebody else's entry.
   */
  practiceId: string;
  /** Whose trail this is. Every read takes this AND the practice, and returns nothing else's. */
  clinicianId: string;
  kind: CpdEntryKind;
  itemId: string;
  /** Traceable to signed-off content (W145/W152), so an export can be checked. */
  sourceRef: string;
  itemTitle: string;
  at: string;
  /** Present on `corrected` only: which entry it corrects, and what the clinician says. */
  correctsEntryId: string | null;
  note: string | null;
}

export type CpdRejection =
  | "clinician_missing"
  | "item_missing"
  | "source_missing"
  | "date_missing_or_unreadable"
  | "correction_without_target"
  | "correction_without_note"
  | "correction_of_a_correction"
  | "not_your_entry"
  | "practice_missing";

export type CpdResult = { ok: true; entry: CpdEntry } | { ok: false; errors: CpdRejection[] };

const ISO = /^\d{4}-\d{2}-\d{2}/;

export interface CpdInput {
  entryId: string;
  practiceId: string;
  clinicianId: string;
  kind: CpdEntryKind;
  itemId: string;
  sourceRef: string;
  itemTitle: string;
  at: string;
  correctsEntryId?: string;
  note?: string;
}

/**
 * Record an entry on a clinician's own trail.
 *
 * A correction must name what it corrects, say why, and target an entry that belongs to the same
 * clinician — the last of those because a correction is a claim about somebody's professional
 * record, and one person cannot make it about another.
 */
export function recordCpdEntry(input: CpdInput, existing: readonly CpdEntry[]): CpdResult {
  const errors: CpdRejection[] = [];
  if (input.practiceId.trim() === "") errors.push("practice_missing");
  if (input.clinicianId.trim() === "") errors.push("clinician_missing");
  if (input.itemId.trim() === "") errors.push("item_missing");
  if (input.sourceRef.trim() === "") errors.push("source_missing");
  if (!ISO.test(input.at)) errors.push("date_missing_or_unreadable");

  if (input.kind === "corrected") {
    const target = existing.find((entry) => entry.entryId === input.correctsEntryId);
    if (!input.correctsEntryId || !target) errors.push("correction_without_target");
    if (!input.note || input.note.trim() === "") errors.push("correction_without_note");
    // W209: the pair, not the clinician id alone. `clin-1` at another practice is another
    // person, and a correction is a claim about somebody's professional record.
    if (target && (target.clinicianId !== input.clinicianId || target.practiceId !== input.practiceId))
      errors.push("not_your_entry");
    if (target && target.kind === "corrected") errors.push("correction_of_a_correction");
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    entry: {
      entryId: input.entryId,
      practiceId: input.practiceId,
      clinicianId: input.clinicianId,
      kind: input.kind,
      itemId: input.itemId,
      sourceRef: input.sourceRef,
      itemTitle: input.itemTitle,
      at: input.at,
      correctsEntryId: input.correctsEntryId ?? null,
      note: input.note?.trim() ?? null,
    },
  };
}

export interface CpdTrail {
  practiceId: string;
  clinicianId: string;
  /** Oldest first. Corrections appear in place, alongside what they correct. */
  entries: CpdEntry[];
  /** Entry ids the clinician has said were wrong. Marked, never removed. */
  correctedEntryIds: string[];
}

/**
 * One clinician's own trail.
 *
 * Takes the practice and the clinician id as its query rather than filtering afterwards —
 * W123's rule — and there is deliberately no sibling that returns a practice's trails. A
 * permission on such a function would be a decision somebody could reverse; its absence is not.
 *
 * W209 made the practice part of the query. Without it the filter matched a clinician id that is
 * only unique inside one practice, which is not a filter at all once two practices exist.
 */
export function trailFor(entries: readonly CpdEntry[], practiceId: string, clinicianId: string): CpdTrail {
  const mine = entries
    .filter((entry) => entry.practiceId === practiceId && entry.clinicianId === clinicianId)
    .sort((a, b) => a.at.localeCompare(b.at) || a.entryId.localeCompare(b.entryId));
  return {
    practiceId,
    clinicianId,
    entries: mine,
    correctedEntryIds: mine
      .filter((entry) => entry.kind === "corrected" && entry.correctsEntryId !== null)
      .map((entry) => entry.correctsEntryId as string),
  };
}

/**
 * The exportable record, for a clinician handing it to a college.
 *
 * Carries its own caveats, because an export travels away from the product that explains it and
 * a reader will otherwise supply their own meaning for what "read" means here.
 */
export function renderCpdExport(trail: CpdTrail, asOf: string): string {
  const corrected = new Set(trail.correctedEntryIds);
  const lines = [
    `# Continuing professional development — ${trail.clinicianId}`,
    ``,
    `Exported ${asOf}. ${trail.entries.length} entr(y/ies).`,
    ``,
    `| Date | Material | Source | Entry |`,
    `|---|---|---|---|`,
  ];
  for (const entry of trail.entries) {
    const label =
      entry.kind === "corrected"
        ? `correction of ${entry.correctsEntryId} — ${entry.note ?? ""}`
        : corrected.has(entry.entryId)
          ? `${entry.kind} (the clinician has since said this was wrong)`
          : entry.kind;
    lines.push(`| ${entry.at} | ${entry.itemTitle} | ${entry.sourceRef} | ${label} |`);
  }
  lines.push(
    ``,
    `## What this record is`,
    ``,
    `- This is a record of material being OPENED, and of what the clinician said about their own`,
    `  reading. It is not a record of comprehension, agreement, or of anything being acted on.`,
    `- Entries the clinician has said were wrong are marked rather than removed, and the`,
    `  correction sits alongside the original.`,
    `- It belongs to the clinician named above. Meherr provides no view of it to anybody else.`,
    ``,
  );
  return lines.join("\n");
}

export const CPD_REJECTION_COPY: Record<CpdRejection, string> = {
  practice_missing: "Say which practice this record belongs to.",
  clinician_missing: "Say whose record this is.",
  item_missing: "Say which material it was.",
  source_missing: "Record where the material came from, so an export can be checked.",
  date_missing_or_unreadable: "Record the date, as YYYY-MM-DD.",
  correction_without_target: "A correction has to say which entry it corrects.",
  correction_without_note: "A correction has to say what was wrong.",
  correction_of_a_correction:
    "Correct the original entry rather than the correction, so the trail stays readable.",
  not_your_entry:
    "That entry is on somebody else's record. A correction is a claim about a person's own professional record and only they can make it.",
};
