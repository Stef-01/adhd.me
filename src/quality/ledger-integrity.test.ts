// W168: the claim ledger is the lock, and nothing was checking it.
//
// `BUILD-STATE.md` is not documentation. Its header says "this file IS the lock": sessions claim
// a row before building, and the row is what stops two builders doing the same unit. Every
// expansion week (W52, W104, W156) verified its integrity BY HAND and wrote "no gaps, no
// duplicates" in a commit message.
//
// This week that control failed, and it failed in the way hand-checks always do — nobody was
// looking at the moment it broke. Resolving a rebase conflict in W166 kept BOTH sides of the
// conflicted region, leaving the ledger with W166 twice and W167 twice: one W166 `claimed`
// alongside the real `done`, and — the one that matters — **a stale W167 row still marked
// `available` next to builder-B's completed W167**. A builder following the claim protocol would
// have picked up the available row and rebuilt a unit that was already done. The lock had a
// duplicate key and said nothing.
//
// So the check stops being a habit. Same shape as W102's surface census, W106's record classes,
// W140's referral scoping and W150's copy modules: the property is derived from the artefact
// rather than asserted about it, and it fails the suite the moment it stops holding.
//
// What is deliberately NOT checked: the CONTENT of a row. Whether a note is honest, whether a
// SHA is the right SHA, whether a blocked unit is genuinely blocked — none of that is mechanical,
// and pretending otherwise would be the "green scan on text nobody read" failure W153 refused.
// These are the structural properties only, which is exactly why they can be trusted.
//
// WIDENED 2026-08-25 (loop-0825b): this file only ever matched `W\d+`, so when the AR-series
// table (opened 2026-08-22) got its own duplicate-id collision — `loop-0825a` reused
// `AR25`/`AR26`/`AR27` for different work without clearing the original template rows — the
// exact defect this file exists to catch sat in `main` for a day, invisible to a suite that
// never looked at that table. Gaps and numeric order are properties of ONE series' own numbering
// (AR1 and W1 sharing `n=1` is not a collision), so those two checks now run PER SERIES; the rest
// (duplicate id, done-has-sha, blocked-names-gate, owner+timestamp, valid statuses,
// no-orphaned-done) were already keyed off the full id string and needed no change to cover AR.
//
// WIDENED AGAIN 2026-09-02 (O227): the one-year build plan (`docs/ONE-YEAR-BUILD-PLAN.md`) opened
// a third table, the U-series, and the same regex gap would have left it unchecked. Its blocked
// rows name a `FOUNDER DECISION` written in that plan's §6 rather than in a gate dossier, so the
// blocked-names-gate matcher accepts that document too — under the same rule as before: an
// un-numbered decision must point at where it is written down, never merely at "the founder".
// `src/quality/one-year-plan.test.ts` holds the U rows to the plan itself in both directions.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const LEDGER = readFileSync(path.resolve(__dirname, "../../BUILD-STATE.md"), "utf8");

interface Row {
  id: string;
  series: string;
  n: number;
  status: string;
  owner: string;
  claimedAt: string;
  sha: string;
  note: string;
  line: number;
}

const ROW = /^\| ((W|AR|U)(\d+)) \| ([\w-]+) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| (.*) \|\s*$/;

const ROWS: Row[] = LEDGER.split("\n").flatMap((line, index) => {
  const m = ROW.exec(line);
  if (!m) return [];
  return [{
    id: m[1]!,
    series: m[2]!,
    n: Number(m[3]!),
    status: m[4]!,
    owner: m[5]!.trim(),
    claimedAt: m[6]!.trim(),
    sha: m[7]!.trim(),
    note: m[8]!,
    line: index + 1,
  }];
});

const SERIES_NAMES = [...new Set(ROWS.map((r) => r.series))];

// What a blocked row must say. A numbered gate, or an un-numbered founder decision that points at
// the document where it is written down: a gate dossier (W195) or the one-year build plan's §6
// (O227). "FOUNDER DECISION" followed by nothing a reader can open is not a name.
const named = (note: string): boolean =>
  /FOUNDER GATE G\d/.test(note) ||
  /FOUNDER DECISION[^|]*docs\/GATE-DOSSIER-[\w.-]+\.md/.test(note) ||
  /FOUNDER DECISION[^|]*docs\/ONE-YEAR-BUILD-PLAN\.md/.test(note);

describe("W168 the ledger is a usable lock", () => {
  it("parses as a table at all", () => {
    // Non-vacuity: every assertion below is over ROWS, so an unparseable ledger would make the
    // whole suite pass by having nothing to check. All three series are asserted present so a
    // regex change that silently stopped matching one of them (W168's own 2026-08-25 near-miss)
    // fails here rather than by omission.
    expect(ROWS.length).toBeGreaterThan(200);
    expect(ROWS.filter((r) => r.series === "W")[0]?.id).toBe("W1");
    expect(ROWS.filter((r) => r.series === "AR").length).toBeGreaterThan(30);
    expect(ROWS.filter((r) => r.series === "U")[0]?.id).toBe("U1");
    expect(ROWS.filter((r) => r.series === "U").length).toBeGreaterThan(60);
  });

  it("has no duplicate unit id — the failure this file was written for", () => {
    // A duplicate `available` row next to a completed one is an invitation to redo finished work,
    // and the claim protocol cannot see the difference. Checked over the full id (e.g. "AR25"),
    // so W12 and AR12 are correctly distinct and never flagged against each other.
    const seen = new Map<string, number[]>();
    for (const row of ROWS) seen.set(row.id, [...(seen.get(row.id) ?? []), row.line]);
    const duplicated = [...seen.entries()].filter(([, lines]) => lines.length > 1);
    expect(duplicated.map(([id, lines]) => `${id} at lines ${lines.join(", ")}`)).toEqual([]);
  });

  it("has no gaps, within each series: every unit from 1 to the last one exists", () => {
    // Per-series, not global: AR1 and W1 legitimately share n=1 in different numbering families
    // (the AR-series table's own header states this — ids exist so they cannot collide with the
    // loop's O-numbers — and the same reasoning applies to gap-checking their numbers).
    const gaps: string[] = [];
    for (const series of SERIES_NAMES) {
      const present = new Set(ROWS.filter((r) => r.series === series).map((r) => r.n));
      const last = Math.max(...present);
      for (let n = 1; n <= last; n++) if (!present.has(n)) gaps.push(`${series}${n}`);
    }
    expect(gaps).toEqual([]);
  });

  it("runs in numeric order within each series, because an out-of-order row is where a duplicate hides", () => {
    const out: string[] = [];
    for (const series of SERIES_NAMES) {
      const rows = ROWS.filter((r) => r.series === series);
      for (let i = 1; i < rows.length; i++) {
        if (rows[i]!.n < rows[i - 1]!.n) {
          out.push(`${rows[i - 1]!.id} then ${rows[i]!.id} (line ${rows[i]!.line})`);
        }
      }
    }
    expect(out).toEqual([]);
  });

  it("gives every done unit a commit SHA to point at", () => {
    // "Done" with no SHA is a claim about work nobody can find.
    const missing = ROWS.filter((r) => r.status === "done" && !/^[0-9a-f]{7,40}\b/.test(r.sha));
    expect(missing.map((r) => `${r.id} (sha field: "${r.sha}")`)).toEqual([]);
  });

  it("makes every blocked unit name what the founder has to decide", () => {
    // The founder needs to read the ledger and see what their decision unblocks. A blocked row
    // that names nothing is a unit that has quietly stopped being anybody's.
    //
    // W195 widened this from `FOUNDER GATE G\d` alone, and the reason is a finding rather than a
    // convenience: NOT EVERY FOUNDER BLOCKER IS A NUMBERED GATE. W133 waits on the A-or-B ruling
    // on cross-boundary credential visibility, which is a founder decision with no G-number —
    // and while the matcher demanded one, the row carried `FOUNDER GATE G6`, which does not
    // block it at all. The narrow check was therefore ENFORCING a mislabel: the only way to
    // satisfy it was to name a numbered gate, true or not.
    //
    // Deliberately not widened to "mentions a founder": an un-numbered decision must point at
    // the document where it is written down, so a reader can find the actual question.
    //
    // O227 added the second document: the one-year build plan's §6 is where its nine
    // `FOUNDER DECISION D-…` ids are defined, and `one-year-plan.test.ts` checks each blocked
    // U row's id against that section — this matcher only needs to know the note points there.
    const unexplained = ROWS.filter((r) => r.status === "blocked" && !named(r.note));
    expect(unexplained.map((r) => r.id)).toEqual([]);
  });

  it("still refuses a blocked row that names no decision at all", () => {
    // Non-vacuity for the widening above, in the suite rather than in a scratch run: the
    // loosened matcher must still reject the thing the strict one existed to catch.
    expect(named("blocked because it is hard")).toBe(false);
    expect(named("FOUNDER DECISION — somebody should rule on this")).toBe(false);
    expect(named("FOUNDER DECISION D-CI-BILLING — the plan says so")).toBe(false);
    expect(named("FOUNDER GATE G5 — not buildable")).toBe(true);
    expect(named("FOUNDER DECISION — Q9 action 1, recorded in docs/GATE-DOSSIER-Q9.md")).toBe(true);
    expect(named("FOUNDER DECISION D-CI-BILLING (docs/ONE-YEAR-BUILD-PLAN.md §6): (S) The first green run.")).toBe(true);
  });

  it("gives every claimed or in-progress unit an owner and a timestamp", () => {
    // The staleness rule (W54) is evidence-based and needs both to work: with no claim time, a
    // row can never be reclaimed, and with no owner nobody knows whose it is.
    const active = ROWS.filter((r) => r.status === "claimed" || r.status === "in-progress");
    for (const row of active) {
      expect(row.owner, `${row.id} has no owner`).not.toBe("—");
      expect(row.owner, `${row.id} has no owner`).not.toBe("");
      expect(row.claimedAt, `${row.id} has no claim time`).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it("uses only the statuses the protocol defines", () => {
    // A typo'd status is a row no protocol branch handles — neither claimable nor finished.
    const allowed = new Set(["available", "claimed", "in-progress", "done", "blocked"]);
    const strange = ROWS.filter((r) => !allowed.has(r.status));
    expect(strange.map((r) => `${r.id}: ${r.status}`)).toEqual([]);
  });

  it("leaves no unit both unowned and finished", () => {
    const orphaned = ROWS.filter((r) => r.status === "done" && (r.owner === "—" || r.owner === ""));
    expect(orphaned.map((r) => r.id)).toEqual([]);
  });

  it("regression: the 2026-08-25 AR25/AR26/AR27 collision stays fixed", () => {
    // The concrete incident this widening exists for: loop-0825a reused these three ids for
    // zero-state hardening work without clearing the original Phase-4 template rows, so each id
    // named two different rows for a day. loop-0825b renumbered the never-claimed originals to
    // AR37/AR38/AR39 (docs/AESTHETIC-REVIEW-PLAN.md updated to match). Pinned by id and status,
    // not just by count, so a future edit cannot silently reintroduce the exact collision.
    for (const id of ["AR25", "AR26", "AR27"]) {
      const rows = ROWS.filter((r) => r.id === id);
      expect(rows, `${id} should exist exactly once`).toHaveLength(1);
      expect(rows[0]?.status, `${id} should still be the completed row, not a reverted duplicate`).toBe("done");
    }
    for (const id of ["AR37", "AR38", "AR39"]) {
      const rows = ROWS.filter((r) => r.id === id);
      expect(rows, `${id} (renumbered original) should exist exactly once`).toHaveLength(1);
    }
  });

  it("regression: the same-day AR28 collision, found mid-rebase, stays fixed too", () => {
    // Fetching to push the fix above found loop-0825a had, in the interim, claimed and finished
    // AR28 for unrelated fold-probe work over the same never-claimed Phase-4 placeholder ("the
    // console's practice flow") — the identical collision shape happening again before the
    // widened check had even landed. AR28's done row is untouched; the original moved to AR40.
    const ar28 = ROWS.filter((r) => r.id === "AR28");
    expect(ar28, "AR28 should exist exactly once").toHaveLength(1);
    expect(ar28[0]?.status, "AR28 should be the completed fold-probe unit, not a reverted duplicate").toBe("done");
    const ar40 = ROWS.filter((r) => r.id === "AR40");
    expect(ar40, "AR40 (renumbered original AR28) should exist exactly once").toHaveLength(1);
  });
});
