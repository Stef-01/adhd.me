"use client";

// The header the ADHD Life screens share: wordmark left, settings right — the same grid the
// profile and learn tabs already use, so the mark never moves between screens.

import Link from "next/link";
import { AppSettings } from "./app-settings";

export function LifeHeader() {
  return (
    <div className="minimal-header has-settings me-chrome">
      <Link className="wordmark finder-wordmark" href="/" aria-label="ADHD.ME, back to the finder" translate="no">ADHD.ME</Link>
      <AppSettings />
    </div>
  );
}

/** "Why am I seeing this?" (PRD §65), with the audit record (§64) folded under it. */
export function WhyThis({ why, rule, inputs, version }: { why: string; rule: string; inputs: readonly string[]; version: string }) {
  return (
    <details className="life-why">
      <summary>Why am I seeing this?</summary>
      <p>{why}</p>
      <p><code>rule {rule} · v{version}{inputs.length ? ` · ${inputs.join(", ")}` : ""}</code></p>
    </details>
  );
}
