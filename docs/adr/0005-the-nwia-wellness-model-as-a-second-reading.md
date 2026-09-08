# 5. The NWIA wellness model is a second reading of the care map, not a second map

Date: 2026-09-08

## Status

Accepted.

## Context

The founder relayed a direction from the National Wellness Institute of Australia (NWIA,
wellnessaustralia.org): implement its key principles and learnings in the app's content, in a
minimalist way, without clutter. The Institute's public pages give two things: the wellness
paradigm (a well person's awareness, understanding and active decision-making align with their
values and aspirations) and nine dimensions — Physical, Social, Emotional, Work, Spiritual values,
Intellectual, Cultural values, Environment, Finances — which all affect each other and the balance
between them. The Institute's per-dimension definitions document could not be fetched from the
build environment; what is used is paraphrased from the public pages and attributed.

The app already has a map: the eco-bio-psychosocial one from the PRD (four layers, 24
subdomains). A second, nine-region map would be the clutter the founder said not to add.

## Decision

1. **One data file** (`src/wellness/nwia.ts`): the nine dimensions, a one-line meaning each in
   this app's voice, the paradigm in one sentence, and a mapping from every subdomain to one or
   two dimensions — so the NWIA model is a second reading of the nodes the map already has.
2. **Three sentences on existing screens, no new screen.** The paradigm, attributed and linked,
   once, on the care map's introduction. The dimension a node belongs to, when the node is
   opened. And one "Balance" line on My ADHD: which dimensions the person's own signals touch,
   and which nothing has touched yet — said as "unasked", never as a deficit.
3. **Nothing is scored.** The Institute's model is a lens; the app computes only coverage.

## Consequences

- The balance principle is the one NWIA idea that changes what the app says about a person, and
  it is honest by construction: it reads what the person said and names what they did not.
- The Institute's resources (membership, events, education) are not reproduced; one link goes to
  its dimensions page.
- If the Institute supplies its definitions text, the one-line meanings can be replaced in the
  data file without touching a screen.
