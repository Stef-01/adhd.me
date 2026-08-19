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
   work; it is the taste-skill plan §2 refers to.
6. **Compliance is code.** Message templates pass the compliance linter; UI copy makes no
   clinical claims; no testimonials/ratings anywhere; "specialist" never appears next to a
   niche scope.
7. **Log**: one-line entry in Stefan-Brain `wiki/_log/YYYY-MM-DD.md` (vault law). If the vault
   is unreachable, note the skip in your commit message.
