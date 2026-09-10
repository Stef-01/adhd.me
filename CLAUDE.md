# ADHD.ME

Next 15, React 19. `pnpm dev` · `pnpm build` · `pnpm typecheck` · `pnpm test` · `pnpm e2e`.
Production needs `ADHDME_TOKEN_SECRET`; `/demo` needs `ADHDME_ENABLE_DEMO=1`.

Commit to main and push after every change.

## The one law: fewer words

A screen holds 20 to 60 words in total, 40 in the middle, like Headspace and Finch. Measure every
screen with `node scripts/text-budget.mjs` against a local server and put the number in the
commit. Delete words; do not hide them. No instructions, no ledes, no explanatory paragraphs,
no provenance comments: a heading and the one thing to do. `docs/design/text-budget-postmortem.md`
records why.
