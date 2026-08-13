// W53 verify gate: the audit gate fails on a seeded new advisory and passes with
// the current allowlist. Both are asserted here rather than observed by hand, so a
// future change that quietly widens the gate breaks a test.

import { describe, expect, it } from "vitest";
import { AUDIT_ALLOWLIST } from "./audit-allowlist.ts";
import {
  type AllowlistEntry,
  type AuditAdvisory,
  type AuditReport,
  evaluateAudit,
  formatVerdict,
} from "./audit-gate.ts";

const NOW = new Date("2026-08-09T00:00:00Z");

function advisory(over: Partial<AuditAdvisory> & Pick<AuditAdvisory, "github_advisory_id">): AuditAdvisory {
  return {
    module_name: "image-size",
    severity: "high",
    title: "denial of service through an infinite loop",
    url: `https://github.com/advisories/${over.github_advisory_id}`,
    patched_versions: "<0.0.0",
    findings: [{ paths: [".>pptxgenjs>image-size"] }],
    ...over,
  };
}

function report(...advisories: AuditAdvisory[]): AuditReport {
  return {
    advisories: Object.fromEntries(advisories.map((a, i) => [String(1138808 + i), a])),
  };
}

/** The two advisories the current allowlist accepts, as pnpm reports them today. */
function currentReport(): AuditReport {
  return report(
    advisory({ github_advisory_id: "GHSA-w3rx-r6r6-pgpr" }),
    advisory({ github_advisory_id: "GHSA-5p2g-fcmc-qvqq" }),
  );
}

describe("W53 audit gate", () => {
  it("passes with the current allowlist", () => {
    const verdict = evaluateAudit(currentReport(), AUDIT_ALLOWLIST, NOW);

    expect(verdict.ok).toBe(true);
    expect(verdict.blocking).toEqual([]);
    expect(verdict.acceptedCount).toBe(2);
    expect(verdict.unused).toEqual([]);
  });

  it("fails on a seeded new advisory", () => {
    const seeded = advisory({
      github_advisory_id: "GHSA-0000-seeded-0000",
      module_name: "left-pad",
      severity: "critical",
      title: "seeded advisory for the W53 gate test",
    });

    const verdict = evaluateAudit(
      report(...Object.values(currentReport().advisories), seeded),
      AUDIT_ALLOWLIST,
      NOW,
    );

    expect(verdict.ok).toBe(false);
    expect(verdict.blocking).toHaveLength(1);
    expect(verdict.blocking[0]?.advisory).toBe("GHSA-0000-seeded-0000");
    expect(verdict.blocking[0]?.reason).toBe("not_allowlisted");
    // The accepted pair is still accepted — one new advisory must not invalidate them.
    expect(verdict.acceptedCount).toBe(2);
  });

  it("stops accepting an advisory once its review date passes", () => {
    // Derived from the allowlist rather than hardcoded, so extending a reviewBy
    // date cannot silently turn this into a test of nothing.
    const latest = AUDIT_ALLOWLIST.map((e) => e.reviewBy).sort().at(-1)!;
    const afterEveryReview = new Date(`${latest}T23:59:59.999Z`);
    afterEveryReview.setUTCMilliseconds(afterEveryReview.getUTCMilliseconds() + 1);

    const verdict = evaluateAudit(currentReport(), AUDIT_ALLOWLIST, afterEveryReview);

    expect(verdict.ok).toBe(false);
    expect(verdict.blocking).toHaveLength(AUDIT_ALLOWLIST.length);
    expect(new Set(verdict.blocking.map((b) => b.reason))).toEqual(
      new Set(["acceptance_expired"]),
    );
  });

  it("treats the review date as inclusive to the end of the day", () => {
    const entry: AllowlistEntry = {
      advisory: "GHSA-w3rx-r6r6-pgpr",
      module: "image-size",
      reason: "test",
      reviewBy: "2026-11-09",
      reviews: [{ on: "2026-08-10", by: "test", finding: "fixture", extendedTo: "2026-11-09" }],
    };
    const onTheDay = new Date("2026-11-09T23:59:00Z");
    const nextDay = new Date("2026-11-10T00:00:01Z");
    const one = report(advisory({ github_advisory_id: "GHSA-w3rx-r6r6-pgpr" }));

    expect(evaluateAudit(one, [entry], onTheDay).ok).toBe(true);
    expect(evaluateAudit(one, [entry], nextDay).ok).toBe(false);
  });

  it("refuses an allowlist entry that names a different package", () => {
    const entry: AllowlistEntry = {
      advisory: "GHSA-w3rx-r6r6-pgpr",
      module: "some-other-package",
      reason: "entry drifted onto the wrong package",
      reviewBy: "2026-11-09",
      reviews: [{ on: "2026-08-10", by: "test", finding: "fixture", extendedTo: "2026-11-09" }],
    };
    const verdict = evaluateAudit(
      report(advisory({ github_advisory_id: "GHSA-w3rx-r6r6-pgpr" })),
      [entry],
      NOW,
    );

    expect(verdict.ok).toBe(false);
    expect(verdict.blocking[0]?.reason).toBe("module_mismatch");
  });

  it("W107: refuses a reviewBy that no recorded review set", () => {
    // The cheapest possible response to a failing gate is to push the date forward, and in a
    // diff that is indistinguishable from an acceptance somebody actually re-argued. Moving
    // reviewBy now leaves it out of step with the newest review's extendedTo, and the
    // acceptance stops working until the review is written down.
    const bumped: AllowlistEntry = {
      advisory: "GHSA-w3rx-r6r6-pgpr",
      module: "image-size",
      reason: "still fine, honest",
      reviewBy: "2027-11-09", // moved forward...
      reviews: [
        { on: "2026-08-10", by: "test", finding: "looked once", extendedTo: "2026-11-09" },
      ], // ...but nothing says why
    };
    const one = report(advisory({ github_advisory_id: "GHSA-w3rx-r6r6-pgpr" }));
    const verdict = evaluateAudit(one, [bumped], NOW);

    expect(verdict.ok).toBe(false);
    expect(verdict.blocking[0]?.reason).toBe("review_date_unexplained");

    // Adding the review that explains the new date makes it valid again — the mechanism asks
    // for a sentence, not for the answer to be different.
    const explained: AllowlistEntry = {
      ...bumped,
      reviews: [
        ...bumped.reviews,
        { on: "2026-11-01", by: "test", finding: "re-checked, still no patch", extendedTo: "2027-11-09" },
      ] as AllowlistEntry["reviews"],
    };
    expect(evaluateAudit(one, [explained], NOW).ok).toBe(true);
  });

  it("W107: every shipped acceptance carries a review that set its date", () => {
    for (const entry of AUDIT_ALLOWLIST) {
      const newest = entry.reviews[entry.reviews.length - 1]!;
      expect(newest.extendedTo, `${entry.advisory} reviewBy is unexplained`).toBe(entry.reviewBy);
      expect(newest.finding.length, `${entry.advisory} review says nothing`).toBeGreaterThan(40);
      expect(newest.by.trim()).not.toBe("");
    }
    expect(AUDIT_ALLOWLIST.length).toBeGreaterThan(0);
  });

  it("refuses an unparseable review date rather than ignoring it", () => {
    const entry: AllowlistEntry = {
      advisory: "GHSA-w3rx-r6r6-pgpr",
      module: "image-size",
      reason: "malformed date",
      reviewBy: "whenever",
      reviews: [{ on: "2026-08-10", by: "test", finding: "fixture", extendedTo: "whenever" }],
    };
    const verdict = evaluateAudit(
      report(advisory({ github_advisory_id: "GHSA-w3rx-r6r6-pgpr" })),
      [entry],
      NOW,
    );

    expect(verdict.ok).toBe(false);
    expect(verdict.blocking[0]?.reason).toBe("unparseable_review_date");
  });

  it("ignores advisories below the moderate threshold", () => {
    const verdict = evaluateAudit(
      report(advisory({ github_advisory_id: "GHSA-low-severity", severity: "low" })),
      [],
      NOW,
    );

    expect(verdict.ok).toBe(true);
    expect(verdict.blocking).toEqual([]);
  });

  it("blocks an unrecognised severity instead of dropping it", () => {
    const verdict = evaluateAudit(
      report(advisory({ github_advisory_id: "GHSA-weird", severity: "catastrophic" })),
      [],
      NOW,
    );

    expect(verdict.ok).toBe(false);
    expect(verdict.blocking[0]?.reason).toBe("unknown_severity");
  });

  it("blocks a malformed advisory instead of throwing past the gate", () => {
    // pnpm's JSON is asserted into AuditAdvisory, so the fields are not guaranteed
    // at runtime. A report missing `findings` and `severity` must still fail closed.
    const malformed = { github_advisory_id: "GHSA-malformed" } as unknown as AuditAdvisory;

    const verdict = evaluateAudit(report(malformed), AUDIT_ALLOWLIST, NOW);

    expect(verdict.ok).toBe(false);
    expect(verdict.blocking[0]?.reason).toBe("unknown_severity");
    expect(verdict.blocking[0]?.paths).toEqual([]);
  });

  it("reports a stale allowlist entry without breaking the build", () => {
    const verdict = evaluateAudit(report(), AUDIT_ALLOWLIST, NOW);

    expect(verdict.ok).toBe(true);
    expect(verdict.unused).toHaveLength(2);
    expect(formatVerdict(verdict, "src/security/audit-allowlist.ts")).toContain(
      "no longer reported",
    );
  });

  it("explains every blocked advisory in the printed report", () => {
    const verdict = evaluateAudit(
      report(advisory({ github_advisory_id: "GHSA-0000-seeded-0000", module_name: "left-pad" })),
      AUDIT_ALLOWLIST,
      NOW,
    );
    const output = formatVerdict(verdict, "src/security/audit-allowlist.ts");

    expect(output).toContain("audit gate: FAIL");
    expect(output).toContain("GHSA-0000-seeded-0000");
    expect(output).toContain("left-pad");
    expect(output).toContain("no patched release yet");
    expect(output).toContain("not in the allowlist");
  });
});

describe("W53 allowlist hygiene", () => {
  it("every acceptance carries a substantive reason and a well-formed future date", () => {
    expect(AUDIT_ALLOWLIST.length).toBeGreaterThan(0);

    for (const entry of AUDIT_ALLOWLIST) {
      expect(entry.advisory).toMatch(/^GHSA-/);
      expect(entry.module).not.toBe("");
      // A one-word "accepted" is not a rationale.
      expect(entry.reason.length).toBeGreaterThan(80);
      expect(entry.reviewBy).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("every acceptance is still live on the day it is due for review", () => {
    // Deliberately NOT `new Date()`: a wall-clock assertion would turn the unit
    // suite into a time bomb, and this tree keeps its clocks injected. Catching an
    // actually-expired acceptance is `pnpm audit:gate`'s job, and it runs seconds
    // later in the same verify chain.
    for (const entry of AUDIT_ALLOWLIST) {
      const onDueDate = new Date(`${entry.reviewBy}T12:00:00Z`);
      const verdict = evaluateAudit(currentReport(), AUDIT_ALLOWLIST, onDueDate);
      expect(verdict.blocking.map((b) => b.advisory)).not.toContain(entry.advisory);
    }
  });
});
