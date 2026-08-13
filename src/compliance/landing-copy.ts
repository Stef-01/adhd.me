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
      "ADHD.ME quietly fills your open sessions by inviting established patients back to their " +
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
      "ADHD.ME then aligns appropriate cases, short learning and community education around that choice — " +
      "giving the clinician more agency and the practice a clearer way to grow useful capability.",
    goalLabel: "Clinician-set goal",
    goalValue: "30%",
    goalTitle: "ADHD assessment and shared care",
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
      "ADHD.ME can coordinate clearly scoped talks with local community groups, workplaces and cultural organisations. " +
      "The GP chooses the topic and audience, approves the material, and receives a transparent speaker fee for preparation and delivery.",
    communityPoints: [
      "An opportunity, never an obligation",
      "General education, not individual medical advice",
      "Speaker fees are never tied to leads or bookings",
      "Practices extend reach by being genuinely useful",
    ],
    evidenceEyebrow: "Why concentrated capability matters",
    evidenceHeading: "The current ADHD pathway loses time, money and people.",
    evidenceBody:
      "These describe the pathway, not any individual patient. The opportunity is to make a relevant GP easier to find and help that GP keep getting better through repeated, supported work.",
    // FOUNDER ACTION — NOT ONE OF THESE FIGURES HAS BEEN CONFIRMED AGAINST ITS SOURCE BY ANYBODY
    // IN THIS REPO, and they are the most quotable thing on the page. They are written as
    // qualitative ranges rather than false precision on purpose: a decimal implies a study
    // somebody checked, and a wrong decimal beside a health claim is worse than a vaguer true
    // one. Replace each with a sourced number, or delete it. See `evidenceNote`.
    evidence: [
      { value: "Months–years", label: "typical wait for an adult ADHD assessment appointment" },
      { value: "$1k–$5k", label: "common out-of-pocket cost of a private adult assessment" },
      // Phrased around ACCESS rather than the clinical act, because the W23 linter refuses
      // "specialist", "diagnos*" and "prescrib*" here and is right to: this page's reader is a
      // practice manager, and a clinical claim on a B2B page is still therapeutic advertising.
      { value: "Referral-gated", label: "the adult pathway has largely run outside general practice" },
      { value: "State by state", label: "the rules a practice must follow differ by jurisdiction" },
    ],
    evidenceNote:
      "Indicative figures pending source confirmation. Anchors: the AADPA Australian evidence-based " +
      "clinical practice guideline for ADHD (2022) and the 2023 Senate inquiry into ADHD assessment " +
      "and support services.",
    pathwayEyebrow: "The real capability gap",
    pathwayHeading: "The guideline exists. The practice pathway does not.",
    pathwayBody:
      "Australia has a national evidence-based ADHD guideline, and several jurisdictions have moved to let GPs take on more of this work rather than only refer it onward. " +
      "What is still missing is a clear practice-level route from a GP’s chosen focus to repeated cases, relevant learning and visible community contribution.",
    pathwayNote:
      "ADHD.ME does not create a clinical credential, and ADHD is not a specialty Ahpra recognises. It makes a clinician-chosen focus and learning loop visible inside the practice.",
  },
  steps: [
    {
      title: "Match, within your rules",
      body:
        "You set who is eligible and which sessions may be offered. ADHD.ME ranks only inside " +
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
      "ADHD.ME reports incremental attended appointments per 1,000 eligible patients, measured " +
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
    tagline: "ADHD.ME — continuity yield for general practice.",
    note: "Business-to-business service for accredited general practices. Not patient medical advice.",
  },
} as const;
