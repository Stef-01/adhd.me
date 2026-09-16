"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMotionValue, useReducedMotion } from "motion/react";
import { bedroomReducer, createBedroom, type BedroomAction } from "@/lives/leo-room";

export function useBedroom() {
  const reducedPreference = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [state, setState] = useState(() => createBedroom());
  const current = useRef(state);
  const clock = useMotionValue(0);
  const dispatch = useCallback((action: BedroomAction) => {
    const next = bedroomReducer(current.current, action);
    if (next !== current.current) { current.current = next; setState(next); clock.set(next.time); }
  }, [clock]);
  useEffect(() => { dispatch({ type: "still", value: Boolean(reducedPreference) }); setReady(true); }, [reducedPreference, dispatch]);
  useEffect(() => {
    if (!ready) return;
    let raf = 0, previous = performance.now(), debt = 0, published = 0;
    const frame = (now: number) => {
      const delta = Math.min(100, Math.max(0, now - previous)); previous = now;
      if (!current.current.paused && !current.current.still && !["rest", "complete"].includes(current.current.mode)) {
        debt += delta;
        const before = current.current;
        while (debt >= 50) { current.current = bedroomReducer(current.current, { type: "tick", ms: 50 }); debt -= 50; }
        clock.set(current.current.time + debt);
        // Gameplay facts publish at 8Hz or a meaningful event; positions stay on motion values.
        if (now - published >= 125 || before.mode !== current.current.mode || before.revision !== current.current.revision) {
          setState(current.current); published = now;
        }
      } else debt = 0;
      raf = requestAnimationFrame(frame);
    };
    const hidden = () => { if (document.hidden) dispatch({ type: "pause" }); };
    document.addEventListener("visibilitychange", hidden);
    hidden(); raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", hidden); };
  }, [ready, clock, dispatch]);
  return { state, dispatch, clock, ready };
}
