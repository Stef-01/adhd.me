# ADHD.ME Deploy Runbook (U12, v1) — the finder deployment

What a push to `main` does, how to tell whether the thing that went up is answering, how to put
the previous build back, where the reporter writes, and who is on call. `docs/SUPPORT-RUNBOOK.md`
is the clinical and complaint side; this is the machine side. Held to the tree by
`src/ops/smoke.test.ts`: every step `pnpm smoke` runs is named below, in the words the script uses.

## 1. What a push to `main` does

- `main` is the only ref Vercel builds. `vercel.json`'s `ignoreCommand`
  (`[ "$VERCEL_GIT_COMMIT_REF" != "main" ]`) skips every other ref, so there are no preview
  deployments and **every push to `main` is a production deploy** of that commit. There is no
  staging in front of it. The local gate — `pnpm verify`, then the unit's e2e — is the only
  pre-merge verification, which is why it runs on the exact tree that is pushed.
- The build is `pnpm install --frozen-lockfile` then `pnpm build` (`vercel.json`). At boot the
  server runs `instrumentation.ts`'s `register()`: the posture assertion (`src/lib/env.ts`) and
  the reporter selection. A production process with `ADHDME_TOKEN_SECRET` unset, with
  `ADHDME_ENABLE_MOCK_ROUTES=1` or `ADHDME_ENABLE_DEMO=1` on the production deployment, or with an
  `ADHDME_REPORTER` naming no adapter, **refuses to serve**: the reasons are the first lines of
  the boot log and every request answers 500 ("Failed to prepare server"). That is the intended
  failure — fix the variable in the Vercel project settings and redeploy; do not weaken the
  assertion.
- Vercel exposes the commit as `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` when system environment
  variables are on; `/api/health` reports it as `sha`. A deployment answering `sha: null` was
  built without it — a local build, or the setting is off.
- The free tier allows ~100 builds a day and `main` is the only consumer. Never retry a
  quota-failed deploy in a loop; the next push builds when the quota resets.

## 2. Is it answering? — `pnpm smoke`

Run the smoke against the origin that just deployed. It sends four requests with no cookie and
no secret, prints one line per step, and exits non-zero on any miss:

```
pnpm smoke https://<the production origin>
pnpm smoke http://localhost:3100        # against a local `next start` (needs ADHDME_TOKEN_SECRET)
```

The steps, in order, are exactly the ones `src/ops/smoke.ts` carries (the test holds this list to
that one):

| Step | Request | A healthy origin answers |
|---|---|---|
| 1 | `GET /` | 200 and an HTML page |
| 2 | `GET /finder` | 200 and an HTML page |
| 3 | `GET /api/health` | 200, `Cache-Control: no-store`, and JSON with `ok: true`, a `bootedAt` instant and a `reporter` name |
| 4 | `GET /console` | sign-in, from the session guard: a 307 to `/console/signin`, or a 200 whose body refreshes to it |

Each request is made with `redirect: "manual"`, so a page that has started redirecting somewhere
reads as the miss it is. Step 4 is the one server-side proof without a credential: a signed-out
`/console` reaches sign-in only when the session guard ran. Today it answers as a 200 whose body
carries `<meta http-equiv="refresh" content="1;url=/console/signin">` — the guard calls
`redirect()` inside the console's loading boundary (`app/console/loading.tsx`, U3), so Next has
already streamed a 200 shell by the time it runs; a guard that ran before the shell would answer
307 with a `Location` header, and the smoke accepts either.

A miss reads like `MISS 500 GET /api/health — status 500, expected 200` or
`MISS --- GET / — no response: fetch failed: connect ECONNREFUSED …`. A whole-suite miss is the
process not serving (§1's refusal, or the deploy has not switched yet — Vercel promotes a build
only after it is ready, so wait for the deployment to read "Ready" and run again); a single miss
is a route, and the reporter (§4) has the error.

## 3. Reading `/api/health`

```
curl -s https://<the production origin>/api/health
{"ok":true,"sha":"<40 hex>","bootedAt":"2026-09-02T11:05:50.258Z","store":"jsonl-file","reporter":"console"}
```

- `ok` is always `true` when the process answers at all — the endpoint's job is to prove the
  process is the build that was expected, not to grade it. A non-200 or no answer is the signal.
- `sha` is the commit the build came from (`null` for a local build). **Compare it with the SHA
  you pushed.** A push that does not change `sha` within a few minutes did not deploy: check the
  Vercel deployment list for a failed build or a quota refusal.
- `bootedAt` is derived from the process's own uptime. It moves on every deploy and every cold
  start; a `bootedAt` older than the last deploy means the new build is not the one answering.
- `store` names the persistence adapter (`jsonl-file` through the synthetic phase; U17–U19 change
  it) and `reporter` the sink `ADHDME_REPORTER` selected (`console` unless set).
- The response is `Cache-Control: no-store` and `dynamic = "force-dynamic"`; a cached answer would
  defeat every use above, so a monitor that sees the same `bootedAt` across a known deploy should
  suspect a cache in front of the origin, not the endpoint.

## 4. What the reporter shows

Every server error, Web Vital and CSP violation passes through `src/ops/reporter.ts` (U4) on its
way out of the process. With the `console` sink — the only adapter written, and the one in use
until U16's decision names a hosted sink — each report is **one JSON line in the Vercel runtime
log** (project → Logs, or `vercel logs <deployment>`), prefixed by its kind:

- `[adhd.me server-error] {…}` on **stderr**: `at`, `sha`, `route` (`path` with the query cut
  off, and `method`), the router's own `routerKind`/`routePath`/`routeType`, and `error`
  (`name`, `message`, `digest`, `stack`). Next's `onRequestError` hands every uncaught render,
  route-handler and action error here. The `digest` is the one Next attaches to the error the
  boundary (U3) received, so a browser console's digest finds its server stack by that string;
  the boundary itself shows the reader a sentence and never the digest.
- `[adhd.me web-vital] {…}` on stdout: `metric` (LCP, INP or CLS), `value`, `rating`, `path`.
- `[adhd.me csp-violation] {…}` on stdout: `documentPath`, `directive`, `blocked`,
  `disposition` — the enforced policy (U1, enforced since U13) saying what it blocked;
  `disposition` is `"enforce"`, so each line is a page that lost a script, style or request.

**The payload law**: a report never carries a query string, a header or a body — a finder
request is the most personal text this product handles and it travels in exactly those places.
`src/ops/reporter.test.ts` plants a request string in every channel and proves it absent. Do not
add a field that breaks this to a sink.

The last fifty reports are also kept in a process-global ring; `/api/mock/reports` reads it, but
only with `ADHDME_ENABLE_MOCK_ROUTES=1`, which the production deployment refuses at boot (§1), so
on production the log is the only reader.

## 5. Rolling back — promote the previous build by SHA

Vercel keeps every production build, and a rollback is promoting an earlier one; nothing is
rebuilt, so it takes seconds and burns no quota.

1. Find the last good SHA: the `sha` that `/api/health` reported before the bad deploy, or the
   commit before it on `main` (`git log --oneline -5 origin/main`).
2. In the Vercel dashboard: project → **Deployments** → the production deployment whose commit
   matches that SHA → **⋯ → Promote to Production** (the same menu offers **Instant Rollback**
   to the immediately previous production deployment, which is the one-click form when the bad
   build is the newest). With the CLI: `vercel ls` to find the deployment URL for the SHA, then
   `vercel promote <deployment-url>`; `vercel rollback` steps back one.
3. Confirm: `pnpm smoke https://<the production origin>` green, and `/api/health` reports the
   good `sha` and a fresh `bootedAt`.
4. Then fix forward on `main`. **Never force-push `main`** to "undo" the commit — the concurrency
   laws in `CLAUDE.md` §8 apply to a rollback exactly as to anything else; a revert commit is the
   git side of the same rollback, landed through the ordinary gate. Record the incident in
   `BUILD-STATE.md` and, when a patient-facing surface was affected, follow
   `docs/SUPPORT-RUNBOOK.md`'s severities.

## 6. Who is on call

**The founder, until the founder names a person.** That is recorded as the founder's own item in
`docs/SUPPORT-RUNBOOK.md` (Contact chain), not as a gate here: this runbook works without a
rota, because every action above is one a person with the Vercel project and this repository can
take alone. The build loop is never on call (`SUPPORT-RUNBOOK.md`, builder/loop note): a production
incident is a page to a human, and the loop's next firing will read about it in the ledger.

## Change log

- v1 (U12, 2026-09-02): first version, with `pnpm smoke` and `src/ops/smoke.test.ts` holding
  §2's table to the script.
