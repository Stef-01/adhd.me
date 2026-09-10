// The eco-bio-psychosocial vocabulary (PRD §25) and the P0 life domains (PRD §5).
//
// Every signal the personal model holds belongs to one of four LAYERS — brain, body, environment,
// people — and to one SUBDOMAIN inside it. The GP interview behind the PRD warned that medication
// crowds out the environmental, educational and social picture; holding the layers as data is what
// lets every screen (My ADHD, the care map, the support path) say which part of a person's life a
// difficulty sits in, rather than reducing it to one word.
//
// Closed vocabularies, on purpose. A module names the subdomains it teaches, a need names the one
// it is about, and the care map draws one node per entry here — so a subdomain that nothing
// teaches, or a module naming one that does not exist, is a type error and not a silent gap.

export const LAYERS = ["brain", "body", "environment", "people"] as const;
export type Layer = (typeof LAYERS)[number];

export const LAYER_LABELS: Readonly<Record<Layer, string>> = {
  brain: "Brain",
  body: "Body",
  environment: "Environment",
  people: "People",
};

/** What each layer is, in one sentence a person can read on the map. */
export const LAYER_BLURBS: Readonly<Record<Layer, string>> = {
  brain: "How attention, memory, activation and emotion actually run for you, the part most explanations stop at.",
  body: "Sleep, movement, appetite and energy: the physical conditions the brain is working under.",
  environment: "The structure around you, deadlines, noise, workload, where you live and study and work.",
  people: "The relationships that carry part of the load, or add to it: partner, family, manager, teachers, peers, clinicians.",
};

export type Subdomain =
  // brain
  | "activation"
  | "attention"
  | "memory"
  | "switching"
  | "inhibition"
  | "time"
  | "emotional-regulation"
  // body
  | "sleep"
  | "movement"
  | "appetite"
  | "energy"
  | "medication-experience"
  // environment
  | "structure"
  | "noise"
  | "workload"
  | "deadline-design"
  | "living-environment"
  | "study-context"
  | "workplace-context"
  // people
  | "partner"
  | "family"
  | "manager"
  | "teachers"
  | "peers"
  | "clinicians";

export interface SubdomainEntry {
  readonly id: Subdomain;
  readonly layer: Layer;
  readonly label: string;
  /** What it means for a person, in plain words — the care map's node text. */
  readonly meaning: string;
}

export const SUBDOMAINS: readonly SubdomainEntry[] = [
  { id: "activation", layer: "brain", label: "Starting", meaning: "Getting going on something you already know how to do. Often the hardest step, especially when the task is vague or far from due." },
  { id: "attention", layer: "brain", label: "Attention", meaning: "Where focus goes, and how easily it is pulled. Interest and urgency steer it more than intention does." },
  { id: "memory", layer: "brain", label: "Working memory", meaning: "Holding several things in mind at once, instructions, a plan, what somebody just said, while doing something else." },
  { id: "switching", layer: "brain", label: "Switching", meaning: "Moving between tasks, and getting back to one after an interruption." },
  { id: "inhibition", layer: "brain", label: "Impulse", meaning: "The pause between wanting to do something and doing it, in conversation, spending, or leaving a task." },
  { id: "time", layer: "brain", label: "Time sense", meaning: "Feeling how long things take and how far away a deadline is. 'Now' and 'not now' can be the only two settings." },
  { id: "emotional-regulation", layer: "brain", label: "Emotion", meaning: "How fast feelings arrive and how long they take to settle, frustration, overwhelm, the sting of criticism." },
  { id: "sleep", layer: "body", label: "Sleep", meaning: "When you fall asleep, how you wake, and what a short night does to the next day." },
  { id: "movement", layer: "body", label: "Movement", meaning: "Exercise and physical activity, which many people find steadies attention and mood." },
  { id: "appetite", layer: "body", label: "Appetite", meaning: "Eating regularly, and noticing when you have not." },
  { id: "energy", layer: "body", label: "Energy", meaning: "The rhythm of the day, when you have fuel, and when you are running on urgency alone." },
  { id: "medication-experience", layer: "body", label: "Medication", meaning: "What medication seems to change for you, and what it leaves untouched. Something to describe, never something this app advises on." },
  { id: "structure", layer: "environment", label: "Structure", meaning: "How much external structure a day has, fixed times, clear steps, somebody checking in." },
  { id: "noise", layer: "environment", label: "Noise", meaning: "Sound, movement and visual clutter where you are trying to work or rest." },
  { id: "workload", layer: "environment", label: "Workload", meaning: "How much is on, and how many of the things are open at once." },
  { id: "deadline-design", layer: "environment", label: "Deadlines", meaning: "How deadlines are set, one far-off date, or milestones along the way." },
  { id: "living-environment", layer: "environment", label: "Home", meaning: "The household: who does what, where things go, how the day is organised." },
  { id: "study-context", layer: "environment", label: "Study", meaning: "How a course is run, lectures, assignments, the gap between being taught and being assessed." },
  { id: "workplace-context", layer: "environment", label: "Work", meaning: "How a job is set up, instructions, meetings, interruptions, what gets measured." },
  { id: "partner", layer: "people", label: "Partner", meaning: "The person closest to the day-to-day, often carrying part of the organising load, sometimes without either of you naming it." },
  { id: "family", layer: "people", label: "Family", meaning: "Parents, siblings, household: the people who have known the pattern longest." },
  { id: "manager", layer: "people", label: "Manager", meaning: "Whoever sets the work and judges it. A small change in how instructions arrive can change a lot." },
  { id: "teachers", layer: "people", label: "Teachers", meaning: "Lecturers, tutors and course staff; the people who set the structure a student works inside." },
  { id: "peers", layer: "people", label: "Peers", meaning: "Friends, classmates, colleagues, company that makes some tasks easier and some harder." },
  { id: "clinicians", layer: "people", label: "Clinicians", meaning: "The professionals already involved, and the conversations worth having with them." },
];

const BY_ID: ReadonlyMap<Subdomain, SubdomainEntry> = new Map(SUBDOMAINS.map((s) => [s.id, s]));

export function subdomain(id: Subdomain): SubdomainEntry {
  const entry = BY_ID.get(id);
  if (!entry) throw new Error(`layers: unknown subdomain ${id}`);
  return entry;
}

export function subdomainsOf(layer: Layer): SubdomainEntry[] {
  return SUBDOMAINS.filter((s) => s.layer === layer);
}

/** The P0 life domains a module and a need belong to (PRD §5). */
export const DOMAINS = ["understand", "work-study", "relationships", "daily-life", "mind-emotions", "sleep-body"] as const;
export type Domain = (typeof DOMAINS)[number];

export const DOMAIN_LABELS: Readonly<Record<Domain, string>> = {
  understand: "Understand ADHD",
  "work-study": "Work & Study",
  relationships: "Relationships",
  "daily-life": "Daily Life",
  "mind-emotions": "Mind & Emotions",
  "sleep-body": "Sleep & Body",
};
