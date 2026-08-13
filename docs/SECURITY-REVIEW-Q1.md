# Q1 security review (W13)

Scope: the full Year-1 Q1 tree as built (W1–W12) — booking tokens, console
sessions and server actions, mock introspection routes, RLS migrations, the
eligibility/attribution/spine/sim logic, and CI. Focus areas per plan §5 W13:
RLS, auth, tokens. Method: automated adversarial sweep + manual verification of
each finding. Synthetic-data phase — findings are graded for the phase and for
the production posture they must reach.

## Findings

| ID | Severity | Area | Status |
|----|----------|------|--------|
| H1 | High | Server-action authorization | **Fixed** @ this unit |
| M1 | Medium | Signing-secret management | **Fixed** @ this unit |
| M2 | Medium | Mock route exposure | **Fixed** @ this unit |

### H1 — Mutating console server actions had no session check (High) — FIXED

`onboard` and `saveRules` in `app/console/actions.ts` mutated practice state and
the eligibility-rules config with no session verification. In the Next.js App
Router every `"use server"` export is an independently-invocable POST endpoint,
so the `requireSession()` guard in the page *components* did not protect the
actions the forms post to. An unauthenticated caller could POST the action
directly (the action id is discoverable in served JS) and rewrite the eligibility
rules — the documented clinical-safety boundary — or overwrite the practice
profile.

**Fix:** `await requireSession()` is now the first statement of both `onboard`
and `saveRules`; the action fails closed (redirects to sign-in) without a valid
session. `confirmBooking` was already correctly authorized by HMAC token
possession; `signIn`/`signOut` legitimately need no prior session.

### M1 — Fail-open dev signing secret (Medium) — FIXED

`token.ts` and `session.ts` fell back to a committed literal
(`"careyield-synthetic-dev-secret"`) when `CAREYIELD_TOKEN_SECRET` was unset,
signing with a publicly known key rather than refusing to start. In any real
deployment missing the env var, an attacker could forge session cookies for any
email and booking tokens for any invitation id.

**Fix:** both modules now resolve the secret through `src/lib/secret.ts`, which
**throws in production** when the secret is unset or empty, and only returns the
dev fallback outside production. Regression-tested in `src/lib/secret.test.ts`.

### M2 — Ungated mock introspection routes (Medium) — FIXED

`/api/mock/state` and `/api/mock/console` are e2e-only: the former discloses a
valid signed booking token for every invitation, and both reset shared state.
Nothing prevented them from being served by a production build.

**Fix:** both route handlers call `assertMockRoutesEnabled()`
(`src/lib/mock-guard.ts`), which returns `notFound()` in a production build
unless `CAREYIELD_ENABLE_MOCK_ROUTES=1` is explicitly set. The Playwright config
opts in for its production-build run; a real deployment sets neither the flag,
so the routes 404.

## Verified clean

- **Token ↔ session scope confusion:** domain-separated HMAC keys (`SECRET` vs
  `session:SECRET`) — a booking token cannot validate as a session cookie or
  vice versa. Payload shapes also differ (session requires an `@`).
- **Timing attacks:** both verifiers use `crypto.timingSafeEqual` with a length
  pre-check; no `===` on secret material.
- **Booking-token capability model / IDOR:** ids are unforgeable without the
  secret; both the page and the action verify the HMAC before any lookup.
- **XSS / injection:** all rendering is React JSX; no `dangerouslySetInnerHTML`,
  `eval`, `new Function`, or `innerHTML` anywhere.
- **RLS default-deny:** `0001_core.sql` enables RLS on all seven tables with no
  `create policy` statements — default-deny (service-role only). `0002` only
  widens a CHECK constraint.
- **Eligibility engine:** hard consent/safety exclusions evaluated before
  preference filters; no input-derived bypass.
- **CI:** pinned actions, `--frozen-lockfile`, no secret echoing, no
  `pull_request_target`.

## Residual / deferred (founder gates, not code defects)

- Mock auth (any email signs in) is an intentional synthetic-phase deferral;
  Supabase auth replaces the provider behind the same session layer (gate: no
  production credentials).
- `Secure` cookie flag is a deployment concern, set when the app is served over
  HTTPS in a real environment.

**Result: zero criticals outstanding — all findings fixed this unit and
regression-guarded or e2e-covered.**
