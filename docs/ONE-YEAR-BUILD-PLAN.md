# ADHD.ME — the one-year build plan (whole-platform appraisal → the U lane)

> **Commissioned by the founder, 2026-09-01/02, in two sentences that this document answers in
> full.** First: *"conduct critical appraisal using all relevant skills to understand exactly what
> is needed to upgrade the whole platform into a perfectly functional app and add that to a
> consolidated 1 year build plan."* Then, before the plan was written: *"add to plan a complex
> multistage refactor for next few months to ensure app is as maintainable and simple as possible,
> make this a thorough overhaul with much better optimised and minimal code."*
>
> Both are one plan. §2 is the appraisal — every finding carries the file and line it was read
> from, because a finding without a location is an opinion. §4 is the plan: sixty-eight units in
> four quarters (**U1–U68**), of which a six-stage refactor (**R0–R5**, U14–U34) runs through the
> first six months and is measured by a ratchet that can only go down (§2.5). Nine units are
> blocked from day one on decisions only the founder can make (§5, §6). Everything is claimable
> the same way every other lane in this tree has been: a row in `BUILD-STATE.md`, a claim-push,
> a green `pnpm verify`, a done row with a SHA.
>
> This plan is laid on 2026-09-02 against `ec0a9dc` (O226 done, main and the work branch level).
> `src/quality/one-year-plan.test.ts` holds it to the ledger in both directions on every verify.

## 0. How to read this plan

**"A perfectly functional app", defined so it can be finished.** The founder's phrase is the
target, and a target that cannot be measured cannot be reached. For this plan it means, in
order of precedence: (1) nothing a patient or a practice enters is lost, leaked or silently
transformed — *durability and security*; (2) every screen that exists works for every person who
reaches it, on the devices they actually hold, installed or in a browser, with a network or
without one — *reachability*; (3) every sentence the product speaks stays inside the honesty and
compliance laws that already govern this tree — *honesty*; (4) every property above is proven by
a check that can fail, not by a paragraph — *verifiability*; and (5) the code that does all this
is small enough that one person can hold a layer of it in their head — *simplicity*, the
founder's second sentence. §2.9 scores each layer of the platform on the first four; §2.5 measures
the fifth. §10 is the year's definition of done in the same five words.

**Lane, ids and where they live.** This is the **U lane**. Units are `U1`–`U68`, laid in
`BUILD-STATE.md` under `## Ledger — U-series` with the same six columns and the same claim
protocol the W and AR lanes used. A unit's row in the ledger is the lock; its bullet here is the
scope. `[P]` on a unit means it has no dependency inside the lane and can be claimed the day its
quarter opens; a session with a choice takes a `[P]` unit before any other. `(S|M|L)` is the
size in the tree's usual sense (a session, two, three-plus). `Depends: U#` names the units that
must be `done` first — every dependency points at a lower number, and no available unit depends
on a blocked one, so the lane never deadlocks on a decision. Every unit ends in `→ verify:`, the
gate it must pass beyond `pnpm verify` itself.

**Precedence is unchanged.** `CLAUDE.md` §5 (which skills govern which work) and §6 (compliance
is code) beat every sentence in this plan. A unit here that would need a clinical claim, a
testimonial, a rating, "specialist" beside a niche scope, real patient data, live SMS,
production credentials, symptom-based triage or a public directory copy is a defect in the plan,
not a licence; mark it `blocked` and say so loudly.

**Who executes it.** The hourly `adhd-me-year-plan-loop` fires against `Stef-01/ADHD`, not this
repository (`CLAUDE.md`, top). U rows are therefore claimed by founder-pointed interactive
sessions on this repository, or by a loop the founder binds here; either follows the protocol in
`BUILD-STATE.md` unchanged. O-numbers continue as *session* ids in the ledger's Home blockquotes,
each naming the U rows it closed — the way O216–O226 named their work — so the two numberings
never compete: O is who and when, U is what.

**The W lane is not reopened.** `docs/FIVE-YEAR-PLAN.md` is CLOSED and its §6 expansion rule
stands exactly as W260 left it (a quarter is appended only when fewer than thirteen W rows are
blocked; eighteen are). The U lane is founder-commissioned and separate; where a U unit touches
ground a blocked W row waits on (live SMS, PMS credentials, the public directory, pathways,
learned ranking) it stops at the same gate and cites the W row rather than duplicating it.

## 1. The premise, measured (2026-09-02)

Every number below was read from the tree on the day the plan was laid, by the same kind of
census the AR lane taught this tree to trust (`docs/AUDIT-AR.md`); U14 turns the census into
`scripts/size-census.mts` so the numbers can be re-derived rather than believed, and U67 re-derives
them at the year's end.

**Product surface.** 47 routes (15 public incl. `/finder`, `/examples`, `/demo`; 31 console
pages; `/_not-found`); 15 API routes, 14 of them `app/api/mock/*` fixtures gated by
`src/lib/mock-guard.ts`; one roster module (`src/demo/roster.ts`, 59 KB literal) holding 2 real
clinicians and `src/demo/synthetic-roster.ts` holding exactly 20 example profiles that ship ON
behind the finder's testing disclosure (founder decision `synthetic-roster-tickbox`, AMENDED).

**Code.** Non-test source: `app/` 14,407 lines over 119 files; `src/` 51,760 lines over 280
non-test modules (578 files including tests); `e2e/support` 1,478; `scripts/` 230 — ≈67,875 lines
of product and law. Tests: 50,358 lines in 298 vitest files (4,392 tests, 13 skipped) plus 7,536
lines in 63 Playwright specs and 23 support files (316 tests: 315 pass, 1 skipped `/about`, 16.7
minutes at `workers: 1`, Chromium only, retries 0). `app/globals.css` is 6,087 lines and 1,178 rule
blocks with 373 unique class selectors under 195 section comments, coexisting with 1,654 Tailwind
`className` attributes across 72 files. Thirty-one console pages, 13 `actions.ts` files, 21
in-memory or file-backed stores, 252 `page.goto` calls in specs, 69 documents under `docs/`, 9
dependencies and 14 dev-dependencies.

**Reachability of the code from the product.** Walking the import closure from `app/` reaches
153 of the 280 `src/` modules (29,231 lines). 127 modules (22,809 lines) are not reached by any
route; of those, 96 (17,168 lines) are held only by tests, scripts or e2e support, 87 (16,173
lines) are imported by nothing but their own test, and one (`src/collateral/one-pager.ts`) by
nothing at all. Whole directories have no route-reached file: `analysis` (64 lines),
`collateral` (580), `design` (2,704), `directory` (1,899), `integration` (165), `loop` (132),
`mbs` (75), `pilot` (291), `platform` (502), `quality` (1,956). Two of those — `design` and
`quality`, with parts of `compliance` and `security` — are *law machinery* that `pnpm verify`
runs and the product never imports; that is by design and stays. The rest is gated W-series
product code that is dormant in this deployment (pathways, PMS interop, pilots, the directory,
MBS, collateral), and §2.5 is about what to do with it. Partially reached: `matching` (1,661
unreached lines), `pathways` (1,251), `compliance` (1,067), `pms` (935), `tenancy` (884),
`outcomes` (874), `capacity` (824), `referrals` (795), `capability` (744), `registers` (725),
`credentials` (695), `verticals` (631), `security` (584), `messaging` (494), `privacy` (386).

**Largest files.** `src/compliance/corpus.ts` 1,159 lines; `src/demo/clinicians.ts` 1,082;
`src/matching/needs.ts` 918; `src/console/read.ts` 904; `src/compliance/cdss-boundary.ts` 882;
`src/design/taste-register.ts` 644; `src/demo/synthetic-roster.ts` 617; `app/story-sequence.tsx`
607; `src/sim/harness.ts` 602; `app/care-finder.tsx` 544; `src/voice/speech.ts` 533;
`src/tenancy/store-reads.ts` 515; `src/console/store.ts` 477.

**Enforcement already standing** (from `docs/AUDIT-AR.md`, re-derived by
`src/quality/ar-audit.test.ts` on every verify): 22 taste rules, 9 enforced and 13 pinned
unenforced; 5 mutation-probe families and 6 enforced rules pinned without a probe; 8 accepted
visual diffs over 180 captures whose manifest sha256 must equal the newest entry; 48 route
budgets; 47 working-truth proofs; 32 classified zero-states; 87 store functions tenancy-classified
across 12 modules; zero touch-floor and zero a11y exemptions. Two console-honesty acceptances fall
due 2027-02-25; two `image-size` advisory acceptances fall due 2026-11-09.

**Operations.** CI has been dead since run 482 (2026-08-21): runs 482–485 fail in four to five
seconds with `total_ms: 0` before any step, which is the signature of account-level Actions
billing, not of `.github/workflows/ci.yml` (whose pnpm/action-setup and version pins are correct).
Every push to `main` is a production deploy under `vercel.json`'s `ignoreCommand`; there is no
staging, no rollback runbook, no error reporting, no health endpoint, no security headers, and the
session cookie is not `Secure`. The local gate (`pnpm verify` + the unit's e2e) is the only
pre-merge verification and is, today, the only verification at all.

## 2. The appraisal, layer by layer

Method: four passes over the tree, one per layer, each reading the code rather than the ledger,
then a fifth pass measuring the code itself. Modes are `impeccable`'s: the finder, the profiles
and the console are **Operate** surfaces (a visitor completes a task; scanability and the real
usage scene outrank expression); the story landing and the GP join page are **Persuade**. The
scoring rubric in §2.9 is this plan's own — five platform dimensions scored 0–4 — and is named as
such; it borrows `impeccable`'s audit *shape* (dimensions, a score, a P0–P3 severity on each
finding), not its screen rubric. Severity: **P0** blocks calling the platform functional; **P1**
blocks a stated goal of a quarter; **P2** a real defect with a workaround; **P3** hygiene.

### 2.1 The finder and the voice interface (Operate)

The finder is the product in this deployment and the strongest code in it: the MIC failure-mode
taxonomy in `src/voice/speech.ts` (`:326-337`, `:399-406`; cancel-first in `app/care-finder.tsx:274-276`,
release-before-assign at `:434`), the typed fallback (`SPEECH_UNAVAILABLE_COPY` `:117-121`,
`SPEECH_ERROR_COPY` `:134-155`), a browser end that never auto-submits (`:306-311`), `matches`
derived rather than stored (`:93`), and an honesty copy layer (`MATCH_QUALITY_COPY`, `tieNote`,
`unservedAsks`, `ExampleProfileTag` in `app/finder/shared.tsx:163-166`, `booking-stage.tsx:27-36`)
that makes the finder say what it does not know. What it lacks is the state and accessibility
machinery of an *app* as opposed to a page.

1. **P0 — no URL or history state.** Stage, place, request text and the chosen match live only in
   component state (`app/care-finder.tsx:57` `useState<Stage>("welcome")`, place `:83`, request
   `:63`, `matchIndex` `:77`); `app/finder/page.tsx:10-21` reads no `searchParams`. The browser's
   Back button leaves the site from any stage, a reload loses the request, and nothing can be
   shared or resumed. → U8, argued in §2.8.
2. **P0 — one `aria-live="polite"` wraps the whole stage machine** (`care-finder.tsx:412`), so every
   stage change re-announces the entire subtree while the nested `role="status"` regions
   (`results-stage.tsx:121,130,155,172,226`; `listening-stage.tsx:51`) announce again; the re-rank
   on refine (`results-stage.tsx:209`, `:110`) is not announced at all. → U9.
3. **P0 — no focus management.** The only focus call is `autoFocus` on the typed input
   (`type-stage.tsx:53`); moving from listening to results to booking leaves focus wherever the
   removed button was. → U9.
4. **P0 — the finder is indexable while defaulting to fictional profiles.** `app/robots.ts:10`
   allows `/`; there is no `noindex`, no `X-Robots-Tag`, no gate. The founder's posture is that this
   deployment is not public and is for testing; the tree does not yet say so to crawlers. → U7,
   and D-FINDER-PUBLIC before it ever changes.
5. **P0 — ranking never filters.** `src/demo/clinicians.ts:56-58` sorts; `rankCliniciansNear`
   (`:900-951`) permutes the roster; `matches[matchIndex] ?? clinicians[0]!` (`care-finder.tsx:119`)
   guarantees *someone* is shown for any request in any place. Honest copy softens this; the
   ranking itself cannot say "no one here fits". → U44, argued in §2.8.
6. **P1 — stale speech banners.** `speechMessage`/`speechRetryable` clear only in `startListening`
   (`:280-281`), not in `findMatches` (`:362-370`), `reset` (`:378-384`), `onRefine` (`:495-498`) or
   the typed path (`type-stage.tsx:37-42`). → U10.
7. **P1 — no listening timeout** beyond `CARRY_WINDOW_MS = 45_000` (`speech.ts:262`); a session left
   listening stays listening. → U10.
8. **P1 — two mic buttons for one action** (`listening-stage.tsx:62`, `:67`) with no `aria-pressed`
   or `aria-busy`; the language buttons (`:76-86`) restart recognition silently. → U9.
9. **P1 — the PWA is a manifest and icons only.** No service worker; `next.config.mjs` sets no
   headers; `app/manifest.ts:17` `start_url: "/finder"` fails offline; `display: standalone`
   (`:18`) with zero `display-mode` CSS and no in-app back. → U48, U49.
10. **P1 — iOS standalone is unhandled** (MIC B2/A3): `navigator.standalone` is read only into a
    debug string (`speech.ts:218-219`); `e2e/voice.spec.ts:23-57` drives a fake recogniser; real
    device verification is recorded as a founder action (`docs/MIC-FAILURE-MODES.md:64`). → U50,
    D-IOS-DEVICE.
11. **P1 — the gazetteer is 13 exact-match rows** (`src/geo/suburbs.ts:36`, `:69-76`); anything else
    reads "We do not cover that location yet." (`results-stage.tsx:129-135`). → U45.
12. **P2 — the mic offers three locales** (en-AU, hi-IN, ur-PK; `speech.ts:85-89`) from the two-GP
    real roster while the default roster is 22 profiles covering every `MATCHABLE_LANGUAGES` entry
    (`synthetic-roster.ts:33-35`); `SPEECH_ENGLISH_MATCHING_NOTE` (`:102-103`) and the queued F1
    auto-revert (`MIC-FAILURE-MODES.md:143-147,188`) paper over it. → U46.
13. **P2 — `?debug=1` clobber** (`care-finder.tsx:327-331`). → U10.
14. **P2 — the example toggle is ephemeral** and lives only in the welcome disclosure
    (`welcome-stage.tsx:93-106`; `rosterFor` in `synthetic-roster.ts:616` called only from
    `care-finder.tsx:76`). → U47.
15. **P2 — hard-coded origin and silent env.** `app/site.ts:10-11` bakes `https://adhd-lovat.vercel.app`;
    `NEXT_PUBLIC_GA_ID` (`app/analytics.tsx:12`) and `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`
    (`speech.ts:214`) degrade silently. → U2.
16. **P2 — no finder-stage coverage in the a11y, keyboard or reduced-motion sweeps**;
    `e2e/a11y.spec.ts` scans `PUBLIC_ROUTES` at rest, so the listening, results and booking
    stages have never been axe-scanned or tabbed. → U52.

### 2.2 The data layer, the console and auth (Operate)

The tenancy work of Year 4–5 is the best thing in this layer and it is why a migration is
tractable: `authorize()` (`src/tenancy/tenancy.ts:53-63`), the console guard (`app/console/guard.ts:33-39`),
the W209 register (`src/tenancy/store-reads.ts:64-77`, 87 functions across 12 modules classified into
seven `ScopeKind`s and checked both directions in `store-reads.test.ts`) and the SQL mirror in
`supabase/migrations/0003_memberships_rls.sql`. Everything under it is a demonstration store.

1. **P0 — 17 of 21 stores are `globalThis` maps** (`src/console/store.ts:74`, `src/audit/store.ts:63`,
   `src/booking/store.ts:86`, `src/privacy/state.ts:14`, `src/complaints/store.ts:31`,
   `src/ops/store.ts:24`, `src/registers/store.ts:94`, `src/referrals/store.ts:30`,
   `src/credentials/vault.ts:102`, `src/credentials/ledger.ts:35`, `src/capability/store.ts:7`,
   `src/education/store.ts`, `src/verticals/store.ts`, `src/pathways/registry.ts:26`,
   `src/capability/graph.ts`, `src/lib/rate-limit.ts:15`, `src/privacy/record-classes.ts:294`).
   Every console write is lost on the next cold start. → U17, U35, D-PRODUCTION-STORE.
2. **P0 — the four JSONL stores are ephemeral on Vercel** (`src/attribution/outbound-store.ts:36`,
   `src/interest/store.ts:8`, `src/onboarding/store.ts:23`, `src/onboarding/background-store.ts:42`;
   default path is the gitignored `.data/`). The interest register — the one place a real person
   may have typed an email — is on a disk that does not persist. → U19, U40.
3. **P0 — mock auth.** Any email containing `@` signs in (`app/console/actions.ts:14-24`);
   `ADHDME_AUTH_PROVIDER` is a comment (`src/console/session.ts:4`); there is no database client.
   → U23, D-AUTH-PROVIDER.
4. **P0 — the roster is a TypeScript literal** (`src/demo/roster.ts:262`) reached through
   `src/demo/clinicians.ts:19`; the SQL `clinicians` in `0001_core.sql` is a different five-column
   entity. → U18 records it; U55 moves it; the counts law (`roster.ts:250-260`,
   `synthetic-roster.test.ts:44-58`, `roster-size.ts:19`, `app/go/[clinician]/route.ts:31-33`) is
   kept by every unit that touches it.
5. **P1 — no atomic writes** (`interest/store.ts:46`, `:88-95` truncate-rewrite) and **no schema
   versioning** — `JSON.parse(line) as T` unchecked at `interest/store.ts:21`,
   `background-store.ts:56`, `onboarding/store.ts:35` (only `outbound-store.ts:80` checks). → U18, U19.
6. **P1 — session cookie** is HMAC-signed and verified in constant time (`session.ts:23-46`) but set
   without `secure` or `maxAge` (`actions.ts:22`, `:85`) and cannot be revoked. → U2, U23.
7. **P1 — rate limiting is in-memory** and covers sign-in (`actions.ts:18`) and booking only;
   **CSRF** rests on Next's origin check alone across 13 per-route `actions.ts` files. → U22.
8. **P1 — the privacy machinery is non-durable**: export (`src/privacy/store.ts:38-47`),
   `deletePatientEverywhere` (`:49-74`), retention (`:76-84`, `privacy.ts:14-24`) act on RAM; deletion
   records are lost with it; the audit trail has no tamper evidence; there is no consent-record
   store beyond `consentedAt` (`interest/store.ts:38`). → U39, U41.
9. **P2 — `GET /api/mock/console`** (`route.ts:17`) returns the whole state including memberships
   with no session. → U21.
10. **P2 — `ADHDME_STAFF` is empty** (`src/tenancy/staff.ts:39`), so the interest export
    (`app/api/interest/export/route.ts:22-26`) always 403s. → U23 (grant in the adapter).
11. **Held, not planned:** live SMS is enforced off (`src/messaging/twilio.ts:49-51` throws on
    `*.twilio.com`; `send-path.test.ts`) and booking is a 302 to Healthengine with UTM
    (`app/go/[clinician]/route.ts`, `src/booking/deeplink.ts`); both wait on G3 and G1 respectively
    and are W rows, not U rows.
12. **Tests that pin the data layer and must move with it**: `store-reads.test.ts`;
    `src/domain/schema-consistency.test.ts:29-50`; `src/tenancy/isolation.test.ts:29-40`;
    `src/lib/stores.ts` + `stores.test.ts` (`STORE_RESETTERS`); `zero-states.test.ts` (32);
    `ar-audit.test.ts:92-98`; `send-path.test.ts`; `privacy/record-classes.test.ts:46,91-94`, which
    scans for the literal `globalThis as {` and is the first test U17 rewrites; and 65 Playwright
    specs that reset through `POST /api/mock/console` (`e2e/support/session.ts:59-62`), which U21
    keeps as an alias for exactly that reason.

### 2.3 Security, compliance and privacy

The compliance and honesty layers are years ahead of the security and data layers: the registers
are tests (`docs/COMPLIANCE-DOSSIER.md:78-142` ↔ `src/compliance/surfaces.test.ts`),
`ApprovedContent` is a branded type, the founder-gate register (`src/design/founder-gates.ts`) is
load-bearing, W153's injection defence exists, and the privacy posture (client-side matching, no
geolocation, self-hosted fonts, GA dark, `/go/` stores nothing) is real. The deployment-readiness
bill is A1–A8; the founder actions with the widest unblock are B1–B5.

- **A1 P0 — no HTTP security headers** (`next.config.mjs`, no middleware, `vercel.json:1-7`) while
  three `dangerouslySetInnerHTML` JSON-LD scripts exist (`app/layout.tsx:99`, `app/faq/page.tsx:93`,
  `app/breadcrumbs.tsx:21`) and the mic needs a permissions policy. → U1, U13.
- **A2 P0 — cookies not `Secure`** (`app/console/actions.ts:22,85`, `app/demo/actions.ts:27`; noted in
  `docs/SECURITY-REVIEW-Q1.md:83-84` and still open). → U2.
- **A3 P0 — mock auth** (§2.2). **A4 P1 — in-memory rate limit** (`docs/SECURITY-REVIEW-Q3.md:20,29`).
  **A7 P0 — plaintext at rest; migrations 0001–0005 enable RLS with zero policies**
  (`SECURITY-REVIEW-Q1.md:69-71`). → U22, U23, U35, U36.
- **A5 P1 — PRIV-2 open**: export and retention do not know the Year 2+ record classes
  (`docs/COMPLIANCE-DOSSIER.md:202-212`). **A6 P1 — the interest register has no retention,
  erasure or APP 5 notice** (`src/interest/store.ts:26-48`; `COMPLIANCE-DOSSIER.md:44`). → U39, U40.
- **A8 P1 — no schema validation library** (zero zod; `app/interest-actions.ts:9,26-29` hand-checks).
  → U18 introduces one, at the record registry, once.
- **A9 P2 — GA4 is not consent-gated** (`app/analytics.tsx:18` vs `app/privacy-consent.tsx:13,33-38`).
  → U13.
- **A10–A13 P2 — the copy linter's reach is bounded**: vocabulary-bound (`src/compliance/public-surfaces.ts:298-311`
  `VOCABULARY_BOUND`), ~30 pre-Y4 `_COPY` constants unreached (`docs/CDSS-BOUNDARY-W200.md:91-94`;
  extend `Y4_FIRST_UNIT` downward), inline-composed prose unreachable (`:86-90`), `/demo` unlinted
  (`COMPLIANCE-DOSSIER.md:47`). → U62.
- **A14, A17, A18 P2 — registers that are prose, not tests**: the axe route list is hand-enumerated
  (`COMPLIANCE-DOSSIER.md:219-226`; fix is `discoverSurfaces()`), the ingestion-boundary register
  (`docs/SECURITY-W153.md:67-70`) and the operator-display sink (`:125-131`) have no executable
  proof. **A15 P2 — no threat model.** → U63.
- **A16 P2 — production posture depends on absent env vars** (`SECURITY-REVIEW-Q3.md:31`); the
  fix is a boot gate. **A20 P3 — client IP as a rate-limit key** (`app/interest-actions.ts:35-38`).
  **A21 P3 — two `image-size` advisories due 2026-11-09** (`src/security/audit-allowlist.ts:27,71`).
  → U2, U22, U16.
- **Founder and legal decisions this layer waits on** (each a `D-` entry in §6 or an inherited G):
  privacy counsel over the policy still titled "Privacy policy (draft)" (`app/privacy/page.tsx:25`,
  banner `:35`; brief at `docs/PRIVACY-COUNSEL-BRIEF.md:84-102`), the APP entity and ABN, the s 6
  sensitive-information position, the retention ceiling; Ahpra review of the *name*
  (`founder-gates.ts:107-113`, `src/compliance/landing.ts:11-27`, `PRODUCT_FLAGS`
  `public-surfaces.ts:279-282`); G5 pathways (`docs/GATE-DOSSIER-Y5.md:41-55`); G6 public directory
  (W185/W133, `Y5:57-61`); `/clinicians` clinical content (`founder-gates.ts:115-121`); D3/D4
  profile wording (`founder-gates.ts:83-98`; `e2e/profile-sweep.spec.ts`); G8 model vendor
  (`docs/EDUCATION-BOUNDARY-W144.md:98-112`); G3 live SMS (W174); G1 PMS credentials
  (`src/interop/credentials.ts:46` `G1_OPEN = false`); W217 learned ranking; the console-honesty
  re-read due 2027-02-25 (`src/compliance/console-honesty.ts:51,69`); the taste-enforcement spend
  (`founder-gates.ts:130-145`); the commercial lawyer for any pilot (G4,
  `docs/PILOT-AGREEMENT-TEMPLATE.md:4-5`); the first `ADHDME_STAFF` grant; a human on-call
  (`docs/SUPPORT-RUNBOOK.md:30-31`).

### 2.4 Deploy, CI, PWA and performance

Done well: the gate scripts are thin and fail closed (`scripts/audit-gate.mts:62-66`,
`scripts/perf-gate.mts` with its four-verdict census including `stale-budget`,
`scripts/gate-accounting.mts`), the three-run visual protocol, `forbidOnly`,
`trace: retain-on-failure`, a pre-seeded consent `storageState` (`playwright.config.ts:42-69`),
strict TypeScript with `noUncheckedIndexedAccess`, and clean dependency hygiene (`pnpm.overrides`
for postcss and sharp).

1. **P0 — CI dead since 2026-08-21** (§1); a founder action, not a code change. → U6, D-CI-BILLING.
   Until it fires, **P2** — `ci.yml:16-21` runs a subset of `verify` (no `perf:gate`, no
   `gate:accounting`) and nothing pins `engines`/`packageManager`. → U5.
2. **P0 — no error boundaries**: 47 pages and only `app/not-found.tsx`; a thrown render is a blank
   screen. **P0 — no error reporting** (no `instrumentation.ts`; only `@vercel/analytics`), no health
   endpoint, no uptime, no Web Vitals. → U3, U4.
3. **P0 — every push to `main` is a production deploy** with no staging and no rollback runbook
   (`docs/SUPPORT-RUNBOOK.md` is 37 clinical lines). → U12.
4. **P0 — WebKit is never tested**: no `projects` in `playwright.config.ts:34-83`, Chromium only in
   `ci.yml:50`, iPhone by viewport only (`e2e/mobile-fit.spec.ts:42`); the product's stated
   primary device has never run the suite. → U11.
5. **P1 — the perf gate ratchets a heavy baseline**: `src/quality/route-weights.ts:94-143` budgets
   48 routes at `ceil(measured × 1.10)`; the lightest route ships 343 KB raw, `/terms` 351 KB,
   the heaviest 653 KB, because the root layout's client graph reaches every page; fonts arrive by
   CSS `@import` of Fontsource (`app/globals.css:2-3`) rather than `next/font`; four portraits weigh
   0.6–1.0 MB each and `next/image` is used in three files. → U25, U53, U54.
6. **P1 — no Suspense or `next/dynamic`**; 20 `"use client"` files. → U25.
7. **P1 — e2e is near its wall**: 16.7 minutes against a 30-minute job (`ci.yml:39`) with the
   webServer build inside a 240 s budget (`playwright.config.ts:72`). → U28.
8. **P2 — no `.env.example`** and nine env vars documented only where they are read (§2.1 item 15;
   `ADHDME_TOKEN_SECRET` throws in production, `src/lib/secret.ts:8-11`, and is documented only in
   `playwright.config.ts:79`). → U2.
9. **P2 — no JS/TS linter** (W181's dead import was found by hand, `BUILD-STATE.md:11457`);
   **P3 — tracked junk** (root `a`, `probe.tmp.mts`, seven `design-qa-*.png` up to 481 KB; pack
   55.67 MiB, `qa/` 37 MB); **P2 — `BUILD-STATE.md` is 11,625 lines / 1.5 MB and `docs/DESIGN-QA.md`
   3,843 lines with no parser.** → U16, U32.
10. **P2 — `next.config.mjs` leaves `poweredByHeader`, `reactStrictMode` and `images` unset**; GA is
    dark (`analytics.tsx:12,15`; `docs/LAUNCH-CHECKLIST.md:29`). → U1, U13.

### 2.5 The code itself — the refactor premise

The founder's second sentence asks for a platform that is "as maintainable and simple as
possible … much better optimised and minimal code". §1 measured the starting point; this section
turns it into a **ratchet** — a register of numbers that U14 pins on the tree and that a later
commit may lower but never raise, the same one-way discipline that already governs the raw-hex
census, the unenforced-taste count and the route budgets. Five findings drive the six stages.

- **R-1 — 45% of `src/` is not reached by the product.** 127 of 280 modules and 22,809 of 51,760
  lines have no import path from `app/`. Two kinds hide in that number and must be separated by
  a register, not a guess: *law machinery* (`design`, `quality`, half of `compliance` and
  `security`) that `pnpm verify` runs and must stay; and *dormant gated product code* from the W
  lane (pathways, PMS interop, pilots, the directory, MBS, collateral, the verticals) that this
  deployment cannot reach until a founder gate opens. The second kind is a maintenance cost with
  no runtime — every store change, every type change, every dependency bump is paid for it — and
  the honest options are *quarantine* (move it under `src/gated/<gate>/` with its tests, keep it
  compiling and tested, out of every product import path) or *delete* (it is in git; a gate that
  opens in a year restores it from history in one commit). The plan quarantines by machine (U30)
  and deletes only on a founder decision (U31, D-DORMANT), because the W plan promised those
  units to gates the founder still owns.
- **R-2 — the storage layer is twenty-one hand-written maps.** Every store re-implements
  get/list/upsert/reset over a `globalThis` map or a JSONL file, and every one of them has to be
  replaced to make the platform durable (§2.2). A single keyed-store contract with an in-memory,
  a file and a SQL adapter (U17, U19, U35) replaces twenty-one implementations with three, makes
  `STORE_RESETTERS` derived instead of hand-listed, and is the seam every durability unit stands on.
- **R-3 — the write path is thirteen `actions.ts` files, fourteen mock routes and thirty-one page
  files** that repeat the same guard → parse → authorize → mutate → revalidate shape with local
  variations. One action registry (U20), one fixture route (U21), a limiter and origin check
  applied once (U22), and console pages expressed as declarative specs over at most four page
  kinds (U26) is where most of the `app/` line count goes.
- **R-4 — two style systems coexist.** `app/globals.css` (6,087 lines, 1,178 rules, 373 class
  selectors) and 1,654 Tailwind `className` attributes describe the same surfaces twice; a
  selector nobody uses cannot be found because nothing counts them. U24 collapses the tokens
  into Tailwind's `@theme`, keeps a component class only when it is used three or more times, and
  is held to *pixel identity* by the AR15 baseline — the refactor lane's single most valuable
  existing test.
- **R-5 — the tests are the size of the product and the sweeps walk every route many times.**
  50,358 lines of vitest and 252 `goto`s in 63 specs, at 16.7 minutes, because each sweep grew
  its own walk. One `walkRoutes()` per route context (U28) and shared census primitives
  (`bothDirections`, `nonVacuous`, `pinned`; U29) cut the suite's lines and minutes without
  cutting one assertion — the assertion count is part of the ratchet so that "fewer lines" can
  never quietly mean "fewer checks".

**The stages** (units in §4; all inside months 1–6):

| stage | months | what it does | units |
|---|---|---|---|
| **R0 — measure and law** | 1 | census script, ratchet register, simplicity laws, linter, junk | U14, U15, U16 |
| **R1 — one storage contract** | 1–2 | keyed-store adapter; record registry (zod, once); JSONL onto the adapter | U17, U18, U19 |
| **R2 — one write path** | 2–3 | action registry; one fixture route; limiter + CSRF once; auth seam | U20, U21, U22, U23 |
| **R3 — one style system, thin client** | 3–4 | tokens → `@theme`; client boundary to leaves; console page kinds; story primitives | U24, U25, U26, U27 |
| **R4 — one walk, one census** | 4–5 | `walkRoutes()`; census primitives; quarantine of gated modules | U28, U29, U30, (U31 gated) |
| **R5 — the record** | 5–6 | ledger split; dependency reasons; closing simplicity audit | U32, U33, U34 |

**The ratchet** — floors set by U14 from the numbers in §1, lowered by each stage, re-pinned by
U34 at the lane's close, and re-derived by U67 at the year's end. Every target is *downward-only
at equal or greater behaviour*: the AR15 baseline (pixels), the assertion count (tests), the
route-reached honesty and compliance proofs, the W209 store-read classes and the 32 zero-states
must all be unchanged or larger at every step.

| measure (2026-09-02) | now | target by U34 |
|---|---|---|
| route-reached `src/` lines | 29,231 | −25% |
| store implementations | 21 | 3 adapters, ≥30% fewer lines |
| `app/**/actions.ts` lines (13 files) | — (U14 pins) | −50% |
| `app/console` lines | — (U14 pins) | −40% |
| `app/` non-test lines | 14,407 | −25% |
| `app/globals.css` lines / rule blocks | 6,087 / 1,178 | −50% / −50% |
| unused CSS class selectors | unknown (U14 counts) | 0 |
| `"use client"` files | 20 | ≤ 10 |
| lightest route, raw shipped JS | 343 KB | < 250 KB |
| test lines at equal `expect(` count | 50,358 + 7,536 | −20% |
| e2e wall time (Chromium, `workers: 1`) | 16.7 min | ≤ 8 min |
| mock API routes | 14 | 1 |
| largest non-data file | 1,159 lines | ≤ 600 (data literals and the compliance corpus pinned separately) |
| modules unreached from `app/` that are not law | 96 | 0 (quarantined or deleted) |

### 2.6 Matching evidence

`docs/MATCHING-YEAR-PLAN.md` planned twelve months of evidence and the tree built the engine's
first two: explainable ranking under W213's explainability floor, tie honesty, unserved asks, the
clarifier. What was never built is the *evidence* — the Month 2 labelled evaluation (≥200 synthetic
real-shaped requests, two clinical reviewers and a consumer panel), the Month 3 guarded pilot, and
Q3/Q4's reciprocity, clarifier-at-scale, semantic assist, outcome signal, weight fitting,
interleaving and year-end appraisal. Two of those items are refused outright by this plan (§7:
learned weight fitting is W217's gate; reciprocity needs more than five clinicians and is a
network concern), two are gated (the labelled panel — D-EVAL-PANEL; the pilot — G4), and the rest
become U44, U56, U57 and U68: a ranking that can say no, the clarifier re-measured at synthetic
scale, a labelled-evaluation harness whose labels are provisional and explicitly non-clinical
until the panel exists, and a weight-provenance register with a sensitivity analysis in place of
fitting. The engine's ~40 scalars in `src/matching/needs.ts` have never been written down with a
reason each; U68 does that before anyone is allowed to tune them.

### 2.7 Aesthetics enforcement

`docs/AR-DOSSIER.md` §3 priced what the AR lane left: four detectors (`layout.five-then-rest`,
`type.serif-display`, `type.numeric-typography`, `motion.autoplay-stop`), five probes (the honesty
pair, `interaction.hover-focus`, `interaction.errors-plain`, `motion.reduced-motion` with its stale
blocker note, `type.palette-tokens` against the live ceilings) and the clinician-declaration
provenance types; it also said which rules are judgment calls that must not be mechanised. That
pricing is adopted unchanged as U59–U61 in the order the dossier chose (honesty-pair probe first,
then the mechanizable detectors, then the remaining probes) and the AR lane is closed (§8). The
founder gate on taste-enforcement spend (`founder-gates.ts:130-145`) is read as *already
answered* for exactly these units, because the dossier priced them at the founder's request; any
detector beyond that list reopens the gate.

### 2.8 Two open questions, argued divergently

Two findings in §2.1 have no canonical answer and are exactly what `CLAUDE.md` §5 reserves the
`adhd` skill for: the first three answers would be the textbook ones. Each was taken through
divergent options before one was chosen; the chosen answer is what the unit builds and the
rejected ones are recorded so a later session does not re-argue them from scratch.

**Q-A — the finder's state model (U8).** Options weighed: (1) *the URL carries everything*
(`?stage=&place=&q=`) — shareable and resumable, but the request text is a sentence about a
person's own care and would sit in browser history, referrer headers, Vercel's request logs and
any analytics that reads the URL, which the privacy posture (client-side matching, `/go/` stores
nothing) exists to prevent; (2) *component state only, as today* — no history, no resume, Back
exits the site; (3) *history entries per stage with the request text in `sessionStorage`* — Back
and Forward walk the stages, a reload resumes the same tab, nothing about the person leaves the
device, and closing the tab forgets it; (4) *server-held draft with an opaque id* — resumable
across devices but creates the first server-side record of a patient's words, which is a PRIV
question this plan does not want to open for a convenience feature. **Chosen: (3), with `?place=`
as the only URL parameter** — a suburb is not a person, and it makes a link like `/finder?place=Footscray`
useful to a practice without ever putting a request in a URL. Rule recorded for every later unit:
*patient text never appears in a URL, a history entry, a log line or an analytics event.*

**Q-B — a ranking that can say no (U44).** Options weighed: (1) *keep permutation, strengthen copy*
— what the tree does now; honest, but "showing someone" is itself a claim about fit; (2) *a hard
score threshold* — simple, but a single number hides which asks were unmet and invites tuning by
feel; (3) *tiered results* — "fits what you asked", "fits some of it", "does not fit" as three
explained bands derived from the same explainable factors the engine already surfaces, with an
honest empty top band and no default match; (4) *ask the clarifier before showing anything* —
moves the problem, and the clarifier is already gated at scale (G6, item 10 of the matching
plan); (5) *symptom-aware fit* — refused outright, it is the TGA boundary. **Chosen: (3).** It
removes `?? clinicians[0]!`, keeps every explanation on the floor W213 set, changes no weight,
adds no clinical attribute, and its empty state is a sentence the compliance linter already
knows how to check. The property test that ships with it is stated in U44.

### 2.9 The scorecard

Five dimensions from §0, scored 0–4 per layer on the evidence above (0 = absent, 1 = intent
without mechanism, 2 = mechanism with known holes, 3 = mechanism proven with named residuals,
4 = proven and pinned). This is the *plan's* rubric, kept deliberately coarse so the year-end
appraisal (U67) can re-score it without argument.

| layer | durability | security | reachability | honesty | verifiability |
|---|---|---|---|---|---|
| finder + voice | 1 | 2 | 2 | 4 | 3 |
| data, console, auth | 0 | 1 | 3 | 3 | 3 |
| security, compliance, privacy | 1 | 1 | 2 | 4 | 3 |
| deploy, CI, PWA, perf | 1 | 1 | 2 | 3 | 2 |
| the code itself (§2.5) | 2 | 3 | 1 | 3 | 4 |

The shape of the table is the shape of the year: honesty and verifiability are the tree's
strengths and are kept; durability and security are the deficits and are Q1–Q2's work;
reachability of the code (the refactor) and of the surfaces (WebKit, installed mode, offline, the
finder's stages) is what the middle of the year buys.

## 3. Done well — do not re-plan

Recorded so that no unit re-litigates it: the MIC failure-mode taxonomy and cancel-first
discipline; the typed fallback and the browser-end-never-submits rule; derived `matches`; the
honesty copy layer; reduced motion handled at the hook (`scenarios-stage.tsx:25-34`); the
mock/demo route guards; `authorize()` and the console guard; the W209 store-read register;
the real-only counts law; live-SMS-off enforced in the adapter and tested; the registers-as-tests
pattern across compliance; `ApprovedContent`; the founder-gate register with its source-asserting
test; W153's injection defence; the privacy posture; thin fail-closed gate scripts; the
four-verdict perf census; gate accounting; the three-run visual protocol and the accepted-diff
chain; strict TypeScript; dependency hygiene; and the O222/O224 simplification that derived the
finder's state from `(request, origin, roster)` and deleted eight setters — the refactor lane's
own worked example of "fewer lines, same pixels, proven by the baseline".

## 4. The plan — four quarters, sixty-eight units

Quarters run September–November 2026, December–February, March–May, June–August 2027. Q1 buys
deployment readiness and the refactor's foundation (R0–R2); Q2 finishes the refactor (R3–R5) and
makes the platform durable; Q3 takes the finder to scale and makes it an installed app; Q4 is
evidence, enforcement and the year's reckoning. Sizes: S ≈ one session, M ≈ two, L ≈ three or
more; the lane is sized for one session-day a working day with room for the founder's own
interrupts, which is how O216–O226 actually ran.

Two laws bind every unit without being repeated in each: **the AR15 baseline is the pixel
witness** — a unit that moves pixels appends an `ACCEPTED_DIFFS` entry naming itself, a unit that
claims not to move them proves it by the manifest hash; and **the ratchet only goes down** —
every R-lane unit re-runs `scripts/size-census.mts` and lowers the floors it moved.

### Q1 — September to November 2026: deployment readiness and the refactor's foundation

- **U1** [P] (S) — Security headers and a report-only CSP.
  `next.config.mjs` `headers()`: `Strict-Transport-Security`, `X-Content-Type-Options`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` granting `microphone=(self)`
  and denying geolocation/camera, `X-Frame-Options: DENY`; `poweredByHeader: false`,
  `reactStrictMode: true`. A `Content-Security-Policy-Report-Only` whose script sources are
  `'self'` plus per-script hashes for the three JSON-LD blocks (`app/layout.tsx:99`,
  `app/faq/page.tsx:93`, `app/breadcrumbs.tsx:21`) and the GA loader, computed at build by a
  small helper so a copy edit to the JSON-LD cannot silently break the policy. Enforcement is U13.
  → verify: `src/security/headers.test.ts` asserts every header above on `/`, `/finder` and a
  console route through `next start`, and that the report-only policy hashes equal the rendered
  scripts (both directions: every hash in the policy matches a script, every inline script has a
  hash); e2e `headers.spec.ts` reads them off a real response.

- **U2** [P] (S) — Secure cookies, `.env.example`, and a boot-time posture assertion.
  `secure: process.env.NODE_ENV === "production"`, `maxAge` matching the 7-day HMAC window and
  `sameSite: "lax"` on the console and demo cookies (`app/console/actions.ts:22,85`,
  `app/demo/actions.ts:27`). `.env.example` listing every `process.env` read in `app/`, `src/`,
  `scripts/` and `playwright.config.ts` with one line of purpose each; `src/lib/env.ts` reads
  them once and, in production, fails the first request loudly when `ADHDME_TOKEN_SECRET` is
  absent or a mock/demo flag is on. `app/site.ts` derives the origin from `NEXT_PUBLIC_SITE_URL`
  with the Vercel URL as the fallback rather than a baked hostname.
  → verify: `src/lib/env.test.ts` scans the tree for `process.env.X` reads and asserts
  `.env.example` names every one and nothing else (both directions); a production-mode test proves
  the posture assertion throws on each forbidden combination; cookie flags asserted in
  `src/console/session.test.ts`.

- **U3** [P] (S) — Error boundaries with linted copy.
  `app/error.tsx`, `app/global-error.tsx`, `app/console/error.tsx` and a `loading.tsx` for the
  finder and the console shell, each rendering one plain sentence and one action (retry, or go to
  the start) in the tree's own idiom — no stack traces, no vendor copy. The sentences are
  `_COPY` constants so the compliance linter reaches them.
  → verify: a vitest renders each boundary with a thrown error and asserts the copy and the
  action; `src/compliance/public-surfaces.test.ts` census shows the new constants reached; e2e
  `error-boundary.spec.ts` triggers a render error on a fixture page and asserts the boundary,
  not a blank screen.

- **U4** [P] (M) — The reporter seam, a health endpoint, and Web Vitals.
  `instrumentation.ts` with `onRequestError`, forwarding to `src/ops/reporter.ts` — a sink
  interface with a console adapter by default and a vendor adapter selected by `ADHDME_REPORTER`
  (no vendor is chosen by this unit; the seam is). `app/api/health/route.ts` returning commit
  SHA, boot time and store adapter kind, never state. `useReportWebVitals` posting LCP/INP/CLS to
  the same sink, and nothing else.
  → verify: `src/ops/reporter.test.ts` proves an uncaught server error reaches the sink with route
  and SHA and that patient text (a finder request) never appears in a report payload — a
  planted request string must be absent; e2e asserts `/api/health` shape and that the console
  adapter logs a thrown error from a fixture route.

- **U5** [P] (S) — Toolchain pins and CI parity.
  `engines` and `packageManager` in `package.json`, `.nvmrc`, and `ci.yml` running exactly
  `pnpm verify` (which adds `perf:gate` and `gate:accounting` to CI) plus the e2e job unchanged.
  → verify: `src/quality/ci-parity.test.ts` parses `ci.yml` and asserts its script set equals
  `verify`'s step list (both directions); `pnpm verify` green locally with the pinned versions.

- **U6** (S) — **BLOCKED D-CI-BILLING.** The first green Actions run since 2026-08-21.
  When the founder resolves the account-level Actions billing, re-run the workflow on `main`; if
  it fails on anything but billing, fix the workflow in this unit. No code change is expected.
  → verify: a green run recorded by URL in the ledger row; `gate-state` line updated from that
  run's figures.

- **U7** [P] (S) — Crawlers told the truth about the finder.
  `noindex, nofollow` on `/finder`, `/examples` and `/demo` by `X-Robots-Tag` and `<meta>`,
  those routes removed from the sitemap, and `app/robots.ts` disallowing them; a
  `finder-public-posture` entry registered in `src/design/founder-gates.ts` (open) so that
  reversing any of this is a gate, not an edit.
  → verify: `src/security/robots.test.ts` asserts the three routes are excluded in all three
  places (both directions with the public-route census, so a new public route is neither
  silently indexed nor silently hidden); `founder-gates.test.ts` sees the new entry with its
  source.

- **U8** [P] (M) — The finder's state model (§2.8 Q-A).
  History entries per stage via `history.pushState`, the request text and the chosen match in
  `sessionStorage` under a versioned key, `?place=` as the only URL parameter; Back and Forward
  walk the stages; reload resumes; a fresh tab starts clean. `app/finder/page.tsx` reads `place`
  from `searchParams`. The rule from §2.8 becomes code: `src/finder/state.ts` exports the URL
  serialiser and it accepts only `place`.
  → verify: `src/finder/state.test.ts` round-trips every stage and proves the request text is
  absent from the URL and from `history.state` (a planted sentence must not appear); e2e
  `finder-history.spec.ts` drives welcome → listening → results → booking with Back/Forward and
  a reload, asserting the stage and the preserved request; `qa/` captures unchanged (no pixel
  moves).

- **U9** (M) — Focus, live regions and one mic control. Depends: U8.
  Remove the outer `aria-live` (`care-finder.tsx:412`); each stage owns one `role="status"` region
  that announces exactly its change (listening started/stopped, N results for place, re-ranked
  after refine); focus moves to the stage heading on every transition and to the first result on
  results; the two mic buttons become one toggle with `aria-pressed` and `aria-busy`, and the
  language buttons announce the restart. `frontend-design`'s brief-first method applies: write
  the announcement script before the code.
  → verify: e2e `finder-a11y.spec.ts` asserts the focused element and the single live-region
  text after each transition (keyboard-only, `reduce` and no-preference); axe on every stage;
  `touch-floor` and `keyboard-focus` sweeps extended to finder stages (the U52 sweep starts
  here); AR15 acceptance entry if the single control moves pixels.

- **U10** [P] (S) — Stale banners, a listening timeout, and the debug clobber.
  `speechMessage`/`speechRetryable` cleared on every path that leaves the listening stage
  (`findMatches`, `reset`, `onRefine`, the typed path); a listening timeout at 60 s that ends
  recognition with the existing "we did not catch that" copy; `?debug=1` read once into state
  instead of clobbering the URL.
  → verify: vitest on the reducer paths (banner cleared on each exit; timeout fires the
  end-of-speech path, not an error); e2e `voice.spec.ts` gains the timeout case with the fake
  recogniser and the fixed clock.

- **U11** [P] (M) — WebKit in the suite.
  A `webkit` Playwright project (Desktop Safari and iPhone 15 device descriptors) over a
  named subset: the finder journey, the voice spec with the fake recogniser, mobile-fit, the
  a11y sweep and the visual matrix at the mobile width; `gate:accounting` taught to account for
  both projects; the AR15 manifest gains a `webkit` dimension only if the mobile captures differ,
  otherwise the run is a proof of sameness.
  → verify: `pnpm e2e --project=webkit` green locally; `scripts/gate-accounting.mts` fails if
  either project's tests are unaccounted; `ci.yml` runs both projects once U6 fires.

- **U12** (S) — The deploy runbook and a smoke script. Depends: U4.
  `docs/DEPLOY-RUNBOOK.md`: what a `main` push does, how to read the health endpoint, how to roll
  back (Vercel "promote previous" by SHA), what the reporter shows, who is on call (the founder,
  until the founder names a person — recorded as the founder's own item in `SUPPORT-RUNBOOK.md`,
  not a gate here). `scripts/smoke.mts` hits `/`, `/finder`, `/api/health` and one console redirect on a
  given origin and exits non-zero on any miss; `pnpm smoke` in `package.json`.
  → verify: `pnpm smoke http://localhost:3100` green against `next start`; the runbook's
  commands are the ones the script runs (a test greps the runbook for each script step).

- **U13** (S) — Analytics behind consent and the CSP enforced. Depends: U1, U4.
  GA4 loads only after `privacy-consent` records acceptance and is unloaded on withdrawal; the
  report-only policy from U1 becomes `Content-Security-Policy` once a week of reports (via the
  U4 sink) shows zero violations on real routes — if any remain, this unit fixes their source
  rather than widening the policy.
  → verify: e2e proves no GA request before consent and one after; `headers.test.ts` asserts the
  enforced header; the finder's mic and every console route still function under enforcement
  (the full suite is the proof).

- **U14** [P] (M) — **R0.** The size census and the downward ratchet.
  `scripts/size-census.mts` re-deriving every number in §1 and §2.5 (lines by tree, reachability
  from `app/`, single-importer modules, `actions.ts` and console lines, CSS lines/rules/unused
  selectors against the rendered class census, client-file count, `goto` count, largest files,
  mock routes); `src/quality/size-census.ts` pinning each as a floor with the date it was set;
  `size-census.test.ts` failing when a measured value exceeds its floor and when a floor is raised
  without a dated reason (append-only, like `ACCEPTED_DIFFS`). `pnpm census` prints the table.
  → verify: the pinned floors equal §1/§2.5 on the day (a stale-check, so the plan's numbers are
  provably the tree's); the test goes red on a planted regression (a vitest that raises one
  floor in memory must fail); `pnpm verify` runs it.

- **U15** (M) — **R0.** The simplicity laws and their registers. Depends: U14.
  `docs/SIMPLICITY-LAWS.md` (name chosen to stay outside the plan-canon regex) stating the
  lane's rules in the tree's voice: one implementation per concept; a module is reached by the
  product, by the law, or by a named gate — or it is deleted; a file over 600 lines carries a
  dated reason; duplicated blocks are a defect. Four registers, each proven able to fail:
  `src/quality/module-reasons.ts` (every unreached module tagged `law | gated:<G> | delete`),
  the file-size allowlist, a duplicate-block detector (normalised 12-line windows across `src/`
  and `app/`), and the single-importer census.
  → verify: each register's test fails on a planted violation (an untagged unreached module, an
  unlisted 700-line file, a copied block, a module imported only by its test and not tagged);
  the module-reasons register covers all 127 unreached modules in both directions.

- **U16** [P] (M) — **R0.** A linter, dead-export detection, and the junk.
  ESLint 9 flat config (typescript-eslint strict + react-hooks + the Vercel `react-best-practices`
  rules that have lint equivalents) with zero warnings allowed; `knip` for unused files, exports
  and dependencies, its report pinned; `pnpm lint` added to `verify`. Remove root `a`,
  `probe.tmp.mts`, the seven `design-qa-*.png` (moved under `qa/` if referenced by `DESIGN-QA.md`,
  else deleted); review the two `image-size` advisories before their 2026-11-09 date and either
  upgrade or re-accept with a new date.
  → verify: `pnpm lint` and `pnpm knip` green with the pinned baseline (knip findings may only
  go down — a ratchet entry); `audit:gate` green with no acceptance past its review date.

- **U17** (L) — **R1.** One storage contract. Depends: U14.
  `src/store/keyed.ts`: `KeyedStore<T>` (`get`, `list`, `put`, `delete`, `reset`, `scope`) with
  the in-memory adapter; the 17 `globalThis` stores rewritten as thin modules over it, keeping
  every exported function name and the W209 classification unchanged so `store-reads.test.ts`
  passes untouched; `STORE_RESETTERS` derived from the adapter registry instead of hand-listed;
  `privacy/record-classes.test.ts:46,91-94` rewritten from a `globalThis as {` grep to a check
  on the registry. `src/lib/rate-limit.ts` moves onto the adapter with a TTL scope.
  → verify: `store-reads`, `isolation`, `zero-states`, `stores.test.ts` and the full e2e green
  without edits to their assertions (the store contract is invisible from outside); the census
  shows store lines down ≥30% and implementations at 1 adapter; a contract suite
  (`src/store/contract.test.ts`) runs against the adapter and is reused by U19 and U35.

- **U18** (M) — **R1.** The record registry. Depends: U17.
  `src/domain/records.ts`: every persisted record type declared once with a zod schema, a
  version, its record class (from `privacy/record-classes.ts`), its `ScopeKind` (from
  `store-reads.ts`) and its retention class — merging three registers that describe the same
  entities into one; `schema-consistency.test.ts` re-pointed at it. zod enters the tree here and
  only here; `app/interest-actions.ts` and the console actions parse through the registry.
  → verify: both-directions test between the registry, the adapters' declared record types and
  `DOMAIN_TABLES`; a planted unregistered record type fails; parse rejects a malformed JSONL
  line with a versioned error instead of a cast.

- **U19** (M) — **R1.** The JSONL stores onto the adapter. Depends: U18.
  A file adapter (append-only JSONL, write-to-temp-and-rename, `fsync`, versioned lines via U18)
  used by the four `ADHDME_*_PATH` stores; `e2e:visual`'s pinned `.data-visual/` behaviour kept;
  the outbound and interest stores' shared "invitation" join written once.
  → verify: the contract suite green on the file adapter; a crash-mid-write test (kill after
  temp write) leaves the previous file intact; `pnpm e2e:visual` three-run protocol agrees
  (the matching console reads the pinned-empty store); census: four store implementations → one
  adapter.

- **U20** (M) — **R2.** The action registry. Depends: U19.
  `src/actions/registry.ts`: each server action declared as `{ name, scope, input (zod), run }`;
  one `defineAction()` that applies the guard, parse, `authorize()`, mutate and `revalidatePath`
  steps; the 13 `app/**/actions.ts` files become re-exports of registry entries. A census test
  lists every `"use server"` export and asserts it is a registry entry (both directions).
  → verify: every console e2e green unchanged; `app/**/actions.ts` lines down ≥50% per the
  census; a planted action outside the registry fails the census.

- **U21** (S) — **R2.** One fixture route. Depends: U20.
  `app/api/mock/[fixture]/route.ts` over `src/fixtures/registry.ts` (the fourteen mock routes as
  named fixtures); `POST /api/mock/console` kept as an alias because 65 specs call it; the state
  `GET` requires a signed session. `mock-guard.ts` unchanged.
  → verify: `seedFixtures` and `signInAndOnboard` unchanged and green; the unauthenticated `GET`
  returns 401; census: mock routes 14 → 1 (+ alias).

- **U22** (S) — **R2.** The limiter and the origin check, once. Depends: U20.
  `defineAction()` and the API routes take a `limit` policy (key, window, count) served by the
  adapter's TTL scope; a same-origin check on every mutating action and route in one place; the
  interest, sign-in and booking limits ported; the IP key replaced with a hashed
  `(ip, user-agent)` pair to answer A20.
  → verify: `src/security/limits.test.ts` proves every registry action and mutating route
  declares a limit (both directions) and that a cross-origin POST is refused; the existing
  sign-in limit test passes through the new path.

- **U23** (M) — **R2.** The auth seam. Depends: U22.
  `src/auth/provider.ts`: `AuthProvider { signIn, verify, revoke, staffGrants }`; the mock
  provider implements it and *refuses to construct in production* (the U2 posture assertion
  grows this case); sessions and `ADHDME_STAFF` grants persist through the adapter so a session
  can be revoked and a grant can be made without an env var. No real provider is chosen — that
  is D-AUTH-PROVIDER (U37). `app/console/actions.ts` and `demo/actions.ts` call the seam.
  → verify: provider contract suite on the mock; a revoked session is refused on the next
  request (e2e); the production-refusal test; `interest/export` returns 200 for a granted staff
  session in a test and 403 otherwise.

### Q2 — December 2026 to February 2027: the refactor's second half and durability

- **U24** (L) — **R3.** One style system. Depends: U14.
  The design tokens in `app/globals.css` become Tailwind 4 `@theme` declarations (one source);
  every component class used fewer than three times across `app/` is inlined at its call sites
  and deleted; classes used three or more times are kept as `@utility`/component layers with a
  census; the 195 section comments become the file's table of contents or go. `adhdme-taste`,
  `frontend-design`'s token-system rule and `impeccable`'s craft floor are loaded first;
  `theme-parity` and the raw-hex ratchet stay green.
  → verify: **pixel-identical** — the AR15 manifest hash unchanged across the whole 180-cell
  matrix (three-run protocol), or an `ACCEPTED_DIFFS` entry naming each moved cell and why;
  census: `globals.css` lines and rules down ≥50%, unused selectors 0; the contrast, focus and
  touch sweeps green.

- **U25** (M) — **R3.** The client boundary to the leaves. Depends: U14.
  `"use client"` removed from every file that does not own an event handler, an effect or
  browser state; the root layout's client graph (analytics, consent, motion providers) split so
  the story landing and the console shell ship only what they use; `next/dynamic` for the voice
  stage and the story sequence. The Vercel `react-best-practices` and `composition-patterns`
  skills govern the cuts.
  → verify: census: client files ≤10; `perf:gate` shows every route budget lowered (the
  `stale-budget` verdict is the proof the ratchet moved) and the lightest route under 300 KB raw
  on the way to U54's 250; the AR15 hash unchanged; hydration warnings zero in the e2e console
  capture.

- **U26** (L) — **R3.** Console page kinds. Depends: U20, U24.
  The 31 console pages expressed as declarative specs over at most four page kinds (register
  list, record detail, form, dashboard) rendered by four components in `app/console/_kinds/`;
  every zero-state sentence moves into the spec so `zero-states.ts` derives from the specs
  rather than duplicating them; the console honesty sweep and working-truth proofs unchanged.
  → verify: the 31 routes still exist (the route census is the both-directions check); the 32
  zero-states derived and equal to today's register; the AR15 console cells unchanged or
  attributed; census: `app/console` lines down ≥40%; keyboard and touch sweeps green.

- **U27** (M) — **R3.** Story and public section primitives. Depends: U24.
  `app/story-sequence.tsx` (607 lines) and the public pages' repeated section/band/aside shapes
  become five primitives at most (`Band`, `Section`, `Prose`, `Aside`, `Acknowledgement`),
  Persuade-mode surfaces with **zero pixel change**; the Acknowledgement of Country stays exactly
  where and what it is.
  → verify: the AR15 hash unchanged; census: `app/` non-test lines down ≥25% by this point; the
  honesty and accent-discipline sweeps green.

- **U28** (L) — **R4.** One walk. Depends: U14.
  `e2e/support/walk.ts`: `walkRoutes(context, visit)` — one signed-in-and-seeded walk per route
  context (public, console, finder stages after U9) that every sweep subscribes a check to,
  replacing the per-spec loops; the 252 `goto` calls become ≤60; a **guarantee register**
  (`e2e/support/guarantees.ts`) lists every assertion family each sweep made *before* the change
  and the walk asserts the same families after it, so the collapse cannot drop a check.
  → verify: the guarantee register equal before and after (pinned in the unit's first commit,
  re-derived in its last); `gate:accounting` green; e2e wall time ≤8 min on Chromium at
  `workers: 1`; every `measured()` floor still met.

- **U29** (M) — **R4.** Census primitives. Depends: U28.
  `src/quality/census.ts`: `bothDirections(a, b, label)`, `nonVacuous(list, floor)`,
  `pinned(register, value, reason)` — the three shapes 298 test files hand-write; the vitest
  suite rewritten onto them where the rewrite is mechanical; the `expect(` count is measured
  before and after and must not fall.
  → verify: census: test lines down ≥20% at an equal or greater `expect(` count (both numbers in
  the ratchet); every test file still names the unit that wrote it in its header (a grep census).

- **U30** (M) — **R4.** The module-reasons register, executed. Depends: U15, U16.
  Every module tagged `gated:<G>` in U15's register moves under `src/gated/<gate>/` with its
  tests (a `test:gated` script keeps them in `verify`); its imports from live code are severed
  or inverted so no product path reaches it; every module tagged `delete` — the ones with zero
  importers or only a self-test and no gate — is removed with its tests. `src/collateral/one-pager.ts`
  is the first.
  → verify: the reachability census shows 0 non-law modules unreached from `app/` outside
  `src/gated/`; `tsc` and the gated tests green; `knip` baseline lowered; the W rows whose code
  moved are listed in the ledger note so the gate that opens them knows where it lives.

- **U31** (S) — **BLOCKED D-DORMANT.** Delete the quarantined gated modules. Depends: U30.
  If the founder decides the finder deployment will not carry the W lane's gated product code,
  `src/gated/` is deleted from this repository (it remains in `Stef-01/ADHD` and in history) and
  the ratchet drops by its size.
  → verify: `pnpm verify` green with `test:gated` removed; the census re-pinned; the ledger note
  lists the W rows whose code left this tree.

- **U32** [P] (M) — **R5.** The ledger split.
  `BUILD-STATE.md` keeps the claim protocol, the gate line, the Home blockquotes and the *live*
  lanes; the closed W and AR tables and their opening blockquotes move to
  `docs/ledger/W-SERIES.md` and `docs/ledger/AR-SERIES.md`, the O/M blockquotes older than the
  current quarter to `docs/ledger/O-SERIES.md`; `docs/DESIGN-QA.md` becomes `docs/design-qa/`
  with one file per unit and an index. Every ledger-reading test (`ledger-integrity`,
  `plan-ledger`, `year-six-horizon`, the five dossier tests, `gate-state`, `one-year-plan`) is
  re-pointed through one `src/quality/ledger.ts` reader that concatenates the parts, so no test
  loses a row; the O-blockquote form gets a parser at last.
  → verify: row counts per lane equal before and after (pinned in the reader's test); every
  re-pointed test green with its assertions unedited; `BUILD-STATE.md` under 1,500 lines;
  `docs/DESIGN-QA.md` gone and its unit index derived from `docs/design-qa/`.

- **U33** (S) — **R5.** Dependency reasons. Depends: U16.
  `src/quality/dependency-reasons.ts`: every entry in `dependencies` and `devDependencies` with
  the reason it is here and the unit that would remove it; `motion` (^13) and the icon package
  evaluated against what the tree actually calls (the census counts call sites) and replaced by
  CSS/inline SVG where the count is small enough to justify it.
  → verify: both-directions test between `package.json` and the register; `knip` reports zero
  unused dependencies; `perf:gate` budgets lowered again if a package left the client graph.

- **U34** (M) — **R5.** The closing simplicity audit. Depends: U30, U32, U33.
  `docs/SIMPLICITY-AUDIT.md` in `AUDIT-AR`'s form: every ratchet number re-derived by
  `pnpm census` and compared with §1/§2.5, each stage's units listed with their measured
  effect, and the residuals named — what is still large and why. The floors in
  `src/quality/size-census.ts` re-pinned at the audited values so the second half of the year
  inherits the lane's gains as law.
  → verify: `src/quality/simplicity-audit.test.ts` re-derives each number in the document on
  every verify (the AR34 method — a stale number is a red build); every §2.5 target met or its
  miss recorded with the number and the reason.

- **U35** (L) — Durability: the SQL adapter. Depends: U17.
  A Postgres adapter for `KeyedStore` using PGlite in tests and `pg` against a `DATABASE_URL`
  in deployment; migrations 0001–0005 extended with the *policies* RLS was enabled without
  (`supabase/migrations/0006_policies.sql`), written from the W209 `ScopeKind`s so a store
  function's classification and its SQL policy are the same fact; the `supabase` skill is the
  reference if it is installed by then (standing debt, §9), the migration files are the law
  either way. No production database is chosen or connected — that is D-PRODUCTION-STORE.
  → verify: the U17 contract suite green on the SQL adapter under PGlite; `schema-consistency`
  extended to assert every `DOMAIN_TABLES` entry has a policy per scope kind (both directions);
  the full e2e green with `ADHDME_STORE=pglite`.

- **U36** (M) — Durability: isolation at the SQL layer. Depends: U35.
  Adversarial tests that sign in as one practice and read every store function as another
  through the SQL adapter, mirroring `isolation.test.ts` at the policy layer; a *policy-removal
  probe* that drops one policy in a transaction and proves a test goes red (the AR9 mutation
  rule applied to RLS).
  → verify: every W209 `practice`-scoped function refuses a cross-practice read at the SQL layer;
  the probe fails for each removed policy; results recorded in `docs/SECURITY-REVIEW-Y1U.md`
  (name outside the plan-canon regex).

- **U37** (M) — **BLOCKED D-AUTH-PROVIDER.** The real auth provider. Depends: U23.
  When the founder chooses a provider (the brief in §6 lists the constraints: Australian data
  residency, passkeys, magic-link fallback, no social login on a health surface), implement it
  behind U23's seam with the mock provider still the test default.
  → verify: the provider contract suite green on the real provider against its sandbox; sign-in,
  revocation and the staff grant proven end-to-end; no credential in the tree (`.env.example`
  names the vars, the posture assertion refuses their absence in production).

- **U38** (S) — **BLOCKED D-PRODUCTION-STORE.** Connect the production database. Depends: U35, U36.
  When the founder chooses where the SQL adapter runs, set `DATABASE_URL`, apply the migrations,
  run `pnpm smoke`, and record the first durable console write.
  → verify: `/api/health` reports the SQL adapter; a console write survives a redeploy (recorded
  by SHA pair in the ledger note).

- **U39** (M) — Consent records and PRIV-2 closed. Depends: U19.
  A consent record class in U18's registry (who, what text version, when, withdrawn when),
  written by the interest form and the console onboarding; export, delete-everywhere and
  retention extended to *every* record class in the registry, driven by the registry rather than
  a hand-list, which is what PRIV-2 asked for.
  → verify: both-directions test between record classes and the privacy operations that know
  them; a planted new record class fails until export/delete/retention handle it; the consent
  text version is the hash of the rendered notice, asserted against the page.

- **U40** (S) — The interest register's lifecycle. Depends: U39.
  A retention ceiling (default 12 months, an env-tunable named in `.env.example`), an erasure
  path reachable from a signed request, and an APP 5 collection notice rendered beside the form
  as `_COPY` the linter reaches.
  → verify: retention removes a planted aged record and records the deletion; erasure by token
  e2e; the notice present on the form route in the public-surfaces census.

- **U41** (M) — A hash-chained audit trail. Depends: U17.
  `src/audit/store.ts` entries carry the previous entry's hash; a verifier walks the chain; the
  console's audit page shows "chain intact to entry N" as data, never as a claim about the
  practice; tamper evidence is what this buys, not immutability, and the copy says so.
  → verify: a planted edit to an earlier entry fails verification; the console-honesty sweep
  green on the new sentence; the chain survives the file and SQL adapters alike (contract suite).

- **U42** [P] (S) — The console-honesty acceptances, re-read.
  The two `PUBLIC_ACCEPTED`/console acceptances fall due 2027-02-25 (`src/compliance/console-honesty.ts:51,69`);
  re-argue each against the live data-vs-copy rule and either re-accept with a new date or fix
  the copy.
  → verify: no acceptance past its date in the console-honesty stale-check; `AUDIT-AR`'s derived
  "console accepted findings" count updated in the same commit.

- **U43** (S) — **BLOCKED D-PRIVACY-COUNSEL.** The privacy policy leaves draft. Depends: U39.
  When counsel returns the brief (`docs/PRIVACY-COUNSEL-BRIEF.md`), fold the answers into
  `app/privacy/page.tsx`, drop "(draft)" from the title and the banner, and record the APP
  entity, ABN and retention ceiling where the policy states them.
  → verify: the public-surfaces census sees the new copy; the consent text version (U39)
  re-hashed and every stored consent marked as pre-dating it; `founder-gates.ts` decision recorded.

### Q3 — March to May 2027: the finder at scale and the installed app

- **U44** [P] (L) — A ranking that can say no (§2.8 Q-B).
  A *fit floor* derived from the explainable factors the engine already surfaces — an ask the
  roster cannot meet in the named place is a *miss*, not a low score — and results shown in three
  explained tiers: "fits what you asked", "fits some of it" (each unmet ask named, as the
  unserved-asks copy already does), and "does not fit" (collapsed, never shown by default). An
  honest empty top tier is a sentence the compliance linter reaches, and there is no default
  match: `matches[matchIndex] ?? clinicians[0]!` (`app/care-finder.tsx:119`) is removed with the
  derivation that made it necessary. No weight changes; no clinical attribute is added; every
  explanation stays on the W213 floor. The `adhd` skill's divergent pass is already recorded in
  §2.8 and is not re-run.
  → verify: a property test over 500 generated profiles and 2,000 generated requests asserting
  (a) every top-tier result meets every hard ask, (b) every partial-tier result names each unmet
  ask, (c) an empty top tier renders the linted empty state and never a clinician, and (d)
  ranking stays under 50 ms at 500 profiles; the explainability-floor test unchanged; the
  finder e2e green with the two-GP real roster and with examples on.

- **U45** [P] (M) — A real gazetteer.
  `src/geo/suburbs.ts` (13 exact-match rows, `:36`, `:69-76`) replaced by an open-data
  Australian locality table (suburb, state, postcode, centroid) with the licence recorded beside
  the data file and in `docs/DEPLOY-RUNBOOK.md`; lookup by suburb with a small edit-distance
  tolerance and by postcode; the "we do not cover that location yet" path
  (`results-stage.tsx:129-135`) kept for places the roster genuinely does not reach. Distances
  stay approximate and say so.
  → verify: the finder resolves every roster suburb, every capital, a misspelt suburb and a
  postcode (unit tests over a pinned sample); the "not covered" state still renders for a place
  with no roster within range; the data file's licence test (its header names the source and
  the licence) is both-directions with the runbook.

- **U46** [P] (S) — Mic locales from the roster.
  The three hard-coded locales (`src/voice/speech.ts:85-89`) become the locale set derived from
  the *active* roster's `MATCHABLE_LANGUAGES` entries, so the example roster offers every
  language it can match and the two-GP roster offers only what it can; the
  `SPEECH_ENGLISH_MATCHING_NOTE` and the queued F1 auto-revert in `docs/MIC-FAILURE-MODES.md`
  (`:143-147`, `:188`) are closed by this, and the document says so.
  → verify: both-directions test between the offered locales and the active roster's languages
  for both rosters; the failure-mode register's F1 row marked resolved with the unit id; the
  language buttons announce a locale change (U9's live region).

- **U47** (M) — The example roster, persisted and scaled. Depends: U44.
  The examples toggle (`welcome-stage.tsx:93-106`) remembers its state in `localStorage` (a
  tab-scoped convenience, never a record); a generated synthetic roster of configurable size
  (defaults off, `?examples=scale` behind the existing mock guard) exercises U44's tiers at the
  size a real network would have; the *real-only counts law* (`roster.ts:250-260`,
  `roster-size.ts:19`, `app/go/[clinician]/route.ts:31-33`) is untouched — generated profiles
  are never counted, never routed through `/go/`, and carry the same testing disclosure.
  → verify: the counts-law tests green with the scale roster on; the disclosure visible on every
  stage that shows a generated profile (e2e); a generated profile's `/go/` returns 404; the
  AR15 finder cells unchanged with examples in their default state.

- **U48** [P] (M) — An offline app shell.
  A service worker (hand-written, ~100 lines, versioned by the build SHA so a deploy invalidates
  it) that precaches the finder shell, the fonts and the icons, serves `start_url` offline with
  an honest "you are offline — the roster you last saw is what you can search" state, and
  **never** caches `/console`, `/api` or anything behind a session; the `Cache-Control` and CSP
  headers from U1 cover the worker script.
  → verify: an e2e that loads `/finder` online, goes offline (`context.setOffline(true)`), reloads
  and reaches the results stage; a console route offline shows the browser's own failure, not a
  cached page; a planted fetch of `/api/mock/console` through the worker is refused (mutation
  probe); `next build` emits the worker with the current SHA in its header.

- **U49** (M) — Installed-mode chrome. Depends: U8.
  `@media (display-mode: standalone)` styles that give the installed app what the browser chrome
  gave it — an in-app back control on every stage (driven by U8's history model), safe-area
  padding on every fixed element (`env(safe-area-inset-*)`, top *and* bottom), and no
  reliance on the URL bar for state; the `apple-mobile-web-app-*` meta set completed.
  → verify: AR15 captures gain an *installed* variant for the finder stages (an `ACCEPTED_DIFFS`
  entry naming the new cells); the touch-floor sweep green in installed mode; the back control
  walks U8's stages in the e2e with `isMobile` + the standalone media emulated.

- **U50** (M) — The iOS standalone speech branch. Depends: U11.
  MIC failure modes B2 (no recognition in a home-screen app) and A3 (permission state after
  install) handled in code rather than in a debug string (`speech.ts:218-219`): standalone iOS
  offers the typed path first with the honest sentence from the failure-mode register, and the
  fake-recogniser mode that `e2e/voice.spec.ts:23-57` drives becomes a named test seam
  (`ADHDME_FAKE_RECOGNISER`) so the WebKit project can exercise every branch.
  → verify: the WebKit project runs the voice spec on the fake seam for both branches; the
  failure-mode register's B2 and A3 rows point at the tests; the copy on the typed-first path
  passes the linter; real-device confirmation stays U51.

- **U51** (S) — **BLOCKED D-IOS-DEVICE.** Real-device verification. Depends: U50.
  On a physical iPhone the founder names, the installed app is walked through every finder stage
  with the mic and with the typed path, and the result recorded in `docs/MIC-FAILURE-MODES.md`
  with the iOS version — the founder action the register has carried since W-lane days (`:64`).
  → verify: the register's device row filled with date, device and iOS version; any failure
  found becomes a U row or a W row, never an edit to the register alone.

- **U52** (M) — The finder's stages in every sweep. Depends: U9, U28.
  The a11y, keyboard, reduced-motion, contrast and touch sweeps subscribe a check to the finder
  *stage* walk that U28 introduced (welcome, listening, typed, results, booking, refine, and
  the offline and installed variants once U48/U49 exist), so a stage is scanned in the state a
  person actually sees it in, not the page at rest; the one skipped `/about` a11y test is
  resolved rather than skipped.
  → verify: the guarantee register (U28) gains one family per stage per sweep and shows them
  asserted; axe zero violations on every stage; zero skipped tests in the suite;
  `gate:accounting` green.

- **U53** [P] (M) — Fonts and portraits shipped properly.
  Newsreader and the UI face move from the Fontsource `@import` (`app/globals.css:2-3`) to
  `next/font/local` with the files in the tree (licence recorded), `display: swap` and the
  same fallback metrics; the four portraits (0.6–1.0 MB each) become AVIF/WebP through
  `next/image` with `sizes` set per surface; the two `image-size` advisory acceptances due
  2026-11-09 close with this unit if they have not already.
  → verify: an `ACCEPTED_DIFFS` entry for the sub-pixel metric shift if the three-run protocol
  shows one (the font is the same; the loader is not); no font request to a third-party origin in
  the e2e network capture; every portrait under 120 KB at its largest rendered size; the
  `image-size` register empty of past-due acceptances.

- **U54** (M) — The perf gate on real numbers. Depends: U25, U53.
  `src/quality/route-weights.ts` measures compressed transfer size rather than raw bytes, adds
  Web Vitals thresholds (LCP, INP, CLS) from U4's collector against the lab run, and keeps a
  planted-regression fixture (a route that imports one heavy module) that must fail the gate;
  budgets re-pinned downward at `ceil(measured × 1.05)`.
  → verify: the lightest route under 250 KB raw and 90 KB compressed; the fixture fails the gate
  and is removed in the same commit's second step (the AR9 mutation rule); every budget verdict
  `within` or `stale-budget`, none `over`.

- **U55** (L) — The engine as a package. Depends: U44.
  `packages/core` (a pnpm workspace package): the matching engine, the roster types, the
  compliance linter and the honesty copy layer, imported by `app/` through the package boundary
  only; the roster literal (`src/demo/roster.ts:262`) moves behind the U18 record class so the
  package has one way to receive clinicians. This is Phase 2 of `docs/STANDALONE-APP-PLAN.md`
  (§8) and the boundary a native wrapper (U66) or the sibling deployment would consume.
  → verify: an import-boundary test (`app/` may import `@adhdme/core` and nothing under
  `packages/core/src`; the package imports nothing from `app/`); `pnpm verify` green with the
  workspace; the census unchanged or lower (moving files is not growth); the finder e2e green.

- **U56** (M) — The clarifier and tie honesty at scale. Depends: U47.
  Re-measure the clarifier's trigger policy and the tie-honesty threshold against U47's scale
  roster: how often a clarifying question fires, how often it changes the top tier, how many
  ties survive; adjust the *policy* (when to ask) only where the numbers say the current one
  misleads, and record the numbers in `docs/MATCHING-EVIDENCE.md` (a name outside the plan-canon
  regex). The clarifier *at scale for real users* stays gated (G6, matching-plan item 10).
  → verify: the numbers re-derived by a test on the pinned scale roster (a stale number is red);
  the clarifier's question set unchanged or reduced; no new question that could read as a
  symptom prompt (the linter and a review against the TGA boundary register).

### Q4 — June to August 2027: evidence, enforcement and the year's reckoning

- **U57** (L) — The labelled-evaluation harness. Depends: U44.
  `pnpm eval`: ≥200 synthetic, real-shaped requests (composed from the real request grammar,
  never from real people) with slices by language, place, telehealth need, funding and
  accessibility; provisional labels written by the session and marked **NOT CLINICAL —
  PROVISIONAL** in the file header and the report; metrics per tier (precision of the top tier
  against the labels, unmet-ask recall, tie rate) with the report pinned so a ranking change has
  to explain its delta. Month 2 of `docs/MATCHING-YEAR-PLAN.md`, finally, minus the panel.
  → verify: the report re-derived on every verify from the pinned request set (a stale report is
  red); every request passes the linter and the injection defence; the label file's header
  carries the provisional marker and a test asserts it until D-EVAL-PANEL replaces it.

- **U58** (M) — **BLOCKED D-EVAL-PANEL.** Labels from a panel. Depends: U57.
  When the founder engages two clinical reviewers and a consumer panel, their labels replace the
  provisional set under the same harness; disagreement recorded per request; the provisional
  marker removed only when every request has at least two labels.
  → verify: the harness runs unchanged on the panel labels; inter-rater agreement reported; the
  provisional-marker test inverted (its presence is now red).

- **U59** [P] (S) — The honesty-pair mutation probe.
  The first item AR-DOSSIER §3 priced: a testimonial and a rating planted on a *real* route in a
  test-only render must make the honesty sweep and the linter red; the probe runs in `verify`
  beside the existing five probe families.
  → verify: both plants fail; `AUDIT-AR`'s "enforced rules pinned without a probe" count drops by
  the rules the probe covers, in the same commit.

- **U60** (M) — Three mechanizable detectors. Depends: U59.
  `layout.five-then-rest`, `type.serif-display` and `motion.autoplay-stop` implemented as taste
  rules with detectors, in the dossier's order, each with a mutation probe; `type.numeric-typography`
  deferred to U61's pass only if its detector proves stable on the live pages.
  → verify: the `AUDIT-AR` enforced count rises by three with the unenforced count falling by
  three (both derived); each detector's probe fails on its plant; the AR15 hash unchanged.

- **U61** (M) — The remaining probes. Depends: U60.
  `interaction.hover-focus`, `interaction.errors-plain`, `motion.reduced-motion` (its stale
  blocker note in the taste register corrected — reduced motion has been handled at the hook since
  O224) and `type.palette-tokens` against the *live* ceilings; each a probe, not a paragraph.
  → verify: zero enforced rules without a probe in `AUDIT-AR`; the reduced-motion note's fix
  visible in the register diff; the four probes fail on their plants.

- **U62** [P] (M) — The compliance linter's reach.
  `VOCABULARY_BOUND` (`src/compliance/public-surfaces.ts:298-311`) widened from a reviewed
  vocabulary list checked into the corpus with a source per term; `Y4_FIRST_UNIT` moved downward
  so the ~30 pre-Y4 `_COPY` constants are reached (`docs/CDSS-BOUNDARY-W200.md:91-94`); `/demo`
  linted (`COMPLIANCE-DOSSIER.md:47`); inline-composed prose covered by rendered-output fixtures
  — the linter reads what a person reads, not only what a constant holds.
  → verify: the reached-constants census both directions against every `_COPY` export; a planted
  clinical claim composed inline on a public route is red; `/demo` in the linted-surfaces list;
  the vocabulary list's every term carries a source.

- **U63** (M) — Registers into tests, and a threat model. Depends: U62.
  The axe route list derived from `discoverSurfaces()` (both directions, replacing the
  hand-enumerated list at `COMPLIANCE-DOSSIER.md:219-226`); the ingestion-boundary register
  (`docs/SECURITY-W153.md:67-70`) and the operator-display sink (`:125-131`) each given an
  executable proof; a STRIDE threat model for the deployed shape (`docs/THREAT-MODEL.md`) in
  which **every mitigation points at a test** and a mitigation with no test is a listed
  residual, not a claim.
  → verify: a test walks the threat model's mitigation table and asserts each named test exists
  and is not skipped; the axe list census; the two register proofs fail on their plants.

- **U64** [P] (S) — The sibling divergence census.
  `scripts/sibling-census.mts`: given a checkout of `Stef-01/ADHD`, list every shared module
  (`src/demo/clinicians.ts`, the engine, the linter, security and audit machinery) whose content
  differs, with the unit that last touched it on each side; a *report*, never a failing gate,
  because the split was the founder's decision and porting is D-SIBLING-PORT.
  → verify: the script runs against a pinned fixture pair in the tests; the report format
  pinned; the runbook names how to run it before any founder-directed port.

- **U65** (S) — **BLOCKED D-FINDER-PUBLIC.** Let crawlers in. Depends: U7, U43.
  Only when the founder decides the finder is public — which needs the privacy policy out of
  draft (U43), the Ahpra advertising review of every name and sentence on the profile surfaces,
  and a posture that the examples toggle is either off by default or unmistakable to a stranger
  — revert U7's `noindex`/`X-Robots-Tag`, add `/finder` to the sitemap, and record the decision
  in `founder-gates.ts`.
  → verify: the `finder-public-posture` gate flipped with its source; the robots census
  inverted; the AR15 finder cells unchanged.

- **U66** (L) — **BLOCKED D-NATIVE.** A native wrapper. Depends: U48, U55.
  When the founder decides the app belongs in the public stores (G-APP-1) and how (G-APP-2:
  a Capacitor wrapper over the shipped web app first; Expo/React Native only if the wrapper
  fails a named requirement), build it on `packages/core` and the offline shell — after G-APP-3:
  every sweep the web app passes must pass inside the wrapper before any native-only surface is
  written. Phase 3 of `docs/STANDALONE-APP-PLAN.md` (§8).
  → verify: the wrapper passes the e2e suite through its webview on the WebKit project; store
  metadata carries no claim the linter would refuse; no native surface exists that the web
  app lacks.

- **U67** (M) — The year's reckoning. Depends: U34, U62.
  `docs/ONE-YEAR-APPRAISAL-2027.md` — a new plan-canon document (it needs its `docs/PLAN.md` row
  in the same commit): §1's numbers re-derived by `pnpm census` and set beside the originals;
  §2.9 re-scored on the same 0–4 rubric with the evidence per cell; the U ledger reconciled
  (done, blocked-with-decision-named, and anything still available explained); the ratchet's
  misses named with their numbers; and a reckoning on whether a second year's lane is warranted
  — a *recommendation*, not a plan, because laying the next plan is the founder's to commission.
  Claim it last: only when no other U row is `available`.
  → verify: `src/quality/one-year-appraisal.test.ts` re-derives every number in the document
  (the AR34 method); the `PLAN.md` row present; the U ledger's counts equal the document's.

- **U68** (M) — Weight provenance and a sensitivity analysis. Depends: U57.
  `src/matching/weight-provenance.ts`: every scalar in `src/matching/needs.ts` (about forty)
  listed with the reason it has the value it has and the unit that set it (both directions with
  the source, so a new scalar without a reason is red); a sensitivity analysis on U57's request
  set — each weight perturbed ±25% and the tier changes counted — recorded in
  `docs/MATCHING-EVIDENCE.md`. **No learned fitting**: W217's gate stands, and this unit exists so
  that any future tuning is argued from a table rather than felt.
  → verify: the provenance register both directions with `needs.ts`; the sensitivity table
  re-derived by a test on the pinned set; no weight value changed by this unit (a diff census
  over `needs.ts`).

## 5. Blocked from day one

Nine of the sixty-eight rows are laid `blocked` because the appraisal found work that only a
founder decision can start. Each names its decision in §6 and in its ledger note, so the row is a
gate with a name rather than a wish. None duplicates one of the eighteen blocked W rows: live SMS
stays at W174 (G3), PMS credentials at the interop rows (G1), the public directory and clarifier
at scale at W185/W133 (G6), the pathway content at G5, learned ranking at W217 — a U unit that
reaches one of those grounds stops at the same gate and cites the W row.

- **U6** — D-CI-BILLING: the first green Actions run.
- **U31** — D-DORMANT: delete the quarantined gated modules from this deployment.
- **U37** — D-AUTH-PROVIDER: the real auth provider behind U23's seam.
- **U38** — D-PRODUCTION-STORE: connect the SQL adapter to a production database.
- **U43** — D-PRIVACY-COUNSEL: the privacy policy leaves draft.
- **U51** — D-IOS-DEVICE: real-device verification of the installed app.
- **U58** — D-EVAL-PANEL: panel labels replace the provisional ones.
- **U65** — D-FINDER-PUBLIC: let crawlers into the finder.
- **U66** — D-NATIVE: a native wrapper (G-APP-1..3).

## 6. Gates and founder decisions

The inherited gates keep the numbers and the meaning `docs/FIVE-YEAR-PLAN.md` §4 gave them; they
are restated here only so that a blocked U row can name one and `src/quality/one-year-plan.test.ts`
can check that the name is defined. The decisions are new and belong to this plan; each is a
question, the constraints the answer must satisfy, and the rows it opens. A decision is recorded
where the tree already records them — `src/design/founder-gates.ts` with its source-asserting
test — never only here.

- **G1** — real PMS/booking API credentials. Opens nothing in this lane; the interop W rows wait on it.
- **G3** — live SMS to real patients. Opens nothing here; W174 waits on it. Live-SMS-off stays enforced in the adapter.
- **G4** — pilot go-live at a real practice. The matching plan's Month 3 pilot lives here, not in a U row.
- **G5** — clinical pathway content sign-off. Governs the dormant pathway modules U30 quarantines.
- **G6** — network/directory public launch and the clarifier at scale. U56 measures; G6 decides.
- **G7** — TGA-regulated CDSS boundary. Absolute: no U unit adds a symptom-based attribute, and U44's tiers are keyed to clinician attributes only.
- **G8** — third-party model processing (proposed at W104, unratified). No U unit sends patient-derived content to any model API; the semantic-assist item stays refused (§7).
- **G-APP-1** — does the finder go to public stores at all, given the testing posture and the two deployments.
- **G-APP-2** — wrapper (Capacitor over the shipped web app) versus a rewrite (Expo/React Native); the wrapper is the default and a rewrite needs a named requirement the wrapper fails.
- **G-APP-3** — sweep parity: no native patient surface before every honesty, compliance, a11y and touch sweep passes inside the wrapper.
- **D-CI-BILLING** — resolve the account-level Actions billing that has failed every run since 482 (2026-08-21, `total_ms: 0`), or choose another runner. Opens U6.
- **D-DORMANT** — will this deployment carry the W lane's gated product code (pathways, PMS interop, pilots, the directory, MBS, collateral, the verticals), or is `Stef-01/ADHD` its only home? Quarantine (U30) happens either way; deletion (U31) only on this decision.
- **D-AUTH-PROVIDER** — which identity provider stands behind `src/auth/provider.ts`. Constraints: Australian data residency for the identity store; passkeys as the primary factor; a magic-link fallback; no social login on a health surface; a sandbox the contract suite can run against. Opens U37.
- **D-PRODUCTION-STORE** — where the SQL adapter runs in production (Supabase's Sydney region is the default candidate; any Postgres with the migrations applied satisfies U35). Constraints: Australian residency, point-in-time recovery, a named on-call. Opens U38.
- **D-PRIVACY-COUNSEL** — engage privacy counsel on `docs/PRIVACY-COUNSEL-BRIEF.md`: (B1) the counsel; (B2) the APP entity and ABN the policy names; (B3) the position on the Privacy Act s 6 small-business threshold; (B4) the retention ceiling for interest records. Opens U43 and is a precondition of D-FINDER-PUBLIC.
- **D-IOS-DEVICE** — the founder names a physical iPhone and an iOS version to verify the installed app on. Opens U51.
- **D-EVAL-PANEL** — engage two clinical reviewers and a consumer panel to label the evaluation set; the labels are the panel's, the harness is U57's. Opens U58.
- **D-FINDER-PUBLIC** — is the finder public? Requires B1 answered, (B5) an Ahpra advertising review of every name and sentence on the profile surfaces, and a posture on the examples toggle a stranger cannot mistake. Opens U65; until then U7's `noindex` stands.
- **D-NATIVE** — the three G-APP gates taken together, in order. Opens U66.
- **D-SIBLING-PORT** — which shared-code changes port to `Stef-01/ADHD`, and when. No U row is blocked on it; U64's census reports into it, and a port is a founder-directed session on the other repository, never a U unit here.

## 7. Refusals — what this plan will not build

Recorded so the refusal costs the same as a unit and cannot be silently reversed by a later session.

- **Collaborative filtering or any "people like you chose" signal.** There are no people; there will be no such record.
- **LLM-written match reasons.** Every explanation stays a sentence the honesty layer composed from a factor the reader can see (W213's floor); G8 stands.
- **Engagement ranking.** No click, dwell, return or booking signal enters the order (the matching plan's item 12 stays gated behind real bookings *and* a founder decision, and is not in this lane).
- **Learned weights.** W217's gate; U68 writes weights down and measures their sensitivity so that tuning, if ever, is argued — it does not fit them.
- **A severity taxonomy or symptom triage of any kind.** G7. U44's tiers are about the roster's declared attributes, never about the person.
- **Deferred acceptance or any matching that binds the clinician's side.** A finder orders a list for one reader; it does not allocate.
- **Reciprocity (matching-plan item 9).** Needs more than five clinicians and is a network concern; it belongs to `Stef-01/ADHD` if anywhere.
- **Semantic assist beyond explainable expansion (item 11).** Embedding similarity that cannot be shown as a factor would breach the floor; the reach corpus is the explainable form and is complete at 500 entries.
- **Any testimonial, rating, star, "top-rated" or "specialist beside a niche scope" surface.** `CLAUDE.md` §6, and U59 makes the refusal a probe.
- **A second finder state carried in the URL.** §2.8 Q-A's rule: patient text never appears in a URL, a history entry, a log line or an analytics event.

## 8. What this plan absorbs and retires

One live plan is the point of `docs/PLAN.md`; this section says exactly where each retired plan's
open items went, so that closing them loses nothing.

**`MATCHING-YEAR-PLAN.md` → REFERENCE.** Its Q1 reach work, Q-M M1–M10 and the continuous lanes
were executed on the ledger (O1–O226) and stand. Of its remaining numbered items: Month 2's
labelled evaluation → **U57** (harness) and **U58** (panel, D-EVAL-PANEL); the Month 3 pilot →
**G4**, no U row; item 9 reciprocity → **refused** (§7); item 10 clarifier at scale → **U56**
measures, **G6** decides; item 11 semantic assist → refused beyond explainable expansion (§7);
item 12 outcome signal → gated, not in this lane; item 13 weight fitting → **U68** provenance and
sensitivity, no fitting; item 14 interleaving → folded into **U57**'s harness (variant reports
against the same set); item 15 year-end appraisal → **U67**. Standing debts: #3 iPhone field
verification → **U11**, **U50**, **U51**; #4 speech locales → **U46**; #5 privacy draft → **U43**;
#6 GA dark → **U13**; #8 MATCH-1 stays a latent finding (`src/quality/latent-findings.ts`); #11 CI
→ **U6**; #12 the review skills → §9. M11/M12 stay founder-gated where the ledger left them.

**`AESTHETIC-REVIEW-PLAN.md` → CLOSED.** AR1–AR40 are done on the ledger. `docs/AR-DOSSIER.md`
§3's priced gaps are **U59**, **U60**, **U61** in the dossier's own order; the judgment-call rules it
said must not be mechanised stay unenforced and pinned. The accepted-diff chain and the three-run
protocol continue as this lane's pixel witness.

**`STANDALONE-APP-PLAN.md` → REFERENCE.** Phase 1a shipped (O220/O221/O225); 1b → **U49** and
**U50**; 1c → **U48**; Phase 2 → **U55**; Phase 3 → **U66** under **D-NATIVE** (G-APP-1..3 kept
verbatim in §6). Its §4 must-not-lose list is inherited by every unit that touches the finder.

**`FIVE-YEAR-PLAN.md` — untouched.** CLOSED, W1–W260, its §6 expansion rule standing; the
eighteen blocked W rows keep their gates and this lane cites them rather than re-laying them
(§5). **`docs/PLAN.md`** gains one ACTIVE row for this document and changes the three rows above;
nothing else in it moves.

**The sibling deployment.** `Stef-01/ADHD` shares the roster, the engine, the linter and the
security and audit machinery. This plan does not port anything there; **U64** measures the
divergence and **D-SIBLING-PORT** is the founder's call on what crosses and when.

## 9. Method — the skills used and how the plan is enforced

**Skills.** `adhdme-taste` (this tree's own design law) and `frontend-design`'s brief-first method
governed every UI unit's scope; `impeccable`'s MODE vocabulary decided what each surface is for
(the finder, the profiles and the console are Operate; the story landing and the GP join page are
Persuade) and its audit shape decided §2's form — a finding is a location, a severity and a unit;
`adhd` (divergent ideation) was used for the two questions in §2.8 and nowhere else, per its own
pre-flight gate; `design-motion-principles` bounds U49's installed-mode motion; Vercel's
`react-best-practices` and `composition-patterns` govern U25 and U26, `web-design-guidelines` the
a11y sweeps of U52. Where any of them met `adhdme-taste` or `CLAUDE.md` §6, the tree's laws won.

**Not installed, and said so.** `code-review`, `security-review`, `simplify`, `supabase` and
`run` are named in `CLAUDE.md` §5 and are not installed in this tree (the matching plan's
standing debt #12). The refactor lane was designed without them — the census, the ratchet and the
mutation probes are what a review skill would have asked for — and each is to be installed when
the founder directs, with U36 (security review), U34 (simplicity audit) and U35 (Supabase) the
units that would use them first.

**Enforcement.** `src/quality/one-year-plan.test.ts` runs on every `pnpm verify` and asserts:
the plan's unit ids equal the ledger's U rows in both directions and in numeric order; every unit
carries a `→ verify:` clause; the `[P]` set is equal in the plan and the ledger notes, and a `[P]`
unit has no dependency and is not blocked; the blocked set is equal in the plan and the ledger,
and every blocked row names a gate or decision defined in §6; every `Depends:` names an existing
lower-numbered unit, and no available unit depends on a blocked one; the plan has four quarters
and more than sixty units. `plan-canon.test.ts` pins this document as the only ACTIVE plan.
`ledger-integrity.test.ts` holds the U rows to the same column, status, owner, date and SHA laws
as the W and AR rows. U14's `pnpm census` is the number witness; U34 and U67 re-derive it.

## 10. Definition of done for the year

In the five words of §0. **Durable**: no console or interest write lives only in a process or a
file that a redeploy forgets (U17–U19, U35, U38 or its decision named); consent, retention and
erasure cover every record class (U39–U40). **Secure**: headers and an enforced CSP (U1, U13),
Secure cookies and a boot-time posture assertion (U2), one limiter and origin check (U22), an auth
seam with the mock refused in production (U23), SQL-layer isolation proven adversarially (U36).
**Reachable**: WebKit in the suite (U11), every finder stage swept in its real state (U52), an
offline shell and installed-mode chrome (U48, U49), a ranking that can say no (U44) over a real
gazetteer (U45), the lightest route under 250 KB (U54). **Honest**: the linter reaches every
sentence a person reads (U62), every enforced taste rule has a probe (U59–U61), and every register
that was prose is a test (U63). **Verifiable**: every one of the above is a check that can fail,
and the year's numbers are re-derived, not remembered (U34, U67).

Measured, at U67: every §2.9 layer scores at least 3 on durability, security and reachability and
4 on honesty and verifiability; every §2.5 ratchet target is met or its miss is recorded with the
number and the reason; the nine blocked rows are done or still blocked with the decision named
and dated; the suite carries zero e2e, a11y or touch exemptions and zero skipped tests; and the
AR15 accepted-diff chain is unbroken from `0b0c8ffc…` (O226) to the year's last capture.
