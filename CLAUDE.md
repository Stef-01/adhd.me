# ADHD.ME build tree — laws for loop sessions

You are (probably) a `adhd-me-build-loop` firing. This tree is the ADHD.ME product build
(venture brief: `wiki/entrepreneurship/startups/adhd-me.md`; plan: `docs/FIVE-YEAR-PLAN.md`;
ledger: `BUILD-STATE.md`).

1. **One unit per firing.** Follow the claim protocol in `BUILD-STATE.md` exactly — claim-push
   first, build second. Overlapping sessions are normal; the ledger is the lock.
2. **Verify gate is hard.** `pnpm verify` (typecheck · test · build · audit:gate) plus the unit's
   stated verification. Green commits only; WIP goes behind flags with continuation notes.
   `audit:gate` (W53) fails on any moderate+ dependency advisory that is not accepted in
   `src/security/audit-allowlist.ts` with a rationale and a review date.
3. **Karpathy laws**: think before coding · simplicity first · surgical changes · goal-driven
   execution. No features beyond the unit. No speculative abstractions.
4. **Founder gates (plan §4) are absolute.** No real patient data, no live SMS, no production
   credentials, no symptom-based patient triage (TGA boundary), no public directory copy.
   Synthetic data only. If a unit needs a gate, mark it `blocked` and flag loudly.
5. **Use the skills** mapped in plan §2 (supabase, impeccable/taste-skill, dataviz, code-review,
   security-review, simplify, run, docx/pptx/xlsx). A hardening week without the review skills
   is not done. Vercel's agent skills are vendored in `.claude/skills/` (react-best-practices,
   composition-patterns, web-design-guidelines, vercel-optimize, react-view-transitions):
   consult react-best-practices before writing or refactoring React/Next code, and
   web-design-guidelines + react-view-transitions on every UI-track unit. Where a Vercel
   guideline conflicts with this tree's compliance or copy laws, the tree's laws win.
   `adhdme-taste` (same directory) is this tree's OWN design law — load it before any UI
   work; it is the taste-skill plan §2 refers to. `design-motion-principles` (installed via
   npx skills, founder-directed 2026-08-21) governs motion work specifically — weight it
   Jakub-primary/Emil-secondary for this product's patient surfaces; where it conflicts with
   adhdme-taste or the compliance laws, the tree's laws win.
   **Three more installed founder-directed 2026-08-22** (vendored to `.agents/skills/` with the
   `.claude/skills/` symlink and recorded in `skills-lock.json`, same as above):
   - `frontend-design` (anthropics/skills) — the aesthetic-direction law for any NEW surface or any
     reshaping of an existing one. Its brief-first method (name the subject, build a token system,
     critique the plan against the brief BEFORE writing code) is how a UI unit should start. Its
     warning about the three default AI looks — cream/serif/terracotta, near-black with one acid
     accent, hairline broadsheet — is binding here: this tree chose Newsreader on paper
     deliberately and must not drift into a default because a default was easier.
   - `impeccable` (pbakaus/impeccable) — the craft floor and the audit/critique playbooks. Use its
     MODE vocabulary when deciding what a surface is for: the finder, the profiles and the console
     are **Operate** (the visitor completes a task; scanability and the real usage scene outrank
     expression), the story landing and the GP join page are **Persuade**. Load
     `reference/craft-floor.md` before editing UI, per its own setup rule.
   - `adhd` (UditAkhourii/adhd) — parallel divergent ideation, NOT an implementation skill. Use it
     on open-ended, high-stakes questions where the first three answers would be the textbook ones:
     matching-model changes, ranking semantics, information architecture, naming. Its own pre-flight
     gate applies — skip it wherever there is a canonical answer.

   **Precedence is unchanged and absolute: `adhdme-taste` and the compliance/copy laws in §6 beat
   all four.** A more distinctive screen that makes a clinical claim, carries a testimonial or puts
   "specialist" beside a niche scope is a defect, not a bold choice. `frontend-design` says to take
   one real aesthetic risk; §6 says where it may not be taken, and §6 wins.
6. **Compliance is code.** Message templates pass the compliance linter; UI copy makes no
   clinical claims; no testimonials/ratings anywhere; "specialist" never appears next to a
   niche scope.
7. **Log**: one-line entry in Stefan-Brain `wiki/_log/YYYY-MM-DD.md` (vault law). If the vault
   is unreachable, note the skip in your commit message.
8. **Concurrency laws** (written after the 2026-08-19 force-push wipe, ledger O42–O43; human
   rules live in `CONTRIBUTING.md`). Several writers share this repo — interactive Claude
   sessions, the hourly build loop, and humans — and these rules are what let them overlap:
   - **Never force-push `main`. No exceptions, no matter what state it appears to be in.**
     `--force-with-lease` is permitted only on your own `claude/*` work branch, and only when
     the branch holds nothing but already-merged history being restarted.
   - **Fetch immediately before you claim, and again immediately before you push.** If a push
     to `main` is rejected non-fast-forward, the answer is always reconcile (pull/rebase or
     merge) — never `--force`, never delete the remote branch.
   - **Wipe detection is part of every firing.** After fetching, confirm the ledger's most
     recent DONE entry still exists in `BUILD-STATE.md` on `origin/main`. If history you know
     was merged is missing from `main`, STOP building. Do not build units on the wiped base.
     Recover by branching from the last good head (your own clone's refs, `refs/pull/*/head`,
     or a `rescue/*` branch), merging — not force-pushing — the surviving line back together
     with whatever new commits landed on the wiped base, and landing it as a PR. Record the
     incident in the ledger. The 2026-08-19 restoration (PRs #9/#10) is the worked example.
   - **Unit numbers collide when sessions overlap; the ledger is the tiebreak.** Before using
     the next O-number, check the ledger AND open/merged PR titles on `main`; on rebase,
     renumber yours, never relabel someone else's.
   - **Deploy quota is a shared resource.** The Vercel free tier allows ~100 builds/day and
     every push used to burn one; `vercel.json`'s `ignoreCommand` now skips builds for every
     ref except `main`, so previews do not exist — the local gate (`pnpm verify` + the unit's
     e2e) is the only pre-merge verification, and production deploys are what the quota is
     for. Do not remove or weaken `ignoreCommand` to get a preview URL, and never retry a
     quota-failed deploy in a loop; quota failures are noise, the local gate is authoritative.
