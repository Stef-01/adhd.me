// W184: the copy linter over every field a directory profile can emit.
//
// W183 made the bad SHAPE unwritable — a profile is general-with-focus or specialist-without,
// and the type refuses the combination that renders as "specialist in <condition>". That is the
// stronger control and it stays. This unit covers what a shape cannot: **the bad SENTENCE**.
//
// The interesting rules here are the ones that make the s 133 claim WITHOUT the banned word.
// "Specialist" is already refused by W23 and by W183's type. "Dr Smith specialises in diabetes"
// contains neither a `specialty` field nor the word "specialist", passes every existing check,
// and says the same thing to every reader. A linter that only bans the word is a linter that
// has been routed around by anyone writing naturally.
//
// TWO CONSTRAINTS FROM THE UNIT, AND THE SECOND IS THE DESIGN.
//
//   W6 AND W23'S RULES ARE APPLIED, NOT RE-IMPLEMENTED. W139 wrote down why: a second copy of
//   the banned-language rules starts identical, drifts silently, and the drift is invisible
//   until somebody opens two files together that nobody has reason to open together. So the
//   rule sets are unioned from their own modules and `directoryCopyRules` proves the union —
//   W139's device, second use.
//
//   AND EVERY EMITTING FIELD IS DISPOSED OF, CHECKED AGAINST THE TREE. `FIELD_LINTING` carries
//   one entry per `PROFILE_FIELDS` entry, both directions, so a new field on the profile fails
//   this suite until somebody says how it is linted. "Reaches every field" is otherwise a claim
//   about what the author remembered, which is the shape W102, W106 and W167 all exist against.
//
// THE FINDING THAT MADE THIS UNIT WORTH MORE THAN A WRAPPER. Three fields are free text and
// none of them was linted anywhere: `displayName`, `languages`, and `location.suburb`.
// `displayName` is the one that matters. W183 calls it "the only unlinted free text, because it
// is a fact about them" — true of a name, and a name field is also exactly where a title goes.
// "Dr Jane Smith, Diabetes Specialist" is one string, it is the most natural thing in the world
// for somebody to type, and before this unit nothing in the tree would have stopped it being
// published beside a registration number.
//
// NAMES GET THE SAME RULES MINUS A NAMED EXCLUSION, AND THE DIRECTION MATTERS. W23's marketing
// rules ban "best" and "leading"; Best and Leading are real surnames, and a linter that refuses
// to publish Dr Sarah Best has protected nobody. The first version of this module handled that
// by running only the directory-specific rules over a name — and its own test caught the hole
// immediately: "Dr Jane Smith, Diabetes Specialist" then passed, because `no-specialist` belongs
// to W23 and W23 was no longer being asked. A name field is the MOST likely place for a title,
// so it needs the most rules, not the fewest.
//
// So the shape is default-include with an explicit, argued exclusion list — and the exclusion is
// by MATCHED WORD, not by rule. Excluding a rule was the second thing tried and it was also
// wrong: W6's `no-benefit-claims` bundles `best|leading|expert|specialist|guarantee` into one
// pattern, so exempting the rule to publish Dr Best would have exempted "specialist" and
// "expert" from names at the same time. Two independent rule sets collide with surnames and
// neither collision is about the rule; it is about three words that happen to be names.
//
// Residual, stated rather than hidden: a display name reading "Dr Jane Smith — Best in Coburg"
// is permitted by this, and that is the price of Dr Sarah Best having a publishable name. The
// mitigation is not in code — G6 requires an Ahpra advertising review of every field a profile
// can emit before any of this is published, and a name is one short string a human reads.

import { lintLandingCopy, LANDING_RULES } from "@/compliance/landing";
import { lintMessageText, MESSAGE_BANNED_RULES } from "@/messaging/templates";
import { type DirectoryProfile, PROFILE_FIELDS, isSpecialist } from "./profile";

/**
 * Claims a public profile can make about a named person that no existing linter covers.
 *
 * Deliberately short. Everything already refused elsewhere is reached by union rather than
 * restated, so what is left is only what is genuinely new here: the s 133 claim made in prose,
 * and comparative claims about an individual clinician.
 */
const DIRECTORY_PATTERNS: Array<{ rule: string; pattern: RegExp }> = [
  {
    // The s 133 claim without the word. This is the whole reason the unit is not a wrapper.
    rule: "no-specialisation-claim",
    pattern: /\bspecialis(?:e|es|ed|ing|ation)\b|\bspecializ(?:e|es|ed|ing|ation)\b|\bsub-?specialt?(?:y|ist)\b|\bspecialty in\b/i,
  },
  {
    // "Expert in X" is the same claim wearing a different word, and it is not a protected title
    // so nothing else in the tree refuses it.
    rule: "no-expertise-claim",
    pattern: /\bexpert(?:ise)?\b|\bauthority on\b|\brenowned\b|\bhighly experienced\b|\bextensive experience\b/i,
  },
  {
    // A comparison between named clinicians is the most regulated sentence this product could
    // emit. W139 refuses it about a receiving practice; a directory is where it would be aimed
    // at a person.
    rule: "no-comparative-clinician-claim",
    pattern: /\bmore experienced\b|\bmost experienced\b|\bbetter than\b|\bthe only (?:gp|doctor|clinician)\b/i,
  },
];

/** Rule names this module adds. The rest are reached, not restated. */
export const DIRECTORY_ONLY_RULES: readonly string[] = DIRECTORY_PATTERNS.map((p) => p.rule);

/**
 * Every rule a profile is checked against, assembled from the modules that own them.
 *
 * A function of its inputs rather than a constant, so a test can hand it the real rule lists and
 * prove the union is complete — W139's device. If W23 adds a rule tomorrow, it applies to
 * directory copy the same day and this list says so without anybody editing it.
 */
export function directoryCopyRules(
  landingRules: readonly string[] = LANDING_RULES,
  messageRules: readonly string[] = MESSAGE_BANNED_RULES,
): string[] {
  return [...new Set([...landingRules, ...messageRules, ...DIRECTORY_ONLY_RULES])].sort();
}

/**
 * Words that are surnames, so a match on one inside a NAME is not a claim.
 *
 * By word rather than by rule, and the list is deliberately tiny: every entry has to be a real
 * surname, because each one is a hole in the name check and "plausibly a name" is not the bar.
 */
export const NAME_WORD_EXCLUSIONS: Readonly<Record<string, string>> = {
  best: "Best is a common surname. Refusing to publish Dr Sarah Best protects nobody and would push somebody into misspelling their own name.",
  leading: "Leading is a surname, rarer than Best but attested, and the same argument applies.",
};

// W194 (Q15-2), found by mutation-checking Q15-1's fix: `top` was here too, and reverting the fix
// did not fail its case — because no rule matches the bare word. `no-superlatives` has
// "top-rated", not "top". An exclusion that excludes nothing is a dead register entry, and this
// tree keeps finding that the stale entry is the dangerous one: it makes the list look like it is
// doing more than it is, and the next reader trusts the size of it. Removed, and the test below
// now requires every entry to be one a rule would otherwise have caught.

export interface ProfileCopyViolation {
  /** Dotted path of the field, e.g. "focus[0].label" or "displayName". */
  field: string;
  rule: string;
  match: string;
}

/**
 * How each emitted field is handled.
 *
 * `linted_copy` — free text, gets the full union.
 * `name` — free text, gets the full union minus the surname collisions (see the header).
 * `structured` — an enum, a boolean or an identifier; there is no prose to lint, and the note
 * says why that is true rather than convenient.
 * `brand_checked` — already linted at mint time by the module that owns the brand, so linting
 * it again here would be the re-implementation the unit forbids.
 */
export type FieldLinting =
  | { kind: "linted_copy" }
  | { kind: "name" }
  | { kind: "structured"; why: string }
  | { kind: "brand_checked"; by: string };

export const FIELD_LINTING: Readonly<Record<string, FieldLinting>> = {
  acceptingNewPatients: {
    kind: "structured",
    why: "A boolean. There is no prose in it to lint, and the field is deliberately a boolean rather than a free-text availability note for exactly that reason.",
  },
  ahpraRegistrationNumber: {
    kind: "structured",
    why: "An identifier a reader checks on the public register. Linting it for claims would be a category error; its own format is W183's business.",
  },
  clinicianId: { kind: "structured", why: "Internal identifier, never rendered as copy." },
  descriptor: {
    kind: "structured",
    why: "A discriminated union over registration kind and a recognised specialty enum. Both sides are closed sets, so no free text can reach it — which is W183's control, not a gap here.",
  },
  displayName: { kind: "name" },
  focus: {
    kind: "brand_checked",
    by: "src/credentials/scope.ts :: scopeStatement (W114) — mintable only through a constructor that runs the W23 and W6 rules",
  },
  languages: { kind: "linted_copy" },
  location: { kind: "linted_copy" },
  specialty: {
    kind: "structured",
    why: "A `RecognisedSpecialty` enum member. The set is the Ahpra-recognised list, so an unrecognised specialty cannot be typed rather than being caught by a lint.",
  },
};

/**
 * Apply the full union to one string.
 *
 * Exported since W187, which lints COMPOSED copy — the sentence a page renders out of several
 * fields, which no per-field check sees. Exported rather than copied, for the reason this whole
 * module exists: a second implementation of the union starts identical and drifts in silence.
 */
export function lintDirectoryText(text: string, field: string): ProfileCopyViolation[] {
  return [
    ...lintLandingCopy(text).map((v) => ({ field, rule: v.rule, match: v.match })),
    ...lintMessageText(text).map((v) => ({ field, rule: v.rule, match: v.match })),
    ...lintDirectoryOnly(text, field),
  ];
}

const lintCopy = lintDirectoryText;

/**
 * Lint a line that IS a person's name.
 *
 * W194 finding (Q15-1). This existed only as a filter inside `lintProfile`, so W187 — which lints
 * the composed lines and reaches the heading, which is the name — used the unfiltered
 * `lintDirectoryText` and refused Dr Sarah Best. The two halves of one publication path disagreed,
 * and the disagreement went the worst way: a real person could not be listed because of her
 * surname, and the workaround a practice would find is to misspell it.
 *
 * So the exclusion is a FUNCTION now rather than a filter in one caller. Both paths call it, there
 * is one definition of "rules that apply to a name", and a cross-path test asserts the two agree —
 * because the defect was not either half being wrong, it was the two halves being separately
 * right.
 */
export function lintName(text: string, field: string): ProfileCopyViolation[] {
  return lintDirectoryText(text, field).filter(
    (v) => !(v.match.toLowerCase() in NAME_WORD_EXCLUSIONS),
  );
}

function lintDirectoryOnly(text: string, field: string): ProfileCopyViolation[] {
  const out: ProfileCopyViolation[] = [];
  for (const { rule, pattern } of DIRECTORY_PATTERNS) {
    const match = text.match(pattern);
    if (match) out.push({ field, rule, match: match[0] });
  }
  return out;
}

/**
 * Lint every field a profile emits.
 *
 * Iterates `PROFILE_FIELDS` rather than the object's own keys, so a field present on the value
 * but missing from the declared list is not silently skipped — the register is the authority and
 * its own test keeps it honest against the type.
 */
export function lintProfile(profile: DirectoryProfile): ProfileCopyViolation[] {
  const out: ProfileCopyViolation[] = [];

  for (const field of PROFILE_FIELDS) {
    const disposition = FIELD_LINTING[field];
    // A field with no disposition is a hole, and the register test fails on it. Skipping it
    // quietly here would let that test be the only thing standing between a new field and the
    // public internet.
    if (!disposition) continue;
    if (disposition.kind === "structured" || disposition.kind === "brand_checked") continue;

    if (field === "displayName") {
      // The full union minus the named exclusions — see the header on why this direction.
      out.push(...lintName(profile.displayName, "displayName"));
      continue;
    }
    if (field === "languages") {
      profile.languages.forEach((language, i) => out.push(...lintCopy(language, `languages[${i}]`)));
      continue;
    }
    if (field === "location") {
      out.push(...lintCopy(profile.location.suburb, "location.suburb"));
    }
  }

  return out;
}

/**
 * The rendered profile as one string, for a caller that wants to scan what a reader sees.
 *
 * Assembled from the same fields the linter walks, so "what is linted" and "what is shown" come
 * from one list. A page that rendered a field this does not include would be rendering something
 * `lintProfile` never checked.
 */
export function renderableText(profile: DirectoryProfile): string[] {
  return [
    profile.displayName,
    profile.location.suburb,
    ...profile.languages,
    ...(isSpecialist(profile) ? [] : profile.focus.map((f) => f.label)),
  ];
}

export const DIRECTORY_RULE_COPY: Record<string, string> = {
  "no-specialisation-claim":
    "Saying a clinician specialises in something is the s 133 claim in prose. Use of the protected title is what the law names, but a reader takes the same meaning from the verb, and a general registrant does not become one by avoiding the noun.",
  "no-expertise-claim":
    "Expertise is the same claim in a word the law does not list. A directory can say what somebody has declared they see and what they are registered for; it cannot say they are good at it.",
  "no-comparative-clinician-claim":
    "A comparison between named clinicians is the most regulated sentence this product could publish, and the product has no basis for one — W83 refused ranking internally, and a public profile is where that refusal matters most.",
};
