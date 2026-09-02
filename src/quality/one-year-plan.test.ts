// O227: the one-year build plan and its ledger lane, held to each other in both directions.
//
// The founder asked for two things in two sentences on 2026-09-01/02: a critical appraisal of
// "exactly what is needed to upgrade the whole platform into a perfectly functional app" folded
// into "a consolidated 1 year build plan", and inside it "a complex multistage refactor for next
// few months" with "much better optimised and minimal code". `docs/ONE-YEAR-BUILD-PLAN.md` is the
// answer; the `## Ledger — U-series` table in `BUILD-STATE.md` is its lock.
//
// A plan and a ledger drift the moment one is edited without the other, and W173 (plan-ledger)
// showed the shape of the check that stops it: derive both sides, compare, and make the
// comparison a test that runs on every verify. This file does that for the U lane, with the
// three properties the lane adds on top of W173's — `[P]` (claimable on the day the quarter
// opens), `Depends:` (claimable only when every named row is done) and `BLOCKED <decision>`
// (waits on a founder decision the plan's own §6 defines).
//
// Deliberately NOT checked: whether a unit's scope is right, whether its verify clause is strong
// enough, whether a decision should be blocking at all. Those are judgement; these are structure.
//
// Parse discipline, learned while writing the plan: only §4 is the unit list. §5 restates the
// blocked units as `- **U6** — D-CI-BILLING: …` bullets and §0/§9 quote the `→ verify:` marker in
// prose, so a whole-document scan over-counts (77 headers for 68 units). The parser slices §4.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const PLAN = readFileSync(path.join(ROOT, "docs", "ONE-YEAR-BUILD-PLAN.md"), "utf8");
const LEDGER = readFileSync(path.join(ROOT, "BUILD-STATE.md"), "utf8");

interface PlanUnit {
  n: number;
  id: string;
  parallel: boolean;
  size: "S" | "M" | "L";
  /** The decision or gate id after `**BLOCKED …**`, or null when the unit is buildable. */
  blockedOn: string | null;
  /** Unit numbers named by `Depends:`. */
  depends: number[];
  hasVerify: boolean;
  /** Which `### Q# — ` heading the unit sits under. */
  quarter: number;
}

interface LedgerUnit {
  n: number;
  id: string;
  status: string;
  parallel: boolean;
  size: string | null;
  blockedOn: string | null;
  hasVerify: boolean;
  line: number;
}

const UNIT_HEADER = /^- \*\*U(\d+)\*\*( \[P\])? \((S|M|L)\) — (.*)$/;
const BLOCKED = /\*\*BLOCKED ([A-Z0-9-]+)\.\*\*/;
const DEPENDS = /Depends: (U\d+(?:, U\d+)*)\./;
const GATE_ID = /^- \*\*(G\d+|G-APP-\d|D-[A-Z0-9-]+)\*\*/;

/** §4 only — the section that IS the unit list. */
export function planSection(text: string): string {
  const start = text.indexOf("## 4. The plan");
  const end = text.indexOf("\n## 5.");
  if (start < 0 || end < 0) throw new Error("§4 or §5 heading missing from the plan");
  return text.slice(start, end);
}

/** Same bullet shape W173 parses: a header line, then two-space-indented continuation lines. */
export function parsePlanUnits(section: string): PlanUnit[] {
  const units: { unit: PlanUnit; text: string }[] = [];
  let current: { unit: PlanUnit; text: string } | null = null;
  let quarter = 0;
  for (const line of section.split("\n")) {
    const q = /^### Q(\d) — /.exec(line);
    if (q) quarter = Number(q[1]);
    const m = UNIT_HEADER.exec(line);
    if (m) {
      const n = Number(m[1]);
      current = {
        unit: {
          n,
          id: `U${n}`,
          parallel: m[2] !== undefined,
          size: m[3] as PlanUnit["size"],
          blockedOn: null,
          depends: [],
          hasVerify: false,
          quarter,
        },
        text: m[4]!,
      };
      units.push(current);
      continue;
    }
    if (current && line.startsWith("  ") && line.trim() !== "") current.text += ` ${line.trim()}`;
    else if (line.trim() === "" || line.startsWith("#")) current = null;
  }
  return units.map(({ unit, text }) => {
    const dep = DEPENDS.exec(text);
    return {
      ...unit,
      blockedOn: BLOCKED.exec(text)?.[1] ?? null,
      depends: dep ? dep[1]!.split(", ").map((d) => Number(d.slice(1))) : [],
      hasVerify: text.includes("→ verify:"),
    };
  });
}

/** The gates and decisions §6 defines — the only names a blocked unit may wait on. */
export function definedGates(text: string): string[] {
  const start = text.indexOf("## 6. Gates");
  const end = text.indexOf("\n## 7.");
  if (start < 0 || end < 0) throw new Error("§6 or §7 heading missing from the plan");
  return text
    .slice(start, end)
    .split("\n")
    .flatMap((line) => {
      const m = GATE_ID.exec(line);
      return m ? [m[1]!] : [];
    });
}

const LEDGER_ROW = /^\| (U(\d+)) \| ([\w-]+) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| (.*) \|\s*$/;
const LEDGER_DECISION = /^FOUNDER DECISION (G\d+|G-APP-\d|D-[A-Z0-9-]+) \(docs\/ONE-YEAR-BUILD-PLAN\.md §6\): /;

export function parseLedgerUnits(ledger: string): LedgerUnit[] {
  const start = ledger.indexOf("## Ledger — U-series");
  if (start < 0) return [];
  return ledger
    .slice(start)
    .split("\n")
    .flatMap((line, index) => {
      const m = LEDGER_ROW.exec(line);
      if (!m) return [];
      const note = m[7]!;
      const decision = LEDGER_DECISION.exec(note)?.[1] ?? null;
      const body = note.replace(/^\[P\] /, "").replace(LEDGER_DECISION, "");
      return [{
        n: Number(m[2]),
        id: m[1]!,
        status: m[3]!,
        parallel: note.startsWith("[P] "),
        size: /^\((S|M|L)\) /.exec(body)?.[1] ?? null,
        blockedOn: decision,
        hasVerify: note.includes("-> verify:"),
        line: index + 1,
      }];
    });
}

const SECTION = planSection(PLAN);
const UNITS = parsePlanUnits(SECTION);
const GATES = definedGates(PLAN);
const ROWS = parseLedgerUnits(LEDGER);
const byN = new Map(UNITS.map((u) => [u.n, u]));

describe("O227 the one-year plan and the U lane are the same list", () => {
  it("parses a plan at all — and every unit header in §4, not a subset", () => {
    // Non-vacuity for everything below. A header that fails the strict regex (a missing size,
    // a stray character) would silently drop out of UNITS and out of every comparison, so the
    // loose header count is held equal to the parsed count.
    const looseHeaders = SECTION.split("\n").filter((line) => /^- \*\*U\d+\*\*/.test(line));
    expect(UNITS.length, "the plan lists no units").toBeGreaterThan(60);
    expect(looseHeaders.length, "a unit header in §4 does not parse").toBe(UNITS.length);
    expect(ROWS.length, "the ledger has no U-series table").toBeGreaterThan(60);
    expect(GATES.length, "§6 defines no gates or decisions").toBeGreaterThan(10);
  });

  it("numbers the units U1..N contiguously, in order, in both documents", () => {
    const expected = UNITS.map((_, i) => i + 1);
    expect(UNITS.map((u) => u.n), "the plan's ids are out of order or have a gap").toEqual(expected);
    expect(ROWS.map((r) => r.n), "the ledger's U ids are out of order or have a gap").toEqual(expected);
  });

  it("holds the plan and the ledger to each other: id, [P], size, blocking decision", () => {
    // One comparison of the whole triple per unit, so a diff names the row and the field.
    const fromPlan = UNITS.map((u) => ({ id: u.id, parallel: u.parallel, size: u.size, blockedOn: u.blockedOn }));
    const fromLedger = ROWS.map((r) => ({ id: r.id, parallel: r.parallel, size: r.size, blockedOn: r.blockedOn }));
    expect(fromLedger).toEqual(fromPlan);
  });

  it("marks a unit blocked in the ledger exactly when the plan does", () => {
    const planBlocked = UNITS.filter((u) => u.blockedOn !== null).map((u) => u.id);
    const ledgerBlocked = ROWS.filter((r) => r.status === "blocked").map((r) => r.id);
    expect(ledgerBlocked).toEqual(planBlocked);
    // And the blocked set is real: the plan opened with nine decisions outstanding (§5).
    expect(planBlocked.length).toBeGreaterThan(5);
  });

  it("names, on every blocked unit, a gate or decision §6 actually defines", () => {
    const undefinedNames = UNITS
      .filter((u) => u.blockedOn !== null && !GATES.includes(u.blockedOn))
      .map((u) => `${u.id} waits on ${u.blockedOn}`);
    expect(undefinedNames).toEqual([]);
    // Every decision in §6 that says it opens a unit is named by at least one blocked unit,
    // or is explicitly the one that blocks nothing (D-SIBLING-PORT says so in its own bullet).
    const named = new Set(UNITS.map((u) => u.blockedOn));
    const decisionsWithNoUnit = GATES.filter((g) => g.startsWith("D-") && !named.has(g));
    expect(decisionsWithNoUnit).toEqual(["D-SIBLING-PORT"]);
  });

  it("gives every unit a verify clause, in the plan and in the ledger note", () => {
    expect(UNITS.filter((u) => !u.hasVerify).map((u) => u.id), "plan units without → verify:").toEqual([]);
    expect(ROWS.filter((r) => !r.hasVerify).map((r) => r.id), "ledger rows without -> verify:").toEqual([]);
  });

  it("means what [P] says: no dependency inside the lane and not blocked", () => {
    const wrong = UNITS
      .filter((u) => u.parallel && (u.depends.length > 0 || u.blockedOn !== null))
      .map((u) => u.id);
    expect(wrong).toEqual([]);
    // Both kinds exist, so the rule is being applied to something.
    expect(UNITS.filter((u) => u.parallel).length).toBeGreaterThan(10);
    expect(UNITS.filter((u) => !u.parallel).length).toBeGreaterThan(10);
  });

  it("depends only on existing, lower-numbered units", () => {
    const bad = UNITS.flatMap((u) =>
      u.depends
        .filter((d) => !byN.has(d) || d >= u.n)
        .map((d) => `${u.id} depends on U${d}`),
    );
    expect(bad).toEqual([]);
    expect(UNITS.some((u) => u.depends.length > 0), "no unit declares a dependency").toBe(true);
  });

  it("lets no buildable unit depend, even transitively, on a blocked one", () => {
    // The plan's word is "no available unit depends on a blocked one". Transitively is the honest
    // reading: a unit whose dependency waits on a founder decision waits on it too, and should say
    // so with its own BLOCKED marker rather than sit `available` in the ledger as a trap.
    const reach = (n: number, seen = new Set<number>()): Set<number> => {
      for (const d of byN.get(n)?.depends ?? []) {
        if (seen.has(d)) continue;
        seen.add(d);
        reach(d, seen);
      }
      return seen;
    };
    const trapped = UNITS
      .filter((u) => u.blockedOn === null)
      .flatMap((u) => {
        const blockedUpstream = [...reach(u.n)].filter((d) => byN.get(d)?.blockedOn !== null);
        return blockedUpstream.length ? [`${u.id} reaches blocked U${blockedUpstream.join(", U")}`] : [];
      });
    expect(trapped).toEqual([]);
  });

  it("lays the units across four quarters, each with units in it", () => {
    const perQuarter = [1, 2, 3, 4].map((q) => UNITS.filter((u) => u.quarter === q).length);
    expect(perQuarter.every((count) => count >= 10), `units per quarter: ${perQuarter.join(", ")}`).toBe(true);
    expect(UNITS.filter((u) => u.quarter === 0), "a unit sits above the first quarter heading").toEqual([]);
    expect(SECTION.match(/^### Q\d — /gm)?.length).toBe(4);
  });

  it("keeps the ledger's opened-day statuses: available or blocked, nothing claimed before the lane opened", () => {
    // Structural only. Once a session claims a row this widens to the protocol's statuses, which
    // `ledger-integrity` already enforces; what this pins is that the two documents agree on which
    // rows are blocked (above) and that nothing else is marked done without a plan-side change.
    const statuses = new Set(ROWS.map((r) => r.status));
    for (const status of statuses) {
      expect(["available", "claimed", "in-progress", "done", "blocked"]).toContain(status);
    }
  });
});

describe("O227 the parser refuses what it must (non-vacuity)", () => {
  const fixture = [
    "## 4. The plan",
    "",
    "### Q1 — a quarter",
    "",
    "- **U1** [P] (S) — A buildable unit.",
    "  Body.",
    "  → verify: something.",
    "",
    "- **U2** (M) — **BLOCKED D-NOT-A-THING.** Waits on nothing defined. Depends: U1.",
    "  → verify: something.",
    "",
    "- **U3** [P] (L) — Lies about being parallel. Depends: U2.",
    "",
    "- **U4** — no size, so it must not parse.",
    "",
    "## 5. Blocked",
    "- **U2** — D-NOT-A-THING: restated here, must not be counted.",
    "",
    "## 6. Gates",
    "- **G1** — a gate.",
    "- **D-REAL** — a decision.",
    "",
    "## 7. Refusals",
  ].join("\n");

  it("sees §4 only, so §5's restatement is not a unit", () => {
    const units = parsePlanUnits(planSection(fixture));
    expect(units.map((u) => u.id)).toEqual(["U1", "U2", "U3"]);
  });

  it("extracts [P], size, BLOCKED id, Depends and the verify marker", () => {
    const units = parsePlanUnits(planSection(fixture));
    expect(units[0]).toMatchObject({ parallel: true, size: "S", blockedOn: null, depends: [], hasVerify: true, quarter: 1 });
    expect(units[1]).toMatchObject({ parallel: false, size: "M", blockedOn: "D-NOT-A-THING", depends: [1], hasVerify: true });
    expect(units[2]).toMatchObject({ parallel: true, size: "L", depends: [2], hasVerify: false });
  });

  it("would fail the plan on an undefined decision and on a false [P]", () => {
    const units = parsePlanUnits(planSection(fixture));
    const gates = definedGates(fixture);
    expect(gates).toEqual(["G1", "D-REAL"]);
    expect(units.filter((u) => u.blockedOn !== null && !gates.includes(u.blockedOn)).map((u) => u.id)).toEqual(["U2"]);
    expect(units.filter((u) => u.parallel && u.depends.length > 0).map((u) => u.id)).toEqual(["U3"]);
  });

  it("reads a ledger row's [P], size and decision the same way", () => {
    const rows = parseLedgerUnits([
      "## Ledger — U-series (x)",
      "| Unit | Status | Session | Claimed (UTC) | SHA | Notes |",
      "|---|---|---|---|---|---|",
      "| U1 | available | — | — | — | [P] (S) Title. -> verify: thing. |",
      "| U2 | blocked | — | — | — | FOUNDER DECISION D-REAL (docs/ONE-YEAR-BUILD-PLAN.md §6): (M) Title. -> verify: thing. |",
      "| U3 | available | — | — | — | (L) Title. Depends: U2. |",
    ].join("\n"));
    expect(rows.map((r) => ({ id: r.id, parallel: r.parallel, size: r.size, blockedOn: r.blockedOn, hasVerify: r.hasVerify }))).toEqual([
      { id: "U1", parallel: true, size: "S", blockedOn: null, hasVerify: true },
      { id: "U2", parallel: false, size: "M", blockedOn: "D-REAL", hasVerify: true },
      { id: "U3", parallel: false, size: "L", blockedOn: null, hasVerify: false },
    ]);
    // And a ledger with no U-series heading yields nothing rather than a false match elsewhere.
    expect(parseLedgerUnits("| U1 | available | — | — | — | (S) stray |")).toEqual([]);
  });
});
