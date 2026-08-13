# Q3 gate dossier (W39) — G1–G3 readiness

> **FOUNDER ACTION REQUIRED.** This dossier is the W39 deliverable: for each founder
> gate the loop has built up to, it states what the gate protects, exactly what has
> been built behind it, the credentials required, and the precise activation steps.
> Nothing below has been activated — every gate remains **CLOSED**, each is enforced
> in code, and only the founder opens one. Gate definitions are quoted from
> docs/FIVE-YEAR-PLAN.md §4 and are inherited by all future planning ("never
> expanded away", plan §6).

## Gate status board

| Gate | Definition (plan §4) | Status | Code-level enforcement |
|---|---|---|---|
| G0 | dedicated repo | **CLEARED** 2026-08-08 | — |
| G1 | real PMS/booking API credentials (Halo/Best Practice, HotDoc partner access) | CLOSED — built to the gate | `VendorPmsAdapter` constructor refuses live vendor hosts; no live HTTP client exists anywhere in `src/pms`; vendor deep links ship disabled per practice |
| G2 | real patient data of any kind (privacy impact assessment first; APP 7 posture) | CLOSED — built to the gate | All stores in-memory/synthetic; RLS default-deny schema ready but no live database is wired |
| G3 | live SMS to real patients (Spam Act consent verified; templates founder-approved) | CLOSED — built to the gate | `TwilioSmsAdapter` constructor refuses any `twilio.com` endpoint; only the mock adapter is wired |
| G4 | pilot go-live (agreement + holdout consent design signed off) | CLOSED — W40 playbook pre-registers criteria | Downstream of G1–G3 |
| G5–G7 | clinical content / directory launch / TGA-CDSS boundary | Out of Y1 scope | G7 posture: matching is keyed to clinician attributes, never symptom-based triage |

---

## G1 — PMS and booking-vendor access

**What is built (behind the gate).**
- A vendor-neutral read contract: `PmsReadAdapter` (`src/pms/adapter.ts`) with a reusable
  8-invariant conformance suite `describePmsContract` (`src/pms/contract.ts`). Passing that
  suite *is* the definition of a working adapter.
- Best Practice and Halo adapters (`src/pms/vendors.ts`) map each vendor's raw shapes
  (PascalCase BP, snake_case Halo) onto the contract, and both pass it — on hand-authored
  recorded fixtures (`src/pms/fixtures.ts`). Shapes follow published API docs; they have
  **not** been reconciled against live responses.
- The transport is an injected `PmsApiClient`; the only implementation in the tree is
  `RecordedFixtureClient`. **No live HTTP client exists anywhere in `src/pms`.**
- Failure isolation and stale-data guards (`src/pms/resilience.ts`, fails CLOSED past the
  freshness budget), schema-drift detection (`src/pms/drift.ts`), and a unified error
  taxonomy with operator actions (`src/integration/errors.ts`).
- Booking deep links (`src/booking/deeplink.ts`): HotDoc/HealthEngine URL builders behind a
  per-practice `enabled` flag (default off — the type has no persistence yet; callers pass
  settings explicitly), an https-only + no-patient-identifier guard on every produced URL
  (`assertSafeLink`), and an internal tokenised fallback with the fallback reason recorded.

**The lock, verbatim behavior.** `VendorPmsAdapter`'s constructor throws
`founder gate G1: live PMS endpoints are not permitted in this phase (<hostname>)` when
the configured `baseUrl` hostname matches any of `bpsoftware.net`, `bestpractice`,
`halohealth`, `haloconnect` (`LIVE_HOST_PATTERNS`, `src/pms/vendors.ts`).
Regression-tested. The guard constrains *intent*: within `src/pms` there is no network
code to reach anything today. (The Twilio adapter elsewhere in the tree IS a real HTTP
client — its own G3 guard covers it.)

**Credentials the founder must obtain to open G1.**
1. Best Practice (Titanium/Halo Connect) partner API credentials — practice-scoped API key
   + partner agreement.
2. HotDoc partner/directory access for deep-link slugs (practice + practitioner slugs).
3. HealthEngine practice listing identifiers (practice slug, practitioner ids).

**Exact activation steps (in order, after credentials exist).**
1. Implement a live `PmsApiClient` (HTTP) alongside `RecordedFixtureClient`; credentials
   injected via new env vars (proposed: `CAREYIELD_BP_API_KEY`, `CAREYIELD_HALO_API_KEY`) —
   never committed, never defaulted.
2. Reconcile `BpRawResponses`/`HaloRawResponses` field mappings against real sandbox
   responses; update fixtures to genuine recordings; `describePmsContract` and the W38
   drift suite must stay green.
3. Narrow, then remove, the matching `LIVE_HOST_PATTERNS` entry — **this edit is the act
   of opening G1** and must ride with the founder's sign-off in the commit message.
4. Wire `ResilientPmsReader` in front of the live client (already built, W36).
5. For deep links, THREE things, not one: (a) wire `buildBookingLink` into the
   invitation send path — today the module has **no runtime caller** (message bodies
   use the internal token URL built inline in the harness), so flipping flags alone
   would change nothing; (b) add persistence for `PracticeLinkSettings` (the type
   currently lives only in code); (c) then set `enabled: true` per practice after
   verifying each produced URL resolves on the real vendor listing. The
   `assertSafeLink` guard covers every URL the module produces — note its scope:
   it refuses non-https URLs and forbidden query-parameter **keys**; identifiers
   smuggled into path segments or parameter values are not caught, so slug values
   must be verified non-identifying when settings are populated.

## G2 — real patient data

**Definition requires a privacy impact assessment BEFORE any real data.** The PIA is a
founder-commissioned document; nothing in the codebase substitutes for it.

**What is built (behind the gate).**
- Identity & consent ingestion (`src/pms/ingest.ts`): stable source-scoped platform ids,
  append-only consent provenance (adapter + ingest time on every record), same-capture
  conflicts flagged never silently resolved, and the STOP one-way door — a Meherr
  opt-out survives any PMS refresh, and the STOP is itself a provenance record.
- Privacy controls (`src/privacy/`): APP 12 export, deletion with hashed deletion records
  (SHA-256 reference; raw id provably absent) plus suppression entries exempt from
  retention, age-based retention with active offers never pruned.
- Public statements: `/privacy` (policy **draft** — needs counsel before force) and
  `/privacy/automated-decisions` (ADM transparency for the Dec-2026 Privacy Act
  requirement).
- Schema ready for real persistence: migrations 0001–0003 with RLS default-deny on every
  domain table and membership-scoped policies keyed on the JWT email claim.

**What must change before G2 opens (prerequisites, in order).**
1. Founder commissions the PIA (gate text) and counsel finalises the privacy policy.
2. Live Postgres/Supabase project wired: migrations 0001–0003 applied (they are
   paper-only today — no client library is even installed), generated types compiled,
   RLS smoke tests green (the W2 ledger note already defers "live apply" here).
3. Real auth provider replaces mock sign-in (`CAREYIELD_AUTH_PROVIDER` is the documented
   seam in `src/console/session.ts`; today it is a comment, not a code path — the swap is
   real work, not a flag flip).
4. The in-memory stores (rail, console, ops, audit, privacy, rate-limit) move to the
   database. Until then real data has nowhere compliant to live — **this is deliberate.**
5. **Suppression becomes enforcement, not display**: `isSuppressed` currently backs only
   the export badge. Before any re-ingest of real data, the ingestion path
   (`ingestFromAdapter`) and the eligibility/invite path must consult the suppression
   list so a deleted patient can never be re-invited. (No re-ingest wiring exists today,
   so nothing violates this yet — the wiring unit must land the enforcement with it.)
6. **Retention gets a scheduler**: `runRetention` is a library capability with no
   caller — the persistence unit adds the cron/route that actually runs it.
7. Consent provenance and identity records (`IngestState`) get SQL persistence — today
   they exist only in tests (W32 ledger note).
8. Deletion/export flows re-verified end-to-end against the live store (W33 e2e re-run).

## G3 — live SMS

**What is built (behind the gate).**
- `TwilioSmsAdapter` (`src/messaging/twilio.ts`): full send path with retry policy
  (5xx/429/network retried with configured backoff; 4xx permanent; honest give-up),
  delivery receipts updating typed message records, and a STOP webhook that validates
  `X-Twilio-Signature` (HMAC-SHA1, timing-safe) **before** any state change, with
  keyword semantics per Twilio advanced opt-out, applied through the single `handleStop`
  path (terminal).
- Every outbound message renders through `renderCompliant` — the Ahpra/Spam Act
  compliance linter throws rather than sends (no clinical claims, no urgency, no
  "overdue"; practice identification + STOP + booking link required).
- Verified against an in-process fake of the Twilio API (auth, form encoding, retries,
  receipts, signatures).

**The lock, verbatim behavior.** The constructor throws
`founder gate G3: live Twilio endpoints are not permitted in this phase` for any
`baseUrl` whose hostname matches `/(^|\.)twilio\.com/i`. Only `MockSmsAdapter` is wired
into the sim and app surfaces.

**Credentials the founder must obtain to open G3.**
1. Twilio account: Account SID + Auth Token (proposed env names:
   `CAREYIELD_TWILIO_ACCOUNT_SID`, `CAREYIELD_TWILIO_AUTH_TOKEN` — injected only;
   `TwilioConfig` has no defaults by design).
2. An Australian sender (mobile number or alphanumeric ID per Spam Act identification
   rules) for `fromNumber`.
3. Founder-approved message templates (gate text) — the linted templates in
   `src/messaging/templates.ts` are the candidates; approval is recorded, not assumed.
4. Verified Spam Act consent flow (gate text): consent provenance from W32 ingest is the
   supporting evidence trail.

**Exact activation steps (in order).**
1. Stage 1 — Twilio *test credentials* against the real sandbox API: requires relaxing
   the guard for `api.twilio.com` under test credentials only. Do this by replacing the
   hostname check with an explicit `allowLiveEndpoint` constructor capability that the
   founder's sign-off commit introduces — **that edit is the act of opening G3** (the
   guard's regression test updates in the same commit).
2. Build the two HTTP routes that do not exist yet: an inbound-SMS webhook route feeding
   the exact registered URL + raw form + `X-Twilio-Signature` header into
   `applyInboundStop`, and a status-callback route feeding `applyReceipt`. Both library
   functions are built and tested; the routes are the missing wiring. Note: message
   records (`TwilioSmsAdapter.messages`) are a per-instance in-memory Map — a working
   status-callback route also needs a persistent message-record store (add it to the
   G2 store-migration list; it is not among the six enumerated there).
3. Configure the Twilio console: point the number's inbound webhook and StatusCallback
   at those routes (signature validation binds to the exact registered URL string).
4. Send-to-self pilot list (founder's own numbers) before any patient number. Note the
   coupling: `OutboundSms.to` carries synthetic identifiers by contract today — real
   E.164 numbers may only enter alongside **G2**, never before.
5. Wire `TwilioSmsAdapter` in place of `MockSmsAdapter` (the sim harness holds the only
   runtime instantiation today) behind the per-practice + global kill switches (W19),
   keeping every body rendered through `renderCompliant` so the lint gate runs at send
   time.

## Production deployment checklist (whenever any gate opens)

**Precondition for every row below: the deployment must run as a production build
(`NODE_ENV=production`).** All three fail-closed guards branch on `NODE_ENV` — in any
non-production build the mock routes and demo surface are enabled unconditionally and
signing silently uses the committed dev fallback secret. A publicly reachable
non-production deployment defeats every guarantee in this table.

| Item | Setting | Source |
|---|---|---|
| `CAREYIELD_TOKEN_SECRET` | **MUST be set** — signing fails closed in production without it | `src/lib/secret.ts` |
| `CAREYIELD_ENABLE_MOCK_ROUTES` | **MUST be unset** — token-disclosing introspection routes 404 | `src/lib/mock-guard.ts` |
| `CAREYIELD_ENABLE_DEMO` | **MUST be unset** — demo mints owner sessions + resets stores | `src/lib/demo-guard.ts` |
| Infra rate limiting / WAF | Required in front of the app; in-process limiter is single-node only | docs/SECURITY-REVIEW-Q3.md §3 |
| Session lifecycle | 7-day expiry enforced in code; no action needed | `src/console/session.ts` |
| Real auth provider | Required before G2 (mock sign-in accepts any email) | docs/SECURITY-REVIEW-Q3.md standing items |
| Session cookie `secure` flag | Set when deploying behind HTTPS (deferred by design in the synthetic phase) | docs/SECURITY-REVIEW-Q1.md |

## Fixed during this dossier's survey

- The `/console/privacy?export=` render path disclosed export data on any signed-in
  session; it now takes the same stewardship grant as the export action itself
  (found by the W39 code survey, fixed in the same commit).

## Standing founder flags carried forward

- W26 finding #10: whether "worthwhile + no action needed" should be recordable in the
  usefulness audit (currently refused by W15's tested semantics).
- W44 finding: sim calibration shows generated-booking DNA worse than organic at
  defaults — calibration review requested; the real answer comes from the pilot holdout.
- Privacy policy is a DRAFT pending counsel (W33).
