// O16: the privacy agreement, as a control rather than a page nobody finds.
//
// A one-time bar with two honest actions: read the policy (a pop-out summary with the full
// page one tap away) or agree. The acknowledgement lives in localStorage on the person's own
// device — storing it anywhere else would be collecting data to record that we try not to
// collect data. The pop-out is a native <dialog>, which brings real modality for free: focus
// is trapped, Escape closes, and focus returns to the button that opened it.
//
// U13: the agreement is read through the consent store (`app/use-consent.ts`) rather than by
// this bar alone, because the analytics loader reads the same value, and the withdraw control on
// /privacy can take the agreement back — at which point this bar returns, on every page.
"use client";

import Link from "next/link";
import { useRef } from "react";
import { agree as recordAgreement, useConsent } from "./use-consent";

export function PrivacyConsent() {
  const consent = useConsent();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Nothing on the server render and nothing once somebody has agreed: the store answers
  // `unknown` until hydration is done, so the server render and returning visitors agree.
  if (consent !== "not-agreed") return null;

  const agree = () => {
    dialogRef.current?.close();
    recordAgreement();
  };

  return (
    <div className="consent-bar" role="region" aria-label="Privacy">
      <p>
        We use only what is needed to run this site, and nothing you enter is used for
        advertising.
      </p>
      <div className="consent-actions">
        <button type="button" className="consent-read" onClick={() => dialogRef.current?.showModal()}>
          Privacy policy
        </button>
        <button type="button" className="consent-agree" onClick={agree}>
          Agree
        </button>
      </div>

      <dialog ref={dialogRef} className="consent-dialog" aria-labelledby="consent-title">
        <h2 id="consent-title">How this site handles what you give it</h2>
        <ul>
          <li>
            What you type into the finder is matched on your device to order the list of GPs.
            We do not store it.
          </li>
          <li>
            If you use the microphone, your browser&rsquo;s speech service converts the audio.
            We never record it or receive it.
          </li>
          <li>
            If you register interest, we keep your name, email and choices to reply to you, and
            for nothing else.
          </li>
          <li>
            This agreement is remembered on your device only.
          </li>
        </ul>
        <p>
          <Link href="/privacy" target="_blank">Read the full privacy policy</Link>
        </p>
        <div className="consent-dialog-actions">
          <button type="button" className="consent-agree" onClick={agree}>
            I agree
          </button>
          <button type="button" className="consent-read" onClick={() => dialogRef.current?.close()}>
            Close
          </button>
        </div>
      </dialog>
    </div>
  );
}
