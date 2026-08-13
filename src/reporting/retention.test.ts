// W204 verify gate: "a produced report is itself a record class in W106's registry, with a stated
// life."
//
// The second clause is where the work is. "Stated" is satisfied by a sentence; what makes the
// statement worth anything is that it is CHECKED — the claim "we never persist a report" is
// exactly the kind that is true when written and false two units later, and it fails silently
// because nothing about a new table announces that it contradicts a comment in another file.

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PROPOSED_DISCLOSURE_LOG,
  REPORTING_ARTEFACTS,
  REPORT_RETENTION,
} from "./retention";
import { RECORD_CLASSES, storedClasses } from "@/privacy/record-classes";

const ROOT = process.cwd();

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

describe("W204 a produced report is a declared record class", () => {
  const entry = RECORD_CLASSES.find((c) => c.module === "src/reporting/report.ts");

  it("is in W106's registry at all", () => {
    // "There is nothing to declare" and "nobody declared it" are indistinguishable from outside,
    // and only one of them survives the next unit adding a table. W51's failure was the second.
    expect(entry, "src/reporting/report.ts is not declared in W106's registry").toBeDefined();
  });

  it("is classed derived, which W106 treats as a reviewed answer rather than an exemption", () => {
    expect(entry!.handling).toBe("derived");
    expect(entry!.rationale.length).toBeGreaterThan(80);
  });

  it("is not among the classes an access request or erasure must reach", () => {
    // It holds nothing, so reaching it would be reaching a cache. The registry test for `derived`
    // demands that be a property rather than a convenience, and this pins which side it is on.
    expect(storedClasses().map((c) => c.module)).not.toContain("src/reporting/report.ts");
  });
});

describe("W204 the stated life is checked against the tree, not merely stated", () => {
  it("says zero days, meaning never written rather than purged immediately", () => {
    // A zero-day purge is a job that can fail. This is the absence of a thing to purge, and the
    // distinction is the whole reason erasure is automatically effective here.
    expect(REPORT_RETENTION.storedForDays).toBe(0);
    expect(REPORT_RETENTION.handling).toBe("derived");
    expect(REPORT_RETENTION.why).toContain("Nothing is persisted");
    expect(REPORT_RETENTION.why).toContain("nothing to purge");
  });

  it("holds no report store anywhere in the reporting module", () => {
    // The claim, checked. A `globalThis` store or a module-level array in src/reporting would
    // make the registry entry false, and nothing about adding one announces that.
    for (const file of walk(path.join(ROOT, "src", "reporting"))) {
      if (!file.endsWith(".ts") || file.endsWith(".test.ts")) continue;
      const source = readFileSync(file, "utf8");
      expect(source, `${path.basename(file)} appears to hold a store`).not.toMatch(
        /globalThis|__careyield/,
      );
    }
  });

  it("builds its report from arguments rather than from a fetched history", () => {
    // Recomputation is what makes erasure effective. A report assembled from a persisted
    // snapshot would be a second copy with its own life, whatever the registry said.
    const report = readFileSync(path.join(ROOT, "src", "reporting", "report.ts"), "utf8");
    expect(report).not.toMatch(/\bfrom "@\/(booking|referrals|privacy)\/store"/);
  });

  it("enumerates the artefacts a reader would expect it to keep", () => {
    // "We keep nothing" is easy to say and easy to be wrong about. An auditor needs the list to
    // check against rather than a sentence to trust.
    expect(REPORTING_ARTEFACTS.length).toBeGreaterThanOrEqual(4);
    for (const artefact of REPORTING_ARTEFACTS) {
      expect(artefact.kept, `${artefact.what} is now kept — the registry entry is stale`).toBe(
        false,
      );
      expect(artefact.why.length).toBeGreaterThan(40);
    }
  });

  it("names the copy it cannot reach, rather than claiming a reach it does not have", () => {
    // A document a practice took away is outside this product. Saying so is why W199's caveats
    // travel on the document — nothing here can amend it later.
    const takenAway = REPORTING_ARTEFACTS.find((a) => a.what.includes("took away"));
    expect(takenAway).toBeDefined();
    expect(takenAway!.why).toContain("Outside this product");
  });
});

describe("W204 the G9 day reverses the posture, and that is written down first", () => {
  it("declares that a disclosure log becomes mandatory, not optional", () => {
    // The genuine tension: the retention posture that is safest while nothing is sent is the
    // WRONG posture the instant something is. Accountable disclosure needs a copy of what was
    // disclosed, and a product that recomputes cannot answer "what did we tell them in Q2?".
    expect(PROPOSED_DISCLOSURE_LOG.handlingWouldBe).toBe("stored");
    expect(PROPOSED_DISCLOSURE_LOG.why).toContain("cannot answer it");
    expect(PROPOSED_DISCLOSURE_LOG.whenRequired).toContain("outside the practice");
  });

  it("proposes a life rather than leaving the number to be invented later", () => {
    // Seven years, matching the health-records posture the rest of the tree uses. Stated as a
    // starting point a founder can overrule, which is a different thing from a default nobody
    // owns — W112's re-attestation default was flagged the same way.
    expect(PROPOSED_DISCLOSURE_LOG.proposedLifeDays).toBe(2555);
  });

  it("names the open question rather than settling it here", () => {
    // Whether the log holds the figures or only the fact of sending is a founder call bundled
    // with G9: one makes the log answer the question and makes it a lasting copy of
    // practice-identifiable data, the other makes it cheap and half-useful.
    expect(PROPOSED_DISCLOSURE_LOG.openQuestion).toContain("founder call");
    expect(PROPOSED_DISCLOSURE_LOG.openQuestion).toContain("only the fact");
  });

  it("builds none of it, because a store that exists can be written to", () => {
    // G1 and G3's shape, applied to a store rather than an adapter.
    const files = walk(path.join(ROOT, "src", "reporting")).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
    );
    for (const file of files) {
      expect(readFileSync(file, "utf8")).not.toMatch(/disclosureLog|recordDisclosure|logDisclosure/);
    }
  });
});
