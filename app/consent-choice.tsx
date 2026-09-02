"use client";

// U13 (O229): the one place an agreement can be taken back.
//
// The bar (`privacy-consent.tsx`) records the agreement; this control, inside the policy's own
// "Cookies and local storage" section, states what this device holds and lets the reader withdraw
// it. Withdrawing removes the record, stops the measurement tag in the same document, and brings
// the bar back on every page — so the sentence below is never out of step with the bar. On the
// server and while hydrating the store answers `unknown` and nothing is rendered, so the static
// policy text above it is the same in every render.

import { useConsent, withdraw } from "./use-consent";

export function ConsentChoice() {
  const consent = useConsent();
  if (consent === "unknown") return null;

  if (consent === "not-agreed") {
    return (
      <p className="mt-2 text-sm leading-6" data-consent="not-agreed">
        Nothing is recorded on this device at the moment; the agreement bar is showing on every
        page until you choose.
      </p>
    );
  }

  // The control sits under the sentence, not inside it: an inline button wraps on a phone and
  // strands the full stop on the next line.
  return (
    <div className="mt-2 text-sm leading-6" data-consent="agreed">
      <p>
        You agreed to this policy on this device. You can take that back at any time: the record is
        removed, site measurement stops, and the bar returns.
      </p>
      <button
        type="button"
        onClick={withdraw}
        className="mt-2 min-h-11 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900"
      >
        Withdraw agreement
      </button>
    </div>
  );
}
