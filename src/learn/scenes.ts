// O239 (founder-directed): the Learn tab's copy, as data.
//
// This is the story sequence's eight scenes (app/story-sequence.tsx until O239), word for word:
// copy the compliance sweeps have read on every run since it was written, regrouped into three
// short modules a person can finish one card at a time. Nothing here is new prose — a learning
// module that invented clinical claims to fill its cards would be exactly what the patient copy
// laws forbid, so the modules teach what the product already argued and nothing more.
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
];

/** A module: a few scenes a person finishes one card at a time, with a length they can plan for. */
export type LearnModule = {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  /** Reading time, in whole minutes, from the scenes' word count at a slow reading pace. */
  readonly minutes: number;
  readonly scenes: readonly string[];
  /** Which token family the tile's mark is drawn in. Three modules, three families, no new colour. */
  readonly tint: "route" | "accent" | "ink";
};

export const MODULES: readonly LearnModule[] = [
  { id: "finding", title: "Finding a GP", subtitle: "Why the search comes back empty", minutes: 3, scenes: ["01", "02", "03"], tint: "route" },
  { id: "cost", title: "Time, money, distance", subtitle: "The questions nobody publishes", minutes: 2, scenes: ["04", "05"], tint: "accent" },
  { id: "changed", title: "What changed", subtitle: "NSW, Queensland, and one GP end to end", minutes: 2, scenes: ["06", "07", "08"], tint: "ink" },
];

export function scenesOf(module: LearnModule): Scene[] {
  return module.scenes.map((n) => {
    const scene = SCENES.find((s) => s.n === n);
    if (!scene) throw new Error(`learn: module ${module.id} names scene ${n}, which does not exist`);
    return scene;
  });
}
