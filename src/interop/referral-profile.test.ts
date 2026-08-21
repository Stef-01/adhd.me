// W236 verify gate: "W131's structured referral rendered to the profile; no clinical text is
// authored, generated or edited by this tree (G7's fourth property re-derived at the boundary)."
//
// RE-DERIVED means checked on THIS module's terms, not inherited from W131's tests. The three ways
// a mapper breaks that property are three W131 never had to think about, and each gets its own
// check: a slot filled with a composed sentence, a `display` on a coding, and a narrative tidied in
// transit. The third is asserted with `===` on the exact string rather than "equivalent", because
// trimming whitespace is the edit a reviewer would call harmless and a professional-responsibility
// argument would not.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { lintEducationCopy } from "@/education/advice-lint";
import { ALL_REFERRAL_REASONS, ALL_REFERRAL_REQUESTS, type ReferralDocument } from "@/referrals/document";
import * as mod from "./referral-profile";
import {
  CONDITION_CODE_SYSTEM,
  PROFILE_READ_REFUSAL_COPY,
  REFERRAL_PROFILE_EMPTY_SLOTS,
  RECORDED_FACT_SYSTEM,
  SHIPPED_REFERRAL_PROFILES,
  referralFromProfile,
  referralToProfile,
} from "./referral-profile";

const SOURCE = readFileSync(path.join(process.cwd(), "src/interop/referral-profile.ts"), "utf8");
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");

/** The GP's own words, deliberately untidy: leading space, double space, no full stop, lower case. */
const MESSY = "  she has tried two stimulants  and neither suited her, wants to discuss non-stimulant options";

const doc = (over: Partial<ReferralDocument> = {}): ReferralDocument => ({
  referralId: "ref-1",
  fromPracticeId: "prac-a",
  toPracticeId: "prac-b",
  patientId: "pat-7",
  createdAt: "2026-08-20T09:15:00+10:00",
  createdBy: "cli-3",
  reason: "extended_scope",
  request: "shared_care",
  conditionCode: "adhd-adult",
  recordedFactCodes: ["fact-1", "fact-2"],
  narrative: { text: MESSY, authoredBy: "Dr A Example", authoredAt: "2026-08-20T09:14:00+10:00" },
  ...over,
});

describe("W236 the round trip is lossless over every reason and request", () => {
  it("returns the document unchanged, for every combination the vocabularies allow", () => {
    // Every reason × every request, not a sample — the vocabularies are small enough that a sample
    // is a choice nobody needs to make.
    let checked = 0;
    for (const reason of ALL_REFERRAL_REASONS) {
      for (const request of ALL_REFERRAL_REQUESTS) {
        const original = doc({ reason, request });
        const back = referralFromProfile(referralToProfile(original).resource, original.fromPracticeId);
        expect(back.read, `${reason}/${request} did not round trip`).toBe(true);
        if (!back.read) continue;
        checked += 1;
        expect(back.document, `${reason}/${request} changed`).toEqual(original);
      }
    }
    expect(checked).toBe(ALL_REFERRAL_REASONS.length * ALL_REFERRAL_REQUESTS.length);
    expect(checked).toBeGreaterThan(4);
  });

  it("keeps the condition code apart from the recorded facts", () => {
    // Caught while writing the reader: merging both into one `orderDetail` list made the round trip
    // lossy — a receiver could not tell a register code from a W120 fact code, and the document came
    // back with a null condition and one extra fact. Two different kinds of claim.
    const profile = referralToProfile(doc());
    const systems = profile.resource.orderDetail.map((d) => d.coding[0]!.system);
    expect(systems.filter((s) => s === CONDITION_CODE_SYSTEM)).toHaveLength(1);
    expect(systems.filter((s) => s === RECORDED_FACT_SYSTEM)).toHaveLength(2);
    const back = referralFromProfile(profile.resource, "prac-a");
    expect(back.read && back.document.conditionCode).toBe("adhd-adult");
    expect(back.read && back.document.recordedFactCodes).toEqual(["fact-1", "fact-2"]);
  });

  it("keeps a null condition code null rather than inventing one", () => {
    const back = referralFromProfile(referralToProfile(doc({ conditionCode: null })).resource, "prac-a");
    expect(back.read && back.document.conditionCode).toBeNull();
  });
});

describe("W236 no clinical text is authored, generated or edited here", () => {
  it("carries the clinician's words character-identical, untidied", () => {
    // `===` on the exact string, and the fixture is deliberately untidy — leading space, double
    // space, no full stop, lower case. Trimming it is the edit a reviewer calls harmless and a
    // professional-responsibility argument does not: those are the GP's words.
    const profile = referralToProfile(doc());
    expect(profile.resource.note?.[0]!.text).toBe(MESSY);
    const back = referralFromProfile(profile.resource, "prac-a");
    expect(back.read && back.document.narrative?.text).toBe(MESSY);
    expect(back.read && back.document.narrative?.text.startsWith("  ")).toBe(true);
  });

  it("leaves the note absent when the clinician wrote nothing", () => {
    // An absent narrative stays absent. Filling the gap with a generated summary would misattribute
    // this product's words to the referring clinician.
    const profile = referralToProfile(doc({ narrative: null }));
    expect(profile.resource.note).toBeUndefined();
    expect(JSON.stringify(profile.resource)).not.toContain("note");
    const back = referralFromProfile(profile.resource, "prac-a");
    expect(back.read && back.document.narrative).toBeNull();
  });

  it("emits no display on any coding, checked on the built resource", () => {
    // Where the clinical wording would go, one field further down than anybody looks. Checked on
    // the VALUE rather than the type, because a type is what a later `display?: string` widens.
    const serialised = JSON.stringify(referralToProfile(doc()).resource);
    expect(serialised).not.toContain("display");
    const codings = [
      ...referralToProfile(doc()).resource.category.flatMap((c) => c.coding),
      ...referralToProfile(doc()).resource.code.coding,
      ...referralToProfile(doc()).resource.orderDetail.flatMap((d) => d.coding),
    ];
    expect(codings.length).toBeGreaterThan(3);
    for (const coding of codings) expect(Object.keys(coding).sort()).toEqual(["code", "system"]);
  });

  it("composes no prose anywhere — no template, no join, no sentence", () => {
    // The bypass this property exists to close: a sentence composed from structured fields reads
    // like bookkeeping and IS clinical wording this tree wrote, travelling under a GP's name. The
    // module's only string literals are identifiers, systems and its own declared reasons.
    expect(Object.keys(mod).filter((k) => typeof (mod as Record<string, unknown>)[k] === "function").sort()).toEqual([
      "referralFromProfile",
      "referralToProfile",
    ]);
    // No template literal in the code builds anything but a reference: `Practitioner/…` and friends.
    for (const [template] of CODE.matchAll(/`[^`]*`/g)) {
      expect(template, `a composed string: ${template}`).toMatch(
        /^`(Practitioner|Patient|Organization)\/\$\{[^}]+\}`$/,
      );
    }
    // Scanned with the STRING LITERALS stripped as well as the comments. The word "summary" is in
    // this module's own declared reason for not generating one — a data value, not a code path —
    // and a scan that cannot tell an explanation from an instruction reports the explanation as
    // the violation. Third time this session a source scan has flagged the sentence explaining the
    // rule it enforces, and the first time the sentence was in code rather than a comment.
    const structure = CODE.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^'\\]|\\.)*'/g, "''");
    expect(structure, "the literal stripper removed the code too").toContain("export function referralToProfile");
    expect(structure).not.toMatch(/\.join\(|\bsummari[sz]e\s*\(|\bcompose\w*\s*\(|\bnarrativeText\b/i);
  });

  it("declares every slot it leaves empty, with what filling it would cost", () => {
    expect(REFERRAL_PROFILE_EMPTY_SLOTS.length).toBeGreaterThan(3);
    for (const slot of REFERRAL_PROFILE_EMPTY_SLOTS) {
      expect(slot.field).toMatch(/^ServiceRequest\./);
      expect(slot.why.length, `${slot.field} is left empty without a reason`).toBeGreaterThan(120);
    }
    // Priority especially: R4's is a clinical urgency judgement and W131's vocabulary is
    // operational, so deriving one would be this tree making a triage decision at the boundary.
    const priority = REFERRAL_PROFILE_EMPTY_SLOTS.find((s) => s.field.includes("priority"));
    expect(priority?.why).toMatch(/G7/);
    expect(JSON.stringify(referralToProfile(doc()).resource)).not.toContain("priority");
    // And the emptiness travels WITH the resource, not in a document somebody has to find.
    expect(referralToProfile(doc()).emptySlots).toBe(REFERRAL_PROFILE_EMPTY_SLOTS);
  });
});

describe("W236 it refuses rather than approximating, and it sends nothing", () => {
  it("refuses each unreadable resource with its own reason", () => {
    const good = referralToProfile(doc()).resource;
    const cases: Array<[string, unknown, keyof typeof PROFILE_READ_REFUSAL_COPY]> = [
      ["another resource", { resourceType: "Appointment" }, "not_a_service_request"],
      ["an unknown reason", { ...good, category: [{ coding: [{ system: "x", code: "y" }] }] }, "unknown_reason_code"],
      ["an unknown request", { ...good, code: { coding: [{ system: "x", code: "y" }] } }, "unknown_request_code"],
      ["no requester", { ...good, requester: { reference: "Organization/x" } }, "no_requester"],
      ["no subject", { ...good, subject: { reference: "Group/x" } }, "no_subject"],
      ["no performer", { ...good, performer: [] }, "no_performer"],
    ];
    const produced = new Set<string>();
    for (const [label, resource, expected] of cases) {
      const result = referralFromProfile(resource, "prac-a");
      expect(result.read, label).toBe(false);
      if (result.read) continue;
      expect(result.why, label).toBe(expected);
      expect(result.copy, label).toBe(PROFILE_READ_REFUSAL_COPY[expected]);
      produced.add(result.why);
    }
    expect([...produced].sort()).toEqual(Object.keys(PROFILE_READ_REFUSAL_COPY).sort());
  });

  it("ships nothing and reaches nothing", () => {
    expect(SHIPPED_REFERRAL_PROFILES).toEqual([]);
    expect(CODE).toContain("export function referralToProfile");
    expect(CODE).not.toMatch(/\bfetch\s*\(|axios|https?:\/\/[a-z]|XMLHttpRequest|WebSocket/);
  });

  it("passes the advice linter on everything it says", () => {
    for (const text of [
      ...Object.values(PROFILE_READ_REFUSAL_COPY),
      ...REFERRAL_PROFILE_EMPTY_SLOTS.map((s) => s.why),
    ]) {
      expect(lintEducationCopy(text).map((f) => f.rule), text.slice(0, 40)).toEqual([]);
    }
  });
});
