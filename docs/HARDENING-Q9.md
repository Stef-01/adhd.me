# Q9 hardening (W116) — code review, security review, scoping sweep

Quarter under review: **W105–W115**. Deferred privacy work (W105 staff gate, W106 record
classes, W107 allowlist re-review) and the credential stack (W108 record model, W109 evidence
vault, W110 verification workflow, W111 Ahpra lookup, W112 expiry, W113 console, W114 scope
statements, W115 provenance report).

**Result: six findings, six fixed. Zero criticals.**

The gate is "zero criticals", and the honest reading of that is not "nothing found" — it is
that nothing found was critical. Three of the six were mine, from units that shipped green in
this same session, and the worst of them had been in `main` for two units before anything
noticed.

## Findings

| # | Severity | Unit | Finding |
|---|---|---|---|
| 1 | High | W109 (mine) | A source file shipped containing NUL bytes, so git shows it as binary and it produces **no reviewable diff** |
| 2 | High | W109 (mine) | `MAX_EVIDENCE_BYTES` was compared against `content.length` — code units, not bytes — so an "8 MB" limit admitted up to ~4× that |
| 3 | Medium | W110 (mine) | `replayVerification` reset a credential on a duplicate `submitted`, silently discarding a verification's provenance |
| 4 | Medium | W81 (builder-B) | The only console server action with no membership check — authorization by coincidence of roster contents |
| 5 | Low | W114 (mine) | `SCOPE_LABEL_RULES` carried `no-urgency` twice; it exists in both linters and the union was not deduplicated |
| 6 | Low | W113 (mine) | Two import statements from the same module |

### 1. A source file that review could not read (High)

`src/credentials/vault.ts` shipped in W109 with three NUL bytes inside a template literal —
the separator in `deriveRef`'s hash key. It compiled. Its tests passed. The tree-walking
registry checks (W51 store resetters, W106 record classes) still matched their regexes,
because Node reads a NUL as a character like any other, so the file was correctly forced to
declare itself in both registries.

What it broke was **review**. Git classifies a file containing NUL as binary: `git diff` and
`git show` print `Binary files differ` and nothing else, and ripgrep and grep skip it by
default. It surfaced here only because a `grep` during this sweep answered `binary file
matches` instead of a line number.

For a repo whose entire discipline is that the reasoning lives in the diff, a file with no
diff is a hole in the process rather than a bug in the code. Two units landed on top of it.

**Fixed**, and made structural: `src/lib/source-hygiene.test.ts` walks the tree and fails on
any NUL byte in a text source. Proven non-vacuous by reintroducing the byte and watching it
fail with the offending path named — the W107 discipline, because noticing a tendency does not
stop it recurring and a lint does.

### 2. A byte limit that did not measure bytes (High)

`storeEvidence` refused a document when `input.content.length > MAX_EVIDENCE_BYTES`, and
recorded `byteLength: input.content.length`. `String.length` counts UTF-16 code units. For
anything but ASCII that is not the byte count: 2× for accented Latin, 2× for most emoji, up to
4× for a four-byte sequence counted as two units against a limit denominated in bytes.

So a constant named `MAX_EVIDENCE_BYTES` was admitting multiples of its stated maximum, and a
field named `byteLength` was recording a number that was not bytes. Neither is exploitable in
the synthetic build — nothing uploads yet — but a resource limit that measures something other
than what it says is a limit nobody downstream can reason about, and the field would have
become the number a storage bill was estimated from.

**Fixed**: `evidenceByteLength()` measures UTF-8, both call sites use it, and a test stores a
document under the limit in characters and over it in bytes and asserts the refusal.

### 3. A duplicate submission could erase a verification (Medium)

`replayVerification` handled a `submitted` event by unconditionally overwriting the credential's
record. `appendVerification` refuses a second `submitted`, so no log built through the module's
own API can contain one — but `replayVerification` is exported and total over *any* log,
including one rehydrated from storage in a later quarter, and the consequence of a reset is
silent loss of exactly the provenance the log exists to keep.

**Fixed**: replay now ignores a duplicate `submitted` rather than resetting. Both behaviours
are unreachable today; the difference is how the module degrades when the guarantee upstream
of it stops holding, and one of them loses evidence.

### 4. Authorization by coincidence (Medium)

`app/console/case-mix/actions.ts` (W81) was the only console server action with no
`authorize()` call. It resolves the acting clinician from the session and can only ever act on
that clinician, so nothing was exploitable and no privilege could be escalated — the W51
failure (an action whose store takes no caller identity) is not present here.

What was missing is the decision. Being on the clinician **roster** is not being a member of
the practice: the roster is a list of names typed during setup, and an email can sit on it with
no membership row. "Authorized because the roster happens to contain your address" is not a
rule anybody chose, and the next reader cannot tell whether the omission was reasoned.

**Fixed**: the same `view_dashboard` check every other action carries, with a `denied` message
on the page.

### 5 and 6. Low

`SCOPE_LABEL_RULES` unioned two linters' rule names without deduplicating, and `no-urgency`
exists in both — a caller rendering the list would show a rule twice. Deduplicated. And the
W113 page imported from `@/credentials/ledger` on two lines. Merged.

## The scoping sweep (W103 observation 4)

W103's observation was that captured-and-inert features accumulate: W74's contact preferences
and W95's outreach plans are stored and unused because the send path is unwired behind G3. Q9
adds to that list, deliberately, and it is worth naming so the total is visible rather than
discovered later:

| Capability | Built in | Consumed by | Waiting on |
|---|---|---|---|
| Evidence vault reads | W109 | nothing | W117's G6 position, then a console |
| `liveCredentials` | W112 | nothing | the first surface that acts on a credential |
| Scope statements | W114 | nothing | founder sign-off on the values themselves (G5) |
| Provenance report | W115 | no route renders it | a practice-facing surface |

This is not drift. Each is a gateway built ahead of its consumer so that the consumer cannot be
written without it — `liveCredentials` in particular exists so that the first thing to read a
credential physically cannot read an expired one. But four unconsumed capabilities in one
quarter is the pattern W103 flagged, and the honest statement is that **Q9 shipped
infrastructure, and the quarter that consumes it is where its design gets tested for real.**

## What was checked and found clean

- **Tenancy.** Every console server action now authorizes; no `practiceId` anywhere in `app/`
  is read from a form or a query parameter (the one that looked like it was, `ops/actions.ts`,
  takes it from the store).
- **Cross-tenant reads.** W109's vault matches ref *and* practice in one lookup; W113's ledger
  scopes by practice and then by subject. Both have tests that a second practice's rows are
  invisible rather than merely filtered.
- **No dangerous rendering.** No `dangerouslySetInnerHTML`, `eval`, or `new Function` anywhere
  in `app/` or `src/`.
- **Mock routes.** `/api/mock/credentials` carries `assertMockRoutesEnabled()` like its
  siblings.
- **Founder gates.** Nothing in Q9 ships a clinical value: `SHIPPED_SCOPE_STATEMENTS`,
  `MEHERR_STAFF` and `SHIPPED_SAFETY_RULES` are all empty and all pinned by tests. W114's
  `unstatedLifetimeDays` is administration rather than clinical content, is stated as the
  founder's to set, and errs short — a test pins the direction, because the asymmetry is
  one-sided.
- **Advisories.** `audit:gate` green, two accepted, neither past its review date; W107's
  November date deliberately not extended.

## Method note

Three of six findings were in code that had passed `pnpm verify` green in this session, which
is the point worth carrying forward: the gate proves the tests agree with the code, not that
either is right. Findings 1 and 2 were both invisible to every test in the suite because they
were about the file and the units of a number, not about behaviour. Both are now covered by
checks that read the tree rather than the behaviour — which is the same shape as W106 and W107,
and the third time this quarter that a tree-reading check caught something a behavioural test
could not.

## Verification

`pnpm verify` green. Full e2e re-run after the case-mix authorization change.
