# ADR 0006: ADHD Lives (PRD v2) on this app

**Date:** 2026-09-08 · **Status:** accepted (founder-directed: "integrate into the consolidated plan, use this to advance, much more technically")

## Context

The founder handed a second technical PRD, *ADHD Lives* (`docs/adhd-lives/PRD-v2.md`): a native
2D microgame in the Dumb Ways to Die shape — eight recurring characters, a Chaos Run of
microgames on a session director, three lives, a score, a FASTER beat — with a learning layer
that surfaces only after play: "this is me" resonance, a deterministic recommendation engine,
data-driven strategy modules, and a personal Toolkit. Its recommended stack is Expo, React
Native, Skia, Reanimated and Gesture Handler.

This repository is a Next.js web app with a play layer already in the same shape (PLAY-PLAN.md):
fourteen mechanics, twenty runs, a relate beat, clues, a tutorial, a personal model.

## Decisions

1. **Web first, engine renderer-independent.** The PRD's engine — session state, director,
   difficulty, scoring, lives, seeded randomness, the game registry, the strategy and module
   registries, the recommendation engine, the learning profile — is built as plain TypeScript
   under `src/lives/` in the PRD's logical coordinates (390 × 844), with no React or DOM in it.
   The DOM player renders it now; a Skia renderer can take the same engine on native later. A
   native Expo build is a separate repository when the founder wants one; nothing here is written
   in a way that would have to be undone for it.
2. **The eight characters are the Lives roster.** Maya, Leo, Arjun, Zoe, Theo, Mia, Jax and Nina
   (PRD §47) are the characters of the Chaos Run. The five beans (Alex, Maya, Jordan, Priya, Sam)
   keep the existing runs until the Chaos Run replaces them; Maya is the same person in both.
3. **Lives and score are in.** PLAY-PLAN §3 refused lives and points on PRD §34's "never
   punitive". PRD v2 §60–§62 asks for three lives, a score and a high score as the arcade loop,
   with learning participation never adding to the score. The newer, explicit instruction wins:
   failure is comedic and costs a life; the score is entertainment; nothing educational is
   scored. The relate beats, clues and tutorial from PLAY-PLAN §13–§14 carry into the Lives player.
4. **Recommendation is deterministic** (PRD §108): weighted matching over explicit resonance,
   goals, encounters and history, with an explanation per row and a debugger. No language model
   sees behaviour.
5. **Content is data.** Games are engine configurations; modules are block lists; strategies are
   records; `validate:content` fails CI on a broken reference (PRD §110).

## Consequences

- `docs/adhd-life/PLAN.md` gains Phase L with the PRD's phases 0–6 mapped onto this codebase.
- `src/lives/` is the engine, including the scene layer (`layout.ts`: where things are, from the
  seed); `app/lives/` is the DOM renderer — the Chaos Run, the results screen with resonance
  cards, the module renderer, Learn, the Toolkit, the eight lives, the lab — under `/lives`.
  The structure it follows is written down in `docs/adhd-lives/DESIGN-dwtd2.md`.
- The taste law's calm rules (no labels, nothing moves while a person reads) apply to every
  Lives screen outside the active microgame; inside a microgame the instruction is the one line.
