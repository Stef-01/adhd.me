"use client";

// U8 (O229): the finder's stages wired to the browser — the React side of `src/finder/state.ts`.
//
// The model decides where a stage lives (an entry in history, the words in the tab); this hook
// is the only place that touches `window` for it. `care-finder.tsx` keeps the state machine —
// which stage follows which — and calls `goTo` for a forward move, `backTo` for an in-app Back
// control, and `remember` whenever the words or the chosen match change. Back, Forward and reload
// arrive through here without the state machine knowing.

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  advance,
  arrive,
  emptyRecord,
  entryOf,
  stageOnRevisit,
  stepsBackTo,
  writePlace,
  writeRecord,
  type Arrival,
  type FinderHost,
  type FinderRecord,
  type Stage,
} from "@/finder/state";

function browserHost(): FinderHost {
  return {
    history: window.history,
    storage: window.sessionStorage,
    pathname: window.location.pathname,
    search: window.location.search,
  };
}

export interface FinderHistory {
  stage: Stage;
  /**
   * Changes once, on a resumed arrival (a reload, or Back into a stage the finder left). The
   * stage swap it causes happens before the first paint, and keying `AnimatePresence` on it is
   * what stops the welcome screen the server rendered from playing an exit animation nobody
   * should see.
   */
  arrivalKey: number;
  /**
   * O249: which way the last move went. `1` for a forward move, `-1` for Back (in-app or the
   * browser's), so a screen can leave the way it came — Apple's spatial-consistency rule — instead
   * of always rising. Popstate compares entry indices; a forward popstate (rare) reads as 1.
   */
  direction: 1 | -1;
  /** A forward move: a new history entry for `stage`. */
  goTo: (stage: Stage) => void;
  /** An in-app Back: the browser's own Back to the nearest earlier `stage`, or forward if never there. */
  backTo: (stage: Stage) => void;
  /** Keep the tab's record current. Nothing here reaches the URL or the history entry. */
  remember: (fields: Partial<Pick<FinderRecord, "request" | "draft" | "matchId">>) => void;
  /** The place, rewritten into the address bar in place. */
  rememberPlace: (place: string) => void;
}

/**
 * @param onArrive Called once, before the first paint, with where the finder arrived: the place
 *   the address bar carried (every arrival), and — when `resumed` — the tab's record, from which
 *   the caller restores its words and its chosen match.
 */
export function useFinderHistory(onArrive: (arrival: Arrival) => void): FinderHistory {
  const [stage, setStage] = useState<Stage>("welcome");
  const [arrivalKey, setArrivalKey] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const nav = useRef({ index: 0, record: emptyRecord() });
  const arrived = useRef(onArrive);
  arrived.current = onArrive;

  // Layout, not passive: a resumed stage must be on screen in the same frame the server's
  // welcome markup hydrates, or the person sees the wrong screen for a paint.
  useLayoutEffect(() => {
    const arrival = arrive(browserHost());
    nav.current = { index: arrival.index, record: arrival.record };
    arrived.current(arrival);
    if (arrival.resumed) {
      setStage(arrival.stage);
      setArrivalKey(1);
    }
    const onPopState = (event: PopStateEvent) => {
      const entry = entryOf(event.state);
      if (!entry) return;
      const { record } = nav.current;
      // A trail the tab lost (storage cleared mid-session) is patched from the entry as it is walked.
      if (record.trail[entry.index] !== entry.stage) record.trail[entry.index] = entry.stage;
      setDirection(entry.index < nav.current.index ? -1 : 1);
      nav.current.index = entry.index;
      setStage(stageOnRevisit(entry.stage));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const goTo = useCallback((next: Stage) => {
    nav.current = advance(browserHost(), nav.current.record, nav.current.index, next);
    setDirection(1);
    setStage(next);
  }, []);

  const backTo = useCallback(
    (target: Stage) => {
      const delta = stepsBackTo(nav.current.record.trail, nav.current.index, target);
      if (delta === null) goTo(target);
      else window.history.go(delta);
    },
    [goTo],
  );

  const remember = useCallback((fields: Partial<Pick<FinderRecord, "request" | "draft" | "matchId">>) => {
    const record = nav.current.record;
    if (Object.entries(fields).every(([key, value]) => record[key as keyof typeof fields] === value)) return;
    nav.current.record = { ...record, ...fields };
    writeRecord(window.sessionStorage, nav.current.record);
  }, []);

  const rememberPlace = useCallback((place: string) => writePlace(browserHost(), place), []);

  return { stage, arrivalKey, direction, goTo, backTo, remember, rememberPlace };
}
