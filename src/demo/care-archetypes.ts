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

export const careArchetypes: CareArchetype[] = [
  {
    id: "late-diagnosis-south-indian",
    title: "Late diagnosis + South Indian family",
    eyebrow: "Culture and being believed",
    example: "A woman GP who assesses adult ADHD, speaks Tamil or Malayalam, and understands a family that thinks this is an excuse.",
    request:
      "I’m a South Indian woman in my thirties and I think my ADHD was missed as a child. I want a woman GP who speaks Tamil or Malayalam, understands a family who thinks this is laziness and not real, and will keep what we discuss private from my relatives.",
    headline: "An assessment where you don’t have to win the argument first.",
    expectedFirstMatch: "priya-nair",
    requirements: {
      careAreas: ["adhd-assessment", "adult-adhd", "adhd-in-women"],
      preferredGender: "woman",
      languageOptions: ["Tamil", "Malayalam"],
    },
  },
  {
    id: "anxiety-differential-hindi",
    title: "Treated for anxiety for years",
    eyebrow: "Which one is it",
    example: "A Hindi or Punjabi speaking woman GP who can work out whether years of anxiety treatment missed something.",
    request:
      "I’ve been treated for anxiety and put on an antidepressant for years and I’m anxious it was the wrong diagnosis. I want a calm woman GP who speaks Hindi or Punjabi, will go back to what school was actually like, and explain the differential slowly.",
    headline: "Anxiety, ADHD, or both — worked out properly.",
    expectedFirstMatch: "nisha-kapoor",
    requirements: {
      careAreas: ["adhd-assessment", "adult-adhd", "comorbid-mood"],
      preferredGender: "woman",
      languageOptions: ["Hindi", "Punjabi"],
    },
  },
  {
    id: "not-just-medication",
    title: "Assessment without a script as the only outcome",
    eyebrow: "The rest of the plan",
    example: "A GP who will assess me but also talk about coaching, sleep and workload rather than only whether I qualify for a stimulant.",
    request:
      "I want an ADHD assessment but I’m wary of walking out with nothing but a prescription. I want a GP who will talk about alternatives, coaching and habits as seriously as medication, and give me clear steps instead of an overwhelming plan.",
    headline: "The whole plan, not just the script.",
    expectedFirstMatch: "tom-bennett",
    requirements: {
      careAreas: ["adhd-assessment", "non-medication"],
    },
  },
  {
    id: "autism-and-adhd",
    title: "Autism and ADHD, not one or the other",
    eyebrow: "Two answers, not one",
    example: "A neurodiversity-affirming GP who can assess ADHD without treating my autism as the whole explanation.",
    request:
      "I’m autistic and I think I have ADHD as well, but every clinician so far has used autism to explain all of it. I want a neurodiversity-affirming GP for an AuDHD assessment, with sensory-considerate appointments and something written down afterwards.",
    headline: "An assessment that can hold both.",
    expectedFirstMatch: "grace-chen",
    requirements: {
      careAreas: ["adhd-assessment", "autism-adhd"],
    },
  },
  {
    id: "child-school-spanish",
    title: "A child falling behind at school",
    eyebrow: "Language and the classroom",
    example: "A Spanish-speaking GP who can start my child's assessment and write something the school will act on.",
    request:
      "My son is falling behind at school and his teacher keeps raising his concentration. I would feel better with a Spanish-speaking GP who can start the assessment, set out classroom adjustments and write the documentation the school needs, without medication being the first thing discussed.",
    headline: "Start the assessment, and get the school moving.",
    expectedFirstMatch: "sofia-alvarez",
    requirements: {
      careAreas: ["adhd-assessment", "child-adolescent-adhd", "student-academic"],
    },
  },
  {
    id: "adolescent-school-refusal",
    title: "A teenager who has stopped going to school",
    eyebrow: "Anxiety and attention, tangled",
    example: "An Arabic-speaking GP who can assess a teenager where school refusal and anxiety have become impossible to separate.",
    request:
      "My teenager has stopped going to school and is very anxious, and I can’t tell any more whether it’s anxiety or attention. I want an Arabic-speaking woman GP who will assess an adolescent properly, involve me when invited but keep their confidence.",
    headline: "School refusal, anxiety and attention, untangled.",
    expectedFirstMatch: "leila-haddad",
    requirements: {
      careAreas: ["adhd-assessment", "child-adolescent-adhd"],
    },
  },
  {
    id: "emotional-regulation",
    title: "Rejection sensitivity and emotional load",
    eyebrow: "The part that gets called a personality problem",
    example: "A GP who understands rejection sensitivity and emotional regulation rather than reading it as immaturity.",
    request:
      "The hardest part for me is emotional — rejection sensitivity, shame spirals, reacting to everything. I want a GP who treats emotional regulation as part of ADHD rather than a character flaw, and who gives me clear steps I can actually follow.",
    headline: "The emotional half, taken seriously.",
    expectedFirstMatch: "tom-bennett",
    requirements: {
      careAreas: ["adhd-assessment", "emotional-regulation"],
    },
  },
  {
    id: "perimenopause-unmasking",
    title: "Coping strategies that stopped working",
    eyebrow: "Hormonal change, not a new problem",
    example: "A woman GP who understands why symptoms got unmanageable in perimenopause rather than treating it as recent.",
    request:
      "I coped for thirty years and around perimenopause everything stopped working. I’m exhausted and not sleeping. I want a woman GP who understands hormonal change and won’t treat this as a new problem just because it got worse lately.",
    headline: "Not new. Just no longer survivable.",
    expectedFirstMatch: "anjali-menon",
    requirements: {
      careAreas: ["adhd-assessment", "adult-adhd", "adhd-in-women"],
      preferredGender: "woman",
    },
  },
  {
    id: "substance-history-telehealth",
    title: "A drinking history, and a safe conversation about it",
    eyebrow: "Safety question, not a character question",
    example: "A GP who can assess ADHD with a substance history on the table, including non-stimulant options, by telehealth.",
    request:
      "I drink more than I should and used cannabis for years, and I’m worried that admitting it means I’ll be refused an assessment or treated like an addict. I want a thorough GP who will discuss non-stimulant options honestly, and I need telehealth because I can’t travel.",
    headline: "The history matters for safety, not for judgement.",
    expectedFirstMatch: "anubhav-saxena",
    requirements: {
      careAreas: ["adhd-assessment", "substance-history"],
    },
  },
  {
    id: "vietnamese-accessible-assessment",
    title: "Accessible assessment, on your terms",
    eyebrow: "Access, autonomy and language",
    example: "A Vietnamese-speaking GP who understands disability rights and centres my choices in an ADHD assessment.",
    request:
      "I’m a disabled Vietnamese-speaking woman and I need an ADHD assessment at a wheelchair accessible practice. I want a GP who understands disability rights, speaks Vietnamese, centres my consent and autonomy, and can help with the adjustments and NDIS documentation afterwards.",
    headline: "Accessible assessment, on your terms.",
    expectedFirstMatch: "linh-nguyen",
    requirements: {
      careAreas: ["adhd-assessment", "disability-rights"],
      preferredGender: "woman",
      languageOptions: ["Vietnamese"],
      wheelchairAccessible: true,
    },
  },
  {
    id: "cardiac-baseline-before-medication",
    title: "Is it safe for my heart",
    eyebrow: "Before anything is prescribed",
    example: "A GP who will do the cardiac and blood-pressure checks properly before starting a stimulant.",
    request:
      "There’s heart disease in my family and I want to know it’s safe before starting a stimulant. I want a GP who checks blood pressure and cardiovascular history properly first, and who will actually see me again while the dose is being worked out.",
    headline: "The heart checks first, then the dose.",
    expectedFirstMatch: "daniel-okafor",
    requirements: {
      careAreas: ["adhd-assessment", "cardiac-screening", "titration"],
    },
  },
  {
    id: "trauma-informed-assessment",
    title: "Trauma history, and a childhood you can't narrate",
    eyebrow: "Consent, control and emotional safety",
    example: "A trauma-informed GP who asks permission, respects boundaries and doesn't need me to relive my childhood to prove this.",
    request:
      "I have a trauma history and a difficult childhood I can’t narrate on demand, and there are no school records left. I want a trauma-informed GP who asks permission, explains each step, respects boundaries and lets me stay in control without disclosing everything at once.",
    headline: "Assessment without having to relive it.",
    expectedFirstMatch: "erin-walsh",
    requirements: {
      careAreas: ["adhd-assessment", "trauma-informed"],
    },
  },
  {
    id: "psychiatrist-shared-care",
    title: "PTSD or bipolar, alongside the ADHD question",
    eyebrow: "Complex mental health, in sequence",
    example: "A GP comfortable with PTSD or bipolar disorder who will work with my psychiatrist rather than around them.",
    request:
      "I live with PTSD and bipolar disorder and my psychiatrist and I disagree about whether ADHD is also in the picture. I need a GP comfortable with complex mental health who will coordinate shared care with my psychiatrist and not change specialist treatment on their own.",
    headline: "Joined-up, with your psychiatrist in the loop.",
    expectedFirstMatch: "noah-williams",
    requirements: {
      careAreas: ["adhd-assessment", "complex-mental-health", "shared-care"],
    },
  },
  {
    id: "titration-and-work",
    title: "The dose isn't right, and work needs a letter",
    eyebrow: "After the diagnosis, before it works",
    example: "A Spanish-speaking GP who will review my dose properly and write what my employer needs.",
    request:
      "I was diagnosed already but the dose is wearing off by lunchtime and the side effects are affecting my appetite. I want a Spanish-speaking GP who will review it properly instead of making me wait months, and write the workplace adjustments letter my employer is asking for.",
    headline: "Dose review that actually happens.",
    expectedFirstMatch: "camila-torres",
    requirements: {
      careAreas: ["adhd-assessment", "titration"],
    },
  },
  {
    id: "paediatric-waitlist-arabic",
    title: "A paediatric wait that isn't being used",
    eyebrow: "Getting the referral right",
    example: "An Arabic-speaking GP who will prepare my child's paediatric referral properly so the wait isn't wasted.",
    request:
      "My son has been on a paediatrician waitlist for months and nothing is happening. I want an Arabic-speaking GP who will gather the teacher reports and prepare the referral properly now, and carry the shared care once there is a plan.",
    headline: "Use the wait instead of losing it.",
    expectedFirstMatch: "aisha-rahman",
    requirements: {
      careAreas: ["adhd-assessment", "child-adolescent-adhd", "shared-care"],
    },
  },
];
