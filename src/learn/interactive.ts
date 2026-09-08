// The interactive modules (PRD §11–§19, §59): the fifteen MVP modules as data, in the nine-stage
// architecture, with the five characters.
//
// WHAT A MODULE IS HERE. A `LearnModule` of kind "interactive" carries a `steps` sequence rather
// than scenes: a hook, an experience with a choice, recognition (the mandatory resonance capture),
// an explanation, two to four personalisation questions, one or two strategies each offered as a
// micro-experiment, an optional reflection, an insight the person confirms or rejects, and one
// primary next action. Three modules carry a simulation and three carry perspective switching.
//
// WHAT IT MAY SAY. Everything is a patient surface: no diagnosis, no urgency, no benefit claims,
// no "specialist", and nothing that tells the person what is wrong with them. A module says "this
// could be worth exploring" and asks "does this happen to you?" — the person answers, and only
// their answer enters the model (`src/model/store.ts`). The test beside this file holds every
// string to the same linter the rest of the tree uses, and holds every module to the stage list.
//
// Every text block is written to sit under sixty words a screen (PRD §12).

import type { Domain, Subdomain } from "@/model/layers";
import type { Profession } from "@/support/professions";

export const CHARACTERS = ["maya", "alex", "jordan", "sam", "priya"] as const;
export type Character = (typeof CHARACTERS)[number];

export const CHARACTER_BIOS: Readonly<Record<Character, { name: string; who: string }>> = {
  maya: { name: "Maya", who: "Early-career professional, two years into her first real job." },
  alex: { name: "Alex", who: "University student, second year, living in a share house." },
  jordan: { name: "Jordan", who: "Young adult running an independent life for the first time." },
  sam: { name: "Sam", who: "Jordan’s partner — the other side of the same evening." },
  priya: { name: "Priya", who: "High achiever whose systems cost more than anyone can see." },
};

export type Mood = "neutral" | "pleased" | "anxious" | "frustrated" | "embarrassed" | "overwhelmed" | "surprised" | "engaged" | "thinking" | "relieved";

/** A simple environmental object beside the character. Drawn in `app/characters.tsx`. */
export type Prop = "desk" | "phone" | "bill" | "ball" | "lecture" | "bed" | "kitchen" | "calendar" | "door" | "none";

export interface Option {
  readonly id: string;
  readonly label: string;
}

export interface Strategy {
  readonly id: string;
  readonly title: string;
  /** The steps, as the micro-experiment reads them: short, physical, tomorrow-sized. */
  readonly steps: readonly string[];
  /** Which layer of the person's life it works on — for My ADHD's "what helps". */
  readonly acts: "brain" | "body" | "environment" | "people";
}

export type Step =
  | { readonly kind: "scene"; readonly stage: "hook" | "experience"; readonly who: Character; readonly mood: Mood; readonly prop: Prop; readonly eyebrow?: string; readonly heading: string; readonly body: string }
  | { readonly kind: "choice"; readonly who: Character; readonly mood: Mood; readonly prop: Prop; readonly heading: string; readonly body?: string; readonly options: ReadonlyArray<Option & { readonly response: string }> }
  | { readonly kind: "resonance"; readonly heading: string }
  | { readonly kind: "explain"; readonly eyebrow: string; readonly heading: string; readonly body: string; readonly detail?: readonly string[]; readonly who?: Character; readonly mood?: Mood; readonly prop?: Prop }
  | { readonly kind: "personalise"; readonly questions: ReadonlyArray<{ readonly id: string; readonly prompt: string; readonly options: readonly Option[]; readonly multi?: boolean }> }
  | { readonly kind: "strategy"; readonly heading: string; readonly body: string; readonly strategies: readonly Strategy[] }
  | { readonly kind: "reflect"; readonly prompts: readonly string[]; readonly suggestions: readonly string[] }
  | { readonly kind: "insight"; readonly id: string; readonly heading: string; readonly body: string; readonly byAnswer?: { readonly question: string; readonly map: Readonly<Record<string, string>> } }
  | { readonly kind: "next"; readonly heading: string; readonly body: string; readonly action: "try" | "learn" | "deeper" | "support"; readonly moduleId?: string }
  | { readonly kind: "perspective"; readonly heading: string; readonly body: string; readonly sides: readonly [PerspectiveSide, PerspectiveSide]; readonly teaching: string }
  | { readonly kind: "simulation"; readonly sim: "working-memory" | "interruption" | "ambiguity" };

export interface PerspectiveSide {
  readonly who: Character;
  readonly mood: Mood;
  readonly label: string;
  readonly thought: string;
}

export interface InteractiveModule {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly minutes: number;
  readonly domain: Domain;
  /** The subdomains this module teaches and its resonance is about. Drives the care map and needs. */
  readonly targets: readonly Subdomain[];
  /** A strength the module names — what is working, not only what is not. */
  readonly strength: string;
  readonly characters: readonly Character[];
  readonly steps: readonly Step[];
  /** Professions typically useful when this module's problem persists after self-guided attempts (PRD §38). */
  readonly professions: readonly Profession[];
}

export const RESONANCE_HEADING = "Does this happen to you?";

const resonance = (heading: string = RESONANCE_HEADING): Step => ({ kind: "resonance", heading });

export const INTERACTIVE_MODULES: readonly InteractiveModule[] = [
  // ── Understand ADHD ─────────────────────────────────────────────────────────────────────────
  {
    id: "context",
    title: "Why ADHD can look completely different depending on the situation",
    subtitle: "Same person, five scenes, one question",
    minutes: 8,
    domain: "understand",
    targets: ["attention", "activation", "structure"],
    strength: "Sustained engagement when the task is concrete, interesting or due",
    characters: ["alex"],
    professions: ["gp", "occupational-therapist", "adhd-coach"],
    steps: [
      { kind: "scene", stage: "hook", who: "alex", mood: "engaged", prop: "lecture", eyebrow: "Tuesday, 10am", heading: "Alex is completely there.", body: "A class discussion on something Alex actually cares about. Hand up, arguing a point, quoting a reading from memory. Nobody in the room would call this person inattentive." },
      { kind: "scene", stage: "experience", who: "alex", mood: "anxious", prop: "desk", eyebrow: "Tuesday, 8pm", heading: "The assignment is due in three weeks.", body: "Same brain, same day. The document is open. The cursor blinks. Alex reads the question four times and opens a tab about something else entirely. Nothing starts." },
      { kind: "scene", stage: "experience", who: "alex", mood: "surprised", prop: "phone", eyebrow: "Wednesday, 11pm", heading: "“It’s due tomorrow.”", body: "A group-chat message. Alex checks the date. Something switches on. Six hours of intense, clear, almost pleasant work — the essay is written by dawn." },
      { kind: "scene", stage: "experience", who: "alex", mood: "embarrassed", prop: "bill", eyebrow: "Thursday", heading: "The electricity bill was due last week.", body: "It was in the letterbox for a fortnight. Alex saw it, meant to pay it, and it slid out of view. The reminder arrives with a late fee." },
      { kind: "scene", stage: "experience", who: "alex", mood: "pleased", prop: "ball", eyebrow: "Thursday evening", heading: "Ninety minutes of complete focus.", body: "Weekly sport. Alex tracks the ball, reads the play, stays with it for an hour and a half without once drifting. Then goes home and cannot start the dishes." },
      { kind: "choice", who: "alex", mood: "thinking", prop: "none", heading: "How can all of these be the same person?", options: [
        { id: "inconsistent", label: "ADHD is inconsistent", response: "It looks inconsistent from the outside. From the inside it is very consistent: the same brain responding the same way to different conditions." },
        { id: "motivation", label: "Motivation changes", response: "Partly. But Alex wanted to write the essay on Tuesday too. What changed on Wednesday was not the wanting — it was the deadline." },
        { id: "environment", label: "Different environments demand different things", response: "Yes. The class and the sport supplied interest, structure and immediacy. The essay and the bill supplied none of them." },
        { id: "unsure", label: "Not sure", response: "Fair. The next screen is the whole answer, and it is shorter than you would think." },
      ] },
      resonance(),
      { kind: "explain", eyebrow: "The idea", heading: "ADHD is not a fixed amount of attention.", body: "How hard something is can depend on the structure of the task, how soon it is due, how interesting it is, what the environment demands, and who is around. Change the conditions and the same person performs differently — not because they tried harder, but because the situation changed.", detail: ["Interest and immediacy switch attention on", "Vague, far-off tasks switch it off", "Structure and company can stand in for both"] },
      { kind: "personalise", questions: [
        { id: "where", prompt: "Where does the difference show up most for you?", options: [{ id: "work", label: "Work" }, { id: "study", label: "Study" }, { id: "home", label: "Home and admin" }, { id: "relationships", label: "With people" }] },
        { id: "switch", prompt: "What most reliably switches you on?", options: [{ id: "deadline", label: "A deadline that is close" }, { id: "interest", label: "Being interested" }, { id: "company", label: "Somebody working beside me" }, { id: "clear", label: "A very clear task" }], multi: true },
      ] },
      { kind: "strategy", heading: "Borrow the conditions that work.", body: "You cannot make yourself more interested in a bill. You can make a task look more like the situations you already perform in.", strategies: [
        { id: "conditions-map", title: "Name your conditions", acts: "environment", steps: ["Before opening email tomorrow, write down the last time you were completely absorbed", "Write what that situation had: a deadline, a person, a clear goal, interest", "Add one of those to the first task of the day"] },
      ] },
      { kind: "insight", id: "context-conditions", heading: "Your brain works well under some conditions and life asks more of it under others.", body: "That is not a character flaw and it is not laziness. It is a pattern — and patterns can be designed around.", byAnswer: { question: "switch", map: { deadline: "For you, a close deadline seems to be the strongest switch.", interest: "For you, interest seems to be the strongest switch.", company: "For you, working beside somebody seems to be the strongest switch.", clear: "For you, a very clear task seems to be the strongest switch." } } },
      { kind: "next", heading: "Let’s find out where your brain works well, and where life asks more of it.", body: "The next module looks at the moment most people find hardest: starting.", action: "learn", moduleId: "starting" },
    ],
  },
  {
    id: "more-than-attention",
    title: "ADHD is more than attention",
    subtitle: "Time, emotion, memory and starting — the parts the name leaves out",
    minutes: 7,
    domain: "understand",
    targets: ["attention", "time", "emotional-regulation", "memory"],
    strength: "Noticing more than most people do, when the thing is in view",
    characters: ["maya"],
    professions: ["gp", "psychologist"],
    steps: [
      { kind: "scene", stage: "hook", who: "maya", mood: "frustrated", prop: "desk", eyebrow: "A performance review", heading: "“You just need to focus more.”", body: "Maya’s manager means well. But Maya focused for nine hours yesterday. The report was late because she forgot the brief existed, misjudged how long the data would take, and then could not face opening it after a sharp email." },
      { kind: "choice", who: "maya", mood: "thinking", prop: "desk", heading: "Which of those was an attention problem?", options: [
        { id: "forgot", label: "Forgetting the brief", response: "That is working memory — holding something in mind while doing other things. Attention was on the other things." },
        { id: "time", label: "Misjudging the time", response: "That is time sense. People with ADHD often feel two settings: now, and not now." },
        { id: "email", label: "Not opening it after the email", response: "That is emotion. A sting arrives fast and takes a long time to settle, and the task gets tangled with it." },
        { id: "none", label: "None of them, really", response: "Right. Three different things, none of them ‘focus’, all of them ADHD." },
      ] },
      resonance(),
      { kind: "explain", eyebrow: "The idea", heading: "Attention is the headline. It is not the story.", body: "ADHD affects a set of brain functions that manage everything else: starting, holding things in mind, sensing time, switching, and settling emotion. Most of what makes life hard is one of those, wearing attention’s name.", detail: ["Starting — knowing what to do and not being able to begin", "Working memory — the brief that vanished", "Time — everything is now or not now", "Emotion — fast in, slow out"] },
      { kind: "personalise", questions: [
        { id: "hardest-part", prompt: "Which of these costs you most?", options: [{ id: "starting", label: "Starting" }, { id: "memory", label: "Remembering" }, { id: "time", label: "Time" }, { id: "emotion", label: "Emotion" }] },
        { id: "noticed", prompt: "Has anyone put it down to effort or attitude?", options: [{ id: "often", label: "Often" }, { id: "sometimes", label: "Sometimes" }, { id: "no", label: "Not really" }] },
      ] },
      { kind: "strategy", heading: "Name the actual function.", body: "The next time something goes wrong, say which of the four it was. It changes what you try next — you cannot ‘focus harder’ on a memory problem.", strategies: [
        { id: "name-the-function", title: "Name it, once a day", acts: "brain", steps: ["At the end of tomorrow, pick one thing that went sideways", "Ask: was that starting, memory, time or emotion?", "Write the one word down"] },
      ] },
      { kind: "insight", id: "more-than-attention-function", heading: "Most of what is hard for you is probably not attention.", body: "It is one of the functions underneath — and each one has its own set of things worth trying.", byAnswer: { question: "hardest-part", map: { starting: "You said starting costs you most. The starting modules are where to go next.", memory: "You said remembering costs you most. The working-memory module is where to go next.", time: "You said time costs you most. The deadline module is where to go next.", emotion: "You said emotion costs you most. That is worth taking further than a module." } } },
      { kind: "next", heading: "Go to the part that costs you most.", body: "Each function has its own module. Starting is the one most people begin with.", action: "learn", moduleId: "starting" },
    ],
  },
  {
    id: "starting",
    title: "Why starting can be harder than doing",
    subtitle: "Knowing what to do, and not being able to begin",
    minutes: 8,
    domain: "understand",
    targets: ["activation"],
    strength: "Once started, work often goes well",
    characters: ["maya"],
    professions: ["occupational-therapist", "adhd-coach", "psychologist"],
    steps: [
      { kind: "scene", stage: "hook", who: "maya", mood: "anxious", prop: "desk", eyebrow: "9:04am", heading: "Maya knows exactly what to do.", body: "Write the summary. She has the notes, the template and forty minutes. She makes a coffee, answers two messages, checks the weather, and it is 9:40 and the document is still blank." },
      { kind: "choice", who: "maya", mood: "thinking", prop: "desk", heading: "What would help most right now?", options: [
        { id: "try-harder", label: "Just try harder", response: "Maya has been trying for forty minutes. Effort is not the missing ingredient." },
        { id: "first-action", label: "Write the first sentence, badly", response: "Yes. The barrier is the start, not the work. A bad first sentence is a door." },
        { id: "later", label: "Do it later when she feels ready", response: "Later will feel the same — unless something changes, like a deadline or a person." },
        { id: "someone", label: "Sit next to somebody", response: "Often works. Company lowers the threshold in a way willpower does not." },
      ] },
      resonance(),
      { kind: "explain", eyebrow: "The idea", heading: "Starting is its own function.", body: "Doing a task and beginning a task use different machinery. Beginning needs a push — interest, urgency, novelty, or a person — and ADHD brains need more push than most. The gap between knowing and starting is not a knowledge problem, so more knowing does not close it.", detail: ["The threshold is highest for vague, large, far-off tasks", "It drops when the first action is physical and small", "It drops again when somebody else is in the room"] },
      { kind: "personalise", questions: [
        { id: "hardest-to-start", prompt: "What kind of task is hardest to start?", options: [{ id: "vague", label: "Vague ones" }, { id: "big", label: "Big ones" }, { id: "boring", label: "Boring ones" }, { id: "judged", label: "Ones somebody will judge" }], multi: true },
        { id: "what-helps-start", prompt: "What has ever helped you start?", options: [{ id: "deadline", label: "A deadline" }, { id: "person", label: "Another person" }, { id: "small", label: "Making it tiny" }, { id: "nothing", label: "Nothing reliably" }], multi: true },
      ] },
      { kind: "strategy", heading: "Make the first action physical.", body: "Not ‘write the report’. ‘Open the file and type the title.’ The goal is to cross the threshold, not to do the work — the work tends to follow.", strategies: [
        { id: "first-physical-action", title: "The first physical action", acts: "brain", steps: ["Before opening email tomorrow, pick one important task", "Write the first physical action — something your hands do in under a minute", "Do only that action. Stopping there is allowed"] },
        { id: "body-double", title: "Start beside somebody", acts: "people", steps: ["Choose one task you have been avoiding", "Ask a friend, flatmate or colleague to sit and work near you for twenty minutes", "Begin while they are there"] },
      ] },
      { kind: "reflect", prompts: ["When did this last happen?", "What would have made starting 20% easier?"], suggestions: ["A clearer first step", "Somebody beside me", "A closer deadline", "Less at stake"] },
      { kind: "insight", id: "starting-threshold", heading: "Your difficulty is at the threshold, not in the work.", body: "That is why advice about effort has never fitted. The things that help are the ones that lower the threshold.", byAnswer: { question: "hardest-to-start", map: { vague: "Vague tasks seem to be your highest threshold — ambiguity is the next module.", big: "Big tasks seem to be your highest threshold — the first physical action is built for that.", boring: "Boring tasks seem to be your highest threshold — company and deadlines help most there.", judged: "Tasks somebody will judge seem hardest — the perfectionism module is worth a look." } } },
      { kind: "next", heading: "Try the first physical action tomorrow.", body: "One task, one action, then we will ask whether it helped.", action: "try" },
    ],
  },
  {
    id: "deadlines",
    title: "Deadline activation",
    subtitle: "Why the night before works and three weeks out does not",
    minutes: 7,
    domain: "understand",
    targets: ["time", "deadline-design"],
    strength: "Fast, high-quality output under a close deadline",
    characters: ["alex"],
    professions: ["adhd-coach", "occupational-therapist"],
    steps: [
      { kind: "scene", stage: "hook", who: "alex", mood: "neutral", prop: "calendar", eyebrow: "Three weeks out", heading: "The deadline is a rumour.", body: "Alex writes it in the calendar and feels nothing. It is not real yet. Real is the thing due Friday, and the thing due Friday is a quiz worth two percent." },
      { kind: "scene", stage: "experience", who: "alex", mood: "engaged", prop: "desk", eyebrow: "The night before", heading: "Now it is real.", body: "Nine pm. The essay that would not start for three weeks pours out in one sitting. The work is good. The cost is a sleepless night, a missed shift, and the certainty that next time will be the same." },
      { kind: "choice", who: "alex", mood: "thinking", prop: "calendar", heading: "What made the difference?", options: [
        { id: "pressure", label: "Pressure", response: "Close: the deadline became near enough to feel. Time sense in ADHD tends to have two settings — now, and not now." },
        { id: "caring", label: "Alex started caring", response: "Alex cared three weeks ago. The caring did not change; the distance did." },
        { id: "fear", label: "Fear of failing", response: "Some of it. But fear three weeks out did nothing. It only worked when the deadline entered ‘now’." },
      ] },
      resonance(),
      { kind: "explain", eyebrow: "The idea", heading: "Far-off deadlines do not register as real.", body: "Many people with ADHD experience time as now and not-now. A deadline in not-now cannot supply activation, no matter how much it matters. When it crosses into now, everything switches on at once — which is why the work is often good and the cost is often high.", detail: ["This is time sense, not attitude", "The switch is real and can be used deliberately", "Artificial milestones bring ‘now’ forward"] },
      { kind: "personalise", questions: [
        { id: "horizon", prompt: "How close does a deadline need to be before it feels real?", options: [{ id: "day", label: "The day before" }, { id: "days", label: "A few days" }, { id: "week", label: "About a week" }, { id: "varies", label: "It varies" }] },
        { id: "cost", prompt: "What does the last-minute version usually cost?", options: [{ id: "sleep", label: "Sleep" }, { id: "quality", label: "Quality" }, { id: "other-things", label: "Other commitments" }, { id: "stress", label: "A lot of stress" }], multi: true },
      ] },
      { kind: "strategy", heading: "Build artificial milestones.", body: "If ‘now’ is a day wide, make a deadline every day. Not the whole thing — a piece somebody else is waiting for.", strategies: [
        { id: "artificial-milestones", title: "One milestone somebody else is waiting for", acts: "environment", steps: ["Pick the next far-off deadline", "Choose one small piece due in two days — a plan, a draft paragraph, a list of sources", "Tell one person you will send it to them, and send it"] },
      ] },
      { kind: "insight", id: "deadlines-horizon", heading: "Urgency helps you activate.", body: "That is a real strength and a real cost. Milestones let you keep the strength and shrink the cost.", byAnswer: { question: "horizon", map: { day: "Your ‘now’ seems to be about a day wide — milestones need to be daily.", days: "Your ‘now’ seems to be a few days wide — a milestone every few days should register.", week: "Your ‘now’ seems to be about a week wide — weekly milestones are worth trying first.", varies: "Your ‘now’ varies — start with a two-day milestone and adjust." } } },
      { kind: "next", heading: "Set one milestone this week.", body: "Two days out, one piece, one person waiting.", action: "try" },
    ],
  },
  {
    id: "working-memory",
    title: "Working memory",
    subtitle: "Why four instructions become two, and what to do about it",
    minutes: 8,
    domain: "understand",
    targets: ["memory"],
    strength: "Strong recall for things that are interesting or written down",
    characters: ["jordan"],
    professions: ["occupational-therapist", "adhd-coach"],
    steps: [
      { kind: "scene", stage: "hook", who: "jordan", mood: "neutral", prop: "kitchen", eyebrow: "Saturday morning", heading: "“Can you grab four things on the way?”", body: "Milk, the parcel, stamps, and Sam’s prescription. Jordan says yes, means yes, and walks out the door holding all four in mind. A phone buzzes on the way." },
      { kind: "simulation", sim: "working-memory" },
      resonance("Does this happen to you — things falling out of your head after an interruption?"),
      { kind: "explain", eyebrow: "The idea", heading: "Working memory is a small table.", body: "It holds a few things at once while you use them. In ADHD the table is smaller and easier to knock. An interruption does not just pause the list — it clears part of it, and you may not notice which part until later. Forgetting is not the same as not caring.", detail: ["The table is smallest under stress and after poor sleep", "Writing something down moves it off the table", "So does saying it to somebody"] },
      { kind: "personalise", questions: [
        { id: "knocks", prompt: "What most often knocks things off the table?", options: [{ id: "phone", label: "My phone" }, { id: "people", label: "People talking to me" }, { id: "own-thoughts", label: "My own thoughts" }, { id: "tired", label: "Being tired" }], multi: true },
        { id: "capture", prompt: "Do you have anywhere you reliably write things down?", options: [{ id: "yes", label: "Yes, one place" }, { id: "several", label: "Several places" }, { id: "no", label: "Not really" }] },
      ] },
      { kind: "strategy", heading: "Put memory outside your head.", body: "The strategy is not to remember better. It is to stop needing to.", strategies: [
        { id: "one-capture-place", title: "One capture place", acts: "environment", steps: ["Choose one place — a notes app, a card in your pocket, a whiteboard by the door", "Tomorrow, every time somebody asks you to do something, write it there before you say yes", "Read it once before you leave the house"] },
      ] },
      { kind: "insight", id: "working-memory-table", heading: "Forgetting is not the same as not caring.", body: "Your table is small and easily knocked. The fix is a bigger table — outside your head.", byAnswer: { question: "capture", map: { yes: "You already have one capture place. Using it before saying yes is the next step.", several: "Several places is nearly none: things fall between them. One is the change.", no: "You have no capture place yet, which means every request is held in your head. Start with one." } } },
      { kind: "next", heading: "Try one capture place tomorrow.", body: "Every request goes there before you say yes.", action: "try" },
    ],
  },
  {
    id: "hyperfocus",
    title: "Hyperfocus",
    subtitle: "The hours that vanish, and how to aim them",
    minutes: 6,
    domain: "understand",
    targets: ["attention", "time"],
    strength: "Deep, sustained absorption when interest catches",
    characters: ["priya"],
    professions: ["adhd-coach", "psychologist"],
    steps: [
      { kind: "scene", stage: "hook", who: "priya", mood: "engaged", prop: "desk", eyebrow: "Sunday, 2pm", heading: "Priya sits down to fix one spreadsheet formula.", body: "At 9pm she looks up. The spreadsheet is magnificent. She has not eaten, missed a call from her mother, and the report she sat down to write is untouched." },
      { kind: "choice", who: "priya", mood: "thinking", prop: "desk", heading: "Is hyperfocus a strength or a problem?", options: [
        { id: "strength", label: "A strength", response: "It can be. Seven hours of deep work is something many people never get. The question is what it landed on." },
        { id: "problem", label: "A problem", response: "It can be. The report, the meal and the call were the cost. The focus itself was not the problem — its aim was." },
        { id: "both", label: "Both", response: "That is the honest answer. It is a strength with poor steering." },
      ] },
      resonance(),
      { kind: "explain", eyebrow: "The idea", heading: "ADHD attention is not weak. It is hard to steer.", body: "When interest catches, attention can lock on for hours and time disappears. That is the same mechanism that makes boring tasks impossible — it goes where the pull is strongest, not where you point it. The skill is not to stop hyperfocus but to choose its target and set its edges." },
      { kind: "personalise", questions: [
        { id: "lands-on", prompt: "What does your hyperfocus usually land on?", options: [{ id: "work", label: "The right work" }, { id: "side", label: "A side task" }, { id: "hobby", label: "A hobby or game" }, { id: "research", label: "Researching something" }], multi: true },
        { id: "cost", prompt: "What does it usually cost?", options: [{ id: "meals", label: "Meals" }, { id: "sleep", label: "Sleep" }, { id: "people", label: "People waiting on me" }, { id: "the-real-task", label: "The task I meant to do" }], multi: true },
      ] },
      { kind: "strategy", heading: "Set an edge before you start.", body: "Hyperfocus has no internal clock. Give it an external one.", strategies: [
        { id: "external-edge", title: "An alarm and a visible next thing", acts: "environment", steps: ["Before a task that might swallow you, set an alarm for the time you must stop", "Write the next thing you need to do on a note beside you", "When the alarm goes, stand up before you decide anything"] },
      ] },
      { kind: "insight", id: "hyperfocus-steering", heading: "You have deep focus. It needs steering, not fixing.", body: "Aim it with a clear target and an external edge, and the seven hours become yours.", byAnswer: { question: "lands-on", map: { work: "It often lands on the right work — the edge is what keeps the cost down.", side: "It often lands on a side task — a visible target beside you is the first thing to try.", hobby: "It often lands on a hobby — that is not a failing; it is where the pull is. An edge protects the rest of the day.", research: "It often lands on research — set the question before you start, and the edge after." } } },
      { kind: "next", heading: "Set one edge this week.", body: "An alarm and a note, before the next task that might swallow you.", action: "try" },
    ],
  },
  // ── Work & Study ───────────────────────────────────────────────────────────────────────────
  {
    id: "ambiguity",
    title: "Ambiguous work",
    subtitle: "“Improve the presentation” versus “write the title slide”",
    minutes: 7,
    domain: "work-study",
    targets: ["activation", "workplace-context"],
    strength: "Good work once the problem becomes concrete",
    characters: ["maya"],
    professions: ["occupational-therapist", "adhd-coach"],
    steps: [
      { kind: "scene", stage: "hook", who: "maya", mood: "overwhelmed", prop: "desk", eyebrow: "A message from the manager", heading: "“Can you improve the presentation before Thursday?”", body: "Improve how? Which part? To what standard? Maya opens it, scrolls, closes it. Every slide could be better, so none of them gets touched." },
      { kind: "simulation", sim: "ambiguity" },
      resonance("Does this happen to you — vague tasks staying untouched while clear ones get done?"),
      { kind: "explain", eyebrow: "The idea", heading: "Ambiguity raises the threshold.", body: "A task with no clear first step has to be designed before it can be started, and designing it is a second task nobody assigned. ADHD brains stall at exactly that step. The work is not too hard. It is too undefined.", detail: ["The fix is upstream: define, then start", "A question to the person who set the task is not weakness", "‘Done’ needs a shape before you begin"] },
      { kind: "personalise", questions: [
        { id: "source", prompt: "Where do your vaguest tasks come from?", options: [{ id: "manager", label: "A manager" }, { id: "self", label: "Myself" }, { id: "course", label: "A course or lecturer" }, { id: "clients", label: "Clients or customers" }], multi: true },
        { id: "asks", prompt: "Do you ask what ‘done’ looks like?", options: [{ id: "usually", label: "Usually" }, { id: "sometimes", label: "Sometimes" }, { id: "rarely", label: "Rarely — I should know" }] },
      ] },
      { kind: "strategy", heading: "Turn ‘improve’ into three sentences.", body: "Before starting a vague task, answer: what would make this done, which part first, and what is the first physical action.", strategies: [
        { id: "define-done", title: "Ask what done looks like", acts: "people", steps: ["Take the vaguest task on your list", "Send one message to whoever set it: “What would make this done for you?”", "Write their answer at the top of the document before you start"] },
      ] },
      { kind: "insight", id: "ambiguity-threshold", heading: "Starting ambiguous tasks is your biggest friction.", body: "That is specific, and specific things can be changed — by you, and by the people who set your work.", byAnswer: { question: "source", map: { manager: "Most of it comes from a manager, which means one conversation about how tasks arrive could change a lot.", self: "Most of it comes from you, which means defining ‘done’ is a habit you can build alone.", course: "Most of it comes from a course — assignment briefs are the place to ask.", clients: "Most of it comes from clients — a short brief template does the asking for you." } } },
      { kind: "next", heading: "Ask one person what done looks like.", body: "One message, tomorrow, about the vaguest thing on your list.", action: "try" },
    ],
  },
  {
    id: "interruption",
    title: "Interruption and context switching",
    subtitle: "Getting back to the thing you were doing",
    minutes: 7,
    domain: "work-study",
    targets: ["switching", "noise"],
    strength: "Responsive to people and quick to engage with the new thing",
    characters: ["maya"],
    professions: ["occupational-therapist", "adhd-coach"],
    steps: [
      { kind: "scene", stage: "hook", who: "maya", mood: "engaged", prop: "desk", eyebrow: "2:15pm", heading: "Maya is finally inside the report.", body: "Twenty minutes of real work. Then a message: “Quick one — can you check this?” It takes three minutes. Getting back into the report takes forty, and she never quite does." },
      { kind: "simulation", sim: "interruption" },
      resonance("Does this happen to you — small interruptions costing far more than their size?"),
      { kind: "explain", eyebrow: "The idea", heading: "The cost is not the interruption. It is the return.", body: "Switching tasks means rebuilding the whole picture in working memory — where you were, what came next, why. For many people with ADHD that rebuild is slow and fragile, so a three-minute question costs half an hour. Fewer interruptions help. A faster way back helps more.", detail: ["Leave a breadcrumb before you switch", "Batch the small things", "Protect one block a day"] },
      { kind: "personalise", questions: [
        { id: "source", prompt: "What interrupts you most?", options: [{ id: "messages", label: "Messages" }, { id: "people", label: "People at the desk" }, { id: "own", label: "My own thoughts" }, { id: "noise", label: "Noise around me" }], multi: true },
        { id: "return", prompt: "How long does it take to get back in?", options: [{ id: "minutes", label: "A few minutes" }, { id: "long", label: "Much longer than it should" }, { id: "never", label: "Often I do not" }] },
      ] },
      { kind: "strategy", heading: "Leave a breadcrumb.", body: "Before you answer the interruption, write one line: what you were doing and the very next step. Future you reads it and is back in seconds.", strategies: [
        { id: "breadcrumb", title: "The breadcrumb line", acts: "brain", steps: ["Keep a note open beside your work tomorrow", "When anything interrupts, write one line first: where you are and what is next", "Read the line before you touch anything else"] },
        { id: "protected-block", title: "One protected block", acts: "environment", steps: ["Choose one hour tomorrow", "Tell the people who usually interrupt that you are unreachable for it", "Put the phone in another room for the hour"] },
      ] },
      { kind: "insight", id: "interruption-return", heading: "The return is what costs you, not the interruption.", body: "Which means the fix is a faster way back, not a quieter world.", byAnswer: { question: "return", map: { minutes: "You get back in a few minutes — a breadcrumb will make that near-instant.", long: "The return takes much longer than it should — the breadcrumb is built for that.", never: "Often you do not get back at all, which means the protected block matters as much as the breadcrumb." } } },
      { kind: "next", heading: "Try the breadcrumb line tomorrow.", body: "One line, every interruption.", action: "try" },
    ],
  },
  {
    id: "perfectionism",
    title: "Perfectionism and starting",
    subtitle: "Delaying because it has to be good",
    minutes: 8,
    domain: "work-study",
    targets: ["activation", "emotional-regulation"],
    strength: "High standards and real care about the work",
    characters: ["priya"],
    professions: ["psychologist", "adhd-coach"],
    steps: [
      { kind: "scene", stage: "hook", who: "priya", mood: "anxious", prop: "desk", eyebrow: "Two weeks to go", heading: "Priya cannot start the report because it has to be excellent.", body: "She knows what excellent looks like. Anything less feels like evidence. So she reads more, plans more, and the blank page stays blank until the deadline makes ‘excellent’ impossible — which is, strangely, when she can begin." },
      { kind: "choice", who: "priya", mood: "thinking", prop: "desk", heading: "Why does the deadline make it possible?", options: [
        { id: "pressure", label: "Pressure makes her focus", response: "Partly. But something else shifted: when excellent is off the table, the standard drops to ‘done’, and ‘done’ can be started." },
        { id: "permission", label: "It gives her permission to do it badly", response: "Yes. The deadline lowers the bar the perfectionism raised. Nothing else had permission to." },
        { id: "unsure", label: "Not sure", response: "The next screen is the answer: the standard was the barrier." },
      ] },
      resonance(),
      { kind: "explain", eyebrow: "The idea", heading: "A high standard at the start is a wall.", body: "Perfectionism often grows around ADHD as a way of coping with years of things going wrong. It works — until the standard for starting becomes so high that nothing starts. The standard belongs at the end, on the edit. The start needs permission to be rough.", detail: ["First drafts are allowed to be bad", "Editing is where the standard lives", "Uncertainty about the expected standard makes this worse"] },
      { kind: "personalise", questions: [
        { id: "standard", prompt: "Do you usually know what standard is expected?", options: [{ id: "yes", label: "Yes" }, { id: "guess", label: "I guess, and aim high" }, { id: "no", label: "Rarely" }] },
        { id: "worse", prompt: "What makes it worse?", options: [{ id: "judged", label: "Being judged" }, { id: "past", label: "Past criticism" }, { id: "comparison", label: "Comparing myself" }, { id: "stakes", label: "High stakes" }], multi: true },
      ] },
      { kind: "strategy", heading: "Write the bad version on purpose.", body: "Set a timer for ten minutes and produce the worst possible draft. It is not the work. It is the door.", strategies: [
        { id: "bad-first-draft", title: "The deliberately bad draft", acts: "brain", steps: ["Pick the task you are avoiding because it has to be good", "Set ten minutes and write the worst version you can — no editing allowed", "Stop when the timer goes, whatever state it is in"] },
        { id: "ask-the-standard", title: "Ask the standard", acts: "people", steps: ["Find the person who will read the work", "Ask: “How polished does this need to be?”", "Write the answer at the top of the page"] },
      ] },
      { kind: "reflect", prompts: ["When did this last stop you starting?", "What would have made it 20% easier?"], suggestions: ["Knowing the standard", "Permission to be rough", "Less riding on it", "Somebody saying it was fine"] },
      { kind: "insight", id: "perfectionism-start", heading: "A perfectionistic starting threshold may be part of the picture.", body: "That is worth exploring — it is common, it is understandable, and it responds to being named.", byAnswer: { question: "standard", map: { yes: "You usually know the standard, so the deliberately bad draft is the thing to try.", guess: "You guess and aim high, which means asking the standard could remove half the wall.", no: "You rarely know the standard — uncertainty about it may be doing most of the work here." } } },
      { kind: "next", heading: "This one is worth taking further.", body: "If it keeps happening, a psychologist who works with perfectionism is a reasonable person to talk to.", action: "support" },
    ],
  },
  // ── Relationships ───────────────────────────────────────────────────────────────────────────
  {
    id: "not-listening",
    title: "“You’re not listening”",
    subtitle: "Two people, one conversation, two experiences",
    minutes: 8,
    domain: "relationships",
    targets: ["attention", "partner"],
    strength: "Genuine care, and real presence when attention catches",
    characters: ["jordan", "sam"],
    professions: ["counsellor", "psychologist"],
    steps: [
      { kind: "scene", stage: "hook", who: "sam", mood: "frustrated", prop: "kitchen", eyebrow: "Tuesday evening", heading: "“I told you this yesterday.”", body: "Sam is explaining the plan for the weekend. Jordan is nodding. Jordan’s attention has gone to the window, come back, gone to a thought about work, come back. Half of it landed." },
      { kind: "perspective", heading: "Tap each of them.", body: "Both experiences are real.", sides: [
        { who: "jordan", mood: "embarrassed", label: "Jordan", thought: "I really thought I was listening. I heard the start. Then something pulled and I was back before I noticed I had gone. I care about this — that is what makes it worse." },
        { who: "sam", mood: "frustrated", label: "Sam", thought: "I told them yesterday. I am telling them again. If it mattered, they would remember it. Why does everything I say slide off?" },
      ], teaching: "Two experiences can both be genuine. Jordan’s attention drifted without consent; Sam read the drift as not caring. Neither is lying, and neither is wrong about how it felt." },
      resonance("Does this happen in your relationships?"),
      { kind: "explain", eyebrow: "The idea", heading: "Attention drift reads as indifference.", body: "From the outside, an attention lapse and a lack of care look identical. From the inside they are nothing alike. Most conflict in ADHD relationships starts in that gap — and it closes faster when both people can name it.", detail: ["Drift is involuntary; it is not a verdict on the speaker", "Repeating something calmly works better than repeating it louder", "Writing it down is not an insult to either person"] },
      { kind: "personalise", questions: [
        { id: "who", prompt: "Who most often feels unheard?", options: [{ id: "partner", label: "A partner" }, { id: "family", label: "Family" }, { id: "friends", label: "Friends" }, { id: "me", label: "Me — I feel unheard too" }], multi: true },
        { id: "when", prompt: "When does the drift happen most?", options: [{ id: "tired", label: "When I am tired" }, { id: "busy", label: "When something else is on my mind" }, { id: "long", label: "During long explanations" }, { id: "phone", label: "When a phone is near" }], multi: true },
      ] },
      { kind: "strategy", heading: "Make the drift visible instead of hidden.", body: "Say it when you notice it: “I lost that last bit — can you say it again?” It feels exposing. It is far less costly than nodding.", strategies: [
        { id: "name-the-drift", title: "Name the drift out loud", acts: "people", steps: ["Tell one person close to you that your attention sometimes drifts without you choosing it", "Agree on a phrase you can use when it happens: “Lost you — again please?”", "Use it once this week"] },
      ] },
      { kind: "insight", id: "not-listening-drift", heading: "The drift is real, and so is how it lands.", body: "Naming it turns a recurring argument into a shared problem.", byAnswer: { question: "who", map: { partner: "It is mostly your partner who feels unheard — this module is one worth sharing with them.", family: "It is mostly family — the pattern is often oldest there, and naming it can still change it.", friends: "It is mostly friends — the drift phrase works there too.", me: "You feel unheard as well — that is worth saying in the same conversation." } } },
      { kind: "next", heading: "Agree on the phrase this week.", body: "One person, one phrase, one use.", action: "try" },
    ],
  },
  {
    id: "forgotten-commitments",
    title: "Forgotten commitments",
    subtitle: "Why remembering isn’t the same as caring",
    minutes: 7,
    domain: "relationships",
    targets: ["memory", "partner"],
    strength: "Willing, generous, and quick to say yes",
    characters: ["jordan", "sam"],
    professions: ["counsellor", "occupational-therapist"],
    steps: [
      { kind: "scene", stage: "hook", who: "sam", mood: "frustrated", prop: "door", eyebrow: "Friday, 6pm", heading: "“You said you’d book it.”", body: "Jordan said yes on Monday. Meant it. The restaurant is full. Sam has stopped asking whether Jordan remembers and started assuming they do not." },
      { kind: "perspective", heading: "Tap each of them.", body: "Same week, two versions.", sides: [
        { who: "jordan", mood: "embarrassed", label: "Jordan", thought: "I said yes and I meant it. Then it just — wasn’t there. I did not decide not to do it. I would have done it in a second if it had come back to me." },
        { who: "sam", mood: "frustrated", label: "Sam", thought: "I have to hold everything. If I do not follow up, it does not happen. It feels like I am the only one keeping this going." },
      ], teaching: "A commitment that vanishes from working memory was never declined — but the person carrying the follow-up cannot tell the difference. Both are tired of it." },
      resonance("Does this happen to you — commitments you meant, disappearing?"),
      { kind: "explain", eyebrow: "The idea", heading: "Remembering is not the same as caring.", body: "A promise made in conversation is stored in the smallest, most fragile memory there is. It falls out. When it does, the person waiting reads the gap as indifference, and the person who forgot reads the accusation as unfair. Both are right about their half.", detail: ["Verbal commitments are the ones most often lost", "The fix is capture, not effort", "Sharing the system beats policing it"] },
      { kind: "personalise", questions: [
        { id: "kind", prompt: "What kind of commitment slips most?", options: [{ id: "bookings", label: "Bookings and errands" }, { id: "dates", label: "Dates and events" }, { id: "chores", label: "Household jobs" }, { id: "calls", label: "Calling somebody back" }], multi: true },
        { id: "carries", prompt: "Who ends up carrying the follow-up?", options: [{ id: "partner", label: "A partner" }, { id: "family", label: "Family" }, { id: "me", label: "Me, eventually" }, { id: "nobody", label: "Nobody — it drops" }] },
      ] },
      { kind: "strategy", heading: "Put the promise somewhere both of you can see.", body: "A shared calendar or list is not a sign of distrust. It is the table your working memory does not have.", strategies: [
        { id: "shared-calendar", title: "One shared list", acts: "people", steps: ["Set up one shared list or calendar with the person who carries the follow-up", "Agree that a commitment is not made until it is written there", "Add the next one, in front of them, this week"] },
      ] },
      { kind: "insight", id: "forgotten-commitments-capture", heading: "Somebody close to you may be carrying the organising load.", body: "A shared system moves it from their head to the list — which is where it belongs.", byAnswer: { question: "carries", map: { partner: "Your partner carries the follow-up. A shared list is as much for them as for you.", family: "Family carries the follow-up — the shared list works there too.", me: "You carry it eventually, which means the cost is the lateness; capture removes it.", nobody: "It drops. A shared list is the first thing to try." } } },
      { kind: "next", heading: "Set up the shared list this week.", body: "With the person who carries the follow-up.", action: "try" },
    ],
  },
  {
    id: "conflict",
    title: "Conflict escalation",
    subtitle: "Fast in, slow out — and what to do in the middle",
    minutes: 8,
    domain: "relationships",
    targets: ["emotional-regulation", "partner"],
    strength: "Feelings that are honest and quick to repair once settled",
    characters: ["jordan", "sam"],
    professions: ["psychologist", "counsellor"],
    steps: [
      { kind: "scene", stage: "hook", who: "jordan", mood: "frustrated", prop: "kitchen", eyebrow: "A small thing", heading: "It started about the dishes.", body: "Sam mentioned them. Jordan heard a verdict. The heat arrived faster than the thought, and within a minute it was about everything. Twenty minutes later Jordan cannot remember what the dishes had to do with it." },
      { kind: "perspective", heading: "Tap each of them.", body: "Both of them wanted this to go differently.", sides: [
        { who: "jordan", mood: "overwhelmed", label: "Jordan", thought: "It felt like an attack before I had a chance to think. I know it was not. By the time I could think, I had already said things." },
        { who: "sam", mood: "anxious", label: "Sam", thought: "I said one thing about the dishes. I do not understand how we got here. I am scared to raise anything now." },
      ], teaching: "In ADHD, emotion often arrives before thought and takes longer to settle. The other person experiences a small remark producing a large reaction, and starts editing what they say. Both lose something." },
      resonance("Does this happen to you — small things becoming big ones fast?"),
      { kind: "explain", eyebrow: "The idea", heading: "Fast in, slow out.", body: "Emotional regulation is one of the functions ADHD affects. Feelings arrive at full strength and take longer to come down, so a remark can become a fight before either person chose it. The pause is the whole skill — and it can be built, mostly in advance.", detail: ["The pause has to be agreed before the heat, not during", "Leaving the room is not losing", "Repair afterwards matters as much as the pause"] },
      { kind: "personalise", questions: [
        { id: "trigger", prompt: "What most often lights it?", options: [{ id: "criticism", label: "Anything that sounds like criticism" }, { id: "tired", label: "Being tired or hungry" }, { id: "interrupted", label: "Being interrupted" }, { id: "unfair", label: "Feeling unfairly judged" }], multi: true },
        { id: "after", prompt: "What happens afterwards?", options: [{ id: "repair", label: "We repair it" }, { id: "silence", label: "Silence for a while" }, { id: "shame", label: "I feel ashamed" }, { id: "repeat", label: "It repeats" }], multi: true },
      ] },
      { kind: "strategy", heading: "Agree the pause in advance.", body: "Not in the argument — over a calm cup of tea. One word either of you can say that means: twenty minutes, then we come back.", strategies: [
        { id: "agreed-pause", title: "The agreed pause word", acts: "people", steps: ["When things are calm, tell the person how fast the heat arrives for you", "Agree one word that means: pause, twenty minutes, then we return", "Agree that whoever says it also says when they will be back"] },
      ] },
      { kind: "reflect", prompts: ["When did this last happen?", "What would have made it 20% easier?"], suggestions: ["A pause", "Being less tired", "Hearing it differently", "Repairing sooner"] },
      { kind: "insight", id: "conflict-pause", heading: "The speed is the problem, not the feeling.", body: "The feeling is honest. A pause built in advance gives it somewhere to go.", byAnswer: { question: "after", map: { repair: "You repair afterwards, which is the strongest thing a couple can do — the pause makes it cheaper.", silence: "Silence follows, which is the pause arriving too late; the agreed word brings it forward.", shame: "Shame follows, which is worth saying out loud to somebody — it is common and it is heavy.", repeat: "It repeats, which is the sign this is worth taking beyond a module." } } },
      { kind: "next", heading: "This one is worth taking further if it keeps repeating.", body: "A counsellor or psychologist who works with couples where one person has ADHD is a reasonable place to go.", action: "support" },
    ],
  },
  // ── Daily Life ─────────────────────────────────────────────────────────────────────────────
  {
    id: "household",
    title: "Household executive load",
    subtitle: "Who is holding the list, and what it costs",
    minutes: 7,
    domain: "daily-life",
    targets: ["living-environment", "structure", "partner"],
    strength: "Capable in bursts, and often the one who does the big jobs",
    characters: ["jordan"],
    professions: ["occupational-therapist", "adhd-coach"],
    steps: [
      { kind: "scene", stage: "hook", who: "jordan", mood: "overwhelmed", prop: "kitchen", eyebrow: "Sunday", heading: "Everything is at 80%.", body: "The washing is in the machine, wet. The bins were nearly taken out. The form for the car is half filled in. Jordan has done a lot today and nothing is finished, and the flat looks like nothing happened." },
      { kind: "choice", who: "jordan", mood: "thinking", prop: "kitchen", heading: "What is actually going wrong?", options: [
        { id: "lazy", label: "Not doing enough", response: "Jordan did a lot. The problem is not effort; it is that every job has a last step that lives in working memory, and that step keeps falling out." },
        { id: "finishing", label: "Finishing, not starting", response: "Yes. The household is a hundred small tasks that each need remembering twice — to start, and to complete." },
        { id: "system", label: "No system", response: "Partly. A system is a way of getting the remembering out of Jordan’s head and into the flat." },
      ] },
      resonance(),
      { kind: "explain", eyebrow: "The idea", heading: "A household runs on executive function.", body: "Every job — washing, bins, bills — is a chain of remembering: when, what, and whether it is done. That chain lives in working memory and time sense, which is exactly where ADHD costs most. Living with somebody, the chain often ends up in the other person’s head, silently.", detail: ["Routines fixed to a time and a place carry the remembering", "Visible states beat hidden ones — a basket, not a drawer", "Sharing the list out loud is fairer than one person holding it"] },
      { kind: "personalise", questions: [
        { id: "worst", prompt: "Which job goes wrong most?", options: [{ id: "washing", label: "Washing" }, { id: "bills", label: "Bills and admin" }, { id: "food", label: "Food and shopping" }, { id: "tidying", label: "Tidying" }], multi: true },
        { id: "holds", prompt: "Who holds the household list?", options: [{ id: "me", label: "Me" }, { id: "partner", label: "A partner or flatmate" }, { id: "nobody", label: "Nobody — it is chaos" }, { id: "shared", label: "It is shared" }] },
      ] },
      { kind: "strategy", heading: "Fix one job to a time and a place.", body: "Not a resolution — an anchor. Bins go out when the kettle goes on Tuesday night. The anchor remembers, so you do not have to.", strategies: [
        { id: "anchored-routine", title: "One anchored job", acts: "environment", steps: ["Pick the one household job that goes wrong most", "Attach it to something that already happens every week — a show, a meal, a commute", "Do it at the anchor once this week, and put a note where the anchor is"] },
      ] },
      { kind: "insight", id: "household-load", heading: "The household load may be sitting in somebody’s head.", body: "Anchors and visible systems move it into the flat, where it can be shared.", byAnswer: { question: "holds", map: { me: "You hold the list, which means the anchors are for you and the cost is yours.", partner: "Somebody else holds the list — this module is worth sharing, because an anchor is easier to share than a memory.", nobody: "Nobody holds it, so one anchored job is a start rather than a whole system.", shared: "It is shared already, which is the hardest part done; anchors make the sharing stick." } } },
      { kind: "next", heading: "Anchor one job this week.", body: "The one that goes wrong most.", action: "try" },
    ],
  },
  // ── Sleep & Body ───────────────────────────────────────────────────────────────────────────
  {
    id: "sleep",
    title: "Sleep and ADHD",
    subtitle: "Why the night gets later, and what a short night does",
    minutes: 7,
    domain: "sleep-body",
    targets: ["sleep", "energy"],
    strength: "Often most alert and creative late — a rhythm, not a fault",
    characters: ["alex"],
    professions: ["gp", "psychologist"],
    steps: [
      { kind: "scene", stage: "hook", who: "alex", mood: "engaged", prop: "bed", eyebrow: "1:40am", heading: "Alex is finally getting things done.", body: "The flat is quiet, the phone is silent, and Alex’s brain has arrived. Two hours of work, then a video, then it is 3am. Tomorrow’s 9am lecture will happen to somebody else." },
      { kind: "choice", who: "alex", mood: "thinking", prop: "bed", heading: "Why now?", options: [
        { id: "night-owl", label: "Alex is a night person", response: "Partly. Many people with ADHD have a body clock that runs late. But the quiet matters as much as the hour." },
        { id: "quiet", label: "Nothing is interrupting", response: "Yes. At 1am the world supplies the conditions — no noise, no messages — that daytime never did." },
        { id: "avoiding", label: "Avoiding tomorrow", response: "Sometimes. Going to bed means the day is over, and an unfinished day is hard to close." },
      ] },
      resonance("Does this happen to you — the night stretching, and the next day paying for it?"),
      { kind: "explain", eyebrow: "The idea", heading: "A short night makes every ADHD difficulty larger.", body: "Working memory shrinks, the start threshold rises, emotion arrives faster. Many people with ADHD also run late by body clock, and find the quiet of the night the only time attention is not pulled. Both are real, and neither is a moral failing. The next day still pays.", detail: ["The problem is often the wind-down, not the falling asleep", "Light and screens hold the clock late", "A fixed wake time moves the clock more than a fixed bedtime"] },
      { kind: "personalise", questions: [
        { id: "late", prompt: "What keeps the night going?", options: [{ id: "work", label: "Finally getting work done" }, { id: "screens", label: "Screens" }, { id: "quiet", label: "The quiet" }, { id: "cannot-stop", label: "I cannot stop whatever I am doing" }], multi: true },
        { id: "next-day", prompt: "What does a short night cost you most?", options: [{ id: "attention", label: "Attention" }, { id: "mood", label: "Mood" }, { id: "starting", label: "Starting anything" }, { id: "memory", label: "Memory" }], multi: true },
      ] },
      { kind: "strategy", heading: "Anchor the wake time, not the bedtime.", body: "Bedtimes lose to hyperfocus. A wake time, kept even after a late night, drags the clock earlier over a week.", strategies: [
        { id: "fixed-wake", title: "One wake time for a week", acts: "body", steps: ["Choose a wake time you can keep seven days running", "Set it as an alarm across the room", "Get light within ten minutes of waking — a window or outside"] },
      ] },
      { kind: "insight", id: "sleep-costs", heading: "Sleep is upstream of most of the rest.", body: "A steadier week of sleep changes how every other module lands.", byAnswer: { question: "next-day", map: { attention: "A short night costs you attention most — the fixed wake time is the first lever.", mood: "A short night costs you mood most, which is worth telling a clinician if it is heavy.", starting: "A short night costs you starting most — sleep and the start threshold are linked.", memory: "A short night costs you memory most — working memory shrinks fastest when tired." } } },
      { kind: "next", heading: "Keep one wake time for a week.", body: "Then we will ask whether it changed anything.", action: "try" },
    ],
  },
  {
    id: "exercise",
    title: "Exercise and regulation",
    subtitle: "Movement that steadies attention, and how to keep it going",
    minutes: 6,
    domain: "sleep-body",
    targets: ["movement", "energy", "emotional-regulation"],
    strength: "Physical activity often produces the clearest focus of the week",
    characters: ["priya"],
    professions: ["exercise-physiologist", "gp"],
    steps: [
      { kind: "scene", stage: "hook", who: "priya", mood: "pleased", prop: "ball", eyebrow: "The morning after a run", heading: "Priya’s clearest work days have one thing in common.", body: "She ran first. The morning is clearer, the start threshold is lower, and the sting of a curt email settles in minutes instead of hours. She knows this. She still ran twice last month." },
      { kind: "choice", who: "priya", mood: "thinking", prop: "ball", heading: "If it helps this much, why is it hard to keep?", options: [
        { id: "discipline", label: "Not enough discipline", response: "Priya is not short of discipline. Keeping a routine is a starting problem repeated every day, and starting is the ADHD difficulty." },
        { id: "starting", label: "It is a starting problem", response: "Yes. Every session has to be started from nothing. The strategies for starting apply here too." },
        { id: "boring", label: "It gets boring", response: "Often. Interest fades, and with it the activation. Company and variety put it back." },
      ] },
      resonance("Does this happen to you — knowing movement helps, and struggling to keep it up?"),
      { kind: "explain", eyebrow: "The idea", heading: "Movement steadies the same functions ADHD affects.", body: "Many people find that regular exercise improves attention, settles emotion faster and helps sleep. The difficulty is not knowing that. It is that a routine is a start threshold met daily, and the ADHD brain needs the same help with it as with any other task.", detail: ["Fixed time and place carry the starting", "Company makes it activate", "Enjoyment matters more than optimal"] },
      { kind: "personalise", questions: [
        { id: "kind", prompt: "What kind of movement do you actually enjoy?", options: [{ id: "team", label: "Team sport" }, { id: "solo", label: "Running, swimming, cycling" }, { id: "gym", label: "The gym" }, { id: "walking", label: "Walking" }], multi: true },
        { id: "stops", prompt: "What stops it?", options: [{ id: "starting", label: "Getting out the door" }, { id: "time", label: "Time" }, { id: "alone", label: "Doing it alone" }, { id: "boredom", label: "Boredom" }], multi: true },
      ] },
      { kind: "strategy", heading: "Make the session start itself.", body: "Fixed time, fixed place, another person. Three things the routine can supply so you do not have to.", strategies: [
        { id: "movement-appointment", title: "A movement appointment", acts: "people", steps: ["Pick one session this week and put it in the calendar with a time and a place", "Ask one person to come, or to expect you", "Lay out what you need the night before"] },
      ] },
      { kind: "insight", id: "exercise-adherence", heading: "Movement is one of your levers, and keeping it going is a starting problem.", body: "Which means it responds to the same things: an anchor, a person, a low threshold.", byAnswer: { question: "stops", map: { starting: "Getting out the door is the stopper — laying things out the night before is the smallest first move.", time: "Time is the stopper — a fixed slot in the calendar beats intending to.", alone: "Doing it alone is the stopper — the person is the strategy.", boredom: "Boredom is the stopper — variety and company are what keep interest alive." } } },
      { kind: "next", heading: "Book one movement appointment this week.", body: "If it keeps slipping, an exercise physiologist is the person whose whole job is this.", action: "try" },
    ],
  },
];

const BY_ID: ReadonlyMap<string, InteractiveModule> = new Map(INTERACTIVE_MODULES.map((m) => [m.id, m]));

export function interactiveModule(id: string): InteractiveModule | undefined {
  return BY_ID.get(id);
}

/** The strategy a strategy id names, with its module, or undefined. */
export function strategyById(strategyId: string): { module: InteractiveModule; strategy: Strategy } | undefined {
  for (const module of INTERACTIVE_MODULES) {
    for (const step of module.steps) {
      if (step.kind !== "strategy") continue;
      const strategy = step.strategies.find((s) => s.id === strategyId);
      if (strategy) return { module, strategy };
    }
  }
  return undefined;
}

/** Every string a module renders, for the linters. */
export function moduleText(module: InteractiveModule): string[] {
  const out: string[] = [module.title, module.subtitle, module.strength];
  for (const step of module.steps) {
    switch (step.kind) {
      case "scene": out.push(step.heading, step.body, step.eyebrow ?? ""); break;
      case "choice": out.push(step.heading, step.body ?? "", ...step.options.flatMap((o) => [o.label, o.response])); break;
      case "resonance": out.push(step.heading); break;
      case "explain": out.push(step.eyebrow, step.heading, step.body, ...(step.detail ?? [])); break;
      case "personalise": out.push(...step.questions.flatMap((q) => [q.prompt, ...q.options.map((o) => o.label)])); break;
      case "strategy": out.push(step.heading, step.body, ...step.strategies.flatMap((s) => [s.title, ...s.steps])); break;
      case "reflect": out.push(...step.prompts, ...step.suggestions); break;
      case "insight": out.push(step.heading, step.body, ...Object.values(step.byAnswer?.map ?? {})); break;
      case "next": out.push(step.heading, step.body); break;
      case "perspective": out.push(step.heading, step.body, step.teaching, ...step.sides.flatMap((s) => [s.label, s.thought])); break;
      case "simulation": break;
    }
  }
  return out.filter(Boolean);
}
