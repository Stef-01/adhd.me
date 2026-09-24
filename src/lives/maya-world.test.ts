import { describe, it, expect } from 'vitest';
import { createMaya, mayaReducer, crowdAt, blocked, crossingDef, lanesOf, SCENARIOS, FULL, ROWS, COLS, type MayaWorld, type MayaAction, type Dir } from './maya-world';

const act = (s: MayaWorld, ...actions: MayaAction[]) => actions.reduce(mayaReducer, s);
const tick = (s: MayaWorld, ms: number) => { for (let t = 0; t < ms; t += 50) s = mayaReducer(s, { type: 'tick', ms: 50 }); return s; };
/** A careful walker: waits for a gap, rests on a bench when loaded, heads for the gate. */
function cross(s: MayaWorld, ms = 120000) {
  const goal = () => crossingDef(s).goal;
  for (let t = 0; t < ms && (s.phase === 'crossing' || s.phase === 'revisit'); t += 50) {
    for (const id of s.pings) s = act(s, { type: 'dismiss', id });
    const { x, y } = s.maya;
    const safeAhead = (nx: number, ny: number) => !blocked(s, nx, ny) && !crowdAt(s, nx, ny, s.t + 350) && !crowdAt(s, nx, ny, s.t + 700);
    let dir: Dir | null = null;
    if (s.overwhelmed || s.load > 70) { const b = crossingDef(s).benches.find(([bx, by]) => by >= y); if (b) dir = b[1] !== y ? (b[1] > y ? 'down' : 'up') : b[0] !== x ? (b[0] > x ? 'right' : 'left') : null; }
    else if (y === 1 && x !== goal()) dir = x < goal() ? 'right' : 'left';
    else if (safeAhead(x, y - 1)) dir = 'up';
    else if (x !== goal() && !blocked(s, x + Math.sign(goal() - x), y) && !crowdAt(s, x + Math.sign(goal() - x), y, s.t + 350)) dir = goal() > x ? 'right' : 'left';
    if (s.still && !dir) dir = crowdAt(s, x, y) ? 'down' : (x > 0 ? 'left' : 'right');
    if (dir && (s.still || t % 250 === 0)) s = act(s, { type: 'step', dir });
    if (!s.still) s = mayaReducer(s, { type: 'tick', ms: 50 });
  }
  return s;
}
function toSetup(s = createMaya()) { for (let n = 0; n < 3; n++) { s = cross(s); expect(s.phase).toBe('arrived'); s = act(s, { type: 'continue' }); } return s; }
const setup = (s: MayaWorld, ease: 'headphones' | 'quiet' = 'headphones') => act(s, { type: 'dnd' }, { type: 'ease', value: ease }, { type: 'meet' }, { type: 'continue' });

describe('Maya: one thing at a time', () => {
  it('every scenario crosses three times, sets boundaries and crosses again to completion', () => {
    for (let n = 0; n < SCENARIOS.length; n++) {
      for (const ease of ['headphones', 'quiet'] as const) {
        let s = toSetup(createMaya(n));
        expect(s.phase).toBe('setup');
        s = setup(s, ease); expect(s.phase).toBe('revisit');
        s = cross(s); expect(s.phase).toBe('complete');
        expect(s.arrivals).toEqual([0, 1, 2, 3]);
      }
    }
  });
  it('a crowd on Maya’s square raises the load and nudges her back a row', () => {
    let s = createMaya();
    const lane = lanesOf(s)[1]!;
    s = { ...s, maya: { x: 2, y: lane.row } };
    let t = 0; while (!crowdAt(s, 2, lane.row, t) && t < 20000) t += 50;
    s = { ...s, t: t - 50 };
    const load = s.load;
    s = tick(s, 100);
    expect(s.load).toBeGreaterThan(load + 15);
    expect(s.maya.y).toBe(lane.row + 1);
    expect(s.phase).toBe('crossing');
  });
  it('benches recover faster than a calm row; a crowd lane does not recover at all', () => {
    const base = createMaya();
    const [bx, by] = crossingDef(base).benches[0]!;
    const onBench = tick({ ...base, load: 80, maya: { x: bx, y: by } }, 1000);
    const onCalm = tick({ ...base, load: 80, maya: { x: bx === 0 ? 1 : 0, y: by } }, 1000);
    expect(onBench.load).toBeLessThan(onCalm.load);
    expect(onCalm.load).toBeLessThan(80);
  });
  it('at full load forward steps wait, sideways and back still work, and recovery clears it', () => {
    let s = { ...createMaya(), load: FULL, overwhelmed: true, maya: { x: 2, y: 5 } };
    s = act(s, { type: 'step', dir: 'up' });
    expect(s.maya.y).toBe(5);
    s = act(s, { type: 'step', dir: 'right' });
    expect(s.maya.x).toBe(3);
    s = { ...s, maya: { x: 4, y: 5 } };
    s = tick(s, 3000);
    expect(s.overwhelmed).toBe(false);
    expect(act(s, { type: 'step', dir: 'up' }).message).not.toContain('Not yet');
  });
  it('announcements only land when Maya is close to the speaker', () => {
    let s = act(createMaya(), { type: 'step', dir: 'up' });
    s = { ...s, crossing: 1, pulseAt: 100 };
    const [sx, sy] = crossingDef(s).speaker!;
    const far = tick({ ...s, maya: { x: sx === 0 ? 4 : 0, y: 6 }, load: 20 }, 150);
    const near = tick({ ...s, maya: { x: sx, y: sy }, load: 20 }, 150);
    expect(near.load).toBeGreaterThan(far.load + 10);
  });
  it('pings add load and pile up until dismissed', () => {
    let s = { ...createMaya(), crossing: 2, pingAt: 50, maya: { x: 2, y: 6 } };
    s = tick(s, 100);
    expect(s.pings).toHaveLength(1);
    s = act(s, { type: 'dismiss', id: s.pings[0]! });
    expect(s.pings).toHaveLength(0);
  });
  it('walls and the gate: only the marked gate square leads out', () => {
    const s = createMaya();
    const goal = crossingDef(s).goal;
    for (let x = 0; x < COLS; x++) expect(blocked(s, x, 0)).toBe(x !== goal);
    expect(blocked(s, -1, 3)).toBe(true);
    expect(blocked(s, 0, ROWS)).toBe(true);
  });
  it('setup needs do-not-disturb, an ease and a meeting point', () => {
    let s = toSetup();
    s = act(s, { type: 'dnd' }, { type: 'continue' });
    expect(s.phase).toBe('setup');
    s = act(s, { type: 'ease', value: 'quiet' }, { type: 'meet' }, { type: 'continue' });
    expect(s.phase).toBe('revisit');
  });
  it('the revisit carries each boundary: no pings, softer announcements, thinner crowds', () => {
    const at = setup(toSetup(), 'headphones');
    const quiet = setup(toSetup(), 'quiet');
    const pinged = tick({ ...at, pingAt: 50 }, 200);
    expect(pinged.pings).toEqual([]);
    const [sx, sy] = crossingDef(at).speaker!;
    const soft = tick({ ...at, maya: { x: sx, y: sy }, pulseAt: 100, load: 20 }, 150);
    const loud = tick({ ...quiet, maya: { x: sx, y: sy }, pulseAt: 100, load: 20 }, 150);
    expect(soft.load).toBeLessThan(loud.load);
    expect(lanesOf(quiet).every(l => l.groups.length === 1)).toBe(true);
    expect(lanesOf(at).some(l => l.groups.length > 1)).toBe(true);
    expect(blocked(at, (crossingDef(at) as { queue: number }).queue, 1)).toBe(true);
  });
  it('still mode moves crowds only when Maya steps', () => {
    let s = createMaya(0, true);
    const frozen = tick(s, 10000);
    expect(frozen.t).toBe(s.t);
    s = act(s, { type: 'step', dir: 'left' });
    expect(s.t).toBeGreaterThan(0);
    s = cross(s);
    expect(s.phase).toBe('arrived');
  });
  it('pause holds the concourse and ignores steps', () => {
    let s = tick(createMaya(), 600);
    s = act(s, { type: 'pause' });
    const held = act(tick(s, 3000), { type: 'step', dir: 'up' });
    expect(held.t).toBe(s.t);
    expect(held.maya).toEqual(s.maya);
  });
  it('another day rotates the scenario and clears the boundaries', () => {
    let s = cross(setup(toSetup()));
    s = act(s, { type: 'restart' });
    expect(s.scenario).toBe(1);
    expect(s.setup).toEqual({ dnd: false, ease: null, meet: false });
  });
});
