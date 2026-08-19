// W230 (O38): the reach report — the lexicon-gap feed as a record.
//
// WHAT THIS CLOSES. ONBOARDING-INTERVIEW.md item 4: every interview produces sentences the
// machine could not hear, and until now they lived on the screen while it was open and in raw
// JSONL afterwards. This module turns the stored rows into the per-onboarding feed the year
// plan's Q1 loop reviews ("every doctor interview's 'sentences that proposed nothing' feed
// lexicon review") — the same review O13's production misses got, moved to onboarding time.
//
// TWO KINDS OF SILENCE, KEPT APART BECAUSE THEY ARE ACTED ON DIFFERENTLY. `unread` is what the
// CLINICIAN vocabulary could not read — it grows the proposer's cue list. `patientSilent` is
// what the PATIENT'S reader heard nothing in — each entry is a candidate patient-side reach
// gap, the O13 class of failure caught early, and it grows the finder's lexicon. A report that
// merged them would send a reviewer to the wrong cue list.
//
// LATEST SAVE PER CLINICIAN, LIKE THE REVIEW QUEUE. A re-run interview replaces its feed
// entry: the earlier row remains in history for audit, but a gap that a later conversation
// resolved is not outstanding review work, and a feed that re-raised it would train people to
// ignore the feed.

import { reviewQueue, type StoredBackground } from "./background-store";

export type ReachReportEntry = {
  clinicianId: string;
  displayName: string;
  savedAt: string;
  savedBy: string;
  /** Sentences the clinician vocabulary could not read — the proposer's to-do list. */
  unread: string[];
  /** Sentences the patient's reader heard nothing in — candidate patient-side reach gaps. */
  patientSilent: string[];
};

/**
 * The feed: one entry per clinician whose LATEST save left anything unheard, newest first.
 *
 * An onboarding whose latest save has no gaps appears nowhere — the feed is outstanding
 * review work, not a directory of interviews. Callers distinguish "no onboardings saved at
 * all" from "saved, nothing unheard" with `hasOnboardings`, because those two empty states
 * mean different things on a console (W179's rule).
 */
export function reachReport(options: { filePath?: string } = {}): {
  hasOnboardings: boolean;
  entries: ReachReportEntry[];
} {
  const queue = reviewQueue(options);
  const entries = queue
    .map(({ background }) => toEntry(background))
    .filter((entry) => entry.unread.length > 0 || entry.patientSilent.length > 0)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  return { hasOnboardings: queue.length > 0, entries };
}

function toEntry(row: StoredBackground): ReachReportEntry {
  return {
    clinicianId: row.clinicianId,
    displayName: row.displayName,
    savedAt: row.savedAt,
    savedBy: row.savedBy,
    unread: row.unread,
    // Absent on rows saved before O38 — reported as empty rather than invented, and the row
    // still appears if its `unread` half has entries.
    patientSilent: row.patientSilent ?? [],
  };
}
