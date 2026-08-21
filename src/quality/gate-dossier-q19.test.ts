// W245: the Q19 gate dossier's arithmetic and its quoted facts, checked against the tree.
//
// A gate dossier is read by a founder making an irreversible decision, and its whole value is that
// its facts are current. W207's Y4 dossier and W216's Q17 one came with tests for the same reason:
// "G5 releases seven units" is true on the day it is written and becomes a lie silently.
//
// What this one has to pin is unusual. The counts are small and easy — G10 blocks two units — and
// the LOAD-BEARING half is the list of gates it does NOT release, because that is where a reader
// is most likely to be wrong and where nothing would fail if the list quietly went stale. So each
// of those four is checked against the plan's own text AND against the code that enforces it.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CREDENTIAL_GATES, G1_OPEN } from "@/interop/credentials";

const ROOT = process.cwd();
const LEDGER = readFileSync(path.join(ROOT, "BUILD-STATE.md"), "utf8");
const PLAN = readFileSync(path.join(ROOT, "docs", "FIVE-YEAR-PLAN.md"), "utf8");
const DOSSIER = readFileSync(path.join(ROOT, "docs", "GATE-DOSSIER-Q19.md"), "utf8");

/**
 * The last unit that existed when this dossier was written.
 *
 * DOSSIER-1's rule: a point-in-time document pinned against the LIVE ledger is pinned against a
 * moving target, and W207's went red the day W208 planned Year 5. A Year 6 expansion adding a row
 * blocked on some other gate must not silently change this dossier's arithmetic.
 */
const Q19_LAST_UNIT = 260;

/** Ledger rows in scope, as { id, line }. */
const rowsInScope = (): { id: number; line: string }[] =>
  LEDGER.split("\n")
    .filter((line) => /^\| W\d+ \|/.test(line))
    .map((line) => ({ id: Number(line.match(/^\| W(\d+) \|/)![1]), line }))
    .filter((row) => row.id <= Q19_LAST_UNIT);

describe("W245 the counts come from the ledger, not from the prose", () => {
  it("finds exactly the units G10 blocks, and the dossier names those", () => {
    const blocked = rowsInScope().filter((row) => row.line.includes("FOUNDER GATE G10"));
    expect(blocked.map((row) => row.id)).toEqual([240, 241]);
    expect(DOSSIER).toContain("**G10 blocks exactly two units: W240 and W241.**");
    for (const row of blocked) {
      expect(row.line, `W${row.id} is no longer blocked`).toContain("| blocked |");
      expect(DOSSIER).toContain(`| W${row.id} |`);
    }
    // Non-vacuity: the row scan must have read a real ledger, not an empty one.
    expect(rowsInScope().length).toBeGreaterThan(100);
  });

  it("states the cheap half first, and says why that half misleads", () => {
    const cheap = DOSSIER.indexOf("The cheap half");
    const substance = DOSSIER.indexOf("Why a payer is not a commissioner");
    expect(cheap).toBeGreaterThan(0);
    expect(cheap).toBeLessThan(substance);
    expect(DOSSIER).toContain("making this decision look easier than it is");
    expect(DOSSIER).toContain("The interesting number is not what a shut gate costs.");
  });
});

describe("W245 the argument is quoted from the plan, not paraphrased", () => {
  it("carries the plan's own sentence about why a payer differs from a commissioner", () => {
    // The whole substance of the decision, and the one thing a paraphrase would soften. Two
    // phrasings of one argument drift (W177), so this is a containment check against the plan file.
    const quote =
      "a payer differs from that in the way that matters: it has a financial interest in the individual\n> patient's care and in whether that care happens at all";
    expect(DOSSIER).toContain(quote);
    expect(PLAN).toContain(quote.replace("\n> ", " "));
  });

  it("names the four things the founder is deciding, as the plan words them", () => {
    for (const thing of ["the counterparty", "the direction of flow", "the minimum data set"]) {
      expect(PLAN.toLowerCase(), `the plan does not name ${thing}`).toContain(thing);
      expect(DOSSIER.toLowerCase()).toContain(thing);
    }
    // Case- and apostrophe-normalised: the dossier capitalises it as a list item and the two files
    // may not use the same apostrophe character. Comparing the raw strings failed on the capital
    // alone, which would have been a test about typography rather than about the claim.
    const normalise = (text: string) => text.toLowerCase().replace(/[\u2019']/g, "'");
    const fourth = "the patient's own consent to that specific exchange";
    expect(normalise(PLAN)).toContain(fourth);
    expect(normalise(DOSSIER)).toContain(fourth);
  });
});

describe("W245 what G10 does NOT release is checked against the tree", () => {
  it("names four gates that stay shut, each against the plan's own definition", () => {
    // The load-bearing half: nothing would fail if this list quietly went stale, so each entry is
    // checked against the plan text AND named in the dossier.
    const stillShut: [string, string][] = [
      ["G1", "real PMS/booking API credentials"],
      ["G2", "real patient data of any kind"],
      ["G8", "Third-party model processing"],
    ];
    for (const [gate, phrase] of stillShut) {
      expect(PLAN, `the plan no longer defines ${gate} this way`).toContain(phrase);
      expect(DOSSIER, `the dossier does not name ${gate}`).toContain(`**${gate}**`);
    }
    // Q9 action 1 is a founder DECISION rather than a lettered gate, and it is named as such.
    expect(DOSSIER).toContain("Q9 action 1");
    expect(LEDGER).toMatch(/W133 \| blocked/);
  });

  it("is right that G1 alone still refuses an integration", () => {
    // Checked against the code rather than the document: W242's loader refuses on G1 regardless of
    // any other ruling, which is what makes the "four gates short" claim true rather than rhetorical.
    expect(G1_OPEN).toBe(false);
    expect(CREDENTIAL_GATES.G1.isTheBlocker).toBe(true);
    expect(CREDENTIAL_GATES.G10.isTheBlocker).toBe(false);
    expect(DOSSIER).toContain("refuses on G1 alone");
  });

  it("points at the consent model that is already waiting for the fourth decision", () => {
    expect(DOSSIER).toContain("src/interop/disclosure-consent.ts");
    expect(DOSSIER).toContain("consent to one recipient is not consent to another");
    // And that claim is true of the code, not just of the document.
    const consent = readFileSync(path.join(ROOT, "src/interop/disclosure-consent.ts"), "utf8");
    expect(consent).toContain("Consent to one recipient is not consent to another");
  });
});

describe("W245 the dossier decides nothing", () => {
  it("takes no position and says which questions it is refusing", () => {
    expect(DOSSIER).toContain("## What this dossier does not do");
    expect(DOSSIER).toContain("Recommend a ruling.");
    expect(DOSSIER).not.toMatch(/\bwe recommend\b|\bshould be ratified\b|\bthe right (answer|call) is\b/i);
  });

  it("invents no figure, because the register holds none", () => {
    // W232 could price its finding because W46's register held the figure. This one cannot, and
    // says so rather than producing a number that would make the decision feel quantified.
    expect(DOSSIER).toContain("W46's register\n  holds none");
    expect(DOSSIER, "a dollar figure appeared in a dossier with no source for one").not.toMatch(/\$[\d,]/);
  });

  it("bounds its own ledger read, so it cannot go red when Year 6 is planned", () => {
    const source = readFileSync(path.join(ROOT, "src/quality/gate-dossier-q19.test.ts"), "utf8");
    expect(source).toContain("BUILD-STATE.md");
    expect(source).toMatch(/_LAST_UNIT/);
  });
});
