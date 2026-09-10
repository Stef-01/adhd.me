# Context

The vocabulary this repo actually uses, so a word means one thing across the engine, the screens
and the copy. Written lazily — a term earns a place here when it has already been ambiguous once.

## Roster

- **Clinician** — an entry in the roster. Always one of two kinds, never both, and never neither:
  - **Listed clinician** (`realPerson`) — a real GP who has agreed to be listed. Two of them today,
    consulting in Sydney (`src/demo/roster.ts`).
  - **Example profile** (`synthetic`) — an invented persona used to demonstrate the finder without
    anyone's real details (`src/demo/synthetic-roster.ts`). Labelled as an example on every surface
    that renders it. Several are on the Gold Coast, which is why the map reaches further than the
    listings do.

  **The distinction is load-bearing in copy.** "ADHD.ME lists GPs in Sydney and on the Gold Coast"
  is false: it merges the two kinds. Coverage claims describe the *listed* clinicians; the map
  describes the *gazetteer*. `app/finder-stages/shared.tsx` and `src/seo/faq.ts` both say so.

- **Declaration** — what a clinician says about their own work (care areas, languages, billing,
  appointment length, access). The product describes clinicians *only* through declarations; it
  never characterises them itself, and it holds no rating or review of any kind.

## Matching

- **Ask** — one thing a person's words asked for, read out of their sentence by `needsFor`.
- **Match quality** — how well the asks separated the roster: `informed`, `tied`, `unserved`,
  `unmatched`. Only `informed` licenses the word "order"; the other three say plainly that the list
  is not a ranking (`orderNote()` in `src/demo/clinicians.ts`).
- **Order** — a claim, not a layout. If the words did not separate the list, the page says so.

## Geography

- **Gazetteer** — the suburbs the product can place (`src/geo/`): northern Sydney and Double Bay
  (NSW), and the Gold Coast (QLD). Wider than the roster on purpose, so a person outside the listed
  areas still gets honest distance context instead of an implied listing.

## Crawlers and answer engines

- **Indexable route** — a public page with an entry in `src/seo/pages.ts` carrying its target
  title, description and primary keyword. The sitemap, `/llms.txt` and each page's own `metadata`
  all derive from that one register.
- **Hidden route** — a route `src/security/robots.ts` withholds from crawlers. **The register is
  empty today**: the 2026-09-03 strip opened the whole site. The shape is kept because one entry
  still reaches robots.txt, the sitemap and the page's meta tag together.
- **Retrieval crawler** vs **training crawler** — the distinction `src/seo/ai-crawlers.ts` turns
  into robots.txt rules. A retrieval bot fetches to answer somebody's question now and cites the
  source; a training bot bulks the site into a corpus with no reader and no citation. The first is
  allowed, the second is not.

## The personal model (ADHD Life, 2026-09-08)

- **Layer** — one of the four parts of a life the model reads a difficulty into: brain, body,
  environment, people (`src/model/layers.ts`). The eco-bio-psychosocial framing from the GP
  interview behind the PRD. Every contributor carries one; the care map draws one region each.
- **Subdomain** — a closed entry inside a layer ("activation", "sleep", "deadline-design",
  "partner"). A module names the subdomains it teaches; a need is about one.
- **Signal** — something the person said: an onboarding answer, a module's resonance, a
  personalisation answer, an insight verdict, an experiment outcome. Stored in the **record**
  (`adhdme.model.v1`, `src/model/store.ts`), on the device, never in a URL, a log or an event.
- **Resonance** — the three answers every interactive module asks after its scene: how often,
  how much it costs (0–10), whether the person wants it easier. Stored separately, never summed.
- **Need** — a derived reading of the record (`src/model/needs.ts`): domain, subdomain, cost,
  priority, confidence, contributors by layer, strengths, strategies tried. Never stored; the one
  reading every screen shares.
- **Recommendation** — the rule-based next action (`src/model/recommend.ts`): learn, try, change
  the environment, involve somebody, discuss with an existing clinician, explore a provider, or
  the safety pathway. Every one carries its rule, its inputs and a "Why am I seeing this?".
- **Experiment** — a strategy the person said they would try, awaiting "Did this help?".
- **Insight** — a sentence a module suggests about the person, which only they can confirm. A
  "Not really" is kept as a rejection so it is never assumed.
- **Safety event** — a reflection that matched a safety rule (`src/model/safety.ts`). While one
  stands, ordinary recommendations are suppressed and the safety screen renders.

## Support (broadened finder, 2026-09-08)

- **Profession** — the kind of professional a roster entry is (`src/support/professions.ts`):
  GP, psychologist, counsellor, occupational therapist, exercise physiologist, ADHD coach. An
  entry that says nothing is a GP, which is what the roster meant before the broadening.
- **Provider** — any roster entry, whatever its profession. The finder's copy says "provider" or
  "support" where it said "GP" unless the profession is known.
- **Allied provider** — a non-GP entry. Today all ten are **example profiles**; the listed
  clinicians are still the two real GPs. Coverage claims are unchanged by the broadening.
- **Expertise tag** — what an allied provider says they work on, in the PRD's closed taxonomy
  ("task initiation", "ADHD in couples"). Rendered as "Best for" on the profile.
- **Support path** — `/support`: problem → what may help → try yourself → when a person helps →
  professions → providers. "See providers" writes a profession filter to the device; it never
  puts anything on a URL.

## Wellness (NWIA, 2026-09-08)

- **NWIA dimension** — one of the National Wellness Institute of Australia's nine: Physical,
  Social, Emotional, Work, Spiritual values, Intellectual, Cultural values, Environment, Finances.
  A second reading of the care map's nodes (`src/wellness/nwia.ts`), never a second map.
- **Balance** — the Institute's principle that the dimensions affect each other. In the app it
  is one line on My ADHD: the dimensions the person's signals touch, and the ones nothing has
  touched yet ("unasked", not a gap).

- **Manual** (My Manual, PRD §27): the person's own account of how they work — what helps, what
  makes it harder, how to work with them — in three free-text sections on their device. The app
  offers *suggestions* drawn from the record and never writes a line; a suggestion becomes text only
  when the person adds it. Distinct from the *picture* (My ADHD), which the app derives.
- **Medication note** (PRD §47): the person's description of what medication seems to change,
  what it leaves untouched and anything unwanted, to take to whoever manages it. The app never
  advises on medication; the note is what the person brings to the person who does.
- **Adjustments on paper** (PRD §45, institutional navigation): the study and workplace changes a
  university's accessibility service or an employer can grant — extensions, briefs in writing, a
  quieter desk. The app describes what is *commonly available* and who grants it; it applies for
  nothing and holds no letter. The track (university, work) is what the person's need points at.
- **Reading** (reflection interpretation, PRD §29): a suggested account of what a reflection was
  about — "It sounds like being short on sleep was part of it" — from a closed lexicon on the
  device, offered once and *confirmed or declined by the person*. Only a confirmed reading enters
  the model, as a contributor (layer, subdomain, note) on the module's need; the text stays in the
  reflection. Distinct from an *insight* (the module's claim, verdict yes/no) and from *safety*
  (the one other reader of reflection text, which interrupts rather than suggests).
- **Clue** (play, PLAY-PLAN §13): the line on a round's scene that makes the right answer
  inferable — the clone's sparking wire. Required on every round with a right answer.
- **Relate beat** (play, PLAY-PLAN §13): "How much is this you?" after a round's result, as
  three buttons or a 0–10 Likert slider, alternating. Writes `relates[run][round]`; the mean is
  the need's cost when the recognition round gave none. Distinct from *resonance* (the run's own
  frequency, cost and priority at the end) and from a *reading* (an interpretation of free text).
- **Liquid glass layer**: the WebGL2 pipeline from iyinchao/liquid-glass-studio (MIT), vendored
  under `app/glass/studio/`, running full-viewport under the page. Its *shapes* are the app's
  glass surfaces read from the DOM; its *ground* is the app's paper with a slow tinted drift; its
  *blob* is the studio's pointer-following shape. Distinct from the *CSS glass* (`glass.css`),
  which blurs DOM content under the chrome and is the whole effect where the layer cannot run.
- **Calm** (PLAY-PLAN §14): the standing rule after the tester who dropped the phone. No label on a
  patient screen (no kicker, no count, no rule line) unless asked for with Play's "?"; nothing
  moves position while a person reads; one question per card. The *tutorial* is the three cards
  before the first run on a device that say what the bar is, that waiting can be the move, and
  that a miss costs nothing.

## ADHD Lives (PRD v2, 2026-09-08)

- **Life** — one of the eight recurring characters (Maya, Leo, Arjun, Zoe, Theo, Mia, Jax, Nina),
  each living one pattern. Maya is the same person as the bean.
- **Chaos Run** — a session of microgames on the *session director*, with three lives, a score and
  a FASTER beat every four successes. The arcade loop; it must stay fun with learning ignored.
- **Microgame** — one engine, configured: an instruction of at most three words, 2.5–7 seconds,
  a comic failure. A *fun game* has no character and carries no learning.
- **Beat** — one of a game's three phases on one clock: *PRE* (the life and the shouted
  instruction, still), *ACTIVE* (the bar drains, the engine is live), *RESULT* (hit or miss).
  FASTER is a one-word card between games. Under reduced motion every beat ends on a button.
- **Stage** — the block a game happens in. Its *layout* (where things are, how many) is decided by
  the engine from the seed (`src/lives/layout.ts`), never by the renderer.
- **Resonance signal** — "This is me", "Sometimes" or "Not me" on a character's moment. The only
  basis for personalisation; gameplay performance never is.
- **Strategy** — a practical thing to try, independent of the game, with a claim, an evidence
  level and a review status. Its *module* teaches it in blocks; the *Toolkit* is where a person
  keeps the ones they have decided to try, with their own configuration.

## ADHD Lives (PRD v2, 2026-09-08)

- **Life** — one of the eight recurring characters of the Chaos Run (Maya, Leo, Arjun, Zoe, Theo,
  Mia, Jax, Nina; `src/lives/characters.ts`). Also, in the HUD, one of the player's three. The
  sentence says which; the code says `CharacterId` for the first and `lives` for the second.
- **Bean** — a character as drawn: the five of the existing runs (`app/play/beans.tsx`) and the
  eight lives (`app/lives/bean.tsx`). Maya is the same person in both.
- **Engine** (Lives) — one of the ten reusable mechanics a game is a configuration of
  (`MECHANIC_ENGINES`). Distinct from *the* engine, `src/lives/`, which is everything that is not
  a renderer.
- **Scene** (Lives) — a game laid out in design coordinates from a seed (`layoutGame`): the
  entities, the routes, the taunts, the timing window. The renderer places it; it does not decide it.
- **Director** — `eligible`/`nextGame`: the eight constraints that choose the next game and the
  rejection log the lab shows.
- **Run** (Lives) — one session from PLAY to the score: `SessionState`, three lives, FASTER every
  four successes. Not the existing modules-as-runs, which the Learn tab still calls runs.
- **Resonance signal** (Lives) — This is me / Sometimes / Not me on a character or a game
  (`ResonanceSignal`), the only basis for personalisation (§3, §35). Separate from the personal
  model's resonance (frequency, cost, priority), which the existing runs write.
- **Toolkit** — the strategies a person decided to try, with their personal configuration
  (`personalStrategies`); **the queue** is what they saved to learn later (`saved`).
# Leo's swarm challenge

- **Swarm** — all the mosquitoes in Leo's round, arriving in successive waves. Clearing the
  room between waves is a respite; catching the entire swarm wins the round.
- **Leo's regulation** — the fictional character's remaining tolerance for the swarm's noise.
  Each mosquito drains it while uncaught. It is a game resource, never a measure of the player
  or a signal used in their learning profile.

