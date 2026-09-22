import { describe, expect, it } from "vitest";
import { advance, choose, createMorning, morningReducer, carrying, packed, position, ESSENTIALS, type TheoMorning, type Command, type Essential, type Room } from "./theo-morning";

function doTask(s: TheoMorning, command: Command) {
  let next = choose(s, command);
  for (let n = 0; next.intent && n < 900; n++) next = advance(next, .1);
  return next;
}
function morning(s = createMorning()) {
  for (const c of ["phone", "bottle", "keys", "bag", "phone", "bag", "shoes", "door"] as Command[]) s = doTask(s, c);
  return s;
}
function setup(s: TheoMorning, room: Room = "hall") {
  s = morningReducer(s, { type: "evening" });
  for (const item of ESSENTIALS) s = morningReducer(s, { type: "home", item, room });
  return s;
}

describe("Theo's route-planning morning", () => {
  it("makes remote actions consume travel and work; never teleports on retarget", () => {
    let s = choose(createMorning(), "phone");
    s = advance(s, 1);
    expect(s.plugged).toBe(false); expect(s.travel?.to).toBe("bedroom");
    const before = position(s); s = choose(s, "keys");
    expect(position(s)).toEqual(before); expect(s.travel?.to).toBe("bedroom");
    s = advance(s, 3); expect(s.travel?.to).toBe("hall");
    expect(s.items.keys).toBe("living");
  });
  it("allows a planned route to catch the train while charging overlaps other work", () => {
    let s = doTask(createMorning(), "phone");
    expect(s.plugged).toBe(true); expect(s.charge).toBe(0);
    s = doTask(s, "bottle"); expect(s.charge).toBeGreaterThan(.5);
    s = doTask(s, "keys"); expect(s.charge).toBe(1);
    for (const c of ["bag", "phone", "bag", "shoes", "door"] as Command[]) s = doTask(s, c);
    expect(s.phase).toBe("departure"); expect(s.first?.caught).toBe(true);
    expect(s.elapsed).toBeLessThan(60); expect(s.trips).toBeGreaterThan(5);
  });
  it("enforces two hands and conserves every essential through bag transfers", () => {
    let s = doTask(doTask(createMorning(), "keys"), "bottle");
    expect(carrying(s)).toHaveLength(2);
    // Plugging in needs no inventory space; collecting does.
    s = doTask(s, "phone"); expect(s.plugged).toBe(true);
    const blocked = choose(s, "phone"); expect(blocked.intent).toBeNull(); expect(blocked.line).toMatch(/Hands full/);
    s = doTask(s, "bag"); expect(packed(s)).toHaveLength(2); expect(carrying(s)).toHaveLength(0);
    s = doTask(s, "phone"); s = doTask(s, "bag");
    expect(packed(s)).toEqual(ESSENTIALS); expect(Object.keys(s.items)).toHaveLength(3);
  });
  it("gates departure on actual contents and shoes", () => {
    expect(choose(createMorning(), "door").line).toMatch(/essentials/);
    let s = morning(); s = { ...s, phase: "morning", shoes: false };
    expect(choose(s, "door").line).toMatch(/Shoes/);
    expect(doTask(doTask(s, "shoes"), "door").phase).toBe("departure");
  });
  it("lets inefficient routes miss a departure, keep inventory and update Ari once", () => {
    let s = advance(doTask(createMorning(), "keys"), 100);
    for (const c of ["laundry", "plant", "email"] as Command[]) s = doTask(s, c);
    expect(s.elapsed).toBeGreaterThan(70);
    s = doTask(s, "keys"); const items = s.items;
    s = doTask(s, "message"); expect(s.updated).toBe(true); expect(s.items).toEqual(items);
    const deadline = s.deadline; s = doTask(s, "message"); expect(s.deadline).toBe(deadline);
    s = morning(s); expect(s.phase).toBe("departure"); expect(s.first?.updated).toBe(true);
  });
  it("makes spill cleanup shorten later travel and parking demands lower agitation", () => {
    let wet = advance(doTask(doTask(createMorning(), "bottle"), "bag"), 35);
    expect(wet.demands).toEqual(["laundry"]); expect(wet.spill).toBe("wet");
    const cleared = doTask(wet, "spill"); expect(cleared.elapsed - wet.elapsed).toBeCloseTo(4, 0);
    expect(choose(wet, "phone").travel!.duration).toBeGreaterThan(choose(cleared, "phone").travel!.duration);
    wet = { ...wet, load: 70 };
    const parked = doTask(wet, "later"); expect(parked.demands).toEqual([]); expect(parked.load).toBeLessThan(wet.load);
    expect(advance(parked, 1).demands).toEqual([]);
    const breathed = doTask(wet, "breathe"); expect(breathed.load).toBeLessThan(40); expect(breathed.elapsed).toBeGreaterThan(wet.elapsed);
  });
  it("does not award completed optional chores without actually doing their work", () => {
    let s = advance(doTask(createMorning(), "phone"), 18); s = choose(s, "laundry"); s = advance(s, 4.5);
    expect(s.handled).not.toContain("laundry");
    s = choose(s, "keys"); s = advance(s, 20);
    expect(s.handled).not.toContain("laundry");
  });
  it("uses every chosen home next morning, prepared phone/water, earlier cue and later note", () => {
    let s = setup(morning());
    s = morningReducer(s, { type: "home", item: "bottle", room: "kitchen" });
    s = morningReducer(s, { type: "cue" }); s = morningReducer(s, { type: "note" });
    s = morningReducer(s, { type: "tomorrow" });
    expect(s.phase).toBe("revisit"); expect(s.items).toEqual({ keys: "hall", phone: "hall", bottle: "kitchen" });
    expect(s.charge).toBe(1); expect(s.filled).toBe(true); expect(s.deadline).toBe(102);
    expect(advance(s, 12).demands).not.toContain("laundry");
  });
  it("requires a real arrangement, then proves fewer trips while adding rain", () => {
    let s = morningReducer(morning(), { type: "evening" });
    expect(morningReducer(s, { type: "tomorrow" }).phase).toBe("evening");
    for (const item of ESSENTIALS) s = morningReducer(s, { type: "home", item, room: "hall" });
    s = morningReducer(s, { type: "tomorrow" });
    for (const c of ["keys", "phone", "bag", "bottle", "bag", "shoes"] as Command[]) s = doTask(s, c);
    expect(choose(s, "door").line).toMatch(/umbrella/);
    s = doTask(doTask(s, "umbrella"), "door");
    expect(s.phase).toBe("complete"); expect(s.trips).toBeLessThan(s.first!.trips);
  });
  it("freezes deadlines, charge and motion on pause, with a clean distinct replay", () => {
    let s = advance(choose(createMorning(), "phone"), 1);
    s = morningReducer(s, { type: "pause", paused: true });
    expect(advance(s, 80)).toEqual(s); expect(choose(s, "keys")).toEqual(s);
    const reset = morningReducer(s, { type: "restart" });
    expect(reset.attempt).toBe(1); expect(reset.elapsed).toBe(0); expect(reset.paused).toBe(false);
    expect(reset.items.phone).not.toBe(createMorning().items.phone);
  });
  it("preserves the same costs in reduced motion without reading-time pressure", () => {
    let s = createMorning(0, true);
    expect(morningReducer(s, { type: "tick", seconds: 120 })).toEqual(s);
    for (const c of ["phone", "bottle", "keys", "bag", "phone", "bag", "shoes", "door"] as Command[]) s = choose(s, c);
    expect(s.phase).toBe("departure"); expect(s.first?.caught).toBe(true);
    expect(s.elapsed).toBeCloseTo(morning().elapsed, 1);
  });
  it("cannot duplicate essentials by repeated inputs or update from the evening", () => {
    let s = doTask(createMorning(), "keys"); const before = s.items;
    for (let i = 0; i < 20; i++) s = doTask(s, "keys");
    expect(s.items).toEqual(before); expect(carrying(s)).toEqual(["keys"]);
    s = setup(morning()); expect(choose(s, "message")).toEqual(s);
  });
});

it("switching an in-flight task to your pace cannot leave it stuck", () => {
  let s = advance(choose(createMorning(), "phone"), 1);
  s = morningReducer(s, { type: "pause", paused: true });
  s = morningReducer(s, { type: "still", still: true });
  expect(s.intent).toBe("phone");
  s = morningReducer(s, { type: "pause", paused: false });
  expect(s.intent).toBeNull(); expect(s.plugged).toBe(true);
});

// Leave room to get oriented and read between actions on every replay layout.
it("ordinary routes can catch the train with decision time across all layouts", () => {
  for (let attempt = 0; attempt < 3; attempt++) {
    let s = advance(createMorning(attempt), 8);
    for (const c of ["phone", "bottle", "keys", "bag", "phone", "bag", "shoes", "door"] as Command[]) {
      s = advance(s, 2); s = doTask(s, c);
    }
    expect(s.phase).toBe("departure"); expect(s.first?.caught).toBe(true);
  }
});
it("never piles up optional demands or immediately replaces a parked one", () => {
  expect(advance(createMorning(), 100).demands).toEqual([]);
  let s = advance(doTask(createMorning(), "phone"), 60);
  expect(s.demands).toHaveLength(1);
  s = doTask(s, "later");
  expect(advance(s, 15).demands).toEqual([]);
  expect(advance(s, 17).demands).toHaveLength(1);
});
it("evening strategy practice is untimed and changes the next morning", () => {
  const s = setup(morning()); expect(advance(s, 300)).toEqual(s);
  const next = morningReducer(s, { type: "tomorrow" });
  expect(next.filled).toBe(true); expect(next.charge).toBe(1);
});
