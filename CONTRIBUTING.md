# Contributing to this repository

This repo has several concurrent writers: interactive Claude sessions, an hourly autonomous
build loop, and humans. On 2026-08-19 a force-push to `main` from a stale clone erased ~40
merged commits (six merged PRs and every autonomous build unit of the previous day) and
production served day-old code for close to an hour before two independent restorations
repaired it (PRs #9/#10, ledger entry O42). These rules exist so that cannot happen again.

## The three rules for humans

1. **Never force-push `main`.** Not `git push --force`, not `git push --force-with-lease`,
   not "sync fork and overwrite". If your push is rejected with "non-fast-forward" or
   "fetch first", that is not an error to override — it means `main` has commits you don't
   have. Run:

   ```
   git fetch origin
   git pull --rebase origin main
   git push origin main
   ```

   If the rebase hits conflicts you don't want to deal with, push your work to a branch
   instead and open a PR:

   ```
   git switch -c my-work
   git push -u origin my-work
   ```

2. **Start every work session with a fresh pull.** A clone from yesterday is stale by
   lunchtime here — the hourly loop lands roughly one commit per hour. `git pull --rebase
   origin main` before you commit anything.

3. **App code goes through a PR.** Docs and decks may be pushed to `main` directly (after
   rule 2); anything under `app/`, `src/`, or `e2e/` is covered by compliance tripwires and
   a hard verify gate (`pnpm verify`) and should land via a PR so the gate runs before the
   deploy does.

## Why your push can "do nothing"

Every push to `main` triggers a Vercel production build, and the project is on the free
tier (~100 builds/day). Builds for branches other than `main` are deliberately skipped via
`ignoreCommand` in `vercel.json` to preserve that quota — so branch pushes get no preview
URL, and if the daily quota is exhausted even a merged PR won't appear on the site until
quota resets. The repo is still the source of truth; the deploy catches up.

## Asks for the repo admin

GitHub-side enforcement (blocking force-pushes on `main` at the server) cannot be set from
a Claude session — it needs a human once: **Settings → Rules → Rulesets → New branch
ruleset**: target `main`, enable **Block force pushes** and **Restrict deletions**,
enforcement **Active**. Do not enable "Require a pull request" unless the hourly loop's
direct pushes are also changed — the loop pushes verified units straight to `main` by
design.
