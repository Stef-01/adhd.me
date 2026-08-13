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

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const LEDGER = readFileSync(path.resolve(__dirname, "../../BUILD-STATE.md"), "utf8");

interface Row {
  id: string;
  n: number;
  status: string;
  owner: string;
  claimedAt: string;
  sha: string;
  note: string;
  line: number;
}

const ROW = /^\| (W\d+) \| ([\w-]+) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| (.*) \|\s*$/;

const ROWS: Row[] = LEDGER.split("\n").flatMap((line, index) => {
  const m = ROW.exec(line);
  if (!m) return [];
  return [{
    id: m[1]!,
    n: Number(m[1]!.slice(1)),
    status: m[2]!,
    owner: m[3]!.trim(),
    claimedAt: m[4]!.trim(),
    sha: m[5]!.trim(),
    note: m[6]!,
    line: index + 1,
  }];
});

describe("W168 the ledger is a usable lock", () => {
  it("parses as a table at all", () => {
    // Non-vacuity: every assertion below is over ROWS, so an unparseable ledger would make the
    // whole suite pass by having nothing to check.
    expect(ROWS.length).toBeGreaterThan(200);
    expect(ROWS[0]?.id).toBe("W1");
  });

  it("has no duplicate unit id — the failure this file was written for", () => {
    // A duplicate `available` row next to a completed one is an invitation to redo finished work,
    // and the claim protocol cannot see the difference.
    const seen = new Map<string, number[]>();
    for (const row of ROWS) seen.set(row.id, [...(seen.get(row.id) ?? []), row.line]);
    const duplicated = [...seen.entries()].filter(([, lines]) => lines.length > 1);
    expect(duplicated.map(([id, lines]) => `${id} at lines ${lines.join(", ")}`)).toEqual([]);
  });

  it("has no gaps: every unit from W1 to the last one exists", () => {
    const present = new Set(ROWS.map((r) => r.n));
    const last = Math.max(...present);
    expect([...Array(last).keys()].map((i) => i + 1).filter((n) => !present.has(n))).toEqual([]);
  });

  it("runs in numeric order, because an out-of-order row is where a duplicate hides", () => {
    const out = ROWS.slice(1)
      .map((row, i) => ({ row, prev: ROWS[i]! }))
      .filter(({ row, prev }) => row.n < prev.n)
      .map(({ row, prev }) => `${prev.id} then ${row.id} (line ${row.line})`);
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
    const named = (note: string) =>
      /FOUNDER GATE G\d/.test(note) ||
      /FOUNDER DECISION[^|]*docs\/GATE-DOSSIER-[\w.-]+\.md/.test(note);
    const unexplained = ROWS.filter((r) => r.status === "blocked" && !named(r.note));
    expect(unexplained.map((r) => r.id)).toEqual([]);
  });

  it("still refuses a blocked row that names no decision at all", () => {
    // Non-vacuity for the widening above, in the suite rather than in a scratch run: the
    // loosened matcher must still reject the thing the strict one existed to catch.
    const named = (note: string) =>
      /FOUNDER GATE G\d/.test(note) ||
      /FOUNDER DECISION[^|]*docs\/GATE-DOSSIER-[\w.-]+\.md/.test(note);
    expect(named("blocked because it is hard")).toBe(false);
    expect(named("FOUNDER DECISION — somebody should rule on this")).toBe(false);
    expect(named("FOUNDER GATE G5 — not buildable")).toBe(true);
    expect(named("FOUNDER DECISION — Q9 action 1, recorded in docs/GATE-DOSSIER-Q9.md")).toBe(true);
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
});
