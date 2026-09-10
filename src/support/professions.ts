// The kinds of support a person can be shown (PRD §38), and the words the finder reads for them.
//
// The finder began as a GP finder, because in NSW and Queensland a GP can now carry an ADHD
// assessment end to end, and that was the product's first job. The PRD's thesis is that the
// harder problem is knowing WHICH kind of help a life problem needs — a psychologist, an
// occupational therapist, an exercise physiologist, a coach, a counsellor, or the GP already
// involved, and past those a psychiatrist, a dietitian, a relationship counsellor, a sleep
// clinician or the university's own support service — so the roster carries a profession on every entry and this file is the one place
// the vocabulary lives: what each profession is called, what it is typically for, and which words
// in a person's sentence name it.
//
// A closed vocabulary, like `CareArea` and `Approach`: a profession the roster cannot show is a
// type error rather than an empty list.

export const PROFESSIONS = [
  "gp",
  "psychologist",
  "counsellor",
  "occupational-therapist",
  "exercise-physiologist",
  "adhd-coach",
  // P1 kinds (PRD §38): the ones a life problem points at once the six above are not the answer.
  "psychiatrist",
  "dietitian",
  "relationship-counsellor",
  "sleep-clinician",
  "university-support",
] as const;
export type Profession = (typeof PROFESSIONS)[number];

export interface ProfessionEntry {
  readonly id: Profession;
  /** The name on a card: "GP", "Psychologist". */
  readonly label: string;
  /** The plural, for headings: "GPs", "psychologists". */
  readonly plural: string;
  /** The article-led singular, for sentences: "a GP", "an occupational therapist". */
  readonly aName: string;
  /** What this kind of professional is typically useful for — PRD §38/§78, in plain words. */
  readonly typicallyFor: string;
  /** When self-guided support is no longer enough, the sign this profession is the one to explore. */
  readonly whenToExplore: string;
  /** Words in a sentence that name this profession. Lower-case, matched on word boundaries. */
  readonly cues: readonly string[];
}

export const PROFESSION_ENTRIES: readonly ProfessionEntry[] = [
  {
    id: "gp",
    label: "GP",
    plural: "GPs",
    aName: "a GP",
    typicallyFor: "Assessment, medication and its review, the physical checks around it, and referrals onward. In NSW and Queensland a GP can carry the whole pathway.",
    whenToExplore: "You want an assessment, a medication review, or one clinician holding the plan.",
    cues: ["gp", "gps", "doctor", "general practitioner", "family doctor"],
  },
  {
    id: "psychologist",
    label: "Psychologist",
    plural: "psychologists",
    aName: "a psychologist",
    typicallyFor: "Emotional regulation, anxiety and low mood alongside ADHD, perfectionism, and structured psychological work on patterns that keep repeating.",
    whenToExplore: "The hardest part is emotional, overwhelm, the sting of criticism, patterns you can see but cannot shift alone.",
    cues: ["psychologist", "psychology", "psych"],
  },
  {
    id: "counsellor",
    label: "Counsellor",
    plural: "counsellors",
    aName: "a counsellor",
    typicallyFor: "Talking things through: relationships, conflict, a change in life stage, the load of a late recognition.",
    whenToExplore: "The problem lives between you and somebody else, or you need a place to think it through with a person.",
    cues: ["counsellor", "counselor", "counselling", "counseling"],
  },
  {
    id: "occupational-therapist",
    label: "Occupational therapist",
    plural: "occupational therapists",
    aName: "an occupational therapist",
    typicallyFor: "Practical executive-function systems in real settings, starting work, organising a household, workplace and study adjustments.",
    whenToExplore: "You know what to do and the difficulty is the doing: starting, organising, keeping a system running.",
    cues: ["occupational therapist", "occupational therapy", "ot"],
  },
  {
    id: "exercise-physiologist",
    label: "Exercise physiologist",
    plural: "exercise physiologists",
    aName: "an exercise physiologist",
    typicallyFor: "Building movement into a week in a way that sticks, and using it deliberately for attention, sleep and mood.",
    whenToExplore: "Exercise helps when you do it and you cannot keep it going on your own.",
    cues: ["exercise physiologist", "exercise physiology", "ep"],
  },
  {
    id: "adhd-coach",
    label: "ADHD coach",
    plural: "ADHD coaches",
    aName: "an ADHD coach",
    typicallyFor: "Accountability and structure over weeks: goals, first actions, check-ins, and the habits around them.",
    whenToExplore: "External accountability is the thing that works for you, and you want somebody to provide it.",
    cues: ["coach", "coaching", "adhd coach"],
  },
  {
    id: "psychiatrist",
    label: "Psychiatrist",
    plural: "psychiatrists",
    aName: "a psychiatrist",
    typicallyFor: "The complicated picture: other conditions sitting beside ADHD, medication that has not settled after a fair trial, or a history a GP wants a second opinion on.",
    whenToExplore: "Your GP suggests it, or the medication questions have outgrown what a general practice can hold.",
    cues: ["psychiatrist", "psychiatry"],
  },
  {
    id: "dietitian",
    label: "Dietitian",
    plural: "dietitians",
    aName: "a dietitian",
    typicallyFor: "Regular eating when hunger arrives late, appetite on medication days, and food that works without cooking or planning.",
    whenToExplore: "Meals keep going missing, your weight is shifting in a way that worries you, or eating has become a daily fight.",
    cues: ["dietitian", "dietician", "nutritionist"],
  },
  {
    id: "relationship-counsellor",
    label: "Relationship counsellor",
    plural: "relationship counsellors",
    aName: "a relationship counsellor",
    typicallyFor: "Two people in the room: the household load, the sting of reminders, and what ADHD does to a partnership when only one of you has it.",
    whenToExplore: "The problem is the same argument, and it belongs to both of you.",
    cues: ["relationship counsellor", "relationship counselling", "couples counsellor", "couples counselling", "couples counseling"],
  },
  {
    id: "sleep-clinician",
    label: "Sleep clinician",
    plural: "sleep clinicians",
    aName: "a sleep clinician",
    typicallyFor: "A body clock that runs late, nights that will not start, and the checks for sleep conditions that can sit beside ADHD.",
    whenToExplore: "A month of routine changes has not moved your sleep, or somebody tells you that you snore or stop breathing at night.",
    cues: ["sleep clinician", "sleep clinic", "sleep doctor", "sleep physician"],
  },
  {
    id: "university-support",
    label: "University support service",
    plural: "university support services",
    aName: "a university support service",
    typicallyFor: "Study adjustments on paper, extensions, exam arrangements, note-taking, through the accessibility or disability service every university runs.",
    whenToExplore: "You are studying, deadlines or exams are where it falls apart, and the adjustment exists but you have not asked.",
    cues: ["university support", "student support", "disability services", "disability service", "accessibility services", "accessibility service"],
  },
];

const BY_ID: ReadonlyMap<Profession, ProfessionEntry> = new Map(PROFESSION_ENTRIES.map((p) => [p.id, p]));

export function profession(id: Profession): ProfessionEntry {
  const entry = BY_ID.get(id);
  if (!entry) throw new Error(`professions: unknown profession ${id}`);
  return entry;
}

export function isProfession(value: unknown): value is Profession {
  return typeof value === "string" && (PROFESSIONS as readonly string[]).includes(value);
}

function escape(cue: string): string {
  return cue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The professions a sentence names, in vocabulary order, each at most once.
 *
 * Word-bounded and case-insensitive, so "an OT who does telehealth" names the occupational
 * therapist and "a hot desk" does not. Deliberately reads only the NAME of a profession: what a
 * person needs is the support engine's to work out from their own answers, never from a sentence
 * about who they want to see.
 */
export function professionsMentioned(text: string): Profession[] {
  const lower = text.toLowerCase();
  return PROFESSION_ENTRIES.filter((entry) =>
    entry.cues.some((cue) => new RegExp(`(^|[^a-z])${escape(cue)}(?=$|[^a-z])`, "i").test(lower)),
  ).map((entry) => entry.id);
}

/** "GP" for a GP; "Psychologist" otherwise — the word beside a name on a card. */
export function professionLabel(id: Profession): string {
  return profession(id).label;
}

/**
 * The expertise taxonomy (PRD §40) — what an allied provider says they work on, closed.
 *
 * "ADHD" alone is not an expertise; every tag here is a PROBLEM a person would recognise, which
 * is what lets a need be matched to a provider and the reason be said back in plain words.
 */
export const EXPERTISE_TAGS = [
  "adhd-work-systems",
  "task-initiation",
  "deadline-management",
  "university-adhd",
  "adhd-couples",
  "household-organisation",
  "emotional-regulation",
  "perfectionism",
  "exercise-adherence",
  "sleep-routine",
  "workplace-adjustments",
  "late-diagnosis",
  "medication-review",
  "stimulant-appetite-concerns",
  "regular-eating",
] as const;
export type ExpertiseTag = (typeof EXPERTISE_TAGS)[number];

export const EXPERTISE_LABELS: Readonly<Record<ExpertiseTag, string>> = {
  "adhd-work-systems": "ADHD at work",
  "task-initiation": "Task initiation",
  "deadline-management": "Deadline management",
  "university-adhd": "University ADHD",
  "adhd-couples": "ADHD in couples",
  "household-organisation": "Household organisation",
  "emotional-regulation": "Emotional regulation",
  perfectionism: "Perfectionism",
  "exercise-adherence": "Keeping exercise going",
  "sleep-routine": "Sleep routine",
  "workplace-adjustments": "Workplace adjustments",
  "late-diagnosis": "Late recognition",
  "medication-review": "Medication review",
  "stimulant-appetite-concerns": "Appetite on stimulants",
  "regular-eating": "Regular eating",
};

export function isExpertiseTag(value: unknown): value is ExpertiseTag {
  return typeof value === "string" && (EXPERTISE_TAGS as readonly string[]).includes(value);
}
