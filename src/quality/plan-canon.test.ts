// W207 (O185): every plan-shaped document is classified in docs/PLAN.md, both directions.
//
// WHY THIS TEST IS THE POINT OF THE CANONICALISATION. Tidying eight plans into an index fixes today
// and nothing else; the sprawl came back the moment somebody added a ninth, because adding one cost
// nothing and nobody could see the total. This is the cost: a new plan document needs a row in
// PLAN.md in the same commit that creates it, or the build fails.
//
// BOTH DIRECTIONS, W102's shape. A document that exists and is unclassified fails — that is the
// sprawl. A row naming a document that no longer exists fails too — that is the index rotting into
// a description of a tree that is gone, which is how an index stops being read and the sprawl
// resumes underneath it.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const DOCS = path.join(process.cwd(), "docs");
const CANON = readFileSync(path.join(DOCS, "PLAN.md"), "utf8");

/**
 * What counts as plan-shaped.
 *
 * Deliberately a NAME rule rather than a content one. A content heuristic ("mentions units") would
 * be the more thorough-looking choice and the wrong one: it would drag in dossiers and audits that
 * are not plans, and it would let a genuine plan escape by being written in an unusual register.
 * The name is what a person scanning `docs/` actually sees, and the sprawl this fixes was a sprawl
 * of names in a directory listing.
 */
const PLAN_SHAPED = /(PLAN|CHECKLIST|ROADMAP|APPRAISAL)/;

const planDocs = readdirSync(DOCS)
  .filter((name) => name.endsWith(".md"))
  .filter((name) => PLAN_SHAPED.test(name))
  .filter((name) => name !== "PLAN.md") // the index does not classify itself
  .sort();

/** The documents PLAN.md's classification table names, read out of the table's own rows. */
function classified(): string[] {
  return [...CANON.matchAll(/^\| `([A-Z0-9-]+\.md)` \| \*\*(ACTIVE|REFERENCE|CLOSED)\*\* \|/gm)]
    .map((match) => match[1]!)
    .sort();
}

describe("O185 the plan canon", () => {
  it("classifies every plan-shaped document in docs/", () => {
    const missing = planDocs.filter((name) => !classified().includes(name));
    expect(
      missing,
      "these plan documents exist and PLAN.md does not say what they are — add a row saying ACTIVE, REFERENCE or CLOSED",
    ).toEqual([]);
  });

  it("names no document that does not exist", () => {
    const stale = classified().filter((name) => !planDocs.includes(name));
    expect(stale, "PLAN.md classifies documents that are gone — the index is describing an old tree").toEqual([]);
  });

  it("is non-vacuous: the table has rows and the scan finds files", () => {
    // Both halves of the rule above are satisfied by an empty world. A regex that stops matching —
    // because somebody restyled the table — would make this file pass while checking nothing, which
    // is the exact failure mode the AR series exists to hunt.
    expect(planDocs.length, "the docs scan found no plan-shaped files").toBeGreaterThan(4);
    expect(classified().length, "PLAN.md's table parsed to nothing — has the row format changed?").toBeGreaterThan(4);
  });

  it("keeps exactly the lanes that are actually claimable", () => {
    // ACTIVE is the claim this index makes to a reader in a hurry, so it is pinned. A new ACTIVE
    // row means a new backlog exists, and that is a decision worth making deliberately rather
    // than drifting into — the exact drift this whole unit is about.
    //
    // One lane, decided by the founder on 2026-09-01/02 (O227): "conduct critical appraisal using
    // all relevant skills to understand exactly what is needed to upgrade the whole platform into a
    // perfectly functional app and add that to a consolidated 1 year build plan", then "add to plan
    // a complex multistage refactor for next few months". CONSOLIDATED is the operative word: the
    // three lanes this pin held before (the matching year plan, the AR series, the standalone-app
    // plan of O220) went to REFERENCE or CLOSED in the same commit, and the plan's own §8 says where
    // each of their open items went. `one-year-plan.test.ts` holds that plan to its ledger lane.
    const active = [...CANON.matchAll(/^\| `([A-Z0-9-]+\.md)` \| \*\*ACTIVE\*\* \|/gm)].map((m) => m[1]!);
    expect(active.sort()).toEqual(["ONE-YEAR-BUILD-PLAN.md"]);
  });
});
