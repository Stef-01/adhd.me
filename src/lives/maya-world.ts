/**
 * Maya — One thing at a time. A station concourse seen from above: crowds flow along lanes, an
 * announcement speaker pulses, the phone pings. Maya steps across to the gate. Crowd contact,
 * pulses and pings raise a fictional sensory load; benches and calm rows let it fall. At full load
 * she will not step forward until she has recovered. Nothing here measures a real person.
 */
export type Dir = 'up' | 'down' | 'left' | 'right';
export interface Lane { row: number; speed: number; groups: { x: number; w: number }[] }
export interface Crossing { title: string; goal: number; lanes: Lane[]; benches: [number, number][]; speaker: [number, number] | null; pings: boolean }
export interface Scenario { crossings: [Crossing, Crossing, Crossing]; revisit: Crossing & { queue: number } }
export type Phase = 'crossing' | 'arrived' | 'setup' | 'revisit' | 'complete';

export const COLS = 5, ROWS = 7;
const lanes = (spec: [number, number, number[]][]): Lane[] => spec.map(([row, speed, xs]) => ({ row, speed, groups: xs.map(x => ({ x, w: 1.4 })) }));
export const SCENARIOS: Scenario[] = [
  { crossings: [
      { title: 'Platform 2.', goal: 3, lanes: lanes([[1, .0011, [0, 3]], [4, -.0009, [1, 3.6]]]), benches: [[0, 2], [4, 5]], speaker: null, pings: false },
      { title: 'Gate 5, then the bus.', goal: 1, lanes: lanes([[1, -.0013, [0.5, 3.2]], [3, .0012, [0, 2.6]], [4, -.0010, [1.2, 4]]]), benches: [[4, 2], [0, 5]], speaker: [2, 2], pings: false },
      { title: 'Meet Ari at the clock.', goal: 2, lanes: lanes([[1, .0015, [0, 2.4]], [3, -.0014, [1, 3.4]], [4, .0012, [0.3, 2.8]]]), benches: [[0, 2], [4, 5]], speaker: [3, 2], pings: true },
    ],
    revisit: { title: 'Next week, same station.', goal: 4, queue: 2, lanes: lanes([[1, .0014, [0, 2.6]], [3, -.0013, [0.8, 3.4]], [4, .0012, [0.2, 3]]]), benches: [[0, 2], [4, 5]], speaker: [2, 2], pings: true } },
  { crossings: [
      { title: 'The library lift.', goal: 1, lanes: lanes([[1, -.0011, [0.4, 3.4]], [4, .0009, [0, 3]]]), benches: [[4, 2], [0, 5]], speaker: null, pings: false },
      { title: 'Room 12, before class.', goal: 4, lanes: lanes([[1, .0013, [0, 3]], [3, -.0012, [1.4, 4]], [4, .0010, [0.6, 3.2]]]), benches: [[0, 2], [4, 5]], speaker: [1, 2], pings: false },
      { title: 'Meet Ari at the café.', goal: 2, lanes: lanes([[1, -.0015, [0.2, 2.8]], [3, .0014, [0, 3]], [4, -.0012, [1, 3.6]]]), benches: [[4, 2], [0, 5]], speaker: [3, 2], pings: true },
    ],
    revisit: { title: 'Next week, same building.', goal: 0, queue: 2, lanes: lanes([[1, -.0014, [0.4, 3]], [3, .0013, [1, 3.6]], [4, -.0012, [0, 2.6]]]), benches: [[4, 2], [0, 5]], speaker: [2, 2], pings: true } },
  { crossings: [
      { title: 'The hall entrance.', goal: 2, lanes: lanes([[1, .0011, [0, 3.2]], [4, -.0009, [1.6, 4]]]), benches: [[0, 2], [4, 5]], speaker: null, pings: false },
      { title: 'Stall 7, before it sells out.', goal: 0, lanes: lanes([[1, -.0013, [1, 3.6]], [3, .0012, [0.4, 3]], [4, -.0010, [0, 2.4]]]), benches: [[4, 2], [0, 5]], speaker: [2, 2], pings: false },
      { title: 'Meet Ari by the stage.', goal: 3, lanes: lanes([[1, .0015, [0.6, 3.2]], [3, -.0014, [0, 2.6]], [4, .0012, [1.4, 4]]]), benches: [[0, 2], [4, 5]], speaker: [1, 2], pings: true },
    ],
    revisit: { title: 'Next week, same market.', goal: 4, queue: 3, lanes: lanes([[1, .0014, [0, 2.8]], [3, -.0013, [1.2, 3.8]], [4, .0012, [0.4, 3]]]), benches: [[0, 2], [4, 5]], speaker: [2, 2], pings: true } },
];

const PULSE_EVERY = 3600, PING_EVERY = 4800, STILL_STEP = 1;
export const FULL = 100, RECOVERED = 55;

export interface MayaWorld {
  paused: boolean; still: boolean; scenario: number; phase: Phase; crossing: number; t: number;
  maya: { x: number; y: number }; load: number; overwhelmed: boolean; pulseAt: number; pingAt: number; pings: number[]; nextPing: number;
  bump: number; pulses: number; setup: { dnd: boolean; ease: 'headphones' | 'quiet' | null; meet: boolean }; arrivals: number[];
  message: string; revision: number;
}
export type MayaAction =
  | { type: 'tick'; ms: number } | { type: 'pause' } | { type: 'resume' } | { type: 'still'; value: boolean }
  | { type: 'step'; dir: Dir } | { type: 'dismiss'; id: number } | { type: 'continue' }
  | { type: 'dnd' } | { type: 'ease'; value: 'headphones' | 'quiet' } | { type: 'meet' } | { type: 'restart' };

export function crossingDef(s: Pick<MayaWorld, 'scenario' | 'crossing'>): Crossing & { queue?: number } { const c = SCENARIOS[s.scenario]!; return s.crossing === 3 ? c.revisit : c.crossings[s.crossing]!; }
const live = (s: MayaWorld) => s.phase === 'crossing' || s.phase === 'revisit';
export function running(s: MayaWorld) { return live(s); }
/** The quiet route thins every crowd to its first group. */
export function lanesOf(s: MayaWorld): Lane[] { const l = crossingDef(s).lanes; return s.crossing === 3 && s.setup.ease === 'quiet' ? l.map(x => ({ ...x, groups: x.groups.slice(0, 1) })) : l; }
/** Where a group's left edge is at time t, wrapped across the concourse. */
export function groupX(lane: Lane, g: { x: number }, t: number) { const span = COLS + 1.4; return (((g.x + lane.speed * t) % span) + span) % span - 1.4; }
export function crowdAt(s: MayaWorld, x: number, y: number, t = s.t): boolean {
  return lanesOf(s).some(l => l.row === y && l.groups.some(g => { const gx = groupX(l, g, t); return x + .5 > gx + .15 && x + .5 < gx + g.w - .15; }));
}
export function blocked(s: MayaWorld, x: number, y: number) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
  const c = crossingDef(s);
  if (y === 0 && x !== c.goal) return true;
  return s.crossing === 3 && y === 1 && x === (c as { queue: number }).queue;
}
const bench = (s: MayaWorld) => crossingDef(s).benches.some(([x, y]) => x === s.maya.x && y === s.maya.y);
const calm = (s: MayaWorld) => !lanesOf(s).some(l => l.row === s.maya.y);

function start(s: MayaWorld, n: number): MayaWorld {
  const next: MayaWorld = { ...s, crossing: n, phase: n === 3 ? 'revisit' : 'crossing', t: 0, maya: { x: 2, y: ROWS - 1 }, load: 10, overwhelmed: false, pulseAt: PULSE_EVERY, pingAt: 2200, pings: [], revision: s.revision + 1 };
  next.message = n === 3 ? 'The usual gate has a queue.' : n === 0 ? 'Step across. Mind the crowds.' : '';
  return next;
}
export function createMaya(scenario = 0, still = false): MayaWorld {
  return start({ paused: false, still, scenario: scenario % SCENARIOS.length, phase: 'crossing', crossing: 0, t: 0, maya: { x: 2, y: ROWS - 1 }, load: 10, overwhelmed: false, pulseAt: 0, pingAt: 0, pings: [], nextPing: 1, bump: 0, pulses: 0, setup: { dnd: false, ease: null, meet: false }, arrivals: [], message: '', revision: 0 }, 0);
}
function add(s: MayaWorld, amount: number, message: string): MayaWorld {
  const load = Math.min(FULL, s.load + amount);
  return { ...s, load, overwhelmed: s.overwhelmed || load >= FULL, message: load >= FULL && !s.overwhelmed ? 'Too much at once. Find somewhere quiet.' : message };
}
/** A crowd reaching Maya's square nudges her back toward the nearest calm row. */
function jostle(s: MayaWorld): MayaWorld {
  if (!crowdAt(s, s.maya.x, s.maya.y)) return s;
  const back = s.maya.y + 1 < ROWS && !blocked(s, s.maya.x, s.maya.y + 1) ? s.maya.y + 1 : s.maya.y;
  return add({ ...s, maya: { x: s.maya.x, y: back }, bump: s.bump + 1 }, 22, 'Bumped by the crowd.');
}
function advance(s: MayaWorld, ms: number): MayaWorld {
  let n: MayaWorld = { ...s, t: s.t + ms };
  const c = crossingDef(n);
  n = jostle(n);
  const rate = bench(n) ? 26 : calm(n) ? 7 : 0;
  n = { ...n, load: Math.max(0, n.load - rate * ms / 1000) };
  if (n.overwhelmed && n.load <= RECOVERED) n = { ...n, overwhelmed: false, message: 'A bit more room. Ready.' };
  if (c.speaker && n.t >= n.pulseAt) {
    const near = Math.abs(n.maya.x - c.speaker[0]) + Math.abs(n.maya.y - c.speaker[1]) <= 1;
    n = { ...n, pulseAt: n.t + PULSE_EVERY, pulses: n.pulses + 1 };
    if (near) n = add(n, n.crossing === 3 && n.setup.ease === 'headphones' ? 4 : 16, n.crossing === 3 && n.setup.ease === 'headphones' ? 'The announcement, softer.' : 'The announcement, right here.');
  }
  if (c.pings && !(n.crossing === 3 && n.setup.dnd) && n.t >= n.pingAt) {
    n = add({ ...n, pingAt: n.t + PING_EVERY, pings: [...n.pings, n.nextPing].slice(-3), nextPing: n.nextPing + 1 }, 8, 'The phone again.');
  }
  return n;
}
export function mayaReducer(s: MayaWorld, a: MayaAction): MayaWorld {
  if (a.type === 'pause') return s.paused ? s : { ...s, paused: true };
  if (a.type === 'resume') return s.paused ? { ...s, paused: false } : s;
  if (a.type === 'still') return a.value === s.still ? s : { ...s, still: a.value };
  if (s.paused) return s;
  if (a.type === 'restart') return s.phase === 'complete' ? createMaya(s.scenario + 1, s.still) : s;
  if (a.type === 'tick') return live(s) && !s.still ? advance(s, a.ms) : s;
  if (live(s)) {
    if (a.type === 'dismiss') return s.pings.includes(a.id) ? { ...s, pings: s.pings.filter(p => p !== a.id), message: 'Later.' } : s;
    if (a.type === 'step') {
      const dx = a.dir === 'left' ? -1 : a.dir === 'right' ? 1 : 0, dy = a.dir === 'up' ? -1 : a.dir === 'down' ? 1 : 0;
      if (a.dir === 'up' && s.overwhelmed) return { ...s, message: 'Not yet. A calmer spot first.' };
      const x = s.maya.x + dx, y = s.maya.y + dy;
      if (blocked(s, x, y)) return { ...s, message: y === 0 ? 'Not this way. The gate is marked.' : s.crossing === 3 && y === 1 ? 'The queue is here. Another way.' : s.message };
      let n: MayaWorld = { ...s, maya: { x, y } };
      if (y === 0) return { ...n, phase: s.crossing === 3 ? 'complete' : 'arrived', arrivals: [...s.arrivals, s.crossing], pings: [], message: '', revision: s.revision + 1 };
      if (s.still) n = advance(n, STILL_STEP * 900);
      else n = jostle(n);
      return n;
    }
    return s;
  }
  if (a.type === 'continue') {
    if (s.phase === 'arrived') return s.crossing < 2 ? start(s, s.crossing + 1) : { ...s, phase: 'setup', message: '', revision: s.revision + 1 };
    if (s.phase === 'setup' && s.setup.dnd && s.setup.ease && s.setup.meet) return start(s, 3);
    return s;
  }
  if (s.phase === 'setup') {
    if (a.type === 'dnd') return { ...s, setup: { ...s.setup, dnd: true }, message: 'The phone can wait.' };
    if (a.type === 'ease') return { ...s, setup: { ...s.setup, ease: a.value }, message: a.value === 'headphones' ? 'Headphones for the announcements.' : 'The quieter way, even if longer.' };
    if (a.type === 'meet') return { ...s, setup: { ...s.setup, meet: true }, message: 'Ari will meet you there.' };
  }
  return s;
}
