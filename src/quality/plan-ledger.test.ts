// W208: the plan and the ledger must describe the same build, and until now nobody checked.
//
// The §6 expansion rule says each year's last week expands the next year into 13-unit quarters
// "appended to this plan (§5 extension) with matching rows in `BUILD-STATE.md`". Three expansions
// have run — W52, W104, W156 — and each verified the match BY HAND. W156's commit message says
// "plan and ledger checked unit-for-unit".
//
// W168 was written because the previous hand-checked ledger property broke silently: a rebase in
// W166 left W167 in the table twice, once `done` and once `available`, and the claim protocol
// could not tell the difference. The lesson recorded there was that a hand-check fails at the
// moment nobody is looking, which is every moment. The plan↔ledger property is the same class and
// was still being checked the same failing way, so this unit expands Year 5 AND stops the
// expansion from being a promise.
//
// Three properties, and the third is the one with teeth.
//
//   THE SAME UNITS, BOTH DIRECTIONS. A unit planned and never laid into the ledger is a unit no
//   session can claim; a ledger row with no plan entry is work with no stated scope. Neither is
//   visible from one file.
//
//   EVERY PLANNED UNIT STATES A VERIFY GATE. §7's definition of done requires one, and a unit
//   whose gate is "build the thing" cannot be finished wrongly, because it cannot be finished.
//
//   FOUNDER GATES ARE INHERITED, NEVER EXPANDED AWAY. Every expansion has promised this in prose.
//   Here it is a check: every gate a blocked row names must be DEFINED in §4 of the plan. That
//   catches both directions of the failure — an expansion inventing a gate that was never written
//   down, and a gate being edited out of §4 while rows still wait on it. W195 found the sibling of
//   this: a row blocked on `G6` that G6 did not actually block, enforced by a matcher that
//   demanded a number.
//
// What is deliberately NOT checked, on W168's reasoning: whether a unit is well-chosen, whether a
// quarter's theme was honoured, whether a verify gate is a good one. Those are judgements, and a
// scan that pretended to make them would be the green-scan-on-text-nobody-read failure W153
// refused.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const PLAN = readFileSync(path.join(ROOT, "docs/FIVE-YEAR-PLAN.md"), "utf8");
const LEDGER = readFileSync(path.join(ROOT, "BUILD-STATE.md"), "utf8");

interface PlanUnit {
  id: string;
  n: number;
  text: string;
  line: number;
}

/**
 * The plan's unit bullets, with wrapped lines joined.
 *
 * Bullets wrap in the Year 2 and Year 3 sections, so a line-at-a-time reader finds 22 units with
 * no verify gate that all have one. Continuation lines are indented; a blank line or a heading
 * ends the bullet.
 */
function planUnits(): PlanUnit[] {
  const out: PlanUnit[] = [];
  let current: PlanUnit | null = null;
  PLAN.split("\n").forEach((line, index) => {
    const start = /^- \*\*(W(\d+))\*\* (.*)$/.exec(line);
    if (start) {
      current = { id: start[1]!, n: Number(start[2]), text: start[3]!.trim(), line: index + 1 };
      out.push(current);
      return;
    }
    if (current && line.startsWith("  ") && line.trim() !== "") {
      current.text += ` ${line.trim()}`;
      return;
    }
    if (line.trim() === "" || line.startsWith("#")) current = null;
  });
  return out;
}

const LEDGER_ROW = /^\| (W\d+) \| ([\w-]+) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| (.*) \|\s*$/;

function ledgerRows(): Array<{ id: string; n: number; status: string; note: string }> {
  return LEDGER.split("\n").flatMap((line) => {
    const m = LEDGER_ROW.exec(line);
    if (!m) return [];
    return [{ id: m[1]!, n: Number(m[1]!.slice(1)), status: m[2]!, note: m[6]! }];
  });
}

/** The gates §4 actually defines. Read from the plan, so a gate deleted there is a gate gone. */
function definedGates(): string[] {
  const section = PLAN.slice(PLAN.indexOf("## 4. Founder gates"), PLAN.indexOf("\n## 5. Year 1"));
  return [...section.matchAll(/^- \*\*(G\d+)\*\*/gm)].map((m) => m[1]!).sort();
}

describe("W208 the plan and the ledger describe the same build", () => {
  it("parses both files at all", () => {
    // Non-vacuity first: every assertion below is over these two lists, so a format change that
    // silently emptied either one would make the whole file pass.
    expect(planUnits().length).toBeGreaterThan(250);
    expect(ledgerRows().length).toBeGreaterThan(250);
    expect(planUnits()[0]?.id).toBe("W1");
    expect(definedGates().length).toBeGreaterThan(8);
  });

  it("names the same units in both directions", () => {
    // The property W52, W104 and W156 each checked by hand. A planned unit missing from the ledger
    // cannot be claimed by any session; a ledger row with no plan entry has no stated scope.
    const planned = planUnits().map((u) => u.id);
    const laid = ledgerRows().map((r) => r.id);
    expect([...planned].sort()).toEqual([...laid].sort());
    expect(planned).toEqual([...planned].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))));
  });

  it("states a verify gate for every planned unit", () => {
    // §7's definition of done requires the unit's own gate to pass. A unit with no gate is a unit
    // that cannot be finished wrongly because it cannot be finished.
    const gateless = planUnits()
      .filter((u) => !/→ verify:/.test(u.text))
      .map((u) => `${u.id} (plan line ${u.line})`);
    expect(gateless).toEqual([]);
  });

  it("keeps a blocked row pointing at a gate the plan still defines", () => {
    // "Founder gates are inherited, never expanded away" — as a check rather than a promise.
    // Catches an expansion inventing a gate nobody wrote down, and a gate edited out of §4 while
    // rows still wait on it.
    const defined = new Set(definedGates());
    const dangling: string[] = [];
    for (const row of ledgerRows()) {
      if (row.status !== "blocked") continue;
      for (const match of row.note.matchAll(/\bFOUNDER GATE (G\d+)\b/g)) {
        const gate = match[1]!;
        if (!defined.has(gate)) dangling.push(`${row.id} waits on ${gate}, which §4 does not define`);
      }
    }
    expect(dangling).toEqual([]);
  });

  it("would notice a gate that the plan does not define", () => {
    // Non-vacuity for the check above: it is only worth anything if an undefined gate fails it.
    const defined = new Set(definedGates());
    expect(defined.has("G5")).toBe(true);
    expect(defined.has("G10")).toBe(true);
    expect(defined.has("G99")).toBe(false);
  });

  it("expands in whole quarters of thirteen", () => {
    // The §6 rule's unit of expansion. A short quarter means a theme was dropped part-way, which
    // is the failure mode of expanding while tired at the end of a year.
    const last = Math.max(...planUnits().map((u) => u.n));
    expect(last % 13, `the ledger ends at W${last}, which is not a whole quarter`).toBe(0);
    expect(last).toBeGreaterThanOrEqual(260);
  });

  it("gives Year 5 the same shape every other year has", () => {
    // W208's own output, checked rather than asserted in a commit message — which is exactly the
    // thing this file exists to stop.
    const y5 = planUnits().filter((u) => u.n >= 209 && u.n <= 260);
    expect(y5.length).toBe(52);
    const byId = new Map(ledgerRows().map((r) => [r.id, r]));
    for (const unit of y5) {
      expect(byId.get(unit.id), `${unit.id} is planned but not in the ledger`).toBeDefined();
    }
    // Blocked from day one rather than discovered blocked, per §5e's first and fifth residues.
    const blocked = y5.filter((u) => byId.get(u.id)!.status === "blocked");
    expect(blocked.map((u) => u.id)).toEqual(["W217", "W240", "W241", "W249", "W251"]);
  });
});
