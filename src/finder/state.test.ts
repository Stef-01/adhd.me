// U8 (O229): the finder's state model, round-tripped through a fake browser.
//
// Three homes, one law. Every stage goes out through `advance` and comes back through `entryOf`
// and `readRecord`; a planted sentence goes in as the request and the test proves it reaches
// storage and NOWHERE else — not a URL the model wrote, not a history state, not the one
// serialiser the address bar has (§2.8 Q-A: patient text never appears in a URL or a history
// entry). The fake host records every call, so "nowhere else" is checked against everything the
// model did rather than against what it was expected to do.

import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import {
  advance,
  arrive,
  debugFrom,
  emptyRecord,
  entryOf,
  finderSearch,
  isStage,
  placeFrom,
  readRecord,
  STAGES,
  STATE_VERSION,
  stepsBackTo,
  STORAGE_KEY,
  writePlace,
  writeRecord,
  type FinderHost,
  type FinderRecord,
} from "./state";

/** The sentence that must reach the tab and nothing else. */
const SENTENCE = "my son Oliver cannot sit still in class and the school keeps calling";

interface Call {
  method: "pushState" | "replaceState" | "go";
  state?: unknown;
  url?: string | URL | null;
  delta?: number;
}

/** A browser reduced to the four facts the model reads and the three calls it makes. */
function fakeHost(options: { search?: string; state?: unknown; stored?: string } = {}) {
  const calls: Call[] = [];
  const store = new Map<string, string>();
  if (options.stored !== undefined) store.set(STORAGE_KEY, options.stored);
  // `History.state` is read-only to a page and writable to the browser; the fake is the browser.
  const history: { -readonly [K in keyof FinderHost["history"]]: FinderHost["history"][K] } = {
    state: options.state ?? null,
    pushState(state, _unused, url) {
      calls.push({ method: "pushState", state, url });
      history.state = state;
    },
    replaceState(state, _unused, url) {
      calls.push({ method: "replaceState", state, url });
      history.state = state;
    },
    go(delta) {
      calls.push({ method: "go", delta });
    },
  };
  const host: FinderHost & { calls: Call[]; store: Map<string, string> } = {
    calls,
    store,
    pathname: "/finder",
    search: options.search ?? "",
    history,
    storage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => void store.set(key, value),
      removeItem: (key) => void store.delete(key),
    },
  };
  return host;
}

/** Everything the model handed the browser, flattened to text, for the "nowhere else" check. */
function everythingHandedToHistory(host: ReturnType<typeof fakeHost>): string {
  return host.calls.map((call) => `${String(call.url ?? "")} ${JSON.stringify(call.state ?? null)}`).join("\n");
}

describe("the finder's state model (U8)", () => {
  it("round-trips every stage through a history entry and the tab's record", () => {
    const host = fakeHost();
    let { record, index } = { record: emptyRecord(), index: 0 };
    for (const stage of eachOf(STAGES, "the finder's stages")) {
      ({ record, index } = advance(host, record, index, stage));
      const entry = entryOf(host.history.state);
      expect(entry, `${stage} did not come back out of the history state`).toEqual({ v: STATE_VERSION, stage, index });
      const stored = readRecord(host.storage);
      expect(stored?.trail[index], `${stage} did not come back out of the record`).toBe(stage);
    }
    // The trail is the walk, in order, after the arrival entry.
    expect(readRecord(host.storage)?.trail).toEqual(["welcome", ...STAGES]);
  });

  it("puts the words in the tab and nowhere else — not a URL, not a history state", () => {
    const host = fakeHost();
    const start = arrive(host);
    let record: FinderRecord = { ...start.record, request: SENTENCE, draft: SENTENCE, matchId: "gp-1" };
    let index = start.index;
    for (const stage of eachOf(STAGES, "the finder's stages")) {
      ({ record, index } = advance(host, record, index, stage));
    }
    writePlace(host, "Hornsby");
    writeRecord(host.storage, record);

    // In the tab: the whole sentence, readable back.
    expect(readRecord(host.storage)).toMatchObject({ request: SENTENCE, draft: SENTENCE, matchId: "gp-1" });
    // Nowhere else: no URL and no history state the model wrote carries a word of it.
    const handed = everythingHandedToHistory(host);
    expect(host.calls.length).toBeGreaterThan(STAGES.length);
    for (const word of eachOf(["Oliver", "sit still", "school", "gp-1"], "the planted words")) {
      expect(handed, `"${word}" reached the browser's history`).not.toContain(word);
    }
    // The one serialiser cannot carry it either: it takes a place and nothing else.
    expect(finderSearch(SENTENCE)).toBe(`?place=${encodeURIComponent(SENTENCE).replace(/%20/g, "+")}`);
    expect(finderSearch("Hornsby")).toBe("?place=Hornsby");
  });

  it("the URL carries `place` alone, and reads it back from the address bar", () => {
    expect(finderSearch("")).toBe("");
    expect(finderSearch("   ")).toBe("");
    expect(finderSearch("  Hornsby ")).toBe("?place=Hornsby");
    expect(finderSearch("St Ives")).toBe("?place=St+Ives");

    expect(placeFrom("?place=Hornsby")).toBe("Hornsby");
    expect(placeFrom("?place=St+Ives&debug=1")).toBe("St Ives");
    expect(placeFrom("?place=2077")).toBe("2077");
    expect(placeFrom("?place=Hornsby&place=Chatswood")).toBe("Hornsby");
    expect(placeFrom("")).toBe("");
    expect(placeFrom("?request=anything")).toBe("");
    // A place is a suburb or a postcode, not a paragraph.
    expect(placeFrom(`?place=${"x".repeat(200)}`)).toHaveLength(80);
  });

  it("U10: `?debug=1` is read once at arrival and never written back by the one serialiser", () => {
    expect(debugFrom("?place=St+Ives&debug=1")).toBe(true);
    expect(debugFrom("?debug")).toBe(true);
    expect(debugFrom("?place=Hornsby")).toBe(false);
    expect(debugFrom("")).toBe(false);
    // Fresh and resumed arrivals both carry it: the flag is the address bar's as it arrived.
    expect(arrive(fakeHost({ search: "?place=Hornsby&debug=1" })).debug).toBe(true);
    expect(arrive(fakeHost({ search: "?place=Hornsby" })).debug).toBe(false);
    const resumed = arrive(fakeHost({ search: "?debug=1", state: { finder: { v: STATE_VERSION, stage: "type", index: 1 } } }));
    expect(resumed).toMatchObject({ resumed: true, debug: true });
    // This is why it is read once: the place edit that follows rewrites the URL without it, so
    // an orchestrator re-reading the address bar at each failure had the flag clobbered (U10).
    expect(finderSearch("Hornsby")).not.toContain("debug");
    const host = fakeHost({ search: "?place=Hornsby&debug=1" });
    writePlace(host, "Epping");
    expect(host.calls.at(-1)?.url).toBe("/finder?place=Epping");
  });

  it("reads back only its own version and shape; anything else is a fresh record", () => {
    const good = JSON.stringify({ v: STATE_VERSION, request: "a", draft: "", matchId: null, trail: ["welcome", "type"] });
    expect(readRecord(fakeHost({ stored: good }).storage)?.trail).toEqual(["welcome", "type"]);
    for (const bad of eachOf(
      [
        JSON.stringify({ v: STATE_VERSION + 1, request: "a", draft: "", matchId: null, trail: ["welcome"] }),
        JSON.stringify({ v: STATE_VERSION, request: 1, draft: "", matchId: null, trail: ["welcome"] }),
        JSON.stringify({ v: STATE_VERSION, request: "a", draft: "", matchId: 7, trail: ["welcome"] }),
        JSON.stringify({ v: STATE_VERSION, request: "a", draft: "", matchId: null, trail: [] }),
        JSON.stringify({ v: STATE_VERSION, request: "a", draft: "", matchId: null, trail: ["nowhere"] }),
        "not json",
        "null",
      ],
      "the malformed records",
    )) {
      expect(readRecord(fakeHost({ stored: bad }).storage), bad).toBeNull();
    }
    expect(entryOf(null)).toBeNull();
    expect(entryOf({ __NA: true })).toBeNull();
    expect(entryOf({ finder: { v: STATE_VERSION, stage: "listening", index: -1 } })).toBeNull();
    expect(entryOf({ finder: { v: STATE_VERSION, stage: "elsewhere", index: 1 } })).toBeNull();
    expect(entryOf({ finder: { v: STATE_VERSION, stage: "profile", index: 2.7 }, __NA: true })).toEqual({
      v: STATE_VERSION, stage: "profile", index: 2,
    });
    expect(isStage("results")).toBe(true);
    expect(isStage("matching")).toBe(false);
  });

  it("a fresh arrival stamps index 0 on the entry it is on, keeps the URL, and clears the tab", () => {
    const host = fakeHost({ search: "?place=Hornsby", stored: JSON.stringify({ ...emptyRecord(), request: SENTENCE }) });
    const arrival = arrive(host);
    expect(arrival).toMatchObject({ stage: "welcome", index: 0, place: "Hornsby", resumed: false });
    expect(arrival.record.request).toBe("");
    expect(host.calls).toEqual([
      { method: "replaceState", state: { finder: { v: STATE_VERSION, stage: "welcome", index: 0 } }, url: "/finder?place=Hornsby" },
    ]);
    expect(host.store.has(STORAGE_KEY)).toBe(false);
  });

  it("a revisited entry resumes the tab's record at the entry's index, and never on the microphone", () => {
    const stored = JSON.stringify({ v: STATE_VERSION, request: SENTENCE, draft: "", matchId: "gp-2", trail: ["welcome", "listening", "results"] });
    const host = fakeHost({ search: "?place=Epping", state: { finder: { v: STATE_VERSION, stage: "results", index: 2 }, __NA: true }, stored });
    const arrival = arrive(host);
    // The place is the address bar's on a revisit too — it is the one thing a reload keeps there.
    expect(arrival).toMatchObject({ stage: "results", index: 2, place: "Epping", resumed: true });
    expect(arrival.record).toMatchObject({ request: SENTENCE, matchId: "gp-2" });
    // Resuming rewrites nothing: the entry is already the finder's.
    expect(host.calls).toEqual([]);

    // Back into the listening entry lands on the typing screen — WebKit starts a microphone only
    // from a tap, so the words are one tap from it rather than a recogniser nobody asked for.
    const back = arrive(fakeHost({ state: { finder: { v: STATE_VERSION, stage: "listening", index: 1 } }, stored }));
    expect(back.stage).toBe("type");
    expect(back.record.trail[1]).toBe("listening");

    // Storage gone (a cleared tab) but the entry still there: the trail is rebuilt to the entry.
    const lost = arrive(fakeHost({ state: { finder: { v: STATE_VERSION, stage: "profile", index: 3 } } }));
    expect(lost).toMatchObject({ stage: "profile", index: 3, resumed: true });
    expect(lost.record.trail).toHaveLength(4);
    expect(lost.record.trail[3]).toBe("profile");
  });

  it("a forward move cuts the Forward entries it leaves behind, as the browser's own do", () => {
    const host = fakeHost();
    const trail: FinderRecord = { ...emptyRecord(), trail: ["welcome", "type", "results", "profile"] };
    // Standing on `type` (index 1) and searching again: results replaces the old results/profile.
    const moved = advance(host, trail, 1, "results");
    expect(moved.index).toBe(2);
    expect(moved.record.trail).toEqual(["welcome", "type", "results"]);
    expect(host.calls.at(-1)).toMatchObject({ method: "pushState", state: { finder: { stage: "results", index: 2 } } });
    // A push never carries a URL: the stage is in the entry, the address bar is not its home.
    expect(host.calls.at(-1)?.url).toBeUndefined();
  });

  it("an in-app Back is the browser's own Back to the nearest earlier entry for the stage", () => {
    const trail = ["welcome", "type", "results", "profile", "compare"] as const;
    expect(stepsBackTo(trail, 4, "results")).toBe(-2);
    expect(stepsBackTo(trail, 4, "welcome")).toBe(-4);
    expect(stepsBackTo(trail, 3, "results")).toBe(-1);
    // Not behind the person: the caller advances instead.
    expect(stepsBackTo(trail, 2, "profile")).toBeNull();
    expect(stepsBackTo(trail, 0, "welcome")).toBeNull();
    // The nearest, when a stage was walked twice.
    expect(stepsBackTo(["welcome", "type", "results", "type", "results"], 4, "type")).toBe(-1);
  });

  it("the place is rewritten in place — a replaceState on the current entry, never a push", () => {
    const host = fakeHost({ state: { finder: { v: STATE_VERSION, stage: "results", index: 2 }, __NA: true } });
    writePlace(host, "Hornsby");
    writePlace(host, "");
    expect(host.calls).toEqual([
      { method: "replaceState", state: { finder: { v: STATE_VERSION, stage: "results", index: 2 }, __NA: true }, url: "/finder?place=Hornsby" },
      { method: "replaceState", state: { finder: { v: STATE_VERSION, stage: "results", index: 2 }, __NA: true }, url: "/finder" },
    ]);
    // Safari throttles replaceState; a refusal costs a keystroke's worth of address bar, not a crash.
    const throttled = fakeHost();
    throttled.history.replaceState = () => {
      throw new DOMException("Attempt to use history.replaceState() more than 100 times per 30 seconds", "SecurityError");
    };
    expect(() => writePlace(throttled, "Hornsby")).not.toThrow();
  });
});
