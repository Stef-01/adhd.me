// W216: the Q17 gate dossier's arithmetic and its quoted facts, checked against the tree.
//
// A gate dossier is read by a founder making an irreversible decision, and its whole value is
// that its facts are current. W207's Y4 dossier came with tests for the same reason: "G5 releases
// seven units" is true on the day it is written and becomes a lie silently, without anybody
// editing it.
//
// This dossier is narrower than W207's — it prices ONE decision, the learned-ranking question —
// so these tests do two things. They pin the count (how many units the ruling releases) against
// the ledger, and they pin the dossier's central QUOTES against the live source, because the whole
// argument is a collision between a published notice and live code, and the day either side
// changes the collision is resolved and the dossier is stale.
//
// Non-vacuity, four breaks: a second unit landing blocked on this decision fires the count test;
// editing the "No ordering of patients by need" line out of the notice fires the quote test (which
// is correct — a ruling that changes the notice SHOULD flag the dossier for revision); closing
// MATCH-1 fires the register test; changing rankCandidates off the clinical attribute fires the
// live-ranker test.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NEVER_AUTOMATED, AUTOMATED_DECISIONS } from "@/privacy/automated-decisions";
import { LATENT_FINDINGS } from "@/quality/latent-findings";

const ROOT = process.cwd();
const LEDGER = readFileSync(path.join(ROOT, "BUILD-STATE.md"), "utf8");
const DOSSIER = readFileSync(path.join(ROOT, "docs", "GATE-DOSSIER-Q17.md"), "utf8");
const POOL = readFileSync(path.join(ROOT, "src", "engine", "pool.ts"), "utf8");

/**
 * The last unit that existed when this dossier was written.
 *
 * W208 planned the ledger out to W260. Bounding the ledger read is `DOSSIER-1`'s rule (a
 * point-in-time document pinned against the LIVE ledger is pinned against a moving target), and it
 * is also what keeps this file from FIRING that latent finding — its trigger fails the build for
 * any `gate-dossier-*.test.ts` that reads BUILD-STATE without a `_LAST_UNIT` bound. A Year 6
 * expansion adding a blocked row on some other decision must not silently change this dossier's
 * arithmetic.
 */
const Q17_LAST_UNIT = 260;

/** Blocked rows in scope, as { id, note }. */
const blockedRows = (): { id: string; note: string }[] =>
  LEDGER.split("\n")
    .filter((line) => /^\| W\d+ \| blocked \|/.test(line))
    .map((line) => {
      const cells = line.split("|").map((c) => c.trim());
      return { id: cells[1]!, note: cells.slice(6).join("|") };
    })
    .filter((row) => Number(/^W(\d+)$/.exec(row.id)![1]) <= Q17_LAST_UNIT);

/**
 * Rows blocked ON the learned-ranking decision.
 *
 * The blocker is named in the note. W217 records it as "Q17 action 1"; that phrase is the key,
 * not a substring like "ranking" that would sweep in unrelated rows.
 */
const releasedByRuling = (): string[] =>
  blockedRows()
    .filter((row) => /Q17 action 1/.test(row.note))
    .map((row) => row.id);

describe("W216 the dossier releases exactly the units the ledger attributes to the ruling", () => {
  it("finds blocked rows to count", () => {
    // Guard against every assertion below passing because the parse returned nothing.
    expect(blockedRows().length).toBeGreaterThan(5);
  });

  it("names exactly one blocked unit, W217, and the dossier says one", () => {
    // The dossier's headline arithmetic: the ruling releases a single unit. If a future unit lands
    // blocked on the same decision this fails, and the "exactly one unit, W217" line is wrong.
    expect(releasedByRuling()).toEqual(["W217"]);
    expect(DOSSIER).toContain("W217");
    expect(DOSSIER).toContain("exactly one unit, W217");
  });

  it("keeps W217's ledger row pointing at this dossier", () => {
    const row = LEDGER.split("\n").find((line) => line.startsWith("| W217 |")) ?? "";
    expect(row).toContain("blocked");
    expect(row).toContain("Q17 action 1");
    expect(row).toContain("docs/GATE-DOSSIER-Q17");
  });
});

describe("W216 the collision the dossier prices is still live", () => {
  it("quotes the notice line that is still in the published notice", () => {
    // The dossier's central quote. The notice denies the very ordering the live ranker performs;
    // the day the founder rules and edits this line out, the collision is resolved and the dossier
    // must be revised. So the test binds the document to the source: both must contain the line.
    const line = "No ordering of patients by need or by how unwell they are";
    expect(NEVER_AUTOMATED.some((entry) => entry.includes(line))).toBe(true);
    expect(DOSSIER).toContain(line);
  });

  it("quotes the notice's own description of the permitted order", () => {
    // The other side of the distinction the founder must rule on: the notice DESCRIBES the order
    // it permits ("the order of offers, never who is more unwell"). If that description changes,
    // the dossier's argument about where the line sits no longer matches the notice.
    const described = AUTOMATED_DECISIONS.some((d) => d.what.includes("the order of offers, never who is more unwell"));
    expect(described).toBe(true);
    expect(DOSSIER).toContain("the order of offers, never who is more unwell");
  });

  it("agrees with the register that MATCH-1 is open", () => {
    // Resolving the decision closes MATCH-1. While it is open, the contradiction the dossier
    // prices is real; a closed MATCH-1 means a ruling landed and the dossier is history.
    const match1 = LATENT_FINDINGS.find((f) => f.id === "MATCH-1");
    expect(match1, "MATCH-1 missing from the latent-findings register").toBeDefined();
    expect(match1!.status).toBe("open");
    expect(match1!.recordedBy).toBe("W214");
    expect(DOSSIER).toContain("MATCH-1");
  });

  it("agrees the live ranker still orders on the clinical attribute", () => {
    // The code half of the collision: rankCandidates orders by chronicCare. This is MATCH-1's own
    // predicate condition. If option (b) is taken and the ordering is removed, this fails — which
    // is correct, because then the notice is true and the dossier's premise is spent.
    expect(POOL).toMatch(/a\.chronicCare !== b\.chronicCare/);
    expect(DOSSIER).toContain("rankCandidates");
    expect(DOSSIER).toContain("src/engine/pool.ts");
  });
});

describe("W216 the dossier takes no position", () => {
  it("carries an explicit does-not-decide section", () => {
    // Every gate dossier in this tree states plainly that it does not make the decision. The
    // verify gate requires it: "takes no position".
    expect(DOSSIER).toContain("What this dossier deliberately does not do");
    expect(DOSSIER).toContain("It does not decide");
  });

  it("prices both directions rather than recommending one", () => {
    // A dossier that priced only one outcome would be arguing for the other. Both costs are named:
    // changing the published notice, and changing who gets invited.
    expect(DOSSIER).toContain("Change the published notice");
    expect(DOSSIER).toContain("Change who gets invited");
  });
});
