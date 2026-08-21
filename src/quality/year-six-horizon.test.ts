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

const rowsWithStatus = (status: string): string[] =>
  LEDGER.split("\n")
    .filter((line) => new RegExp(`^\\| [A-Z0-9-]+ \\| ${status} \\|`).test(line))
    .map((line) => line.split("|")[1]!.trim())
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
