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

## Stage 4: second read of every capture (d8ab320, 7a53c2c, 2fb883d)

| Screen | Finding | Change |
|---|---|---|
| Run title cards | Lamp cords ran behind the title and the button | The title and button read on a paper scrim |
| Do not tap | The pale box behind the temptation was its pulse ring, square-cornered at full scale | The ring follows the pill |
| Hold the lid | "Hold" in a pill over a button that says "Hold", under a shout that says it | The cue shows only once holding or cued |
| Every crossing | The drawing scaled evenly while touch and labels stretched, so the line sat off the finger and "Safe" sat above its circle | The drawing stretches with its surface |
| Runaway office chair | The start was a pill reading "It" | A drawn office chair |
| Leo's bedroom, other rounds | A pale band above the room outside his swarm | Lavender to the top of the card |
| Don't scroll | The phone covered Leo's face | It glows beside him |
| The study | Two windows stacked, a lamp hanging into the upper one | A picture on the wall, the lamp beside it |
| The kitchen | The wall repeated the counter's cabinets | A shelf of jars and a picture |
| The note | A solid blue slab: class fills beat the outline's `fill="none"` | Outlines stay outlines |

## Stage 5: verification (build of 2fb883d)

Every stage-four change was recaptured and reads as intended: title-card cords fade under the
scrim, the study and kitchen walls, the note drawn as a fridge note, Lights Out lavender to the top
with the moment clear of the window, the lid held with one "Hold", the office chair at its start
with Safe inside its circle.

| Check | Result |
|---|---|
| e2e: leo-mosquito, learn-panes, app-shell, adhd-life, adhd-lives, learning-play | 65 passed |
| Text budget, 31 app screens | 0 over 60 words; median 26; a game run's title card 6, the Chaos Run's first round 4 |
| Vercel production (adhd.me) | Ready at 2fb883d on adhdme.vercel.app; no runtime errors in 24 hours |

Kept on purpose: the pale glass shape that sometimes crosses a bean-run temptation. Crops with the
WebGL layer hidden and with the cursor moved away show it is the droplet, the one moving glass
shape that follows a finger and drifts when idle (founder, 2026-09-08), not a lens on the button.

## Stage 6: the glass, and the taps it swallowed (2026-09-11)

Founder direction: "make the apple glass bubble UI not look so boring and fix clicking button not
working glitches with the games." Two findings and their measurements, taken against a production
build at 390 by 844 with a synthetic touch — down, a few pixels of drift, up — rather than
Playwright's instantaneous `tap()`, because a thumb is neither instantaneous nor still.

### The taps

A drifting thumb was measured on three surfaces before and after. The number that matters is the
drift at which the intended thing stops happening.

| Surface | Before | After | Why |
|---|---|---|---|
| A swipe card (`Swipe`, household) | Cleared at 0 and 8px of drift, nothing at 20px and beyond | Clears at 0, 8, 20, 40 and 70px | Motion's drag starts at 3px and the row then owns the gesture; ending short of the 60px fling did nothing at all. A drag that stops short is now the tap it swallowed, and a tap clears a card anyway |
| A request slip (`DragCapture`, forgotten-commitments) | Selected at 0 and 8px, nothing at 20px and beyond | Selects at every drift | The same, against the 80px drop onto the note |
| The wipe grid (`WipeScrub`) | A finger dragged across four tiles took **two** off | Takes every tile it crosses | Two faults at once: the browser captures a touch to the tile it started on, so neighbours never saw the finger; and the set of wiped tiles was read from state, so the second tile of a sweep was written over the first |

The third fault was not local to the grid. Every game that collects things — swat, filter, protect,
wipe, swipe, capture — built the next set from the set as it stood at the last render, which is
correct exactly once per render and these rounds are not once per render. Two targets hit in one
frame counted as one, and a round that had been cleared did not finish. `app/collected.ts` is the
one answer: a ref is the record, the state beside it only asks React to draw.

Also fixed: a hold whose touch the browser takes back (a system gesture, a call) left the button
held with nothing on it, so only the clock could end the round — `pointercancel` is a let-go now, in
the two hold mechanics and the hold engine. And the Learn pane took the swipe gesture from three
pixels of movement, narrower than a thumb; it waits for 24 now (measured: a 14px wobble leaves the
pane at 0.00px, a 160px swipe still switches both ways).

**Not a defect, checked and left alone.** Taps on the moving pieces of the Chaos Run land: 5 of 5
in target_swat and goal_protection with a finger resting 120ms. And a tap lost at 20px of drift is
the browser's own slop, not this app's — the same drift loses the same tap on the plain Modules
tab, which has no drag within reach of it.

### The glass

White glass on white paper is not glass. With the WebGL ground absent — no WebGL2, a software
renderer, reduced transparency, every capture in `qa/` — there was nothing behind a bubble to
bend, and the CSS layer had only a 0.18-alpha dispersion split to say otherwise.

| Screen | Finding | Change |
|---|---|---|
| Games pane | The Play button, the most important control on the page, was a white pill on pale stone | `--play-blue` is declared on `.play-run`; outside a run the whole `background` declaration fell away. The token now falls back to the platform accent |
| Games pane | "The eight lives" was a white rectangle: it took the glass fill with square corners | A pill |
| Every glass control | One flat wash and a 1px split nobody could see | A bright rim where the light enters, the warm and cool split down the two sides, a Fresnel ring, a seat at the foot for thickness, and a press that compresses the bubble and slides its highlight instead of dimming it |
| Every glass control | The specular sat still: only the coloured tiles and Leo's card tracked a finger, each with four pointer handlers of its own | One delegated listener lights whatever is under the finger (`app/glass/glass-pointer.tsx`), off the same list the WebGL layer draws. The per-tile handlers are gone |
| The games scope | Flat paper behind the bubbles | Three washes from the brand's own warm-to-cool family on the scope itself. A first attempt put them on a fixed negative-z layer, where the shell's opaque ground painted straight over them |
| The Chaos Run title card | A flat fill with two thirds of the phone empty under it | The same light, on the card, since the card is what covers the scope |

Nothing here animates on its own: the only motion is the finger's. Under `prefers-reduced-motion`
the delegated listener does not attach and the press does not compress; under
`prefers-reduced-transparency` the washes and the rims are gone and the controls are paper; where
the WebGL layer runs it draws the ground and the CSS washes stand down.

### Stage 6b: the bubbles, made playable

Founder, on reading stage 6: "by not look boring I meant make it more interactive, right now it's
continuous connected bubbles, it should have interaction and be playable with your bubble that the
tap has." Stage 6 had made the glass read as glass and left it inert. Two findings.

| Finding | Change |
|---|---|
| One merge rate did two jobs. The studio's `mergeRate` of 0.05 is about a twentieth of the screen's height — some forty pixels — and it was applied between every pair of surfaces, so any two controls within forty pixels of each other fused. A row of buttons drew as one connected ribbon of glass, which is exactly the phrase the founder used | Two merges (`MERGE` in `studio/params.ts`). Surfaces melt into each other at 0.012, so a row reads as a row of separate bubbles; a droplet melts into whatever it reaches at 0.075, which is the interaction |
| Nothing a finger did changed anything. One droplet followed the pointer and passed over the glass; a tap did nothing at all | A tap leaves a droplet of its own: it blooms out of the point it landed on, melts into the glass it reaches and lets go (`TAP_DROP`, up to five alive at once so a drumming thumb cannot unbound the shader's loop). The droplet under the finger swells on press and starts from where the finger is, not from where the spring had got to |
| The WebGL layer needs WebGL2 and a real GPU and stands aside without them — which is most testing machines and some phones, so the "playable" half would have been invisible to the people most likely to see the app | The same tap blooms in CSS (`app/glass/glass-pointer.tsx` marks the surface, `glass.css` opens the bubble out of `--lg-x`/`--lg-y`, clipped to the surface). Measured on the Chaos Run's Play button: `data-tap` set, `--lg-x: 30%` where the finger landed, the bubble mid-flight at 0.50 opacity and 6.96× |

Under reduced motion neither exists: the delegated listener does not attach and the keyframes are
switched off.

### Stage 6 verification

| Check | Result |
|---|---|
| Unit suite | 4,016 passed, 267 files |
| e2e `learn-panes`, `leo-mosquito`, `learning-play`, `adhd-life` | 40 passed |
| e2e `adhd-lives`, `app-shell` | 25 passed |
| Text budget, 32 app screens | 0 over; median 27; a game run's title card 6, the Chaos Run's first round 8 |
| The three drag-swallowed taps, re-measured at 0, 8, 20, 40 and 70px of thumb drift | swipe card and slip act at every drift (before: nothing past 20px) |
| The wipe grid, one finger dragged across four tiles | every tile it crosses (before: two) |

One regression this work caused and caught: `useCollected` first exposed `size` as a value read at
render, so the caller asking "is the round finished?" on the next line still saw the count one
short and a cleared round never ended. Two `adhd-lives` specs failed on it; `size` is a getter now
and they pass. The measurement that found it is why the suite is run rather than reasoned about.

Two specs fail in this container for reasons this change did not cause, confirmed by running them
on a pristine tree: `keyboard-focus` and `text-budget` both walk every public route with a 240s cap,
and every route takes about 13 seconds to reach `networkidle` here, so the walk runs out of time
before it runs out of routes. The budget's own CLI has no such cap and reports 0 over.
