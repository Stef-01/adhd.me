# Games review: five stages against Leo's standard

Founder direction, 2026-09-10: "continue advancing all the games with QA screenshots every time to
ensure they are all as aesthetic, also make the game UI much more seamless, no difficulty setting to
change waves, it just defaults to the low and then the third wave is the highest, or weird template
box to check; make it a seamless UI with impeccable design critique." The bar is
`docs/design/games-to-leo-standard.md` §2. Every stage is judged on captures from a production
build at 390 by 844 (`scripts/games.mjs`, written to `qa/games/`, not committed), never on the code.

## Stage 1: the worlds exist (build 51e93a7)

What the captures showed, and what changed in response.

| Screen | Finding | Change |
|---|---|---|
| Every Chaos Run world except Leo's bedroom | The scene rendered **solid black**: the drawings reference a seven-tint palette (`--w1` to `--w7`) and a stage that no stylesheet defined | Fourteen palettes, each chosen against how its own drawing spends the tints; the stage, pieces, idle loops and exits in `lives.css` |
| Every piece | Tiny icons in white circles: an old rule sized any piece without the old glyph to `max-content !important` | The rule excludes drawn sprites; a piece is its drawing, the label a pill where the word is the game |
| Leo, lights out | A 180px "Now" oval covered Leo in bed; a second Leo stood in the corner | Timing and hold controls sit in the upper band at 112px; the bean hides in the bedroom world |
| Duck or goose | The item was a clipped circle ("hissing at you" cut off) | The sorting item is a card with its drawing; bins are trays |
| Leo practice | A challenge select and two checkboxes under the room | Deleted. Three waves of three, four and five, each faster; untimed is what reduced motion asks for; sound is a toolbar icon |

## Stage 2: seamless and legible (in the tree after 51e93a7)

| Screen | Finding | Change |
|---|---|---|
| Every world round | A pale band (close, lives, shout, clock) sat on a scene that began at a hard edge | The world is the whole card, the chrome floats on a soft paper scrim, the pieces keep to the field below it |
| The shout | Newsreader in capitals: formal, and not Leo's voice | The heavy sans Leo shouts in |
| Leo playing | Four bands above the room: a "Three waves" row, the time bar, a stats row with a text pill, a "Leo's regulation 87% · Holding steady" row with a second bar; a hint line and a quarter-screen of empty lavender below | One stats row with an icon for sound, one meter whose mood is in its value text and on Leo's face, the timer at the end of its own bar, no hint, a room 64svh tall |
| Leo in the Chaos Run | The pale band over his lavender room | The round card is his lavender |
| Pieces | Drawn a size too small to read at a glance (the dog and bus on the crossing, the drone) | Drawings 28% larger than their unchanged hit areas |
| Jax's kayak | Read as a crossed-out eye | A hull, a cockpit, a double paddle and a sale tag |
| The drone | A speck | A body, four arms, four rotors, a camera and a light |

## Stage 3: whole places (4e1dfd6, 17a0056)

| Screen | Finding | Change |
|---|---|---|
| Every bean-run round | The 360 by 200 place filled the bottom quarter of a portrait stage; the rest was bare colour | Each place has a wall drawn above its furniture: lamps whose cords leave the top of the frame, shelves, frames, windows, cabinets, a calendar, a skyline and clouds outside |
| Run title cards | A bean, a title and a button over empty colour | The card stands in its first round's place; the bean stands beside the furniture |
| Leo, ready and playing | A band of bare lavender under the room | The room grows into the height the rows leave |
| Lights Out | The Now button sat on Leo's window | The moment keeps left of the window |
| Balance | "Steady" on the bean and again under the scene; the tray overlapped the kitchen rail | The line under the scene says "Level"; balance rounds show the room without its wall |
| Catch | Tossed things were text chips | Each is its drawing on a round tile with a small caption |
| Do not tap | The temptation sat on the desk, and a pale glass square trailed it | It waits on the wall; the glass lens skips the in-scene temptation |
| Nina's crossing | The start was a pill with her name | Nina stands at the start |

Kept on purpose: the clue line under a round's instruction. The founder asked for every right answer
to be inferable from the scene (2026-09-08), and unit and e2e tests pin it.

## Stages 4 and 5

Recorded as each recapture is read.
