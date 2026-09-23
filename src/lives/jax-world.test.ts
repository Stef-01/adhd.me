import { describe, it, expect } from 'vitest';
import { createJax, jaxReducer, missing, PRODUCTS, SCENARIOS, spent, budget, price, trip, NEAR, type JaxWorld, type JaxAction } from './jax-world';

const act = (s: JaxWorld, ...actions: JaxAction[]) => actions.reduce(jaxReducer, s);
const tick = (s: JaxWorld, ms: number) => { for (let t = 0; t < ms; t += 50) s = jaxReducer(s, { type: 'tick', ms: 50 }); return s; };
/** A careful shopper: steers under whatever the list needs, flicks every lure, keeps the wish if told to. */
function shop(s: JaxWorld, { flickWish = true, buyWish = false } = {}) {
  for (let t = 0; t < 120000 && (s.phase === 'aisle' || s.phase === 'revisit'); t += 50) {
    for (const i of s.items) {
      const need = s.list.includes(i.key) && !s.basket.includes(i.key);
      const wish = PRODUCTS[i.key]!.kind === 'wish';
      if (!need && !(wish && buyWish) && i.z > .45 && (i.lane === s.lane || i.lure)) s = act(s, { type: 'flick', id: i.id });
      if (wish && !flickWish && !buyWish) continue;
    }
    const target = [...s.items].filter(i => (s.list.includes(i.key) && !s.basket.includes(i.key)) || (buyWish && PRODUCTS[i.key]!.kind === 'wish')).sort((a, b) => b.z - a.z)[0];
    if (target && target.lane !== s.lane) s = act(s, { type: 'steer', lane: target.lane });
    s = jaxReducer(s, { type: 'tick', ms: 50 });
  }
  return s;
}
function pay(s: JaxWorld) {
  for (let i = s.basket.length - 1; i >= 0 && spent(s) > budget(s); i--) s = act(s, { type: 'return', index: i });
  return act(s, { type: 'pay' });
}
function toSetup(s = createJax()) {
  for (let n = 0; n < 3; n++) { s = shop(s); expect(s.phase).toBe('till'); s = pay(s); }
  return s;
}
const setup = (s: JaxWorld) => act(s, { type: 'stick-list' }, { type: 'save-wish' }, { type: 'fridge' }, { type: 'continue' });

describe('Jax: just the list', () => {
  it('every scenario runs three trips, a setup and a revisit to completion', () => {
    for (let n = 0; n < SCENARIOS.length; n++) {
      let s = toSetup(createJax(n));
      expect(s.phase).toBe('setup');
      s = setup(s); expect(s.phase).toBe('revisit');
      s = pay(shop(s)); expect(s.phase).toBe('complete');
      expect(s.receipts).toHaveLength(4);
      for (const r of s.receipts) expect(r.spent).toBeLessThanOrEqual(r.trip === 3 ? SCENARIOS[n]!.revisit.budget : SCENARIOS[n]!.trips[r.trip]!.budget);
    }
  });
  it('the first product arrives quickly and is the thing on the list', () => {
    const s = tick(createJax(), 500);
    expect(s.items).toHaveLength(1);
    expect(s.items[0]!.key).toBe('milk');
  });
  it('only the trolley’s lane collects; other lanes roll past', () => {
    let s = createJax();
    s = { ...s, items: [{ id: 90, key: 'milk', lane: 0, z: NEAR - .01, lure: false }], lane: 2, nextAt: 1e9 };
    s = tick(s, 100);
    expect(s.basket).toEqual([]);
    s = { ...s, items: [{ id: 91, key: 'milk', lane: 2, z: NEAR - .01, lure: false }] };
    s = tick(s, 100);
    expect(s.basket).toEqual(['milk']);
    expect(s.phase).toBe('till');
  });
  it('a lure leans toward the trolley halfway down the aisle', () => {
    let s = createJax();
    s = { ...s, lane: 1, items: [{ id: 5, key: 'choc', lane: 0, z: .54, lure: true }], nextAt: 1e9 };
    s = tick(s, 100);
    expect(s.items[0]!.lane).toBe(1);
  });
  it('flicking the wish saves it; flicking an extra just clears the path', () => {
    let s = createJax();
    s = { ...s, items: [{ id: 7, key: 'kayak', lane: 1, z: .5, lure: true }, { id: 8, key: 'chips', lane: 1, z: .4, lure: true }] };
    s = act(s, { type: 'flick', id: 7 }, { type: 'flick', id: 8 }, { type: 'flick', id: 8 });
    expect(s.wishes).toEqual(['kayak']);
    expect(s.items).toEqual([]);
  });
  it('the till adds exactly, refuses to go over budget and returns only extras', () => {
    let s = createJax();
    s = { ...s, phase: 'till', basket: ['milk', 'choc', 'chips'] };
    expect(spent(s)).toBe(8);
    s = act(s, { type: 'pay' });
    expect(s.phase).toBe('till');
    expect(s.message).toContain('Put something back');
    s = act(s, { type: 'return', index: 0 });
    expect(s.basket).toEqual(['milk', 'choc', 'chips']);
    s = act(s, { type: 'return', index: 2 });
    expect(spent(s)).toBe(5);
    s = act(s, { type: 'pay' });
    expect(s.trip).toBe(1);
    expect(s.receipts[0]).toEqual({ trip: 0, items: ['milk', 'choc'], spent: 5 });
  });
  it('a considered extra within budget is fine', () => {
    let s = createJax();
    s = act({ ...s, phase: 'till', basket: ['milk', 'choc'] }, { type: 'pay' });
    expect(s.phase).toBe('aisle');
  });
  it('a sold-out item is swapped on the list and bounces off the trolley', () => {
    let s = act({ ...createJax(), phase: 'till', basket: ['milk'] }, { type: 'pay' });
    expect(trip(s).soldOut?.key).toBe('milk');
    expect(s.list).toContain('oat');
    expect(s.list).not.toContain('milk');
    s = { ...s, items: [{ id: 40, key: 'milk', lane: s.lane, z: NEAR - .01, lure: false }], nextAt: 1e9 };
    s = tick(s, 100);
    expect(s.basket).toEqual([]);
    expect(s.message).toContain('sold out');
  });
  it('Ari’s request joins the list mid-trip', () => {
    let s = createJax();
    s = { ...s, trip: 2, list: ['bread', 'eggs'], nextAt: 1e9 };
    s = tick(s, 6100);
    expect(s.requested).toBe(true);
    expect(s.list).toContain('bananas');
  });
  it('a missed need comes round again, so no trip can stall', () => {
    let s = act(createJax(), { type: 'steer', lane: 0 });
    for (let t = 0; t < 30000; t += 50) {
      const need = s.items.find(i => i.key === 'milk');
      if (need && need.lane === s.lane && need.z > .5) s = act(s, { type: 'steer', lane: (s.lane + 1) % 3 });
      s = jaxReducer(s, { type: 'tick', ms: 50 });
    }
    expect(s.basket).not.toContain('milk');
    s = shop(s);
    expect(s.phase).toBe('till');
  });
  it('setup needs all three actions and saves the wish for the revisit sale', () => {
    let s = toSetup();
    s = act(s, { type: 'stick-list' }, { type: 'continue' });
    expect(s.phase).toBe('setup');
    s = setup(s);
    expect(s.phase).toBe('revisit');
    expect(s.wishes).toContain('kayak');
    expect(price(s, 'kayak')).toBe(12);
    expect(price(s, 'kayak')).toBeLessThan(PRODUCTS.kayak!.price);
  });
  it('in the revisit both buying the saved wish and leaving it are valid', () => {
    const start = setup(toSetup());
    const bought = pay(shop(start, { buyWish: true }));
    expect(bought.phase).toBe('complete');
    expect(bought.receipts.at(-1)!.items).toContain('kayak');
    const left = pay(shop(start));
    expect(left.phase).toBe('complete');
    expect(left.receipts.at(-1)!.items).not.toContain('kayak');
  });
  it('still mode moves only on actions', () => {
    let s = createJax(0, true);
    expect(s.items).toHaveLength(3);
    const before = s.items.map(i => i.z);
    s = tick(s, 20000);
    expect(s.items.map(i => i.z)).toEqual(before);
    s = act(s, { type: 'roll' });
    expect(s.items.some(i => i.z > Math.max(...before))).toBe(true);
    for (let n = 0; n < 60 && s.phase === 'aisle'; n++) {
      const need = s.items.filter(i => missing(s).includes(i.key)).sort((a, b) => b.z - a.z)[0];
      s = need && need.lane !== s.lane ? act(s, { type: 'steer', lane: need.lane }) : act(s, { type: 'roll' });
    }
    expect(s.phase).toBe('till');
  });
  it('pause freezes the aisle and input', () => {
    let s = tick(createJax(), 600);
    s = act(s, { type: 'pause' });
    const held = tick(s, 3000);
    expect(held.items).toEqual(s.items);
    expect(act(held, { type: 'steer', lane: 0 }).lane).toBe(s.lane);
  });
  it('another shop rotates the scenario and clears the wish list', () => {
    let s = pay(shop(setup(toSetup())));
    s = act(s, { type: 'restart' });
    expect(s.scenario).toBe(1);
    expect(s.wishes).toEqual([]);
  });
});
