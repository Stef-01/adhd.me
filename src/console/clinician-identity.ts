// W81: which clinician is the signed-in person?
//
// The console signs in by email and authorises by membership; it has never needed to know
// which CLINICIAN a user is. Stating a case-mix interest does need that, because an interest
// recorded for someone else is not their preference.
//
// Resolution is exact-match on a clinician's recorded email and nothing else. No fuzzy
// matching on display name, no "only one clinician so it must be them" shortcut: both would
// occasionally attribute a preference to the wrong person, which is the single failure this
// lookup exists to avoid. Unlinked means unlinked, and the caller must refuse rather than guess.

import type { ClinicianRecord } from "./store";

export type ClinicianIdentity =
  | { linked: true; clinician: ClinicianRecord }
  | { linked: false; reason: "no_clinician_for_email" };

export function clinicianForEmail(
  clinicians: readonly ClinicianRecord[],
  email: string,
): ClinicianIdentity {
  const normalised = email.trim().toLowerCase();
  const matches = clinicians.filter((c) => (c.email ?? "").trim().toLowerCase() === normalised && normalised !== "");

  // Two clinicians sharing a sign-in is a roster error, not a tie to break.
  if (matches.length !== 1) return { linked: false, reason: "no_clinician_for_email" };
  return { linked: true, clinician: matches[0]! };
}
