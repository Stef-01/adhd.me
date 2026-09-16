export type RoomMode = "challenge" | "recovery" | "wind-down" | "rest" | "revisit" | "complete";
export type InsectKind = "scout" | "hoverer";
export interface RoomInsect { id: number; slot: number; kind: InsectKind; arrivedAt: number }
export interface RoomEvent { id: string; at: number; kind: "insects" | "phone"; amount: number }
export interface BedroomState {
  version: 1;
  scenario: number;
  mode: RoomMode;
  time: number;
  challengeTime: number;
  paused: boolean;
  still: boolean;
  window: "open" | "secured";
  phone: "available" | "parked";
  notifications: number;
  book: { open: boolean; page: number };
  lamp: "reading" | "dim" | "off";
  headphones: boolean;
  insects: readonly RoomInsect[];
  events: readonly RoomEvent[];
  nextId: number;
  activation: number;
  caught: number;
  prevented: number;
  held: number;
  line: string;
  revision: number;
}
export type BedroomAction =
  | { type: "tick"; ms: number }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "restart" }
  | { type: "still"; value: boolean }
  | { type: "catch"; id: number }
  | { type: "window" }
  | { type: "phone" }
  | { type: "book" }
  | { type: "light" }
  | { type: "headphones" }
  | { type: "recover" }
  | { type: "next-evening" };

export const ROOM_DURATION = 60_000;
export const PERCHES = [
  { x: 13, y: 15 }, { x: 36, y: 14 }, { x: 58, y: 34 },
  { x: 13, y: 34 }, { x: 36, y: 36 }, { x: 58, y: 13 },
] as const;

export function createBedroom(scenario = 0, still = false): BedroomState {
  const variant = ((scenario % 3) + 3) % 3;
  const count = variant === 1 ? 4 : variant === 2 ? 2 : 3;
  return {
    version: 1, scenario: variant, mode: "challenge", time: 0, challengeTime: 0,
    paused: false, still, window: variant === 1 ? "secured" : "open",
    phone: "available", notifications: variant === 2 ? 2 : 0,
    book: { open: false, page: 0 }, lamp: "reading", headphones: false,
    insects: Array.from({ length: count }, (_, id) => ({ id, slot: id, kind: id % 2 ? "hoverer" : "scout", arrivedAt: 0 })),
    events: [
      { id: "arrival-1", at: 6000, kind: "insects", amount: 2 },
      { id: "phone-1", at: 10_000, kind: "phone", amount: 1 },
      { id: "arrival-2", at: 18_000, kind: "insects", amount: 3 },
      { id: "phone-2", at: 28_000, kind: "phone", amount: 1 },
      { id: "arrival-3", at: 38_000, kind: "insects", amount: 2 },
      { id: "phone-3", at: 48_000, kind: "phone", amount: 1 },
    ],
    nextId: count, activation: .12, caught: 0, prevented: 0, held: 0,
    line: variant === 1 ? "Window shut. A few are already inside." : variant === 2 ? "The phone has ideas. So do the mosquitoes." : "Catch what’s here. Stop what comes next.", revision: 0,
  };
}

export function manageable(s: BedroomState) {
  return s.window === "secured" && s.phone === "parked" && s.insects.length === 0;
}
export function roomMood(s: BedroomState) {
  if (s.mode === "rest" || s.mode === "complete") return "resting";
  if (s.book.open && manageable(s)) return "reading";
  if (s.activation > .72) return "overwhelmed";
  if (s.activation > .38) return "irritated";
  if (s.insects.length) return "tracking";
  return "settling";
}

function reconcile(s: BedroomState): BedroomState {
  if (s.mode === "rest" || s.mode === "complete") return s;
  if (manageable(s)) {
    const target = s.mode === "revisit" ? 3 : 2;
    if (s.book.page >= target && s.lamp === "off") return {
      ...s, mode: s.mode === "revisit" ? "complete" : "rest", activation: .08,
      book: { ...s.book, open: false }, events: [],
      line: s.mode === "revisit" ? "You kept the changes. Leo found his place again." : "The room is ready. Nothing else to chase.",
    };
    if (s.mode === "challenge" || s.mode === "recovery") return {
      ...s, mode: "wind-down", activation: Math.min(s.activation, .55), events: [],
      line: s.book.page >= 2 ? "A bookmark for tomorrow. Lights out when you’re ready." : "A little reading. The rest can wait.",
    };
  }
  return s;
}

function advance(s: BedroomState, ms: number, decision = false): BedroomState {
  if (s.paused || s.mode === "rest" || s.mode === "complete" || (!decision && s.still)) return s;
  const time = s.time + ms;
  const active = s.mode === "challenge";
  let next: BedroomState = { ...s, time, challengeTime: active && !s.still ? Math.min(ROOM_DURATION, s.challengeTime + ms) : s.challengeTime };
  const later: RoomEvent[] = [];
  for (const event of s.events) {
    if (event.at > time) { later.push(event); continue; }
    if (event.kind === "phone") {
      if (next.phone === "parked") next.held += event.amount;
      else {
        next.notifications = Math.min(3, next.notifications + event.amount);
        if (s.still) next.activation = Math.min(.9, next.activation + .07 * event.amount);
        next.line = "Another ping. You can give the phone a home.";
        next.revision++;
      }
    } else if (next.window === "secured") {
      next.prevented += event.amount;
      next.line = "They’re outside. The window is doing its job.";
      next.revision++;
    } else {
      const free = PERCHES.map((_, n) => n).filter(slot => !next.insects.some(i => i.slot === slot));
      const admitted = Math.min(free.length, event.amount);
      next.insects = [...next.insects, ...free.slice(0, admitted).map((slot, n): RoomInsect => ({ id: next.nextId + n, slot, kind: (next.nextId + n) % 2 ? "hoverer" : "scout", arrivedAt: time }))];
      next.nextId += admitted;
      if (s.still) next.activation = Math.min(.9, next.activation + .07 * admitted);
      if (admitted) { next.line = "More at the window. Catch, or close the source."; next.revision++; }
      if (admitted < event.amount && active) later.push({ ...event, at: time + 3000, amount: event.amount - admitted });
    }
  }
  next.events = later;
  if (!s.still) {
    const demand = next.insects.reduce((v, i) => v + (i.kind === "hoverer" ? 1.35 : 1), 0) + next.notifications * .7;
    const rate = demand ? demand * .008 - (next.headphones ? .004 : 0) : -.085;
    next.activation = Math.max(.06, Math.min(.96, s.activation + rate * ms / 1000));
    if (active && (next.challengeTime >= ROOM_DURATION || next.activation >= .96)) {
      next = { ...next, mode: "recovery", events: [], line: "Take the time you need. Change the room.", revision: next.revision + 1 };
    }
  }
  return reconcile(next);
}

export function bedroomReducer(s: BedroomState, action: BedroomAction): BedroomState {
  if (action.type === "pause") return s.paused ? s : { ...s, paused: true };
  if (action.type === "resume") return !s.paused ? s : { ...s, paused: false };
  if (action.type === "restart") return createBedroom(s.scenario + 1, s.still);
  if (action.type === "still") return s.still === action.value ? s : { ...s, still: action.value };
  if (s.paused) return s;
  if (action.type === "tick") {
    if (!Number.isFinite(action.ms) || action.ms <= 0) return s;
    // Never turn a stalled frame into an instant loss; callers integrate fixed 50ms steps.
    return advance(s, Math.min(250, action.ms));
  }
  if (action.type === "next-evening") {
    if (s.mode !== "rest") return s;
    return {
      ...s, mode: "revisit", time: 0, activation: .16, lamp: "reading", book: { ...s.book, open: false },
      insects: [{ id: s.nextId, slot: 2, kind: "hoverer", arrivedAt: 0 }], nextId: s.nextId + 1,
      prevented: s.prevented + 2, held: s.held + 1, events: [],
      line: "Window shut. Phone away. One was hiding inside.", revision: s.revision + 1,
    };
  }
  if (s.mode === "rest" || s.mode === "complete") return s;
  let next = { ...s, revision: s.revision + 1 };
  switch (action.type) {
    case "catch": {
      if (!s.insects.some(i => i.id === action.id)) return s;
      next.insects = s.insects.filter(i => i.id !== action.id);
      next.caught++;
      next.activation = Math.max(.06, next.activation - .035);
      next.line = next.insects.length ? "One less buzz." : s.window === "open" ? "Quiet for now. The window is still open." : "Nothing buzzing inside.";
      break;
    }
    case "window":
      if (s.window === "secured") return s;
      next.window = "secured";
      next.line = "Window secured. What’s outside stays outside.";
      break;
    case "phone":
      if (s.phone === "parked") return s;
      next.phone = "parked"; next.notifications = 0;
      next.line = "Phone away. One less thing asking for attention.";
      break;
    case "headphones":
      next.headphones = !s.headphones;
      next.line = next.headphones ? "A softer background. The room still needs tending." : "Quiet works too.";
      break;
    case "book":
      if (s.lamp === "off") {
        next.lamp = "reading"; next.book = { ...s.book, open: true };
        next.line = "A little light for the page.";
      } else if (!s.book.open) {
        next.book = { ...s.book, open: true };
        next.line = s.book.page ? "Your bookmark kept your place." : "A place to return to. Even if you’re interrupted.";
      } else if (!manageable(s)) {
        next.line = s.insects.length ? "A buzz breaks the page. Your place is kept." : s.phone === "available" ? "The phone is still pulling at the page." : "Secure the window, then settle into the page.";
      } else {
        next.book = { open: true, page: Math.min(3, s.book.page + 1) };
        next.activation = Math.max(.06, s.activation - .13);
        next.line = next.book.page >= (s.mode === "revisit" ? 3 : 2) ? "Your place is kept. Lights out when you’re ready." : "One page. No rush to finish the whole book.";
      }
      break;
    case "light":
      next.lamp = s.lamp === "reading" ? "dim" : s.lamp === "dim" ? "off" : "reading";
      next.line = next.lamp === "off" ? "Less light. Your place is still there." : next.lamp === "dim" ? "A softer corner of the evening." : "A little light for the page.";
      break;
    case "recover":
      next.mode = "recovery"; next.events = [];
      next.line = "No countdown. Tend to one thing at a time.";
      break;
  }
  next = reconcile(next);
  // Still mode advances authored beats through meaningful actions, not real-time pressure.
  return s.still ? advance(next, 2000, true) : next;
}

export function insectOffset(insect: RoomInsect, time: number) {
  const cycle = ((time - insect.arrivedAt + insect.slot * 730) % 6200) / 6200;
  if (cycle > .73) return { x: 0, y: 0, perched: true };
  const arc = Math.sin(cycle / .73 * Math.PI);
  return insect.kind === "scout"
    ? { x: Math.sin(cycle * Math.PI * 3) * 15 * arc, y: Math.cos(cycle * Math.PI * 2) * 13 * arc, perched: false }
    : { x: Math.sin(cycle * Math.PI * 4) * 9 * arc, y: arc * 18, perched: false };
}
