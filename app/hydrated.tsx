"use client";

import { useEffect } from "react";

/**
 * Marks the document once React is attached. Nothing reads it in the product; the e2e suite
 * waits for it before typing, because an input filled before hydration keeps its letters and
 * loses its meaning, and WebKit reaches this point later than Chromium does.
 */
export function Hydrated() {
  useEffect(() => {
    document.documentElement.setAttribute("data-hydrated", "1");
  }, []);
  return null;
}
