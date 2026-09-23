import { describe, it, expect } from 'vitest';
import { createNina, ninaReducer, wanted, SCENARIOS, COLS, ROWS, type NinaWorld, type NinaAction, type Dir } from './nina-world';

const act = (s: NinaWorld, ...actions: NinaAction[]) => actions.reduce(ninaReducer, s);
const tick = (s: NinaWorld, ms: number) => { for (let t = 0; t < ms; t += 50) s = ninaReducer(s, { type: 'tick', ms: 50 }); return s; };
/** Breadth-first route to a cell, avoiding blots and any chunk that is not the target. */
function route(s: NinaWorld, tx: number, ty: number): Dir | null {
  const blocked = new Set([...s.blots.map(b => `${b.x},${b.y}`), ...s.chunks.filter(c => !(c.x === tx && c.y === ty)).map(c => `${c.x},${c.y}`)]);
  const start = `${s.pen.x},${s.pen.y}`, seen = new Map<string, Dir | null>([[start, null]]), queue = [[s.pen.x, s.pen.y]];
  const steps: [Dir, number, number][] = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    if (x === tx && y === ty) return seen.get(`${x},${y}`) ?? null;
    for (const [d, dx, dy] of steps) {
      const nx = x! + dx, ny = y! + dy, k = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || seen.has(k) || blocked.has(k)) continue;
      seen.set(k, seen.get(`${x},${y}`) ?? d); queue.push([nx, ny]);
    }
  }
  return null;
}
/** A writer who steers to the nearest needed phrase and round everything else. */
function write(s: NinaWorld, ms = 90000) {
  for (let t = 0; t < ms && (s.phase === 'writing' || s.phase === 'revisit'); t += 50) {
    const want = wanted(s);
    const target = s.chunks.filter(c => c.slot !== null && want[c.slot] === c.text && !s.filled[c.slot]).sort((a, b) => (Math.abs(a.x - s.pen.x) + Math.abs(a.y - s.pen.y)) - (Math.abs(b.x - s.pen.x) + Math.abs(b.y - s.pen.y)))[0];
    if (target) { const d = route(s, target.x, target.y); if (d && d !== s.pen.dir) s = act(s, { type: 'dir', dir: d }); }
    s = s.still ? s : ninaReducer(s, { type: 'tick', ms: 50 });
    if (s.still && target) { const d = route(s, target.x, target.y); if (d) s = act(s, { type: 'dir', dir: d }); }
  }
  return s;
}
function toSetup(s = createNina()) { for (let n = 0; n < 3; n++) { s = write(s); expect(s.phase).toBe('line-done'); s = act(s, { type: 'continue' }); } return s; }
const setup = (s: NinaWorld) => act(s, { type: 'save' }, { type: 'marker' }, { type: 'next', step: SCENARIOS[s.scenario]!.steps[0] }, { type: 'continue' });

describe('Nina: the first line', () => {
  it('every scenario writes three lines, a setup and a fourth line to completion', () => {
    for (let n = 0; n < SCENARIOS.length; n++) {
      let s = toSetup(createNina(n));
      expect(s.phase).toBe('setup');
      expect(s.draft).toHaveLength(3);
      s = setup(s); expect(s.phase).toBe('revisit');
      s = write(s); expect(s.phase).toBe('complete');
      expect(s.draft).toHaveLength(4);
      expect(s.draft[3]).toEqual(SCENARIOS[n]!.revisit.slots);
    }
  });
  it('the draft is the actual line, in slot order, whatever order it was collected', () => {
    let s = createNina();
    s = { ...s, filled: [null, 'the garden needs', null] };
    s = { ...s, chunks: [{ id: 99, text: 'a few hands.', x: s.pen.x, y: s.pen.y - 1, slot: 2 }, { id: 98, text: 'Hi neighbours,', x: s.pen.x, y: s.pen.y - 2, slot: 0 }] };
    s = act(s, { type: 'dir', dir: 'up' });
    s = tick(s, 1200);
    expect(s.phase).toBe('line-done');
    expect(s.draft[0]).toEqual(['Hi neighbours,', 'the garden needs', 'a few hands.']);
  });
  it('a blot stalls the pen without taking any written words', () => {
    let s = createNina();
    s = { ...s, filled: ['Hi neighbours,', null, null], chunks: [], blots: [{ x: s.pen.x, y: s.pen.y - 1 }] };
    s = act(s, { type: 'dir', dir: 'up' });
    s = tick(s, 100);
    expect(s.blots).toHaveLength(0);
    expect(s.filled[0]).toBe('Hi neighbours,');
    const y = s.pen.y;
    s = tick(s, 400);
    expect(s.pen.y).toBe(y);
    s = tick(s, 800);
    expect(s.pen.y).toBeLessThan(y);
  });
  it('blots gather over time, up to a limit', () => {
    let s = tick(createNina(), 60000);
    expect(s.blots.length).toBeGreaterThan(2);
    expect(s.blots.length).toBeLessThanOrEqual(6);
  });
  it('a rabbit-hole tab slows the pen for a while', () => {
    let s = createNina();
    s = { ...s, chunks: [{ id: 50, text: 'Check 12 fonts', x: s.pen.x, y: s.pen.y - 1, slot: null }] };
    s = act(s, { type: 'dir', dir: 'up' });
    s = tick(s, 50);
    expect(s.slowUntil).toBeGreaterThan(s.t);
    expect(s.message).toContain('rabbit hole');
  });
  it('the edge of the page stops the pen instead of ending anything', () => {
    let s = act(createNina(), { type: 'dir', dir: 'down' });
    s = tick(s, 1000);
    expect(s.pen.dir).toBeNull();
    expect(s.pen.y).toBe(ROWS - 1);
    expect(s.phase).toBe('writing');
  });
  it('line two changes scope: the old phrase is struck and the new one is written instead', () => {
    let s = act(write(createNina()), { type: 'continue' });
    expect(s.line).toBe(1);
    s = { ...s, filled: ['Saturday', null, null] };
    s = tick(s, 9100);
    expect(s.changed).toBe(true);
    expect(s.filled[0]).toBeNull();
    expect(wanted(s)[0]).toBe('Sunday');
    expect(s.chunks.some(c => c.text === 'Sunday')).toBe(true);
    s = write(s);
    expect(s.draft[1]![0]).toBe('Sunday');
  });
  it('setup needs a save, a marker and a next step; the revisit reopens at the marker', () => {
    let s = toSetup();
    const last = s.last;
    s = act(s, { type: 'save' }, { type: 'continue' });
    expect(s.phase).toBe('setup');
    s = setup(s);
    expect(s.phase).toBe('revisit');
    expect({ x: s.pen.x, y: s.pen.y }).toEqual(last);
    expect(s.draft).toHaveLength(3);
    expect(s.next).toBe(SCENARIOS[0]!.steps[0]);
  });
  it('still mode moves one cell per direction and nothing on its own', () => {
    let s = createNina(0, true);
    const pen = s.pen;
    s = tick(s, 20000);
    expect(s.pen).toEqual(pen);
    s = act(s, { type: 'dir', dir: 'up' });
    expect(s.pen.y).toBe(pen.y - 1);
    s = write(s);
    expect(s.phase).toBe('line-done');
  });
  it('pause holds the pen and ignores steering', () => {
    let s = tick(act(createNina(), { type: 'dir', dir: 'up' }), 500);
    s = act(s, { type: 'pause' });
    const held = act(tick(s, 3000), { type: 'dir', dir: 'left' });
    expect(held.pen).toEqual(s.pen);
  });
  it('another draft rotates the scenario and starts a clean page', () => {
    let s = write(setup(toSetup()));
    s = act(s, { type: 'restart' });
    expect(s.scenario).toBe(1);
    expect(s.draft).toEqual([]);
    expect(s.marker).toBeNull();
  });
});
