// The visits waiting for their stars: a tap on "Book" is asked about a day later, "Not yet" waits two
// more days and gives up after three asks, and a rated visit is never asked about again.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ASK_AFTER_MS, handOff, MOST_ASKS, forgetVisit, readVisits, SNOOZE_MS, snoozeVisit, visitDue } from "./track";

let stored: Record<string, string>;
const beacons: Blob[] = [];
beforeEach(() => {
  stored = {};
  beacons.length = 0;
  const localStorage = { getItem: (k: string) => stored[k] ?? null, setItem: (k: string, v: string) => void (stored[k] = v) };
  vi.stubGlobal("window", { localStorage, location: { href: "http://local/" } });
  vi.stubGlobal("navigator", { sendBeacon: (_url: URL, blob: Blob) => (beacons.push(blob), true) });
});
afterEach(() => vi.unstubAllGlobals());

const book = (clinicianId: string, at: number) => handOff({ searchId: null, clinicianId, name: `Dr ${clinicianId}`, asked: ["pref:woman-gp"], met: ["pref:woman-gp"] }, at);

describe("the visits waiting for their stars", () => {
  it("records the handoff and asks about the visit a day later, not before", async () => {
    book("mei-chao", 1_000);
    expect(JSON.parse(await beacons[0]!.text())).toMatchObject({ type: "handoff", record: { clinicianId: "mei-chao", asked: ["pref:woman-gp"], met: ["pref:woman-gp"] } });
    expect(visitDue(1_000 + ASK_AFTER_MS - 1)).toBeNull();
    expect(visitDue(1_000 + ASK_AFTER_MS)).toMatchObject({ clinicianId: "mei-chao", name: "Dr mei-chao" });
  });

  it("keeps one visit per clinician, the latest tap", () => {
    book("mei-chao", 1_000);
    book("mei-chao", 5_000);
    expect(readVisits()).toHaveLength(1);
    expect(readVisits()[0]!.at).toBe(5_000);
  });

  it("asks again two days after 'Not yet', and lets the visit go after three asks", () => {
    book("mei-chao", 0);
    let now = ASK_AFTER_MS;
    for (let ask = 1; ask < MOST_ASKS; ask++) {
      const due = visitDue(now)!;
      snoozeVisit(due.handoffId, now);
      expect(visitDue(now + SNOOZE_MS - 1)).toBeNull();
      now += SNOOZE_MS;
    }
    snoozeVisit(visitDue(now)!.handoffId, now);
    expect(readVisits()).toEqual([]);
  });

  it("never asks about a rated visit again", () => {
    book("mei-chao", 0);
    forgetVisit(readVisits()[0]!.handoffId);
    expect(visitDue(ASK_AFTER_MS * 10)).toBeNull();
  });
});
