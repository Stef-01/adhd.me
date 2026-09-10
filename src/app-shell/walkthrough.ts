// The walkthrough (founder-directed, 2026-09-10): the explanatory sentences a screen used to
// carry live behind one switch. Off, a screen shows what it is for and the one thing to do; on,
// the same screen explains itself, in place, under the elements it explains.
//
// WHY A SWITCH AND NOT LESS COPY. The gold-standard apps this product is measured against hold
// about forty words above the fold (Headspace) and about twenty (Finch, built for ADHD). A
// screen of ours carried a hundred. Deleting the explanations would lose what they say; hiding
// them behind a mode a person opens when they want them keeps the words and removes the cost of
// reading them every time. The mode is on the device, off by default, and a first visit is
// offered it once rather than given it.

export const WALKTHROUGH_VERSION = 1;
export const WALKTHROUGH_KEY = `adhdme.walkthrough.v${WALKTHROUGH_VERSION}`;
/** The DOM event a change is announced on, so every `Explain` on the page follows the switch. */
export const WALKTHROUGH_EVENT = "adhdme:walkthrough";

export type WalkthroughState = {
  v: typeof WALKTHROUGH_VERSION;
  on: boolean;
  /** The first visit's offer has been shown, so it is not shown again. */
  offered: boolean;
};

const DEFAULT: WalkthroughState = { v: WALKTHROUGH_VERSION, on: false, offered: false };

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readWalkthrough(storage: StorageLike | null): WalkthroughState {
  if (!storage) return DEFAULT;
  try {
    const raw = storage.getItem(WALKTHROUGH_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<WalkthroughState>;
    if (parsed.v !== WALKTHROUGH_VERSION) return DEFAULT;
    return { v: WALKTHROUGH_VERSION, on: parsed.on === true, offered: parsed.offered === true };
  } catch {
    return DEFAULT;
  }
}

export function writeWalkthrough(storage: StorageLike | null, next: WalkthroughState): void {
  if (!storage) return;
  try {
    storage.setItem(WALKTHROUGH_KEY, JSON.stringify(next));
  } catch {
    // A blocked store: the switch lives for the page and no longer.
  }
}

/** The browser's store, or null where there is none (the server, a blocked context). */
export function deviceWalkthroughStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Flip the switch on the device and tell the page. */
export function setWalkthrough(on: boolean, storage: StorageLike | null = deviceWalkthroughStorage()): WalkthroughState {
  const next: WalkthroughState = { ...readWalkthrough(storage), on, offered: true };
  writeWalkthrough(storage, next);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(WALKTHROUGH_EVENT, { detail: next }));
  return next;
}

/** Record that the first-visit offer was shown, without changing the switch. */
export function markOffered(storage: StorageLike | null = deviceWalkthroughStorage()): WalkthroughState {
  const next: WalkthroughState = { ...readWalkthrough(storage), offered: true };
  writeWalkthrough(storage, next);
  return next;
}
