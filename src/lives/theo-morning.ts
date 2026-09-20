/** The standalone morning simulation. All durations are seconds; no wall clock or storage. */
export type Room = "hall" | "kitchen" | "bedroom" | "living" | "door";
export type Essential = "keys" | "phone" | "bottle";
export type Place = Room | "hand" | "bag";
export type Demand = "laundry" | "plant" | "email";
export type Command = Essential | "bag" | "shoes" | "door" | "spill" | "later" | "breathe" | "message" | "umbrella" | Demand;
export type MorningPhase = "morning" | "departure" | "evening" | "revisit" | "complete";
export const ESSENTIALS: Essential[] = ["keys", "phone", "bottle"];
export const ROOMS: Room[] = ["hall", "kitchen", "bedroom", "living", "door"];
export const POINTS: Record<Room, { x: number; y: number }> = {
  hall: { x: 50, y: 48 }, kitchen: { x: 22, y: 37 }, bedroom: { x: 78, y: 37 },
  living: { x: 22, y: 89 }, door: { x: 78, y: 89 },
};
export const ROOM_NAMES: Record<Room, string> = { hall: "Hall", kitchen: "Kitchen", bedroom: "Bedroom", living: "Living room", door: "Door" };
export const ITEM_NAMES: Record<Essential, string> = { keys: "Keys", phone: "Phone", bottle: "Water" };
export const DEMANDS: Record<Demand, { at: number; room: Room; title: string }> = {
  laundry: { at: 11, room: "bedroom", title: "Fold laundry" },
  plant: { at: 28, room: "living", title: "Water plant" },
  email: { at: 43, room: "kitchen", title: "Check email" },
};
const EDGE: Record<Room, number> = { hall: 0, kitchen: 3.4, bedroom: 3.8, living: 2.8, door: 2.2 };
export interface TheoMorning {
  phase: MorningPhase; attempt: number; paused: boolean; still: boolean;
  elapsed: number; deadline: number; node: Room; trips: number;
  travel: null | { from: Room; to: Room; elapsed: number; duration: number };
  work: null | { command: Command; elapsed: number; duration: number };
  intent: Command | null;
  items: Record<Essential, Place>; plugged: boolean; charge: number; filled: boolean;
  shoes: boolean; umbrella: boolean; spill: "waiting" | "wet" | "clear";
  demands: Demand[]; handled: Demand[]; load: number; updated: boolean;
  homes: Partial<Record<Essential, Room>>; cue: boolean; note: boolean;
  first: null | { trips: number; elapsed: number; caught: boolean; updated: boolean };
  line: string;
}
export function createMorning(attempt = 0, still = false): TheoMorning {
  const layouts: Array<Record<Essential, Place>> = [
    { keys: "living", phone: "bedroom", bottle: "kitchen" },
    { keys: "kitchen", phone: "living", bottle: "kitchen" },
    { keys: "bedroom", phone: "living", bottle: "kitchen" },
  ];
  return { phase: "morning", attempt, paused: false, still, elapsed: 0, deadline: 70,
    node: "hall", trips: 0, travel: null, work: null, intent: null,
    items: { ...layouts[attempt % layouts.length]! }, plugged: false, charge: 0, filled: false,
    shoes: false, umbrella: false, spill: "waiting", demands: [], handled: [], load: 12,
    updated: false, homes: {}, cue: false, note: false, first: null,
    line: "Phone flat. Ari’s waiting at the station.",
  };
}
export const isMorning = (s: TheoMorning) => s.phase === "morning" || s.phase === "revisit";
export const carrying = (s: TheoMorning) => ESSENTIALS.filter(k => s.items[k] === "hand");
export const packed = (s: TheoMorning) => ESSENTIALS.filter(k => s.items[k] === "bag");
export const canLeave = (s: TheoMorning) => packed(s).length === 3 && s.shoes && (s.phase !== "revisit" || s.umbrella);
export function destination(s: TheoMorning, command: Command): Room {
  if (ESSENTIALS.includes(command as Essential)) {
    const place = s.items[command as Essential];
    return place === "hand" || place === "bag" ? s.node : place;
  }
  if (command in DEMANDS) return DEMANDS[command as Demand].room;
  if (command === "shoes" || command === "door" || command === "umbrella") return "door";
  if (command === "breathe" || command === "message") return s.travel?.to ?? s.node;
  return "hall";
}
function duration(s: TheoMorning, c: Command) {
  if (c in DEMANDS) return 7;
  if (c === "phone") return s.plugged ? Math.max(1.5, (1 - s.charge) * 16 + 1.5) : s.charge >= 1 ? 1.5 : 2;
  if (c === "bottle") return s.filled ? 1.5 : 4;
  return ({ keys: 1.5, bag: 1.5, shoes: 4.5, door: 1, spill: 4, later: 1.5, breathe: 3, message: 1.5, umbrella: 1.5 } as Partial<Record<Command, number>>)[c] ?? 1.5;
}
export function commandLabel(s: TheoMorning, c: Command): string {
  if (c in DEMANDS) return DEMANDS[c as Demand].title;
  if (c === "phone") return s.charge >= 1 ? "Take phone" : s.plugged ? "Wait for phone" : "Charge phone";
  if (c === "bottle") return s.filled ? "Take water" : "Fill water";
  return { keys: "Take keys", bag: "Pack bag", shoes: "Put shoes on", door: "Leave", spill: "Clear spill", later: "Park for later", breathe: "Take a breath", message: "Update Ari", umbrella: "Take umbrella", laundry: "Fold laundry", plant: "Water plant", email: "Check email" }[c];
}
function valid(s: TheoMorning, c: Command): string | null {
  if (ESSENTIALS.includes(c as Essential)) {
    if (["hand", "bag"].includes(s.items[c as Essential])) return "Already picked up.";
    if (carrying(s).length >= 2 && !(c === "phone" && !s.plugged && s.charge < 1)) return "Hands full. Make room in the bag.";
  }
  if (c === "bag" && !carrying(s).length) return "Bring your essentials to the bag.";
  if (c === "shoes" && s.shoes) return "Shoes are on.";
  if (c === "umbrella" && (s.phase !== "revisit" || s.umbrella)) return "Umbrella ready.";
  if (c === "spill" && s.spill !== "wet") return "The path is clear.";
  if (c === "later" && !s.demands.length) return "Nothing waiting. Keep going.";
  if (c in DEMANDS && !s.demands.includes(c as Demand)) return "That can wait.";
  if (c === "message" && s.updated) return "Ari will meet you inside.";
  if (c === "door" && !canLeave(s)) return packed(s).length < 3 ? "Three essentials in the bag first." : !s.shoes ? "Shoes before the door." : "It’s raining. Grab the umbrella.";
  return null;
}
function begin(s: TheoMorning): TheoMorning {
  if (!s.intent) return s;
  const problem = valid(s, s.intent);
  if (problem) return { ...s, intent: null, work: null, line: problem };
  const target = destination(s, s.intent);
  if (s.node !== target) {
    const next = s.node === "hall" ? target : "hall";
    const edge = s.node === "hall" ? next : s.node;
    return { ...s, trips: s.trips + 1, travel: { from: s.node, to: next, elapsed: 0, duration: EDGE[edge] + (s.spill === "wet" ? 1.3 : 0) } };
  }
  return { ...s, work: { command: s.intent, elapsed: 0, duration: duration(s, s.intent) + (s.load > 68 && s.intent !== "breathe" ? .8 : 0) } };
}
export function choose(s: TheoMorning, command: Command): TheoMorning {
  if (!isMorning(s) || s.paused || s.intent === command) return s;
  const problem = valid(s, command);
  if (problem) return { ...s, line: problem };
  let next: TheoMorning = { ...s, intent: command, work: null, load: Math.min(100, s.load + (s.intent ? 7 : 0)), line: commandLabel(s, command) + "." };
  if (!next.travel) next = begin(next);
  // Reading time never counts in still mode. Route and task costs still do.
  if (s.still) {
    for (let i = 0; i < 900 && next.intent && isMorning(next); i++) next = step(next, .1);
  }
  return next;
}
function finish(s: TheoMorning, c: Command): TheoMorning {
  let next: TheoMorning = { ...s, intent: null, work: null };
  if (c === "phone" && !s.plugged && s.charge < 1) return { ...next, plugged: true, line: "Charging. There’s time to do something else." };
  if (ESSENTIALS.includes(c as Essential)) {
    if (carrying(s).length >= 2) return { ...next, line: "Hands full. Make room in the bag." };
    const item = c as Essential;
    return { ...next, items: { ...s.items, [item]: "hand" }, ...(c === "phone" ? { plugged: false, charge: 1 } : {}), ...(c === "bottle" ? { filled: true } : {}), line: `${ITEM_NAMES[item]} in hand.` };
  }
  if (c === "bag") {
    const items = { ...s.items }; carrying(s).forEach(k => { items[k] = "bag"; });
    return { ...next, items, load: Math.max(0, s.load - 6), line: packed({ ...s, items }).length === 3 ? "Bag ready. Shoes, then the door." : "Hands free. What’s on the way?" };
  }
  if (c === "shoes") return { ...next, shoes: true, line: "Shoes on." };
  if (c === "umbrella") return { ...next, umbrella: true, line: "Ready for the rain." };
  if (c === "spill") return { ...next, spill: "clear", load: Math.max(0, s.load - 10), line: "A clear path. No more stepping around." };
  if (c === "breathe") return { ...next, load: Math.max(0, s.load - 40), line: "One thing at a time." };
  if (c === "later") return { ...next, demands: [], handled: [...s.handled, ...s.demands], load: Math.max(0, s.load - 20), line: "Written down. It can wait." };
  if (c === "message") return { ...next, updated: true, deadline: Math.max(s.elapsed, s.deadline) + 25, load: Math.max(0, s.load - 18), line: "Ari: ‘I’ll go ahead. Meet you inside.’" };
  if (c in DEMANDS) {
    const d = c as Demand;
    return { ...next, demands: s.demands.filter(k => k !== d), handled: [...s.handled, d], load: Math.max(0, s.load - 5), line: "Done. The train is still leaving." };
  }
  if (c === "door" && canLeave(s)) {
    const caught = s.elapsed <= s.deadline;
    return { ...next, phase: s.phase === "revisit" ? "complete" : "departure", first: s.first ?? { trips: s.trips, elapsed: s.elapsed, caught, updated: s.updated }, line: caught ? (s.updated ? "Ari saved you a seat inside." : "Ari: ‘There you are. Let’s go.’") : "Ari went ahead. You can meet inside." };
  }
  return next;
}
function step(state: TheoMorning, dt: number): TheoMorning {
  if (!isMorning(state) || state.paused) return state;
  let s = { ...state, elapsed: state.elapsed + dt };
  if (s.plugged) s.charge = Math.min(1, s.charge + dt / 16);
  if (s.spill === "waiting" && s.elapsed >= 20) { s.spill = "wet"; s.line = "Spilled water. Clear it, or step around?"; }
  for (const d of Object.keys(DEMANDS) as Demand[]) {
    if (s.elapsed >= DEMANDS[d].at && !s.handled.includes(d) && !s.demands.includes(d)) {
      s.demands = [...s.demands, d]; s.line = `${DEMANDS[d].title}? The train won’t wait.`;
    }
  }
  s.load = Math.min(100, Math.max(0, s.load + dt * (s.demands.length * .23 - .05)));
  if (state.elapsed < state.deadline && s.elapsed >= s.deadline) { s.line = s.updated ? "That train left. You can still get there." : "The train left. Let Ari know?"; s.load = Math.min(100, s.load + 16); }
  if (s.travel) {
    s.travel = { ...s.travel, elapsed: s.travel.elapsed + dt };
    if (s.travel.elapsed >= s.travel.duration) { s.node = s.travel.to; s.travel = null; s = begin(s); }
  } else if (s.work) {
    s.work = { ...s.work, elapsed: s.work.elapsed + dt };
    if (s.work.elapsed >= s.work.duration) s = finish(s, s.work.command);
  } else if (s.intent) s = begin(s);
  return s;
}
export function advance(s: TheoMorning, seconds: number): TheoMorning {
  if (!Number.isFinite(seconds) || seconds <= 0) return s;
  let next = s;
  for (let remaining = Math.min(seconds, 360); remaining > .00001; remaining -= .1) next = step(next, Math.min(.1, remaining));
  return next;
}
export type MorningAction = { type: "tick"; seconds: number } | { type: "choose"; command: Command } | { type: "pause"; paused: boolean } | { type: "still"; still: boolean } | { type: "evening" } | { type: "home"; item: Essential; room: Room } | { type: "cue" } | { type: "note" } | { type: "tomorrow" } | { type: "restart" };
export function morningReducer(s: TheoMorning, action: MorningAction): TheoMorning {
  switch (action.type) {
    case "tick": return s.still ? s : advance(s, action.seconds);
    case "choose": return choose(s, action.command);
    case "pause": { let next = { ...s, paused: action.paused }; if (!action.paused && next.still) for (let i = 0; i < 900 && next.intent; i++) next = step(next, .1); return next; }
    case "still": { let next = { ...s, still: action.still }; if (action.still && !next.paused) for (let i = 0; i < 900 && next.intent; i++) next = step(next, .1); return next; }
    case "evening": return s.phase === "departure" ? { ...s, phase: "evening", line: "Give tomorrow’s essentials a home." } : s;
    case "home": return s.phase === "evening" ? { ...s, homes: { ...s.homes, [action.item]: action.room }, line: action.item === "phone" ? "Plugged in for tomorrow." : action.item === "bottle" ? "Filled, ready for tomorrow." : "A place to come back to." } : s;
    case "cue": return s.phase === "evening" ? { ...s, cue: !s.cue, line: s.cue ? "Usual leaving time." : "An earlier cue. Twelve seconds of breathing room." } : s;
    case "note": return s.phase === "evening" ? { ...s, note: !s.note, line: s.note ? "Note removed." : "Laundry is on tomorrow’s later list." } : s;
    case "tomorrow": {
      if (s.phase !== "evening" || ESSENTIALS.some(k => !s.homes[k])) return s;
      return { ...createMorning(s.attempt, s.still), phase: "revisit", first: s.first, homes: s.homes, cue: s.cue, note: s.note, items: { ...s.homes } as Record<Essential, Place>, charge: 1, filled: true, deadline: 70 + (s.cue ? 12 : 0), handled: s.note ? ["laundry"] : [], line: "Same house. Your setup. And… rain." };
    }
    case "restart": return createMorning(s.attempt + 1, s.still);
  }
}
export function position(s: TheoMorning) {
  if (!s.travel) return POINTS[s.node];
  const a = POINTS[s.travel.from], b = POINTS[s.travel.to], t = Math.min(1, s.travel.elapsed / s.travel.duration);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
