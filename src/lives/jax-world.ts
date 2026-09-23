/**
 * Jax — Just the list. A supermarket aisle rolls toward the trolley in three lanes. Steer to
 * collect what the list needs; flick lures off the path (a flicked wish is saved for later).
 * Each trip ends at the till, where extras can go back before paying. Coins are fictional
 * tokens, never money advice, and nothing here scores the player.
 */
export type Kind = 'need' | 'extra' | 'wish';
export interface Product { key: string; name: string; price: number; kind: Kind }
export interface Item { id: number; key: string; lane: number; z: number; lure: boolean }
export type Phase = 'aisle' | 'till' | 'setup' | 'revisit' | 'revisit-till' | 'complete';

export const PRODUCTS: Record<string, Product> = {
  milk: { key: 'milk', name: 'Milk', price: 2, kind: 'need' },
  oat: { key: 'oat', name: 'Oat milk', price: 3, kind: 'need' },
  bread: { key: 'bread', name: 'Bread', price: 3, kind: 'need' },
  eggs: { key: 'eggs', name: 'Eggs', price: 4, kind: 'need' },
  bananas: { key: 'bananas', name: 'Bananas', price: 2, kind: 'need' },
  rice: { key: 'rice', name: 'Rice', price: 3, kind: 'need' },
  choc: { key: 'choc', name: 'Chocolate', price: 3, kind: 'extra' },
  chips: { key: 'chips', name: 'Chips', price: 3, kind: 'extra' },
  candle: { key: 'candle', name: 'Candle', price: 5, kind: 'extra' },
  soda: { key: 'soda', name: 'Fizzy drink', price: 2, kind: 'extra' },
  kayak: { key: 'kayak', name: 'Kayak', price: 18, kind: 'wish' },
  speaker: { key: 'speaker', name: 'Speaker', price: 16, kind: 'wish' },
  bike: { key: 'bike', name: 'Bike light', price: 9, kind: 'wish' },
};

export interface Trip { title: string; list: string[]; budget: number; soldOut?: { key: string; swap: string }; request?: { at: number; key: string }; extras: string[]; wish: string; speed: number; gap: number }
export interface Scenario { trips: [Trip, Trip, Trip]; revisit: Trip; saleWish: number }

export const SCENARIOS: Scenario[] = [
  {
    trips: [
      { title: 'Just milk.', list: ['milk'], budget: 5, extras: ['choc', 'chips'], wish: 'kayak', speed: .00022, gap: 1500 },
      { title: 'Milk. Bread. Eggs.', list: ['milk', 'bread', 'eggs'], budget: 12, soldOut: { key: 'milk', swap: 'oat' }, extras: ['choc', 'candle', 'chips'], wish: 'kayak', speed: .00026, gap: 1250 },
      { title: 'And whatever Ari needs.', list: ['bread', 'eggs'], budget: 12, request: { at: 6000, key: 'bananas' }, extras: ['soda', 'choc', 'candle', 'chips'], wish: 'kayak', speed: .0003, gap: 1050 },
    ],
    revisit: { title: 'The list, again.', list: ['milk', 'bread', 'rice'], budget: 24, extras: ['chips', 'choc', 'soda'], wish: 'kayak', speed: .00026, gap: 1200 }, saleWish: 12,
  },
  {
    trips: [
      { title: 'Just bread.', list: ['bread'], budget: 5, extras: ['soda', 'choc'], wish: 'speaker', speed: .00022, gap: 1500 },
      { title: 'Bread. Rice. Eggs.', list: ['bread', 'rice', 'eggs'], budget: 13, soldOut: { key: 'rice', swap: 'bananas' }, extras: ['chips', 'candle', 'soda'], wish: 'speaker', speed: .00026, gap: 1250 },
      { title: 'And whatever Ari needs.', list: ['milk', 'rice'], budget: 10, request: { at: 6000, key: 'eggs' }, extras: ['choc', 'soda', 'candle', 'chips'], wish: 'speaker', speed: .0003, gap: 1050 },
    ],
    revisit: { title: 'The list, again.', list: ['eggs', 'bread', 'milk'], budget: 22, extras: ['candle', 'chips', 'soda'], wish: 'speaker', speed: .00026, gap: 1200 }, saleWish: 10,
  },
  {
    trips: [
      { title: 'Just eggs.', list: ['eggs'], budget: 6, extras: ['chips', 'soda'], wish: 'bike', speed: .00022, gap: 1500 },
      { title: 'Eggs. Milk. Rice.', list: ['eggs', 'milk', 'rice'], budget: 12, soldOut: { key: 'milk', swap: 'oat' }, extras: ['choc', 'soda', 'candle'], wish: 'bike', speed: .00026, gap: 1250 },
      { title: 'And whatever Ari needs.', list: ['rice', 'milk'], budget: 10, request: { at: 6000, key: 'bread' }, extras: ['candle', 'choc', 'chips', 'soda'], wish: 'bike', speed: .0003, gap: 1050 },
    ],
    revisit: { title: 'The list, again.', list: ['bread', 'eggs', 'bananas'], budget: 18, extras: ['soda', 'choc', 'chips'], wish: 'bike', speed: .00026, gap: 1200 }, saleWish: 6,
  },
];

export interface JaxWorld {
  paused: boolean; still: boolean;
  scenario: number; phase: Phase; trip: number; t: number;
  lane: number; items: Item[]; nextId: number; nextAt: number; spawn: number;
  list: string[]; basket: string[]; wishes: string[]; requested: boolean; soldOutSeen: boolean;
  receipts: { trip: number; items: string[]; spent: number }[];
  setup: { list: boolean; wish: boolean; fridge: boolean };
  message: string; revision: number; bump: number;
}
export type JaxAction =
  | { type: 'tick'; ms: number } | { type: 'pause' } | { type: 'resume' } | { type: 'still'; value: boolean }
  | { type: 'steer'; lane: number } | { type: 'flick'; id: number } | { type: 'roll' }
  | { type: 'return'; index: number } | { type: 'pay' } | { type: 'continue' }
  | { type: 'stick-list' } | { type: 'save-wish' } | { type: 'fridge' } | { type: 'restart' };

export const NEAR = .9;
const STILL_STEP = .2;

export function trip(s: Pick<JaxWorld, 'scenario' | 'trip'>): Trip {
  const c = SCENARIOS[s.scenario]!;
  return s.trip === 3 ? c.revisit : c.trips[s.trip]!;
}
export function price(s: Pick<JaxWorld, 'scenario' | 'trip'>, key: string): number {
  const p = PRODUCTS[key]!;
  return s.trip === 3 && p.kind === 'wish' ? SCENARIOS[s.scenario]!.saleWish : p.price;
}
export function spent(s: JaxWorld) { return s.basket.reduce((n, key) => n + price(s, key), 0); }
export function budget(s: JaxWorld) { return trip(s).budget; }
/** Still needed: list items not yet in the basket, with a sold-out item replaced by its swap. */
export function missing(s: JaxWorld): string[] { return s.list.filter(key => !s.basket.includes(key)); }
const live = (s: JaxWorld) => s.phase === 'aisle' || s.phase === 'revisit';
export function running(s: JaxWorld) { return live(s); }

function begin(s: JaxWorld, n: number): JaxWorld {
  const next: JaxWorld = { ...s, trip: n, phase: n === 3 ? 'revisit' : 'aisle', t: 0, lane: 1, items: [], nextAt: 400, spawn: 0, basket: [], requested: false, soldOutSeen: false, bump: 0, revision: s.revision + 1 };
  const t = trip(next);
  next.list = t.soldOut ? t.list.map(key => key === t.soldOut!.key ? t.soldOut!.swap : key) : [...t.list];
  next.message = n === 3 ? 'Same list, on the handle.' : n === 0 ? 'Steer into the milk.' : '';
  return fill(next);
}
export function createJax(scenario = 0, still = false): JaxWorld {
  return begin({ paused: false, still, scenario: scenario % SCENARIOS.length, phase: 'aisle', trip: 0, t: 0, lane: 1, items: [], nextId: 1, nextAt: 0, spawn: 0, list: [], basket: [], wishes: [], requested: false, soldOutSeen: false, receipts: [], setup: { list: false, wish: false, fridge: false }, message: '', revision: 0, bump: 0 }, 0);
}

/** The next product on the shelf: a missing need every other spawn, lures and the wish between. */
function pick(s: JaxWorld): { key: string; lure: boolean } {
  const t = trip(s), need = missing(s), n = s.spawn;
  // The revisit brings the saved wish back early, on sale; the first trips offer it as a lure.
  if (s.trip === 3 && n === 1 && s.wishes.includes(t.wish)) return { key: t.wish, lure: false };
  const wishDone = s.wishes.includes(t.wish) || s.basket.includes(t.wish) || s.trip === 3;
  if (need.length && n % 2 === 0) return { key: need[(n / 2) % need.length]!, lure: false };
  if (!wishDone && n % 5 === 3) return { key: t.wish, lure: s.trip !== 3 };
  if (t.soldOut && n === 1 && !s.soldOutSeen) return { key: t.soldOut.key, lure: false };
  return { key: t.extras[n % t.extras.length]!, lure: n % 3 !== 0 };
}
function spawn(s: JaxWorld): JaxWorld {
  const { key, lure } = pick(s);
  const lane = lure ? (s.lane + (s.spawn % 2 ? 1 : 2)) % 3 : (s.spawn * 2 + s.scenario) % 3;
  const soldOut = trip(s).soldOut?.key === key;
  return { ...s, items: [...s.items, { id: s.nextId, key, lane, z: 0, lure }], nextId: s.nextId + 1, spawn: s.spawn + 1, soldOutSeen: s.soldOutSeen || soldOut };
}
function fill(s: JaxWorld): JaxWorld {
  if (!s.still || !live(s)) return s;
  let n = s;
  while (n.items.length < 3) { n = { ...n, items: n.items.map(i => ({ ...i, z: Math.min(.8, i.z + STILL_STEP) })) }; n = spawn(n); }
  return n;
}

/** Move the aisle forward by dz; anything reaching the trolley in its lane drops in. */
function roll(s: JaxWorld, dz: number): JaxWorld {
  let n: JaxWorld = { ...s, items: s.items.map(i => {
    let lane = i.lane;
    // A lure leans toward the trolley once it is halfway down the aisle.
    if (i.lure && i.z < .55 && i.z + dz >= .55 && lane !== s.lane) lane = lane + Math.sign(s.lane - lane);
    return { ...i, z: i.z + dz, lane };
  }) };
  const arrived = n.items.filter(i => i.z >= NEAR);
  if (!arrived.length) return n;
  n = { ...n, items: n.items.filter(i => i.z < NEAR) };
  for (const item of arrived) {
    if (item.lane !== n.lane) continue;
    const p = PRODUCTS[item.key]!;
    if (trip(n).soldOut?.key === item.key) { n = { ...n, message: `${p.name} is sold out. Try ${PRODUCTS[trip(n).soldOut!.swap]!.name.toLowerCase()}.`, bump: n.bump + 1 }; continue; }
    const needed = n.list.includes(item.key) && !n.basket.includes(item.key);
    n = { ...n, basket: [...n.basket, item.key], bump: n.bump + 1, message: needed ? `${p.name}. Got it.` : p.kind === 'wish' ? `The ${p.name.toLowerCase()} is in the trolley.` : `${p.name} crept in.` };
  }
  if (!missing(n).length) n = toTill(n);
  return n;
}
function toTill(s: JaxWorld): JaxWorld {
  return { ...s, phase: s.trip === 3 ? 'revisit-till' : 'till', items: [], message: '', revision: s.revision + 1 };
}

export function jaxReducer(s: JaxWorld, a: JaxAction): JaxWorld {
  if (a.type === 'pause') return s.paused ? s : { ...s, paused: true };
  if (a.type === 'resume') return s.paused ? { ...s, paused: false } : s;
  if (a.type === 'still') return a.value === s.still ? s : fill({ ...s, still: a.value });
  if (s.paused) return s;
  if (a.type === 'tick') {
    if (!live(s) || s.still) return s;
    let n: JaxWorld = { ...s, t: s.t + a.ms };
    const t = trip(n);
    if (t.request && !n.requested && n.t >= t.request.at) n = { ...n, requested: true, list: [...n.list, t.request.key], message: `Ari: can you grab ${PRODUCTS[t.request.key]!.name.toLowerCase()}?`, revision: n.revision + 1 };
    n = roll(n, t.speed * a.ms);
    if (live(n) && n.t >= n.nextAt && n.items.length < 5) n = { ...spawn(n), nextAt: n.t + t.gap };
    return n;
  }
  if (a.type === 'restart') return s.phase === 'complete' ? createJax(s.scenario + 1, s.still) : s;
  if (live(s)) {
    if (a.type === 'steer') {
      const lane = Math.max(0, Math.min(2, a.lane));
      if (lane === s.lane) return s;
      const n = { ...s, lane };
      return s.still ? step(n) : n;
    }
    if (a.type === 'flick') {
      const item = s.items.find(i => i.id === a.id);
      if (!item) return s;
      const p = PRODUCTS[item.key]!;
      const wish = p.kind === 'wish' && s.trip < 3;
      const n = { ...s, items: s.items.filter(i => i.id !== a.id), wishes: wish && !s.wishes.includes(item.key) ? [...s.wishes, item.key] : s.wishes,
        message: wish ? `Saved for later: the ${p.name.toLowerCase()}.` : p.kind === 'need' ? `${p.name} is on the list. It will come round.` : 'Not today.' };
      return s.still ? step(n) : n;
    }
    if (a.type === 'roll' && s.still) return step(s);
    return s;
  }
  if (s.phase === 'till' || s.phase === 'revisit-till') {
    if (a.type === 'return') {
      const key = s.basket[a.index];
      if (!key || (s.list.includes(key) && s.basket.indexOf(key) === a.index)) return s;
      return { ...s, basket: s.basket.filter((_, i) => i !== a.index), message: `${PRODUCTS[key]!.name} goes back.` };
    }
    if (a.type === 'pay') {
      const total = spent(s);
      if (total > budget(s)) return { ...s, message: 'Over by a little. Put something back.' };
      const receipts = [...s.receipts, { trip: s.trip, items: s.basket, spent: total }];
      if (s.phase === 'revisit-till') return { ...s, receipts, phase: 'complete', message: '', revision: s.revision + 1 };
      if (s.trip < 2) return begin({ ...s, receipts }, s.trip + 1);
      return { ...s, receipts, phase: 'setup', message: '', revision: s.revision + 1 };
    }
    return s;
  }
  if (s.phase === 'setup') {
    if (a.type === 'stick-list') return { ...s, setup: { ...s.setup, list: true }, message: 'The list is on the fridge.' };
    if (a.type === 'save-wish') {
      const wish = trip(s).wish;
      return { ...s, wishes: s.wishes.includes(wish) ? s.wishes : [...s.wishes, wish], setup: { ...s.setup, wish: true }, message: `The ${PRODUCTS[wish]!.name.toLowerCase()} waits for payday.` };
    }
    if (a.type === 'fridge') return { ...s, setup: { ...s.setup, fridge: true }, message: 'Food where it gets used.' };
    if (a.type === 'continue' && s.setup.list && s.setup.wish && s.setup.fridge) return begin(s, 3);
  }
  return s;
}
/** One still-mode step: the aisle moves on by a fixed distance and a new product appears. */
function step(s: JaxWorld): JaxWorld {
  let n = roll(s, STILL_STEP);
  if (!live(n)) return n;
  const t = trip(n);
  if (t.request && !n.requested && n.spawn >= 4) n = { ...n, requested: true, list: [...n.list, t.request.key], message: `Ari: can you grab ${PRODUCTS[t.request.key]!.name.toLowerCase()}?` };
  while (n.items.length < 3) n = spawn(n);
  return n;
}
/** The item a keyboard flick acts on: the nearest one that is not on the list. */
export function nearestLure(s: JaxWorld): Item | undefined {
  return [...s.items].filter(i => !s.list.includes(i.key) || s.basket.includes(i.key)).sort((a, b) => b.z - a.z)[0];
}
