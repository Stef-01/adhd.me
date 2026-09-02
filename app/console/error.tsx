"use client";

// U3 (O228): the console's error boundary. Same shape as `app/error.tsx`, with the way out
// pointed at the console's front page rather than the landing, because a practice owner mid-task
// wants their own front door, not the patient one.
import { useEffect } from "react";
import { BOUNDARY_COPY } from "@/compliance/boundary-copy";

const COPY = BOUNDARY_COPY.console;

export default function ConsoleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main-content" className="notfound-screen">
      <h1>{COPY.heading}</h1>
      <p className="notfound-copy">{COPY.body}</p>
      <div className="notfound-doors">
        <button type="button" className="notfound-primary" onClick={reset}>{COPY.retry}</button>
        <a className="notfound-secondary" href="/console">{COPY.home}</a>
      </div>
    </main>
  );
}
