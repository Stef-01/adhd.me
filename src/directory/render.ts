// W187: how a GP with a deep interest is described without being called a specialist.
//
// This is the sentence the whole directory turns on. A clinician who has spent years on
// women's health IS more use to a woman looking for help, and saying nothing about it makes the
// directory worthless. Saying it the obvious way — "women's health specialist", "specialises in
// PMOS" — is an offence under s 133 for a general registrant. The product's job is the third
// thing: state the scope truthfully, and let no reader conclude a specialty from it.
//
// W183 made the bad SHAPE unwritable and W184 made the bad SENTENCE unpublishable. Neither sees
// what this unit is about:
//
//   EVERY FIELD CAN PASS AND THE COMPOSITION STILL MAKE THE CLAIM. "Dr Jane Smith" is a clean
//   name. "General practitioner" is a clean profession. "Women's health" is a linted focus
//   label. Rendered as "Dr Jane Smith — Women's Health GP" they are an implied specialty that no
//   per-field linter ever saw, because the offending string does not exist until a template
//   joins three compliant ones. A field-level check cannot catch a claim made by juxtaposition.
//
// SO THE COMPOSITION IS THE CONTROL, IN THREE PARTS.
//
//   THE SCOPE NEVER TOUCHES THE REGISTRATION. Focus labels appear only inside the framed block,
//   never on the heading and never on the registration line. A test asserts no rendered line
//   contains both a focus label and a registration word, which is what makes "Women's Health GP"
//   unrenderable rather than merely discouraged.
//
//   THE FRAMING SAYS WHOSE CLAIM IT IS. The clinician told us; Meherr did not verify it and
//   cannot. That is W111's rule — a register hit says "this person is registered", not "this
//   person may do the thing" — carried into public copy, where the reader has no other way to
//   know which parts were checked. Registration is checkable and is presented as checkable, with
//   the number. Focus is declared and is presented as declared.
//
//   AND THE DENIAL IS EXPLICIT, BECAUSE SILENCE IS WHERE THE INFERENCE LIVES. A list of narrow
//   interests under a doctor's name reads as a specialty unless something says it is not one.
//   W120's rule, in the place it costs most: absence of a statement is not absence of a claim,
//   because the reader supplies the missing sentence themselves.
//
// FAILS CLOSED. `renderProfile` returns a refusal rather than a document when the COMPOSED text
// violates the union. Rendering something that trips the linter and reporting it alongside would
// leave a compliant-looking page and a warning nobody reads — W6's posture.
//
// AND ONE FINDING THIS UNIT SURFACED, BECAUSE IT IS THE FIRST TO TURN A PROFILE INTO COPY:
// W183's specialist variant CANNOT BE RENDERED AT ALL. See `SPECIALIST_NOT_PUBLISHED`. Every
// honest rendering of specialist registration contains the protected word, and W114 refuses
// that word for everybody. The shape stays representable because the law recognises it; the
// copy stays unpublishable because this product has ruled it will make no such claim.

import {
  lintDirectoryText,
  lintName,
  type ProfileCopyViolation,
} from "./copy-lint";
import {
  isSpecialist,
  publishedFocus,
  type DirectoryProfile,
  type GeneralProfile,
} from "./profile";

/**
 * How each profession is named in public copy.
 *
 * A lookup rather than a formatter over the enum, because "GP" and "General practitioner" are
 * both correct and only one of them is safe next to a scope: an abbreviation is short enough to
 * sit on the same line as an interest, which is the juxtaposition this unit exists to prevent.
 */
export const PROFESSION_COPY: Readonly<Record<string, string>> = {
  general_practitioner: "General practitioner",
  registered_nurse: "Registered nurse",
  nurse_practitioner: "Nurse practitioner",
  psychologist: "Psychologist",
  dietitian: "Dietitian",
};

/**
 * The sentences that frame a declared scope. The unit's actual deliverable.
 *
 * Held as data, and linted by their own test against the same union as profile copy — framing
 * text is copy, and framing that introduced a claim would be the worst place for one, since it
 * appears on every profile rather than on one.
 */
export const SCOPE_FRAMING = {
  heading: "Areas this clinician sees often",
  attribution:
    "Told to us by the clinician. We have not checked these areas and do not assess anyone's ability in them.",
  denial:
    "This is not a specialty and not a qualification. This clinician holds general registration, which covers all of general practice.",
} as const;

export const REGISTRATION_FRAMING = {
  checkable:
    "Registration is the one thing here we have checked. The number is printed so you can confirm it yourself on the public register.",
} as const;

/**
 * W187's finding: THE MODEL ADMITS A SHAPE THIS PRODUCT CANNOT PUBLISH.
 *
 * W183 gave the profile a specialist variant, and it was right to — s 133 recognises the title
 * and a model that pretended otherwise would be lying about the law. But W114 ruled that Meherr
 * carries no specialist titles AT ALL, deliberately stricter than the law, because whether a
 * given clinician may use one is a fact on the Ahpra specialist register that this tree cannot
 * read. That ruling lives in the linters as a flat refusal of the word.
 *
 * Those two decisions collide here, in the first unit that tries to turn a profile into copy,
 * and the collision is not a defect in either. The honest resolution is that the shape stays
 * representable and the COPY stays unpublishable: `renderProfile` refuses a specialist profile
 * by name rather than emitting a document that trips its own linter on the way out.
 *
 * Not written as a lint violation, because it is not one — nobody chose bad words. It is a gate.
 */
export const SPECIALIST_NOT_PUBLISHED = {
  rule: "specialist-title-not-published",
  why:
    "Meherr does not publish specialist titles. Whether a clinician may use one is a fact on the Ahpra specialist register, which this product does not read, so it makes no such claim about anybody. This is stricter than the law requires and is deliberate. It is a founder decision to change, not a build one, and it is bound up with the G6 advertising review.",
} as const;

export interface RenderedProfile {
  /** The clinician's name, alone. Nothing may join it. */
  heading: string;
  /** How they are registered, and how to check it. Never carries a scope. */
  registration: readonly string[];
  /** The framed scope block. Never empty: the denial is carried even with no focus areas. */
  scope: readonly string[];
  /** Checkable facts. */
  facts: readonly string[];
}

export type RenderResult =
  | { ok: true; rendered: RenderedProfile }
  | { ok: false; violations: ProfileCopyViolation[] };

/** Words that mean "how this person is registered". A scope line may contain none of them. */
export const REGISTRATION_WORDS: readonly string[] = [
  "general practitioner",
  "registered nurse",
  "nurse practitioner",
  "psychologist",
  "dietitian",
  "registration",
  "registered",
  "ahpra",
];

function compose(profile: GeneralProfile): RenderedProfile {
  const facts = [
    `${profile.location.suburb}, ${profile.location.state}`,
    `Speaks ${profile.languages.join(", ")}`,
    profile.acceptingNewPatients
      ? "Taking new patients at the time this page was built"
      : "Not taking new patients at the time this page was built",
  ];

  return {
    heading: profile.displayName,
    registration: [
      PROFESSION_COPY[profile.descriptor.profession] ?? profile.descriptor.profession,
      `Registration number ${profile.ahpraRegistrationNumber}.`,
      REGISTRATION_FRAMING.checkable,
    ],
    scope: [
      SCOPE_FRAMING.heading,
      ...publishedFocus(profile).map((statement) => statement.label),
      SCOPE_FRAMING.attribution,
      SCOPE_FRAMING.denial,
    ],
    facts,
  };
}

/** Every line of a rendered profile, paired with where it came from. */
export function renderedLines(rendered: RenderedProfile): Array<{ field: string; text: string }> {
  return [
    { field: "heading", text: rendered.heading },
    ...rendered.registration.map((text, i) => ({ field: `registration[${i}]`, text })),
    ...rendered.scope.map((text, i) => ({ field: `scope[${i}]`, text })),
    ...rendered.facts.map((text, i) => ({ field: `facts[${i}]`, text })),
  ];
}

/**
 * Render a profile, or refuse it with every reason.
 *
 * The composed lines are linted, not the source fields — W184 already did those, and doing them
 * again would find nothing this is for. What this finds is the claim that only exists once a
 * template has joined two innocent strings.
 *
 * A specialist profile is refused outright, by name. See `SPECIALIST_NOT_PUBLISHED`: any honest
 * rendering of specialist registration contains the protected word, and W114 refuses that word
 * for everybody. Refusing here rather than emitting copy that fails its own linter downstream
 * means the reason a reader is given is the real one.
 */
export function renderProfile(profile: DirectoryProfile): RenderResult {
  if (isSpecialist(profile)) {
    return {
      ok: false,
      violations: [
        { field: "descriptor", rule: SPECIALIST_NOT_PUBLISHED.rule, match: profile.specialty },
      ],
    };
  }
  const rendered = compose(profile);
  // W194 (Q15-1): the heading IS the name, so it takes the name rules — the union minus the
  // surnames W184 excluded. Using the unfiltered lint here refused Dr Sarah Best, while W184's
  // per-field check passed her: one publication path, two halves, separately right.
  const violations = renderedLines(rendered).flatMap(({ field, text }) =>
    field === "heading" ? lintName(text, field) : lintDirectoryText(text, field),
  );
  if (violations.length > 0) return { ok: false, violations };
  return { ok: true, rendered };
}

/** The document, for a caller that wants the page as text. Structured first — W20's pattern. */
export function renderProfileText(rendered: RenderedProfile): string {
  return [
    `# ${rendered.heading}`,
    ``,
    ...rendered.registration,
    ``,
    ...(rendered.scope.length > 0 ? [`## ${rendered.scope[0]}`, ``, ...rendered.scope.slice(1), ``] : []),
    ...rendered.facts,
    ``,
  ].join("\n");
}
