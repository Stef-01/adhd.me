"use client";

// The first visit's one offer: a line and two answers, shown once, under the header on the app
// pages. "Show me around" turns the walkthrough on; "I'm fine" turns it off. Either way the offer
// is marked made and never shown again; the settings sheet holds the switch from then on.
// Rendered after mount, from the device flag, so the server and the first paint agree.

import { useEffect, useState } from "react";
import { deviceWalkthroughStorage, markOffered, readWalkthrough, setWalkthrough } from "@/app-shell/walkthrough";

export function WalkthroughOffer() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(!readWalkthrough(deviceWalkthroughStorage()).offered);
  }, []);
  if (!show) return null;
  return (
    <div className="walkthrough-offer" role="region" aria-label="Explanations" data-testid="walkthrough-offer">
      <span>Want each screen explained?</span>
      <div>
        <button
          type="button"
          onClick={() => {
            setWalkthrough(true);
            setShow(false);
          }}
        >
          Show me around
        </button>
        <button
          type="button"
          onClick={() => {
            markOffered();
            setShow(false);
          }}
        >
          I&rsquo;m fine
        </button>
      </div>
    </div>
  );
}
