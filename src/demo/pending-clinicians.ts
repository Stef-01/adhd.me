// W228 (O26/O34): the staging area for a clinician who is asked-for but not yet declarable.
//
// Dr Anusha Saxena lived here between the founder's first instruction and her go-live: the
// blockers were her consent, her own claims, and a portrait. On 2026-08-18 the founder
// relayed her consent ("she has asked us to upload it ASAP") and her published Healthengine
// bio supplied interest-level claims, so she moved into `clinicians` (O34) with the parts her
// interview has not yet covered left empty and marked (`mannerPending`), and no portrait by
// her choice — the monogram renders.
//
// The module stays: the next real clinician who arrives with facts missing gets staged here
// rather than half-invented, and `pending-clinicians.test.ts` keeps pinning that nothing
// pending leaks into matching and nobody is live and pending at once.

export const PENDING_CLINICIANS: readonly {
  id: string;
  name: string;
  gender: "woman" | "man" | "non-binary";
  practice: string;
  suburb: string;
  booking: { via: "healthengine"; practitionerId: string; url: string };
  pendingSince: string;
}[] = [];
