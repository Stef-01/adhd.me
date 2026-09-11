import { INDICATIVE_FIGURES } from "../compliance/landing-copy";
import { INTERACTIVE_MODULES, type InteractiveModule } from "./interactive";
import { runFor, runStepCount, type Run } from "./runs-index";

// O239 (founder-directed): the Learn tab's copy, as data. O244 (founder-directed) widened it:
// "the learn tab is to help people learn about ADHD and managing symptoms, and little
// Buzzfeed-style trendy quizzes, but also learning content in an engaging way."
//
// WHAT A LEARN MODULE MAY SAY, AND WHAT IT MAY NOT. Everything here is a patient surface, so it
// answers to the same linters as the finder: no diagnosis, no urgency, no benefit claims, no
// "specialist", no condition targeting, nothing about the reader's own health. So the reading
// modules are GENERAL information — what the word means, how the route through assessment
// works, what people find useful day to day — and the quizzes are KNOWLEDGE quizzes about ADHD in
// general. No quiz here asks about the reader and no quiz says anything about them: a quiz that
// sorted a person by their symptoms would be the symptom-based triage the founder gates forbid,
// dressed up. Question three of "Myth or fact" says this out loud, on purpose.
//
// THE FIRST EIGHT SCENES are the story sequence's, word for word (app/story-sequence.tsx until
// O239): copy the sweeps have read on every run since it was written. The rest is new and was
// written against the rule list above; the public sweep reads all of it.
//
// TWO HEADINGS ARE LOAD-BEARING: scenes 06 ("NSW and QLD") and 07 ("How it works") are named by
// e2e specs; renaming either needs those specs updated with it.

export type Scene = {
  readonly n: string;
  readonly eyebrow: string;
  readonly heading: string;
  readonly body: string;
  /** The nuance — the specific things that actually go wrong, or the steps. */
  readonly detail?: readonly string[];
  /** A quieter line under the detail, for the qualification a figure needs. */
  readonly foot?: string;
};

export const SCENES: readonly Scene[] = [
  {
    n: "01",
    eyebrow: "Where it starts",
    heading: "You search, and no GP comes back.",
    body:
      "Search “ADHD GP near me” and you get directories, ads and waiting lists. Almost no GP near you.",
    detail: ["No booking site filters for it", "The ads sell the expensive route", "Half the results are interstate"],
  },
  {
    n: "02",
    eyebrow: "So you go looking",
    heading: "Then you read the doctors one at a time.",
    body:
      "You read a practice page one GP at a time. The word is not there.",
    detail: ["Pages list doctors, not what they do", "Reception often cannot say", "No public register exists", "The one who does it is full"],
  },
  {
    n: "03",
    eyebrow: "The part nobody answers",
    heading: "None of it answers what you want to ask.",
    body:
      "Even a plausible name says nothing about whether this GP is right for you.",
    detail: ["Will they take me seriously?", "Do they know how women present?", "My family, my language?", "No school reports. Is that fine?", "Will I forget what to say?"],
  },
  {
    n: "04",
    eyebrow: "Money, time, distance",
    heading: "How far, how long, how much.",
    body:
      "The questions that decide whether you go are the ones nobody publishes.",
    detail: ["No car. Can I get there?", "Is fifteen minutes enough?", "Another day off work?", "Bulk billed, or a gap?"],
  },
  {
    n: "05",
    eyebrow: "What the old route cost",
    heading: "The wait was never the care.",
    body:
      "The old route was a queue with no end and a bill nobody could plan for. Waiting made care later, not better.",
    detail: ["Time off work", "A referral to chase", "The whole story, again"],
    foot:
      `${INDICATIVE_FIGURES.wait.value} is a ${INDICATIVE_FIGURES.wait.label}; ` +
      `${INDICATIVE_FIGURES.cost.value} is a ${INDICATIVE_FIGURES.cost.label}. ` +
      "Both indicative, pending source confirmation.",
  },
  {
    n: "06",
    eyebrow: "What changed",
    heading: "The rule is changing in NSW and QLD.",
    body:
      "GPs can now carry the whole pathway rather than only refer it " +
      "onward. Psychiatry stays available for the complex cases. The queue stops being the default.",
    foot:
      "ADHD.ME lists the GPs who do this work. Every one of them is a GP; ADHD is not " +
      "a specialty on the register, and nobody here claims otherwise.",
  },
  {
    n: "07",
    eyebrow: "What ADHD.ME is",
    heading: "How it works, end to end.",
    body:
      "The permission changed. Acting on it was the missing part. Three steps.",
    detail: ["Say what you need, in your words", "See who is near you", "Book one GP who carries it through"],
  },
  {
    n: "08",
    eyebrow: "The one action",
    heading: "One GP, from the first appointment to the follow-up.",
    body:
      "Nobody should have to tell their story twice to get through a door. One clinician holds the " +
      "assessment, the medication and the follow-up, and what they wrote down in the first " +
      "appointment is still there in the fourth.",
    foot:
      "You book with the practice on Healthengine, where the live times are. ADHD.ME does not see " +
      "your booking.",
  },

  // ── O244: what ADHD is, in general terms ────────────────────────────────────────────────
  {
    n: "09",
    eyebrow: "The word",
    heading: "Attention that runs on interest, not importance.",
    body:
      "Attention is there. It goes where interest is, locks on hard, and skips the five-minute form.",
    detail: ["Not a shortage of effort", "Shows up across every setting", "Restlessness can be a restless mind"],
  },
  {
    n: "10",
    eyebrow: "Adults too",
    heading: "It does not stop at eighteen.",
    body:
      "Many people are assessed first as adults, often after a child is. The pattern is older than the label.",
    detail: ["It looks back to childhood", "Missing school reports do not close the door", "A parent or old friend fills the early picture"],
  },
  {
    n: "11",
    eyebrow: "Who gets overlooked",
    heading: "It can look quieter in women and girls.",
    body:
      "The loud, fidgeting picture gets noticed at school. Daydreaming, inner restlessness and masking are overlooked, and are more often the shape in women and girls.",
    detail: ["Trying hard, still behind", "Organised outside, effort underneath", "Overlooked for years is common"],
  },
  {
    n: "12",
    eyebrow: "What assessment is",
    heading: "A conversation with history, not a single test.",
    body:
      "A structured conversation: your history, how life goes in each part of it, what else could explain the pattern. Questionnaires organise it, never decide it.",
    detail: ["More than one appointment", "Sleep, mood, what else is going on", "What you want to be different"],
    foot: "General information, not advice about you. A GP is the person to talk with about what fits.",
  },

  // ── O244: everyday strategies people find useful ───────────────────────────────────────
  {
    n: "13",
    eyebrow: "Everyday",
    heading: "Put memory outside your head.",
    body:
      "A small scratchpad. Stop remembering: one list, one place, always open.",
    detail: ["One list, not five apps", "Write it down as it lands", "Keys by the door"],
  },
  {
    n: "14",
    eyebrow: "Everyday",
    heading: "One thing, in view.",
    body:
      "Time is hard to feel, so make it visible. One timer, one task, a start too small to refuse.",
    detail: ["A visible timer beats a mental one", "Shrink the first step until it is silly", "Close what you are not using"],
  },
  {
    n: "15",
    eyebrow: "Everyday",
    heading: "Borrow someone’s presence.",
    body:
      "A dull task beside another person, in the room or on a call, is easier to start and finish. Body doubling.",
    detail: ["A friend, a library, a video call", "Say what you will do, out loud", "Stop when the timer stops"],
  },
  {
    n: "16",
    eyebrow: "Before the appointment",
    heading: "Write down what you want to say.",
    body:
      "The appointment is short, the story is long. Write the three things the GP should know and bring them.",
    detail: ["What is hardest right now", "How long it has been like this", "What you want to be different"],
    foot: "General information, not advice about you. A GP is the person to talk with about what fits.",
  },
];

/** A knowledge question about ADHD in general. Never about the reader. */
export type Question = {
  readonly prompt: string;
  readonly options: readonly string[];
  /** Index into `options`. */
  readonly answer: number;
  /** Said after the choice, whichever way it went. */
  readonly explain: string;
};

export type LearnModule = {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  /** Reading time, in whole minutes, from the word count at a slow reading pace. */
  readonly minutes: number;
  /** Which token family the tile's mark is drawn in. Three families, no new colour. */
  readonly tint: "route" | "accent" | "ink";
  readonly kind: "read" | "quiz" | "run";
  /** Read modules: the scenes, in order. */
  readonly scenes?: readonly string[];
  /** Quiz modules: the questions, in order. */
  readonly questions?: readonly Question[];
  /** The interactive module behind a run (PRD §12): its steps, characters and subdomains — see `interactive.ts`. The run is what plays; the model reads the module. */
  readonly interactive?: InteractiveModule;
  /** Play (PLAY-PLAN.md): the module as a run of micro-games. Every interactive module has one. */
  readonly run?: Run;
};

/** The interactive modules, in the shape the list, the cursor and the progress record read. */
const INTERACTIVE: readonly LearnModule[] = INTERACTIVE_MODULES.map((m, i) => {
  const run = runFor(m.id);
  if (!run) throw new Error(`scenes: interactive module ${m.id} has no run (PLAY-PLAN.md §9.1: the runs are the form)`);
  return {
    id: m.id,
    title: run?.title ?? m.title,
    subtitle: run?.tagline ?? m.subtitle,
    minutes: run?.minutes ?? m.minutes,
    tint: (["route", "accent", "ink"] as const)[i % 3]!,
    kind: "run",
    interactive: m,
    run,
  };
});

export const MYTH_OR_FACT: readonly Question[] = [
  {
    prompt: "ADHD is only a childhood thing.",
    options: ["Myth", "Fact"],
    answer: 0,
    explain: "Many people are assessed for the first time as adults. The pattern is usually older than the label.",
  },
  {
    prompt: "In NSW and Queensland, a GP can now carry an ADHD assessment.",
    options: ["Myth", "Fact"],
    answer: 1,
    explain: "The rule changed. Psychiatry stays available for the complex cases; the queue stops being the default.",
  },
  {
    prompt: "A quiz on the internet can tell you whether you have ADHD.",
    options: ["Myth", "Fact"],
    answer: 0,
    explain: "Only an assessment with a clinician can. This quiz is about ADHD in general, it says nothing about you.",
  },
  {
    prompt: "ADHD can look quieter in women and girls.",
    options: ["Myth", "Fact"],
    answer: 1,
    explain: "Inattention, daydreaming and internal restlessness are easier to miss than the loud picture most people know.",
  },
  {
    prompt: "Being organised means you cannot have ADHD.",
    options: ["Myth", "Fact"],
    answer: 0,
    explain: "Plenty of people build careful systems to cope. The effort underneath is part of the picture, not evidence against it.",
  },
  {
    prompt: "One GP can hold the assessment, the medication and the follow-up.",
    options: ["Myth", "Fact"],
    answer: 1,
    explain: "That is the whole point of the change: one clinician, from the first appointment to the fourth.",
  },
];

export const WORDS_YOU_WILL_HEAR: readonly Question[] = [
  {
    prompt: "“Titration” means…",
    options: ["Finding the dose that fits, step by step, with reviews along the way", "A blood test", "The first appointment"],
    answer: 0,
    explain: "Titration is the stepwise adjustment, usually over weeks, with a review at each step.",
  },
  {
    prompt: "“Shared care” means…",
    options: ["Two GPs at one practice", "A GP and a psychiatrist looking after one plan together", "Care paid for by two people"],
    answer: 1,
    explain: "Shared care is one plan held by two clinicians, with the GP doing the regular part.",
  },
  {
    prompt: "“Telehealth first” means…",
    options: ["The practice has no rooms", "The first appointment is by phone or video", "You must own a webcam"],
    answer: 1,
    explain: "The first appointment happens by phone or video; later ones may be in the rooms.",
  },
  {
    prompt: "“Bulk billed” means…",
    options: ["You pay the whole fee up front", "Medicare covers the fee and you pay nothing at the desk", "The bill comes later, in bulk"],
    answer: 1,
    explain: "Bulk billing is Medicare paying the practice directly, with no gap for you.",
  },
  {
    prompt: "“A long appointment” usually means…",
    options: ["Twenty minutes or more, booked as such", "Any appointment that runs late", "A hospital stay"],
    answer: 0,
    explain: "A long appointment is a booked slot of twenty minutes or more, the kind an assessment conversation needs.",
  },
];

export const MODULES: readonly LearnModule[] = [
  { id: "adhd", title: "What ADHD is", subtitle: "The word, adults, who gets overlooked, what assessment is", minutes: 4, tint: "route", kind: "read", scenes: ["09", "10", "11", "12"] },
  { id: "everyday", title: "Everyday strategies", subtitle: "Memory outside your head, one thing in view, borrowed presence", minutes: 3, tint: "accent", kind: "read", scenes: ["13", "14", "15", "16"] },
  { id: "myth-or-fact", title: "Myth or fact?", subtitle: "Six quick calls on what people get wrong", minutes: 2, tint: "ink", kind: "quiz", questions: MYTH_OR_FACT },
  { id: "words", title: "Words you’ll hear", subtitle: "Titration, shared care, bulk billing, decoded", minutes: 2, tint: "route", kind: "quiz", questions: WORDS_YOU_WILL_HEAR },
  { id: "finding", title: "Finding a GP", subtitle: "Why the search comes back empty", minutes: 3, tint: "accent", kind: "read", scenes: ["01", "02", "03"] },
  { id: "cost", title: "Time, money, distance", subtitle: "The questions nobody publishes", minutes: 2, tint: "ink", kind: "read", scenes: ["04", "05"] },
  { id: "changed", title: "What changed", subtitle: "NSW, Queensland, and one GP end to end", minutes: 2, tint: "route", kind: "read", scenes: ["06", "07", "08"] },
  ...INTERACTIVE,
];

/**
 * The shelves the list shows. The PRD's six life domains carry the interactive modules; the two
 * shelves that were here before — the general reads and quizzes, and the route to care — stay.
 */
export const SHELVES: ReadonlyArray<{ readonly title: string; readonly modules: readonly string[] }> = [
  { title: "Understand ADHD", modules: ["context", "more-than-attention", "starting", "deadlines", "working-memory", "hyperfocus", "adhd", "everyday", "myth-or-fact", "words"] },
  { title: "Work & Study", modules: ["ambiguity", "interruption", "perfectionism"] },
  { title: "Relationships", modules: ["not-listening", "forgotten-commitments", "conflict"] },
  { title: "Daily Life", modules: ["household", "money", "mornings"] },
  { title: "Sleep & Body", modules: ["sleep", "exercise", "eating", "gut", "screens"] },
  { title: "Finding care", modules: ["finding", "cost", "changed"] },
];

export function scenesOf(module: LearnModule): Scene[] {
  return (module.scenes ?? []).map((n) => {
    const scene = SCENES.find((s) => s.n === n);
    if (!scene) throw new Error(`learn: module ${module.id} names scene ${n}, which does not exist`);
    return scene;
  });
}

/** How many cards a module has — scenes for a read module, questions for a quiz. */
export function cardCount(module: LearnModule): number {
  if (module.kind === "run") return module.run ? runStepCount(module.run) : 0;
  return module.kind === "quiz" ? (module.questions ?? []).length : (module.scenes ?? []).length;
}
