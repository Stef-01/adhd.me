// The document checklist, generated per patient from the narrative's signals, and the plain-
// language "what to expect" for the first appointment. Both are pre-appointment preparation:
// practical, not clinical. Every item says why it helps in one sentence a person can act on.
//
// Triggers are the STRUCTURED SIGNALS and the narrative's CONCEPTS, never a judgement about the
// person. "You mentioned school" adds school reports; nothing here decides whether the person
// has ADHD, how severe it is, or what a GP should do.

import type { Embedder, ConceptId } from "./embedding";
import type { ChecklistItem, DocumentChecklist, GP, Patient } from "./types";

type Trigger = { id: string; when: (patient: Patient, concepts: ReadonlySet<ConceptId>) => boolean };

interface ChecklistTemplate {
  id: string;
  label: string;
  why: string;
  required: boolean;
  /** Empty means everybody gets it. Otherwise any one trigger firing adds the item. */
  triggers: readonly Trigger[];
}

const isChild = (p: Patient) => p.structuredSignals.ageGroup === "children" || p.structuredSignals.ageGroup === "adolescents";
const isAdult = (p: Patient) => !isChild(p);

export const CHECKLIST_TEMPLATES: readonly ChecklistTemplate[] = [
  {
    id: "medicare-and-id",
    label: "Medicare card and photo ID",
    why: "The practice needs both to open a file and bill correctly.",
    required: true,
    triggers: [],
  },
  {
    id: "symptom-timeline",
    label: "Your symptom timeline",
    why: "The template is on this page. When things started, what changed, and what it costs you now is the first thing a GP asks; writing it down beforehand means you are not reconstructing it in the room.",
    required: true,
    triggers: [],
  },
  {
    id: "medication-list",
    label: "Medications and supplements",
    why: "Some ADHD medications interact with common scripts, so the GP checks this before anything else.",
    required: true,
    triggers: [],
  },
  {
    id: "school-reports",
    label: "School reports, primary years",
    why: "An ADHD assessment looks for signs before age twelve; a teacher's comment from years ago is the kind of evidence that settles it.",
    required: false,
    triggers: [
      { id: "long-standing", when: (_p, c) => c.has("long-standing") },
      { id: "school", when: (_p, c) => c.has("school") },
      { id: "assessment", when: (p) => !p.structuredSignals.priorAssessment },
    ],
  },
  {
    id: "someone-who-knew-you",
    label: "Someone from your childhood",
    why: "A parent, older sibling or long-time friend, willing to fill in a short questionnaire: what they saw supports the timeline.",
    required: false,
    triggers: [{ id: "adult", when: (p) => isAdult(p) && !p.structuredSignals.priorAssessment }],
  },
  {
    id: "parent-and-teacher-questionnaires",
    label: "Parent and teacher questionnaires",
    why: "The GP sends these before the visit. For children and teenagers, a picture from home and from school is part of every assessment.",
    required: false,
    triggers: [{ id: "child", when: (p) => isChild(p) }],
  },
  {
    id: "prior-assessment-report",
    label: "Your earlier assessment report",
    why: "An existing assessment can save a full repeat; the GP needs the document, not the memory of it.",
    required: false,
    triggers: [{ id: "prior-assessment", when: (p) => p.structuredSignals.priorAssessment }],
  },
  {
    id: "medication-history",
    label: "Past ADHD medication: names, doses, dates",
    why: "What worked and what did not shortens the path to a dose that suits you.",
    required: false,
    triggers: [{ id: "medication-history", when: (p) => p.structuredSignals.medicationHistory !== "none" }],
  },
  {
    id: "letters-from-others",
    label: "Letters from others involved",
    why: "Anything you named alongside ADHD is easier to plan around when the GP can read what others have found.",
    required: false,
    triggers: [{ id: "comorbidity", when: (p) => p.structuredSignals.comorbidities.length > 0 }],
  },
  {
    id: "alcohol-and-drugs",
    label: "Alcohol and other drug use, honestly",
    why: "A short honest note. It changes which medications can be started safely; GPs ask everyone, and writing it down first makes the conversation easier.",
    required: false,
    triggers: [{ id: "substance", when: (p, c) => c.has("substance") || p.structuredSignals.comorbidities.includes("substance-history") }],
  },
  {
    id: "heart-history",
    label: "Family heart history, and your BP",
    why: "Any family history of heart problems, and your last BP reading if you know it. Stimulant medication is not started without a heart check, so having this ready avoids a second visit.",
    required: false,
    triggers: [
      { id: "stimulant", when: (_p, c) => c.has("stimulant-medication") || c.has("titration") },
      { id: "medication-history", when: (p) => p.structuredSignals.medicationHistory !== "none" },
    ],
  },
  {
    id: "sleep-notes",
    label: "A week of sleep notes",
    why: "Bedtime, wake time, how rested you felt. Sleep and attention pull on each other, and a week of notes is worth more than a guess in the room.",
    required: false,
    triggers: [{ id: "sleep", when: (_p, c) => c.has("sleep") }],
  },
  {
    id: "concession-card",
    label: "Concession card",
    why: "Your concession or health care card, and a question for the practice about bulk-billing before the visit, so there is no surprise at the desk.",
    required: false,
    triggers: [{ id: "cost", when: (p) => p.structuredSignals.financialConstraint }],
  },
];

/** The symptom-timeline template the required item points to. Plain headings a person fills in. */
export const TIMELINE_TEMPLATE: readonly { heading: string; prompt: string }[] = [
  { heading: "As a child", prompt: "What did teachers or parents say? What was school like?" },
  { heading: "As a teenager and young adult", prompt: "Study, first jobs, friendships. What was hard, what came easily." },
  { heading: "The last two years", prompt: "Work, home, money, relationships. Where does it cost you most?" },
  { heading: "What you have tried", prompt: "Strategies, apps, coaching, medication. What helped, what did not." },
  { heading: "What you want from this", prompt: "In one sentence." },
];

export function generateChecklist(patient: Patient, embedder: Embedder, generatedAt: string, id = `chk-${patient.id}`): DocumentChecklist {
  const concepts = new Set(embedder.concepts(patient.narrativeText));
  const items: ChecklistItem[] = [];
  for (const template of CHECKLIST_TEMPLATES) {
    const fired = template.triggers.filter((t) => t.when(patient, concepts)).map((t) => t.id);
    if (template.triggers.length > 0 && fired.length === 0) continue;
    items.push({ id: template.id, label: template.label, why: template.why, required: template.required, done: false, triggeredBy: fired });
  }
  return { id, patientId: patient.id, items, generatedAt };
}

export interface ExpectationSection {
  title: string;
  body: string;
}

const PACE_COPY = {
  gradual: "adjusts doses gradually, with more reviews and smaller steps",
  standard: "adjusts doses on the usual schedule, reviewing every few weeks",
  brisk: "moves through dose changes briskly where it is safe to",
} as const;

const PHILOSOPHY_COPY = {
  "stimulant-first": "would usually start with a stimulant if medication is the plan",
  "non-stimulant-first": "would usually start with a non-stimulant if medication is the plan",
  "case-by-case": "decides on medication case by case, with you",
  "non-prescribing": "does not start ADHD medication, and will say who can",
} as const;

/** What the first appointment is like, in plain language, from what the GP declares. */
export function whatToExpect(patient: Patient, gp: GP): ExpectationSection[] {
  const s = patient.structuredSignals;
  const sections: ExpectationSection[] = [];
  sections.push({
    title: "How long it takes",
    body: `${gp.shortName} declares: ${gp.appointmentLength.toLowerCase()}. An ADHD assessment usually takes more than one appointment, so the first is about history, not a decision.`,
  });
  sections.push({
    title: "What you will be asked",
    body: isChild(patient)
      ? "How things are at home and at school, when it started, and what has been tried. The questionnaires from parents and teachers are part of the picture."
      : "When it started, what it costs you now at work and at home, sleep, mood, and what you have tried. The timeline you bring does most of the work.",
  });
  const medication = gp.credentials.prescribingPhilosophy;
  const pace = gp.credentials.titrationPace;
  sections.push({
    title: "Medication",
    body:
      medication === null
        ? "Nothing is started at a first appointment, and this GP has not declared how they approach medication; ask."
        : `Nothing is started at a first appointment. If it comes to that, ${gp.shortName} ${PHILOSOPHY_COPY[medication]}${pace ? `, and ${PACE_COPY[pace]}` : ""}.`,
  });
  if (s.priorAssessment) {
    sections.push({
      title: "Your earlier assessment",
      body: "Bring the report. Depending on where and when it was done, the GP may be able to continue from it rather than start over.",
    });
  }
  if (s.preferredConsultStyle === "telehealth" && gp.telehealthAvailable) {
    sections.push({
      title: "Telehealth",
      body: "The first appointment can be by video. Have your documents open on the screen or scanned beforehand, and somewhere private to talk.",
    });
  }
  const billing = gp.preferences.billingAccepted;
  sections.push({
    title: "Cost",
    body:
      billing.length === 0
        ? "Billing has not been declared. Ask the practice before you book."
        : `Declared billing: ${billing.map((b) => b.replace(/-/g, " ")).join(", ")}. Ask the practice for the exact fee for a long first appointment; figures here are never quoted on their behalf.`,
  });
  sections.push({
    title: "What will not happen",
    body: "No answer on the day, no script on the day, and no decision without you. If anything comes up before then that cannot wait, that is a call to your usual GP or emergency services, not this page.",
  });
  return sections;
}
