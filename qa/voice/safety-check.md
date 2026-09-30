# The silent danger check, measured

`node --env-file=.env.local scripts/voice-safety.mjs` puts 14 ordinary answers and 8 that say danger
to the realtime model the way a call does, six times each.

| Date | Wording | False alarms | Missed |
| --- | --- | --- | --- |
| 2026-09-30 | call `urgent_help`, given the words alone | 3 of 42, and 2 in 13 simulated calls ("Yes, that would be helpful.") | 0 of 24 |
| 2026-09-30 | one word, given the question and the words | 0 of 42 | 2 of 24 |
| 2026-09-30 | one word, naming a past attempt and not wanting to be alive, and that hard is ordinary | 0 of 84 | 0 of 48 |
| 2026-09-30 | the same, from the kept script | 0 of 84 | 0 of 48 |

Four of the eight danger sentences are outside the app's own rules (`src/model/safety.ts`), which open
the contacts first and without the model wherever they match. The rules gained "take my own life",
"ending it all" and "don't see the point in being alive" the same day.

An alarm stops whatever is being said, shows the contacts, says the numbers and asks whether to keep
looking; it is said once in a call.
