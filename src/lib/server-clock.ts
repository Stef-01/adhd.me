// AR15: the server half of the fixed capture clock.
//
// `page.clock.install` pins only the BROWSER. Four server components render "now" — outreach's
// minute-granular sendAt column, and the day-granular today/generatedAt on reporting, matching
// and credentials — so a hash baseline captured today could never match a capture taken
// tomorrow: the synthetic referral fixtures even DERIVE from todayIso, shifting whole tables
// daily. AR15's stopped first attempt measured exactly this (console/outreach unstable in all
// four combos between two same-day runs, at the minute boundary).
//
// The override is guarded TWICE: the env must be set explicitly AND the mock guard must already
// be on. A real deployment has the guard off, so no env value can freeze production's clock —
// the same posture as /api/mock/* (src/lib/mock-guard.ts). Server actions keep `new Date()`:
// they record what a person did, which is real even in the synthetic phase; this override
// exists only so a PAGE RENDER is reproducible under capture.

import { mockRoutesEnabled } from "./mock-guard";

/** The instant capture runs pin both clocks to — must equal e2e/support/visual.ts's FIXED_CLOCK_ISO. */
export const SERVER_FIXED_CLOCK_ENV = "ADHDME_FIXED_CLOCK";

export function serverNow(): Date {
  const pinned = process.env[SERVER_FIXED_CLOCK_ENV];
  if (pinned && mockRoutesEnabled()) {
    const parsed = new Date(pinned);
    // A malformed pin falls through to the real clock rather than rendering "Invalid Date"
    // into every page — but loudly, because a silent fallback is a baseline that lies.
    if (!Number.isNaN(parsed.getTime())) return parsed;
    console.error(`serverNow: ${SERVER_FIXED_CLOCK_ENV}="${pinned}" is not a parseable date; using the real clock`);
  }
  return new Date();
}
