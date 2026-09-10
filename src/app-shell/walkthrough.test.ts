// Walkthrough verify gate: off by default, versioned, total over garbage, and the switch writes
// what it says.

import { describe, expect, it } from "vitest";
import { WALKTHROUGH_KEY, markOffered, readWalkthrough, setWalkthrough, writeWalkthrough } from "./walkthrough";

function memory(): Pick<Storage, "getItem" | "setItem" | "removeItem"> & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v), removeItem: (k) => void map.delete(k) };
}

describe("the walkthrough switch", () => {
  it("is off and unoffered on a fresh device, and on no device at all", () => {
    expect(readWalkthrough(memory())).toEqual({ v: 1, on: false, offered: false });
    expect(readWalkthrough(null)).toEqual({ v: 1, on: false, offered: false });
  });

  it("reads back what it wrote, and ignores an older shape or garbage", () => {
    const s = memory();
    writeWalkthrough(s, { v: 1, on: true, offered: true });
    expect(readWalkthrough(s)).toEqual({ v: 1, on: true, offered: true });
    s.map.set(WALKTHROUGH_KEY, JSON.stringify({ v: 0, on: true }));
    expect(readWalkthrough(s).on).toBe(false);
    s.map.set(WALKTHROUGH_KEY, "{not json");
    expect(readWalkthrough(s).on).toBe(false);
  });

  it("turning it on or off marks the offer as made, and marking the offer leaves the switch alone", () => {
    const s = memory();
    expect(setWalkthrough(true, s)).toEqual({ v: 1, on: true, offered: true });
    expect(setWalkthrough(false, s).on).toBe(false);
    const t = memory();
    expect(markOffered(t)).toEqual({ v: 1, on: false, offered: true });
  });
});
