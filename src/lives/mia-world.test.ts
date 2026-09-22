import { describe, it, expect } from 'vitest';
import { createMia, miaReducer, solution, follow, ports, PATHS, type MiaWorld } from './mia-world';
function solve(s: MiaWorld): MiaWorld {
  for (let pass = 0; pass < 4 && !follow(s.tiles).connected; pass++) {
    for (const index of PATHS[s.round]!) {
      const expected = ports(solution(s.round)[index]!).sort().join();
      for (let n = 0; n < 4 && ports(s.tiles[index]!).sort().join() !== expected; n++) {
        s = miaReducer(s, { type: 'rotate', index });
        if (s.distracted !== null) s = miaReducer(s, { type: 'park' });
      }
    }
  }
  return miaReducer(s, { type: 'pulse' });
}
function setup() {
  let s = createMia();
  for (let n = 0; n < 3; n++) s = miaReducer(solve(s), { type: 'next' });
  return s;
}
describe('Mia thought routing', () => {
  it('all three paths connect source to message', () => {
    for (let round = 0; round < 3; round++) expect(follow(solution(round))).toEqual({ trace: PATHS[round], connected: true });
  });
  it('all replay seeds can complete each network despite interruptions', () => {
    for (let seed = 0; seed < 8; seed++) {
      let s = createMia(seed);
      for (let round = 0; round < 3; round++) {
        s = solve(s); expect(s.solved).toBe(true);
        s = miaReducer(s, { type: 'next' });
      }
      expect(s.phase).toBe('setup');
    }
  });
  it('failed pulses preserve every connection and permit recovery', () => {
    const initial = createMia(); const failed = miaReducer(initial, { type: 'pulse' });
    expect(failed.solved).toBe(false); expect(failed.tiles).toEqual(initial.tiles);
    expect(solve(failed).solved).toBe(true);
  });
  it('parking stores the exact thought and stops further nudges', () => {
    let s = createMia();
    for (let n = 0; n < 5; n++) s = miaReducer(s, { type: 'rotate', index: 15 });
    expect(s.distracted).toBe(0); expect(s.shifted).not.toBeNull();
    s = miaReducer(s, { type: 'park' });
    for (let n = 0; n < 20; n++) s = miaReducer(s, { type: 'rotate', index: 15 });
    expect(s.shifts).toBe(1); expect(s.parked).toEqual([0]);
  });
  it('continuing without parking remains recoverable and nudges are bounded', () => {
    let s = createMia();
    for (let n = 0; n < 40; n++) s = miaReducer(s, { type: 'rotate', index: 15 });
    expect(s.shifts).toBe(2); expect(solve(s).solved).toBe(true);
  });
  for (const cue of ['note', 'say'] as const) it(`${cue} preserves the selected connection in a changed revisit`, () => {
    let s = setup(); const index = 6; const turn = s.tiles[index]!.turn;
    s = miaReducer(s, { type: 'cue', cue }); s = miaReducer(s, { type: 'anchor', index });
    s = miaReducer(s, { type: 'revisit' });
    expect(s.phase).toBe('revisit'); expect(s.tiles[index]!.turn).toBe(turn);
    expect(miaReducer(s, { type: 'rotate', index })).toEqual(s);
    for (let n = 0; n < 10; n++) s = miaReducer(s, { type: 'rotate', index: 0 });
    expect(s.tiles[index]!.turn).toBe(turn);
    expect(solve(s).phase).toBe('complete');
  });
  it('only a connected tile can become an anchor and setup must be complete', () => {
    const s = setup(); expect(miaReducer(s, { type: 'anchor', index: 0 }).anchor).toBeNull();
    expect(miaReducer(s, { type: 'revisit' }).phase).toBe('setup');
  });
  it('pause and phase guards protect progress; new runs change rotations', () => {
    const paused = miaReducer(createMia(), { type: 'pause', value: true });
    expect(miaReducer(paused, { type: 'rotate', index: 3 })).toEqual(paused);
    expect(miaReducer(createMia(), { type: 'next' }).round).toBe(0);
    let s = miaReducer(miaReducer(setup(), { type: 'cue', cue: 'note' }), { type: 'anchor', index: 6 });
    s = solve(miaReducer(s, { type: 'revisit' }));
    expect(miaReducer(s, { type: 'rotate', index: 0 })).toEqual(s);
    const replay = miaReducer(s, { type: 'restart' });
    expect(replay.tiles).not.toEqual(createMia().tiles); expect(replay.parked).toEqual([]);
  });
  it('a broken or cyclic network terminates without claiming success', () => {
    expect(follow(Array.from({length:16}, () => ({kind:'line' as const, turn:0}))).connected).toBe(false);
  });
});
