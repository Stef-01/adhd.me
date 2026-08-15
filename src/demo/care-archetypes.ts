/**
 * The demo's qualitative journeys — the fifteen ways somebody arrives at an ADHD question.
 *
 * WHY THESE ARE WRITTEN AS REQUESTS AND NOT AS SYMPTOM SETS. A symptom set is a screening
 * instrument, and a screening instrument published by this product would be clinical content
 * ADHD.ME authored — the thing founder gate G5 exists to stop. What a person says they want from
 * a clinician is not that: it is a preference, in their own words, about how they would like to be
 * treated. The finder matches on preferences, which is the only thing it is entitled to match on.
 *
 * SO NONE OF THESE ASSERT A DIAGNOSIS, and several deliberately describe someone who may not have
 * ADHD at all — the anxiety differential, the trauma history, the child whose difficulty is at
 * school. An assessment product whose demo only shows confirmed cases is selling a conclusion.
 */

/**
 * What a clinician says they see often, closed. Consumed by `Clinician.careAreas`.
 *
 * Declared here rather than in clinicians.ts because clinicians.ts already imports from this
 * module, and a union that both files need belongs on the upstream side of that edge.
 *
 * Deliberately about ASSESSMENT AND WHAT SURROUNDS IT rather than about severity or subtype: the
 * questions a person actually arrives with are "will they take me seriously", "can they do this in
 * my language", "do I have to see a psychiatrist first". None of those are a diagnosis.
 */
export type CareArea =
  /** Structured diagnostic assessment against DSM-5-TR criteria. The anchor every profile holds. */
  | "adhd-assessment"
  /** Adults, including the late-recognised presentations that arrive after a child's diagnosis. */
  | "adult-adhd"
  /** Children and adolescents, where the assessment runs through school as well as home. */
  | "child-adolescent-adhd"
  /** Presentations missed for decades in women, and how they shift with hormonal change. */
  | "adhd-in-women"
  /** Co-occurring autism, where one explanation is usually offered and two are needed. */
  | "autism-adhd"
  /** Medication initiation and dose titration, monitored over weeks rather than set once. */
  | "titration"
  /** GP shared care under a psychiatrist's or paediatrician's plan. */
  | "shared-care"
  /** Sleep, structure, environment and coaching — the half of the plan that is not a script. */
  | "non-medication"
  /** Emotional dysregulation and rejection sensitivity, which are what people describe first. */
  | "emotional-regulation"
  /** Anxiety and depression alongside ADHD: comorbidity, differential, or both at once. */
  | "comorbid-mood"
  /** A substance-use history, which changes what may safely be prescribed and by whom. */
  | "substance-history"
  /** Sleep and circadian problems, which imitate ADHD and worsen it. */
  | "sleep"
  /** Baseline cardiovascular screening before a stimulant, and monitoring after. */
  | "cardiac-screening"
  /** Access, autonomy, and adjustments at work or study. */
  | "disability-rights"
  /** Trauma-aware assessment, where trauma and ADHD present through each other. */
  | "trauma-informed"
  /** Bipolar or PTSD alongside ADHD, held with the treating psychiatrist. */
  | "complex-mental-health"
  /** Documentation a school, university or employer will actually accept. */
  | "student-academic";

export type CareArchetype = {
  id: string;
  title: string;
  eyebrow: string;
  example: string;
  request: string;
  headline: string;
  expectedFirstMatch: string;
  requirements: {
    /**
     * Typed, not free strings: an archetype requiring an area no clinician holds would produce a
     * finder that appears to work and silently returns nothing. Here it is a type error.
     */
    careAreas: CareArea[];
    preferredGender?: "woman";
    languageOptions?: string[];
    wheelchairAccessible?: boolean;
  };
};

/**
 * THE JOURNEYS, CUT FROM FIFTEEN TO SIX WHEN THE ROSTER BECAME TWO REAL PEOPLE.
 *
 * The fifteen were built against fifteen invented clinicians, and nine of them asked for something
 * neither Dr Saxena nor Dr Yadav offers: a woman GP, Tamil, Spanish, Arabic, Vietnamese, paediatric
 * and adolescent care, a disability-rights specialism. Keeping them would have meant a demo whose
 * scenarios lead somewhere the directory cannot go, which is a worse failure than a shorter list —
 * it advertises coverage that does not exist, on a health product, to somebody looking for care.
 *
 * They are DELETED rather than parked, because a commented-out journey is a claim waiting to be
 * uncommented by somebody who does not know why it went. When the roster grows to a GP who speaks
 * Tamil or sees children, the journey comes back with them.
 */
export const careArchetypes: CareArchetype[] = [
  {
    id: "structured-baseline",
    title: "Do the physical checks properly first",
    eyebrow: "Before anything is started",
    example: "A GP who will check the heart, the blood pressure and the sleep before a stimulant is on the table.",
    request:
      "I want a thorough, structured assessment. Before anyone talks about a stimulant I want the physical baseline done properly — heart, blood pressure, sleep — and I want to know what gets monitored afterwards and how often.",
    headline: "The baseline done before the prescription, not after.",
    expectedFirstMatch: "anubhav-saxena",
    requirements: {
      careAreas: ["adhd-assessment", "adult-adhd", "cardiac-screening"],
    },
  },
  {
    id: "substance-history-telehealth",
    title: "A drinking history, and a safe conversation about it",
    eyebrow: "Told without being judged",
    example: "A GP who will take a substance history as a safety question rather than a character one, over the phone.",
    request:
      "I drink more than I should and I know it matters for this, but I have had that conversation go badly before. I want a GP who will treat it as a safety question rather than as evidence about my character, and I would rather do the first appointment by phone.",
    headline: "A history you can tell without it being used against you.",
    expectedFirstMatch: "anubhav-saxena",
    requirements: {
      careAreas: ["adhd-assessment", "adult-adhd", "substance-history"],
    },
  },
  {
    id: "titration-and-review",
    title: "The dose isn't right",
    eyebrow: "After the diagnosis",
    example: "A GP who reviews titration on a schedule instead of when something goes wrong.",
    request:
      "I am already diagnosed and the dose is not right — it wears off by the afternoon and my appetite is gone. I want the titration reviewed on a schedule rather than whenever I manage to get an appointment.",
    headline: "Titration reviewed on a schedule, not on a crisis.",
    expectedFirstMatch: "anubhav-saxena",
    requirements: {
      careAreas: ["adhd-assessment", "adult-adhd", "titration"],
    },
  },
  {
    id: "unhurried-first-appointment",
    title: "Somewhere that won't rush you",
    eyebrow: "Time to say it properly",
    example: "A GP who books a longer first appointment and takes the whole history before reaching a conclusion.",
    request:
      "Every time I have raised this I have been rushed, and I lose my thread when I am rushed. I want a longer first appointment with a GP who will listen to the whole story before deciding anything.",
    headline: "A first appointment long enough to say the whole thing.",
    expectedFirstMatch: "tushar-yadav",
    requirements: {
      careAreas: ["adhd-assessment", "adult-adhd"],
    },
  },
  {
    id: "anxiety-differential-hindi",
    title: "Treated for anxiety for years",
    eyebrow: "Which one is it",
    example: "A Hindi-speaking GP who can work out whether years of anxiety treatment missed something.",
    request:
      "I have been treated for anxiety and put on an antidepressant for years and I am anxious it was the wrong answer. I want a calm GP who speaks Hindi, will go back to what school was actually like, and explain the differential slowly.",
    headline: "Anxiety, ADHD, or both: worked out properly.",
    expectedFirstMatch: "tushar-yadav",
    requirements: {
      careAreas: ["adhd-assessment", "adult-adhd", "comorbid-mood"],
      languageOptions: ["Hindi"],
    },
  },
  {
    id: "sleep-and-family-context",
    title: "Sleep that has never been right",
    eyebrow: "The rest of the picture",
    example: "A GP who takes sleep and family context seriously rather than treating them as background noise.",
    request:
      "My sleep has never been right and my family think I am just disorganised and always have been. I want a GP who will take the sleep seriously and understands the family context I am explaining this inside.",
    headline: "The sleep and the family, treated as part of the picture.",
    expectedFirstMatch: "tushar-yadav",
    requirements: {
      careAreas: ["adhd-assessment", "adult-adhd", "sleep"],
    },
  },
];
