"use client";

// U3 (O228): the last boundary. When the root layout itself fails there is no document to draw
// into, so this renders its own `<html>` and `<body>` — the same element and class as
// `app/layout.tsx`, with the stylesheet imported here so the paper, the type and the doors are
// the product's own rather than the browser's. Reload is the only honest retry at this level.
import { useEffect } from "react";
import { BOUNDARY_COPY } from "@/compliance/boundary-copy";
import "./globals.css";

const COPY = BOUNDARY_COPY.global;

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen antialiased app-body">
        <main id="main-content" className="notfound-screen">
          <h1>{COPY.heading}</h1>
          <p className="notfound-copy">{COPY.body}</p>
          <div className="notfound-doors">
            <button type="button" className="notfound-primary" onClick={reset}>{COPY.reload}</button>
            <a className="notfound-secondary" href="/">{COPY.home}</a>
          </div>
        </main>
      </body>
    </html>
  );
}
