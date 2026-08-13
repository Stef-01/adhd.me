// W180 verify gate: Q14's outcome records against W106's registry — every class declared with
// its handling, and erasure COMPOSED rather than remembered.
//
// The distinction the unit turns on. Q14 built an outcome rail on top of the referral rail, and
// for a rail built on a rail the privacy question is not "what does it store" — it stores
// nothing — but "does erasing the source empty it". If the answer is yes, erasure needs no new
// code and gains no new place to be forgotten. If the answer is no, somebody has to REMEMBER to
// scrub it, and W51's critical finding is precisely what happens when that memory fails.
//
// So this file proves the composition rather than asserting it, by scrubbing a patient from the
// referral rail through W137's real scrub and then asking the outcome dashboard what it sees.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { PatientId, PracticeId } from "@/domain/types";
import { referralChainOutcomes } from "@/outcomes/dashboard";
import {
  addReferralDocuments,
  addReferralEvents,
  eventsFor,
  resetReferralRail,
  scrubPatientFromReferrals,
} from "@/referrals/store";
import { buildReferral } from "@/referrals/document";
import { RECORD_CLASSES } from "./record-classes";

const OUTCOMES = path.resolve(__dirname, "..", "outcomes");
const P = "prac-1" as PracticeId;
const KEEP = "pat-keep" as PatientId;
const ERASE = "pat-erase" as PatientId;

function seedRail() {
  resetReferralRail();
  const make = (referralId: string, patientId: string) => {
    const result = buildReferral(
      {
        referralId,
        fromPracticeId: P,
        toPracticeId: "prac-2",
        patientId,
        createdAt: "2026-02-01",
        createdBy: "clin-1",
        reason: "extended_scope",
        request: "procedure",
        conditionCode: null,
        recordedFactCodes: [],
        narrative: null,
      },
      "2026-08-11",
    );
    if (!result.ok) throw new Error(result.errors.join(", "));
    return result.document;
  };
  addReferralDocuments([make("ref-keep", KEEP), make("ref-erase", ERASE)]);
  addReferralEvents([
    { practiceId: P, patientId: KEEP, referralId: "ref-keep", kind: "referral_written", at: "2026-02-01" },
    { practiceId: P, patientId: KEEP, referralId: "ref-keep", kind: "appointment_recorded", at: "2026-02-10" },
    { practiceId: P, patientId: ERASE, referralId: "ref-erase", kind: "referral_written", at: "2026-02-02" },
    { practiceId: P, patientId: ERASE, referralId: "ref-erase", kind: "completion_recorded", at: "2026-02-20" },
  ]);
}

describe("W180 erasure is composed, not remembered", () => {
  it("scrubbing the rail removes the patient's outcomes, with no outcome-side scrub at all", () => {
    seedRail();
    expect(referralChainOutcomes(eventsFor(P)).map((o) => o.chainId)).toEqual([
      "ref-erase",
      "ref-keep",
    ]);

    // W137's scrub, unchanged and unaware that an outcome rail exists on top of it.
    const removed = scrubPatientFromReferrals(ERASE);
    expect(removed.events).toBeGreaterThan(0);

    expect(referralChainOutcomes(eventsFor(P)).map((o) => o.chainId)).toEqual(["ref-keep"]);
  });

  it("erasing everybody leaves the outcome surface empty rather than stale", () => {
    seedRail();
    scrubPatientFromReferrals(KEEP);
    scrubPatientFromReferrals(ERASE);
    expect(referralChainOutcomes(eventsFor(P))).toEqual([]);
  });

  it("the other patient's outcomes are untouched, so erasure is not over-broad either", () => {
    // A scrub that emptied the dashboard entirely would also pass the test above. W51's fix was
    // criticised for the opposite reason once already: reaching too far is a different failure,
    // not a safer one.
    seedRail();
    scrubPatientFromReferrals(ERASE);
    const left = referralChainOutcomes(eventsFor(P));
    expect(left).toHaveLength(1);
    expect(left[0]!.verdict).toBe("not_recorded");
    expect(left[0]!.evidence.length).toBeGreaterThan(0);
  });

  it("nothing under src/outcomes holds a store, so there is nothing that could be forgotten", () => {
    // The structural half of the same claim. `derived` is only true while the modules stay
    // stateless; a globalThis store appearing here would silently make it false, and this is
    // the assertion that would go red — the same detector W106 uses on the rest of the tree.
    const stateful = readdirSync(OUTCOMES)
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
      .filter((f) => /globalThis as \{/.test(readFileSync(path.join(OUTCOMES, f), "utf8")));
    expect(stateful, `these outcome modules now persist: ${stateful.join(", ")}`).toEqual([]);
  });
});

describe("W180 patient identity does not survive the transform", () => {
  it("no outcome names the patient whose referral it is about", () => {
    seedRail();
    const outcomes = referralChainOutcomes(eventsFor(P));
    expect(outcomes.length).toBeGreaterThan(0);
    const rendered = JSON.stringify(outcomes);
    // The INPUT carries both — that is what makes the absence meaningful rather than vacuous.
    expect(JSON.stringify(eventsFor(P))).toContain(ERASE);
    expect(rendered).not.toContain(ERASE);
    expect(rendered).not.toContain(KEEP);
  });
});

describe("W180 every Q14 outcome module is declared", () => {
  it("declares each one, and cannot fall behind the directory", () => {
    // W106's own detector finds modules with a `globalThis` store, so it never looks at any of
    // these — the registry test passes today whether or not Q14 exists. Scoped to this directory
    // rather than the tree: 42 modules under src/ mention patient identity and are undeclared,
    // which is a real gap and a bigger unit than this one. Recorded in the ledger row rather
    // than quietly left out.
    const declared = new Set(RECORD_CLASSES.map((c) => c.module));
    const modules = readdirSync(OUTCOMES)
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
      .map((f) => `src/outcomes/${f}`)
      .sort();
    expect(modules.length).toBeGreaterThan(4);
    for (const module of modules) {
      expect(declared, `${module} is not declared in W106's registry`).toContain(module);
    }
  });

  it("classifies each as derived or holding no patient identity — never stored", () => {
    // If one of these ever becomes `stored`, erasure has acquired a new place to be forgotten
    // and the composition argument above no longer holds.
    const q14 = RECORD_CLASSES.filter((c) => c.module.startsWith("src/outcomes/"));
    expect(q14.length).toBeGreaterThan(4);
    for (const c of q14) {
      expect(c.handling, `${c.module} is stored — erasure must now reach it directly`).not.toBe(
        "stored",
      );
    }
  });

  it("says of the export that an erasure can never reach it", () => {
    // The one class where handling is not a convenience. An export leaves the product; a
    // downloaded file is gone, so holding no patient identity is the only safe answer.
    const exported = RECORD_CLASSES.find((c) => c.module === "src/outcomes/audit-export.ts");
    expect(exported?.handling).toBe("no_patient_identity");
    expect(exported?.rationale).toMatch(/erasure can never reach it|leaves the product/);
  });
});
