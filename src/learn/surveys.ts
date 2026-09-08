// The five topic surveys (PRD §22–§23, §60) as data: Work & Study, Relationships, Daily
// Organisation, Sleep, Emotional Wellbeing. Eight to twelve questions each, two to four minutes,
// offered — never launched — from My ADHD and the support path.
//
// WHAT A SURVEY IS HERE. Level 3 of the progressive survey system: enough questions to say which
// part of a domain is the friction, what amplifies it, what contributes, and what is working —
// the §23 "Your work pattern" shape. Every option carries the SIGNALS it is evidence for
// (subdomain and weight), an optional CONTRIBUTOR (a layer and a note the model keeps), an
// optional STRENGTH, and optional CLAIMS the scorer uses to notice when two answers contradict
// each other. Nothing here is a symptom scale and nothing produces a diagnosis; the scorer
// (`src/model/surveys.ts`) says so in its output shape, which has no total.

import type { Domain, Layer, Subdomain } from "@/model/layers";

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
}

const yesNo = (id: string, yes: SurveyOption, no: SurveyOption, sometimes?: SurveyOption): SurveyOption[] =>
  [yes, ...(sometimes ? [sometimes] : []), no].map((o) => ({ ...o, id: `${id}-${o.id}` }));

export const TOPIC_SURVEYS: readonly TopicSurvey[] = [
  {
    id: "work-study",
    title: "Work & Study",
    domain: "work-study",
    resultTitle: "Your work pattern",
    minutes: 3,
    tryNext: "first-physical-action",
    exploreNext: "deadlines",
    questions: [
      { id: "initiation", prompt: "How hard is it to begin important work?", kind: "single", options: [
        { id: "very", label: "Very — I circle it for ages", signals: [{ subdomain: "activation", weight: 3 }] },
        { id: "somewhat", label: "Somewhat, on a bad day", signals: [{ subdomain: "activation", weight: 1.5 }] },
        { id: "not", label: "Not really", signals: [] },
      ] },
      { id: "ambiguity", prompt: "Are unclear tasks harder to start than clear ones?", kind: "single", options: yesNo("ambiguity",
        { id: "yes", label: "Much harder", signals: [{ subdomain: "activation", weight: 2 }], contributor: { layer: "environment", subdomain: "structure", note: "Activation for ambiguous tasks" }, claims: { "clarity-helps": true } },
        { id: "no", label: "About the same", claims: { "clarity-helps": false } },
        { id: "some", label: "A bit harder", signals: [{ subdomain: "activation", weight: 1 }] },
      ) },
      { id: "urgency", prompt: "Do deadlines improve your ability to start?", kind: "single", options: yesNo("urgency",
        { id: "yes", label: "Yes — the night before is when I work", signals: [{ subdomain: "time", weight: 2 }], contributor: { layer: "environment", subdomain: "deadline-design", note: "Waiting for urgency" }, strength: "Fast, high-quality output under a close deadline", claims: { "deadlines-help": true } },
        { id: "no", label: "No, deadlines just add stress", claims: { "deadlines-help": false } },
        { id: "some", label: "Sometimes", signals: [{ subdomain: "time", weight: 1 }] },
      ) },
      { id: "interruption", prompt: "After an interruption, how hard is it to get back in?", kind: "single", options: [
        { id: "hard", label: "Very hard — I often do not", signals: [{ subdomain: "switching", weight: 3 }] },
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
        { id: "little", label: "Very little — I set my own days", contributor: { layer: "environment", subdomain: "structure", note: "Long stretches with little external structure" }, signals: [{ subdomain: "activation", weight: 1 }] },
        { id: "some", label: "Some fixed points" },
        { id: "lots", label: "A lot — fixed times and check-ins", strength: "Performs well inside structure" },
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
        { id: "yes", label: "Yes — it has to be right before I can start", contributor: { layer: "brain", subdomain: "emotional-regulation", note: "Perfectionistic starting threshold" }, signals: [{ subdomain: "activation", weight: 1.5 }] },
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
    title: "Relationships",
    domain: "relationships",
    resultTitle: "Your relationship pattern",
    minutes: 3,
    tryNext: "name-the-drift",
    exploreNext: "not-listening",
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
        { id: "fast", label: "Very fast — before I can think", signals: [{ subdomain: "emotional-regulation", weight: 3 }] },
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
    title: "Daily Organisation",
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
      { id: "bills", prompt: "Bills and admin — how do they go?", kind: "single", options: [
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
        { id: "yes", label: "Yes — bins go out with the kettle", strength: "Routines are anchored" },
        { id: "no", label: "No, they happen when I remember", contributor: { layer: "environment", subdomain: "structure", note: "Jobs float without anchors" }, signals: [{ subdomain: "living-environment", weight: 1 }] },
      ) },
      { id: "holds", prompt: "Who holds the household list?", kind: "single", options: [
        { id: "me", label: "Me", contributor: { layer: "brain", subdomain: "memory", note: "The household list lives in your head" } },
        { id: "partner", label: "A partner or flatmate", contributor: { layer: "people", subdomain: "partner", note: "A partner or flatmate holds the household list" } },
        { id: "shared", label: "It is shared and visible", strength: "A shared visible list" },
        { id: "nobody", label: "Nobody", contributor: { layer: "environment", subdomain: "structure", note: "Nobody holds the household list" } },
      ] },
      { id: "visible", prompt: "Do things you need to remember stay in sight?", kind: "single", options: [
        { id: "yes", label: "Yes — out on a surface", strength: "Keeps things visible" },
        { id: "hidden", label: "They go in a drawer and vanish", contributor: { layer: "environment", subdomain: "living-environment", note: "Out of sight is out of mind" }, signals: [{ subdomain: "memory", weight: 1 }] },
      ] },
      { id: "money", prompt: "Money — where does it go wrong, if anywhere?", kind: "single", options: [
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
    title: "Sleep",
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
        { id: "quiet", label: "The quiet — attention finally works", contributor: { layer: "environment", subdomain: "noise", note: "The night is the only quiet time" }, strength: "Clear focus in quiet" },
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
        { id: "later", label: "Yes — I fall asleep later", contributor: { layer: "body", subdomain: "medication-experience", note: "Medication seems to push sleep later" } },
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
    title: "Emotional Wellbeing",
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
