// AR34: the audit document's numbers, re-derived on every verify (W207's shape — a dossier
// whose counts are pinned row-by-row against the registers it describes). The doc says its
// numbers cannot rot into prose; this file is that sentence made executable. Every assertion
// derives the value from the LIVE register and then requires the doc to state exactly it.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACCEPTED_DIFFS } from "../design/accepted-diffs";
import {
  ENFORCED_WITHOUT_PROBE,
  MUTATION_PROBES,
  PROBED_FAMILY_COUNT,
} from "../design/mutation-report";
import { TASTE_RULES, UNENFORCED_COUNT } from "../design/taste-register";
import { NOT_A_ZERO_STATES, ZERO_STATES } from "../design/zero-states";
import { TOUCH_EXEMPTIONS } from "../design/touch-exemptions";
import { CONSOLE_ACCEPTED_FINDINGS } from "../compliance/console-honesty";
import {
  ACCEPTED_FINDINGS,
  PRODUCT_FLAGS,
  PUBLIC_SURFACES,
  STANDING_FLAGS,
} from "../compliance/public-surfaces";
import { STORE_MODULES, STORE_READS } from "../tenancy/store-reads";
import { A11Y_EXEMPTIONS } from "./a11y-exemptions";
import { ROUTE_BUDGETS } from "./route-weights";
import { ROUTE_PROOFS } from "../../e2e/support/working-truth";

const DOC = readFileSync("docs/AUDIT-AR.md", "utf8");

/** The doc must carry this exact inventory row. Derivation first, prose second. */
function pinRow(label: string, value: string) {
  expect(DOC, `AUDIT-AR.md row "${label}" must read: ${value}`).toContain(`| ${label} | ${value} |`);
}

describe("AR34 the audit's inventory is derived, not transcribed", () => {
  it("taste register", () => {
    const enforced = TASTE_RULES.filter((r) => (r.enforcedBy ?? []).length > 0).length;
    pinRow("taste rules in the register", String(TASTE_RULES.length));
    pinRow("…enforced (non-empty `enforcedBy`)", String(enforced));
    pinRow("…unenforced, pinned (`UNENFORCED_COUNT`)", String(UNENFORCED_COUNT));
    // The pin's own consistency, which section 3 claims was checked.
    expect(TASTE_RULES.length - enforced).toBe(UNENFORCED_COUNT);
  });

  it("mutation probes", () => {
    pinRow("mutation-probe families", String(MUTATION_PROBES.length));
    pinRow("enforced rules without a probe (pinned)", String(ENFORCED_WITHOUT_PROBE.length));
    expect(MUTATION_PROBES.length).toBe(PROBED_FAMILY_COUNT);
    // S3 names all five; a renamed or retired entry must rewrite the finding.
    for (const entry of ENFORCED_WITHOUT_PROBE) {
      expect(DOC, `S3 must name ${entry.ruleId}`).toContain(`\`${entry.ruleId}\``);
    }
  });

  it("baseline chain, checked live exactly as section 3 claims", () => {
    pinRow("accepted-diff entries (AR15 initial + 6 attributed changes)", String(ACCEPTED_DIFFS.length));
    const manifest = readFileSync("qa/baselines/manifest.json");
    const captures = Object.keys(JSON.parse(manifest.toString()) as Record<string, unknown>).length;
    pinRow("baseline captures in the manifest", String(captures));
    const sha = createHash("sha256").update(manifest).digest("hex");
    expect(sha, "the audit's central cross-check: manifest sha == newest acceptance").toBe(
      ACCEPTED_DIFFS.at(-1)!.manifestSha256,
    );
  });

  it("route censuses and the S1 seam", () => {
    pinRow("per-route shipped-JS budgets", String(Object.keys(ROUTE_BUDGETS).length));
    pinRow("working-truth route proofs", String(Object.keys(ROUTE_PROOFS).length));
    const fixture = Object.values(ROUTE_PROOFS).filter((p) => p.source === "fixture").length;
    const copy = Object.values(ROUTE_PROOFS).filter((p) => p.source === "copy").length;
    pinRow("…fixture-derived / copy proofs", `${fixture} / ${copy}`);
    // S1's whole content: the two derivations differ by exactly the synthesized 404 page and, since
    // U3, the fault fixture — a shippable payload that exists to throw, so it has no working truth.
    const budgetOnly = Object.keys(ROUTE_BUDGETS).filter((r) => !(r in ROUTE_PROOFS));
    const proofOnly = Object.keys(ROUTE_PROOFS).filter((r) => !(r in ROUTE_BUDGETS));
    expect(budgetOnly.sort()).toEqual(["/_not-found", "/api/mock/fault/[kind]"]);
    expect(proofOnly).toEqual([]);
  });

  it("honesty registers", () => {
    pinRow("public surfaces classified by audience", String(PUBLIC_SURFACES.length));
    pinRow("public accepted findings", String(ACCEPTED_FINDINGS.length));
    pinRow("console accepted findings (data-vs-copy argued)", String(CONSOLE_ACCEPTED_FINDINGS.length));
    pinRow("standing flags / product flags", `${Object.keys(STANDING_FLAGS).length} / ${Object.keys(PRODUCT_FLAGS).length}`);
    // S4's dated horizon: every console acceptance carries the review date the finding names.
    for (const accepted of CONSOLE_ACCEPTED_FINDINGS) {
      expect(DOC, "S4 must state the console review date").toContain(accepted.reviewBy);
    }
  });

  it("the remaining registers", () => {
    pinRow("zero-states classified", `${ZERO_STATES.length} (+${NOT_A_ZERO_STATES.length} not-a-zero)`);
    pinRow(
      "store functions tenancy-classified (W209)",
      `${STORE_READS.length} across ${STORE_MODULES.length} modules`,
    );
    pinRow("touch-floor exemptions", String(TOUCH_EXEMPTIONS.length));
    // The route count inside the LABEL was transcribed, and O192 caught it going stale: two new
    // routes moved every derived number in this table while the label still said 47. Derived now,
    // so the sentence describing the sweep cannot drift from the sweep.
    pinRow(
      `a11y exemptions (WCAG 2.2 AA, all ${Object.keys(ROUTE_PROOFS).length} routes)`,
      String(A11Y_EXEMPTIONS.length),
    );
  });
});
