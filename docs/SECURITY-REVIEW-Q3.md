# Security pass 2 — Q3 (W37)

Charter (plan §5): token lifecycle, webhook auth, rate limits, secrets handling —
across the Q3 surface (PMS adapters/ingestion, Twilio adapter, deep links, privacy
controls) plus the standing auth surfaces. Gate: **zero criticals** — met; the one
critical and both highs were fixed and regression-tested this unit
(`src/lib/security-w37.test.ts`).

Method note: the security-review skill's diff entry point had no diff to review
(the loop commits green work directly to main), so this pass was conducted as a
structured manual review against the charter, file by file, with fixes landed in
the same unit.

## Findings

| # | Severity | Area | Finding | Outcome |
|---|---|---|---|---|
| 1 | **Critical** | Demo surface | `/demo` and its launch action were unauthenticated in every environment: any visitor could obtain an owner session cookie and reset every mock store | **Fixed.** `src/lib/demo-guard.ts`: fails closed in production builds unless `CAREYIELD_ENABLE_DEMO=1` (same posture as the mock introspection routes). Applied to both the page and the action. |
| 2 | High | Token lifecycle | Console session cookies were HMAC-of-email with no issued-at — a captured value was a forever-credential | **Fixed.** Sessions embed issued-at; verification enforces a 7-day max age and refuses future-dated values beyond 60s skew. Legacy-format cookies fail closed (one-time re-sign-in). |
| 3 | High | Rate limits | No throttling anywhere; `signIn` and `confirmBooking` are unauthenticated POST endpoints | **Fixed.** Fixed-window in-memory limiter (`src/lib/rate-limit.ts`) wired: sign-in 20/min per identifier, booking-confirm 10/min per invitation. In-memory is honest single-process posture; **production deployments additionally need infra-level limits** (deployment checklist, W39 dossier). |
| 4 | Medium (accepted) | Token lifecycle | Booking deep-link tokens carry no TTL of their own | Accepted: lifecycle is governed server-side by invitation state — expired offers refuse, deleted patients' links die (W33 e2e proves it). A token without a live invitation is inert. Revisit if tokens ever become bearer credentials for anything beyond the one booking view. |
| 5 | Verified clean | Webhook auth | Twilio STOP webhook validates `X-Twilio-Signature` (HMAC-SHA1, timing-safe) **before** any state change; unknown senders/bodies refused without throwing; delivery receipts ignore unknown sids | No change (W31 design confirmed). |
| 6 | Verified clean | Secrets | `signingSecret()` fails closed in production; domain separation between session and booking HMAC keys; Twilio credentials injected, never defaulted; G1/G3 guards refuse live vendor hosts in code; no secrets in the tree | No change (W13/W28/W31 designs confirmed). |
| 7 | Verified clean | Privacy surface | Export is practice-scoped and filtered per patient; deletion records carry only a SHA-256 reference (regression-tested to never contain the raw id); privacy actions behind the stewardship grant | No change (W33 design confirmed). |
| 8 | Verified clean | Mock routes | Token-disclosing introspection routes 404 in production unless explicitly opted in | No change (W13 design confirmed). |

## Standing items for the W39 gate dossier

- Infra-level rate limiting + WAF in front of any real deployment (finding 3 residual).
- Real auth provider (Supabase) replaces mock sign-in before any non-synthetic data.
- `CAREYIELD_ENABLE_DEMO` and `CAREYIELD_ENABLE_MOCK_ROUTES` must be UNSET in production.
