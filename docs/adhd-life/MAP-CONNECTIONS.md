# The refinement loop, appraised against the app's own data

O253, 2026-09-20. The map exists to turn what a person tells the app into a next step and, when
a step is not enough, into a person who can help. This is that chain walked end to end and
measured rather than described, the three breaks that were found in it, and the two that are
still open because they are the founder's to decide.

## The chain, as built

```
a run or a module   →  resonance + relate  →  deriveNeeds()  →  the map's cells
                                                     │
                                    recommend() ─────┤
                                                     │
                       the hub's one step ───────────┤────── /support: professions
                                                     │              │
                                        the module ──┘              └── the finder, narrowed
                                                                             │
                                                              problemFit + fitTags on the rows
```

Every arrow is real code. Three of them were not doing what the diagram says.

## Break 1: the step nobody could read

`recommend()` returns a heading, a body and a reason. Today rendered all three. The hub rendered
the heading alone — and a strategy's heading is its title, so the founder read **"Try this: one
capture place."** and, in his words, "this meant nothing. It is so cryptic."

The hub now carries one more line: for a strategy its own first step, for a module its subtitle.
Nothing is authored here; what already existed is shown.

## Break 2: the step that led to a list

The card's control named three of the seven actions and sent the other four to `/approach`, the
bare module list. Two of those four — `CHANGE_ENVIRONMENT` and `INVOLVE_SUPPORT_PERSON` — are the
same "try a strategy" branch seen through the need's dominant layer, and they carry the module
the strategy came from. So the commonest strategy recommendations threw away the module they were
holding. A recommendation that names a module now opens that module, and the label says so.

## Break 3: two subdomains that could never match anybody

Measured over all 25 subdomains against the roster:

| | subdomains |
| --- | --- |
| mapped to at least one expertise tag | 23 of 25 |
| producing a match on the shipped roster | 23 of 25 |
| producing a match on the real roster alone | 8 of 25 |

`noise` and `peers` had no entry in `EXPERTISE_FOR`, so `problemFit` returned zero for them
against every provider on every roster and `fitTags` returned nothing. The failure renders as a
screen with no chips, which looks exactly like a thin roster, so nothing said so. Both are mapped
now, and the test that missed it checked only the brain layer; it checks all four.

## What personalisation now looks like on the screen

`/support` named nobody. It showed three profession cards and handed off to the finder, where the
chips live — four taps from the need they are about. It now names the provider whose declared
expertise answers the top need, with the tags that matched, and renders nothing when no declared
expertise answers it. `bestFitFor` returns null in that case on purpose: a match with nothing
under "Why this match?" is a claim the screen has not earned.

**The real roster only.** The finder ships with the example profiles on and labels every one of
them. A card here naming an invented person as the closest fit would put a fabricated name under
a real person's problem.

## Still open, and why they are decisions rather than bugs

**C1 — the expertise taxonomy has no vocabulary for a psychologist.** `EXPERTISE_TAGS` is fifteen
practical-systems problems: task initiation, deadline management, household organisation,
workplace adjustments, regular eating. That is what a coach, an occupational therapist, an
exercise physiologist or a dietitian declares. It is not what the eight psychologists on the
roster publish, which is trauma, autism and ADHD assessment, eating disorders, perinatal mental
health and culturally responsive practice. So problem fit can rank the practical providers and
mostly cannot rank the therapists: 8 of 25 subdomains reach a real provider, and that number is
the taxonomy's shape rather than the roster's size.

The app already has a condition-shaped vocabulary that fits them — `CareArea`, which the finder's
own engine ranks on. The two systems do not meet: `careAreas` is reached by what a person TYPES,
`expertise` by what the model has LEARNED. Joining them is a real piece of work and a real
decision, because a need is a function ("starting long independent work") and a care area is a
condition, and mapping one onto the other by hand would be this file inventing clinical claims.

**C2 — profession cards with no real provider behind them.** 17 of the 25 subdomains show at
least one profession card whose kind the real roster cannot serve; `adhd-coach` alone accounts
for 13 of them. With the examples on, the finder is not empty — every row is labelled an example,
which is honest and is still a poor destination. The options are to say on the card how many real
providers of that kind are listed, to stop offering a kind nobody can be seen for, or to list
one. All three are the founder's call.

## The scale the call-outs now use

Every call-out in a run is the same 0–10 slider. It used to alternate — buttons on even rounds,
the slider on odd ones — and both forms wrote the same number, so `meanRelate` averaged
three-point answers with eleven-point ones.

The recognition card asked HOW OFTEN in four buttons, and `needs.ts` turned the answer into a
cost through a lookup: often 7, sometimes 5, rarely 2, unsure 4. So `functionalCost`, the number
the whole model is built on, was never asked for. It was inferred from a frequency, and frequency
is not cost: something that happens rarely and wrecks the day scored 2. The card asks how much of
an issue it is, 0–10, and writes the cost directly. `Resonance.cost` already existed and
`needs.ts` already preferred it; nothing had ever captured it.

## Evidence

`qa/step-o253/` holds the two hub states and the support screen at 390:

- **hub-step** — a strategy proposed: "Try this: the first physical action." with "Before opening
  email tomorrow." under it and "See it in the module" opening `/approach?module=starting`. This
  is the card the founder read; the second line and the named destination are what changed.
- **hub-pending** — the same card asking how an accepted strategy went. A question takes no
  instruction under it, so it has none, and the control still opens the module.
- **support** — "Closest fit today: Flynn Simonis · Occupational therapist", with the matched tag
  under it, reached from the map's top need rather than from anything typed.

## The numbers

| | before | after |
| --- | --- | --- |
| subdomains that can reach a provider at all | 23 of 25 | 25 of 25 |
| hub states the budget walks | 1 | 2 |
| app screens over the 60-word ceiling | 0 of 62 | 0 of 63 |
| My ADHD, lived in | 53 | 51 |
| My ADHD, a step proposed | not measured | 56 |
| Support, lived in | 39 | 55 |

The hub went DOWN despite gaining a line, because the third contributor chip went with it: the
step needed the words more than the chip did, and every contributor is still on the axis sheet.
