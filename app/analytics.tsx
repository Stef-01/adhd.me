"use client";

// Launch item 19: analytics, behind an explicit switch — and, since U13, behind the agreement.
//
// The switch is `NEXT_PUBLIC_GA_ID` (`src/privacy/measurement.ts` says why it is dark by
// default). U13 adds the second condition: the tag loads only while the privacy agreement holds.
// Nothing is rendered — the loader is inserted from an effect once the store says `agreed`, and
// the effect's cleanup is the withdrawal: gtag.js's own off flag goes up, the element comes out,
// and the queue is dropped, so a later withdrawal on /privacy stops the tag in the same document.
// Agreeing again runs the effect again.
//
// WHY NOT `next/script`. The old version rendered the loader as a `<Script>` and the four-line
// gtag bootstrap as an inline script — the tree's one hand-written inline script, and the reason
// `headers.test.ts`'s census tolerated one. Under the enforced policy (U13) that bootstrap now
// runs as ordinary module code, so the census holds at zero inline scripts, and the loader is a
// plain element the effect owns, because `next/script` cannot be unloaded.
//
// GA4 as configured here does not use advertising signals, and Google discards instrument IPs on
// receipt. Nothing a visitor types reaches it: the finder's request never leaves the page.

import { useEffect } from "react";
import { GA_ID, gaDisableFlag, gaLoaderUrl } from "@/privacy/measurement";
import { useConsent } from "./use-consent";

interface GtagWindow extends Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  [flag: `ga-disable-${string}`]: boolean | undefined;
}

export function Analytics() {
  const consent = useConsent();

  useEffect(() => {
    if (!GA_ID || consent !== "agreed") return;
    const id = GA_ID;
    const w = window as unknown as GtagWindow;
    const flag = gaDisableFlag(id);
    w[flag] = false;
    const dataLayer = (w.dataLayer ??= []);
    // gtag.js reads the `arguments` objects it finds on the queue, so this is a function
    // statement, as in Google's snippet, not an arrow with a rest parameter.
    w.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      dataLayer.push(arguments);
    };
    w.gtag("js", new Date());
    w.gtag("config", id, { allow_google_signals: false });

    const loader = document.createElement("script");
    loader.src = gaLoaderUrl(id);
    loader.async = true;
    document.head.appendChild(loader);

    return () => {
      w[flag] = true;
      loader.remove();
      delete w.gtag;
    };
  }, [consent]);

  return null;
}
