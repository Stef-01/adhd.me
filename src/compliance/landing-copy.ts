// W23: the public landing page's copy, as data so the compliance linter can lint
// exactly what ships (src/compliance/landing.test.ts). Positioning per venture
// brief §Phase 1: sell to practices the measured filling of unused appointment
// capacity. B2B throughout — the audience is practice owners and managers, never
// patients; no therapeutic advertising, no clinical claims, no testimonials.

export const LANDING_COPY = {
  nav: { story: "Practice story", product: "How it works", measurement: "Measurement", cta: "Practice sign-in" },
  hero: {
    eyebrow: "For general practices",
    heading: "Turn unused appointment capacity into measured continuity of care.",
    sub:
      "Meherr quietly fills your open sessions by inviting established patients back to their " +
      "usual GP — and proves, with a built-in control group, how many of those visits are genuinely " +
      "additional.",
    primaryCta: "See a demo",
    secondaryCta: "Practice sign-in",
  },
  problem: {
    heading: "Empty sessions are lost capacity you can't get back.",
    body:
      "Late cancellations and quiet mid-week sessions leave clinician time unused. Manual recalls " +
      "are slow, hard to target, and impossible to measure. Most tools count every booking they " +
      "touch as their own — which tells you nothing about real impact.",
  },
  practiceStory: {
    eyebrow: "The practice story",
    heading: "Let GPs choose the work they want to get better at.",
    body:
      "A GP opts into a clinical focus and chooses how much of their week it should become. " +
      "Meherr then aligns appropriate cases, short learning and community education around that choice — " +
      "giving the clinician more agency and the practice a clearer way to grow useful capability.",
    goalLabel: "Clinician-set goal",
    goalValue: "30%",
    goalTitle: "Women’s metabolic and reproductive health",
    goalBody: "Chosen by the GP. Adjustable at any time. Never assigned by an algorithm or manager.",
    stages: [
      {
        title: "Choose the focus",
        body: "The GP opts in, sets a target share of clinical work and can change or pause it.",
      },
      {
        title: "Build depth deliberately",
        body: "Suitable cases are progressively surfaced, paired with concise learning relevant to the next clinic day.",
      },
      {
        title: "Teach beyond the room",
        body: "Clinicians can opt into paid awareness talks that turn growing expertise into useful public education.",
      },
    ],
    communityEyebrow: "From consulting room to community room",
    communityHeading: "Pay GPs to educate the public — and help practices reach people earlier.",
    communityBody:
      "Meherr can coordinate clearly scoped talks with local community groups, workplaces and cultural organisations. " +
      "The GP chooses the topic and audience, approves the material, and receives a transparent speaker fee for preparation and delivery.",
    communityPoints: [
      "An opportunity, never an obligation",
      "General education, not individual medical advice",
      "Speaker fees are never tied to leads or bookings",
      "Practices extend reach by being genuinely useful",
    ],
    evidenceEyebrow: "Why concentrated capability matters",
    evidenceHeading: "The current PMOS journey loses time, trust and information.",
    evidenceBody:
      "The studies quantify delay and clinician-hopping; an individual pathway can vary. The opportunity is to make a relevant GP easier to find and help that GP keep getting better through repeated, supported work.",
    evidence: [
      { value: "24%", label: "waited more than two years for PMOS to be recognised" },
      { value: "39%", label: "saw three or more health professionals first" },
      { value: "60%", label: "received no information when PMOS was identified" },
      { value: "≈ half", label: "of cohort participants meeting PMOS criteria were not previously recognised by their early 30s" },
    ],
    evidenceNote:
      "Australian studies: Family Practice 2014, n=210; Human Reproduction 2021, Adelaide cohort, n=974.",
    pathwayEyebrow: "The real capability gap",
    pathwayHeading: "Education exists. The practice pathway does not.",
    pathwayBody:
      "RACGP’s Sexual and Reproductive Health interest group explicitly includes PMOS, and ACRRM lists a related learning activity. " +
      "What is still missing is a clear practice-level route from a GP’s chosen focus to repeated cases, relevant learning and visible community contribution.",
    pathwayNote:
      "Meherr does not create a clinical credential. It makes a clinician-chosen focus and learning loop visible inside the practice.",
  },
  steps: [
    {
      title: "Match, within your rules",
      body:
        "You set who is eligible and which sessions may be offered. Meherr ranks only inside " +
        "that boundary — never outside it — and sends a plain, availability-only message.",
    },
    {
      title: "Patients book with their usual GP",
      body:
        "A single tap opens a booking link for a real open slot. When the session fills, the other " +
        "offers close automatically.",
    },
    {
      title: "You see what was incremental",
      body:
        "A held-out control group runs continuously, so every report separates additional visits " +
        "from attendance that would have happened anyway.",
    },
  ],
  measurement: {
    heading: "The number you can defend.",
    body:
      "Meherr reports incremental attended appointments per 1,000 eligible patients, measured " +
      "against a randomised holdout. We never report the raw count of bookings we touched as impact.",
    points: [
      "Randomised holdout arm, on by default",
      "Attended appointments only — no-shows never count",
      "Every message, booking and opt-out on an immutable audit log",
    ],
  },
  compliance: {
    heading: "Built for the rules from day one.",
    body:
      "Availability-only messaging, a compliance check on every template, one-tap opt-out that is " +
      "honoured permanently, and per-practice controls including an instant pause. Your data stays " +
      "isolated to your practice.",
  },
  cta: {
    heading: "Bring your quiet sessions back to life.",
    body: "Book a walkthrough with your practice's own numbers.",
    button: "See a demo",
  },
  footer: {
    tagline: "Meherr — continuity yield for general practice.",
    note: "Business-to-business service for accredited general practices. Not patient medical advice.",
  },
} as const;
