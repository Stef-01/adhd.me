"use client";

import { useEffect } from "react";

/**
 * Marks the document once React is attached. Nothing reads it in the product; the e2e suite
 * waits for it before typing, because an input filled before hydration keeps its letters and
 * loses its meaning, and WebKit reaches this point later than Chromium does.
 */
export function Hydrated() {
  useEffect(() => {
    // Counted, not flagged: the root layout stamps once, the app template stamps again when the
    // screen inside the loading boundary is live. The suite waits for the stamp the route needs.
    const el = document.documentElement;
    el.setAttribute("data-hydrated", String(Number(el.getAttribute("data-hydrated") ?? "0") + 1));
    return () => {
      el.setAttribute("data-hydrated", String(Math.max(0, Number(el.getAttribute("data-hydrated") ?? "1") - 1)));
    };
  }, []);
  return null;
}
