// U13 (O229): the consent store against a fake host — read, record, withdraw, subscribe — and
// the two things a browser can do to it: refuse storage, and change it from another tab.

import { describe, expect, it } from "vitest";
import {
  CONSENT_EVENT,
  CONSENT_KEY,
  readConsent,
  recordConsent,
  subscribeConsent,
  withdrawConsent,
  type ConsentHost,
} from "./consent";

function fakeHost(options: { blocked?: boolean; agreed?: boolean } = {}) {
  const store = new Map<string, string>(options.agreed ? [[CONSENT_KEY, "1"]] : []);
  const listeners = new Map<string, Set<() => void>>();
  const refuse = () => {
    throw new DOMException("storage is off", "SecurityError");
  };
  const host: ConsentHost = {
    storage: options.blocked
      ? { getItem: refuse, setItem: refuse, removeItem: refuse }
      : {
          getItem: (k) => store.get(k) ?? null,
          setItem: (k, v) => void store.set(k, v),
          removeItem: (k) => void store.delete(k),
        },
    addEventListener: (type, l) => void (listeners.get(type) ?? listeners.set(type, new Set()).get(type))!.add(l),
    removeEventListener: (type, l) => void listeners.get(type)?.delete(l),
    dispatchEvent: (event) => {
      for (const l of listeners.get(event.type) ?? []) l();
      return true;
    },
  };
  return { host, store, listeners };
}

describe("U13 the consent store", () => {
  it("reads the O16 key unchanged, so an agreement given before this unit still counts", () => {
    expect(CONSENT_KEY).toBe("adhdme-privacy-ack");
    expect(readConsent(fakeHost().host)).toBe("not-agreed");
    expect(readConsent(fakeHost({ agreed: true }).host)).toBe("agreed");
  });

  it("records and withdraws through the key, and tells this document's readers each time", () => {
    const { host, store, listeners } = fakeHost();
    const heard: string[] = [];
    const stop = subscribeConsent(host, () => heard.push(readConsent(host)));

    recordConsent(host);
    expect(store.get(CONSENT_KEY)).toBe("1");
    withdrawConsent(host);
    expect(store.has(CONSENT_KEY)).toBe(false);
    expect(heard).toEqual(["agreed", "not-agreed"]);

    stop();
    recordConsent(host);
    expect(heard).toEqual(["agreed", "not-agreed"]);
    expect([...listeners.values()].every((set) => set.size === 0)).toBe(true);
  });

  it("hears another tab through the storage event, under the same listener", () => {
    const { host, store } = fakeHost();
    const heard: string[] = [];
    subscribeConsent(host, () => heard.push(readConsent(host)));
    store.set(CONSENT_KEY, "1");
    host.dispatchEvent(new Event("storage"));
    expect(heard).toEqual(["agreed"]);
  });

  it("with storage blocked, still ends the bar for this visit and still stops the loader", () => {
    const { host } = fakeHost({ blocked: true });
    const heard: string[] = [];
    subscribeConsent(host, () => heard.push(readConsent(host)));
    expect(() => recordConsent(host)).not.toThrow();
    expect(readConsent(host)).toBe("agreed");
    withdrawConsent(host);
    expect(readConsent(host)).toBe("not-agreed");
    expect(heard).toEqual(["agreed", "not-agreed"]);
  });

  it("announces under its own event name, not one a page might already use", () => {
    expect(CONSENT_EVENT).toMatch(/^adhdme-/);
  });
});
