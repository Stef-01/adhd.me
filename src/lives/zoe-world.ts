/** Fictional communication puzzle. Player choices never become clinical evidence. */
export const TIMES = [18, 19, 20] as const;
export type Time = typeof TIMES[number];
export type Plan = "together" | "separate" | "call";
export type Fact = "changed" | "uncertain" | "assumed";
export type Need = "company" | "notice" | "space";
export type Phase = "conversation" | "setup" | "revisit" | "complete";
export const SCENARIOS = [
  { title: "Plans changed.", message: "Rae: ‘Can we move dinner?’", answer: "‘Work ran late. I’m free after seven.’", fact: "Dinner moved", reason: "Work ran late", available: [19,20], unavailable: "‘I’m still working at six.’", revisit: "‘The bus is late. Could we make it eight?’", next: 20 },
  { title: "Still waiting.", message: "Rae: ‘I forgot our call.’", answer: "‘I’m sorry. I can call at six or eight.’", fact: "Call missed", reason: "Rae forgot", available: [18,20], unavailable: "‘Seven is already booked.’", revisit: "‘Something came up. Could we call at eight?’", next: 20 },
  { title: "Whose turn?", message: "Rae: ‘I thought you were getting dinner.’", answer: "‘We never agreed. I can help after seven.’", fact: "No agreed owner", reason: "An assumption", available: [19,20], unavailable: "‘I can’t help before seven.’", revisit: "‘Running late. Could we plan it at eight?’", next: 20 },
] as const;
export interface ZoeWorld {
  scenario: number; phase: Phase; paused: boolean; known: boolean; saved: boolean;
  savedDraft: ZoeWorld["draft"] | null; sharp: boolean; repaired: boolean; attempts: number;
  draft: { fact: Fact | null; need: Need | null; plan: Plan | null; time: Time };
  agreement: { plan: Plan; time: Time; owner: "zoe" | "rae" | null; cue: "calendar" | "phone" | null } | null;
  setup: "owner" | "cue" | "ready"; message: string; history: string[]; outcome: "adjusted" | "boundary" | null;
}
export type ZoeAction = { type: "fact"; value: Fact } | { type: "need"; value: Need } | { type: "plan"; value: Plan } | { type: "time"; value: Time } | { type: "owner"; value: "zoe" | "rae" } | { type: "cue"; value: "calendar" | "phone" } | { type: "pause"; value: boolean } | { type: "ask" | "save" | "restore" | "sharp" | "repair" | "send" | "tomorrow" | "adjust" | "boundary" | "restart" };
export function createZoe(scenario = 0): ZoeWorld {
  return { scenario: scenario % SCENARIOS.length, phase: "conversation", paused: false, known: false, saved: false, savedDraft: null, sharp: false, repaired: false, attempts: 0, draft: { fact: null, need: null, plan: null, time: 18 }, agreement: null, setup: "owner", message: SCENARIOS[scenario % SCENARIOS.length]!.message, history: [], outcome: null };
}
function reply(s: ZoeWorld, message: string): ZoeWorld { return { ...s, message, history: [...s.history, s.message].slice(-6) }; }
export function zoeReducer(s: ZoeWorld, a: ZoeAction): ZoeWorld {
  if (a.type === "pause") return { ...s, paused: a.value };
  if (s.paused) return s;
  if (a.type === "restart") return s.phase === "complete" ? createZoe(s.scenario + 1) : s;
  if (s.phase === "conversation") {
    if (["fact","need","plan","time"].includes(a.type)) {
      if (a.type === "fact" && a.value === "changed" && !s.known) return reply(s, "Ask what changed, or leave room for uncertainty.");
      if (a.type === "fact" || a.type === "need" || a.type === "plan" || a.type === "time") return { ...s, draft: { ...s.draft, [a.type]: a.value } };
    }
    if (a.type === "ask") return { ...reply(s, SCENARIOS[s.scenario]!.answer), known: true };
    if (a.type === "save") return { ...reply(s, "Draft kept. Your feeling can stay; the reply can wait."), saved: true, savedDraft: { ...s.draft } };
    if (a.type === "restore") return s.savedDraft ? { ...reply(s, "Your earlier draft is back. Change what you need."), draft: { ...s.savedDraft } } : s;
    if (a.type === "sharp") return { ...reply(s, "Rae: ‘That hurt. I need us to start again.’"), sharp: true, repaired: false };
    if (a.type === "repair") return s.sharp ? { ...reply(s, "‘Thank you. Let’s work out what’s possible.’"), repaired: true } : s;
    if (a.type === "send") {
      if (!s.draft.fact || !s.draft.need || !s.draft.plan) return reply(s, "One fact, one need, one request.");
      if (s.sharp && !s.repaired) return reply(s, "Rae needs the sharp reply acknowledged first.");
      const next = { ...s, attempts: s.attempts + 1 };
      if (s.draft.fact === "assumed") return { ...reply(next, "‘That’s not what I meant. Please ask me.’"), known: true };
      if (s.draft.plan !== "separate" && !(SCENARIOS[s.scenario]!.available as readonly number[]).includes(s.draft.time)) return { ...reply(next, SCENARIOS[s.scenario]!.unavailable), known: true };
      if (s.draft.plan === "together" && s.draft.time === 20 && s.draft.need !== "space") return reply(next, "‘At eight I only have time for a short call.’");
      return { ...reply(next, s.draft.plan === "separate" ? "‘Okay. Separate plans tonight. Let’s check in later.’" : (s.draft.need === "space" ? "‘We can keep it brief. There’s room for some space.’" : s.draft.need === "notice" ? "‘Agreed. Let’s give changes a clear check-in.’" : "‘I’d like time together too. Let’s keep that plan.’")), phase: "setup", agreement: { plan: s.draft.plan, time: s.draft.time, owner: null, cue: null } };
    }
  }
  if (s.phase === "setup" && s.agreement) {
    if (a.type === "owner") return { ...reply(s, a.value === "zoe" ? "Zoe will check in. Rae will reply." : "Rae will check in. Zoe will reply."), setup: "cue", agreement: { ...s.agreement, owner: a.value } };
    if (a.type === "cue" && s.agreement.owner) return { ...reply(s, a.value === "calendar" ? "The plan has a place in the calendar." : "One reminder, beside the saved plan."), setup: "ready", agreement: { ...s.agreement, cue: a.value } };
    if (a.type === "tomorrow" && s.agreement.owner && s.agreement.cue) return { ...reply(s, SCENARIOS[s.scenario]!.revisit), phase: "revisit" };
  }
  if (s.phase === "revisit" && s.agreement) {
    if (a.type === "adjust") return { ...reply(s, "A new time. The owner and reminder stay."), phase: "complete", outcome: "adjusted", agreement: { ...s.agreement, time: SCENARIOS[s.scenario]!.next } };
    if (a.type === "boundary") return { ...reply(s, "‘Understood. We’ll keep our own plans tonight.’"), phase: "complete", outcome: "boundary", agreement: { ...s.agreement, plan: "separate" } };
  }
  return s;
}
