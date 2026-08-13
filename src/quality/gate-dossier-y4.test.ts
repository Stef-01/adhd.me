// W207: the Y4 gate dossier's arithmetic, checked against the ledger it was derived from.
//
// A gate dossier is read by a founder deciding what to schedule, and its value is entirely in the
// counts being current. "G5 releases seven units" is true on the day it is written and becomes a
// lie silently — a unit unblocks, a new one lands blocked, and nobody re-reads the document.
//
// So these are not tests of the prose. They derive the same numbers from `BUILD-STATE.md` and
// fail when the document and the ledger stop agreeing, which is the only failure mode a dossier
// has that a reader cannot see.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const LEDGER = readFileSync(path.join(ROOT, "BUILD-STATE.md"), "utf8");
const DOSSIER = readFileSync(path.join(ROOT, "docs", "GATE-DOSSIER-Y4.md"), "utf8");

/**
 * The last unit that existed when this dossier was written.
 *
 * W208 added Year 5 and five of its rows are `blocked` from day one, which broke every count here
 * — correctly, in the sense that the test noticed, and wrongly, in the sense that the Y4 dossier
 * did not become inaccurate when Year 5 was planned. **A point-in-time document pinned against
 * the LIVE ledger is pinned against a moving target**, and every future year-close dossier
 * inherits the same bug unless it scopes itself the way this now does. The document prices the
 * decisions outstanding at the close of Year 4; rows numbered above W208 are a later year's
 * problem and belong to a later dossier.
 */
const Y4_LAST_UNIT = 208;

/** Rows the ledger marks blocked, as of the close of Year 4. */
const blockedRows = (): { id: string; note: string }[] =>
  LEDGER.split("\n")
    .filter((line) => /^\| [A-Z0-9-]+ \| blocked \|/.test(line))
    .map((line) => {
      const cells = line.split("|").map((c) => c.trim());
      return { id: cells[1]!, note: cells.slice(6).join("|") };
    })
    // Un-numbered rows (SUP-1, SUP-2) are Y2-era and stay in scope; W209+ are Year 5.
    .filter((row) => {
      const numbered = /^W(\d+)$/.exec(row.id);
      return !numbered || Number(numbered[1]) <= Y4_LAST_UNIT;
    });

/**
 * The gate a row is BLOCKED ON — the first one its note names.
 *
 * Not `note.includes(gate)`: W133's note records that W195 corrected its attribution AWAY from
 * G6, so a substring match counts it as a G6 blocker and reproduces the very mislabel the
 * correction removed. A sweep that reads any mention as the blocker is how the mislabel survived
 * two quarters in the first place.
 */
const blockingGate = (note: string): string => {
  const corrected = note.replace(/CORRECTED THIS ATTRIBUTION FROM[^.]*/i, "");
  return /FOUNDER GATE G\d/.exec(corrected)?.[0] ?? /FOUNDER DECISION/.exec(corrected)?.[0] ?? "";
};

const waitingOn = (gate: string) =>
  blockedRows()
    .filter((row) => blockingGate(row.note) === gate)
    .map((row) => row.id);

/**
 * The dossier's own table, row by row: which decision, and which units it names as released.
 *
 * Only the LEADING list in the units cell counts. Everything after the first ", and" is
 * commentary about things that are not blocked rows — W56's values (`in-progress`, container
 * already shipped), the usefulness of W131/W137, the fact that G3 opens nothing without G1/G2 —
 * and folding those into the arithmetic is how a count stops matching the ledger.
 */
const dossierTableRows = (): { label: string; ids: string[] }[] =>
  DOSSIER.split("\n")
    .filter((line) => /^\| \*\*(G\d|Q9 action 1)\*\*/.test(line))
    .map((line) => {
      const cells = line.split("|").map((c) => c.trim());
      const label = /\*\*(G\d|Q9 action 1)\*\*/.exec(cells[1]!)![1]!;
      return { label, ids: cells[2]!.split(/, and /)[0]!.match(/W\d+|SUP-\d/g) ?? [] };
    });

const gateOf = (label: string) =>
  label.startsWith("G") ? `FOUNDER GATE ${label}` : "FOUNDER DECISION";

describe("W207 the dossier counts what the ledger actually says", () => {
  it("finds blocked rows to count", () => {
    // Guard against every assertion below passing because the parse returned nothing.
    expect(blockedRows().length).toBeGreaterThan(5);
  });

  it("names every blocked unit somewhere in the dossier", () => {
    // A blocked unit missing from the gate dossier is a unit whose founder decision nobody is
    // being asked to make — which is how a row stops being anybody's.
    //
    // NECESSARY BUT NOT SUFFICIENT, and the two tests below are why. Deleting SUP-2 from the G5
    // row of the table left this assertion green, because SUP-2 is still named in the prose
    // further down. "Mentioned somewhere" is not "counted in the arithmetic", and the arithmetic
    // is the only thing this document is for.
    const missing = blockedRows()
      .map((row) => row.id)
      .filter((id) => !DOSSIER.includes(id));
    expect(missing, "blocked units absent from the Y4 dossier").toEqual([]);
  });

  it("names in each table row exactly the units the ledger attributes to that decision", () => {
    const rows = dossierTableRows();
    expect(rows.map((r) => r.label)).toEqual(["G5", "Q9 action 1", "G9", "G8", "G6", "G3"]);
    for (const row of rows) {
      expect(row.ids.slice().sort(), `${row.label} row`).toEqual(waitingOn(gateOf(row.label)).sort());
    }
  });

  it("accounts for every blocked unit in the table, exactly once", () => {
    // The table is the document. A unit that appears in no row is a unit whose cost is in nobody's
    // total; a unit in two rows is counted twice. Both are arithmetic errors a reader cannot see.
    const listed = dossierTableRows().flatMap((row) => row.ids);
    expect(new Set(listed).size, "a unit listed under two decisions").toBe(listed.length);
    expect(listed.sort()).toEqual(blockedRows().map((row) => row.id).sort());
  });

  it("agrees with the ledger about G6 releasing exactly one unit", () => {
    // The dossier's headline arithmetic: the decision open longest releases the fewest units.
    // W195 corrected W133 off G6; if anything is re-attributed to it, the claim changes.
    const g6 = waitingOn("FOUNDER GATE G6");
    expect(g6).toEqual(["W185"]);
    expect(DOSSIER).toContain("**1** (W185)");
  });

  it("agrees that four units wait on gates nobody has ruled on", () => {
    const proposed = blockedRows().filter((row) => /PROPOSED|proposed, unratified/i.test(row.note));
    expect(proposed.map((r) => r.id).sort()).toEqual(["W146", "W147", "W202", "W203"]);
    expect(DOSSIER).toContain("Four of the thirteen blocked units wait on gates nobody has ruled on");
  });

  it("agrees on the total, which the first draft of the dossier got wrong", () => {
    // The document said eleven. It is thirteen: my count came from a grep that required the
    // `**FOUNDER GATE` bold prefix, and SUP-1 and SUP-2 name their gate mid-sentence. A dossier
    // whose arithmetic nobody re-derives is a dossier that drifts on the day it is written.
    expect(blockedRows()).toHaveLength(13);
    expect(DOSSIER).toContain("thirteen blocked units");
  });

  it("counts G5's blocked units, and the dossier's seven includes W56's values", () => {
    // W56 is `in-progress` rather than `blocked` — its container shipped and only the values
    // wait — so it is not in the blocked list and the dossier says so explicitly rather than
    // letting the arithmetic look wrong.
    const g5 = waitingOn("FOUNDER GATE G5");
    expect(g5.sort()).toEqual(["SUP-1", "SUP-2", "W161", "W162", "W163", "W186"]);
    expect(DOSSIER).toContain("and W56's values");
    expect(LEDGER).toMatch(/\| W56 \| in-progress \|/);
  });
});

describe("W207 the decision with no gate number is still named", () => {
  it("keeps W133 attributed to the Q9 ruling rather than to G6", () => {
    // W195's correction. A decision with no number was invisible to every sweep looking for
    // `FOUNDER GATE G\d` — including W168's own ledger check, which required that pattern and
    // was therefore ENFORCING the mislabel.
    const row = LEDGER.split("\n").find((line) => line.startsWith("| W133 |")) ?? "";
    expect(row).toContain("Q9 action 1");
    expect(DOSSIER).toContain("The most time-critical decision has no gate number");
  });

  it("still passes the ledger's own blocked-row check, which now accepts a named decision", () => {
    const row = LEDGER.split("\n").find((line) => line.startsWith("| W133 |")) ?? "";
    const named =
      /FOUNDER GATE G\d/.test(row) ||
      /FOUNDER DECISION[^|]*docs\/GATE-DOSSIER-[\w.-]+\.md/.test(row);
    expect(named).toBe(true);
  });
});

describe("W207 the asks are ordered by the arithmetic, not by gate number", () => {
  it("puts the Q9 ruling first and the Ahpra review below it", () => {
    // The dossier's whole argument: the decision open longest releases the fewest units, and the
    // most urgent one has no number. An ask list in G-number order would invert both.
    const q9 = DOSSIER.indexOf("Rule A or B on cross-boundary credential visibility");
    const ahpra = DOSSIER.indexOf("Commission or explicitly defer the Ahpra advertising review");
    expect(q9).toBeGreaterThan(-1);
    expect(ahpra).toBeGreaterThan(q9);
  });

  it("asks for a ruling on the proposed gates rather than treating them as closed", () => {
    // Ratifying or REJECTING both is progress: it converts four units from pending to decided.
    expect(DOSSIER).toContain("Ratify or reject G8 and G9");
    expect(DOSSIER).toContain("neither open nor closed");
  });
});
