// W238 verify gate: "every code carries provenance; an unbound code is refused rather than guessed,
// and the refusal names the code."
//
// The refusal naming the code is the row's sharpest requirement and the easiest to satisfy weakly:
// "some codes are unbound" passes a careless reading and leaves nobody able to act. So the tests
// check the NAME is in the refusal and that the unbound list is per-code rather than a count.
//
// The work order is the other half. It is derived from the lane's own vocabularies, so it is
// checked against the codings the mappings actually emit — both directions, because a work order
// listing codes nothing emits is as useless as one missing codes something does.

import { describe, expect, it } from "vitest";
import { lintEducationCopy } from "@/education/advice-lint";
import { ALL_REFERRAL_REASONS, ALL_REFERRAL_REQUESTS, type ReferralDocument } from "@/referrals/document";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import { codeSystemsIn } from "./contract";
import { APPOINTMENT_TYPE_MAP, appointmentToFhir } from "./fhir";
import { referralToProfile } from "./referral-profile";
import * as mod from "./terminology";
import {
  ALL_TERMINOLOGIES,
  OPEN_LOCAL_SYSTEMS,
  SHIPPED_BINDINGS,
  bindCode,
  codesNeedingBinding,
  loadBindings,
  unboundCodes,
  type TerminologyBinding,
} from "./terminology";

const sim = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6 });

/** A valid row. Every rejection fixture below breaks exactly one thing in it. */
const GOOD: TerminologyBinding = {
  localSystem: "https://adhd.me/fhir/CodeSystem/appointment-type",
  localCode: "long",
  terminology: "snomed-ct-au",
  conceptId: "000000000000000000",
  provenance: {
    citation: "FIXTURE ONLY — not a real citation, and the concept id above is not a real concept.",
    url: "https://example.test/fixture",
    releaseVersion: "fixture-release",
    retrievedOn: "2026-08-21",
  },
};

const referral = (over: Partial<ReferralDocument> = {}): ReferralDocument => ({
  referralId: "ref-1",
  fromPracticeId: "prac-a",
  toPracticeId: "prac-b",
  patientId: "pat-7",
  createdAt: "2026-08-20T09:15:00+10:00",
  createdBy: "cli-3",
  reason: "extended_scope",
  request: "shared_care",
  conditionCode: "adhd-adult",
  recordedFactCodes: ["fact-1"],
  narrative: null,
  ...over,
});

describe("W238 the bindings ship empty, and nothing is guessed", () => {
  it("ships nothing, pinned", () => {
    expect(SHIPPED_BINDINGS).toEqual([]);
    expect(loadBindings(SHIPPED_BINDINGS).bindings).toEqual([]);
  });

  it("refuses every code the lane emits, naming each one", () => {
    // The row's sharpest requirement. Not "some codes are unbound" — every code, by name.
    const empty = loadBindings(SHIPPED_BINDINGS);
    const unbound = unboundCodes(empty);
    expect(unbound.length).toBe(codesNeedingBinding().length);
    expect(unbound.length).toBeGreaterThan(8);
    for (const code of unbound) {
      const result = bindCode(empty, code.system, code.code);
      expect(result.bound).toBe(false);
      if (result.bound) continue;
      // The specific code is IN the sentence, so whoever has to find the concept knows which one.
      expect(result.copy, `${code.code} is refused anonymously`).toContain(`"${code.code}"`);
      expect(result.copy).toContain(code.system);
      expect(result.localCode).toBe(code.code);
      // And the work order says where to look.
      expect(code.emittedBy).toMatch(/^src\/interop\//);
    }
  });

  it("offers no nearest match, no default terminology and no unknown concept", () => {
    // A binding that guesses is worse than none: an unbound code is a gap somebody fills, a wrongly
    // bound one is a fact a clinician acts on.
    expect(Object.keys(mod).filter((k) => typeof (mod as Record<string, unknown>)[k] === "function").sort()).toEqual([
      "bindCode",
      "codesNeedingBinding",
      "loadBindings",
      "unboundCodes",
    ]);
    // @ts-expect-error — no options bag with a fallback in it.
    void bindCode(loadBindings([]), "sys", "code", { fallback: "138875005" });
    const copy = bindCode(loadBindings([]), "sys", "code");
    expect(copy.bound).toBe(false);
    if (!copy.bound) expect(copy.copy).toMatch(/rather than matched to the nearest concept/);
  });

  it("binds a code once one is recorded, so the refusal is about the record not the code", () => {
    const loaded = loadBindings([GOOD]);
    expect(loaded.bindings).toHaveLength(1);
    expect(loaded.rejected).toEqual([]);
    const result = bindCode(loaded, GOOD.localSystem, GOOD.localCode);
    expect(result.bound).toBe(true);
    if (!result.bound) return;
    expect(result.binding.conceptId).toBe(GOOD.conceptId);
    // And that code drops out of the work order, which is what makes the list a work order.
    expect(unboundCodes(loaded).map((c) => c.code)).not.toContain("long");
    expect(unboundCodes(loaded).length).toBe(codesNeedingBinding().length - 1);
  });
});

describe("W238 every binding carries provenance, and a bad row is refused by name", () => {
  it("refuses each incomplete row with its reason and its code", () => {
    const cases: Array<[string, unknown, RegExp]> = [
      ["not an object", "long", /not an object/],
      ["no local system", { ...GOOD, localSystem: "" }, /belongs to nothing/],
      ["no local code", { ...GOOD, localCode: "" }, /local code missing/],
      ["unknown terminology", { ...GOOD, terminology: "icd-10" }, /must be one of/],
      ["no concept id", { ...GOOD, conceptId: "" }, /concept id missing/],
      ["no provenance", { ...GOOD, provenance: undefined }, /provenance missing/],
      ["thin citation", { ...GOOD, provenance: { ...GOOD.provenance, citation: "SNOMED" } }, /too short/],
      ["http url", { ...GOOD, provenance: { ...GOOD.provenance, url: "http://x.test" } }, /https/],
      ["no release version", { ...GOOD, provenance: { ...GOOD.provenance, releaseVersion: "" } }, /inactivated between releases/],
      ["bad retrievedOn", { ...GOOD, provenance: { ...GOOD.provenance, retrievedOn: "August" } }, /retrievedOn/],
    ];
    for (const [label, row, reason] of cases) {
      const result = loadBindings([row]);
      expect(result.bindings, `${label} was accepted`).toEqual([]);
      expect(result.rejected, `${label} was dropped silently`).toHaveLength(1);
      expect(result.rejected[0]!.reason, label).toMatch(reason);
      // Named, always: a rejection nobody can trace to a row is a rejection nobody can fix.
      expect(result.rejected[0]!.localCode.length, label).toBeGreaterThan(0);
    }
  });

  it("refuses a duplicate local code rather than letting the last one win", () => {
    const result = loadBindings([GOOD, { ...GOOD, conceptId: "111111111111111111" }]);
    expect(result.bindings).toHaveLength(1);
    expect(result.bindings[0]!.conceptId).toBe(GOOD.conceptId);
    expect(result.rejected[0]!.reason).toMatch(/duplicate local code/);
    expect(result.rejected[0]!.localCode).toBe("long");
  });

  it("declares both terminologies, and refuses anything else", () => {
    expect([...ALL_TERMINOLOGIES].sort()).toEqual(["loinc", "snomed-ct-au"]);
    for (const terminology of ALL_TERMINOLOGIES) {
      expect(loadBindings([{ ...GOOD, terminology }]).bindings).toHaveLength(1);
    }
  });
});

describe("W238 the work order is derived from what the lane emits, both directions", () => {
  it("lists every code the mappings actually emit under a closed system", () => {
    // Derived rather than hand-listed, so it cannot go stale. Checked against the codings the
    // mappings really produce — a work order missing a code something emits is the failure.
    const emitted = new Set<string>();
    for (const appointment of sim.appointments.slice(0, 200)) {
      const resource = appointmentToFhir(appointment).resource;
      for (const coding of resource.appointmentType?.coding ?? []) emitted.add(`${coding.system}::${coding.code}`);
    }
    for (const reason of ALL_REFERRAL_REASONS) {
      for (const request of ALL_REFERRAL_REQUESTS) {
        const resource = referralToProfile(referral({ reason, request })).resource;
        for (const coding of [...resource.category.flatMap((c) => c.coding), ...resource.code.coding]) {
          emitted.add(`${coding.system}::${coding.code}`);
        }
      }
    }
    const listed = new Set(codesNeedingBinding().map((c) => `${c.system}::${c.code}`));
    expect(emitted.size).toBeGreaterThan(5);
    expect([...emitted].filter((e) => !listed.has(e)), "emitted but not in the work order").toEqual([]);
  });

  it("names the open systems rather than leaving them out of the work order", () => {
    // "This system has no fixed vocabulary" and "nobody has listed this system's vocabulary yet"
    // are different facts, and a reader of the work order would otherwise have to guess which.
    expect(OPEN_LOCAL_SYSTEMS.length).toBe(2);
    const openSystems = new Set(OPEN_LOCAL_SYSTEMS.map((o) => o.system));
    for (const listed of codesNeedingBinding()) {
      expect(openSystems.has(listed.system), `${listed.system} is both open and enumerated`).toBe(false);
    }
    for (const open of OPEN_LOCAL_SYSTEMS) {
      expect(open.why.length, `${open.system} is open without a reason`).toBeGreaterThan(80);
    }
    // Every system the referral emits is either enumerated or declared open — no third category.
    const resource = referralToProfile(referral()).resource;
    const systems = new Set(codeSystemsIn(resource));
    expect(systems.size).toBeGreaterThan(2);
    const enumerated = new Set(codesNeedingBinding().map((c) => c.system));
    for (const system of systems) {
      expect(enumerated.has(system) || openSystems.has(system), `${system} is neither enumerated nor open`).toBe(true);
    }
  });

  it("passes the advice linter on everything it says", () => {
    // Bound to a variable first: TypeScript cannot narrow across two separate calls, and
    // `bindCode(...).bound ? "" : bindCode(...).copy` typechecks as an error while vitest runs it
    // happily. Second time this session a spec passed on a file that did not compile — the spec
    // run is not the gate.
    const refusal = bindCode(loadBindings([]), "sys", "code");
    const texts = [
      refusal.bound ? "" : refusal.copy,
      ...OPEN_LOCAL_SYSTEMS.map((o) => o.why),
      ...loadBindings([{ ...GOOD, conceptId: "" }]).rejected.map((r) => r.reason),
    ];
    for (const text of texts) {
      expect(lintEducationCopy(text).map((f) => f.rule), text.slice(0, 40)).toEqual([]);
    }
  });
});
