/**
 * Arjun — Hold the thread. A live meeting: remarks drift along the talk stream and the player
 * catches the ones that answer the current question onto a three-card board. Arjun's own ideas
 * drift past too; parking them keeps his attention in the room. Fictional play, never a measure.
 */
export type Speaker = 'noor' | 'rae' | 'sam' | 'arjun';
export type Kind = 'fact' | 'aside' | 'idea';
export interface Line { speaker: Speaker; text: string; kind: Kind; q?: number }
export interface Question { ask: string; decision: string; facts: [Speaker, string][] }
export interface RoundDef { questions: Question[]; asides: [Speaker, string][]; idea?: string; changeAt?: number }
export interface Scenario { rounds: [RoundDef, RoundDef, RoundDef]; revisit: RoundDef & { constraint: [Speaker, string] } }
export interface Remark { id: number; line: number; born: number; life: number; slow?: boolean }
export interface Pin { line: number; stale?: boolean }
export type Phase = 'round' | 'decided' | 'recap' | 'setup' | 'revisit' | 'complete';

export interface ArjunWorld {
  paused: boolean; still: boolean;
  scenario: number; phase: Phase; round: number; question: number; t: number;
  queue: number[]; nextAt: number; stream: Remark[]; nextId: number;
  board: (Pin | null)[]; pocket: string[]; drift: number; askReady: number; constraint: boolean; returnAt: number;
  anchor: boolean; owner: 'noor' | 'rae' | null; when: 'today' | 'tomorrow' | null;
  decisions: string[]; message: string; revision: number;
}
export type ArjunAction =
  | { type: 'tick'; ms: number } | { type: 'pause' } | { type: 'resume' } | { type: 'still'; value: boolean }
  | { type: 'catch'; id: number } | { type: 'clear'; slot: number } | { type: 'ask' } | { type: 'next' } | { type: 'retrieve' }
  | { type: 'continue' } | { type: 'anchor' } | { type: 'keep-idea' } | { type: 'owner'; person: 'noor' | 'rae' }
  | { type: 'when'; when: 'today' | 'tomorrow' } | { type: 'restart' };

export const SCENARIOS: Scenario[] = [
  {
    rounds: [
      { questions: [{ ask: 'Where do we meet?', decision: 'The library.', facts: [['noor', 'Step-free, please'], ['rae', 'Six of us'], ['sam', 'Near the station']] }],
        asides: [['sam', 'Love that jumper'], ['rae', 'Traffic was awful'], ['noor', 'Friday is out'], ['sam', 'Did you see the match?'], ['rae', 'Is there coffee?']], idea: 'The quiet room upstairs' },
      { questions: [{ ask: 'When suits everyone?', decision: 'Thursday, 3pm.', facts: [['rae', 'Not Friday'], ['noor', 'After 2pm'], ['sam', 'About ninety minutes']] }],
        asides: [['noor', 'Step-free matters'], ['sam', 'My cat is sick'], ['rae', 'This coffee is cold'], ['sam', 'Who took my pen?'], ['noor', 'Nice weather']], idea: 'Share notes afterwards' },
      { questions: [
          { ask: 'What does everyone bring?', decision: 'Snacks, laptop, projector.', facts: [['sam', 'I’ll bring snacks'], ['noor', 'I have a projector'], ['rae', 'My laptop']] },
          { ask: 'Who books the room?', decision: 'Rae books by Tuesday.', facts: [['rae', 'I have a card'], ['noor', 'Booking closes Tuesday'], ['sam', 'It needs one name']] }],
        asides: [['sam', 'Still hungry'], ['rae', 'Thursday, right?'], ['noor', 'Love this song'], ['sam', 'Where’s the loo?'], ['rae', 'Parking is tight']], idea: 'A name badge each', changeAt: 17000 },
    ],
    revisit: { questions: [{ ask: 'Next week: still the library?', decision: 'The quiet room, Thursday.', facts: [['noor', 'Still step-free'], ['rae', 'Thursday still works']] }],
      asides: [['sam', 'I brought cake'], ['rae', 'Long week'], ['noor', 'New haircut?'], ['sam', 'Bus was late']], constraint: ['sam', 'The main room is booked'], changeAt: 9000 },
  },
  {
    rounds: [
      { questions: [{ ask: 'Which bed do we plant first?', decision: 'The front bed.', facts: [['noor', 'It needs full sun'], ['rae', 'Close to the tap'], ['sam', 'Easy to reach']] }],
        asides: [['sam', 'My tomatoes died'], ['rae', 'Nice hat'], ['noor', 'Saturday is best'], ['sam', 'Who parked there?'], ['rae', 'Might rain later']], idea: 'A shady bench' },
      { questions: [{ ask: 'When is the working bee?', decision: 'Saturday, 8am.', facts: [['rae', 'Saturday morning'], ['noor', 'Before it gets hot'], ['sam', 'Two hours is plenty']] }],
        asides: [['noor', 'Full sun is key'], ['sam', 'I lost a glove'], ['rae', 'Great muffins'], ['sam', 'That dog again'], ['noor', 'So many snails']], idea: 'A playlist to work to' },
      { questions: [
          { ask: 'What do we need?', decision: 'Seedlings, spades, compost.', facts: [['sam', 'Six seedlings'], ['noor', 'Two spades'], ['rae', 'A bag of compost']] },
          { ask: 'Who waters it?', decision: 'A roster, Rae first.', facts: [['rae', 'I live closest'], ['noor', 'Twice a week'], ['sam', 'Let’s share a roster']] }],
        asides: [['sam', 'Blisters already'], ['rae', 'Eight o’clock?'], ['noor', 'Look, a bee'], ['sam', 'Any more tea?'], ['rae', 'The gate squeaks']], idea: 'Labels for each row', changeAt: 17000 },
    ],
    revisit: { questions: [{ ask: 'Working bee: still Saturday?', decision: 'Front bed, by the shady bench.', facts: [['noor', 'Still Saturday'], ['rae', 'The front bed']] }],
      asides: [['sam', 'I found my glove'], ['rae', 'Busy week'], ['noor', 'The roses bloomed'], ['sam', 'Tea anyone?']], constraint: ['sam', 'It’ll be 35 degrees'], changeAt: 9000 },
  },
  {
    rounds: [
      { questions: [{ ask: 'Which topic do we pick?', decision: 'Local bike paths.', facts: [['noor', 'Due in three weeks'], ['rae', 'It needs real data'], ['sam', 'Something local']] }],
        asides: [['sam', 'I’m so tired'], ['rae', 'Cool shoes'], ['noor', 'Split it in two?'], ['sam', 'Wi-fi is slow'], ['rae', 'Lunch after?']], idea: 'Film a short clip' },
      { questions: [{ ask: 'How do we split it?', decision: 'Two research, two write.', facts: [['rae', 'Two do research'], ['noor', 'I love making maps'], ['sam', 'Rae edits last']] }],
        asides: [['noor', 'Three weeks left'], ['sam', 'Is it hot in here?'], ['rae', 'My phone died'], ['sam', 'Nice slides'], ['noor', 'Who has gum?']], idea: 'A shared checklist' },
      { questions: [
          { ask: 'When do we check in?', decision: 'Mondays, ten minutes.', facts: [['sam', 'Mondays work'], ['noor', 'Keep it short'], ['rae', 'Straight after class']] },
          { ask: 'Where do drafts live?', decision: 'One shared folder.', facts: [['rae', 'One shared folder'], ['noor', 'Name files by date'], ['sam', 'Everyone can edit']] }],
        asides: [['sam', 'Is it Friday yet?'], ['rae', 'Mondays, yes'], ['noor', 'I need a snack'], ['sam', 'Great hoodie'], ['rae', 'Printer’s jammed']], idea: 'Colour-code the maps', changeAt: 17000 },
    ],
    revisit: { questions: [{ ask: 'Draft check: still bike paths?', decision: 'Bike paths, with a short clip.', facts: [['noor', 'Data is in'], ['rae', 'Maps are done']] }],
      asides: [['sam', 'Long weekend'], ['rae', 'Coffee first'], ['noor', 'Love your pen'], ['sam', 'Rain again']], constraint: ['sam', 'They want it visual'], changeAt: 9000 },
  },
];

const LIFE = [8200, 7200, 6400, 7400];
const GAP = [1900, 1600, 1350, 1650];
export const MEETING = [42000, 44000, 50000, 44000];
export const STREAM_MAX = 4;

/** Every line a round can say, in a stable order: facts per question, asides, then Arjun's idea. */
export function lines(s: Pick<ArjunWorld, 'scenario' | 'round'>): Line[] {
  const def = roundDef(s);
  const out: Line[] = [];
  def.questions.forEach((q, qi) => q.facts.forEach(([speaker, text]) => out.push({ speaker, text, kind: 'fact', q: qi })));
  def.asides.forEach(([speaker, text]) => out.push({ speaker, text, kind: 'aside' }));
  const idea = s.round === 3 ? SCENARIOS[s.scenario]!.rounds[0].idea! : def.idea;
  if (idea) out.push({ speaker: 'arjun', text: idea, kind: 'idea', q: s.round === 3 ? 0 : undefined });
  return out;
}
export function roundDef(s: Pick<ArjunWorld, 'scenario' | 'round'>): RoundDef {
  const c = SCENARIOS[s.scenario]!;
  return s.round === 3 ? c.revisit : c.rounds[s.round]!;
}
export function currentQuestion(s: ArjunWorld): Question { return roundDef(s).questions[s.question]!; }
/** The lines the board needs right now; in the revisit Arjun's own saved idea is one of them. */
export function required(s: ArjunWorld): number[] {
  const all = lines(s);
  return all.map((l, i) => ({ l, i })).filter(({ l }) => l.q === s.question && (l.kind === 'fact' || (s.round === 3 && l.kind === 'idea'))).map(({ i }) => i);
}
export function isRelevant(s: ArjunWorld, line: number): boolean { return required(s).includes(line); }
const ideaIndex = (s: ArjunWorld) => lines(s).findIndex(l => l.kind === 'idea');
const pinned = (s: ArjunWorld, line: number) => s.board.some(p => p && !p.stale && p.line === line);
const missing = (s: ArjunWorld) => required(s).filter(line => !pinned(s, line) && !s.stream.some(r => r.line === line) && !(s.round === 3 && line === ideaIndex(s)));
const live = (s: ArjunWorld) => s.phase === 'round' || s.phase === 'revisit';

/** Facts first so the first useful catch arrives within seconds; asides and the idea between them. */
function schedule(s: ArjunWorld): number[] {
  const all = lines(s);
  const facts = all.map((l, i) => ({ l, i })).filter(({ l }) => l.kind === 'fact' && l.q === s.question).map(({ i }) => i);
  const asides = all.map((l, i) => ({ l, i })).filter(({ l }) => l.kind === 'aside').map(({ i }) => i);
  const rot = (s.scenario + s.round + s.question) % asides.length;
  const a = [...asides.slice(rot), ...asides.slice(0, rot)];
  const idea = all.findIndex(l => l.kind === 'idea');
  const withIdea = s.round < 3 && s.question === 0 && idea >= 0;
  return [facts[0]!, a[0]!, facts[1]!, ...(withIdea ? [idea] : []), a[1]!, a[2]!, facts[2] ?? a[3]!, a[3]!, a[4] ?? a[0]!].filter(n => n !== undefined);
}

function start(s: ArjunWorld, round: number): ArjunWorld {
  const next: ArjunWorld = { ...s, phase: round === 3 ? 'revisit' : 'round', round, question: 0, t: 0, nextAt: 600, stream: [], board: [null, null, null], drift: 0, askReady: 0, constraint: false, returnAt: 0, revision: s.revision + 1 };
  next.queue = schedule(next);
  next.message = round === 3 ? 'Same people. The plan has a pin now.' : round === 0 ? 'Catch what answers the question.' : 'Next item.';
  return fill(next);
}

export function createArjun(scenario = 0, still = false): ArjunWorld {
  return start({ paused: false, still, scenario: scenario % SCENARIOS.length, phase: 'round', round: 0, question: 0, t: 0, queue: [], nextAt: 0, stream: [], nextId: 1, board: [null, null, null], pocket: [], drift: 0, askReady: 0, constraint: false, returnAt: 0, anchor: false, owner: null, when: null, decisions: [], message: '', revision: 0 }, 0);
}

function spawn(s: ArjunWorld, line: number, slow = false): ArjunWorld {
  // One speed for every remark, so lanes never overlap; a repeat is marked, not slowed.
  const life = s.still || s.phase === 'recap' ? Number.POSITIVE_INFINITY : LIFE[s.round]!;
  return { ...s, stream: [...s.stream, { id: s.nextId, line, born: s.t, life, slow }], nextId: s.nextId + 1 };
}
/** Top up the queue with anything still missing, so no meeting can stall. */
function refill(s: ArjunWorld): ArjunWorld {
  if (s.queue.length) return s;
  const asides = lines(s).map((l, i) => ({ l, i })).filter(({ l }) => l.kind === 'aside').map(({ i }) => i);
  const queue = missing(s).flatMap((line, n) => [line, asides[(s.revision + n) % asides.length]!]);
  return { ...s, queue: queue.length ? queue : [asides[s.revision % asides.length]!] };
}
/** In still mode the stream holds three remarks and moves only when the player acts. */
function fill(s: ArjunWorld): ArjunWorld {
  if (!s.still || !live(s)) return s;
  let next = s;
  while (next.stream.length < 3) { next = refill(next); const [line, ...queue] = next.queue; next = spawn({ ...next, queue }, line!); }
  return next;
}

function complete(s: ArjunWorld): ArjunWorld {
  const need = required(s);
  const done = need.every(line => pinned(s, line)) && s.board.every(p => p && !p.stale && need.includes(p.line));
  if (!done) return s;
  const decision = currentQuestion(s).decision;
  if (s.round === 3) return { ...s, phase: 'complete', stream: [], decisions: [...s.decisions, decision], message: '', revision: s.revision + 1 };
  return { ...s, phase: 'decided', stream: [], decisions: [...s.decisions, decision], message: '', revision: s.revision + 1 };
}

/** Advance the meeting by one step of time. Still mode reuses it without expiry or a closing bell. */
function advance(s: ArjunWorld, ms: number): ArjunWorld {
  let n: ArjunWorld = { ...s, t: s.t + ms, drift: Math.max(0, s.drift - ms) };
  const def = roundDef(n);
  if (!n.still) {
    const gone = n.stream.filter(r => n.t - r.born >= r.life);
    if (gone.length) {
      n = { ...n, stream: n.stream.filter(r => !gone.includes(r)) };
      for (const r of gone) {
        const l = lines(n)[r.line]!;
        if (l.kind === 'idea' && n.round < 3) n = { ...n, drift: 3200, queue: [...n.queue, r.line], message: 'Arjun drifted. Park a thought to stay here.' };
        else if (l.kind === 'idea') n = { ...n, returnAt: n.t + 2500 };
        else if (isRelevant(n, r.line)) n = { ...n, message: 'Missed one. It will come round, or ask.' };
      }
    }
  }
  if (def.changeAt !== undefined && n.t >= def.changeAt) {
    if (n.round < 3 && n.question === 0 && def.questions.length > 1) {
      n = { ...n, question: 1, board: n.board.map(p => p && { ...p, stale: true }), stream: n.stream.filter(r => lines(n)[r.line]!.kind !== 'fact'), message: 'The agenda changed. Clear the old cards.', revision: n.revision + 1 };
      n = { ...n, queue: schedule(n) };
    } else if (n.round === 3 && !n.constraint) {
      const [, text] = SCENARIOS[n.scenario]!.revisit.constraint;
      n = { ...n, constraint: true, message: `${text}. Arjun had an idea for this.`, returnAt: n.pocket.includes(lines(n)[ideaIndex(n)]!.text) ? 0 : n.t + 6000, revision: n.revision + 1 };
    }
  }
  if (n.round === 3 && n.returnAt && n.t >= n.returnAt && !n.stream.some(r => r.line === ideaIndex(n)) && !pinned(n, ideaIndex(n))) {
    n = spawn({ ...n, returnAt: 0, message: 'The idea came back.' }, ideaIndex(n), true);
  }
  if (!n.still && n.t >= n.nextAt && n.stream.length < STREAM_MAX) {
    n = refill(n);
    const [line, ...queue] = n.queue;
    n = spawn({ ...n, queue, nextAt: n.t + GAP[n.round]! }, line!);
  }
  if (!n.still && n.t >= MEETING[n.round]! && n.phase === 'round') {
    const stream = missing({ ...n, stream: [] });
    let recap: ArjunWorld = { ...n, phase: 'recap', stream: [], queue: [], message: 'Time’s up. Catch up on what you missed.', revision: n.revision + 1 };
    for (const line of stream) recap = spawn(recap, line);
    n = recap;
  }
  return n;
}

export function arjunReducer(s: ArjunWorld, a: ArjunAction): ArjunWorld {
  if (a.type === 'pause') return s.paused ? s : { ...s, paused: true };
  if (a.type === 'resume') return s.paused ? { ...s, paused: false } : s;
  if (a.type === 'still') {
    if (a.value === s.still) return s;
    const stream = s.stream.map(r => ({ ...r, born: s.t, life: a.value ? Number.POSITIVE_INFINITY : LIFE[s.round]! }));
    return fill({ ...s, still: a.value, stream });
  }
  if (s.paused) return s;
  if (a.type === 'tick') return live(s) && !s.still ? advance(s, a.ms) : s;
  if (a.type === 'restart') return s.phase === 'complete' ? createArjun(s.scenario + 1, s.still) : s;

  if (a.type === 'catch' && (live(s) || s.phase === 'recap')) {
    const remark = s.stream.find(r => r.id === a.id);
    if (!remark) return s;
    const line = lines(s)[remark.line]!;
    const stream = s.stream.filter(r => r.id !== a.id);
    if (line.kind === 'idea' && s.round < 3) {
      const next = { ...s, stream, pocket: s.pocket.includes(line.text) ? s.pocket : [...s.pocket, line.text], message: 'Parked. The idea will keep.', revision: s.revision + 1 };
      return step(next);
    }
    const slot = s.board.findIndex(p => p === null);
    if (slot < 0) return { ...s, message: 'The board is full. Clear a card.' };
    const board = s.board.map((p, i) => i === slot ? { line: remark.line } : p);
    const relevant = isRelevant(s, remark.line);
    return step(complete({ ...s, stream, board, message: relevant ? 'Pinned.' : 'That one is off topic. Tap it to clear.', revision: s.revision + 1 }));
  }
  if (a.type === 'clear' && (live(s) || s.phase === 'recap')) {
    if (!s.board[a.slot]) return s;
    const next = { ...s, board: s.board.map((p, i) => i === a.slot ? null : p), message: 'Space cleared.' };
    if (s.phase === 'recap') {
      const line = s.board[a.slot]!.line;
      return isRelevant(s, line) && !s.board[a.slot]!.stale && !next.stream.some(r => r.line === line) ? spawn(next, line) : next;
    }
    return next;
  }
  if (a.type === 'ask' && live(s)) {
    const need = missing(s);
    if (!need.length || s.t < s.askReady) return s;
    const speaker = lines(s)[need[0]!]!.speaker;
    const next = spawn({ ...s, queue: s.queue.filter(n => n !== need[0]), askReady: s.t + 3500, nextAt: s.t + GAP[s.round]!, message: `Could you say that again, ${name(speaker)}?` }, need[0]!, true);
    return next;
  }
  if (a.type === 'next' && s.still && live(s)) {
    const [oldest, ...rest] = s.stream;
    if (!oldest) return s;
    const l = lines(s)[oldest.line]!;
    let n: ArjunWorld = { ...s, stream: rest, queue: l.kind === 'idea' || isRelevant(s, oldest.line) ? [...s.queue, oldest.line] : s.queue, message: l.kind === 'idea' && s.round < 3 ? 'Arjun drifted. Park a thought to stay here.' : 'Let it pass.' };
    if (l.kind === 'idea' && s.round < 3) n = { ...n, drift: 1 };
    return step(n);
  }
  if (a.type === 'retrieve' && s.round === 3 && s.phase === 'revisit' && s.constraint) {
    const idea = ideaIndex(s);
    if (!s.pocket.includes(lines(s)[idea]!.text) || pinned(s, idea) || s.stream.some(r => r.line === idea)) return s;
    return spawn({ ...s, returnAt: 0, message: 'Arjun: what about the idea I saved?' }, idea, true);
  }
  if (a.type === 'continue') {
    if (s.phase === 'decided') return s.round < 2 ? start(s, s.round + 1) : { ...s, phase: 'setup', message: '', revision: s.revision + 1 };
    if (s.phase === 'setup' && ready(s)) return start(s, 3);
    return s;
  }
  if (s.phase === 'setup') {
    if (a.type === 'anchor') return { ...s, anchor: true, message: 'The question is pinned to the board.' };
    if (a.type === 'keep-idea') {
      const idea = SCENARIOS[s.scenario]!.rounds[0].idea!;
      return s.pocket.includes(idea) ? s : { ...s, pocket: [idea, ...s.pocket], message: 'The idea is in the pocket.' };
    }
    if (a.type === 'owner') return { ...s, owner: a.person, when: null, message: a.person === 'rae' ? 'Rae: tomorrow works for me.' : 'Noor: today or tomorrow is fine.' };
    if (a.type === 'when' && s.owner) {
      if (s.owner === 'rae' && a.when === 'today') return { ...s, message: 'Rae: today is full. Tomorrow?' };
      return { ...s, when: a.when, message: `${name(s.owner)} follows up ${a.when}.` };
    }
  }
  return s;
}

/** A still-mode action also moves the meeting on by one remark. */
function step(s: ArjunWorld): ArjunWorld {
  if (!s.still || !live(s)) return s;
  return fill(advance({ ...s, drift: 0 }, GAP[s.round]!));
}
export function ready(s: ArjunWorld) { return s.anchor && s.pocket.includes(SCENARIOS[s.scenario]!.rounds[0].idea!) && Boolean(s.owner && s.when); }
export function name(p: Speaker) { return p === 'noor' ? 'Noor' : p === 'rae' ? 'Rae' : p === 'sam' ? 'Sam' : 'Arjun'; }
export function remarkX(s: ArjunWorld, r: Remark) { return r.life === Number.POSITIVE_INFINITY ? null : Math.min(1, Math.max(0, (s.t - r.born) / r.life)); }
export function remaining(s: ArjunWorld) { return Math.max(0, Math.ceil((MEETING[s.round]! - s.t) / 1000)); }
export function running(s: ArjunWorld) { return s.phase === 'round' || s.phase === 'revisit'; }
