# Roadmap

No gates, no ledger, no units register — those were deleted on 2026-09-03 on purpose. This is a
working checklist, not a law. Check items off as they land; rewrite sections freely as the product
changes underneath them. If a line stops being true, delete it rather than explaining it away.

Baseline (what exists today, post-strip): a Next.js 15 / React 19 finder (`app/finder-stages/*`) —
welcome, listening (voice + typed), scenarios, type, profile, nearby-map, compare, results, booking
— backed by a matching engine and a synthetic 15-archetype clinician roster (`src/demo/`), a Gold
Coast gazetteer (`src/geo/`), and a large practice-facing console (`app/console/*`) covering intake,
capability, capacity, credentials, matching, outcomes, referrals, reporting, and more. Public pages
cover the founder story, clinician walkthrough, practices, examples, FAQ, privacy, terms.

## Q3 2026 (Sep–Nov) — make the redesign real

The founder's words were "optimise and redesign from the ground up." Read literally: don't just
polish the existing shell, question it.

- [ ] Full-app aesthetic pass — see `AESTHETIC.md`. Every screen gets looked at with fresh eyes,
      not just the ones that were mid-refinement when the ledger was deleted.
- [ ] Re-walk the finder end to end (welcome → listening → profile → compare → results → booking)
      as a first-time user on a phone, at night, tired. Cut anything that costs a decision without
      earning it back. "Delete before you shrink" — the prior design ethos was right; keep it.
- [ ] Console information architecture review: 25+ subsections under `app/console/*` is a lot of
      surface for a demo. Decide what's load-bearing for the practice-side story vs. what's
      speculative breadth that dilutes the demo. Consolidate or cut, don't just reskin.
- [x] **Tracked** (2026-09-03) — each open founder decision from `README.md` §"What needs a founder
      decision before this goes live" now carries the live in-tree anchor where it is actually
      declared, and that section is stated to be the single index. A sixth was added: whether
      `/clinicians` should publish clinical guidance to GPs at all. The strip had quietly broken
      this — the section claimed the flags were "recorded in the suite as well", and they are not:
      `PRODUCT_FLAGS`/`STANDING_FLAGS` lost their tests and nothing imports them. No test was added
      back, because that is the deleted apparatus wearing a new name; the README is the tracking.
- [ ] **Resolve them** — and this one is not an engineering task, which is why it is split from the
      line above. Ahpra review of the *name*, Dr Saxena's confirmation of his own listing, source
      confirmation for the indicative figures and the NSW/QLD pathway claim, opening and checking
      the AADPA/NICE/TGA links, the founder portraits, and whether `/clinicians` should publish
      clinical guidance at all. Every one is a founder or legal call. **Nothing in this repo may
      answer one, and an agent working this roadmap must not tick this line.** It stays open until
      a human with the standing to decide has decided, and the decision is written down here.
- [x] Re-establish a green baseline (2026-09-03) — `pnpm verify` is green on `main`. It was red:
      `src/tenancy/rollout.test.ts`'s non-vacuity probe failed *only* under full-suite load, because
      its n=50 timing sample was ~31µs, shorter than a scheduler quantum, so parallel workers
      inflated the small sample and compressed the ratio through the bound. The harness now derives
      its repeat count from the size (equal items per sample), which puts both sizes in the same
      timer regime and makes the smallest sample milliseconds. Bound and margins unchanged.
      `pnpm e2e` confirmed green on the same tree: **260 passed in 6.8m**, no flakes. (The
      `fault fixture: the render error` lines in that run are an intentional fixture, not a
      failure.) So both halves of the baseline are green as of 2026-09-03.
- [ ] **Monthly design audit — `adhdme-taste` then `impeccable`, every month, never ticked**
      (founder-directed 2026-09-05: "there is so much AI slop everywhere"). On or about the 5th of
      each month, one session runs the tree's own taste law (`adhdme-taste`) over every patient
      surface, then `impeccable`'s audit and critique playbooks (`/audit`, `/critique`, with its
      MODE vocabulary — the finder, profile and console are **Operate**, the story and join pages
      **Persuade**), and writes what it found and what it changed into `AESTHETIC.md` under a dated
      entry. The pass is about the three default AI looks `frontend-design` names and the slop
      `impeccable` catches — filler copy, decorative motion, cards inside cards, unearned gradients,
      generic type — and about fluidity: every screen change, open, close and arrival on the house
      motion scale, nothing snapping. Standing item: tick nothing here, date each pass in
      `AESTHETIC.md`. **Next due: 2026-10-05.** Last run: 2026-09-05 (this session — the
      transitions.dev component pass; see `AESTHETIC.md`).
- [ ] Keep it green. No new ledger; just don't leave `main` broken overnight. If a timing test
      starts flaking again, read the harness note in `src/tenancy/rollout.test.ts` first — the
      failure mode there was a sample too short to measure under parallel-worker load, and it will
      look like a real regression rather than an instrument problem. Standing item, never ticked.
      Last confirmed green 2026-09-04 after the profile-facts and type-screen passes: `pnpm verify`
      green, `pnpm e2e` at 261 passed in 7.1m, no flakes (262 with the type-screen guard added after
      that run; that spec file re-run green on its own). Re-confirmed 2026-09-04 after the finder
      shell was given the container context its `cqw` rules had always assumed: `pnpm verify` green,
      `pnpm e2e` **262 passed in 7.0m**, no flakes. Re-confirmed again 2026-09-04 after the
      booking-stage pass: `pnpm verify` green (3698 unit tests) and `pnpm e2e` **262 passed in
      7.0m**, no flakes — though it took four attempts to get one trustworthy run, for reasons now
      written up in the two traps below, all of them process contention and none of them the app.
      **One trap worth knowing:** killing `pnpm e2e` mid-run leaves a half-written `.next`, and the
      next build dies with `TypeError: a[d] is not a function ... Error occurred prerendering page
      "/"`. That reads exactly like a product regression and is not one — `rm -rf .next` and rebuild.
      **And a second one, which is why every session picks a new port.** On Windows `pnpm e2e`
      **strands its own server.** `playwright.config.ts` runs `webServer.command` as
      `next build && next start -p ${PORT}`, so `next start` is a *grandchild* of the shell
      Playwright spawns; Playwright kills the shell and the grandchild survives. Every run leaves a
      `next start` listening on its port forever, which is the real reason the port has to be
      changed each session — the old ones are still occupied — and the strays are not idle, they
      compound. Found on 2026-09-04 with **five** abandoned servers listening (3455, 3471, 3472,
      3475, 3491, started 01:52 through 07:06) and 46 `node` processes, and the cost was legible in
      the suite itself: the same tree ran **262 passed in 7.2m** early in the session and then
      **8 failed / 254 passed in 8.3m** later, with all eight failures in one spec file
      (`finder-flow.spec.ts`), all of them 20s timeouts waiting for `.clinician-list`, and all 17
      tests in that file passing in isolation. That is contention, not a regression — the exact
      instrument-vs-product confusion this item warns about, in a new place. Killing the five
      strays took `node` from 46 processes to 17.
      **AND THE STRANDED SERVERS ARE THE SMALL HALF OF IT.** Chasing the above turned up the
      bigger leak: `pnpm e2e` can strand *the entire run* — `pnpm e2e` → `playwright test` →
      `pnpm exec next build` → `next build`, five live processes — long after the foreground
      command has exited and reported. That is worse than a stranded `next start`, because a
      stranded `next start` only competes for CPU whereas **a stranded `next build` is writing
      `.next` while you are.** Two builds in one directory is what actually produced the
      "corrupted `.next`" signature at the top of this note, and it produced a second and third
      face of the same thing, so all three are one root cause:
        * `TypeError: a[d] is not a function` prerendering `/` (a chunk read while being rewritten)
        * `ENOENT: ... open '.next/server/pages-manifest.json'`
        * `PageNotFoundError: Cannot find module for page: /_document`
      Every one of those names a page or a file and reads like a product or dependency fault; none
      of them names the process that caused it. On 2026-09-04 `rm -rf .next` followed by `pnpm
      build` failed three times in a row with those three errors while a leaked `next build` from
      an earlier run was still going, and then succeeded first try — with no source change at all
      — the moment that tree was killed. So `rm -rf .next` is the *second* step, not the first, and
      on its own it will look like it did not work.
      **The check, in order, before believing any e2e or build failure:**
      `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` and look for any `adhd.me`,
      `next build`, `next start` or `playwright test` in the command lines (a listening-port sweep
      alone will NOT find a stranded `next build` — it has no port); kill that whole tree; *then*
      `rm -rf .next`; *then* build; *then* run the suite, serially, with nothing else touching the
      repo. Do not run `pnpm verify` and `pnpm e2e` concurrently — they share `.next`.
      **2026-09-05 — `dashboard.spec.ts` was red on `main`, and it was the test, not the page.**
      Root-caused with `systematic-debugging` rather than retried: the failure snapshot showed
      `main` holding only the `Loading…` line from `app/console/loading.tsx`, which U3 added
      *after* W14 wrote the spec. The spec had put its 30s allowance on the navigation ("the first
      render builds the full sim"), but a streaming boundary lands the URL instantly and moves the
      sim's ~4.9s (measured cold) onto the first tile, which still had Playwright's 5s default.
      Fix: the allowance moved to the content. The page renders correctly — north star 120.6,
      nothing withheld. **Proposed, not done:** warm `getDashboardData()` at server start (in
      `instrumentation.ts`'s `register()`) so the presenter's first click on the dashboard does not
      sit on a loading line for five seconds. That is a product change and gets its own design.

## Q4 2026 (Dec–Feb) — depth over breadth

- [x] Matching engine: the "why this order" explanation is legible in the UI (2026-09-03). One
      sentence under the results list heading, from a new `orderNote()` in `src/demo/clinicians.ts`
      that branches on `matchQuality` — an order is claimed only in the `informed` case, and the
      `tied`/`unserved`/`unmatched` cases say plainly that there isn't one rather than letting a
      list read as a ranking. It derives from the same `needsFor` read the ranking scored, names
      the asks strongest-weight-first, and the "nearer comes first" clause turns on exactly the
      condition `rankCliniciansNear` reorders on. See `AESTHETIC.md`'s `results-stage.tsx` entry
      for the design reasoning; tests in `src/demo/order-note.test.ts` and one e2e walk.
      **Not closed by this:** the *profile* still explains a single clinician's match rather than
      its position, and the console's matching module has its own explanation surface. This line
      was about the results order, and that is what is now visible.
- [ ] Practice console: pick the 3–4 modules that best carry the demand-matching/shared-care story
      (likely `matching`, `capacity`, `outcomes`, `referrals`) and bring those to real depth —
      empty states, loading states, error states, keyboard access — before touching the rest.
- [ ] Geo: decide if Gold Coast stays the flagship regional demo or if a second region should exist
      to prove the gazetteer generalises. Don't add a third without a reason.
- [ ] Voice input (`src/voice/speech.ts`): verify it degrades honestly (visible, non-blocking
      fallback to typed input) on browsers/devices without speech support.

## Q1 2027 (Mar–May) — growth surface

- [ ] Learn modules (`app/learn-modules.tsx`) and the two knowledge quizzes: audit against current
      AADPA/NICE/TGA guidance (README flags these links as never actually opened from this tree —
      open them, confirm they still resolve and still say what the copy implies).
- [ ] Public pages (story, practices, examples, FAQ) get an SEO and share-surface pass — this is
      where a prospective practice or a person searching at 2am actually lands first.
- [ ] Examples page (`app/examples/page.tsx`) — make sure the six-plus example personas actually
      demonstrate range (care area, language, reach), not just repeat the same shape.

## Q2 2027 (Jun–Aug) — scale-readiness

- [ ] Accessibility re-sweep against WCAG 2.1 AA (PRODUCT.md's own bar) — this rots quietly as
      screens change; don't assume the last sweep still holds.
- [ ] Performance: re-baseline bundle size and route weight now that `perf:gate` no longer runs
      automatically. Know the numbers even without an enforced budget.
- [ ] Revisit whether the console needs real auth/tenancy hardening if it's ever shown to an actual
      practice, vs. staying a synthetic-data demo indefinitely — that's a founder call, not an
      engineering default.

## Explicitly not doing (until someone asks)

- Rebuilding `BUILD-STATE.md`, the O-numbered unit ledger, gate dossiers, or any founder-facing
  registers. That apparatus was removed on purpose; resurrecting it under a new name defeats the
  point.
- Adding production credentials, live SMS, symptom-based triage, testimonials, or ratings —
  PRODUCT.md rules these out explicitly.
- Generating a face for any real person (Dr Saxena, Dr Anusha Saxena, the founders). Synthetic
  profiles stay typographic monograms.
