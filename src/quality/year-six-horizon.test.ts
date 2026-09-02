// W260: the Y6 horizon's arithmetic, derived from the ledger rather than counted by hand.
//
// §8 of the plan says the renewed expansion rule did not fire, and the whole argument rests on one
// comparison: blocked rows against the 13 a quarter would add. If that comparison is prose, the
// section is an opinion. It is derived here.
//
// AND THE BOUND MATTERS FOR THE SAME REASON IT DID IN W257. This is a point-in-time section about
// the ledger at Y5 close, so it is bounded to W260 — DOSSIER-1's rule. A Year 6 that appends rows
// must not make this section's arithmetic wrong; it makes it HISTORICAL, which is different.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const LEDGER = readFileSync(path.join(ROOT, "BUILD-STATE.md"), "utf8");
const PLAN = readFileSync(path.join(ROOT, "docs", "FIVE-YEAR-PLAN.md"), "utf8");

/** The bound DOSSIER-1 requires. §8 prices the ledger as it stood at Y5 close. */
const Y5_LAST_UNIT = 260;

/** How many units a quarter adds, and therefore the threshold the renewed rule compares against. */
const QUARTER = 13;

/**
 * The AR-series is a different plan's lane and was never in this check's scope.
 *
 * WHY THIS EXCLUSION IS A NARROWING AND NOT A WEAKENING. Every assertion in this file is about
 * `docs/FIVE-YEAR-PLAN.md` — §8 prices ITS ledger at Y5 close, and "no buildable row left" is the
 * claim that the five-year arc is spent. The AR-series (`docs/AESTHETIC-REVIEW-PLAN.md`, opened
 * 2026-08-22) is a three-month lane of the MATCHING year plan. Its rows are `available` by
 * design and on the day they were written; counting them here would not make this check stronger,
 * it would make it report a different plan's backlog under this plan's name — which is the exact
 * fault O168 found in a sweep called "every surface".
 *
 * WHAT WOULD BE A WEAKENING, AND IS NOT DONE: excluding a W-row, or excluding a lane because it
 * happens to be red. The W-filter below is unchanged, and nothing here can hide a five-year unit.
 *
 * The U-series (`docs/ONE-YEAR-BUILD-PLAN.md`, opened 2026-09-02 by O227) is the same case one
 * plan later: a year-long lane whose 68 rows are `available` or `blocked` by design on the day they
 * were written, priced in that plan's own §6 rather than in this plan's §8. Same narrowing, same
 * reason, and the same both-directions guard below so the exclusion cannot go dead unnoticed.
 */
const isOtherPlansLane = (id: string): boolean => /^AR\d+$/.test(id) || /^U\d+$/.test(id);

const rowsWithStatus = (status: string): string[] =>
  LEDGER.split("\n")
    .filter((line) => new RegExp(`^\\| [A-Z0-9-]+ \\| ${status} \\|`).test(line))
    .map((line) => line.split("|")[1]!.trim())
    .filter((id) => !isOtherPlansLane(id))
    .filter((id) => {
      const numbered = /^W(\d+)$/.exec(id);
      return numbered === null || Number(numbered[1]) <= Y5_LAST_UNIT;
    });

describe("W260 the horizon's figures come from the ledger", () => {
  it("counts the blocked rows §8 reports", () => {
    const blocked = rowsWithStatus("blocked");
    expect(blocked.length, "the ledger sweep found no blocked rows").toBeGreaterThan(10);
    expect(PLAN, "§8's blocked count disagrees with the ledger").toContain(`${blocked.length} blocked`);
  });

  it("has no buildable row left besides this unit itself", () => {
    // The claim that makes §8 more than an opinion: W260 is the last available row in the plan.
    const open = [...rowsWithStatus("available"), ...rowsWithStatus("claimed")];
    expect(open.filter((id) => id !== "W260"), `still buildable: ${open.join(", ")}`).toEqual([]);
  });

  it("excludes the AR and U lanes on purpose, and neither exclusion is silently doing nothing", () => {
    // A filter nobody checks is how a sweep starts measuring the wrong set. Both directions, per
    // lane: the lane must really be there (or this exclusion is dead code pretending to be a
    // decision), and it must really be excluded (or the scope claim above is false).
    for (const [lane, rowPattern, idPattern] of [
      ["AR", /^\| AR\d+ \|/, /^AR\d+$/],
      ["U", /^\| U\d+ \|/, /^U\d+$/],
    ] as const) {
      const rows = LEDGER.split("\n").filter((line) => rowPattern.test(line));
      expect(rows.length, `the ${lane} lane is gone — delete this exclusion rather than leaving it`).toBeGreaterThan(0);
      expect(
        [...rowsWithStatus("available"), ...rowsWithStatus("claimed"), ...rowsWithStatus("blocked")]
          .filter((id) => idPattern.test(id)),
        `a ${lane} row reached a five-year-plan count`,
      ).toEqual([]);
    }
  });

  it("shows the renewed rule declining to expand, by its own arithmetic", () => {
    // The rule: expand only when blocked rows are FEWER than the 13 a quarter would add. This is
    // the comparison, run — not the sentence describing it.
    const blocked = rowsWithStatus("blocked").length;
    expect(blocked, "the rule would expand — §8 says it does not").toBeGreaterThanOrEqual(QUARTER);
    expect(PLAN).toContain("The rule does not expand");
  });

  it("appends no W-numbered unit to the plan without a ledger row", () => {
    // `plan-ledger` enforces this globally; asserted here because §8's candidate quarters are the
    // exact place somebody would reach for `- **W261**` and quietly break it.
    const planned = [...PLAN.matchAll(/^- \*\*W(\d+)\*\*/gm)].map((m) => Number(m[1]));
    expect(planned.length, "the plan lists no units at all — this check is looking at nothing").toBeGreaterThan(200);
    expect(
      planned.filter((n) => n > Y5_LAST_UNIT),
      "the plan lists a unit above W260 with no ledger row behind it",
    ).toEqual([]);
  });

  it("keeps the original expansion rule rather than editing it", () => {
    // It governed W1–W260. Rewriting it would make the first five years look as though they were
    // built under a rule that did not exist.
    expect(PLAN).toContain("**Expansion rule (original, W1–W260):**");
    expect(PLAN).toContain("**Expansion rule (renewed by W260");
    // And the inherited clause survives the renewal verbatim.
    expect(PLAN).toMatch(/founder gates inherited, never expanded away/i);
  });
});
