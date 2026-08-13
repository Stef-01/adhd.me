// W190: what a clinician can do about a profile that is wrong about them.
//
// A directory publishes claims about a named person, so that person needs a way to fix it. The
// obvious shape — "let them edit their profile" — is the one thing this must not be, and W113
// already wrote the sentence: **every action a clinician has can only REDUCE what the system
// claims about them.** W113 held that line for credentials, where the reason was that
// credentialing starts with the practice, which holds the evidence. Here the reason is sharper:
// an edit control on a public profile is a self-publication channel, and W183 and W184 spent two
// units making sure a claim cannot reach the directory without passing a type and a linter. A
// free-text "fix your profile" box hands it back.
//
// SO EVERY CORRECTION IS A REMOVAL OR A RESTATEMENT, AND THE TYPE SAYS WHICH. `CorrectionEffect`
// has two members — `removes` and `corrects` — and no `adds`. There is no argument that produces
// one, so a caller cannot obtain one and a future edit has to delete a stated refusal rather than
// pass a different flag.
//
// THE ONE THAT IS INTERESTING IS `acceptingNewPatients`, AND IT IS WHY "no control adds a claim"
// has to be checked per DIRECTION rather than per control. The same boolean is a reduction one
// way and an addition the other: turning it OFF withdraws an offer the profile was making;
// turning it ON asserts current capacity, which is a claim about the practice that nobody has
// checked and that goes stale on its own. So the correction exists in one direction only, and
// `REFUSED_CORRECTIONS` records the other with its reason. A clinician who wants to be listed as
// accepting patients again asks the practice, which is where the fact lives.
//
// `correct_display_name` is a RESTATEMENT rather than an addition, and it is the only free text
// that survives: a name is a fact about the person and getting somebody's name wrong in public is
// the failure a correction right exists for. It goes through W184's linter on the way, so the
// s 133 title claim cannot enter through the correction door either — which is the door it would
// most obviously be tried on, since it is the only one the clinician holds.
//
// Nothing here applies a correction silently. Each one is a recorded request naming who asked and
// when, in the W134/W188 shape: a correction with no requester is an assertion with a date on it,
// and "the directory changed itself" is not a sentence anybody should have to explain later.

import { type ProfileCopyViolation, lintProfile } from "./copy-lint";
import type { DirectoryProfile } from "./profile";

/**
 * What a correction does to the set of claims a profile makes.
 *
 * Two members, and the absent third is the control. Adding a claim to a public profile is not a
 * correction, it is publication, and publication goes through the practice and the linter.
 */
export type CorrectionEffect =
  /** A claim the profile was making is gone afterwards. */
  | "removes"
  /** The same claim, stated correctly. Never more claims than before. */
  | "corrects";

export type CorrectionKind =
  /** Take me out of the directory. The strongest correction, and always available. */
  | "withdraw_profile"
  /** This focus area is not mine, or not current. */
  | "remove_focus_area"
  /** I am not accepting new patients. One direction only — see the header. */
  | "stop_accepting_new_patients"
  /** This language is not one I offer. */
  | "remove_language"
  /** My name is wrong. A restatement, linted like any other copy. */
  | "correct_display_name";

export const CORRECTION_EFFECT: Readonly<Record<CorrectionKind, CorrectionEffect>> = {
  withdraw_profile: "removes",
  remove_focus_area: "removes",
  stop_accepting_new_patients: "removes",
  remove_language: "removes",
  correct_display_name: "corrects",
};

export const CORRECTION_COPY: Readonly<Record<CorrectionKind, string>> = {
  withdraw_profile:
    "Remove my profile from the directory. Nothing about you is listed afterwards; the record that you were listed, and when, is kept so the period can be checked.",
  remove_focus_area:
    "This is not something I see, or not any more. It comes off the profile — the directory does not decide what you do.",
  stop_accepting_new_patients:
    "Stop showing that I am accepting new patients. Turning it back on is a statement about the practice's capacity, so it is made by the practice rather than here.",
  remove_language:
    "This is not a language I offer consultations in.",
  correct_display_name:
    "My name is not written correctly. This restates the same fact; it is not a place to add a title.",
};

/**
 * Corrections that would ADD a claim, recorded with the reason each is refused.
 *
 * Data rather than a comment, so the test reads the same list a human does and a future unit has
 * to delete a stated refusal rather than simply add a case.
 */
export const REFUSED_CORRECTIONS: Readonly<Record<string, string>> = {
  add_focus_area:
    "A focus area is a claim about what a clinician does, and W79's rule is that what a clinician says is not what somebody verified. It reaches the directory through the practice and the credential, which is where the evidence is.",
  start_accepting_new_patients:
    "Turning this on asserts current capacity. Nobody has checked it, it goes stale on its own, and it is a statement about the practice rather than about the clinician — so the practice makes it.",
  add_language:
    "Adding a language is adding a claim about what a consultation can be conducted in. Removing one is a correction; adding one is publication.",
  claim_specialty:
    "A recognised specialty comes from the specialist register, not from the person. W183's type already refuses the shape; this refuses the request that would ask for it.",
  add_biography:
    "W183 refuses a `bio` field because a free-text paragraph is where every other refusal reappears in prose. A correction right that reintroduced one would undo that from the other side.",
};

/** A correction somebody asked for. Recorded, never applied silently. */
export interface CorrectionRequest {
  clinicianId: string;
  kind: CorrectionKind;
  /** Which focus area or language, for the removals that need one. */
  target?: string;
  /** The corrected name, for `correct_display_name`. */
  replacement?: string;
  requestedBy: string;
  at: string;
}

export type CorrectionRefusal =
  | "requester_missing"
  | "date_missing_or_unreadable"
  | "target_missing"
  | "replacement_missing"
  | "replacement_makes_a_claim"
  | "not_this_clinicians_profile";

export type CorrectionResult =
  | { ok: true; profile: DirectoryProfile | null; effect: CorrectionEffect }
  | { ok: false; errors: CorrectionRefusal[] };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * How many claims a profile makes.
 *
 * Not a display figure — it exists so the central property can be MEASURED rather than argued:
 * applying any correction must leave this the same or lower. A control that added a claim would
 * raise it, whatever its name said about itself.
 */
export function claimCount(profile: DirectoryProfile | null): number {
  if (profile === null) return 0;
  const focus = "focus" in profile && profile.focus ? profile.focus.length : 0;
  const specialty = "specialty" in profile && profile.specialty ? 1 : 0;
  return focus + specialty + profile.languages.length + (profile.acceptingNewPatients ? 1 : 0);
}

/**
 * Apply a correction.
 *
 * Returns the corrected profile, or null when the correction was a withdrawal — null is "not
 * listed", which is a real answer rather than an error, and it is the one a caller must handle
 * explicitly rather than receiving an empty profile that still renders.
 */
export function applyCorrection(
  profile: DirectoryProfile,
  request: CorrectionRequest,
): CorrectionResult {
  const errors: CorrectionRefusal[] = [];
  if (request.requestedBy.trim() === "") errors.push("requester_missing");
  if (!ISO_DATE.test(request.at)) errors.push("date_missing_or_unreadable");
  if (request.clinicianId !== profile.clinicianId) errors.push("not_this_clinicians_profile");

  const needsTarget = request.kind === "remove_focus_area" || request.kind === "remove_language";
  if (needsTarget && (request.target ?? "").trim() === "") errors.push("target_missing");

  if (request.kind === "correct_display_name") {
    const replacement = (request.replacement ?? "").trim();
    if (replacement === "") errors.push("replacement_missing");
    else {
      // Linted through W184, on the profile it would produce. The correction door is the one a
      // title claim would most obviously be tried on, because it is the only door the clinician
      // holds — so it gets the same check every other field gets, by calling the same linter
      // rather than by repeating its rules.
      const proposed = { ...profile, displayName: replacement } as DirectoryProfile;
      if (lintProfile(proposed).some((v) => v.field === "displayName")) {
        errors.push("replacement_makes_a_claim");
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const effect = CORRECTION_EFFECT[request.kind];
  switch (request.kind) {
    case "withdraw_profile":
      return { ok: true, profile: null, effect };
    case "stop_accepting_new_patients":
      return { ok: true, profile: { ...profile, acceptingNewPatients: false }, effect };
    case "remove_language":
      return {
        ok: true,
        profile: { ...profile, languages: profile.languages.filter((l) => l !== request.target) },
        effect,
      };
    case "remove_focus_area":
      return {
        ok: true,
        profile:
          "focus" in profile && profile.focus
            ? { ...profile, focus: profile.focus.filter((f) => f.label !== request.target) }
            : profile,
        effect,
      };
    case "correct_display_name":
      return { ok: true, profile: { ...profile, displayName: request.replacement!.trim() }, effect };
  }
}

/** What the linter said about a rejected name, for a caller that wants to show it. */
export function explainRejectedName(
  profile: DirectoryProfile,
  replacement: string,
): ProfileCopyViolation[] {
  return lintProfile({ ...profile, displayName: replacement } as DirectoryProfile).filter(
    (v) => v.field === "displayName",
  );
}

export const CORRECTION_REFUSAL_COPY: Record<CorrectionRefusal, string> = {
  requester_missing:
    "Nobody is recorded as having asked for this. A correction with no requester is an assertion with a date on it.",
  date_missing_or_unreadable: "No readable date for the request.",
  target_missing: "Say which one. A removal that does not name its target would remove the wrong thing or nothing.",
  replacement_missing: "A corrected name was not supplied, so there is nothing to correct it to.",
  replacement_makes_a_claim:
    "That name carries a claim rather than only a name. A correction restates a fact; it is not a route around the checks every other field goes through.",
  not_this_clinicians_profile:
    "This profile is about somebody else. A correction right is a right over your own entry.",
};
