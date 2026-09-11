# Every game to Leo's standard

Founder direction, 2026-09-10: "enhance all of the games so they are much more varied and playable
and have actual created components and aesthetic elements, like the Leo game, that is a gold
standard". This is the deconstruction of why Leo works, the bar every other game has to clear, the
register of assets that have to exist, and a plan per game. Builds are judged against this
document, not against a feeling.

## 1. Why Leo is better: the deconstruction

Read `app/lives/leo-mosquito.tsx`, `app/styles/leo.css`, `app/lives/leo-buzz.ts`,
`src/lives/leo-swarm.ts`. Ten things, each of which the other games lack today.

1. **A place, not a field.** `LeoBedroom` is a composed room: wall, floor line, a window with a
   moon, a lamp with a warm shade, a bed with a pillow and a quilt. The game happens somewhere.
   Every other engine happens on a blank tint.
2. **The character is in the scene, and reacts.** Leo lies in the bed with a face that reads
   settled, unsettled, overwhelmed, asleep (four poses on a `data-emotion` attribute), a head that
   rocks while the room is live, and "z z" when it ends well. The player's actions change the
   person, not a counter.
3. **The pieces are drawn things.** A mosquito is an SVG with wings, legs, a striped body, a face,
   buzz lines; it has states (annoyed, hit). Elsewhere a piece is a text chip ("wasp").
4. **Motion that belongs to the thing.** Wings flap on a four-step cycle, buzz lines pulse, the head
   rocks; a caught mosquito drops, spins and fades on a spring. Under reduced motion every loop is
   off and the pieces sit still. Nothing loops for decoration.
5. **A rhythm.** Waves: a few mosquitoes, a quiet beat ("A quiet moment… more are coming"), the
   next wave. Tension rises inside one round rather than one flat burst.
6. **A stake the player can read.** The regulation meter drains while mosquitoes are alive and its
   colour turns (green, amber, red) as the mood turns; the mood also changes the room.
7. **Feedback on every touch.** A hit: the mosquito's face goes to crosses, it falls; a miss on the
   room counts and annoys the swarm (the mosquitoes' faces change). Sound follows: one buzz voice
   per living mosquito, off by default, a button that says so.
8. **One palette for one world.** Lavender wall, deeper lavender floor, warm quilt and lamp, cream
   paper for controls, a navy-violet ink: six or seven tints that only this game uses, declared once.
9. **The HUD is part of the world.** Wave count, caught count, the meter and the sound toggle sit
   on the same lavender as the room, not on the app's paper.
10. **Everything is still accessible.** Each mosquito is a button named "Catch mosquito N"; focus
    moves the mosquito to a stable point; the skip exists under reduced motion; the meter is a
    `role="meter"`.

What it is NOT: it is not clever mechanics. The swat is the simplest mechanic in the set. The
difference is entirely in the composition, the pieces, the reactions and the rhythm.

## 2. The bar

A game meets the standard when all of these are true. Reviewers tick them per game.

- [ ] **Scene.** A drawn SVG place, 360 by 200 or the room's 390 by 560, with at least four
      composed objects, its own five-to-seven tint palette declared as custom properties on the
      scene root, drawn in the simple-shape idiom (`app/play/scene.tsx`, `LeoBedroom`).
- [ ] **Character present.** The life whose game it is stands, sits or lies in the scene, with at
      least three states (neutral, engaged, the outcome), on a data attribute the CSS reads.
- [ ] **Drawn pieces.** Every tappable, draggable or sortable piece is a drawn component with an
      accessible name equal to the old text. No text chips.
- [ ] **Piece motion.** Each piece has one idle motion true to what it is (a bob, a flap, a drift,
      a wobble) and one reaction (squash, pop, flap off, shred, honk past, slide in). Both are off
      under `reducedMotion`; the reaction becomes an instant state change.
- [ ] **Rhythm.** Where the engine allows, pieces arrive in beats rather than all at once.
- [ ] **A stake.** Something in the scene changes as the round goes: the character's face, a lamp
      dimming, a queue growing, a pan smoking. The player reads it without a number.
- [ ] **Sound, optional.** One synthesised voice where the world has one (a buzz, a sizzle, a
      ping), behind a button, off by default, never required.
- [ ] **HUD in the world.** Progress and score sit on the scene's palette.
- [ ] **Accessibility unchanged.** Every existing role, name, data attribute and keyboard path
      the specs use still works; `Skip this round` under reduced motion; 44px targets.
- [ ] **No new words.** The text budget holds: a round shows its instruction and nothing more.

## 3. The asset register

Shared components to create once, in `app/lives/scenes.tsx` (Chaos Run) and `app/play/scene.tsx`
(bean runs), each an `aria-hidden` SVG with a palette block in the matching CSS file.

### Scenes (places)

| Scene | Used by | Objects | Palette base |
|---|---|---|---|
| Bedroom at night (exists) | Leo's three games, `sleep`, `screens` | window, moon, lamp, bed, quilt | lavender, navy |
| Kitchen | Pancake, Toast, Rogue blender, The sneeze, `eating`, `gut` | bench, hob, pan, toaster, blender, window | cream, copper, sage |
| The crossing | Maya crossing, Maya layers, Maya turns it down | kerb, zebra stripes, a bus, a cyclist, signs | slate, amber stripes, sky blue |
| Meeting room | Arjun's three games, `not-listening` | table, chairs, a screen, a window with a cow | navy, teal, chalk |
| Phone screen | Zoe's three games, `interruption`, `screens` | status bar, thread bubbles, a keyboard, a send button | white, blue bubbles, grey |
| Hallway and door | Theo get out, Theo backwards, `mornings` | door, hooks, a shelf, keys, a clock | oak, cream, brass |
| Bathroom | Theo shower | tiles, a shower, steam, a clock on the wall | pale blue tiles, white |
| Supermarket | Jax just milk, Jax checkout, `money` | shelves, a fridge door, a checkout, a trolley | mint, red tags, grey |
| Desk | Nina's two games, `starting`, `perfectionism`, `ambiguity`, `context` | screen, keyboard, mug, a lamp, a blank page | graphite, paper white, warm lamp |
| Park | Pigeons, Wasps, Bubbles | grass, a path, a bench, a bin, sky | green, sky, stone |
| Living room and table | Mia's three games, `working-memory`, `household`, `forgotten-commitments` | table, list on the fridge, a banana, keys, a sofa | terracotta, cream, plant green |
| Garden shed | Spider | shelves, a web corner, a torch | dusk, cobweb grey |
| Office corridor | Runaway office chair | carpet, doors, a chair on wheels | grey, blue doors |
| Pond | Duck or goose | water, reeds, a jetty | teal, rush green |
| Gym and street | `exercise` | a footpath, a park run marker, shoes by the door | dawn pink, grey |
| Study room | `deadlines`, `hyperfocus` | a calendar on the wall, a clock, a lamp, a window that darkens | ink, amber lamp |

### Pieces (drawn things with states)

Wasp (fly, squash), pancake (flip, land), bubble (drift, pop), pigeon (peck, flap off), duck and
goose (bob, quack), draft message (arrive, shred), hazard on a crossing (honk past), a filter item
as an object (a report, a cow, a burger; slide in, slide out), a slice of toast (rise, burn),
blender (rattle, stop), a sneeze cloud (build, release), a spider (creep, drop), an office chair
(roll, bump), a kayak sale tag (flash, tear off), a mug of coffee (steam), a thought bubble to park,
a list card (lift, sort), a bill (slide, pin), a ball (arc, land), a lecture slide (glow), a
timeline with stations (tap point), a tray to balance (tilt), a subscription card (swipe away).

### Characters in scenes

The eight lives already exist as beans (`app/lives/bean.tsx`, `LifeBean` with moods). Each scene
places the life at a fixed seat (Leo in bed, Arjun at the table, Zoe holding the phone, Theo at the
door, Maya at the kerb, Mia at the table, Jax with the trolley, Nina at the desk) and drives the
mood from the engine's state (`data-emotion`), the way `LeoBedroom` does.

### Feedback effects (CSS keyframes, one file each)

Squash (scaleY .6, then release), pop (scale 1.3 to 0, opacity), fall (y +30, rotate, fade; Leo's),
flap off (x to the edge, wings), shred (three strips separating), honk past (x across, a small
shake), sizzle (steam lines rising), tilt (rotate ±6deg around the base), pin (drop 8px and settle).
All are one-shot, 300 to 600ms, and `animation: none` under reduced motion.

### Sound (synthesised, behind a button, off by default)

Buzz (exists), sizzle (filtered noise), pop (short sine blip), quack (two-tone), honk (sawtooth
burst), ping (message). One class per sound in `app/lives/sounds.ts` on the `LeoBuzz` pattern,
never started without the button.

## 4. Plan per game

### Chaos Run (32 games, `src/lives/games.ts`, engines in `app/lives/engines.tsx`)

| Game | Engine | Scene | Pieces and motion | Stake | Sound |
|---|---|---|---|---|---|
| Wasps | target_swat | Park | wasps drift in figure-eights, squash on swat | the bench picnic gets eaten as wasps live | buzz |
| Maya crossing | trace_path | The crossing | bus, cyclist, dog, advert as drawn hazards that honk past; Maya at the kerb | Maya's face from steady to overwhelmed | honk |
| Arjun locks in | semantic_filter | Meeting room | agenda items as cards on the table, a cow at the window; keep the work, flick the rest | the screen's slide advances only when clean | none |
| Zoe, don't send it | inhibition | Phone screen | a draft bubble that grows; the send button pulses (not under reduced motion) | the thread scrolls as the wait holds | ping on release |
| Mia, why are you here? | object_search | Living room | the room with decoys; the one object glows when found | Mia's face | none |
| Pancake | target_swat | Kitchen | a pancake that rises and flips; the pan | smoke if it stays | sizzle |
| Leo and the mosquito | target_swat | Bedroom (exists) | as built | regulation meter | buzz |
| Theo, get out | semantic_filter | Hallway and door | keys, wallet, badge on hooks; decoys on the shelf | the clock hand moves | none |
| Jax, just milk | goal_protection | Supermarket | the milk in the trolley; sale tags fly in to be swiped away | the trolley fills or stays honest | none |
| Nina starts small | semantic_filter | Desk | task cards; the first small one lights the page | the blank page gains a line | none |
| Zoe holds the word | hold_release | Meeting room | a word held in a thought bubble over Zoe; the conversation bubbles pass | the bubble fades if let go | none |
| Theo plans backwards | rapid_sorting | Hallway and door | timeline stations sorted from the door back | the clock | none |
| Mia keeps the list | rapid_sorting | Living room | list cards to the fridge or the bin | the fridge list | none |
| Maya turns one down | wipe_scrub | The crossing | layers of noise wiped away: sound lines, adverts, chatter | Maya's face | none |
| Leo, lights out | precision_timing | Bedroom | the lamp's cord; tap at the right moment | the lamp dims | none |
| Arjun parks the thought | rapid_sorting | Meeting room | thought bubbles parked to a LATER note | the slide advances | none |
| Pigeons | goal_protection | Park | a sandwich on the bench; pigeons flap in and off | the sandwich | quack-like coo |
| Toast | precision_timing | Kitchen | toast rising in the toaster; tap before it burns | browning | none |
| Bubbles | target_swat | Park | bubbles drift up and pop | none | pop |
| Spider | inhibition | Garden shed | a spider creeps; do not tap | the torch beam | none |
| Rogue blender | hold_release | Kitchen | the blender rattles; hold the lid | the mess | rattle |
| Runaway office chair | trace_path | Office corridor | the chair rolls; trace a path around doors | the chair | none |
| Maya turns it down | wipe_scrub | The crossing | as Maya layers, different layers | Maya's face | none |
| Leo, one more scroll | inhibition | Bedroom | the phone glows on the bed; do not tap | the lamp, Leo's face | none |
| Arjun holds the thread | hold_release | Meeting room | a thread line held taut across distractions | the slide | none |
| Zoe deletes the drafts | target_swat | Phone screen | draft bubbles shred on tap | the thread clears | none |
| Theo, out of the shower | precision_timing | Bathroom | steam rises; tap when the clock hits it | the clock | none |
| Mia finds the list | object_search | Living room | the list among decoys | Mia's face | none |
| Jax at the checkout | semantic_filter | Supermarket | items on the belt; keep the list, flick the impulse | the receipt grows | none |
| Nina writes the line | trace_path | Desk | trace the first line onto the blank page | the page | none |
| The sneeze | hold_release | Kitchen | a sneeze cloud builds; hold it back, release at the right time | flour cloud | none |
| Duck or goose | rapid_sorting | Pond | ducks and geese bob past; sort them | the jetty | quack |

### Bean runs (20 runs, `src/learn/runs.ts`, mechanics in `app/play/mechanics.tsx`)

Each run keeps its rounds and copy; every round gets a scene and a drawn piece. The mechanic
column is what changes for all runs at once.

| Mechanic | What is drawn | Reaction |
|---|---|---|
| tap | the options as objects in the scene (the essay, a tab, a snack) | the chosen object lifts |
| dont-tap | one tempting object that pulses (not under reduced motion) | it settles when the wait holds |
| hold | a ring filling around the thing held (the ball, the slide) | it glows full |
| swipe | a card that flings off the edge | flick |
| drag-capture | the bill, the list, the note dragged to its place | it pins with a drop |
| order | station cards on a line, reordered | they slide into rank |
| timing | a timeline with stations; a marker moves | the station lights at the tap |
| recall | items shown as objects on a table, then covered | the cover lifts |
| sort | two trays; cards fall into one | the tray tilts |
| flip | a card with two faces | a 3D flip |
| pause | a breath ring that expands and contracts | the ring settles |
| pick-bean | the beans as characters in a row | the picked bean waves |
| catch | a ball, a plate, a coin that arcs | the catch squash |
| balance | a tray that tilts with the pointer | it levels |

| Run | Scene | The one drawn stake |
|---|---|---|
| Same brain, five scenes | Desk, then the lecture, the bill, the ball | Alex's face across the five |
| The blank page | Desk | the page gains the first line |
| The small table | Living room | four things on the table become two |
| Not just attention | Desk and the crossing | four functions as four objects |
| Now and not-now | Study room | the calendar's day turns red |
| The vanishing hours | Study room | the window darkens |
| Improve the presentation | Meeting room | the slide gains a first bullet |
| Quick one | Phone screen over the desk | the desk's work slides off when the phone wins |
| It has to be excellent | Desk | the draft's red marks fade |
| You're not listening | Meeting room at home | the two bubbles |
| You said you'd book it | Living room | the fridge list |
| It started about the dishes | Kitchen at night | the sink |
| Everything at 80% | Living room | the list on the fridge |
| 1:40am | Bedroom | the clock, the phone glow |
| Ran twice last month | Gym and street | the shoes by the door |
| Forgot to eat again | Kitchen | the plate |
| The gut and the brain | Kitchen | the tray |
| Where did the money go | Supermarket | the receipt |
| Out the door | Hallway and door | the launch pad |
| The scroll at midnight | Bedroom | the phone dims |

## 5. Delivery and review, five stages

1. **Scenes and palettes.** Every scene in §3 drawn and placed; the character seated; a screen
   per scene captured at 390 and read.
2. **Pieces.** Every text chip replaced by a drawn piece with its name; idle motion; reduced
   motion still.
3. **Reactions and stakes.** The one-shot effects; the stake in each scene; the HUD on the
   scene's palette.
4. **Rhythm and sound.** Waves where the engine allows; the synthesised voices behind buttons.
5. **Review against §2.** Each game ticked line by line by a reader with the screens open; what
   fails goes back to its stage. Text budget, e2e on three engines and the a11y sweep green.

The two builds running on 2026-09-10 cover stages 1 to 3 for the engines and the mechanics; stage
4 and the review are the next unit.
