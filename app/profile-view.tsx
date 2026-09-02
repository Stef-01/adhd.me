"use client";

// O233 (founder-directed): the Profile tab.
//
// A Profile tab in an app without accounts is where a placeholder usually goes — a stub with an
// avatar and a row of settings that do nothing. This one shows the only true answer to "what does
// this app know about me": what the DEVICE is holding, read from the same `sessionStorage` record
// the finder resumes from (`src/finder/state.ts`), plus the controls over it.
//
// Nothing is invented and nothing is stored to fill the screen. Before a first search the honest
// state is empty, and the empty state says what will appear here and gives the action that fills
// it — which is what an empty state is for.

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, MapPin, Quotes, Trash } from "@phosphor-icons/react";
import { clearRecord, readRecord, placeFrom, type FinderRecord } from "@/finder/state";

export function ProfileView() {
  // Read on the client only: `sessionStorage` does not exist during the server render, and a
  // profile that flashed "nothing yet" before hydrating would be lying for one frame.
  const [record, setRecord] = useState<FinderRecord | null>(null);
  const [place, setPlace] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRecord(readRecord(window.sessionStorage));
    setPlace(placeFrom(window.location.search));
    setReady(true);
  }, []);

  const forget = (): void => {
    clearRecord(window.sessionStorage);
    setRecord(null);
    setPlace("");
  };

  const words = record?.request?.trim() ?? "";
  const held = ready && (words.length > 0 || place.length > 0);

  return (
    <main id="main-content" className="profile-tab app-page-with-tabs">
      <header className="profile-tab-head">
        <h1>Your details</h1>
        <p>Everything below is held on this device only, for this tab.</p>
      </header>

      {held ? (
        <>
          <ul className="profile-facts">
            {words.length > 0 && (
              <li>
                <Quotes size={18} weight="regular" aria-hidden="true" />
                <span>
                  <small>What you described</small>
                  <strong>{words}</strong>
                </span>
              </li>
            )}
            {place.length > 0 && (
              <li>
                <MapPin size={18} weight="regular" aria-hidden="true" />
                <span>
                  <small>Where you said you are</small>
                  <strong>{place}</strong>
                </span>
              </li>
            )}
          </ul>

          <div className="profile-actions">
            <Link className="profile-primary" href="/">
              Back to your results<ArrowRight size={17} weight="bold" aria-hidden="true" />
            </Link>
            <button className="profile-forget" type="button" onClick={forget}>
              <Trash size={16} weight="regular" aria-hidden="true" />
              Forget what I typed
            </button>
          </div>
        </>
      ) : (
        <div className="profile-empty">
          <p>
            Once you describe the GP you are looking for, your words and the suburb you gave will
            appear here, and you can clear them from this device in one tap.
          </p>
          <Link className="profile-primary" href="/">
            Describe what you need<ArrowRight size={17} weight="bold" aria-hidden="true" />
          </Link>
        </div>
      )}

      <p className="profile-privacy">
        Nothing you type is sent anywhere or kept after this tab closes. <Link href="/privacy">How this works</Link>
      </p>
    </main>
  );
}
