// W41: the wizard's step definitions, as data — one place that names the steps,
// their order, and their URLs, so the page, the progress indicator and the tests
// can never disagree about what "step 3 of 5" means.

export const SETUP_STEPS = [
  { slug: "practice", title: "Practice details", blurb: "Name, timezone, and how much of the panel is held out for measurement." },
  { slug: "clinicians", title: "Clinicians", blurb: "Who works here, and who wants availability invitations sent for them." },
  { slug: "sessions", title: "Sessions", blurb: "Which appointment types may be filled, how much capacity to protect, and when." },
  { slug: "rules", title: "Eligibility", blurb: "Which established patients may be invited back." },
  { slug: "review", title: "Review", blurb: "Confirm the setup and switch the practice on." },
] as const;

export type SetupStepSlug = (typeof SETUP_STEPS)[number]["slug"];

export const SETUP_STEP_SLUGS = SETUP_STEPS.map((s) => s.slug) as readonly SetupStepSlug[];

export function isSetupStep(value: string): value is SetupStepSlug {
  return (SETUP_STEP_SLUGS as readonly string[]).includes(value);
}

export function stepIndex(slug: SetupStepSlug): number {
  return SETUP_STEP_SLUGS.indexOf(slug);
}

export function nextStep(slug: SetupStepSlug): SetupStepSlug | null {
  return SETUP_STEP_SLUGS[stepIndex(slug) + 1] ?? null;
}
