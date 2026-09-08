// The runs (docs/adhd-life/PLAY-PLAN.md §2): the modules as micro-games. Phase P1 converts three;
// each keeps the module id, targets, professions, strategy id and insight id of its nine-stage
// original in `interactive.ts`, so the personal model reads a run exactly as it read the module.

import { INTERACTIVE_MODULES, type InteractiveModule } from "./interactive";
import type { Run } from "./play";

function original(id: string): InteractiveModule {
  const m = INTERACTIVE_MODULES.find((x) => x.id === id);
  if (!m) throw new Error(`runs: no module ${id}`);
  return m;
}
const insightOf = (id: string) => { const s = original(id).steps.find((x) => x.kind === "insight"); if (!s || s.kind !== "insight") throw new Error(`runs: ${id} has no insight`); return s; };
const nextOf = (id: string) => { const s = original(id).steps.find((x) => x.kind === "next"); if (!s || s.kind !== "next") throw new Error(`runs: ${id} has no next`); return s; };
const strategyOf = (id: string, strategyId: string) => { for (const s of original(id).steps) if (s.kind === "strategy") { const f = s.strategies.find((x) => x.id === strategyId); if (f) return f; } throw new Error(`runs: ${id} has no strategy ${strategyId}`); };

export const RUNS: readonly Run[] = [
  {
    id: "context",
    title: "Same brain, five scenes",
    tagline: "Why ADHD looks different depending on the situation",
    minutes: 4,
    bean: "alex",
    recognition: "Does this happen to you?",
    rounds: [
      { id: "class", mechanic: "hold", instruction: "Hold to stay in the class discussion. Alex loves this.", seconds: 6, who: "alex", mood: "engaged", prop: "lecture", items: ["phone", "window", "a thought"], hit: "Easy. Interest holds attention on its own.", miss: "Even here it slips sometimes. Interest usually brings it back." },
      { id: "essay", mechanic: "tap", instruction: "Three weeks out. Which can Alex actually start?", seconds: 7, who: "alex", mood: "anxious", prop: "desk", options: [{ id: "essay", label: "The essay" }, { id: "tab", label: "A new tab", correct: true }, { id: "snack", label: "A snack", correct: true }], hit: "Yes. Far off and vague, the essay cannot start. Anything else can.", miss: "Not tonight. Far off and vague, the essay has nothing to grab." },
      { id: "tomorrow", mechanic: "timing", instruction: "Tap the moment the essay becomes real.", seconds: 8, who: "alex", mood: "surprised", prop: "phone", hit: "“Due tomorrow.” Now it is real, and Alex writes all night.", miss: "It became real the night before. Time sense has two settings: now, and not now." },
      { id: "bill", mechanic: "drag-capture", instruction: "Drag the bill somewhere it will be seen.", seconds: 6, who: "alex", mood: "neutral", prop: "bill", items: ["Electricity bill"], hit: "Out of sight was out of mind. In sight, it gets paid.", miss: "It slid out of view for a fortnight. A late fee arrives." },
      { id: "sport", mechanic: "hold", instruction: "Hold to track the ball. Ninety minutes, easy.", seconds: 6, who: "alex", mood: "pleased", prop: "ball", items: ["crowd", "a thought"], hit: "Ninety minutes of complete focus. Same brain as the essay.", miss: "Even sport slips on a bad day. Usually it holds." },
      { id: "same-person", mechanic: "sort", instruction: "What switched Alex on? Sort each into its layer.", seconds: 9, who: "alex", mood: "thinking", options: [{ id: "deadline", label: "A close deadline", layer: "environment" }, { id: "interest", label: "Interest", layer: "brain" }, { id: "teammates", label: "Teammates", layer: "people" }], hit: "None of it was effort. The conditions changed, and so did the brain.", miss: "Close — they all live outside the task. Change the conditions, change the brain." },
      { id: "your-switch", mechanic: "pick-bean", instruction: "Which bean is you? What switches you on most?", seconds: 10, who: "alex", mood: "thinking", writes: { question: "switch", multi: true }, options: [{ id: "deadline", label: "A close deadline", bean: "alex" }, { id: "interest", label: "Being interested", bean: "priya" }, { id: "company", label: "Somebody beside me", bean: "jordan" }, { id: "clear", label: "A very clear task", bean: "maya" }], hit: "Noted. That is a condition you can borrow on purpose.", miss: "Noted. That is a condition you can borrow on purpose." },
    ],
    insight: insightOf("context"),
    strategy: strategyOf("context", "conditions-map"),
    next: nextOf("context"),
  },
  {
    id: "starting",
    title: "The blank page",
    tagline: "Why starting can be harder than doing",
    minutes: 4,
    bean: "maya",
    recognition: "Does this happen to you?",
    rounds: [
      { id: "coffee", mechanic: "dont-tap", instruction: "Do not tap the coffee. The summary is due at ten.", seconds: 6, who: "maya", mood: "anxious", prop: "desk", options: [{ id: "coffee", label: "Make a coffee" }], hit: "Held. The pull to do anything else is the threshold, not laziness.", miss: "Coffee. Then messages. Then the weather. It is 9:40 and the page is blank." },
      { id: "first-move", mechanic: "order", instruction: "Tap the three moves in order, smallest first.", seconds: 8, who: "maya", mood: "thinking", prop: "desk", options: [{ id: "open", label: "Open the file" }, { id: "title", label: "Type the title" }, { id: "sentence", label: "Write one bad sentence" }], hit: "Tiny, physical, in order. The threshold drops with every move.", miss: "Smallest first. Open the file is a door; the summary is a wall." },
      { id: "help", mechanic: "tap", instruction: "What would actually help Maya start right now?", seconds: 7, who: "maya", mood: "anxious", options: [{ id: "harder", label: "Try harder" }, { id: "bad", label: "Write it badly", correct: true }, { id: "later", label: "Wait to feel ready" }, { id: "person", label: "Sit beside somebody", correct: true }], hit: "Yes. Lower the threshold: a bad first line, or a person in the room.", miss: "Effort was never the missing piece. Lower the threshold instead." },
      { id: "vague", mechanic: "tap", instruction: "Which task is hardest to begin?", seconds: 6, who: "maya", mood: "overwhelmed", prop: "desk", options: [{ id: "improve", label: "Improve the report", correct: true }, { id: "title", label: "Write the title" }], hit: "Vague, big, judged: that is where the threshold is highest.", miss: "The title has a first action built in. “Improve” has to be designed first." },
      { id: "company", mechanic: "hold", instruction: "A friend sits down. Hold to keep going.", seconds: 6, who: "maya", mood: "engaged", prop: "desk", items: ["phone", "email"], hit: "Company lowers the threshold in a way willpower does not.", miss: "Even with company it slips. Usually a person in the room is enough." },
      { id: "your-hardest", mechanic: "pick-bean", instruction: "Which bean is you? What is hardest to start?", seconds: 10, who: "maya", mood: "thinking", writes: { question: "hardest-to-start", multi: true }, options: [{ id: "vague", label: "Vague ones", bean: "maya" }, { id: "big", label: "Big ones", bean: "alex" }, { id: "boring", label: "Boring ones", bean: "jordan" }, { id: "judged", label: "Ones somebody will judge", bean: "priya" }], hit: "Noted. Your threshold has a shape, and shapes can be worked around.", miss: "Noted. Your threshold has a shape, and shapes can be worked around." },
      { id: "your-help", mechanic: "pick-bean", instruction: "What has ever helped you start?", seconds: 10, who: "maya", mood: "pleased", writes: { question: "what-helps-start", multi: true }, options: [{ id: "deadline", label: "A deadline", bean: "alex" }, { id: "person", label: "Another person", bean: "sam" }, { id: "small", label: "Making it tiny", bean: "maya" }, { id: "nothing", label: "Nothing reliably", bean: "jordan" }], hit: "That is your lever. The strategy at the end uses it.", miss: "That is your lever. The strategy at the end uses it." },
    ],
    insight: insightOf("starting"),
    strategy: strategyOf("starting", "first-physical-action"),
    next: nextOf("starting"),
  },
  {
    id: "working-memory",
    title: "The small table",
    tagline: "Why four things become two",
    minutes: 4,
    bean: "jordan",
    recognition: "Does this happen to you?",
    rounds: [
      { id: "four", mechanic: "recall", instruction: "Four things. Read them once, then the phone buzzes.", seconds: 8, who: "jordan", mood: "neutral", prop: "kitchen", items: ["Milk", "The parcel", "Stamps", "Sam’s script"], hit: "All four. Under stress or after a short night, the table is smaller.", miss: "Some fell off. Forgetting is the table being knocked, not carelessness." },
      { id: "buzz", mechanic: "dont-tap", instruction: "Do not open the group chat until the shops.", seconds: 6, who: "jordan", mood: "anxious", prop: "phone", options: [{ id: "chat", label: "Open the chat" }], hit: "Held. Every interruption clears part of the table.", miss: "Opened. It clears part of the table, and you do not notice which part." },
      { id: "capture", mechanic: "drag-capture", instruction: "Sam asks for two more things. Drag each onto the note.", seconds: 7, who: "jordan", mood: "thinking", prop: "kitchen", items: ["Bin day", "Call the landlord"], hit: "Off the table, onto the note. Now it cannot be knocked.", miss: "Held in the head, and gone by the door. The note would have kept it." },
      { id: "knocks", mechanic: "swipe", instruction: "Swipe away what knocks things off the table.", seconds: 7, who: "jordan", mood: "overwhelmed", items: ["Phone", "A colleague", "A thought", "Tired"], hit: "Cleared. Knowing what knocks the table is half the fix.", miss: "Too many at once. That is exactly the moment things fall." },
      { id: "why", mechanic: "tap", instruction: "Jordan forgot the stamps. What is true?", seconds: 6, who: "jordan", mood: "embarrassed", options: [{ id: "care", label: "Jordan does not care" }, { id: "table", label: "The table was knocked", correct: true }], hit: "Forgetting is not the same as not caring. It never was.", miss: "Jordan cared. The table was knocked. Those are different things." },
      { id: "your-knocks", mechanic: "pick-bean", instruction: "What most often knocks your table?", seconds: 10, who: "jordan", mood: "thinking", writes: { question: "knocks", multi: true }, options: [{ id: "phone", label: "My phone", bean: "alex" }, { id: "people", label: "People talking to me", bean: "sam" }, { id: "own-thoughts", label: "My own thoughts", bean: "priya" }, { id: "tired", label: "Being tired", bean: "jordan" }], hit: "Noted. That is where a capture place earns its keep.", miss: "Noted. That is where a capture place earns its keep." },
      { id: "your-capture", mechanic: "pick-bean", instruction: "Do you have one place you write things down?", seconds: 10, who: "jordan", mood: "neutral", writes: { question: "capture" }, options: [{ id: "yes", label: "Yes, one place", bean: "maya" }, { id: "several", label: "Several places", bean: "alex" }, { id: "no", label: "Not really", bean: "jordan" }], hit: "Noted. One place is the whole strategy.", miss: "Noted. One place is the whole strategy." },
    ],
    insight: insightOf("working-memory"),
    strategy: strategyOf("working-memory", "one-capture-place"),
    next: nextOf("working-memory"),
  },
];

const BY_ID: ReadonlyMap<string, Run> = new Map(RUNS.map((r) => [r.id, r]));

export function runFor(id: string): Run | undefined {
  return BY_ID.get(id);
}
