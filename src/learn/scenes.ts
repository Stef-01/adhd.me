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
      "Type “ADHD GP near me” and you get directories, sponsored clinics, telehealth start-ups and " +
      "psychiatry waiting lists. Almost none of it is a GP near you who assesses ADHD.",
    detail: [
      "No booking site has a filter for it",
      "The ads are for the expensive route",
      "Half the results are not in your state",
    ],
  },
  {
    n: "02",
    eyebrow: "So you go looking",
    heading: "Then you read the doctors one at a time.",
    body:
      "You open a practice page and work down the list, one GP at a time, looking for the word. " +
      "Usually it is not there. The profile says “special interests” and lists skin checks and " +
      "travel medicine, and you are still guessing.",
    detail: [
      "Practice pages list doctors, not what they do",
      "Reception often cannot say either",
      "There is no public register of who actually does this work",
      "The one GP who does it is not taking new patients",
    ],
  },
  {
    n: "03",
    eyebrow: "The part nobody answers",
    heading: "None of it answers what you want to ask.",
    body:
      "Even when a name finally looks plausible, the page is silent on everything that decides " +
      "whether this GP is right for you. You book, take the day off, and find out in the room.",
    detail: [
      "Will they take me seriously?",
      "Will they think I’m after something?",
      "Do they know how this looks in women?",
      "Will they understand my family, my language?",
      "Do I need school reports? I don’t have any.",
      "Will I forget what I meant to say?",
    ],
  },
  {
    n: "04",
    eyebrow: "Money, time, distance",
    heading: "How far, how long, how much.",
    body:
      "The questions that decide whether you go at all are the ones nobody publishes. You ring and " +
      "ask, or you turn up and find out.",
    detail: [
      "Can I get there without a car?",
      "Is a fifteen-minute appointment enough for this?",
      "Can I take another day off work?",
      "Is it bulk billed, or is there a gap?",
    ],
  },
  {
    n: "05",
    eyebrow: "What the old route cost",
    heading: "The wait was never the care.",
    body:
      "Before the rule changed, the route ran through a queue with no visible end and a bill most " +
      "people could not plan for. None of the waiting made the care better. It only made it later.",
    detail: [
      "Time off work",
      "A referral to chase",
      "Telling the whole story to somebody new",
    ],
    foot:
      "6–12 months is a typical wait for an adult ADHD assessment appointment; $1k to $5k is a " +
      "common out-of-pocket cost of a private adult assessment. Both indicative, pending source " +
      "confirmation.",
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
      "The permission already changed. Acting on it is the part that was missing. Three steps.",
    detail: [
      "Say what you need, in your words. Not a quiz, and not a score.",
      "See who is near you, by suburb, care area and language.",
      "Book the first appointment with one GP who carries it through.",
    ],
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
      "ADHD is a difference in how attention, activity and impulse are regulated. The attention is " +
      "there — it just does not always go where it is needed, and it can lock on hard when " +
      "something is interesting. That is why the same person can lose a whole afternoon to one " +
      "thing and not manage a five-minute form.",
    detail: [
      "It is not a shortage of effort or care",
      "It shows up across settings — work, home, study — not only in one",
      "Hyperactivity can be internal: a restless mind rather than a restless body",
    ],
  },
  {
    n: "10",
    eyebrow: "Adults too",
    heading: "It does not stop at eighteen.",
    body:
      "Many people are assessed for the first time as adults, often after a child in the family " +
      "is, or after years of building systems that quietly stopped working. The pattern is usually " +
      "older than the label.",
    detail: [
      "Assessment in adulthood looks back to childhood as well as at now",
      "Old school reports help, but their absence does not close the door",
      "A parent, partner or old friend can fill in the early picture",
    ],
  },
  {
    n: "11",
    eyebrow: "Who gets overlooked",
    heading: "It can look quieter in women and girls.",
    body:
      "The loud, fidgeting picture is the one most people know, and it is the one that gets " +
      "noticed at school. Inattention, daydreaming, internal restlessness and exhaustion from " +
      "masking are easier to overlook — and are more often the shape it takes in women and girls.",
    detail: [
      "Trying very hard and still falling behind is a common story",
      "Being organised on the surface can hide a lot of effort underneath",
      "Being overlooked for years is common, not unusual",
    ],
  },
  {
    n: "12",
    eyebrow: "What assessment is",
    heading: "A conversation with history, not a single test.",
    body:
      "An assessment is a structured conversation: your history from childhood to now, how things " +
      "are across the different parts of your life, and what else could explain the pattern. " +
      "Questionnaires help organise it. They do not decide it.",
    detail: [
      "Expect more than one appointment",
      "Expect to be asked about sleep, mood and what else is going on",
      "Expect to be asked what you want to be different",
    ],
    foot: "General information, not advice about you. A GP is the person to talk with about what fits.",
  },

  // ── O244: everyday strategies people find useful ───────────────────────────────────────
  {
    n: "13",
    eyebrow: "Everyday",
    heading: "Put memory outside your head.",
    body:
      "Working memory is the scratchpad, and with ADHD the scratchpad is small. The move most " +
      "people find useful is not to try harder to remember — it is to stop needing to. One " +
      "list, one place, always open.",
    detail: [
      "One list, not five apps",
      "Write it down the moment it lands, before the next thing",
      "Put the object where the task happens: keys by the door, the form on the keyboard",
    ],
  },
  {
    n: "14",
    eyebrow: "Everyday",
    heading: "One thing, in view.",
    body:
      "Time is hard to feel from the inside, so make it visible. A timer you can see, one task " +
      "on the screen, and a start that is deliberately small — two minutes, one paragraph, one " +
      "email — because starting is the hard part and momentum does the rest.",
    detail: [
      "A visible timer beats a mental one",
      "Shrink the first step until it is silly",
      "Close what you are not using",
    ],
  },
  {
    n: "15",
    eyebrow: "Everyday",
    heading: "Borrow someone’s presence.",
    body:
      "Doing a dull task next to another person — in the room, or on a call with cameras on — " +
      "makes it easier to start and to stay. People call it body doubling. It works for tax " +
      "returns, and it works for cleaning the kitchen.",
    detail: [
      "A friend, a library, a video call",
      "Say what you are going to do, out loud, first",
      "Stop when the timer stops, even mid-task",
    ],
  },
  {
    n: "16",
    eyebrow: "Before the appointment",
    heading: "Write down what you want to say.",
    body:
      "The appointment is short and the story is long. Write the three things you most want the " +
      "GP to know before you go, in your own words, and bring them. The box on the finder is a " +
      "fine place to draft the first sentence.",
    detail: [
      "What is hardest right now",
      "How long it has been like this",
      "What you want to be different",
    ],
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
  readonly kind: "read" | "quiz";
  /** Read modules: the scenes, in order. */
  readonly scenes?: readonly string[];
  /** Quiz modules: the questions, in order. */
  readonly questions?: readonly Question[];
};

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
    explain: "Only an assessment with a clinician can. This quiz is about ADHD in general — it says nothing about you.",
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
    explain: "A long appointment is a booked slot of twenty minutes or more — the kind an assessment conversation needs.",
  },
];

export const MODULES: readonly LearnModule[] = [
  { id: "adhd", title: "What ADHD is", subtitle: "The word, adults, who gets overlooked, what assessment is", minutes: 4, tint: "route", kind: "read", scenes: ["09", "10", "11", "12"] },
  { id: "everyday", title: "Everyday strategies", subtitle: "Memory outside your head, one thing in view, borrowed presence", minutes: 3, tint: "accent", kind: "read", scenes: ["13", "14", "15", "16"] },
  { id: "myth-or-fact", title: "Myth or fact?", subtitle: "Six quick calls on what people get wrong", minutes: 2, tint: "ink", kind: "quiz", questions: MYTH_OR_FACT },
  { id: "words", title: "Words you’ll hear", subtitle: "Titration, shared care, bulk billing — decoded", minutes: 2, tint: "route", kind: "quiz", questions: WORDS_YOU_WILL_HEAR },
  { id: "finding", title: "Finding a GP", subtitle: "Why the search comes back empty", minutes: 3, tint: "accent", kind: "read", scenes: ["01", "02", "03"] },
  { id: "cost", title: "Time, money, distance", subtitle: "The questions nobody publishes", minutes: 2, tint: "ink", kind: "read", scenes: ["04", "05"] },
  { id: "changed", title: "What changed", subtitle: "NSW, Queensland, and one GP end to end", minutes: 2, tint: "route", kind: "read", scenes: ["06", "07", "08"] },
];

/** The two shelves the list shows: learning about ADHD first, the route to care second. */
export const SHELVES: ReadonlyArray<{ readonly title: string; readonly modules: readonly string[] }> = [
  { title: "Understanding ADHD", modules: ["adhd", "everyday", "myth-or-fact", "words"] },
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
  return module.kind === "quiz" ? (module.questions ?? []).length : (module.scenes ?? []).length;
}
