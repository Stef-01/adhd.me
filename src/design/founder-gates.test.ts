// AR36: "never silently decided by the loop", made mechanical. Each gate's liveness check
// asserts the OPEN state still exists at the source the register names. When one fails, the
// failure message is the protocol: the question appears to have been decided — record the
// founder's decision in founder-gates.ts in the same commit (or restore the open state); the
// loop may close a gate's plumbing, never the question.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TEAM_PAGE_PUBLIC } from "../../app/about/team";
import { CONSOLE_ACCEPTED_FINDINGS } from "../compliance/console-honesty";
import { PRODUCT_FLAGS, STANDING_FLAGS } from "../compliance/public-surfaces";
import { FOUNDER_GATES } from "./founder-gates";
import { HIDDEN_FROM_CRAWLERS } from "../security/robots";
import { TASTE_RULES } from "./taste-register";

const DECIDED =
  "this question appears to have been DECIDED — record the founder's decision in " +
  "src/design/founder-gates.ts in the same commit, or restore the open state; the loop may " +
  "not resolve it silently";

describe("AR36 founder gates", () => {
  it("every gate is a priced question with a real source", () => {
    const ids = FOUNDER_GATES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const gate of FOUNDER_GATES) {
      expect(gate.question.trim().endsWith("?"), `${gate.id} must be phrased as a question`).toBe(true);
      expect(gate.price.length, `${gate.id} owes a real price`).toBeGreaterThan(80);
      // The named source must exist — a gate pointing at a moved file reads as coverage.
      expect(() => readFileSync(gate.openAt, "utf8"), `${gate.id}: ${gate.openAt} missing`).not.toThrow();
    }
  });

  it("the finder is still hidden from crawlers (U7)", () => {
    const hidden = HIDDEN_FROM_CRAWLERS.map((route) => route.path);
    // O230: the finder is `/` now (`/finder` is a 308 in next.config.ts and not a route), so the
    // gate's open state is read at the root. The QUESTION is unchanged and still open — this is
    // the same three surfaces under their current addresses, not a narrowing of what is hidden.
    for (const path of ["/", "/examples", "/demo"]) {
      expect(hidden, `${path} left the crawler register — ${DECIDED}`).toContain(path);
    }
  });

  it("the O163 profile acceptances are still marked outstanding", () => {
    const sweep = readFileSync("e2e/profile-sweep.spec.ts", "utf8");
    for (const marker of ['match: "prescriber"', 'match: "mental health"']) {
      expect(sweep.includes(marker), `profile-sweep no longer holds ${marker} — ${DECIDED}`).toBe(true);
    }
    expect(sweep.includes("FOUNDER DECISION OUTSTANDING"), DECIDED).toBe(true);
  });

  it("the team page is still gated", () => {
    expect(TEAM_PAGE_PUBLIC, `TEAM_PAGE_PUBLIC is true — ${DECIDED}`).toBe(false);
  });

  it("the two compliance flags still stand", () => {
    expect("brand-is-a-condition" in PRODUCT_FLAGS, DECIDED).toBe(true);
    expect("/clinicians" in STANDING_FLAGS, DECIDED).toBe(true);
  });

  it("the console wording review is still scheduled where the gate says", () => {
    expect(CONSOLE_ACCEPTED_FINDINGS.length, DECIDED).toBe(2);
    for (const finding of CONSOLE_ACCEPTED_FINDINGS) {
      expect(finding.reviewBy, `review date moved — update the gate's price text: ${DECIDED}`).toBe(
        "2027-02-25",
      );
    }
  });

  it("the dossier backlog and the judgment rules are still open", () => {
    const dossier = readFileSync("docs/AR-DOSSIER.md", "utf8");
    expect(dossier.includes("## 3. What each closable gap costs"), DECIDED).toBe(true);
    for (const id of ["layout.one-idea", "layout.shared-row", "motion.carries-meaning"]) {
      const rule = TASTE_RULES.find((r) => r.id === id);
      expect(rule, `${id} left the taste register — ${DECIDED}`).toBeDefined();
      expect(
        (rule!.enforcedBy ?? []).length,
        `${id} gained mechanical enforcement — the judgment-rules gate was decided: ${DECIDED}`,
      ).toBe(0);
    }
  });
});
