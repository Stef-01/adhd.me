"use client";

// U3 (O228): the route error boundary. A page under the root layout that throws while rendering
// lands here instead of on Next's default screen, in the same calm register as the 404: one
// plain sentence, that the reader did not cause it, and two doors. `reset` re-renders the segment
// in place; the second door is a full navigation on purpose, so a client tree the boundary caught
// is left behind rather than re-entered. Reporting goes to the console until U4 wires the seam.
import { useEffect } from "react";
import { BOUNDARY_COPY } from "@/compliance/boundary-copy";

const COPY = BOUNDARY_COPY.route;

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main-content" className="notfound-screen">
      <h1>{COPY.heading}</h1>
      <p className="notfound-copy">{COPY.body}</p>
      <div className="notfound-doors">
        <button type="button" className="notfound-primary" onClick={reset}>{COPY.retry}</button>
        <a className="notfound-secondary" href="/">{COPY.home}</a>
      </div>
    </main>
  );
}
