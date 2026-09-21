// The five topic surveys (PRD §22–§23, §60) as data: Work & Study, Relationships, Daily
// Life, Sleep & Body, Mind & Emotions. Eight to twelve questions each, two to four minutes,
// offered — never launched — from My ADHD and the support path.
//
// WHAT A SURVEY IS HERE. Level 3 of the progressive survey system: enough questions to say which
// part of a domain is the friction, what amplifies it, what contributes, and what is working —
// the §23 "Your work pattern" shape. Every option carries the SIGNALS it is evidence for
// (subdomain and weight), an optional CONTRIBUTOR (a layer and a note the model keeps), an
// optional STRENGTH, and optional CLAIMS the scorer uses to notice when two answers contradict
// each other. Nothing here is a symptom scale and nothing produces a diagnosis; the scorer
// (`src/model/surveys.ts`) says so in its output shape, which has no total.

import { DOMAIN_LABELS, type Domain, type Layer, type Subdomain } from "@/model/layers";

export interface SurveyOption {
  readonly id: string;
  readonly label: string;
  /** Evidence this option gives for a subdomain being the friction. */
  readonly signals?: ReadonlyArray<{ readonly subdomain: Subdomain; readonly weight: number }>;
  /** What the model keeps as a contributor when this option is chosen. */
  readonly contributor?: { readonly layer: Layer; readonly subdomain: Subdomain; readonly note: string };
  /** A strength this option names. */
  readonly strength?: string;
  /** Claims about the person's pattern; two answers claiming opposite values contradict. */
  readonly claims?: Readonly<Record<string, boolean>>;
}

export interface SurveyQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly kind: "single" | "scale";
  readonly options?: readonly SurveyOption[];
  /** For a scale question: the 0–10 answer is the functional cost of this subdomain. */
  readonly costFor?: Subdomain;
  readonly note?: string;
}

export interface TopicSurvey {
  readonly id: string;
  /**
   * ALWAYS `DOMAIN_LABELS[domain]`, never a second name for the same thing. A survey fills one
   * area of the map, and three of the five used to be called something else on the way in than
   * the row they filled on the way out — you chose "Emotional Wellbeing" and "Mind & Emotions"
   * lit up. That is the one join this whole loop is built on (MAP-PRD §9), so it is not left to
   * whoever writes the next survey. `every survey is named for the area it fills` holds it.
   */
  readonly title: string;
  readonly domain: Domain;
  /** The heading of the result: "Your work pattern". */
  readonly resultTitle: string;
  readonly minutes: number;
  readonly questions: readonly SurveyQuestion[];
  /** The strategy the result suggests trying next, from the interactive modules. */
  readonly tryNext: string;
  /** The module the result suggests exploring next. */
  readonly exploreNext: string;
  /**
   * LEVEL 4 (PRD §20): ten to twenty more questions, offered only once the app already knows a
   * lot and the person asks for it. Not a second survey — the same answers, extended, so what is
   * already recorded is never asked again. Absent where the content has not been written yet.
   */
  readonly deeper?: readonly SurveyQuestion[];
}

const yesNo = (id: string, yes: SurveyOption, no: SurveyOption, sometimes?: SurveyOption): SurveyOption[] =>
  [yes, ...(sometimes ? [sometimes] : []), no].map((o) => ({ ...o, id: `${id}-${o.id}` }));

/**
 * The one sentence a finished survey earns, by the friction its answers pointed at hardest.
 *
 * AUTHORED, NEVER GENERATED. This is the reward in the exchange the founder described — give
 * data, receive insight — and it is the single most consequential sentence the product says to
 * somebody about their own mind. So every one of them is written here, reviewed like any other
 * patient copy, and linted in the test beside this file. Nothing composes one at runtime.
 *
 * Each says the same kind of thing: this is more about X than about Y. That shape is what makes
 * it useful rather than flattering — it rules something out, which is what a person cannot do
 * for themselves from the inside.
 */
export const SURVEY_INSIGHTS: Partial<Record<Subdomain, string>> = {
  activation:
    "This looks more about starting and structuring work than about holding attention once you are in it.",
  "deadline-design":
    "This looks more about how far away a deadline feels than about how much you care about the work.",
  attention:
    "This looks more about staying with a thing than about getting yourself to begin it.",
  switching:
    "This looks more about the cost of coming back than about the interruption itself.",
  noise:
    "This looks more about what is around you than about anything you are doing differently.",
  memory:
    "This looks more about what falls out of mind than about effort or how much you care.",
  time: "This looks more about how time feels than about how much you have.",
  structure:
    "This looks more about how little structure the day has than about willpower inside it.",
  workload: "This looks more about how much is open at once than about how fast you work.",
  "emotional-regulation":
    "This looks more about how long feelings take to settle than about how often they arrive.",
  inhibition: "This looks more about the pause before acting than about wanting to act at all.",
  sleep: "This looks more about what a short night costs the next day than about the night itself.",
  energy: "This looks more about the shape of your day than about how much you are doing in it.",
  movement: "This looks more about getting started than about keeping going once you have.",
  appetite: "This looks more about noticing than about appetite itself.",
  partner: "This looks more about what happens after a conversation than about the conversation.",
  family: "This looks more about follow-through than about how much anybody cares.",
  manager: "This looks more about how work arrives than about how you handle it once it has.",
  teachers: "This looks more about how the course is set up than about how you study.",
  peers: "This looks more about who is around than about how sociable you are.",
  "living-environment": "This looks more about who holds the household list than about tidiness.",
  "study-context": "This looks more about how the course is run than about how hard you work at it.",
  "workplace-context": "This looks more about how the job is set up than about how you do it.",
  "medication-experience": "This looks more about what medication leaves untouched than about what it changes.",
  clinicians: "This looks more about the conversations still to have than about the care you already get.",
};


/**
 * GO DEEPER: work and study (PRD §20 level 4).
 *
 * What the shorter survey cannot separate: whether starting is hard because the task is unclear,
 * because the standard is unclear, because the work is dull, or because something is at stake.
 * Those four lead to genuinely different kinds of help, which is the whole reason for asking.
 * Offered only when the short one is done and the cost is still high — never launched.
 */
const WORK_DEEPER: readonly SurveyQuestion[] = [
  { id: "d-standard", prompt: "Do you usually know how good the work has to be?", kind: "single", options: [
    { id: "yes", label: "Yes, it is clear", claims: { "standard-known": true } },
    { id: "guess", label: "I guess, and aim high", signals: [{ subdomain: "activation", weight: 2 }], contributor: { layer: "brain", subdomain: "emotional-regulation", note: "A perfectionistic starting threshold" }, claims: { "standard-known": false } },
    { id: "no", label: "Rarely", signals: [{ subdomain: "activation", weight: 1 }], contributor: { layer: "environment", subdomain: "workplace-context", note: "The expected standard is unclear" }, claims: { "standard-known": false } },
  ] },
  { id: "d-stakes", prompt: "Is it harder to start when somebody will judge the result?", kind: "single", options: [
    { id: "much", label: "Much harder", signals: [{ subdomain: "emotional-regulation", weight: 2 }], contributor: { layer: "people", subdomain: "manager", note: "Being judged raises the threshold" } },
    { id: "some", label: "A little", signals: [{ subdomain: "emotional-regulation", weight: 1 }] },
    { id: "no", label: "No difference" },
  ] },
  { id: "d-dull", prompt: "Is dull work harder to begin than difficult work?", kind: "single", options: [
    { id: "yes", label: "Dull is much harder", signals: [{ subdomain: "attention", weight: 2 }], contributor: { layer: "brain", subdomain: "attention", note: "Interest, not difficulty, is what switches it on" } },
    { id: "same", label: "About the same" },
    { id: "no", label: "Difficult is harder", signals: [{ subdomain: "activation", weight: 1 }] },
  ] },
  { id: "d-first-step", prompt: "When you do start, what usually gets you moving?", kind: "single", options: [
    { id: "small", label: "Making the first step tiny", strength: "Can shrink a task down to a first move" },
    { id: "person", label: "Somebody being there", contributor: { layer: "people", subdomain: "peers", note: "Company lowers the threshold" }, strength: "Uses accountability well" },
    { id: "deadline", label: "Running out of time", contributor: { layer: "environment", subdomain: "deadline-design", note: "Waiting for urgency" } },
    { id: "nothing", label: "Nothing reliably", signals: [{ subdomain: "activation", weight: 2 }] },
  ] },
  { id: "d-finish", prompt: "Once you are going, do you usually finish?", kind: "single", options: [
    { id: "yes", label: "Usually", strength: "Once started, work often goes well", claims: { "finishes": true } },
    { id: "stall", label: "I stall near the end", signals: [{ subdomain: "activation", weight: 1 }], claims: { "finishes": false } },
    { id: "drift", label: "I drift onto something else", signals: [{ subdomain: "switching", weight: 2 }], claims: { "finishes": false } },
  ] },
  { id: "d-planning", prompt: "Do you break work into steps before starting?", kind: "single", options: [
    { id: "always", label: "Almost always", strength: "Plans before starting" },
    { id: "sometimes", label: "Sometimes" },
    { id: "never", label: "Rarely, I just open it", signals: [{ subdomain: "structure", weight: 2 }], contributor: { layer: "environment", subdomain: "structure", note: "Work begun without a first step written down" } },
  ] },
  { id: "d-estimate", prompt: "How close are your guesses about how long work takes?", kind: "single", options: [
    { id: "close", label: "Usually close", strength: "Estimates time well" },
    { id: "under", label: "I underestimate a lot", signals: [{ subdomain: "time", weight: 2 }] },
    { id: "unsure", label: "I do not really guess", signals: [{ subdomain: "time", weight: 1 }] },
  ] },
  { id: "d-meetings", prompt: "Do meetings and messages break up the day?", kind: "single", options: [
    { id: "constantly", label: "Constantly", signals: [{ subdomain: "switching", weight: 2 }], contributor: { layer: "environment", subdomain: "workload", note: "The day arrives in fragments" } },
    { id: "some", label: "Some days", signals: [{ subdomain: "switching", weight: 1 }] },
    { id: "rarely", label: "Rarely" },
  ] },
  { id: "d-asked", prompt: "Have you asked for anything to change at work or in your course?", kind: "single", options: [
    { id: "yes", label: "Yes", strength: "Has asked for what helps" },
    { id: "no", label: "No, it has not come up", contributor: { layer: "environment", subdomain: "workplace-context", note: "Nothing has been asked for yet" } },
    { id: "refused", label: "Yes, and it went nowhere", contributor: { layer: "people", subdomain: "manager", note: "A request that went nowhere" } },
  ] },
  { id: "d-cost", prompt: "How much does all this cost you in a normal week?", kind: "scale", costFor: "activation", note: "0 is not at all, 10 is constantly." },
];

/**
 * GO DEEPER: relationships.
 *
 * The distinction worth paying ten questions for is the one the founder named: whether the
 * difficulty is in the conversation itself or in what survives it.
 */
const RELATIONSHIPS_DEEPER: readonly SurveyQuestion[] = [
  { id: "d-during", prompt: "During a conversation, how does it usually go?", kind: "single", options: [
    { id: "well", label: "Well, I am engaged", strength: "Warm and engaged in the moment", claims: { "conversation-fine": true } },
    { id: "drift", label: "I drift and lose the thread", signals: [{ subdomain: "attention", weight: 2 }], claims: { "conversation-fine": false } },
    { id: "interrupt", label: "I jump in before they finish", signals: [{ subdomain: "inhibition", weight: 2 }], claims: { "conversation-fine": false } },
  ] },
  { id: "d-after", prompt: "What happens to things you agreed to?", kind: "single", options: [
    { id: "held", label: "I keep them", strength: "Follows through on what was agreed" },
    { id: "forget", label: "They fall out of my head", signals: [{ subdomain: "memory", weight: 3 }], contributor: { layer: "brain", subdomain: "memory", note: "Agreements made out loud are not kept anywhere" } },
    { id: "late", label: "I remember late", signals: [{ subdomain: "memory", weight: 2 }] },
  ] },
  { id: "d-written", prompt: "Do agreements get written down anywhere?", kind: "single", options: [
    { id: "yes", label: "Yes, somewhere I check", strength: "Keeps a place outside their head" },
    { id: "no", label: "No", signals: [{ subdomain: "memory", weight: 2 }], contributor: { layer: "environment", subdomain: "structure", note: "No capture place outside your head" } },
  ] },
  { id: "d-carries", prompt: "Who tends to carry the follow-up?", kind: "single", options: [
    { id: "me", label: "Me" },
    { id: "partner", label: "A partner", contributor: { layer: "people", subdomain: "partner", note: "A partner carries the follow-up" } },
    { id: "family", label: "Family", contributor: { layer: "people", subdomain: "family", note: "Family carry the follow-up" } },
    { id: "nobody", label: "Nobody, things drop", signals: [{ subdomain: "memory", weight: 1 }] },
  ] },
  { id: "d-named", prompt: "Has anyone said they feel unheard?", kind: "single", options: [
    { id: "often", label: "Often", signals: [{ subdomain: "partner", weight: 2 }] },
    { id: "once", label: "Once or twice", signals: [{ subdomain: "partner", weight: 1 }] },
    { id: "no", label: "Not that I know of" },
  ] },
  { id: "d-sting", prompt: "How long does it take to settle after a difficult conversation?", kind: "single", options: [
    { id: "long", label: "A long time", signals: [{ subdomain: "emotional-regulation", weight: 3 }] },
    { id: "while", label: "A while", signals: [{ subdomain: "emotional-regulation", weight: 1.5 }] },
    { id: "quick", label: "Not long", strength: "Settles quickly after friction" },
  ] },
  { id: "d-explained", prompt: "Do the people close to you know how your attention works?", kind: "single", options: [
    { id: "yes", label: "Yes, we have talked about it", strength: "Has explained how they work to the people close to them" },
    { id: "partly", label: "Partly" },
    { id: "no", label: "No", contributor: { layer: "people", subdomain: "partner", note: "The pattern has not been explained to them" } },
  ] },
  { id: "d-repair", prompt: "When something goes wrong, does it get talked through?", kind: "single", options: [
    { id: "yes", label: "Usually", strength: "Repairs things after they go wrong" },
    { id: "avoid", label: "We avoid it", contributor: { layer: "people", subdomain: "partner", note: "Difficult things go unsaid" } },
    { id: "escalate", label: "It escalates first", signals: [{ subdomain: "emotional-regulation", weight: 2 }] },
  ] },
  { id: "d-cost", prompt: "How much is this costing the relationships that matter?", kind: "scale", costFor: "partner", note: "0 is not at all, 10 is constantly." },
];

export const TOPIC_SURVEYS: readonly TopicSurvey[] = [
  {
    id: "work-study",
    title: DOMAIN_LABELS["work-study"],
    domain: "work-study",
    resultTitle: "Your work pattern",
    minutes: 3,
    tryNext: "first-physical-action",
    exploreNext: "deadlines",
    deeper: WORK_DEEPER,
    questions: [
      { id: "initiation", prompt: "How hard is it to begin important work?", kind: "single", options: [
        { id: "very", label: "Very, I circle it for ages", signals: [{ subdomain: "activation", weight: 3 }] },
        { id: "somewhat", label: "Somewhat, on a bad day", signals: [{ subdomain: "activation", weight: 1.5 }] },
        { id: "not", label: "Not really", signals: [] },
      ] },
      { id: "ambiguity", prompt: "Are unclear tasks harder to start than clear ones?", kind: "single", options: yesNo("ambiguity",
        { id: "yes", label: "Much harder", signals: [{ subdomain: "activation", weight: 2 }], contributor: { layer: "environment", subdomain: "structure", note: "Activation for ambiguous tasks" }, claims: { "clarity-helps": true } },
        { id: "no", label: "About the same", claims: { "clarity-helps": false } },
        { id: "some", label: "A bit harder", signals: [{ subdomain: "activation", weight: 1 }] },
      ) },
      { id: "urgency", prompt: "Do deadlines improve your ability to start?", kind: "single", options: yesNo("urgency",
        { id: "yes", label: "Yes, the night before is when I work", signals: [{ subdomain: "time", weight: 2 }], contributor: { layer: "environment", subdomain: "deadline-design", note: "Waiting for urgency" }, strength: "Fast, high-quality output under a close deadline", claims: { "deadlines-help": true } },
        { id: "no", label: "No, deadlines just add stress", claims: { "deadlines-help": false } },
        { id: "some", label: "Sometimes", signals: [{ subdomain: "time", weight: 1 }] },
      ) },
      { id: "interruption", prompt: "After an interruption, how hard is it to get back in?", kind: "single", options: [
        { id: "hard", label: "Very hard, I often do not", signals: [{ subdomain: "switching", weight: 3 }] },
        { id: "slow", label: "Slower than it should be", signals: [{ subdomain: "switching", weight: 1.5 }] },
        { id: "fine", label: "Fine", signals: [] },
      ] },
      { id: "environment", prompt: "Where do you work well?", kind: "single", options: [
        { id: "quiet", label: "Somewhere quiet, alone", contributor: { layer: "environment", subdomain: "noise", note: "Noise costs focus" } },
        { id: "people", label: "Around other people working", contributor: { layer: "people", subdomain: "peers", note: "Company lowers the threshold" }, strength: "Sustained focus alongside others" },
        { id: "anywhere", label: "It does not seem to matter" },
        { id: "night", label: "Late, when the world is quiet", contributor: { layer: "body", subdomain: "sleep", note: "Work spills into the night" } },
      ] },
      { id: "structure", prompt: "How much external structure does your week have?", kind: "single", options: [
        { id: "little", label: "Very little, I set my own days", contributor: { layer: "environment", subdomain: "structure", note: "Long stretches with little external structure" }, signals: [{ subdomain: "activation", weight: 1 }] },
        { id: "some", label: "Some fixed points" },
        { id: "lots", label: "A lot, fixed times and check-ins", strength: "Performs well inside structure" },
      ] },
      { id: "accountability", prompt: "Does anyone check on your progress?", kind: "single", options: yesNo("accountability",
        { id: "yes", label: "Yes, regularly", strength: "Uses accountability well", claims: { "accountability-present": true } },
        { id: "no", label: "Nobody", contributor: { layer: "people", subdomain: "manager", note: "No external accountability" }, claims: { "accountability-present": false } },
      ) },
      { id: "compensation", prompt: "Do you work late or on weekends to recover lost time?", kind: "single", options: [
        { id: "often", label: "Often", contributor: { layer: "body", subdomain: "energy", note: "Late work to recover lost time" }, signals: [{ subdomain: "time", weight: 1 }] },
        { id: "sometimes", label: "Sometimes" },
        { id: "rarely", label: "Rarely" },
      ] },
      { id: "perfectionism", prompt: "Do you delay because the work needs to be done well?", kind: "single", options: [
        { id: "yes", label: "Yes, it has to be right before I can start", contributor: { layer: "brain", subdomain: "emotional-regulation", note: "Perfectionistic starting threshold" }, signals: [{ subdomain: "activation", weight: 1.5 }] },
        { id: "some", label: "A little" },
        { id: "no", label: "No, rough drafts are fine", strength: "Comfortable starting rough" },
      ] },
      { id: "consequence", prompt: "How much does this affect your performance or wellbeing?", kind: "scale", costFor: "activation", note: "0 is not at all, 10 is constantly." },
      { id: "strength", prompt: "When do you perform exceptionally well?", kind: "single", options: [
        { id: "interest", label: "When I am interested", strength: "Deep engagement when interest catches" },
        { id: "crisis", label: "When it is nearly too late", strength: "Calm and fast under pressure" },
        { id: "concrete", label: "Once the problem is concrete", strength: "Sustained engagement once the problem becomes concrete" },
        { id: "team", label: "In a team that talks", strength: "Thinks well out loud with others" },
      ] },
    ],
  },
  {
    id: "relationships",
    title: DOMAIN_LABELS.relationships,
    domain: "relationships",
    resultTitle: "Your relationship pattern",
    minutes: 3,
    tryNext: "name-the-drift",
    exploreNext: "not-listening",
    deeper: RELATIONSHIPS_DEEPER,
    questions: [
      { id: "unheard", prompt: "How often does someone close to you feel you were not listening?", kind: "single", options: [
        { id: "often", label: "Often", signals: [{ subdomain: "attention", weight: 3 }] },
        { id: "sometimes", label: "Sometimes", signals: [{ subdomain: "attention", weight: 1.5 }] },
        { id: "rarely", label: "Rarely" },
      ] },
      { id: "commitments", prompt: "Do commitments you meant to keep disappear from your head?", kind: "single", options: [
        { id: "often", label: "Often", signals: [{ subdomain: "memory", weight: 3 }] },
        { id: "sometimes", label: "Sometimes", signals: [{ subdomain: "memory", weight: 1.5 }] },
        { id: "rarely", label: "Rarely" },
      ] },
      { id: "carries", prompt: "Who carries the follow-up in your household or relationship?", kind: "single", options: [
        { id: "partner", label: "Mostly my partner", contributor: { layer: "people", subdomain: "partner", note: "A partner carries the follow-up" } },
        { id: "me", label: "Mostly me", strength: "Carries the organising load for others" },
        { id: "shared", label: "It is shared", strength: "A shared system already exists" },
        { id: "nobody", label: "Nobody, really", contributor: { layer: "environment", subdomain: "structure", note: "No shared system for commitments" } },
      ] },
      { id: "escalation", prompt: "How quickly does a small remark become a big argument?", kind: "single", options: [
        { id: "fast", label: "Very fast, before I can think", signals: [{ subdomain: "emotional-regulation", weight: 3 }] },
        { id: "sometimes", label: "Sometimes", signals: [{ subdomain: "emotional-regulation", weight: 1.5 }] },
        { id: "rarely", label: "Rarely" },
      ] },
      { id: "repair", prompt: "After a conflict, what usually happens?", kind: "single", options: [
        { id: "repair", label: "We repair it", strength: "Repairs after conflict", claims: { "repairs": true } },
        { id: "silence", label: "Silence for a while", contributor: { layer: "people", subdomain: "partner", note: "Repair comes late" }, claims: { "repairs": false } },
        { id: "repeat", label: "It repeats", contributor: { layer: "brain", subdomain: "emotional-regulation", note: "The same conflict repeats" }, claims: { "repairs": false } },
      ] },
      { id: "criticism", prompt: "How does criticism land?", kind: "single", options: [
        { id: "sting", label: "It stings for hours", signals: [{ subdomain: "emotional-regulation", weight: 1.5 }], contributor: { layer: "brain", subdomain: "emotional-regulation", note: "Criticism lands hard" } },
        { id: "some", label: "It stings, then passes" },
        { id: "fine", label: "I take it in my stride", strength: "Takes feedback well" },
      ] },
      { id: "named", prompt: "Has anyone close to you named ADHD as part of the pattern?", kind: "single", options: yesNo("named",
        { id: "yes", label: "Yes, and it helped", strength: "The people close to you know the pattern", claims: { "shared-understanding": true } },
        { id: "no", label: "No, it has never been said", contributor: { layer: "people", subdomain: "partner", note: "The pattern is not yet shared" }, claims: { "shared-understanding": false } },
        { id: "badly", label: "Yes, as an accusation", contributor: { layer: "people", subdomain: "partner", note: "ADHD gets used against you" } },
      ) },
      { id: "who", prompt: "Where does this show up most?", kind: "single", options: [
        { id: "partner", label: "With a partner", contributor: { layer: "people", subdomain: "partner", note: "Shows up most with a partner" } },
        { id: "family", label: "With family", contributor: { layer: "people", subdomain: "family", note: "Shows up most with family" } },
        { id: "friends", label: "With friends", contributor: { layer: "people", subdomain: "peers", note: "Shows up most with friends" } },
        { id: "work", label: "With colleagues", contributor: { layer: "people", subdomain: "manager", note: "Shows up most at work" } },
      ] },
      { id: "consequence", prompt: "How much is this costing the relationship?", kind: "scale", costFor: "partner", note: "0 is not at all, 10 is constantly." },
    ],
  },
  {
    id: "daily-organisation",
    title: DOMAIN_LABELS["daily-life"],
    domain: "daily-life",
    resultTitle: "Your organisation pattern",
    minutes: 3,
    tryNext: "anchored-routine",
    exploreNext: "household",
    questions: [
      { id: "unfinished", prompt: "How often do household jobs sit at 80% done?", kind: "single", options: [
        { id: "often", label: "Constantly", signals: [{ subdomain: "living-environment", weight: 3 }] },
        { id: "sometimes", label: "Sometimes", signals: [{ subdomain: "living-environment", weight: 1.5 }] },
        { id: "rarely", label: "Rarely" },
      ] },
      { id: "bills", prompt: "Bills and admin, how do they go?", kind: "single", options: [
        { id: "late", label: "Late fees are a regular thing", signals: [{ subdomain: "memory", weight: 2 }], contributor: { layer: "brain", subdomain: "time", note: "Admin slides out of view" } },
        { id: "close", label: "Close calls, mostly caught", signals: [{ subdomain: "memory", weight: 1 }] },
        { id: "fine", label: "Automated or handled", strength: "Admin is systemised" },
      ] },
      { id: "capture", prompt: "Do you have one place you write things down?", kind: "single", options: [
        { id: "one", label: "Yes, one place", strength: "One capture place exists", claims: { "capture": true } },
        { id: "several", label: "Several, which is nearly none", contributor: { layer: "environment", subdomain: "structure", note: "Capture is scattered across places" } },
        { id: "none", label: "Not really", contributor: { layer: "environment", subdomain: "structure", note: "No capture place outside your head" }, claims: { "capture": false } },
      ] },
      { id: "anchors", prompt: "Are routine jobs fixed to a time or a place?", kind: "single", options: yesNo("anchors",
        { id: "yes", label: "Yes, bins go out with the kettle", strength: "Routines are anchored" },
        { id: "no", label: "No, they happen when I remember", contributor: { layer: "environment", subdomain: "structure", note: "Jobs float without anchors" }, signals: [{ subdomain: "living-environment", weight: 1 }] },
      ) },
      { id: "holds", prompt: "Who holds the household list?", kind: "single", options: [
        { id: "me", label: "Me", contributor: { layer: "brain", subdomain: "memory", note: "The household list lives in your head" } },
        { id: "partner", label: "A partner or flatmate", contributor: { layer: "people", subdomain: "partner", note: "A partner or flatmate holds the household list" } },
        { id: "shared", label: "It is shared and visible", strength: "A shared visible list" },
        { id: "nobody", label: "Nobody", contributor: { layer: "environment", subdomain: "structure", note: "Nobody holds the household list" } },
      ] },
      { id: "visible", prompt: "Do things you need to remember stay in sight?", kind: "single", options: [
        { id: "yes", label: "Yes, out on a surface", strength: "Keeps things visible" },
        { id: "hidden", label: "They go in a drawer and vanish", contributor: { layer: "environment", subdomain: "living-environment", note: "Out of sight is out of mind" }, signals: [{ subdomain: "memory", weight: 1 }] },
      ] },
      { id: "money", prompt: "Money, where does it go wrong, if anywhere?", kind: "single", options: [
        { id: "impulse", label: "Impulse spending", signals: [{ subdomain: "inhibition", weight: 2 }], contributor: { layer: "brain", subdomain: "inhibition", note: "Spending before the pause" } },
        { id: "admin", label: "Forgetting to pay or cancel", signals: [{ subdomain: "memory", weight: 1 }] },
        { id: "fine", label: "It is fine", strength: "Money is under control" },
      ] },
      { id: "worst-time", prompt: "When does organisation fall apart most?", kind: "single", options: [
        { id: "tired", label: "When I am tired", contributor: { layer: "body", subdomain: "sleep", note: "Organisation falls apart when tired" } },
        { id: "busy", label: "When work is heavy", contributor: { layer: "environment", subdomain: "workload", note: "Workload crowds out the household" } },
        { id: "alone", label: "When I am on my own", contributor: { layer: "people", subdomain: "peers", note: "Harder without company" } },
        { id: "always", label: "It is always like this" },
      ] },
      { id: "consequence", prompt: "How much does this affect your day-to-day life?", kind: "scale", costFor: "living-environment", note: "0 is not at all, 10 is constantly." },
    ],
  },
  {
    id: "sleep",
    title: DOMAIN_LABELS["sleep-body"],
    domain: "sleep-body",
    resultTitle: "Your sleep pattern",
    minutes: 2,
    tryNext: "fixed-wake",
    exploreNext: "sleep",
    questions: [
      { id: "late", prompt: "When do you usually fall asleep on a weeknight?", kind: "single", options: [
        { id: "before-11", label: "Before eleven" },
        { id: "midnight", label: "Around midnight", signals: [{ subdomain: "sleep", weight: 1 }] },
        { id: "after-1", label: "After one", signals: [{ subdomain: "sleep", weight: 2.5 }], contributor: { layer: "body", subdomain: "sleep", note: "The body clock runs late" } },
      ] },
      { id: "keeps", prompt: "What keeps the night going?", kind: "single", options: [
        { id: "work", label: "Finally getting things done", contributor: { layer: "environment", subdomain: "workload", note: "Work spills into the night" } },
        { id: "screens", label: "Screens", contributor: { layer: "environment", subdomain: "noise", note: "Screens hold the night open" } },
        { id: "quiet", label: "The quiet, attention finally works", contributor: { layer: "environment", subdomain: "noise", note: "The night is the only quiet time" }, strength: "Clear focus in quiet" },
        { id: "cannot-stop", label: "I cannot stop whatever I am doing", contributor: { layer: "brain", subdomain: "attention", note: "Hyperfocus runs past bedtime" } },
      ] },
      { id: "wake", prompt: "Is your wake time the same most days?", kind: "single", options: yesNo("wake",
        { id: "yes", label: "Yes, within an hour", strength: "A steady wake time", claims: { "fixed-wake": true } },
        { id: "no", label: "No, it moves a lot", contributor: { layer: "environment", subdomain: "structure", note: "No fixed wake time" }, signals: [{ subdomain: "sleep", weight: 1 }], claims: { "fixed-wake": false } },
      ) },
      { id: "short", prompt: "After a short night, what suffers most?", kind: "single", options: [
        { id: "attention", label: "Attention", contributor: { layer: "body", subdomain: "sleep", note: "Short nights cost attention" } },
        { id: "mood", label: "Mood", contributor: { layer: "body", subdomain: "sleep", note: "Short nights cost mood" } },
        { id: "starting", label: "Starting anything", contributor: { layer: "body", subdomain: "sleep", note: "Short nights raise the start threshold" } },
        { id: "memory", label: "Memory", contributor: { layer: "body", subdomain: "sleep", note: "Short nights shrink working memory" } },
      ] },
      { id: "light", prompt: "Do you get daylight within an hour of waking?", kind: "single", options: yesNo("light",
        { id: "yes", label: "Usually", strength: "Morning light is already in the routine" },
        { id: "no", label: "Rarely", contributor: { layer: "environment", subdomain: "living-environment", note: "Little morning light" } },
      ) },
      { id: "medication", prompt: "If you take medication, does it change your sleep?", kind: "single", options: [
        { id: "later", label: "Yes, I fall asleep later", contributor: { layer: "body", subdomain: "medication-experience", note: "Medication seems to push sleep later" } },
        { id: "no", label: "Not noticeably" },
        { id: "na", label: "I do not take medication" },
        { id: "unsure", label: "Not sure" },
      ] },
      { id: "movement", prompt: "Do you move your body most days?", kind: "single", options: yesNo("movement",
        { id: "yes", label: "Most days", strength: "Regular movement" },
        { id: "no", label: "Rarely", contributor: { layer: "body", subdomain: "movement", note: "Little regular movement" }, signals: [{ subdomain: "movement", weight: 1 }] },
      ) },
      { id: "consequence", prompt: "How much is sleep affecting the rest of your life?", kind: "scale", costFor: "sleep", note: "0 is not at all, 10 is constantly." },
    ],
  },
  {
    id: "emotional-wellbeing",
    title: DOMAIN_LABELS["mind-emotions"],
    domain: "mind-emotions",
    resultTitle: "Your emotional pattern",
    minutes: 3,
    tryNext: "agreed-pause",
    exploreNext: "conflict",
    questions: [
      { id: "speed", prompt: "How fast do strong feelings arrive?", kind: "single", options: [
        { id: "instant", label: "Instantly, before I can think", signals: [{ subdomain: "emotional-regulation", weight: 3 }] },
        { id: "fast", label: "Fast, but I usually catch them", signals: [{ subdomain: "emotional-regulation", weight: 1.5 }] },
        { id: "slow", label: "They build slowly" },
      ] },
      { id: "settle", prompt: "How long do they take to settle?", kind: "single", options: [
        { id: "hours", label: "Hours, sometimes the whole day", signals: [{ subdomain: "emotional-regulation", weight: 2 }] },
        { id: "while", label: "A while" },
        { id: "quick", label: "Quickly", strength: "Feelings settle quickly" },
      ] },
      { id: "overwhelm", prompt: "How often do you feel overwhelmed by ordinary days?", kind: "single", options: [
        { id: "most", label: "Most days", signals: [{ subdomain: "emotional-regulation", weight: 2 }], contributor: { layer: "environment", subdomain: "workload", note: "Ordinary days overwhelm" } },
        { id: "some", label: "Some days", signals: [{ subdomain: "emotional-regulation", weight: 1 }] },
        { id: "rarely", label: "Rarely" },
      ] },
      { id: "trigger", prompt: "What most reliably lights it?", kind: "single", options: [
        { id: "criticism", label: "Anything that sounds like criticism", contributor: { layer: "brain", subdomain: "emotional-regulation", note: "Anything like criticism lights it" } },
        { id: "tired", label: "Being tired or hungry", contributor: { layer: "body", subdomain: "sleep", note: "Tired or hungry lights it" } },
        { id: "interrupted", label: "Being interrupted", contributor: { layer: "environment", subdomain: "noise", note: "Interruption lights it" } },
        { id: "unfair", label: "Feeling unfairly judged", contributor: { layer: "people", subdomain: "manager", note: "Feeling judged lights it" } },
      ] },
      { id: "shame", prompt: "After things go wrong, do you turn on yourself?", kind: "single", options: [
        { id: "often", label: "Often", contributor: { layer: "brain", subdomain: "emotional-regulation", note: "Self-criticism follows mistakes" }, signals: [{ subdomain: "emotional-regulation", weight: 1 }] },
        { id: "sometimes", label: "Sometimes" },
        { id: "rarely", label: "Rarely", strength: "Kind to yourself after mistakes" },
      ] },
      { id: "helps", prompt: "What helps most when it is heavy?", kind: "single", options: [
        { id: "person", label: "Talking to a person", strength: "Reaches for people", contributor: { layer: "people", subdomain: "peers", note: "Talking to a person helps" } },
        { id: "movement", label: "Moving my body", strength: "Movement steadies mood", contributor: { layer: "body", subdomain: "movement", note: "Movement steadies mood" } },
        { id: "alone", label: "Time alone", strength: "Knows when to withdraw" },
        { id: "nothing", label: "Nothing reliably", contributor: { layer: "brain", subdomain: "emotional-regulation", note: "Nothing reliably helps yet" } },
      ] },
      { id: "pause", prompt: "Is there an agreed way to pause with the people close to you?", kind: "single", options: yesNo("pause",
        { id: "yes", label: "Yes", strength: "An agreed pause exists", claims: { "pause": true } },
        { id: "no", label: "No", contributor: { layer: "people", subdomain: "partner", note: "No agreed pause yet" }, claims: { "pause": false } },
      ) },
      { id: "talked", prompt: "Have you talked to anyone professionally about this side of things?", kind: "single", options: [
        { id: "yes", label: "Yes, and it helped", strength: "Has support that helps", contributor: { layer: "people", subdomain: "clinicians", note: "Professional support already helps" } },
        { id: "not-helpful", label: "Yes, but it did not fit", contributor: { layer: "people", subdomain: "clinicians", note: "Previous support did not fit" } },
        { id: "no", label: "No" },
      ] },
      { id: "consequence", prompt: "How much is this affecting your life right now?", kind: "scale", costFor: "emotional-regulation", note: "0 is not at all, 10 is constantly." },
    ],
  },
];

export function topicSurvey(id: string): TopicSurvey | undefined {
  return TOPIC_SURVEYS.find((s) => s.id === id);
}

/** The survey for a domain, if one exists. */
export function surveyForDomain(domain: Domain): TopicSurvey | undefined {
  return TOPIC_SURVEYS.find((s) => s.domain === domain);
}

/** Every string a survey renders, for the linters. */
export function surveyText(survey: TopicSurvey): string[] {
  return [survey.title, survey.resultTitle, ...survey.questions.flatMap((q) => [q.prompt, q.note ?? "", ...(q.options ?? []).flatMap((o) => [o.label, o.contributor?.note ?? "", o.strength ?? ""])])].filter(Boolean);
}
