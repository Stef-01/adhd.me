/**
 * Nina — The first line. A pen travels a page grid; steering it through phrases from the brief
 * writes a real line of the draft, slot by slot. Critic blots multiply while the pen hesitates;
 * running into one stalls the pen but never erases work. Rabbit-hole tabs slow it down. The
 * draft is fictional and stays in memory; nothing here grades writing.
 */
export type Dir = 'up' | 'down' | 'left' | 'right';
export interface Chunk { id: number; text: string; x: number; y: number; slot: number | null }
export interface Line { slots: string[]; tabs: string[]; change?: { at: number; slot: number; text: string; note: string } }
export interface Scenario { brief: string; lines: [Line, Line, Line]; revisit: Line & { note: string }; steps: [string, string] }
export type Phase = 'writing' | 'line-done' | 'setup' | 'revisit' | 'complete';

export const COLS = 5, ROWS = 7;
export const SCENARIOS: Scenario[] = [
  { brief: 'A flyer for the garden',
    lines: [
      { slots: ['Hi neighbours,', 'the garden needs', 'a few hands.'], tabs: ['Check 12 fonts', 'Perfect logo?'] },
      { slots: ['Saturday', 'from nine,', 'bring gloves.'], tabs: ['Read reviews', 'Colour scheme'], change: { at: 9000, slot: 0, text: 'Sunday', note: 'Sam: it’s Sunday now.' } },
      { slots: ['Tea after,', 'all welcome,', 'thank you!'], tabs: ['Rewrite line one', 'Find a quote'] },
    ],
    revisit: { slots: ['Meet at the gate.', 'Rain? Next week.'], tabs: ['Start over?'], note: 'Where to meet, and rain.' }, steps: ['Print ten copies', 'Send it to Sam'] },
  { brief: 'An email asking for more time',
    lines: [
      { slots: ['Hi Priya,', 'could I have', 'two more days'], tabs: ['Research excuses', 'Perfect greeting?'] },
      { slots: ['for the essay?', 'I have the plan', 'and half a draft.'], tabs: ['Reread notes', 'Check word count'], change: { at: 9000, slot: 0, text: 'for the report?', note: 'It’s the report, not the essay.' } },
      { slots: ['I can send', 'it by Friday.', 'Thanks, Nina'], tabs: ['Rewrite it all', 'Find the rules'] },
    ],
    revisit: { slots: ['Here is the plan', 'so far.'], tabs: ['Wait until done?'], note: 'Priya asks to see the plan.' }, steps: ['Attach the plan', 'Send by lunch'] },
  { brief: 'A note for a job application',
    lines: [
      { slots: ['Dear team,', 'I’d love to', 'join the café.'], tabs: ['Study their menu', 'Perfect font?'] },
      { slots: ['I have made', 'coffee for years', 'and I’m quick.'], tabs: ['Compare CVs', 'Edit photo'], change: { at: 9000, slot: 1, text: 'food for years', note: 'It’s the kitchen role.' } },
      { slots: ['I can start', 'next week.', 'Warmly, Nina'], tabs: ['Rewrite opener', 'Read forums'] },
    ],
    revisit: { slots: ['Weekends suit me', 'best, too.'], tabs: ['Wait for courage?'], note: 'They ask which days suit.' }, steps: ['Call on Monday', 'Send it tonight'] },
];

const STEP = [420, 360, 310, 380];
const BLOT_EVERY = [5200, 4400, 3800, 4800];
const BLOT_MAX = 6;

export interface NinaWorld {
  paused: boolean; still: boolean; scenario: number; phase: Phase; line: number; t: number;
  pen: { x: number; y: number; dir: Dir | null }; trail: { x: number; y: number }[];
  chunks: Chunk[]; blots: { x: number; y: number }[]; nextId: number; moveAt: number; blotAt: number; moves: number;
  stunUntil: number; slowUntil: number; filled: (string | null)[]; changed: boolean;
  draft: string[][]; saved: boolean; last: { x: number; y: number }; marker: { x: number; y: number } | null; next: string | null;
  message: string; revision: number; bump: number;
}
export type NinaAction =
  | { type: 'tick'; ms: number } | { type: 'pause' } | { type: 'resume' } | { type: 'still'; value: boolean }
  | { type: 'dir'; dir: Dir } | { type: 'continue' } | { type: 'save' } | { type: 'marker' } | { type: 'next'; step: string } | { type: 'restart' };

export function lineDef(s: Pick<NinaWorld, 'scenario' | 'line'>): Line { const c = SCENARIOS[s.scenario]!; return s.line === 3 ? c.revisit : c.lines[s.line]!; }
/** The slot texts the line needs now, after any mid-line change. */
export function wanted(s: NinaWorld): string[] {
  const l = lineDef(s);
  return l.slots.map((text, i) => s.changed && l.change?.slot === i ? l.change.text : text);
}
const live = (s: NinaWorld) => s.phase === 'writing' || s.phase === 'revisit';
export function running(s: NinaWorld) { return live(s); }
const key = (x: number, y: number) => `${x},${y}`;
/** A small deterministic generator so each scenario places the same page every time. */
function rand(seed: number) { let v = seed * 9301 + 49297; return () => (v = (v * 9301 + 49297) % 233280) / 233280; }

function place(s: NinaWorld, texts: { text: string; slot: number | null }[], seed: number): Chunk[] {
  const r = rand(seed), taken = new Set([key(s.pen.x, s.pen.y), ...s.blots.map(b => key(b.x, b.y)), ...s.chunks.map(c => key(c.x, c.y))]);
  const out: Chunk[] = [];
  let id = s.nextId;
  for (const t of texts) {
    let x = 0, y = 0;
    for (let guard = 0; guard < 200; guard++) {
      x = Math.floor(r() * COLS); y = Math.floor(r() * (ROWS - 1)) + 1;
      if (!taken.has(key(x, y)) && Math.abs(x - s.pen.x) + Math.abs(y - s.pen.y) >= 2 && ![...taken].some(k => { const [a, b] = k.split(',').map(Number); return Math.abs(a! - x) + Math.abs(b! - y) === 1 && out.some(o => o.x === a && o.y === b); })) break;
    }
    taken.add(key(x, y)); out.push({ id: id++, text: t.text, x, y, slot: t.slot });
  }
  return out;
}
function startLine(s: NinaWorld, n: number): NinaWorld {
  const start = n === 3 && s.marker ? s.marker : { x: 2, y: ROWS - 1 };
  let next: NinaWorld = { ...s, line: n, phase: n === 3 ? 'revisit' : 'writing', t: 0, pen: { ...start, dir: null }, trail: [], chunks: [], blots: [], moveAt: 0, blotAt: BLOT_EVERY[n]!, moves: 0, stunUntil: 0, slowUntil: 0, changed: false, revision: s.revision + 1 };
  const l = lineDef(next);
  next.filled = l.slots.map(() => null);
  next = { ...next, chunks: place(next, [...l.slots.map((text, slot) => ({ text, slot })), ...l.tabs.map(text => ({ text, slot: null }))], s.scenario * 31 + n * 7 + 3) };
  next.nextId = s.nextId + next.chunks.length;
  next.message = n === 3 ? (SCENARIOS[s.scenario]!.revisit.note) : n === 0 ? 'Steer the pen through the words.' : '';
  return next;
}
export function createNina(scenario = 0, still = false): NinaWorld {
  return startLine({ paused: false, still, scenario: scenario % SCENARIOS.length, phase: 'writing', line: 0, t: 0, pen: { x: 2, y: ROWS - 1, dir: null }, trail: [], chunks: [], blots: [], nextId: 1, moveAt: 0, blotAt: 0, moves: 0, stunUntil: 0, slowUntil: 0, filled: [], changed: false, draft: [], saved: false, last: { x: 2, y: 3 }, marker: null, next: null, message: '', revision: 0, bump: 0 }, 0);
}

function spawnBlot(s: NinaWorld): NinaWorld {
  if (s.blots.length >= BLOT_MAX) return s;
  const r = rand(s.scenario * 101 + s.line * 13 + s.blots.length * 7 + s.moves + 1);
  const busy = new Set([...s.blots.map(b => key(b.x, b.y)), ...s.chunks.map(c => key(c.x, c.y))]);
  for (let guard = 0; guard < 60; guard++) {
    const x = Math.floor(r() * COLS), y = Math.floor(r() * ROWS);
    if (busy.has(key(x, y)) || Math.abs(x - s.pen.x) + Math.abs(y - s.pen.y) < 2) continue;
    return { ...s, blots: [...s.blots, { x, y }], message: s.blots.length ? s.message : 'A critic’s blot. Steer round it.' };
  }
  return s;
}
function move(s: NinaWorld): NinaWorld {
  const d = s.pen.dir;
  if (!d) return s;
  const x = s.pen.x + (d === 'left' ? -1 : d === 'right' ? 1 : 0), y = s.pen.y + (d === 'up' ? -1 : d === 'down' ? 1 : 0);
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return { ...s, pen: { ...s.pen, dir: null }, message: 'Edge of the page. Turn.' };
  const blot = s.blots.findIndex(b => b.x === x && b.y === y);
  if (blot >= 0) return { ...s, blots: s.blots.filter((_, i) => i !== blot), stunUntil: s.t + 900, bump: s.bump + 1, message: 'The critic slowed you. The words are still here.' };
  let n: NinaWorld = { ...s, pen: { x, y, dir: d }, trail: [{ x: s.pen.x, y: s.pen.y }, ...s.trail].slice(0, 5), moves: s.moves + 1 };
  const chunk = n.chunks.find(c => c.x === x && c.y === y);
  if (chunk) {
    n = { ...n, chunks: n.chunks.filter(c => c.id !== chunk.id), bump: n.bump + 1 };
    const want = wanted(n);
    if (chunk.slot !== null && want[chunk.slot] === chunk.text) n = { ...n, filled: n.filled.map((f, i) => i === chunk.slot ? chunk.text : f), message: 'Written.' };
    else if (chunk.slot !== null) n = { ...n, message: 'That was the old version.' };
    else n = { ...n, slowUntil: n.t + 2400, message: 'Down a rabbit hole. It passes.' };
    if (n.filled.every(Boolean)) {
      const done = n.filled as string[];
      return { ...n, phase: n.line === 3 ? 'complete' : 'line-done', draft: [...n.draft, done], message: '', revision: n.revision + 1, last: { x, y } };
    }
  }
  return n;
}
/** A scope change swaps one slot: an old chunk already written is struck, and the new one appears. */
function change(s: NinaWorld): NinaWorld {
  const c = lineDef(s).change!;
  const old = lineDef(s).slots[c.slot]!;
  let n: NinaWorld = { ...s, changed: true, filled: s.filled.map((f, i) => i === c.slot ? null : f), message: c.note, revision: s.revision + 1 };
  n = { ...n, chunks: n.chunks.filter(ch => ch.text !== old) };
  const [fresh] = place(n, [{ text: c.text, slot: c.slot }], s.scenario * 17 + 5);
  return { ...n, chunks: [...n.chunks, fresh!], nextId: n.nextId + 1 };
}

export function ninaReducer(s: NinaWorld, a: NinaAction): NinaWorld {
  if (a.type === 'pause') return s.paused ? s : { ...s, paused: true };
  if (a.type === 'resume') return s.paused ? { ...s, paused: false } : s;
  if (a.type === 'still') return a.value === s.still ? s : { ...s, still: a.value, pen: { ...s.pen, dir: a.value ? null : s.pen.dir } };
  if (s.paused) return s;
  if (a.type === 'restart') return s.phase === 'complete' ? createNina(s.scenario + 1, s.still) : s;
  if (a.type === 'tick') {
    if (!live(s) || s.still) return s;
    let n: NinaWorld = { ...s, t: s.t + a.ms };
    const l = lineDef(n);
    // Scope changes the moment the soon-to-change phrase is written, or after a while regardless.
    if (l.change && !n.changed && (n.t >= l.change.at || (n.filled[l.change.slot] && n.t > 600))) n = change(n);
    if (n.t >= n.blotAt) n = { ...spawnBlot(n), blotAt: n.t + BLOT_EVERY[n.line]! };
    if (n.t >= n.stunUntil && n.t >= n.moveAt && n.pen.dir) n = { ...move(n), moveAt: n.t + STEP[n.line]! * (n.t < n.slowUntil ? 1.8 : 1) };
    return n;
  }
  if (a.type === 'dir' && live(s)) {
    if (!s.still) return { ...s, pen: { ...s.pen, dir: a.dir } };
    // At the player's pace a direction is one step; blots gather every few steps.
    let n = move({ ...s, pen: { ...s.pen, dir: a.dir }, t: s.t + 1000 });
    n = { ...n, pen: { ...n.pen, dir: null } };
    const l = lineDef(n);
    if (live(n) && l.change && !n.changed && (n.moves >= 6 || n.filled[l.change.slot])) n = change(n);
    if (live(n) && n.moves > 0 && n.moves % 4 === 0 && n.blots.length < BLOT_MAX) n = spawnBlot(n);
    return n;
  }
  if (a.type === 'continue') {
    if (s.phase === 'line-done') return s.line < 2 ? startLine(s, s.line + 1) : { ...s, phase: 'setup', message: '', revision: s.revision + 1 };
    if (s.phase === 'setup' && s.saved && s.marker && s.next) return startLine(s, 3);
    return s;
  }
  if (s.phase === 'setup') {
    if (a.type === 'save') return { ...s, saved: true, message: 'Saved. Three lines exist now.' };
    if (a.type === 'marker') return { ...s, marker: s.last, message: 'A marker where you stopped.' };
    if (a.type === 'next') return { ...s, next: a.step, message: `Next: ${a.step.toLowerCase()}.` };
  }
  return s;
}
export function blotAt(s: NinaWorld, x: number, y: number) { return s.blots.some(b => b.x === x && b.y === y); }
