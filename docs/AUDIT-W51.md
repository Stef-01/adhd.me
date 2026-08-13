# W51 — Year-1 full-system audit (2026-08-09)

Independent review of everything W1–W50 built, run by the interactive session after
reclaiming the unit from builder-A (that session died on a model rate limit mid-claim;
see BUILD-STATE). Scope: the whole tree, not a diff. Method: full verify gate, then a
sweep for the defect classes that matter for a system that will one day message real
patients — unenforced founder gates, unlinted send paths, non-terminal opt-outs,
credential leakage, non-determinism, dependency exposure.

## Verdict

**Year 1 is sound.** Gate green at HEAD: 52 test files, 397 tests, typecheck and build
clean, ~14.6k LOC across 25 modules. Two findings, both fixed in this unit; nothing
outstanding blocks the founder gates.

## Findings

### A1 — MEDIUM now, HIGH at G3: fire-and-forget send could log unsent messages as sent — FIXED

`src/sim/harness.ts` discarded the send promise (`void sms.send(...)`) and then
unconditionally appended `invitation_sent` to the immutable event spine, marked the
invitation sent, and incremented `invitationsSent`. Harmless today (the mock adapter
cannot fail), but the moment a real provider is wired at G3, a message that failed every
Twilio retry would still be recorded — to the practice, to the conversion denominator,
and to the audit trail. That trail is precisely what `docs/SUPPORT-RUNBOOK.md` relies on
to resolve "I never got it" / "I said STOP" complaints with evidence; a log that can
assert unsent messages were sent degrades the primary evidence mechanism.

**Fix (fail-closed, no async ripple through 51 suites):** `SmsAdapter` gained an opt-in
`fireAndForgetSafe` marker that only an infallible adapter may set; `MockSmsAdapter` sets
it, real adapters never do. `assertFireAndForgetSafe()` runs at sim entry, so wiring a
real provider into the synchronous harness throws instead of silently losing failures.
**G3 follow-up (recorded in the gate dossier's activation path): the send path must become
async and outcome-aware — record delivery result, mark sent only on success — before live
SMS.** Regression-tested against the mock, a fallible stub, and the real Twilio adapter.

### A2 — HIGH ×5 / MODERATE ×2 dependency exposure, all transitive — 5 FIXED, 2 accepted

`pnpm audit` had never been run (prior security passes were code-level only): 7
advisories, none in first-party code.

- **Fixed** via `pnpm.overrides`: `postcss` ×4 (arbitrary file read, path traversal, two
  XSS) → `>=8.5.23`; `sharp` ×1 (inherited libvips) → `>=0.35.0`. Both arrived through
  `next`. Full gate re-run green after the override.
- **Accepted risk** ×2: `image-size` ICNS and JXL/HEIF parser DoS, via `pptxgenjs`.
  **No patched version exists** (advisory patched-range is empty). Exposure is nil in our
  usage: `pptxgenjs` runs at build time to generate our own sales deck from our own
  assets, never parses untrusted input, and is absent from the deployed app. Revisit when
  upstream ships a fix; do not ship `pptxgenjs` into any request-serving path.

## Confirmed-clean controls (the ones that would matter most if wrong)

| Control | Evidence |
|---|---|
| G3 live-SMS gate | `TwilioSmsAdapter` constructor refuses `*.twilio.com`; **and** it is instantiated nowhere outside tests — the only live HTTP client in the tree is unreachable from any product path |
| G1 live-PMS gate | `VendorPmsAdapter` refuses live vendor hosts; no HTTP client exists in `src/pms` at all |
| G2 real-patient-data gate | every store in-memory/synthetic; no live database wired |
| Compliance linter | **every** `.send()` call site is immediately preceded by `renderCompliant()` — no code path can emit an unlinted message |
| Opt-out terminality | `optedOut` is only ever written `true` (engine + PMS ingest); no path clears it |
| Determinism | no `Math.random` anywhere; every clock is injected with a default, so tests pin time |
| Secrets hygiene | zero hardcoded credentials/tokens in `src`/`app` |
| Code debt | zero TODO/FIXME/HACK markers in 14.6k lines |

## Process observations (for the plan owner, not defects)

1. **Add `pnpm audit` to the verify gate.** Fifty units passed a gate that could not see
   A2. Proposed as a Y2 hardening unit rather than a silent change here.
2. **The single-model builder fleet is a single point of failure.** Builder-A exhausted a
   model limit mid-claim; its dead claim then idled *both* routines for >2h, because the
   6-hour stale-claim rule is slower than a session death. Two cheap mitigations for Y2:
   shorten the stale window for claims whose holder is unreachable, and/or run the
   builders on different models.
3. **The fallback protocol worked.** Idle firings re-verified the last gate and found two
   suite-wide defects instead of doing nothing — that behaviour is worth keeping.
