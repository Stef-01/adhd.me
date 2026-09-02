// U4 (O229): the browser's side of the Web Vitals seam. Next's `useReportWebVitals` hands every
// metric the `web-vitals` library measures; only the three the plan targets (LCP, INP, CLS) are
// sent, as one small JSON beacon each to `/api/vitals`, with the pathname alone — never the
// query, which on the finder is the visitor's own words. `sendBeacon` survives the page unloading,
// which is when INP and CLS finalise; `fetch` with `keepalive` is the same promise where the
// beacon API is missing. Nothing renders.
"use client";

import { useReportWebVitals } from "next/web-vitals";

const SENT = new Set(["LCP", "INP", "CLS"]);

export function WebVitals() {
  useReportWebVitals((metric) => {
    if (!SENT.has(metric.name)) return;
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      path: window.location.pathname,
    });
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/vitals", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/vitals", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  });
  return null;
}
