# 3. Superpowers is installed, and it composes with grill-with-docs rather than replacing it

Date: 2026-09-05

## Status

Accepted.

## Context

Two founder instructions arrived a day apart: use `grill-with-docs` on every coding task
(2026-09-05, morning), and implement `obra/superpowers` (2026-09-05, later). Both are process
skills that fire before code is written, and read side by side they overlap almost completely at
the front: `grilling` interviews to an empty decision frontier and waits for a yes;
`brainstorming` classifies the task, presents a design and holds a hard approval gate. Installing
one without deciding how it relates to the other would leave every session choosing between two
interview scripts on every task.

Superpowers is a Claude Code plugin whose install is a SessionStart hook injecting the
`using-superpowers` bootstrap; the project says plainly that skills present on disk without that
bootstrap "are dead weight". This repo already vendors skills into `.agents/skills/` with a
`.claude/skills/` symlink and a `skills-lock.json` entry.

## Decision

1. **Vendor, don't merely reference.** All fourteen superpowers skills are copied into
   `.agents/skills/` at commit `b36e082`, symlinked from `.claude/skills/`, and recorded in
   `skills-lock.json` with the sha256 of each `SKILL.md` — the same shape as `impeccable`,
   `frontend-design`, `adhd` and `design-motion-principles`.
2. **Run the bootstrap.** `.claude/settings.json` registers a SessionStart hook;
   `.claude/hooks/session-start` mirrors the plugin's own hook, reading the vendored
   `using-superpowers/SKILL.md` and emitting it as `additionalContext`.
3. **Composition, stated once in CLAUDE.md:** `grilling` is the interview method used inside
   `brainstorming`; `domain-modeling` is the record; superpowers carries plan → execute → TDD →
   verify → finish, and `systematic-debugging` for any red.
4. **"Implement and push" is the approval.** Both skills gate on a human yes. The founder's
   standing pattern is to give it in the request. The session still says its classification and
   design out loud — so the yes is to something specific — and then proceeds.

## Consequences

- The first thing run under the new discipline was `systematic-debugging` on the
  `dashboard.spec.ts` red. The result is recorded on ROADMAP's "Keep it green" item: a streaming
  boundary added after the spec moved a slow render from the navigation to the content, and the
  spec's allowance was on the wrong wait.
- The pace changes. A coding request now opens with a classification and a design before code.
  That is the founder's decision, made twice.
