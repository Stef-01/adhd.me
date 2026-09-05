# ADHD.ME — demo app

This is a demo. There are no laws, registers, ledgers, gates or plans in this repository any more
(the founder removed them on 2026-09-03: "delete all rules for this app, keep it as nothing, we
need to optimise and redesign from the ground up").

What remains is the app: `app/` (Next 15, React 19), `src/` (the matching engine, the roster, the
gazetteer, the finder state), `e2e/` (a handful of feature flows), and `vitest` for the engine.

- `pnpm dev` · `pnpm build` · `pnpm start`
- `pnpm typecheck` · `pnpm test` · `pnpm e2e`
- Production needs `ADHDME_TOKEN_SECRET` set on Vercel for the console's signed sessions.

Commit to main and push. Redesign freely.

## How to work here (founder-directed, 2026-09-05)

**Use `grill-with-docs` on every coding task.** Not only when asked, and not only on large ones —
the founder's instruction is "every time you code". The skill lives at
`mattpocock/skills/skills/engineering/grill-with-docs`, and it is a wrapper around two others:

- **`grilling`** (`skills/productivity/grilling`) — interview before building. Map the work as a
  design tree; ask the whole *frontier* (every decision whose prerequisites are already settled) in
  one numbered round, each question carrying your recommended answer, then wait. The user's answers
  push the frontier outward; recompute and ask the next round. **Facts are yours to find** — look
  things up in the tree rather than asking — **decisions are the user's**. Done when the frontier
  is empty, and only then build.
- **`domain-modeling`** (`skills/engineering/domain-modeling`) — keep the vocabulary and the
  decisions written down as they crystallise: `CONTEXT.md` for terms, `docs/adr/` for decisions.
  Challenge a term that conflicts with the glossary, sharpen a fuzzy one, and cross-check a claim
  about how something works against the code before accepting it.

This is a working discipline, not resurrected apparatus: `CONTEXT.md` and `docs/adr/` are written
lazily, only when there is something real to record, and nothing here gates a commit.

## Superpowers (founder-directed, 2026-09-05)

`obra/superpowers` is vendored — all fourteen skills under `.agents/skills/` (symlinked from
`.claude/skills/`, recorded in `skills-lock.json` at commit `b36e082`) — and its bootstrap runs at
every session start from `.claude/settings.json` → `.claude/hooks/session-start`, which is the
plugin's own `using-superpowers` injection done repo-locally. That bootstrap is what makes the
skills auto-trigger; superpowers' own acceptance test for an install is that it loads.

**How it composes with `grill-with-docs`, which is not replaced:** superpowers' `brainstorming`
and mattpocock's `grilling` are the same discipline — interview to a shared understanding, get a
yes, only then build — and `grilling`'s numbered-frontier rounds are the interview method to use
inside `brainstorming`. `domain-modeling` (CONTEXT.md, `docs/adr/`) is the record both write to.
Then superpowers carries the rest of the loop: `writing-plans` → `executing-plans` /
`subagent-driven-development` → `test-driven-development` → `verification-before-completion` →
`finishing-a-development-branch`, with `systematic-debugging` for any red. When the founder says
"implement and push", that is the explicit approval both skills wait for — say the classification
and the design out loud, then proceed.
