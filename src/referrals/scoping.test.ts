// W140 verify gate: "the W103 scoping sweep run as this unit's gate, every hit triaged in
// writing."
//
// A sweep done once is a document that was true on the day it was written. This checks the
// triage against the TREE, so a new exported function in the referral layer fails the suite
// until somebody says which of three things it is — the W106 registry pattern applied to
// scoping rather than to record classes.
//
// The second half of the file is the behaviour: the scoped reads are exercised with two
// practices holding referrals with the same ids, which is the shape a late filter fails on.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { PatientId, PracticeId } from "@/domain/types";
import { callerScoped, REFERRAL_SCOPING } from "./scoping";
import { buildReferral } from "./document";
import {
  actsFor,
  addAcceptanceActs,
  addReferralDocuments,
  addReferralEvents,
  eventsFor,
  resetReferralRail,
} from "./store";

const DIR = path.resolve(__dirname);
const A = "prac-a" as PracticeId;
const B = "prac-b" as PracticeId;

/** Every exported function in the referral layer, read from the tree. */
function exportedFunctions(): Array<{ module: string; fn: string }> {
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "scoping.ts")
    .flatMap((file) => {
      const source = readFileSync(path.join(DIR, file), "utf8");
      return [...source.matchAll(/^export (?:async )?function (\w+)/gm)].map((m) => ({
        module: `src/referrals/${file}`,
        fn: m[1]!,
      }));
    });
}

describe("W140 the triage cannot fall behind the tree", () => {
  it("finds functions to check — the walk must not be what passes", () => {
    expect(exportedFunctions().length).toBeGreaterThan(20);
  });

  it("triages every exported function in the referral layer", () => {
    // If this fails, a read was added without anybody answering "can this cross a practice
    // boundary?" — which is exactly how W91/W103's findings happened.
    const triaged = new Set(REFERRAL_SCOPING.map((e) => `${e.module}::${e.fn}`));
    const missing = exportedFunctions()
      .filter((f) => !triaged.has(`${f.module}::${f.fn}`))
      .map((f) => `${f.module}::${f.fn}`);
    expect(missing, `untriaged exports: ${missing.join(", ")}`).toEqual([]);
  });

  it("triages nothing that no longer exists", () => {
    // The stale direction, which W102 found is the one nobody catches: a triage naming a
    // function that has gone is a document that reads as more complete than it is.
    const live = new Set(exportedFunctions().map((f) => `${f.module}::${f.fn}`));
    const stale = REFERRAL_SCOPING.map((e) => `${e.module}::${e.fn}`).filter((k) => !live.has(k));
    expect(stale, `triage names functions the tree no longer has: ${stale.join(", ")}`).toEqual([]);
  });

  it("gives every entry a rationale — an untriaged export is what this prevents", () => {
    for (const entry of REFERRAL_SCOPING) {
      expect(entry.rationale.length, `${entry.module}::${entry.fn}`).toBeGreaterThan(30);
    }
  });

  it("records the hit this sweep found, rather than only its fix", () => {
    // A sweep that reports nothing is indistinguishable from a sweep nobody ran.
    const hit = REFERRAL_SCOPING.find((e) => e.fn === "actsFor");
    expect(hit?.rationale).toContain("THE HIT THIS SWEEP FOUND");
    expect(hit?.answer).toBe("takes_practice_id");
  });

  it("keeps the caller-scoped entries readable as a set", () => {
    // These are where a mistake would hide: the safety lives in the caller, so a reviewer
    // should be able to read them together rather than hunt them.
    const names = callerScoped().map((e) => e.fn);
    expect(names.length).toBeGreaterThan(3);
    expect(names).toContain("acceptanceStatus");
  });
});

describe("W140 the scoped reads hold with two practices in the store", () => {
  const doc = (id: string, from: string, to: string, patient: string) => {
    const result = buildReferral(
      {
        referralId: id, fromPracticeId: from, toPracticeId: to, patientId: patient,
        createdAt: "2026-02-01", createdBy: "clin", reason: "capacity", request: "advice_only",
        conditionCode: null, recordedFactCodes: [], narrative: null,
      },
      "2026-08-11",
    );
    if (!result.ok) throw new Error(result.errors.join(", "));
    return result.document;
  };

  beforeEach(() => {
    resetReferralRail();
    addReferralDocuments([
      doc("ref-a", "prac-a", "prac-x", "pat-1"),
      doc("ref-b", "prac-b", "prac-y", "pat-2"),
    ]);
    addAcceptanceActs([
      { kind: "sent", referralId: "ref-a", at: "2026-02-01", by: "clin-a", fromPracticeId: A, toPracticeId: "prac-x" as PracticeId, patientId: "pat-1" as PatientId },
      { kind: "sent", referralId: "ref-b", at: "2026-02-01", by: "clin-b", fromPracticeId: B, toPracticeId: "prac-y" as PracticeId, patientId: "pat-2" as PatientId },
      { kind: "accepted", referralId: "ref-b", at: "2026-02-02", by: "clin-y", byPracticeId: "prac-y" as PracticeId },
    ]);
    addReferralEvents([
      { practiceId: A, patientId: "pat-1" as PatientId, referralId: "ref-a", kind: "referral_written", at: "2026-02-01" },
      { practiceId: B, patientId: "pat-2" as PatientId, referralId: "ref-b", kind: "referral_written", at: "2026-02-01" },
    ]);
  });

  it("actsFor returns only the practice's own acts", () => {
    expect(actsFor(A).map((a) => a.referralId)).toEqual(["ref-a"]);
    expect(actsFor(B).map((a) => a.referralId)).toEqual(["ref-b", "ref-b"]);
  });

  it("eventsFor returns only the practice's own events", () => {
    expect(eventsFor(A).map((e) => e.referralId)).toEqual(["ref-a"]);
    expect(eventsFor(B).map((e) => e.referralId)).toEqual(["ref-b"]);
  });

  it("a practice that is party to neither sees nothing", () => {
    expect(actsFor("prac-nobody" as PracticeId)).toEqual([]);
    expect(eventsFor("prac-nobody" as PracticeId)).toEqual([]);
  });

  it("the RECEIVING practice is party too — scoping is not sender-only", () => {
    // Both sides are entitled to their own referral, which is the whole point of W137's two
    // reads. A scoping rule that only recognised the sender would blind the receiver.
    expect(actsFor("prac-x" as PracticeId).map((a) => a.referralId)).toEqual(["ref-a"]);
  });

  it("an act whose referral this practice is not party to is absent, not filtered", () => {
    // The shape a late filter fails on: the row exists in the store and must never be handed
    // out, whatever the caller does with it afterwards.
    expect(JSON.stringify(actsFor(A))).not.toContain("ref-b");
    expect(JSON.stringify(eventsFor(A))).not.toContain("pat-2");
  });
});
