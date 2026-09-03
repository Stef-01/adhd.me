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
