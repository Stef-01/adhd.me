import { describe, expect, it } from "vitest";
import { bedroomReducer as act, createBedroom, insectOffset, manageable, PERCHES, type BedroomState } from "./leo-room";

const run = (s: BedroomState, ms: number) => {
  for (let t = 0; t < ms; t += 50) s = act(s, { type: "tick", ms: Math.min(50, ms - t) });
  return s;
};
const clear = (s: BedroomState) => {
  for (const insect of [...s.insects]) s = act(s, { type: "catch", id: insect.id });
  return s;
};
const settle = (s: BedroomState) => {
  s = act(s, { type: "window" }); s = act(s, { type: "phone" });
  while (s.insects.length) s = clear(s);
  s = act(s, { type: "book" }); s = act(s, { type: "book" }); s = act(s, { type: "book" });
  s = act(s, { type: "light" }); s = act(s, { type: "light" });
  return s;
};

describe("Leo's living room", () => {
  it("source control prevents future entry but leaves existing insects to deal with", () => {
    const room = createBedroom();
    const closed = run(act(room, { type: "window" }), 6200);
    const open = run(room, 6200);
    expect(closed.insects.map(i => i.id)).toEqual(room.insects.map(i => i.id));
    expect(closed.prevented).toBe(2);
    expect(open.insects.length).toBe(room.insects.length + 2);
    expect(closed.activation).toBeLessThan(open.activation);
  });
  it("catching is relief, not a source fix", () => {
    const caught = clear(createBedroom());
    expect(caught.insects).toHaveLength(0);
    expect(caught.mode).toBe("challenge");
    expect(run(caught, 6200).insects).toHaveLength(2);
  });
  it("parking the phone affects notifications rather than mosquitoes", () => {
    const parked = run(act(createBedroom(), { type: "phone" }), 10500);
    const available = run(createBedroom(), 10500);
    expect(parked.insects).toEqual(available.insects);
    expect(parked.notifications).toBe(0);
    expect(parked.held).toBe(1);
    expect(available.notifications).toBe(1);
  });
  it("preserves the scene after overload/deadline and leaves recovery playable", () => {
    const exhausted = run(createBedroom(), 61000);
    expect(exhausted.mode).toBe("recovery");
    expect(exhausted.insects.length).toBeGreaterThan(0);
    expect(exhausted.events).toEqual([]);
    expect(settle(exhausted).mode).toBe("rest");
  });
  it("a quiet room reaches the countdown without resetting its props", () => {
    const room = act(clear(act(createBedroom(), { type: "window" })), { type: "book" });
    const ended = run(room, 61000);
    expect(ended.mode).toBe("recovery");
    expect(ended.challengeTime).toBe(60000);
    expect(ended.window).toBe("secured");
    expect(ended.book.open).toBe(true);
  });
  it("both quiet and headphones paths can settle; there is no automatic cure", () => {
    const comfort = act(createBedroom(), { type: "headphones" });
    expect(comfort.insects.length).toBe(3);
    expect(comfort.window).toBe("open");
    expect(settle(comfort).mode).toBe("rest");
    expect(settle(createBedroom()).mode).toBe("rest");
  });
  it("the next evening keeps the arrangement and the bookmark, with one recoverable nuisance", () => {
    const first = settle(createBedroom());
    const next = act(first, { type: "next-evening" });
    expect(next.mode).toBe("revisit");
    expect(next.window).toBe(first.window); expect(next.phone).toBe(first.phone);
    expect(next.book.page).toBe(2); expect(next.prevented).toBe(first.prevented);
    expect(next.held).toBe(first.held);
    const later = run(next, 10500);
    expect(later.prevented).toBe(first.prevented + 2);
    expect(later.held).toBe(first.held + 1);
    expect(later.insects).toHaveLength(1);
    expect(next.insects).toHaveLength(1);
    const interrupted = act(act(next, { type: "book" }), { type: "book" });
    expect(interrupted.book.page).toBe(2);
    let restored = act(clear(interrupted), { type: "book" });
    restored = act(act(restored, { type: "light" }), { type: "light" });
    expect(restored.mode).toBe("complete");
    expect(restored.book.page).toBe(3);
  });
  it("pause freezes ticks and interactions; replay resets and changes the authored situation", () => {
    const initial = createBedroom();
    const paused = act(initial, { type: "pause" });
    expect(run(paused, 20000)).toBe(paused);
    expect(act(paused, { type: "window" })).toBe(paused);
    expect(run(act(paused, { type: "resume" }), 500).time).toBe(500);
    const replay = act(settle(initial), { type: "restart" });
    expect(replay.scenario).toBe(1); expect(replay.window).toBe("secured");
    expect(replay.insects).toHaveLength(4); expect(replay.book.page).toBe(0);
  });
  it("still mode has causal beats with no passive deadline or regulation drain", () => {
    let still = createBedroom(0, true);
    expect(run(still, 60000)).toBe(still);
    const ids = still.insects.map(i => i.id);
    for (const id of ids) still = act(still, { type: "catch", id });
    expect(still.insects.length).toBe(2);
    expect(still.challengeTime).toBe(0);
    expect(settle(still).mode).toBe("rest");
  });
  it("is deterministic, caps occupancy and gives each insect a distinct reachable perch", () => {
    expect(run(createBedroom(), 10000)).toEqual(run(createBedroom(), 10000));
    for (let scenario = 0; scenario < 3; scenario++) {
      const state = run(createBedroom(scenario), 60000);
      expect(state.insects.length).toBeLessThanOrEqual(PERCHES.length);
      expect(new Set(state.insects.map(i => i.slot)).size).toBe(state.insects.length);
    }
  });
  it("ignores double catches, invalid IDs, invalid deltas and stale ending actions", () => {
    const s = act(createBedroom(), { type: "catch", id: 0 });
    expect(act(s, { type: "catch", id: 0 })).toBe(s);
    expect(act(s, { type: "catch", id: 999 })).toBe(s);
    expect(act(s, { type: "tick", ms: NaN })).toBe(s);
    expect(act(s, { type: "next-evening" })).toBe(s);
    const done = settle(s);
    expect(act(done, { type: "headphones" })).toBe(done);
  });
  it("keeps trajectory amplitudes bounded and offers genuine stable perches", () => {
    for (const insect of createBedroom().insects) {
      let rested = false;
      for (let ms = 0; ms < 6200; ms += 50) {
        const p = insectOffset(insect, ms);
        expect(Math.abs(p.x)).toBeLessThanOrEqual(15);
        expect(Math.abs(p.y)).toBeLessThanOrEqual(18);
        rested ||= p.perched;
      }
      expect(rested).toBe(true);
    }
  });
  it("early source prevention is a valid win, not punished with extra waves", () => {
    const state = settle(createBedroom());
    expect(state.caught).toBe(3); expect(manageable(state)).toBe(true);
    expect(run(state, 60000)).toBe(state);
  });
});

describe("state invariants across all input sequences", () => {
  it("authored still-mode events affect emotion without passive drain", () => {
    let s = createBedroom(0, true);
    const initial = s.activation;
    s = act(s, { type: "book" }); s = act(s, { type: "book" }); s = act(s, { type: "headphones" });
    expect(s.activation).toBeGreaterThan(initial);
    expect(s.insects).toHaveLength(5);
    expect(run(s, 100000)).toBe(s);
  });
  it("a full window arrival waits for space and a closed window blocks that queued entry", () => {
    let s = createBedroom();
    s = { ...s, activation: .06, insects: [...s.insects, { id: 3, slot: 3, kind: "scout", arrivedAt: 0 }, { id: 4, slot: 4, kind: "scout", arrivedAt: 0 }, { id: 5, slot: 5, kind: "scout", arrivedAt: 0 }], nextId: 6 };
    s = run(s, 6100);
    expect(s.insects).toHaveLength(6);
    expect(s.events.some(e => e.id === "arrival-1")).toBe(true);
    s = act(s, { type: "window" }); s = act(s, { type: "catch", id: 0 }); s = run(s, 3100);
    expect(s.insects).toHaveLength(5); expect(s.prevented).toBe(2);
  });
});


describe("recovery keeps the world causal", () => {
  it("removing the countdown does not remove approaching insects or phone demand", () => {
    const start = createBedroom();
    const recovery = act(start, { type: "recover" });
    expect(recovery.events).toEqual(start.events);
    const later = run(recovery, 10500);
    expect(later.mode).toBe("recovery");
    expect(later.challengeTime).toBe(0);
    expect(later.insects).toHaveLength(5);
    expect(later.notifications).toBe(1);
    expect(settle(later).mode).toBe("rest");
  });
  it("prevention still works after overload instead of erasing future arrivals", () => {
    const start = { ...createBedroom(), activation: .959 };
    const overloaded = run(start, 1000);
    expect(overloaded.mode).toBe("recovery");
    expect(overloaded.events.some(event => event.kind === "insects")).toBe(true);
    const closed = run(act(overloaded, { type: "window" }), 6000);
    expect(closed.insects).toHaveLength(3);
    expect(closed.prevented).toBe(2);
  });
});


describe("public challenge then settling", () => {
  it("plays three complete rounds before unlocking the routine", () => {
    let s=createBedroom(0,true,true);
    for (const type of ["window","phone","headphones","book","light"] as const) expect(act(s,{type})).toBe(s);
    for (const count of [3,4,5]) {
      expect(s.insects).toHaveLength(count);
      expect(s.mode).toBe("challenge");
      s=clear(s);
    }
    expect(s.caught).toBe(12); expect(s.mode).toBe("recovery");
    expect(s.window).toBe("open"); expect(s.book.page).toBe(0);
    s=settle(s); expect(s.mode).toBe("rest");
    s=act(s,{type:"next-evening"});
    expect(s.window).toBe("secured"); expect(s.phone).toBe("parked");
    expect(s.book.page).toBe(2);
  });
  it("opens settling on overload and preserves uncaught insects for recovery", () => {
    const s=run(createBedroom(0,false,true),61000);
    expect(s.mode).toBe("recovery"); expect(s.insects.length).toBeGreaterThan(0);
    expect(settle(s).mode).toBe("rest");
  });
  it("replay restores the challenge and stale input cannot skip a round",()=>{
    let s=createBedroom(0,true,true); const id=s.insects[0]!.id;
    s=act(s,{type:"catch",id}); expect(act(s,{type:"catch",id})).toBe(s);
    const restarted=act(settle(act(s,{type:"recover"})),{type:"restart"});
    expect(restarted.rounds).toBe(true);expect(restarted.mode).toBe("challenge");expect(restarted.insects).toHaveLength(3);
  });
});
