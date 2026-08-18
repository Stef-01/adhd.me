# Booking attribution: what can be known after the Healthengine handoff (O28)

**The question (founder, 2026-08-18):** figure out tracking of people who book on the
Healthengine platform onwards — unique-link abilities and the rest.

**The honest ceiling first.** A completed booking happens inside Healthengine and the
practice's PMS. Healthengine's integration surface
([HealthengineAU/pms-api](https://github.com/HealthengineAU/pms-api)) is **inbound-only** — a
practice management system pushes availability *to* Healthengine; there is no third-party
endpoint that reports bookings or conversions back out, their robots.txt disallows the
booking paths, and this tree has already ruled out scraping (see the `booking` field's header
in `src/demo/clinicians.ts`). So end-to-end per-patient tracking is not buildable from
outside, and — given the privacy posture this product advertises — not wanted. What IS
buildable is a clean funnel with one honest joint in the middle.

## The funnel, layer by layer

### 1. Outbound intent — OWNED, built now
Every booking link routes through **`/go/<clinician-id>`** (`app/go/[clinician]/route.ts`), a
302 to the clinician's Healthengine profile. This is the unique-link ability we fully
control: outbound booking intent is countable **per clinician** from this domain's own
request logs and Vercel's analytics, with nothing stored by our code — no cookie, no
identifier, no query echo. Crawlers are excluded (`robots.ts` disallows `/go/`), so the
count stays clean. When `NEXT_PUBLIC_GA_ID` goes live, the same navigation appears in GA as
an outbound event without any extra code.

### 2. The UTM tail — OFFERED, costless
`/go` appends `utm_source=adhd-me&utm_medium=referral&utm_campaign=finder` to the
Healthengine URL. If Healthengine's own page analytics honour standard UTMs, the practice's
reporting can see adhd.me as a source; if they strip them, nothing is lost. The referrer
header tells Healthengine the same story either way.

### 3. The patient's own answer — FREE, highest fidelity, needs no code
Healthengine's booking flow asks new patients how they heard about the practice, and the
practice sees the answer. Two levers:
- The handoff screen can say, in one quiet line, "If Healthengine asks how you heard, ADHD.ME
  is how" — a copy change, compliant (no claim, no incentive), queued for the UI track.
- The practice's front desk (and PMS new-patient field) records referral source; for the
  co-founder's practice this is a standing instruction, not an integration.

### 4. Practice-side ground truth — RELATIONSHIP, the real loop
The practice can reconcile: bookings whose "heard about" answer says ADHD.ME, per week,
against our `/go` counts per clinician. That ratio (bookings ÷ outbound clicks) is the
conversion number the pitch needs, produced without this product touching a single patient
record. Where the practice uses Best Practice PMS, the referral-source field makes this a
report, not a chore.

### 5. Partnership — LATER
Healthengine runs accredited partner programs (PMS marketplace integrations). A directory
that demonstrably sends them warm, matched bookings is a partnership conversation, and
`/go` counts are the evidence to bring to it. Until then, nothing in this tree calls any
Healthengine API.

## What is deliberately not done
- No click identifiers, no cross-site cookies, no per-patient linkage — the privacy policy
  and the targeting audit (behavioural/remarketing refusals) both forbid it, and the
  automated-decisions page promises ordering uses nothing but the current request.
- No scraping of Healthengine booking or availability surfaces.
- No fabricated conversion numbers anywhere: until layer 4 reports, the only claimed metric
  is outbound clicks, named as such.
