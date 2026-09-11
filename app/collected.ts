"use client";

// What a round has already taken (2026-09-11).
//
// Every game that collects things did the same thing: read the set from state, add one, write it
// back. That is correct exactly once per render, and these rounds are not once per render — two
// targets swatted in one frame, a finger crossing four tiles of a grid, two cards flung together.
// The second write was built on the set as it stood at the last render, so it undid the first:
// the piece came off and came back, and a round that had been cleared never finished. Measured on
// the wipe grid before this existed — a finger dragged across four tiles took two off.
//
// A ref is the record, because a ref is current the instant it is written; the state beside it
// exists only to ask React to draw. Nothing here decides what a hit is worth: it decides what has
// already happened, which is the thing the closure kept getting wrong.

import { useRef, useState } from "react";

export interface Collected<T> {
  /** Everything taken so far, newest last. Safe to read while rendering. */
  readonly all: Readonly<Record<string, T>>;
  readonly size: number;
  has(id: string): boolean;
  /** Takes one. Returns false if it was already taken, so a caller can stop rather than double-count. */
  take(id: string, value: T): boolean;
}

export function useCollected<T = true>(): Collected<T> {
  const held = useRef<Record<string, T>>({});
  const [, draw] = useState(0);
  // `all` and `size` are getters, not values read at render: the caller of `take` asks whether the
  // round is finished on the next line, and a size computed during the last render would still be
  // one short — the final piece would land and the round would never end.
  return {
    get all() { return held.current; },
    get size() { return Object.keys(held.current).length; },
    has: (id) => id in held.current,
    take: (id, value) => {
      if (id in held.current) return false;
      held.current = { ...held.current, [id]: value };
      draw((n) => n + 1);
      return true;
    },
  };
}
