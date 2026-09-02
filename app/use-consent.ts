"use client";

// U13 (O229): the consent store bound to the window — the React side of `src/privacy/consent.ts`.
//
// `useSyncExternalStore` so the bar, the loader and the withdraw control read one value and move
// together. The server snapshot is `unknown`, and so is the hydrating client's: the server render
// and a returning visitor then agree (no flash of the bar for someone who agreed last month, no
// hydration mismatch), and React re-reads the device the moment hydration is done — which is what
// O16's after-mount effect did by hand.

import { useSyncExternalStore } from "react";
import {
  readConsent,
  recordConsent,
  subscribeConsent,
  withdrawConsent,
  type Consent,
  type ConsentHost,
} from "@/privacy/consent";

// Storage is reached per call, never held: with site data blocked, even reading
// `window.localStorage` throws, and the store catches that where it happens.
const HOST: ConsentHost = {
  storage: {
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
    removeItem: (key) => window.localStorage.removeItem(key),
  },
  addEventListener: (type, listener) => window.addEventListener(type, listener),
  removeEventListener: (type, listener) => window.removeEventListener(type, listener),
  dispatchEvent: (event) => window.dispatchEvent(event),
};

const subscribe = (listener: () => void) => subscribeConsent(HOST, listener);
const read = () => readConsent(HOST);
const unknown = (): Consent => "unknown";

export function useConsent(): Consent {
  return useSyncExternalStore(subscribe, read, unknown);
}

export const agree = () => recordConsent(HOST);
export const withdraw = () => withdrawConsent(HOST);
