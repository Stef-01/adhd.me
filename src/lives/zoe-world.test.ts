import { describe, it, expect } from 'vitest';
import { createZoe, zoeReducer, words, hotLeft, beatDef, fuseLength, SCENARIOS, type ZoeWorld, type ZoeAction } from './zoe-world';

const act = (s: ZoeWorld, ...actions: ZoeAction[]) => actions.reduce(zoeReducer, s);
const tick = (s: ZoeWorld, ms: number) => { for (let t = 0; t < ms; t += 50) s = zoeReducer(s, { type: 'tick', ms: 50 }); return s; };
/** A steady replier: cools each sharp phrase as soon as it appears, sends once the draft is clean. */
function reply(s: ZoeWorld) {
  for (let t = 0; t < 30000 && (s.phase === 'typing' || s.phase === 'revisit'); t += 50) {
    words(s).forEach((w, i) => { if (w.hot && i < s.typed) s = act(s, { type: 'cool', index: i }); });
    if (s.typed >= beatDef(s).zoe.length && hotLeft(s) === 0) s = act(s, { type: 'send' });
    else s = zoeReducer(s, { type: 'tick', ms: 50 });
  }
  return s;
}
function toSetup(s = createZoe()) { for (let b = 0; b < 3; b++) { s = reply(s); expect(s.phase).toBe('reply'); s = act(s, { type: 'continue' }); } return s; }
const setup = (s: ZoeWorld) => act(s, { type: 'owner', who: 'rae' }, { type: 'day', day: 'sat' }, { type: 'calendar' }, { type: 'keep' }, { type: 'continue' });

describe('Zoe: before you send', () => {
  it('every scenario runs three replies, a setup and a revisit to completion', () => {
    for (let n = 0; n < SCENARIOS.length; n++) {
      let s = toSetup(createZoe(n));
      expect(s.phase).toBe('setup');
      s = setup(s); expect(s.phase).toBe('revisit');
      s = reply(s); expect(s.phase).toBe('complete');
      expect(s.sends.every(x => !x.sharp)).toBe(true);
      expect(s.sends).toHaveLength(4);
    }
  });
  it('the reply types itself phrase by phrase and the fuse runs', () => {
    const s = tick(createZoe(), 1000);
    expect(s.typed).toBe(1);
    expect(s.fuse).toBe(1000);
  });
  it('cooling keeps the feeling in the jar and changes what is said', () => {
    let s = tick(createZoe(), 1000);
    s = act(s, { type: 'cool', index: 0 });
    expect(s.jar).toEqual(['Whatever.']);
    expect(words(s)[0]!.text).toBe('Oh, that’s a shame.');
    expect(act(s, { type: 'cool', index: 0 }).jar).toHaveLength(1);
  });
  it('an untyped phrase or a calm phrase cannot be cooled', () => {
    let s = createZoe();
    expect(act(s, { type: 'cool', index: 0 }).cooled).toEqual([]);
    s = tick(s, 2000);
    expect(act(s, { type: 'cool', index: 1 }).cooled).toEqual([]);
  });
  it('the fuse sends whatever is there; sharp words lead to a repair, not a reset', () => {
    let s = tick(createZoe(), fuseLength(createZoe()) + 100);
    expect(s.phase).toBe('repair');
    expect(s.sends[0]).toEqual({ beat: 0, sharp: true });
    s = act(s, { type: 'repair' });
    expect(s.phase).toBe('reply');
    expect(s.repaired).toBe(true);
    s = act(s, { type: 'continue' });
    expect(s.beat).toBe(1);
  });
  it('breathe holds the typing and the fuse, then needs a moment before the next one', () => {
    let s = tick(createZoe(), 500);
    s = act(s, { type: 'breathe' });
    const held = tick(s, 2000);
    expect(held.fuse).toBe(s.fuse);
    expect(held.typed).toBe(s.typed);
    expect(act(held, { type: 'breathe' }).holdUntil).toBe(held.holdUntil);
    const later = tick(held, 4000);
    expect(later.fuse).toBeGreaterThan(s.fuse);
  });
  it('send waits until the whole reply has typed', () => {
    let s = tick(createZoe(), 900);
    expect(act(s, { type: 'send' }).phase).toBe('typing');
    s = tick(s, 2000);
    words(s).forEach((w, i) => { if (w.hot) s = act(s, { type: 'cool', index: i }); });
    expect(act(s, { type: 'send' }).phase).toBe('reply');
  });
  it('setup: Rae declines Thursday, and the plan needs a calendar and the jar', () => {
    let s = toSetup();
    s = act(s, { type: 'owner', who: 'zoe' }, { type: 'day', day: 'thu' });
    expect(s.day).toBeNull();
    expect(s.message).toContain('Thursday');
    s = act(s, { type: 'day', day: 'sat' }, { type: 'continue' });
    expect(s.phase).toBe('setup');
    s = act(s, { type: 'calendar' }, { type: 'keep' }, { type: 'continue' });
    expect(s.phase).toBe('revisit');
  });
  it('the revisit reply carries the agreed plan in its own words', () => {
    let s = setup(toSetup());
    s = tick(s, 3000);
    expect(words(s).some(w => w.plan && w.text === 'Saturday at 7.')).toBe(true);
  });
  it('still mode shows the whole reply and never sends by itself', () => {
    let s = createZoe(0, true);
    expect(s.typed).toBe(beatDef(s).zoe.length);
    s = tick(s, 30000);
    expect(s.phase).toBe('typing');
    s = reply(s);
    expect(s.phase).toBe('reply');
  });
  it('pause freezes the fuse and ignores taps', () => {
    let s = tick(createZoe(), 1200);
    s = act(s, { type: 'pause' });
    const held = act(tick(s, 5000), { type: 'cool', index: 0 });
    expect(held.fuse).toBe(s.fuse);
    expect(held.cooled).toEqual([]);
  });
  it('another conversation rotates the scenario and empties the jar', () => {
    let s = reply(setup(toSetup()));
    s = act(s, { type: 'restart' });
    expect(s.scenario).toBe(1);
    expect(s.jar).toEqual([]);
  });
});
