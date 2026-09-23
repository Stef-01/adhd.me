import { describe, it, expect } from 'vitest';
import { arjunReducer, createArjun, lines, required, isRelevant, SCENARIOS, MEETING, type ArjunWorld, type ArjunAction } from './arjun-world';

const act = (s: ArjunWorld, ...actions: ArjunAction[]) => actions.reduce(arjunReducer, s);
const tick = (s: ArjunWorld, ms: number) => { for (let t = 0; t < ms; t += 50) s = arjunReducer(s, { type: 'tick', ms: 50 }); return s; };
/** A good listener: catches every relevant remark and every idea, clears stale cards. */
function listen(s: ArjunWorld, ms = 60000, parkIdeas = true) {
  for (let t = 0; t < ms && (s.phase === 'round' || s.phase === 'revisit' || s.phase === 'recap'); t += 50) {
    s.board.forEach((p, slot) => { if (p && (p.stale || !isRelevant(s, p.line))) s = act(s, { type: 'clear', slot }); });
    for (const r of s.stream) {
      const l = lines(s)[r.line]!;
      if (isRelevant(s, r.line) || (parkIdeas && l.kind === 'idea')) s = act(s, { type: 'catch', id: r.id });
    }
    if (s.phase === 'revisit' && s.constraint) s = act(s, { type: 'retrieve' });
    if (s.phase !== 'recap') s = arjunReducer(s, { type: 'tick', ms: 50 });
  }
  return s;
}
function toSetup(s = createArjun(), park = true) {
  for (let r = 0; r < 3; r++) { s = listen(s, 70000, park); expect(s.phase).toBe('decided'); s = act(s, { type: 'continue' }); }
  return s;
}
const setup = (s: ArjunWorld) => act(s, { type: 'anchor' }, { type: 'keep-idea' }, { type: 'owner', person: 'rae' }, { type: 'when', when: 'tomorrow' }, { type: 'continue' });

describe('Arjun: hold the thread', () => {
  it('every scenario plays three rounds, a setup and a revisit to completion', () => {
    for (let n = 0; n < SCENARIOS.length; n++) {
      let s = toSetup(createArjun(n));
      expect(s.phase).toBe('setup');
      s = setup(s); expect(s.phase).toBe('revisit');
      s = listen(s); expect(s.phase).toBe('complete');
      expect(s.decisions).toHaveLength(4);
      expect(s.decisions[3]).toBe(SCENARIOS[n]!.revisit.questions[0]!.decision);
    }
  });
  it('the first useful remark arrives within the first second and names the question', () => {
    const s = tick(createArjun(), 700);
    expect(s.stream).toHaveLength(1);
    expect(isRelevant(s, s.stream[0]!.line)).toBe(true);
  });
  it('an aside takes a card; the board holds three and a full board refuses politely', () => {
    let s = createArjun();
    const asides = lines(s).map((l, i) => ({ l, i })).filter(x => x.l.kind === 'aside');
    s = { ...s, stream: asides.slice(0, 4).map((x, n) => ({ id: 100 + n, line: x.i, born: 0, life: 9e9 })) };
    s = act(s, { type: 'catch', id: 100 }, { type: 'catch', id: 101 }, { type: 'catch', id: 102 });
    expect(s.board.every(Boolean)).toBe(true);
    s = act(s, { type: 'catch', id: 103 });
    expect(s.message).toContain('full');
    expect(s.stream.map(r => r.id)).toEqual([103]);
    s = act(s, { type: 'clear', slot: 1 });
    expect(s.board[1]).toBeNull();
  });
  it('duplicate and stale catches are harmless', () => {
    let s = tick(createArjun(), 700);
    const id = s.stream[0]!.id;
    s = act(s, { type: 'catch', id });
    const once = s;
    s = act(s, { type: 'catch', id }, { type: 'catch', id: 9999 });
    expect(s.board).toEqual(once.board);
  });
  it('a missed fact comes round again and a meeting cannot stall', () => {
    let s = tick(createArjun(), 30000);
    // Nobody caught anything: facts keep repeating rather than vanishing for good.
    const said = new Set<number>();
    for (let t = 0; t < 10000; t += 50) { s = arjunReducer(s, { type: 'tick', ms: 50 }); s.stream.forEach(r => said.add(r.line)); }
    expect(required(s).some(line => said.has(line))).toBe(true);
    s = tick(s, MEETING[0]!);
    expect(s.phase).toBe('recap');
    expect(s.stream.length).toBe(3);
    s = listen(s);
    expect(s.phase).toBe('decided');
  });
  it('asking again brings the missing fact back slowly, then waits a moment', () => {
    let s = tick(createArjun(), 700);
    s = { ...s, stream: [] };
    s = act(s, { type: 'ask' });
    expect(s.stream).toHaveLength(1);
    expect(s.stream[0]!.slow).toBe(true);
    const before = s.stream.length;
    s = act(s, { type: 'ask' });
    expect(s.stream.length).toBe(before);
  });
  it('an unparked idea makes Arjun drift, and the thought comes back later', () => {
    let s = createArjun();
    const idea = lines(s).findIndex(l => l.kind === 'idea');
    s = { ...s, stream: [{ id: 50, line: idea, born: 0, life: 100 }], queue: [], nextAt: 1e9 };
    s = tick(s, 150);
    expect(s.drift).toBeGreaterThan(0);
    expect(s.queue).toContain(idea);
  });
  it('parking the idea keeps it in the pocket', () => {
    let s = createArjun();
    const idea = lines(s).findIndex(l => l.kind === 'idea');
    s = act({ ...s, stream: [{ id: 50, line: idea, born: 0, life: 9e9 }] }, { type: 'catch', id: 50 });
    expect(s.pocket).toEqual([SCENARIOS[0]!.rounds[0].idea]);
    expect(s.board.every(p => p === null)).toBe(true);
  });
  it('the round three agenda change turns earlier cards stale', () => {
    let s = toSetup();
    // Replay round three by hand: pin a first-question fact, then let the agenda change.
    s = createArjun(); for (let r = 0; r < 2; r++) { s = listen(s, 70000); s = act(s, { type: 'continue' }); }
    expect(s.round).toBe(2);
    for (let t = 0; t < 8000 && !s.board[0]; t += 50) { const r = s.stream.find(x => isRelevant(s, x.line)); if (r) s = act(s, { type: 'catch', id: r.id }); s = arjunReducer(s, { type: 'tick', ms: 50 }); }
    expect(s.board[0]).not.toBeNull();
    s = tick(s, 17000);
    expect(s.question).toBe(1);
    expect(s.board[0]!.stale).toBe(true);
  });
  it('setup needs the pin, the idea and an agreed follow-up; Rae declines today', () => {
    let s = toSetup(createArjun(), false);
    s = act(s, { type: 'anchor' }, { type: 'continue' });
    expect(s.phase).toBe('setup');
    s = act(s, { type: 'owner', person: 'rae' }, { type: 'when', when: 'today' });
    expect(s.when).toBeNull(); expect(s.message).toContain('today is full');
    s = act(s, { type: 'keep-idea' }, { type: 'when', when: 'tomorrow' }, { type: 'continue' });
    expect(s.phase).toBe('revisit');
    expect(s.owner).toBe('rae');
  });
  it('the saved idea is what solves the revisit, retrieved from the pocket on demand', () => {
    let s = setup(toSetup());
    s = tick(s, 9100);
    expect(s.constraint).toBe(true);
    s = act(s, { type: 'retrieve' });
    const idea = lines(s).findIndex(l => l.kind === 'idea');
    expect(s.stream.some(r => r.line === idea)).toBe(true);
    expect(required(s)).toContain(idea);
  });
  it('without a retrieve the idea still returns, later', () => {
    let s = setup(toSetup());
    s = tick(s, 9100);
    const idea = lines(s).findIndex(l => l.kind === 'idea');
    expect(s.stream.some(r => r.line === idea)).toBe(false);
    s = { ...s, returnAt: s.t + 10 };
    s = tick(s, 100);
    expect(s.stream.some(r => r.line === idea)).toBe(true);
  });
  it('still mode never expires remarks and moves one remark per action', () => {
    let s = createArjun(0, true);
    expect(s.stream).toHaveLength(3);
    const before = s.stream.map(r => r.id);
    s = tick(s, 60000);
    expect(s.stream.map(r => r.id)).toEqual(before);
    s = act(s, { type: 'next' });
    expect(s.stream[0]!.id).toBe(before[1]);
    expect(s.stream).toHaveLength(3);
    s = toSetupStill(s);
    expect(s.phase).toBe('setup');
  });
  it('pause freezes time and input', () => {
    let s = tick(createArjun(), 700);
    s = act(s, { type: 'pause' });
    const frozen = tick(s, 5000);
    expect(frozen.t).toBe(s.t);
    expect(act(frozen, { type: 'catch', id: s.stream[0]!.id }).stream).toHaveLength(1);
  });
  it('another meeting rotates the scenario', () => {
    let s = listen(setup(toSetup()));
    s = act(s, { type: 'restart' });
    expect(s.scenario).toBe(1);
    expect(s.phase).toBe('round');
    expect(s.pocket).toEqual([]);
  });
});

function toSetupStill(s: ArjunWorld) {
  for (let guard = 0; guard < 400 && s.phase !== 'setup'; guard++) {
    if (s.phase === 'decided') { s = act(s, { type: 'continue' }); continue; }
    const stale = s.board.findIndex(p => p && (p.stale || !isRelevant(s, p.line)));
    if (stale >= 0) { s = act(s, { type: 'clear', slot: stale }); continue; }
    const r = s.stream.find(x => isRelevant(s, x.line) || lines(s)[x.line]!.kind === 'idea');
    s = r ? act(s, { type: 'catch', id: r.id }) : act(s, { type: 'next' });
  }
  return s;
}
