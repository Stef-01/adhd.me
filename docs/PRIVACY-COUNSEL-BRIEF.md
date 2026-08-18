# Privacy counsel briefing pack (O37)

**Purpose.** The privacy policy (`/privacy`, source `app/privacy/page.tsx`) is marked
*Draft — not yet in force* and the tree's own law (W33) requires counsel review before any
pilot. This pack is everything a solicitor needs to review it quickly: what the product
actually does, the register tying every policy claim to the code that makes it true, an
internal self-assessment against the Australian Privacy Principles, and the specific
questions we need answered. Internal self-assessment is not legal advice, and nothing here
substitutes for the review it exists to enable.

## 1. What the product is, in one paragraph for counsel

A public web directory ("the finder") where a person types or speaks, in their own words,
what they want from a GP for ADHD care; matching runs entirely client-side in their browser
and the text is never transmitted to or stored by the operator. Three named, consenting GPs
are listed with self-declared information. The only personal information collected server-side
today: (a) name, email and interest options on a community interest form, with express
consent; (b) contact-preference choices set via tokened booking invitation links (synthetic
phase only). Bookings hand off to Healthengine (third party). Hosting is Vercel (US).
Cookieless page analytics (Vercel, 24-hour hash). Google Analytics exists behind an
environment switch and is OFF. A future practice-integration product (appointment
invitations from practice PMS data) is described in the policy in future tense and marked
not in force.

## 2. Claim-to-code register

Every material claim in the policy, and where its truth is enforced:

| Policy claim | Made true by |
|---|---|
| Finder text never reaches our servers | `app/care-finder.tsx` is a client component; matching functions imported from `src/matching`/`src/demo` run in-browser; no network call carries the query |
| Speech audio never received by us | Web Speech API only (`src/voice/speech.ts`); disclosure rendered beside the mic |
| No geolocation | `src/geo/suburbs.ts` resolves typed text only; no `navigator.geolocation` anywhere |
| Interest list: name, email, options, consent | `app/interest-actions.ts` validates consent before `saveInterestSignup` |
| Contact preferences honoured incl. hours | `src/messaging/preferences.ts` (W74): deferred or dropped outside stated hours |
| Deletion leaves hashed proof + suppression | W33 machinery in `src/` retention/erasure flows |
| No advertising cookies; one localStorage ack | `app/privacy-consent.tsx` (`adhdme-privacy-ack`, device-only) |
| Cookieless page counting, 24h hash | `@vercel/analytics` mounted in `app/layout.tsx` |
| Booking-link use counted, not who used it | `app/go/[clinician]/route.ts` logs `{event, clinician, surface}` only; `no-store` |
| GA off unless switched on, and the notice appears with it | `app/analytics.tsx` + conditional section in the policy, same env switch |
| Ordering uses only the current request | `src/demo/clinicians.ts` rankers; pinned by `src/matching/*.test.ts` |
| No real patient data in the demo | Founder gates (CLAUDE.md law 4); mock routes 404 in production (W44) |

## 3. Internal self-assessment against the APPs (pre-counsel, not advice)

- **APP 1 (open management)** — policy exists, plain-English, covers kinds of information,
  purposes, access/correction, complaints incl. OAIC, overseas storage (US named).
  *Gap for counsel:* the policy names no legal entity or ABN — "ADHD.ME" is a product name.
  Which entity is the APP entity, and does the small-business exemption even apply pre-revenue
  (noting the health-services carve-out in s 6D(4)(b) likely removes the exemption the moment
  a practice pilot begins)?
- **APP 2 (anonymity)** — strong: the finder is fully usable anonymously and the policy now
  says so.
- **APP 3 (collection)** — minimal collection, consent captured on the interest form.
  *Question:* does the interest form's checkbox wording meet express-consent standards for any
  future contact beyond the stated purposes? (We use it narrowly today.)
- **APP 5 (notification)** — the policy plus the consent pop-out serve as the collection
  notice; the interest form states purpose inline. *Question:* is a separate APP 5 notice
  needed at the interest form itself? (Flagged open in `docs/COMPLIANCE-DOSSIER.md` for the
  interest register since W105.)
- **APP 6 (use/disclosure)** — single stated purpose per collection; no secondary use.
- **APP 8 (cross-border)** — Vercel US named. Browser speech: audio is processed by the
  browser vendor (Apple/Google), potentially overseas — now stated in the policy.
  *Question:* does APP 8 attach to us at all for speech, given the browser (the user's own
  agent) sends the audio and we never hold it?
- **APP 11 (security/retention)** — transport encryption, founder-only access, no production
  credentials in the repo (enforced by build gates); retention stated per collection.
  *Question:* is "while the program is being developed" specific enough for interest-list
  retention, or should a hard ceiling (e.g. 24 months) be stated?
- **APP 12/13 (access/correction)** — direct email route without needing to be a patient;
  practice route reserved for future practice data; two-business-day response stated.
- **NDB scheme** — assessment + notification commitment now stated. *Question:* wording
  sufficient, or should the policy state the 30-day assessment discipline explicitly?
- **Sensitive information (s 6)** — the finder's typed text is health-adjacent but never
  collected (never transmitted or stored), so our position is that no sensitive information
  is collected via the finder. *This is the single most important conclusion for counsel to
  confirm or correct.* The interest form deliberately asks for no health information.
- **Children** — the finder may be used by a parent about a child (nothing leaves the
  browser); the interest form is stated as for adults. *Question:* is an age gate needed on
  the interest form, or is the statement sufficient at this scale?

## 4. Questions for counsel, consolidated

1. Confirm the s 6 position: no collection of sensitive information via the client-side
   finder. If wrong anywhere (e.g. transient processing arguments), what changes?
2. Name the APP entity: entity/ABN to appear in the policy; small-business exemption
   analysis now and at first practice pilot (s 6D health service provider carve-out).
3. APP 5 adequacy of the consent pop-out + inline form purpose; whether the interest form
   needs its own collection notice.
4. APP 8 analysis for browser-vendor speech processing and for the Healthengine handoff
   (including our UTM parameters on the outbound URL).
5. Retention ceilings: is a fixed maximum needed for the interest list?
6. NDB wording sufficiency.
7. Children/parental use: statement vs age gate on the interest form.
8. Anything in the automated-decisions statement (`/privacy/automated-decisions`) that
   should move into the policy proper.
9. What must change for the *Draft — not yet in force* banner to come down, and whether it
   should come down before the first practice pilot or only at it.

## 5. Process to completion

1. Founder sends the prepared outreach email (drafted in Gmail) to a health-tech privacy
   solicitor — candidates: firms with digital-health practices or the OAIC-listed privacy
   professional networks; the brief and the live policy URL are all they need.
2. Counsel returns marked-up policy + answers to §4.
3. Changes land through the normal gate (`pnpm verify` + sweep e2e); the banner comes down
   only on counsel's word; the policy's "Contact and changes" section records the date.
4. The dossier row for the interest register's APP 5 question closes in the same change.

*Prepared 2026-08-18. Internal work product; not legal advice.*
