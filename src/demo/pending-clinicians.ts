// W228 (O26): the clinician who is asked-for but not yet declarable.
//
// THE FOUNDER'S INSTRUCTION (2026-08-18): add Dr Anusha Saxena, Bay Health Clinic, as one of
// the women GPs, bookable on Healthengine. The roster's two entries are real people and the
// pattern for listing one is established — `realPerson: true`, a disclosure where one is due,
// and every profile claim being the clinician's OWN (W193: a profile is what they said).
//
// WHY SHE IS STAGED HERE AND NOT LIVE IN `clinicians` YET. A live entry needs claims this
// session cannot source: her care areas, her manner in her own words, her languages, her
// telehealth and billing facts. Both her public pages (healthengine.com.au, beecroftfp.com.au)
// are unreachable from this build environment, and authoring those fields without her is
// fabricating declarations about a named practitioner — the exact thing the interview exists
// to prevent. Her PHOTO is likewise hers to supply: the tree's standing law on `image` says a
// real clinician's likeness arrives from the clinician, never lifted from another site.
//
// `pending-clinicians.test.ts` pins that nothing here leaks into matching until the checklist
// below is done and the entry is moved into `clinicians` with the missing fields filled.

/** What the founder supplied, verbatim usable; nothing here is a clinical claim. */
export const PENDING_CLINICIANS = [
  {
    id: "anusha-saxena",
    name: "Dr Anusha Saxena",
    shortName: "Dr Anusha Saxena",
    gender: "woman" as const,
    practice: "Bay Health Clinic",
    suburb: "Double Bay",
    booking: {
      via: "healthengine" as const,
      practitionerId: "160121",
      url: "https://healthengine.com.au/doctor/nsw/double-bay/dr-anusha-saxena/p160121",
    },
    /**
     * GOES LIVE WHEN — each item is a fact only she (or the founder relaying her) can supply:
     *  1. careAreas + careAreasSometimes: which of the twelve areas she actually sees, from
     *     her interview (three-state answers, W221/W227 pipeline).
     *  2. manner: at least one way-of-working claim in her own words (roster law: a clinician
     *     with no manner can never match half of what people ask).
     *  3. languages she consults in.
     *  4. nswAdhdTrained, telehealthFirstAppointment, billing and appointment-length facts.
     *  5. A portrait supplied by her or her practice with usage rights — or none, and the
     *     monogram renders (a supported state, not a gap).
     *  6. Her consent to be listed, recorded the way the co-founder's disclosure is.
     *  7. Geo: Double Bay added to src/geo/suburbs.ts coverage so distance and the coverage
     *     map stay honest.
     *  8. Roster-statistics tests re-pinned deliberately (rarity discounts, whole-roster-tie
     *     assertions like Hindi, clarifier heldBy counts all change when a third GP joins).
     */
    pendingSince: "2026-08-18",
  },
];
