// W226: where a reviewed background is kept between the interview and the gate.
//
// WHY THIS EXISTS NOW AND NOT LATER. The interview instrument, the transcript reader and the
// review editor all worked, and the output evaporated when the tab closed. A thirty-minute
// conversation with a GP that produces nothing durable is not an onboarding system, it is a demo
// of one — and the whole promise being made to a clinician is that half an hour is enough to be
// set up.
//
// A DRAFT IS NOT A PUBLICATION, WHICH IS WHY THIS DOES NOT WAIT FOR G6. Founder gate G6 governs
// PUBLISHING a directory profile; `SHIPPED_DIRECTORY_PROFILES` is empty and nothing here changes
// that. What this stores is a reviewer's working state — which facets were accepted, by whom, and
// whether the clinician has confirmed the read-back. That is exactly the material G6 needs in
// order to be opened on evidence rather than on somebody's memory of an interview.
//
// The type makes the distinction structural rather than a matter of discipline: this module
// exports `StoredBackground`, no function in it returns anything a publisher consumes, and the
// only status it can hold is one of three review states. There is no `published`, so no code path
// can set one.
//
// SAME PATTERN AS THE APPLICATION STORE, deliberately rather than a second invention: append-only
// JSONL, one row per save, latest-wins on read. Two saves for one clinician is a reviewer changing
// their mind, and keeping both is what makes the change auditable — the earlier row is the record
// that somebody decided differently, which is precisely what a reviewer would be asked about.
//
// SPREADSHEET NEUTRALISATION RUNS AT THE WRITER, for W153's reason and with a sharper edge here:
// these rows carry VERBATIM CLINICIAN SPEECH from a transcript. A quote beginning `=` is a valid
// JSON string and an executable formula the moment somebody exports the review queue and opens it.

import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { neutraliseSpreadsheetFormula } from "@/security/untrusted";
import type { BackgroundFacet, ClinicianBackground, FacetStatus } from "./background";
import { FREQUENCIES, type Frequency } from "./interview";

/** A saved review. Never a profile — see the header. */
export type StoredBackground = ClinicianBackground & {
  savedAt: string;
  savedBy: string;
};

function defaultStorePath(): string {
  const configured = process.env.ADHDME_BACKGROUND_PATH?.trim();
  return configured || path.join(process.cwd(), ".data", "clinician-backgrounds.jsonl");
}

function readRows(filePath: string): StoredBackground[] {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, "utf8")
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as StoredBackground];
      } catch {
        // A corrupt line is skipped rather than thrown on: one bad row must not make an entire
        // review queue unreadable, which is the failure the application store already chose
        // against for the same reason.
        return [];
      }
    });
}

const VALID_STATUS = new Set<FacetStatus>(["proposed", "accepted", "rejected"]);
const VALID_FREQUENCY = new Set<Frequency>(FREQUENCIES);

function cleanFacet(facet: BackgroundFacet): BackgroundFacet {
  return {
    key: facet.key,
    kind: facet.kind,
    label: facet.label,
    // The quote is the clinician's own speech, arriving from a transcript somebody pasted in.
    ...(facet.quote ? { quote: neutraliseSpreadsheetFormula(facet.quote) } : {}),
    ...(facet.cue ? { cue: facet.cue } : {}),
    status: VALID_STATUS.has(facet.status) ? facet.status : "proposed",
    ...(facet.decidedBy ? { decidedBy: neutraliseSpreadsheetFormula(facet.decidedBy) } : {}),
    // The clinician's spoken answer (O30). Dropped rather than defaulted when it is not one of
    // the three states — a frequency this record cannot hold is a frequency nobody said.
    ...(facet.frequency && VALID_FREQUENCY.has(facet.frequency) ? { frequency: facet.frequency } : {}),
  };
}

/**
 * Save a review.
 *
 * AN ACCEPTED FACET WITH NOBODY NAMED IS REFUSED AT THE WRITER. `background.ts` says a facet
 * reading `accepted` with no `decidedBy` would mean the machine accepted it, "which must never
 * happen". The console makes that visible; this makes it impossible to persist, because a
 * validation that lives only in a UI is a validation the next caller will not have.
 */
export function saveBackground(
  background: ClinicianBackground,
  savedBy: string,
  options: { filePath?: string; now?: Date } = {},
): StoredBackground {
  const undecided = background.facets.filter(
    (facet) => facet.status === "accepted" && !facet.decidedBy,
  );
  if (undecided.length > 0) {
    throw new Error(
      `refusing to save: ${undecided.length} accepted facet(s) name nobody who decided them — ` +
        `an accepted facet with no reviewer means the machine accepted it`,
    );
  }

  const filePath = options.filePath ?? defaultStorePath();
  mkdirSync(path.dirname(filePath), { recursive: true });

  const row: StoredBackground = {
    clinicianId: background.clinicianId,
    displayName: neutraliseSpreadsheetFormula(background.displayName),
    facets: background.facets.map(cleanFacet),
    unread: background.unread.map(neutraliseSpreadsheetFormula),
    readBackConfirmed: background.readBackConfirmed,
    savedAt: (options.now ?? new Date()).toISOString(),
    savedBy: neutraliseSpreadsheetFormula(savedBy),
  };

  appendFileSync(filePath, `${JSON.stringify(row)}\n`, "utf8");
  return row;
}

/**
 * The current state of a clinician's background: the latest row.
 *
 * Latest-wins rather than merge. A reviewer's save is a complete statement of what they decided,
 * and merging two of them would produce a background nobody ever approved.
 */
export function latestBackground(
  clinicianId: string,
  options: { filePath?: string } = {},
): StoredBackground | null {
  const rows = readRows(options.filePath ?? defaultStorePath()).filter(
    (row) => row.clinicianId === clinicianId,
  );
  return rows.length === 0 ? null : rows[rows.length - 1]!;
}

/**
 * Every save for one clinician, oldest first.
 *
 * The audit trail. "Why does his profile say that" is answered by the latest row; "who changed it
 * and when" is answered by all of them, and that second question is the one that gets asked when
 * something is wrong.
 */
export function backgroundHistory(
  clinicianId: string,
  options: { filePath?: string } = {},
): StoredBackground[] {
  return readRows(options.filePath ?? defaultStorePath()).filter(
    (row) => row.clinicianId === clinicianId,
  );
}

/**
 * The review queue: the latest state of every clinician who has one.
 *
 * READY MEANS READ BACK, NOT MERELY ACCEPTED. A background with every facet accepted and no
 * confirmation is a reviewer's opinion of a clinician; the read-back is the clinician saying it is
 * them, and that is the thing G6 would be opened on.
 */
export function reviewQueue(options: { filePath?: string } = {}): Array<{
  background: StoredBackground;
  accepted: number;
  ready: boolean;
}> {
  const latest = new Map<string, StoredBackground>();
  for (const row of readRows(options.filePath ?? defaultStorePath())) latest.set(row.clinicianId, row);

  return [...latest.values()]
    .map((background) => {
      const accepted = background.facets.filter((facet) => facet.status === "accepted").length;
      return { background, accepted, ready: background.readBackConfirmed && accepted > 0 };
    })
    .sort((a, b) => a.background.displayName.localeCompare(b.background.displayName));
}
