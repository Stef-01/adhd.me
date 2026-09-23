"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/** Actions every live world understands. */
export type LoopAction = { type: "tick"; ms: number } | { type: "pause" } | { type: "resume" } | { type: "still"; value: boolean };
export interface LoopState { paused: boolean; still: boolean }

/**
 * Fixed 50 ms simulation steps on one animation frame, published every frame while the world runs.
 * Hidden tabs pause; a returning tab never receives a catch-up burst. `running` decides when the
 * clock may advance (still mode and untimed phases advance only through player actions).
 */
export function useLoop<S extends LoopState, A>(reducer: (s: S, a: A | LoopAction) => S, init: () => S, running: (s: S) => boolean) {
  const reduced = useReducedMotion();
  const [state, setState] = useState(init);
  const current = useRef(state);
  const [ready, setReady] = useState(false);
  const dispatch = useCallback((action: A | LoopAction) => {
    const next = reducer(current.current, action);
    if (next !== current.current) { current.current = next; setState(next); }
  }, [reducer]);
  useEffect(() => { if (reduced) dispatch({ type: "still", value: true }); setReady(true); }, [reduced, dispatch]);
  useEffect(() => {
    if (!ready) return;
    let raf = 0, previous = performance.now(), debt = 0;
    const frame = (now: number) => {
      const delta = Math.min(100, Math.max(0, now - previous)); previous = now;
      const s = current.current;
      if (!s.paused && !s.still && running(s)) {
        debt += delta;
        let next = s;
        while (debt >= 50) { next = reducer(next, { type: "tick", ms: 50 }); debt -= 50; }
        if (next !== s) { current.current = next; setState(next); }
      } else debt = 0;
      raf = requestAnimationFrame(frame);
    };
    const hidden = () => { if (document.hidden && !current.current.paused) dispatch({ type: "pause" }); };
    document.addEventListener("visibilitychange", hidden);
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", hidden); };
  }, [ready, reducer, running, dispatch]);
  return { state, dispatch, ready };
}
