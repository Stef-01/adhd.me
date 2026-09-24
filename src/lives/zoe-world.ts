/**
 * Zoe — Before you send. Zoe's first reply types itself while a send fuse fills. Tapping a sharp
 * phrase turns it into what she actually means; the original goes into a private jar, kept, not
 * deleted. Breathe holds the typing and the fuse for a moment. If the fuse runs out with sharp
 * words left, the message sends and a repair follows. Fictional; no message text leaves memory.
 */
export interface Chunk { text: string; swap?: string; plan?: boolean }
export interface Beat { from: string; zoe: Chunk[]; warm: string; hurt: string }
export interface Scenario { name: 'Rae'; beats: [Beat, Beat, Beat]; revisit: Beat }
export type Phase = 'typing' | 'reply' | 'repair' | 'setup' | 'revisit' | 'complete';

const c = (text: string, swap?: string): Chunk => ({ text, swap });
export const SCENARIOS: Scenario[] = [
  { name: 'Rae', beats: [
      { from: 'Can we move dinner? Work ran late.', zoe: [c('Whatever.', 'Oh, that’s a shame.'), c('Sure.'), c('Guess work wins.', 'Is Friday free?')], warm: 'Friday works. Thank you.', hurt: 'Ouch. I did say sorry.' },
      { from: 'Sorry I missed your call.', zoe: [c('Hey.'), c('You never pick up.', 'I missed you today.'), c('Call me'), c('if you can be bothered.', 'when you’re free?')], warm: 'Calling at 8. Miss you too.', hurt: 'That feels unfair.' },
      { from: 'I thought you were doing the dishes?', zoe: [c('Seriously?', 'Oh, I didn’t know.'), c('I cooked,'), c('you always do this.', 'so could you wash?'), c('Fine.', 'Let’s split it.')], warm: 'Deal. I’ll wash, you dry.', hurt: 'Wow. Okay.' },
    ],
    revisit: { from: 'Still on for our plan?', zoe: [c('Yes!'), { text: '', plan: true }, c('Don’t flake again.', 'Can’t wait.')], warm: 'See you then.', hurt: 'Again? That hurt.' } },
  { name: 'Rae', beats: [
      { from: 'I can’t make the movie tonight.', zoe: [c('Typical.', 'Oh no, I was excited.'), c('Okay.'), c('Don’t bother next time.', 'Another night?')], warm: 'Thursday? My treat.', hurt: 'That’s harsh.' },
      { from: 'Did you see my text earlier?', zoe: [c('Obviously not.', 'Sorry, I missed it.'), c('I was'), c('busy, unlike you.', 'at work. What’s up?')], warm: 'Just checking in.', hurt: 'Right. Sorry I asked.' },
      { from: 'Can you get the groceries?', zoe: [c('Why is it always me?', 'I did them last week.'), c('I can'), c('I guess.', 'if you cook tonight.')], warm: 'Fair. I’ll cook.', hurt: 'Never mind then.' },
    ],
    revisit: { from: 'Are we still on?', zoe: [c('Yes,'), { text: '', plan: true }, c('if you actually show.', 'Looking forward to it.')], warm: 'Wouldn’t miss it.', hurt: 'That stung.' } },
  { name: 'Rae', beats: [
      { from: 'Running 20 minutes late, sorry!', zoe: [c('Unbelievable.', 'Okay, thanks for telling me.'), c('I’m here'), c('like an idiot.', 'at the window seat.')], warm: 'On my way. Order me a tea?', hurt: 'I said sorry…' },
      { from: 'I forgot your book, sorry.', zoe: [c('Of course you did.', 'Ah, no worries.'), c('Bring it'), c('if you remember.', 'next time?')], warm: 'Setting a reminder now.', hurt: 'I feel bad enough.' },
      { from: 'Who was meant to book the table?', zoe: [c('Not me, clearly.', 'I thought you were.'), c('Let’s'), c('just forget it.', 'book it together now.')], warm: 'Doing it now. 7:30?', hurt: 'Okay, forget it then.' },
    ],
    revisit: { from: 'Is our plan still good?', zoe: [c('Yes,'), { text: '', plan: true }, c('don’t be late.', 'see you there.')], warm: 'Early, promise.', hurt: 'Noted.' } },
];

const TYPE = [900, 780, 680, 820];
const FUSE = [9000, 8200, 7400, 9000];
const BREATH = 2600, BREATH_COOLDOWN = 5200;

export interface ZoeWorld {
  paused: boolean; still: boolean; scenario: number; phase: Phase; beat: number; t: number;
  typed: number; typeClock: number; fuse: number; holdUntil: number; breathReady: number;
  cooled: number[]; jar: string[]; sentSharp: boolean; repaired: boolean; sends: { beat: number; sharp: boolean }[];
  owner: 'zoe' | 'rae' | null; day: 'thu' | 'sat' | null; calendar: boolean; kept: boolean;
  message: string; revision: number;
}
export type ZoeAction =
  | { type: 'tick'; ms: number } | { type: 'pause' } | { type: 'resume' } | { type: 'still'; value: boolean }
  | { type: 'cool'; index: number } | { type: 'breathe' } | { type: 'send' } | { type: 'repair' } | { type: 'continue' }
  | { type: 'owner'; who: 'zoe' | 'rae' } | { type: 'day'; day: 'thu' | 'sat' } | { type: 'calendar' } | { type: 'keep' } | { type: 'restart' };

export function beatDef(s: Pick<ZoeWorld, 'scenario' | 'beat'>): Beat { const sc = SCENARIOS[s.scenario]!; return s.beat === 3 ? sc.revisit : sc.beats[s.beat]!; }
export const dayName = (d: 'thu' | 'sat' | null) => d === 'thu' ? 'Thursday' : 'Saturday';
/** What each chunk says right now: the plan fills in from setup; cooled chunks say what she means. */
export function words(s: ZoeWorld): { text: string; hot: boolean; plan: boolean }[] {
  return beatDef(s).zoe.map((ch, i) => ch.plan ? { text: `${dayName(s.day)} at 7.`, hot: false, plan: true }
    : s.cooled.includes(i) ? { text: ch.swap!, hot: false, plan: false } : { text: ch.text, hot: Boolean(ch.swap), plan: false });
}
export const hotLeft = (s: ZoeWorld) => words(s).slice(0, s.typed).filter(w => w.hot).length + words(s).slice(s.typed).filter(w => w.hot).length;
const live = (s: ZoeWorld) => s.phase === 'typing' || s.phase === 'revisit';
export function running(s: ZoeWorld) { return live(s); }
export const fuseLength = (s: Pick<ZoeWorld, 'beat'>) => FUSE[s.beat]!;

function start(s: ZoeWorld, beat: number): ZoeWorld {
  const n: ZoeWorld = { ...s, beat, phase: beat === 3 ? 'revisit' : 'typing', t: 0, typed: 0, typeClock: 0, fuse: 0, holdUntil: 0, breathReady: 0, cooled: [], sentSharp: false, repaired: false, revision: s.revision + 1 };
  n.message = beat === 0 ? 'Tap the sharp words before it sends.' : '';
  return s.still ? { ...n, typed: beatDef(n).zoe.length } : n;
}
export function createZoe(scenario = 0, still = false): ZoeWorld {
  return start({ paused: false, still, scenario: scenario % SCENARIOS.length, phase: 'typing', beat: 0, t: 0, typed: 0, typeClock: 0, fuse: 0, holdUntil: 0, breathReady: 0, cooled: [], jar: [], sentSharp: false, repaired: false, sends: [], owner: null, day: null, calendar: false, kept: false, message: '', revision: 0 }, 0);
}
function send(s: ZoeWorld): ZoeWorld {
  const sharp = hotLeft(s) > 0;
  const sends = [...s.sends, { beat: s.beat, sharp }];
  if (sharp) return { ...s, phase: 'repair', sentSharp: true, sends, message: '', revision: s.revision + 1 };
  return { ...s, phase: s.beat === 3 ? 'complete' : 'reply', sends, message: '', revision: s.revision + 1 };
}

export function zoeReducer(s: ZoeWorld, a: ZoeAction): ZoeWorld {
  if (a.type === 'pause') return s.paused ? s : { ...s, paused: true };
  if (a.type === 'resume') return s.paused ? { ...s, paused: false } : s;
  if (a.type === 'still') return a.value === s.still ? s : { ...s, still: a.value, typed: a.value ? beatDef(s).zoe.length : s.typed };
  if (s.paused) return s;
  if (a.type === 'restart') return s.phase === 'complete' ? createZoe(s.scenario + 1, s.still) : s;
  if (a.type === 'tick') {
    if (!live(s) || s.still) return s;
    const n = { ...s, t: s.t + a.ms };
    if (n.t < n.holdUntil) return n;
    const total = beatDef(n).zoe.length;
    let typeClock = n.typeClock + a.ms, typed = n.typed;
    while (typed < total && typeClock >= TYPE[n.beat]!) { typed++; typeClock -= TYPE[n.beat]!; }
    const fuse = n.fuse + a.ms;
    const next = { ...n, typed, typeClock, fuse };
    return fuse >= FUSE[n.beat]! ? send(next) : next;
  }
  if (live(s)) {
    if (a.type === 'cool') {
      const ch = beatDef(s).zoe[a.index];
      if (!ch?.swap || a.index >= s.typed || s.cooled.includes(a.index)) return s;
      return { ...s, cooled: [...s.cooled, a.index], jar: [...s.jar, ch.text], message: 'Kept in the jar. Said what you mean.' };
    }
    if (a.type === 'breathe') {
      if (s.still || s.t < s.breathReady) return s;
      return { ...s, holdUntil: s.t + BREATH, breathReady: s.t + BREATH_COOLDOWN, message: 'Breathe out. It waits.' };
    }
    if (a.type === 'send') return s.typed >= beatDef(s).zoe.length ? send(s) : s;
    return s;
  }
  if (s.phase === 'repair' && a.type === 'repair') return { ...s, phase: s.beat === 3 ? 'complete' : 'reply', repaired: true, message: '', revision: s.revision + 1 };
  if (a.type === 'continue') {
    if (s.phase === 'reply') return s.beat < 2 ? start(s, s.beat + 1) : { ...s, phase: 'setup', message: '', revision: s.revision + 1 };
    if (s.phase === 'setup' && s.owner && s.day && s.calendar && s.kept) return start(s, 3);
    return s;
  }
  if (s.phase === 'setup') {
    if (a.type === 'owner') return { ...s, owner: a.who, message: a.who === 'rae' ? 'Rae: I’ll check in.' : 'You’ll check in.' };
    if (a.type === 'day') {
      if (a.day === 'thu') return { ...s, message: 'Rae: Thursday’s full. Saturday?' };
      return { ...s, day: 'sat', message: 'Saturday at 7. Agreed.' };
    }
    if (a.type === 'calendar' && s.day) return { ...s, calendar: true, message: 'In both calendars.' };
    if (a.type === 'keep') return { ...s, kept: true, message: 'The jar stays on the shelf.' };
  }
  return s;
}
export function breathLeft(s: ZoeWorld) { return Math.max(0, s.holdUntil - s.t); }
