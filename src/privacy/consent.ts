// U13 (O229): the privacy agreement as a store with more than one reader.
//
// O16 kept the acknowledgement in localStorage on the person's own device, under one key, read
// once by the bar. U13 gives it a second reader — the analytics loader, which may run only while
// the agreement holds — and a way to take it back. So the key gets a module: one place that reads,
// records and withdraws it, and a subscription so every reader on the page moves together. The
// key is unchanged — an agreement given before this unit still counts, and the e2e storage state
// that pre-agrees every spec stays valid.
//
// The store is the browser's storage plus an event. `storage` events fire only in OTHER documents,
// so a change made here is announced on the host by hand under its own name; a change made in
// another tab arrives as the `storage` event itself. Both feed one listener. The host is injected
// so the model is testable without a browser; `app/use-consent.ts` binds the window.

export const CONSENT_KEY = "adhdme-privacy-ack";
export const CONSENT_EVENT = "adhdme-consent";

/** `unknown` is the server's and the hydrating client's answer; a reader must not act on it. */
export type Consent = "agreed" | "not-agreed" | "unknown";

/** The pieces of `window` the store touches — named so a test can fake them. */
export interface ConsentHost {
  readonly storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
  dispatchEvent(event: Event): boolean;
}

/**
 * What this visit knows when storage cannot be read or written (private mode with storage off).
 * Agreeing then still ends the bar for the visit, and withdrawing still stops the loader; nothing
 * persists, which errs on the side of asking again rather than never.
 */
let thisVisit: Exclude<Consent, "unknown"> | null = null;

export function readConsent(host: ConsentHost): Consent {
  try {
    return host.storage.getItem(CONSENT_KEY) ? "agreed" : "not-agreed";
  } catch {
    return thisVisit ?? "not-agreed";
  }
}

function write(host: ConsentHost, next: Exclude<Consent, "unknown">): void {
  thisVisit = next;
  try {
    if (next === "agreed") host.storage.setItem(CONSENT_KEY, "1");
    else host.storage.removeItem(CONSENT_KEY);
  } catch {
    // Storage blocked: the readers on this page still hear the change below.
  }
  host.dispatchEvent(new Event(CONSENT_EVENT));
}

export function recordConsent(host: ConsentHost): void {
  write(host, "agreed");
}

export function withdrawConsent(host: ConsentHost): void {
  write(host, "not-agreed");
}

/** Hears this document's own changes and other tabs' `storage` events; returns the unsubscribe. */
export function subscribeConsent(host: ConsentHost, listener: () => void): () => void {
  host.addEventListener(CONSENT_EVENT, listener);
  host.addEventListener("storage", listener);
  return () => {
    host.removeEventListener(CONSENT_EVENT, listener);
    host.removeEventListener("storage", listener);
  };
}
