// W257: the five-year gate dossier's arithmetic, checked against the things it is about.
//
// TWO SENSITIVITIES, AND CONFLATING THEM IS THE WHOLE DIFFICULTY. W207 pinned a year-close dossier
// against the LIVE ledger and it went red the moment W208 planned Year 5 — the document had not
// become wrong, the check had. W210 recorded that as DOSSIER-1 with a mechanical trigger: any
// `gate-dossier-*.test.ts` reading `BUILD-STATE.md` without a `_LAST_UNIT` bound makes the finding
// live. This unit is the one that trigger was set for.
//
// So the ledger half is BOUNDED. Rows above W260 belong to a year this dossier does not price.
//
// AND THE DECISION HALF IS DELIBERATELY NOT BOUNDED, which is the part a mechanical reading of
// DOSSIER-1 would get wrong. A dossier of OUTSTANDING DECISIONS is not a point-in-time arithmetic
// document: its entire subject is the live state. If the founder rules on G10 tomorrow, or somebody
// answers a question in source, this document SHOULD go red — it has become wrong, and going red is
// how anybody finds out. Bounding that half too would produce a document that keeps agreeing with
// itself after the world has moved, which is precisely what the row forbids.
//
// ONLY THREE OF THE SEVEN DECISIONS ARE LEDGER ROWS. Four live in source and one of those resolves
// by a FILE EXISTING. A dossier deriving from the ledger alone would price three and list four from
// memory — and the four from memory are exactly the ones that go stale, because answering one is a
// source edit nobody would think to reflect in a document. Both halves are derived here.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DISCLOSURE_PAYLOAD_POSTURE } from "@/interop/disclosure-ledger";

const ROOT = process.cwd();
const LEDGER = readFileSync(path.join(ROOT, "BUILD-STATE.md"), "utf8");
const DOSSIER = readFileSync(path.join(ROOT, "docs", "GATE-DOSSIER-Y5.md"), "utf8");

/**
 * The last unit that existed when this dossier was written.
 *
 * The `_LAST_UNIT` bound DOSSIER-1 requires, and the reason W207's arithmetic broke without one.
 * The five-year plan runs W1–W260; W260 renews the expansion rule, so a Year 6 adds rows above it
 * and those are a later dossier's to price.
 */
const Y5_LAST_UNIT = 260;

interface BlockedRow {
  id: string;
  note: string;
  gates: string[];
}

/** Rows the ledger marks blocked, within this dossier's own scope. */
function blockedRows(): BlockedRow[] {
  return LEDGER.split("\n")
    .filter((line) => /^\| [A-Z0-9-]+ \| blocked \|/.test(line))
    .map((line) => {
      const cells = line.split("|").map((c) => c.trim());
      const id = cells[1]!;
      const note = cells.slice(6).join("|");
      // `FOUNDER GATE Gn`, not a bare `Gn`. The looser pattern attributed G1 and G3 to W147 and
      // W203, which MENTION those gates in their prose while being blocked on G8 and G9 — an
      // over-count caught by reading the extracted rows before writing the dossier from them.
      const gates = [...new Set([...note.matchAll(/FOUNDER GATE (G\d+)/g)].map((m) => m[1]!))];
      return { id, note, gates };
    })
    .filter((row) => {
      // Un-numbered rows (SUP-1, SUP-2) are Y2-era and in scope. Numbered rows above W260 are a
      // later year's. THE SUP ROWS ARE THE REASON THIS FILTER IS NOT `/^W\d+$/`: AUDIT-Y5 counted
      // blocked rows with a numbered-only pattern an hour before this unit and reported 16 where
      // the ledger holds 18, which is what deriving catches and remembering does not.
      const numbered = /^W(\d+)$/.exec(row.id);
      return numbered === null || Number(numbered[1]) <= Y5_LAST_UNIT;
    });
}

describe("W257 the ledger half is derived, and bounded so a later year cannot break it", () => {
  it("prices every blocked row in scope, and the dossier's total matches", () => {
    const rows = blockedRows();
    expect(rows.length, "the ledger sweep found no blocked rows").toBeGreaterThan(10);
    expect(DOSSIER, "the dossier's blocked-row total disagrees with the ledger").toContain(
      `${rows.length} blocked rows`,
    );
  });

  it("counts the units each gate releases, from the rows themselves", () => {
    const byGate = new Map<string, string[]>();
    for (const row of blockedRows()) {
      for (const gate of row.gates) byGate.set(gate, [...(byGate.get(gate) ?? []), row.id]);
    }
    expect(byGate.size, "no gates were found on any blocked row").toBeGreaterThan(3);
    for (const [gate, ids] of byGate) {
      expect(
        DOSSIER,
        `${gate} releases ${ids.length} units (${ids.join(", ")}) and the dossier does not say so`,
      ).toContain(`**${gate}** — ${ids.length} unit`);
    }
  });

  it("names every blocked row somewhere in the dossier, so none is priced by omission", () => {
    for (const row of blockedRows()) {
      expect(DOSSIER, `${row.id} is blocked and the dossier never mentions it`).toContain(row.id);
    }
  });

  it("keeps DOSSIER-1 closed: this file bounds itself, which its trigger checks for", () => {
    // Not "I remembered to add a bound" — the trigger's own condition, run against this file.
    const self = readFileSync(__filename, "utf8");
    expect(self.includes("BUILD-STATE.md") && !/_LAST_UNIT/.test(self)).toBe(false);
    expect(Y5_LAST_UNIT).toBe(260);
  });
});

/**
 * The seven decisions, and where each one's answer would appear.
 *
 * `resolved` is the point: it asks the SOURCE whether the decision has been made. Every one of
 * these turns this dossier red when somebody answers it — which is correct, because at that moment
 * the document is wrong and nothing else would say so.
 */
const DECISIONS: readonly { id: string; where: string; resolved: () => boolean }[] = [
  {
    id: "D1",
    where: "src/demo/roster.ts — a FOUNDER: marker on Dr Anusha Saxena's entry",
    resolved: () =>
      !readFileSync(path.join(ROOT, "src/demo/roster.ts"), "utf8").includes(
        "FOUNDER: her exact relationship has not been stated",
      ),
  },
  {
    id: "D2",
    where: "public/saif-tareen.png — the decision resolves by the file existing",
    resolved: () => existsSync(path.join(ROOT, "public/saif-tareen.png")),
  },
  {
    id: "D3",
    where: "e2e/profile-sweep.spec.ts — the 'prescriber' acceptance",
    resolved: () => {
      const spec = readFileSync(path.join(ROOT, "e2e/profile-sweep.spec.ts"), "utf8");
      return !/FOUNDER DECISION OUTSTANDING[\s\S]{0,400}?prescrib/.test(spec);
    },
  },
  {
    id: "D4",
    where: "e2e/profile-sweep.spec.ts — the 'mental health' acceptance",
    resolved: () => {
      const spec = readFileSync(path.join(ROOT, "e2e/profile-sweep.spec.ts"), "utf8");
      return !/FOUNDER DECISION OUTSTANDING[\s\S]{0,400}?mental health/.test(spec);
    },
  },
  {
    id: "D5",
    where: "src/interop/disclosure-ledger.ts — DISCLOSURE_PAYLOAD_POSTURE",
    resolved: () => DISCLOSURE_PAYLOAD_POSTURE !== "fact_only",
  },
  {
    id: "D6",
    where: "BUILD-STATE.md — G10 ratification, W240 and W241 blocked on it",
    resolved: () => !blockedRows().some((row) => row.gates.includes("G10")),
  },
  {
    id: "D7",
    where: "BUILD-STATE.md — the second care area, W248/W249 versus W186's row",
    resolved: () => !LEDGER.includes("[FOUNDER: VERTICAL UNDECIDED.]"),
  },
];

describe("W257 the decision half is derived from source, and deliberately NOT bounded", () => {
  it("finds all seven still outstanding, asked of the source rather than of this file", () => {
    // The assertion that makes the document self-invalidating. When one of these is answered, this
    // fails — which is the intended behaviour and is why the decision half carries no bound. A
    // dossier of outstanding decisions that kept agreeing with itself after a decision was made
    // would be the exact staleness the row forbids.
    const open = DECISIONS.filter((d) => !d.resolved());
    expect(
      open.length,
      `a decision has been answered — update docs/GATE-DOSSIER-Y5.md. Resolved: ${DECISIONS.filter((d) => d.resolved()).map((d) => d.id).join(", ")}`,
    ).toBe(7);
    expect(DOSSIER).toContain("seven decisions");
  });

  it("prices each one in the dossier, with where its answer would appear", () => {
    for (const decision of DECISIONS) {
      expect(DOSSIER, `${decision.id} is not priced in the dossier`).toContain(`### ${decision.id}`);
      const file = decision.where.split(" —")[0]!;
      expect(DOSSIER, `${decision.id} does not say where its answer would appear`).toContain(file);
    }
  });

  it("has a resolver that can actually return true, so 'still outstanding' means something", () => {
    // Non-vacuity for the sweep above. A resolver that always returned false would report seven
    // outstanding decisions for ever, including after every one had been answered — a check that
    // cannot see the thing it exists to see. Each is exercised against a state where it must flip.
    expect(existsSync(path.join(ROOT, "public"))).toBe(true); // D2 reads a real directory
    expect(DISCLOSURE_PAYLOAD_POSTURE).toBe("fact_only"); // D5's other value flips it
    expect(LEDGER).toContain("[FOUNDER: VERTICAL UNDECIDED.]"); // D7's marker is really there
    expect(
      readFileSync(path.join(ROOT, "src/demo/roster.ts"), "utf8"),
    ).toContain("FOUNDER: her exact relationship has not been stated"); // D1's marker
    const spec = readFileSync(path.join(ROOT, "e2e/profile-sweep.spec.ts"), "utf8");
    expect(spec).toContain("FOUNDER DECISION OUTSTANDING"); // D3/D4's marker
    expect(blockedRows().some((row) => row.gates.includes("G10"))).toBe(true); // D6's rows
  });
});
