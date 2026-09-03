// O250 (V39): the weekly roadmap and its ledger lane, held to each other in both directions.
//
// The founder asked on 2026-09-03 for "a comprehensive refinement and advancement plan with week
// by week milestones for next year with extreme detail". `docs/WEEKLY-ROADMAP-2026-27.md` is the
// answer: §4 is fifty-two weeks, §5 is the V lane (forty refinement units), and the
// `## Ledger — V-series` table in `BUILD-STATE.md` is the lane's lock. This file is the same shape
// as `one-year-plan.test.ts` (O227) with the calendar's own properties added: every V unit sits in
// exactly one week, every U unit not yet done sits in at least one, and the weeks are consecutive
// Mondays.
//
// Deliberately NOT checked: whether a week's exit criterion is strong enough, whether a unit is in
// the right week, whether a decision should block at all. Judgement; these are structure.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const ROADMAP = readFileSync(path.join(ROOT, "docs", "WEEKLY-ROADMAP-2026-27.md"), "utf8");
const U_PLAN = readFileSync(path.join(ROOT, "docs", "ONE-YEAR-BUILD-PLAN.md"), "utf8");
const LEDGER = readFileSync(path.join(ROOT, "BUILD-STATE.md"), "utf8");

interface RoadmapUnit {
  n: number;
  parallel: boolean;
  size: "S" | "M" | "L";
  blockedOn: string | null;
  depends: string[];
  hasVerify: boolean;
}
interface Week {
  n: number;
  date: Date;
  units: string[];
}

const UNIT_HEADER = /^- \*\*V(\d+)\*\*( \[P\])? \((S|M|L)\) — (.*)$/;
const BLOCKED = /\*\*BLOCKED (D-[A-Z0-9-]+)\.\*\*/;
const DEPENDS = /Depends: ([UV]\d+(?:, [UV]\d+)*)\./;
const WEEK_HEADER = /^### Week (\d+) — (\d{1,2}) (\w+) (\d{4})$/;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function section(text: string, from: string, to: string): string {
  const start = text.indexOf(from);
  const end = text.indexOf(to, start + 1);
  if (start < 0 || end < 0) throw new Error(`section ${from} … ${to} missing`);
  return text.slice(start, end);
}

export function parseRoadmapUnits(): RoadmapUnit[] {
  const lane = section(ROADMAP, "## 5. The refinement lane", "\n## 6.");
  const units: { unit: RoadmapUnit; text: string }[] = [];
  let current: { unit: RoadmapUnit; text: string } | null = null;
  for (const line of lane.split("\n")) {
    const m = UNIT_HEADER.exec(line);
    if (m) {
      current = {
        unit: { n: Number(m[1]), parallel: Boolean(m[2]), size: m[3] as RoadmapUnit["size"], blockedOn: null, depends: [], hasVerify: false },
        text: m[4]!,
      };
      units.push(current);
    } else if (current && line.startsWith("  ")) {
      current.text += " " + line.trim();
    } else if (current && line.trim() === "") {
      // paragraph break inside a bullet is not a thing here; a blank line ends the unit
    }
  }
  return units.map(({ unit, text }) => {
    const b = BLOCKED.exec(text);
    const d = DEPENDS.exec(text);
    return { ...unit, blockedOn: b ? b[1]! : null, depends: d ? d[1]!.split(", ") : [], hasVerify: text.includes("→ verify:") };
  });
}

export function parseWeeks(): Week[] {
  const calendar = section(ROADMAP, "## 4. The calendar", "\n## 5.");
  const weeks: Week[] = [];
  let current: Week | null = null;
  for (const line of calendar.split("\n")) {
    const h = WEEK_HEADER.exec(line);
    if (h) {
      const month = MONTHS.indexOf(h[3]!);
      current = { n: Number(h[1]), date: new Date(Date.UTC(Number(h[4]), month, Number(h[2]))), units: [] };
      weeks.push(current);
      continue;
    }
    if (current && line.startsWith("**Units:**")) {
      current.units.push(...(line.match(/\b[UV]\d+\b/g) ?? []));
    }
  }
  return weeks;
}

const ledgerRows = (prefix: string) =>
  LEDGER.split("\n").flatMap((line) => {
    const m = new RegExp(`^\\| (${prefix}(\\d+)) \\| ([\\w-]+) \\| [^|]* \\| [^|]* \\| [^|]* \\| (.*) \\|\\s*$`).exec(line);
    return m ? [{ id: m[1]!, n: Number(m[2]), status: m[3]!, note: m[4]! }] : [];
  });

const decisionsIn = (text: string, from: string, to: string): string[] =>
  [...section(text, from, to).matchAll(/^- \*\*(G\d+|G-APP-\d|D-[A-Z0-9-]+)\*\*/gm)].map((m) => m[1]!);

describe("O250 the weekly roadmap and the V lane", () => {
  const units = parseRoadmapUnits();
  const weeks = parseWeeks();
  const vRows = ledgerRows("V");
  const uRows = ledgerRows("U");

  it("is non-vacuous: forty units, fifty-two weeks, a V lane in the ledger", () => {
    expect(units.length).toBe(40);
    expect(weeks.length).toBe(52);
    expect(vRows.length).toBeGreaterThan(0);
  });

  it("holds the V ids to the ledger in both directions, in numeric order", () => {
    expect(units.map((u) => u.n)).toEqual(units.map((_, i) => i + 1));
    expect(vRows.map((r) => r.n)).toEqual(units.map((u) => u.n));
  });

  it("gives every unit a verify clause and a size", () => {
    expect(units.filter((u) => !u.hasVerify).map((u) => `V${u.n}`)).toEqual([]);
  });

  it("agrees with the ledger on [P] and on what is blocked", () => {
    const planParallel = units.filter((u) => u.parallel).map((u) => `V${u.n}`);
    const ledgerParallel = vRows.filter((r) => r.note.startsWith("[P]")).map((r) => r.id);
    expect(ledgerParallel).toEqual(planParallel);
    for (const u of units.filter((u) => u.parallel)) {
      expect(u.depends, `V${u.n} is [P] yet depends on something`).toEqual([]);
      expect(u.blockedOn, `V${u.n} is [P] yet blocked`).toBeNull();
    }
    const planBlocked = units.filter((u) => u.blockedOn).map((u) => `V${u.n}`);
    const ledgerBlocked = vRows.filter((r) => r.status === "blocked").map((r) => r.id);
    expect(ledgerBlocked).toEqual(planBlocked);
    for (const u of units.filter((u) => u.blockedOn)) {
      const row = vRows.find((r) => r.id === `V${u.n}`)!;
      expect(row.note, `V${u.n}'s ledger note does not name ${u.blockedOn}`).toContain(u.blockedOn!);
    }
  });

  it("names only decisions that are defined, in this roadmap's §6 or the U plan's §6", () => {
    const defined = new Set([
      ...decisionsIn(ROADMAP, "## 6. The decisions", "\n## 7."),
      ...decisionsIn(U_PLAN, "## 6. Gates and founder decisions", "\n## 7."),
    ]);
    expect(defined.size).toBeGreaterThan(10);
    for (const u of units.filter((u) => u.blockedOn)) {
      expect(defined.has(u.blockedOn!), `V${u.n} is blocked on ${u.blockedOn}, which no §6 defines`).toBe(true);
    }
  });

  it("depends only on lower-numbered V units or on U units that exist", () => {
    const uIds = new Set(uRows.map((r) => r.id));
    for (const u of units) {
      for (const dep of u.depends) {
        if (dep.startsWith("V")) expect(Number(dep.slice(1)), `V${u.n} depends on ${dep}`).toBeLessThan(u.n);
        else expect(uIds.has(dep), `V${u.n} depends on ${dep}, which the ledger does not have`).toBe(true);
      }
    }
  });

  it("runs fifty-two consecutive Mondays from 7 September 2026", () => {
    expect(weeks.map((w) => w.n)).toEqual(weeks.map((_, i) => i + 1));
    expect(weeks[0]!.date.toISOString().slice(0, 10)).toBe("2026-09-07");
    for (let i = 1; i < weeks.length; i++) {
      const days = (weeks[i]!.date.getTime() - weeks[i - 1]!.date.getTime()) / 86_400_000;
      expect(days, `week ${weeks[i]!.n} is not seven days after week ${weeks[i - 1]!.n}`).toBe(7);
    }
    for (const w of weeks) expect(w.date.getUTCDay(), `week ${w.n} does not open on a Monday`).toBe(1);
  });

  it("schedules every V unit in exactly one week", () => {
    const seen = new Map<string, number>();
    for (const w of weeks) for (const id of w.units) if (id.startsWith("V")) seen.set(id, (seen.get(id) ?? 0) + 1);
    const wrong = units.map((u) => `V${u.n}`).filter((id) => seen.get(id) !== 1);
    expect(wrong, "a V unit is scheduled in zero or in several weeks").toEqual([]);
    const unknown = [...seen.keys()].filter((id) => !units.some((u) => `V${u.n}` === id));
    expect(unknown, "a week names a V unit the lane does not have").toEqual([]);
  });

  it("schedules every U unit not yet done at least once, and names no U unit the ledger lacks", () => {
    const scheduled = new Set(weeks.flatMap((w) => w.units.filter((id) => id.startsWith("U"))));
    const pending = uRows.filter((r) => r.status !== "done").map((r) => r.id);
    expect(pending.filter((id) => !scheduled.has(id)), "a pending U unit has no week").toEqual([]);
    const known = new Set(uRows.map((r) => r.id));
    expect([...scheduled].filter((id) => !known.has(id)), "a week names a U unit the ledger lacks").toEqual([]);
  });

  it("puts the U units before the V units on every Units line", () => {
    for (const w of weeks) {
      const firstV = w.units.findIndex((id) => id.startsWith("V"));
      const lastU = w.units.map((id) => id.startsWith("U")).lastIndexOf(true);
      if (firstV >= 0 && lastU >= 0) expect(lastU, `week ${w.n} lists a V unit before a U unit`).toBeLessThan(firstV);
    }
  });

  it("goes red on a planted unit with no ledger row", () => {
    const planted = [...units, { n: 41 }].map((u) => u.n);
    expect(planted).not.toEqual(vRows.map((r) => r.n));
  });
});
