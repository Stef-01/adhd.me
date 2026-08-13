// W190 verify gate: every control reduces or corrects a claim; none adds one (W113's rule).

import { describe, expect, it } from "vitest";
import { scopeStatement } from "@/credentials/scope";
import * as mod from "./correction";
import {
  CORRECTION_COPY,
  CORRECTION_EFFECT,
  type CorrectionKind,
  type CorrectionRequest,
  REFUSED_CORRECTIONS,
  applyCorrection,
  claimCount,
  explainRejectedName,
} from "./correction";
import type { GeneralProfile } from "./profile";

const focusOf = (label: string) => {
  const result = scopeStatement({
    credentialId: "cred-1",
    scope: { kind: "condition", conditionCode: "placeholder_register_a" },
    label,
    permits: [],
  });
  if (!result.ok) throw new Error(result.violations.join(", "));
  return result.statement;
};

const profile = (over: Partial<GeneralProfile> = {}): GeneralProfile => ({
  clinicianId: "clin-1",
  displayName: "Dr Jane Smith",
  ahpraRegistrationNumber: "MED0001234567",
  location: { practiceId: "prac-1", suburb: "Coburg", state: "VIC" },
  languages: ["English", "Greek"],
  acceptingNewPatients: true,
  descriptor: { kind: "general_registration", profession: "general_practitioner" },
  focus: [focusOf("women's health"), focusOf("chronic disease care")],
  ...over,
});

const request = (over: Partial<CorrectionRequest> & { kind: CorrectionKind }): CorrectionRequest => ({
  clinicianId: "clin-1",
  requestedBy: "clin-1",
  at: "2026-04-01",
  ...over,
});

const ALL_KINDS = Object.keys(CORRECTION_EFFECT) as CorrectionKind[];

describe("W190 no control adds a claim", () => {
  it("declares an effect for every kind, and none of them adds", () => {
    // W113's sentence, and the type is what enforces it: `CorrectionEffect` has no `adds`, so
    // there is no value a future control could be given.
    expect(ALL_KINDS.length).toBeGreaterThan(3);
    for (const kind of ALL_KINDS) {
      expect(["removes", "corrects"], `${kind} has an effect outside the two allowed`).toContain(
        CORRECTION_EFFECT[kind],
      );
      expect(CORRECTION_COPY[kind], `${kind} has no copy`).toBeDefined();
    }
  });

  it("applying any correction leaves the profile making no more claims than before", () => {
    // Measured rather than argued. A control that added a claim would raise this count whatever
    // its name said about itself, so this is the assertion that would catch a mislabelled one.
    const before = claimCount(profile());
    expect(before).toBeGreaterThan(3);
    const targets: Record<CorrectionKind, Partial<CorrectionRequest>> = {
      withdraw_profile: {},
      remove_focus_area: { target: "women's health" },
      stop_accepting_new_patients: {},
      remove_language: { target: "Greek" },
      correct_display_name: { replacement: "Dr Jane Smyth" },
    };
    for (const kind of ALL_KINDS) {
      const result = applyCorrection(profile(), request({ kind, ...targets[kind] }));
      expect(result.ok, `${kind} was refused: ${result.ok ? "" : result.errors.join(", ")}`).toBe(true);
      if (!result.ok) continue;
      expect(claimCount(result.profile), `${kind} increased the claims a profile makes`).toBeLessThanOrEqual(before);
    }
  });

  it("each removal actually removes the thing it names", () => {
    // Non-vacuous from the other side: a no-op would also satisfy "no more claims than before".
    const language = applyCorrection(profile(), request({ kind: "remove_language", target: "Greek" }));
    expect(language.ok && language.profile!.languages).toEqual(["English"]);

    const focus = applyCorrection(profile(), request({ kind: "remove_focus_area", target: "women's health" }));
    expect(focus.ok && (focus.profile as GeneralProfile).focus.map((f) => f.label)).toEqual([
      "chronic disease care",
    ]);

    const capacity = applyCorrection(profile(), request({ kind: "stop_accepting_new_patients" }));
    expect(capacity.ok && capacity.profile!.acceptingNewPatients).toBe(false);
  });

  it("withdrawal returns not-listed rather than an empty profile that still renders", () => {
    const result = applyCorrection(profile(), request({ kind: "withdraw_profile" }));
    expect(result.ok && result.profile).toBeNull();
    expect(claimCount(null)).toBe(0);
  });

  it("exports no function that could add one", () => {
    expect(Object.keys(mod).sort()).toEqual([
      "CORRECTION_COPY",
      "CORRECTION_EFFECT",
      "CORRECTION_REFUSAL_COPY",
      "REFUSED_CORRECTIONS",
      "applyCorrection",
      "claimCount",
      "explainRejectedName",
    ]);
    // The pinned list above is the guarantee; this catches a future export a reviewer waves
    // through. Additive VERBS only — `claimCount` starts with "claim" as a noun and measures the
    // claims a profile makes rather than making one, and a heuristic that cannot tell the
    // measurement from the thing measured fails on the instrument. (Third time today: W184's
    // copy scan and W188's import scan both tripped on their own subject matter.)
    for (const name of Object.keys(mod)) {
      expect(name, `${name} sounds additive`).not.toMatch(/^(add|create|publish|assert|grant|award)/i);
    }
  });
});

describe("W190 the same field is a reduction one way and an addition the other", () => {
  it("offers only the direction that withdraws the offer", () => {
    // The reason "no control adds a claim" has to be checked per DIRECTION. Turning capacity ON
    // asserts something nobody checked and that goes stale by itself.
    expect(ALL_KINDS).toContain("stop_accepting_new_patients");
    expect(ALL_KINDS as string[]).not.toContain("start_accepting_new_patients");
    expect(Object.keys(REFUSED_CORRECTIONS)).toContain("start_accepting_new_patients");
  });

  it("records why each refused correction is refused, as data a test can read", () => {
    for (const [kind, why] of Object.entries(REFUSED_CORRECTIONS)) {
      expect(why.length, `${kind} is refused without a reason`).toBeGreaterThan(80);
      expect(ALL_KINDS as string[], `${kind} is both offered and refused`).not.toContain(kind);
    }
    expect(Object.keys(REFUSED_CORRECTIONS).length).toBeGreaterThan(3);
  });

  it("refuses the additions W79 and W183 already refused, from this side too", () => {
    expect(REFUSED_CORRECTIONS.add_focus_area).toMatch(/W79/);
    expect(REFUSED_CORRECTIONS.claim_specialty).toMatch(/specialist register/);
    expect(REFUSED_CORRECTIONS.add_biography).toMatch(/free-text/);
  });
});

describe("W190 a name correction is a restatement, not a door", () => {
  it("accepts a genuine spelling fix", () => {
    const result = applyCorrection(
      profile(),
      request({ kind: "correct_display_name", replacement: "  Dr Jane Smyth  " }),
    );
    expect(result.ok && result.profile!.displayName).toBe("Dr Jane Smyth");
  });

  it("refuses a name that carries a title claim", () => {
    // The door a title claim would most obviously be tried on, because it is the only one the
    // clinician holds. W184's linter is CALLED rather than its rules repeated.
    for (const attempt of ["Dr Jane Smith, Diabetes Specialist", "Dr Jane Smith — specialises in diabetes"]) {
      const result = applyCorrection(profile(), request({ kind: "correct_display_name", replacement: attempt }));
      expect(result.ok, attempt).toBe(false);
      if (result.ok) continue;
      expect(result.errors).toContain("replacement_makes_a_claim");
    }
  });

  it("says which rule refused it rather than only that something did", () => {
    const violations = explainRejectedName(profile(), "Dr Jane Smith, Diabetes Specialist");
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.every((v) => v.field === "displayName")).toBe(true);
  });

  it("still allows a surname the marketing rules collide with", () => {
    // W184's stated exclusion has to survive the correction path too, or a clinician named Best
    // can be published but not corrected.
    const result = applyCorrection(profile(), request({ kind: "correct_display_name", replacement: "Dr Sarah Best" }));
    expect(result.ok).toBe(true);
  });

  it("refuses an empty replacement rather than blanking the name", () => {
    const result = applyCorrection(profile(), request({ kind: "correct_display_name", replacement: "   " }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("replacement_missing");
  });
});

describe("W190 a correction is recorded, and it is over your own entry", () => {
  it("refuses a correction with no requester", () => {
    const result = applyCorrection(profile(), request({ kind: "withdraw_profile", requestedBy: " " }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("requester_missing");
  });

  it("refuses a correction aimed at somebody else's profile", () => {
    const result = applyCorrection(profile(), request({ kind: "withdraw_profile", clinicianId: "clin-2" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("not_this_clinicians_profile");
  });

  it("returns every problem rather than the first", () => {
    const result = applyCorrection(
      profile(),
      request({ kind: "remove_language", clinicianId: "clin-2", requestedBy: "", at: "nope" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.sort()).toEqual([
      "date_missing_or_unreadable",
      "not_this_clinicians_profile",
      "requester_missing",
      "target_missing",
    ]);
  });

  it("refuses a removal that does not name its target", () => {
    const result = applyCorrection(profile(), request({ kind: "remove_focus_area" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("target_missing");
  });
});
