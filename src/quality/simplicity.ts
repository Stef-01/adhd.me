// U15 (R0): the three size-and-shape laws of `docs/SIMPLICITY-LAWS.md`, as registers that fail.
//
// The module-reasons register (`module-reasons.ts`) answers "why is this module here at all". This
// file answers the three questions that come after it: is any file too long to hold in one head,
// is any block of code written twice, and is any module needed by exactly one other — the shape
// that is usually an indirection nobody asked for.
//
// EACH LAW IS A FLOOR WITH AN ALLOWLIST, NOT A PROHIBITION, and the difference is the point. A
// hard ban on files over 600 lines would be broken by the first honest exception and then
// disabled; a floor with dated, argued entries stays true, and the entries are the record of every
// exception anybody thought was worth making. This is `ACCEPTED_DIFFS`'s shape and W53's, applied
// to size.
//
// THE READER IS `simplicity-read.ts`; this module decides and never reads a file.

import type { DuplicateBlock } from "./simplicity-read.ts";

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * LAW 1 — a file over 600 lines carries a dated reason.
 * ──────────────────────────────────────────────────────────────────────────────────────────── */

/** Above this, a file needs an entry. Chosen at U15 from the tree's own distribution: ten files. */
export const LONG_FILE_LINES = 600;

export interface LongFile {
  readonly file: string;
  /** The length that was argued. A file that grows past it needs the argument made again. */
  readonly lines: number;
  readonly on: string;
  /** Why this file is long, and what would have to be true to shorten it. */
  readonly why: string;
}

const U15 = "2026-09-02";

/**
 * Every file over the floor on the day the law was written. Ordered by path.
 *
 * NOTHING HERE IS ACCEPTED FOREVER. `lines` is the figure argued, so a file that grows past its
 * own entry fails again and somebody has to say why a second time — which is how an allowlist
 * avoids becoming a place things go to stop being measured.
 */
export const LONG_FILES: readonly LongFile[] = [
  {
    file: "app/care-finder.tsx",
    lines: 700,
    on: U15,
    why: "The finder's state machine: which stage follows which, the speech-session lifecycle (O69 established it must not split across files), and every derived memo. O95 already took the screens out to app/finder-stages/; what remains is one machine, and cutting it again would put a transition on one side of a file boundary and its guard on the other. R2's stage work is where it gets shorter, if it does.",
  },
  {
    file: "app/story-sequence.tsx",
    lines: 620,
    on: U15,
    why: "The story's eight scroll-linked scenes. Each scene is short; the length is the count. It shortens by dropping scenes, which is an editorial decision about the argument and not a refactor.",
  },
  {
    file: "src/compliance/cdss-boundary.ts",
    lines: 900,
    on: U15,
    why: "W200's G7 boundary re-derived rather than assumed: the register of every module that touches matching, with the reasoning that keeps each on the attribute side of the TGA line. Splitting it would separate the boundary from the argument for where it sits, which is the one thing a reviewer needs both of at once.",
  },
  {
    file: "src/demo/clinicians.ts",
    lines: 1100,
    on: U15,
    why: "The roster and the ranking read over it. Mostly data — real declarations, one clinician per block — and the census pins data files separately for that reason. R1's record registry is where the data and the functions part company.",
  },
  {
    file: "src/design/taste-register.ts",
    lines: 660,
    on: U15,
    why: "AR1's 22 taste rules, each with its enforcement sites and its route scope. One entry per rule; the file is long because the law is long, and a rule kept anywhere but beside its enforcement list is a rule that drifts from it.",
  },
  {
    file: "src/demo/synthetic-roster.ts",
    lines: 630,
    on: U15,
    why: "The 20 example personas (founder decision G-SYN-3). Data, one persona per block. It shortens only by having fewer example profiles, which is the founder's call and not this lane's.",
  },
  {
    file: "src/matching/corpus.ts",
    lines: 1200,
    on: U15,
    why: "The compliance corpus: every phrase the linter judges, with its verdict. Pure data, and the largest file in the tree by design — a corpus split across files is a corpus somebody greps half of.",
  },
  {
    file: "src/matching/needs.ts",
    lines: 930,
    on: U15,
    why: "The need extractor: the cues, their negations and the evidence each produces. R2 is the unit that splits cue data from extraction logic; until then the two are one file because the cue list is meaningless without the rule that reads it.",
  },
  {
    file: "src/matching/read.ts",
    lines: 920,
    on: U15,
    why: "The reader that turns a person's sentence into a request. Same shape and same fate as needs.ts, and the two are deliberately symmetrical.",
  },
  {
    file: "src/sim/harness.ts",
    lines: 620,
    on: U15,
    why: "W48's fleet simulation — one process running N practices, with the clock, the arrival model and the assertions in one place because a simulation whose clock lives elsewhere is a simulation nobody can reason about.",
  },
];

export interface LongFileFinding {
  readonly kind: "unlisted" | "grown" | "stale" | "no-reason";
  readonly file: string;
  readonly detail: string;
}

/** The measured file lengths against the allowlist, both directions. */
export function longFileFindings(
  measured: Readonly<Record<string, number>>,
  register: readonly LongFile[] = LONG_FILES,
): LongFileFinding[] {
  const out: LongFileFinding[] = [];
  const listed = new Map(register.map((entry) => [entry.file, entry]));
  for (const entry of register) {
    if (entry.why.trim().length < 40) {
      out.push({ kind: "no-reason", file: entry.file, detail: "a length is argued in sentences, not asserted" });
    }
    const now = measured[entry.file];
    if (now === undefined || now <= LONG_FILE_LINES) {
      out.push({ kind: "stale", file: entry.file, detail: `no longer over ${LONG_FILE_LINES} lines — delete the entry and bank the win` });
    } else if (now > entry.lines) {
      out.push({ kind: "grown", file: entry.file, detail: `${now} lines, past the ${entry.lines} that were argued on ${entry.on}` });
    }
  }
  for (const [file, lines] of Object.entries(measured)) {
    if (lines > LONG_FILE_LINES && !listed.has(file)) {
      out.push({ kind: "unlisted", file, detail: `${lines} lines with no dated reason` });
    }
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * LAW 2 — a block written twice is a defect.
 * ──────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * The window, in normalised lines. Twelve because it is long enough that two matching windows are
 * a copied block rather than a shared idiom (an import list, a switch over four cases, a props
 * interface), and short enough to catch a copy somebody edited slightly afterwards.
 */
export const DUPLICATE_WINDOW = 12;

export interface AcceptedDuplicate {
  /** The two files, sorted, so an entry cannot be written twice in different orders. */
  readonly files: readonly [string, string];
  readonly on: string;
  readonly why: string;
}

/**
 * Duplicates this tree has looked at and kept. Empty at U15 — the detector reports none over
 * twelve lines — and the emptiness is declared in `non-vacuous.ts` rather than left to be read as
 * a passing test.
 */
export const ACCEPTED_DUPLICATES: readonly AcceptedDuplicate[] = [];

export interface DuplicateFinding {
  readonly kind: "unaccepted" | "stale-acceptance";
  readonly detail: string;
}

/** Copied blocks the register has not accepted, and acceptances with nothing left to accept. */
export function duplicateFindings(
  found: readonly DuplicateBlock[],
  accepted: readonly AcceptedDuplicate[] = ACCEPTED_DUPLICATES,
): DuplicateFinding[] {
  const key = (a: string, b: string): string => [a, b].sort().join(" | ");
  const ok = new Set(accepted.map((entry) => key(entry.files[0], entry.files[1])));
  const seen = new Set<string>();
  const out: DuplicateFinding[] = [];
  for (const block of found) {
    const k = key(block.left, block.right);
    if (ok.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push({
      kind: "unaccepted",
      detail: `${block.lines} identical lines in ${block.left}:${block.leftAt} and ${block.right}:${block.rightAt} — extract it, or accept it with a reason`,
    });
  }
  for (const entry of accepted) {
    if (!seen.has(key(entry.files[0], entry.files[1])) && !found.some((b) => key(b.left, b.right) === key(entry.files[0], entry.files[1]))) {
      out.push({ kind: "stale-acceptance", detail: `${entry.files.join(" | ")} no longer share a block — delete the acceptance` });
    }
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * LAW 3 — a module needed by exactly one other is a shape to look at, not a crime.
 * ──────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * The single-importer census is a CEILING, not a list.
 *
 * Naming all 63 would be a register nobody reads and every unit would have to edit; what a
 * refactor lane actually needs is the number, moving downward. U14's ratchet already pins it
 * (`src-single-importer-modules`), so this law is enforced there and stated here, and the two
 * agree by construction: this constant IS the census key.
 */
export const SINGLE_IMPORTER_MEASURE = "src-single-importer-modules";

/**
 * A module imported by nothing but its own test is the one shape that is always wrong — it is a
 * module that exists to be tested. The census reports it as `src-test-held-modules`, and U15's law
 * is that the count may not rise; U30 is where the population is worked down.
 */
export const TEST_HELD_MEASURE = "src-test-held-modules";
