// AR35: the dossier's claims, derived from the live registers on every verify (W207's shape).
// Section 2's rule lists and every count are re-derived here and required verbatim in the doc —
// a rule gaining enforcement, losing it, or being renamed rewrites the dossier or fails the
// build. The doc says its claims track the tree; this file is that sentence made executable.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ENFORCED_WITHOUT_PROBE } from "../design/mutation-report";
import { TASTE_RULES, UNENFORCED_COUNT } from "../design/taste-register";
import { TOUCH_EXEMPTIONS } from "../design/touch-exemptions";
import { A11Y_EXEMPTIONS } from "./a11y-exemptions";

const DOC = readFileSync("docs/AR-DOSSIER.md", "utf8");

describe("AR35 the dossier tracks the registers", () => {
  it("names every unenforced rule in section 2's table, and no enforced one", () => {
    const unenforced = TASTE_RULES.filter((r) => (r.enforcedBy ?? []).length === 0);
    expect(unenforced.length, "the pinned unenforced remainder").toBe(UNENFORCED_COUNT);
    expect(DOC).toContain(`Pinned in \`UNENFORCED_COUNT\``);
    for (const rule of unenforced) {
      // The table row, not a mere mention: each unenforced rule owes a WHY in its own row.
      expect(DOC, `section 2 must carry a row for ${rule.id}`).toMatch(
        new RegExp(`\\| \`${rule.id.replace(".", "\\.")}\` \\| .{10,}`),
      );
    }
    // The other direction: an enforced rule sitting in the unenforced table would promise less
    // than the tree delivers. Enforced rules may be MENTIONED (section 1 cites them) but must
    // not have a section-2 table row, whose shape is "| `id` | why |".
    for (const rule of TASTE_RULES.filter((r) => (r.enforcedBy ?? []).length > 0)) {
      const row = new RegExp(`\\| \`${rule.id.replace(".", "\\.")}\` \\| (?!this goes red)`);
      const section2 = DOC.slice(DOC.indexOf("## 2."), DOC.indexOf("## 3."));
      expect(section2, `${rule.id} is enforced and must not appear as an unenforced row`).not.toMatch(row);
    }
  });

  it("names every probe-less enforced rule, and prices a probe for each in section 3", () => {
    for (const entry of ENFORCED_WITHOUT_PROBE) {
      expect(DOC, `section 2 must name ${entry.ruleId}`).toContain(`\`${entry.ruleId}\``);
    }
    // The stale-blocker finding is load-bearing: if the mutation report's note is ever updated,
    // this sentence must go with it rather than surviving as a finding about nothing.
    const reducedMotion = ENFORCED_WITHOUT_PROBE.find((e) => e.ruleId === "motion.reduced-motion");
    if (reducedMotion && /rendered-behaviour half first/.test(reducedMotion.whatAProbeWouldMutate)) {
      expect(DOC).toContain("its recorded blocker is stale");
    } else {
      expect(DOC, "the blocker note was fixed — delete the stale-blocker finding").not.toContain(
        "its recorded blocker is stale",
      );
    }
  });

  it("states the zero-exemption guarantees only while they are true", () => {
    // Section 1 promises "zero standing exemptions" for the touch floor and a11y. Those words
    // may only render while the registers are actually empty.
    expect(TOUCH_EXEMPTIONS.length, "touch exemptions exist — soften the guarantee").toBe(0);
    expect(A11Y_EXEMPTIONS.length, "a11y exemptions exist — soften the guarantee").toBe(0);
    expect(DOC).toContain("**zero** standing exemptions");
    expect(DOC).toContain("**zero** exemptions");
  });
});
