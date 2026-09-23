# Game enhancement prompts: every game to the Leo standard

One prompt per game. Each is written to be pasted whole into a build session and is
precise enough that two builders would ship the same thing. The format follows the
LOUD HOUSE RECORDS issue: `PROMPT` (the exact paragraph), `SHARED REQUIREMENTS`
(numbered, stated once below and inherited by every prompt), `DESCRIPTION`,
`MAJOR VISUAL TECHNIQUES`, `INTERACTION MODEL`, and one section this repo adds,
`SOUND & MUSIC`, because sound was the missing tenth point in
`docs/design/games-to-leo-standard.md`.

Coverage: the shared audio engine (§1), the eight public character games (§2), all
32 arcade registry games in `src/lives/games.ts` grouped by world (§3), and the 14
approach-run mechanics in `app/play/mechanics.tsx` that carry the 20 learning
modules (§4). Acceptance is in §5.

Where this document says "Leo", it means the current `/lives/play/leo-mosquito`
build and its bedroom (`app/lives/leo-room/`), which is the quality bar the founder
set: a composed scene, a character who reacts, drawn pieces that move the way the
real thing moves, a wave rhythm, a readable stake, feedback on every touch, one
palette, the HUD inside the world, full keyboard and screen-reader access, and no
new words.

---

## 0. SHARED REQUIREMENTS (inherited by every prompt below)

1. **Ships inside this repo, not as a single file.** Each game is a React 19 client
   component under `app/lives/` (or `app/play/mechanics.tsx` for run rounds), drawn
   with inline SVG and CSS, no images, no fonts, no fetches, no third-party audio
   or animation libraries. Nothing in `public/games/v2/` is loaded at runtime; the
   WAV pack stays a reference for the synth recipes.
2. **Valid, accessible markup.** One `<h1>` per screen. Every interactive element is
   a `<button>` or a native input, minimum 44 by 44 CSS px hit area, with an
   `aria-label` when its content is a drawing. The play surface has
   `role="application"` only when it owns key handling, otherwise `role="group"`
   with a label. A live region (`aria-live="polite"`) announces round start, each
   hit or miss in three words or fewer, and the round result.
3. **System font stack, no webfonts.** `ui-rounded, system-ui, sans-serif`. Sizes
   from the existing `app/styles/lives.css` scale; nothing under 16 px.
4. **Responsive from 360 px wide.** The scene is an SVG with a fixed `viewBox`,
   `preserveAspectRatio="xMidYMid meet"`, filling the shorter side of the viewport.
   Phone portrait is the primary layout; landscape and desktop simply gain margin.
5. **Offline first.** Everything renders with the network off after first load. No
   analytics, no remote logging, nothing personal in a URL.
6. **Motion.** All continuous motion runs in one `requestAnimationFrame` loop with a
   fixed timestep (16.67 ms, catch-up capped at 4 steps). Transient reactions use
   CSS transitions on transform and opacity only. Under
   `prefers-reduced-motion: reduce`, hovering, wobbling, parallax and screen shake
   stop, pieces move in short steps at the same tempo, and every state change is
   still visible by colour and position.
7. **Input.** Pointer events only (`pointerdown`, `pointermove`, `pointerup`,
   `pointercancel`, `setPointerCapture`), `touch-action: none` on the surface, and
   full keyboard play: Tab reaches every piece in reading order, Space or Enter acts,
   arrow keys move a cursor or a held piece, Escape pauses. `:focus-visible` shows a
   3 px ring in the world's ink colour with 2 px offset, never removed.
8. **Sound.** All sound is synthesised in the Web Audio API through the shared engine
   in §1. No sound plays before a user gesture. A visible mute button sits inside
   the scene HUD on every game, the state persists across games and sessions in one
   key, and the default for a new player is muted. Sound is never required to play.
9. **Premium finish, original copy.** No clip art, no emoji, no placeholder text. Every
   drawn piece is a bespoke SVG built from at most eight shapes in the world's palette
   (`--w1` to `--w7` in `lives.css`). Copy is invented for this app: no song lyrics,
   brands, trademarks, or quoted text.
10. **The word law.** A game screen holds 20 to 60 words including the HUD, target 40,
    measured with `BASE=http://localhost:3620 node scripts/text-budget.mjs` and the
    number goes in the commit. Instruction is one imperative of one to three words in
    the world's voice (`GET IT!`, `JUST MILK!`). No explanatory paragraphs, no ledes,
    no provenance comments.
11. **The Leo bar (from `games-to-leo-standard.md`).** Scene composed from at least
    five layered drawn elements; the character is present and reacts through a
    `data-emotion` attribute with at least four states (`calm`, `alert`, `hit`,
    `relieved` or the world's equivalents); pieces move the way the real thing moves
    (a mosquito zig-zags, a pigeon struts, toast pops); waves of increasing pressure
    with a breath between waves; a stake the player can read at a glance without
    numbers; feedback within one frame of every touch; the HUD (wave, stake, mute,
    pause) is drawn in the world, not in a bar above it.
12. **Repo laws.** No diagnosis language, no scores shown as numbers to the player
    (progress is drawn, not counted), no clinical text authored by ADHD.ME, synthetic
    data only, nothing personal in a log. Difficulty follows `src/lives/difficulty.ts`
    and results flow through the existing `src/lives/score.ts` and `session.ts`
    contracts, unchanged. Tests: a Vitest unit test for any new pure module, and one
    Playwright spec per public game proving keyboard play to the result screen with
    sound muted and unmuted. Commit to main and push after each game.

---

## 1. SHARED SOUND ENGINE: `app/lives/sounds.ts`

=== PROMPT (exact prompt used) ===
Build `app/lives/sounds.ts`, a dependency-free Web Audio engine used by every game, replacing the ad hoc `LeoBuzz` and `BedroomAudio` classes while keeping their public behaviour. Export a singleton `Sound` with `unlock()` (creates or resumes one `AudioContext` on the first pointerup or keyup anywhere on a game surface, never earlier), `muted` (boolean, read from and written to `localStorage["adhdme.sound"]` with values `"on"` or `"off"`, default `"off"`, mirrored to a `data-sound` attribute on `<html>` so CSS can style the toggle), `toggle()`, `score(worldId)` returning a `Score`, `sfx` returning an `Sfx` bank, and `duck(ms)`. Signal chain: every voice goes into a per-bus gain (`music`, `sfx`, `ambience`), buses sum into a `DynamicsCompressorNode` (threshold -18 dB, knee 12, ratio 4, attack 0.003, release 0.25) then a master `GainNode` at 0.7 and the destination; muting ramps master to 0 over 80 ms with `setTargetAtTime` and suspends the context after 200 ms, unmuting resumes and ramps back. `document.visibilitychange` to hidden suspends within 50 ms; a game's pause does the same through `Sound.pause()`/`Sound.resume()`. `Score` is a pattern sequencer clocked by an `AudioContext` lookahead scheduler (25 ms timer, 100 ms lookahead), with `start()`, `stop()`, `intensity(0..1)` (adds or removes layers without stopping), `stinger(name)` (a one-bar phrase on the next beat boundary), and `tempo(bpm)` glide over two bars. Each world provides a `ScoreSpec` object: key, mode, bpm, time signature, a chord loop of four to eight bars, and up to five layers (`bed`, `pulse`, `melody`, `counter`, `sparkle`), each a voice recipe (oscillator type or `PeriodicWave` partials, ADSR, filter, detune, stereo width) plus a pattern of 16th-note steps per bar. Every note is a new `OscillatorNode` and `GainNode` pair scheduled with `start`/`stop`, released and garbage collected; no more than 24 voices may sound at once (drop the oldest). `Sfx` is a bank of named functions, one per diegetic sound, each returning in under 60 ms of audio graph work, all parameterised by `{x, y, velocity, size}` so position maps to a `StereoPannerNode` (-0.8 to 0.8) and distance to a lowpass cutoff and gain. Ducking: any `Sfx` call with `duck: true` drops the music bus to -9 dB for 180 ms with a 400 ms recovery. Provide `Noise` helpers (white via a 2 s `AudioBuffer` of random samples, pink through a Paul Kellet filter, brown by a leaky integrator) cached once. Provide the mosquito voice as a first-class instrument: `Mosquito` with `spawn(id)`, `move(id, x, y, vx, vy)`, `land(id)`, `swat(id)` and `release(id)`, implemented as documented in §1.2. Provide the mute control as a React component `<SoundToggle world="leo" />` that renders a 44 px SVG button drawn in the world palette (a small speaker with three arcs when on, a speaker with a diagonal bar when off), `aria-pressed` reflecting the state, `aria-label` exactly `Sound on` or `Sound off`, placed by the game inside its HUD group. Unit-test the scheduler with a fake clock, the persistence round trip, the voice cap, and the mosquito Doppler formula. No playback ever starts unless `Sound.muted` is false and `unlock()` has run.

=== DESCRIPTION ===
One engine, many worlds. The player decides once whether the app makes sound and every game honours it. When they say yes, each world has its own short piece of music that breathes with the round (louder and busier as the wave builds, resting between waves), and every drawn thing has a voice that comes from where it is on screen. Nothing is sampled: the buzz, the pop, the quack, the hum of the fridge and the four-bar loops are all generated from oscillators and filtered noise, so the app stays offline and small.

=== MAJOR VISUAL TECHNIQUES ===
- The toggle is drawn, not iconed: three concentric arcs fade in one at a time on unmute (staggered 60 ms), the bar wipes across on mute.
- `html[data-sound="on"]` lets each world add a two-frame "listening" detail: Leo's lamp cord sways, the shop's neon flickers, the office monitor glows a touch brighter. Under reduced motion the detail is static.
- No visualiser, no waveform. Music is felt through the scene's existing rhythm (wave pulse, character breath), so the muted experience is identical in layout.

=== INTERACTION MODEL ===
- First pointerup or keyup on a game surface calls `unlock()`; if the stored preference is `on`, the score starts on the next beat boundary, not immediately, so entry never clicks.
- Toggle is reachable by Tab in the HUD order (mute, pause), by the `m` key, and it never steals focus from a held piece.
- Muting mid-round keeps the round running; unmuting mid-round joins the score at the current bar with intensity matching the wave.
- Screen readers hear `Sound on` / `Sound off` and nothing else from the engine.

=== SOUND & MUSIC ===
1.1 World score palette (all in `src/lives/scores.ts`, one `ScoreSpec` each):

| world | key / mode | bpm | meter | bed | pulse | melody | counter | sparkle |
|---|---|---|---|---|---|---|---|---|
| leo (bedroom, night) | E minor pentatonic | 72 | 4/4 | filtered brown noise + sub sine E1 | soft kick (sine 60→40 Hz, 120 ms) on 1 and 3 | triangle, 2-bar phrase, long release | none | high sine plinks, 1 in 8 steps |
| theo (morning) | C major | 112 | 4/4 | organ-ish (square + triangle, lowpass 900 Hz) | wood tick (noise burst 8 ms, bandpass 2 kHz) on every beat | bright triangle, 4-bar rising phrase | sawtooth bass on roots | bell (sine + 2.76× partial) on bar 1 |
| mia (kitchen) | G major | 96 | 6/8 | warm pad (2 detuned triangles, ±7 cents) | brushed hat (pink noise 20 ms) | flute-like sine w/ 5 Hz vibrato | pizzicato (short triangle) thirds | none |
| zoe (phone, night) | A minor | 84 | 4/4 | sub sine + soft square | clipped click (2 ms) on 2 and 4 | detuned square lead, 1-bar riff | pulse-width shifting pad | typing ticks on 16ths at intensity > .6 |
| arjun (office) | D dorian | 100 | 4/4 | Rhodes-like (sine + 3rd partial, decay 800 ms) chords | rim (noise 5 ms, highpass 3 kHz) | none until intensity .5, then muted trumpet (sawtooth, lowpass 1.2 kHz, formant sweep) | walking bass, one note per beat | none |
| jax (supermarket) | F major | 118 | 4/4 | muzak strings (3 detuned sawtooths, lowpass 700 Hz) | trolley squeak (sine 1.8 kHz glide, 40 ms) on the "and" of 2 | vibraphone (sine + 4× partial, tremolo 6 Hz) | none | till beep (square 1 kHz, 60 ms) every 2 bars |
| nina (desk, evening) | B♭ major 7 | 66 | 3/4 | nylon string pluck (triangle, fast decay) arpeggio | none | soft sine, sparse (2 notes per bar) | none | page rustle (pink noise, 200 ms, lowpass sweep) at bar ends |
| maya (street) | E♭ mixolydian | 108 | 4/4 | traffic hum (brown noise bandpass 120 Hz) | footstep (sine 90 Hz, 60 ms) alternating pan | marimba (sine + 4× partial, 150 ms) | horn pads (2 sawtooths, lowpass 500 Hz) at intensity > .7 | pedestrian signal tick (square 2.5 kHz, 30 ms) on beat 1 |
| chaos (random arcade) | changes per game, see §3 | | | | | | | |

Rules: `intensity` maps to layers as bed always, pulse ≥ .2, melody ≥ .4, counter ≥ .6, sparkle ≥ .8; between waves the score drops to bed and pulse over two bars; the result screen plays one `stinger("win")` or `stinger("rest")` (a resolved cadence versus a suspended one) then stops.

1.2 The mosquito instrument, exactly:
- Fundamental is the wing beat: female mosquito 400 to 620 Hz. Assign `f0 = 440 + (id % 9) * 23` as today, keep it.
- Body: `OscillatorNode` with `createPeriodicWave(real=[0,1,.8,.4,.2,.1,.05,.02,.01], imag=zeros, {disableNormalization:false})`, giving the sawtooth-like harmonic stack of a real wing recording.
- Wing beat amplitude modulation: a second `OscillatorNode` (sine at `f0 / 2`) into a `GainNode` with gain 0.35 modulating the body gain, so the tone has the 2-per-cycle flutter.
- Vibrato: a sine LFO at 5.5 Hz ± 0.6 Hz per mosquito, depth 2.5% of `f0`, into `detune`.
- Flight-tone instability: every 300 to 700 ms, `f0` drifts by ±4% over 120 ms (`linearRampToValueAtTime`), because a mosquito changing direction changes wing beat.
- Doppler: `f = f0 * (343 / (343 - v_radial))` where `v_radial` is the mosquito's velocity toward the listener at the screen centre bottom, scaled so a full-speed dive raises pitch by 6% and a retreat lowers it by 6%.
- Distance: mosquito `size` (scale 0.5 to 1.4) sets gain `0.008 + 0.03 * size` and a lowpass at `1200 + 4000 * size` Hz, so far ones are thin and near ones are full.
- Pan: `x` mapped to -0.8..0.8 on a `StereoPannerNode`.
- `land(id)`: gain to 0 over 40 ms (a landed mosquito is silent) and a single 15 ms pink-noise tick at -30 dB.
- `swat(id)`: stop the body, play a 25 ms white-noise burst through a bandpass at 1.5 kHz with Q 2, plus a 60 ms sine dropping 300→90 Hz at -12 dB (the slap), ducked music.
- `release(id)`: when it escapes off-screen, `f` glides down 12% over 250 ms and gain to 0.
- Master mosquito gain 0.16 as today; with three or more alive, scale each by `1/sqrt(n)`.

1.3 Diegetic SFX bank (names used by §2 to §4): `swat`, `slap`, `pop` (sine 800→200 Hz, 70 ms), `sizzle` (white noise, bandpass sweep 3 kHz→800 Hz, 600 ms), `plate` (sine 1.2 kHz + 2.4 kHz, 400 ms decay), `quack` (sawtooth 380 Hz with formant bandpass 1.1 kHz, 3 amplitude bumps over 220 ms), `honk` (two sawtooths 220 and 330 Hz, 350 ms, lowpass 1.5 kHz), `coo` (sine 650 Hz with 8 Hz vibrato, 300 ms), `wingflap` (pink noise, 60 ms, three repeats 90 ms apart), `ping` (sine 1.6 kHz, 500 ms decay), `tick` (noise 4 ms), `whoosh` (pink noise, lowpass sweep 300→4000 Hz, 250 ms), `thud` (sine 70 Hz, 90 ms), `click` (2 ms noise + sine 2 kHz 10 ms), `keytap` (noise 6 ms highpass 3 kHz), `lid_rattle` (square 110 Hz gated at 22 Hz, 200 ms), `wheel_squeak` (sine 1.5→2.1 kHz glide, 120 ms), `blender` (sawtooth 95 Hz + noise, lowpass follows speed), `toaster_pop` (thud + tick + spring: sine 900→1400 Hz 80 ms), `bubble` (sine 400→900 Hz, 50 ms, small size = higher), `sneeze_build` (breath noise swell 900 ms), `sneeze` (noise burst 180 ms + `thud`), `shower` (pink noise, lowpass 2 kHz, continuous), `light_switch` (two clicks 60 ms apart), `phone_buzz` (square 180 Hz gated at 30 Hz, 240 ms), `notification` (sine 880 + 1108 Hz, 120 ms), `door` (thud + creak: sawtooth 240→300 Hz 180 ms), `zip` (noise, highpass sweep 500→6000 Hz, 150 ms), `chime` (sine, 3 stacked fifths, 900 ms), `rustle` (pink noise, 200 ms), `scribble` (noise gated at 11 Hz, 300 ms), `fridge_hum` (sawtooth 50 Hz + 100 Hz, lowpass 200 Hz, continuous), `till` (square 1 kHz, 60 ms), `trolley` (brown noise + `wheel_squeak` every 700 ms), `traffic` (brown noise bandpass 120 Hz, continuous), `bus` (sawtooth 65 Hz swell 1.2 s with Doppler), `bike_bell` (sine 2.1 kHz, two hits 90 ms apart), `bark` (sawtooth 260 Hz, formant 900 Hz, 140 ms), `signal_tick`, `spider_step` (tick, 4 repeats 70 ms apart, very quiet), `error_buzz` (square 120 Hz, 200 ms, -18 dB, only ever once per round), `stamp` (thud + click), `win` and `rest` (score stingers, not SFX).

---

## 2. THE EIGHT PUBLIC GAMES

Each of these is a route in `src/lives/entry-points.ts`. Leo is the bar; his prompt
is written as the upgrade from the current build (sound as music, not only buzz),
and every other prompt is written to reach that bar.

### 2.1 Leo: the mosquito, `/lives/play/leo-mosquito`

=== PROMPT (exact prompt used) ===
Upgrade Leo's bedroom game in `app/lives/leo-mosquito.tsx`, `app/lives/leo-room/` and `src/lives/leo-swarm.ts` without changing its rules: three mosquito waves of three, four and five, each wave a little faster, then the five routine actions (close the window, phone off, headphones on, read a little, light off) in `src/lives/leo-routine.ts`. Keep the existing scene (bed, lamp, window, desk, Leo sitting up) and add a sixth and seventh layer: a curtain that moves with the window state and a slow moon-shadow that crosses the floor over the whole game, both static under reduced motion. Replace `LeoBuzz` and `BedroomAudio` with the shared engine from §1: every mosquito is a `Mosquito` voice with Doppler, pan and distance; the score is the `leo` spec, starting at intensity 0.2 on wave one and reaching 0.8 by the fifth mosquito of wave three; between waves the score rests to bed and pulse for two bars while Leo breathes out (`data-emotion="relieved"`, chest scale 1 to 1.04 to 1 over 1.6 s). Mosquito flight keeps `leo-flight.ts` but adds the three flight modes a real mosquito shows: cruise (smooth bezier between waypoints), hunt (short darts of 120 ms toward Leo's head, then a hover), and land (settles on the wall or Leo's arm, goes silent, waits 900 ms, then takes off); the mode is visible in the wing-blur width (cruise 2 px, hunt 4 px, land 0). A swat is a pointerdown inside a 74 px circle; on hit the mosquito folds (two-frame wing collapse, 90 ms), drops 12 px with gravity and fades in 220 ms, the `swat` SFX plays panned to its x, music ducks, Leo's face goes `data-emotion="hit"` for 300 ms, and a small palm print appears on the wall for one second when the mosquito was against the wall. A miss spawns a ripple ring at the touch point (opacity .5 to 0, radius 8 to 36 px, 200 ms) and a `tick`. When a mosquito lands on Leo, his emotion goes `alert`, the pulse layer doubles for one bar, and the stake meter (a sleep-dial drawn in the lamp glow, not a number) drains. The routine phase after wave three keeps its five buttons drawn in the room (window handle, phone on the desk, headphones on the hook, book, switch) with the SFX `door` for the window (use it at half gain and pitch 1.2 for the sash), `phone_buzz` stopping on phone off, brown-noise bed swapping to the headphones' inner hush (lowpass 550 Hz, as today) on headphones on, `rustle` for the book and `light_switch` for the lamp; each action lowers the score intensity by 0.15 and the final light off ends the score with `stinger("rest")` and the room going to its night palette over 1.2 s. HUD in the world: wave count as three small moths on the lampshade that light up, mute as the `<SoundToggle world="leo" />` drawn on the bedside radio, pause on the alarm clock. All copy stays exactly as it is today (`GET IT!`, the five routine labels, the result line). Keyboard: Tab cycles through live mosquitoes in spawn order, Space swats the focused one, arrow keys move a 74 px cursor at 6 px per frame for players who prefer it. Reduced motion: mosquitoes teleport between waypoints every 400 ms, no wing blur, and the swat ripple is a single static ring. Tests: extend `e2e/leo-mosquito.spec.ts` to unmute, swat with keyboard through all three waves, complete the routine, and assert `localStorage["adhdme.sound"]` survives a reload; unit-test the flight-mode state machine in `leo-flight.test.ts`.

=== DESCRIPTION ===
Leo is trying to sleep and the room will not let him. Three mosquitoes become four, then five, and each wave they fly bolder, hunting for his head. The player swats them out of the air, and between waves the room settles and Leo breathes. When the last one falls he still has to make the room sleepable: window, phone, headphones, a page of a book, the light. The music is a night piece in E minor that is barely there at the start and swells with the swarm, then falls away as each part of the routine is done, until the lamp click ends it.

=== MAJOR VISUAL TECHNIQUES ===
- Seven-layer bedroom in the `--w1..--w7` night palette: wall, window with curtain, moon shadow (a skewed rectangle translating 40 px across the game), bed, desk, Leo, lamp glow (radial gradient, opacity tied to score intensity).
- Mosquito as five shapes: body ellipse, two wing ellipses with `feGaussianBlur` whose `stdDeviation` equals flight-mode blur, two leg lines, proboscis line; wings toggle between two rotations every frame in cruise, every second frame in hunt.
- Leo's `data-emotion` drives eyebrows (rotate), mouth path (`d` swap) and blanket grip (hands translate 3 px).
- Palm print: a five-ellipse group at 30% ink, fades in 60 ms, out over 900 ms.
- Sleep-dial stake: an arc in the lamp glow that shortens as mosquitoes bite, refills 10% per swat.

=== INTERACTION MODEL ===
- Pointerdown anywhere on the scene swats; hit test against every live mosquito's 74 px circle, nearest wins.
- Held pointer does nothing further (no drag-swatting) so accidental sweeps do not clear the screen.
- Keyboard cursor and Tab focus are equivalent inputs; a focused mosquito shows the focus ring around its circle.
- Routine buttons are real `<button>`s positioned in the SVG with `foreignObject`, in reading order window, phone, headphones, book, light.
- Pause freezes flight, silences mosquitoes (gain to 0 over 40 ms), holds the score bar.

=== SOUND & MUSIC ===
- Score `leo` (E minor pentatonic, 72 bpm): bed brown noise + E1 sub, pulse soft kick, melody triangle two-bar phrase, sparkle plinks. Intensity 0.2 → 0.8 across the waves, rest between waves, ends on `rest` cadence when the light goes off.
- Mosquito voices per §1.2; three or more scale by 1/√n.
- SFX: `swat`, `tick` (miss), `door` (sash), `phone_buzz` (stops), `rustle`, `light_switch`; headphones swap the bed to the inner hush.
- Mute toggle drawn on the bedside radio.

### 2.2 Theo: out the door, `/lives/play/theo-out-the-door`

=== PROMPT (exact prompt used) ===
Rebuild Theo's morning in `app/lives/theo-morning/` and `app/lives/theo-game.tsx` over the existing `src/lives/theo-morning.ts` and `src/lives/theo-launch.ts` simulations to the Leo bar. The scene is a hallway seen from the front door looking in: door with a coat hook and a key bowl (layer 1), a hallway runner (2), a bathroom door with steam (3), a kitchen doorway with a kettle (4), Theo (5), a wall clock that is the stake (6), a window whose light warms from grey-blue to gold over the whole game (7). The playable challenge starts immediately: the launch phase from `theo-launch.ts` shows the eleven items (keys, wallet, phone, travel pass, shoes, coffee, book, laundry, plant, controller, email) scattered along the hallway as drawn objects and the player taps only what goes out the door; items drift slowly toward Theo's hand along the runner (2 px per frame, reduced motion 8 px every 250 ms), and every wrong item picked makes the clock's minute hand jump five minutes with a `tick` and Theo's `data-emotion="alert"`, every right item snaps to the hook or bowl or pocket with a `zip` or `click` and Theo goes `calm`. Three waves: essentials (keys, wallet, phone, pass), then the same with three lures added, then all eleven with the timer visible. After the launch, the morning simulation plays as the sequence of drawn rooms: shower (steam grows, a `shower` noise bed, the player releases at the right moment, see 3.x `theo_shower`), kettle (a rising `sizzle`-derived hiss), dressing (a drag of three clothes onto Theo in order), and the final door. The stake is the wall clock only, no digits: a red wedge on the face grows from "bus" backwards as time is spent, and Theo's shadow lengthens on the runner as it grows. The `theo` score starts at intensity 0.3 and rises with the wedge, reaching 1.0 in the last 20% of time; if the player finishes with time to spare the score plays `stinger("win")` and the door opens on gold light, otherwise Theo still leaves (never a fail screen) and the score resolves with `rest` on a slightly flatter chord. HUD in the world: mute drawn on the kitchen radio, pause on the clock, wave as three coat pegs that fill. Copy unchanged from today's build. Keyboard: Tab through the drifting items in distance order, Space picks; arrows steer the drag in dressing. Playwright: keyboard-only run from route to result, sound on and off, under 40 seconds.

=== DESCRIPTION ===
Theo has a bus to catch and a hallway full of things that want to come with him. The first job is the one ADHD makes hardest: take only what goes out of the door, while the wrong things drift into reach. Then the morning itself, room by room, each with its own way of stealing five minutes. The clock on the wall is the whole story: a red wedge growing towards the bus, Theo's shadow getting longer, and a C-major morning piece that gets more urgent the less time there is.

=== MAJOR VISUAL TECHNIQUES ===
- Long horizontal viewBox (`0 0 900 600`) so the hallway reads as depth; items scale from .7 at the far end to 1 near Theo.
- Window light: two stacked rects (`--w2` and `--w6`) with the top one's opacity animating 0 → 1 across the whole game duration.
- Steam: three ellipses rising and blurring (`feGaussianBlur` 3 → 8) on a 2.2 s loop while the shower runs.
- Clock wedge: an SVG arc path recomputed each second; the minute hand jumps with a 120 ms ease-out overshoot.
- Theo `data-emotion`: `calm`, `alert`, `hurry` (leaning 6°), `out` (back view, one frame).

=== INTERACTION MODEL ===
- Launch: tap the item, not a card; correct items animate 300 ms to their home; wrong ones bounce back and cost time.
- Shower: hold on the tap handle, release inside the window (see `theo_shower`), a long hold fogs the mirror.
- Dressing: three drags with pointer capture; drop zone is Theo's silhouette; wrong order just refuses with a `thud`.
- Door: one final tap when everything is in place; the door swings 70° over 500 ms.

=== SOUND & MUSIC ===
- Score `theo` (C major, 112 bpm): organ bed, wood tick pulse, rising four-bar melody, sawtooth bass, bell on bar one. Intensity tracks the clock wedge.
- SFX: `zip` (pocket), `click` (bowl), `tick` (time lost), `shower` bed, `sizzle` at half gain as the kettle, `thud` for a refused drag, `door` at the end, `win`/`rest`.
- Mute toggle on the kitchen radio.

### 2.3 Mia: remember why, `/lives/play/mia-remember-why`

=== PROMPT (exact prompt used) ===
Rebuild the Mia route in `app/lives/mia-world/player.tsx` over `src/lives/mia-world.ts` (a 4×4 tile routing puzzle with rotate, anchor, cue, pulse, park, revisit) to the Leo bar without changing the reducer. The scene is Mia's flat from above at a slight tilt: the 16 tiles are the floorboards of a corridor from the sofa (start, tile 4) to the kitchen doorway (goal, tile 7), with the intention written on a sticky note by the sofa (`INTENTIONS[round]`) and the kitchen drawn beyond the doorway (layer 7). Each tile is a drawn floor section with a rug pattern showing its ports; rotating a tile spins the rug 90° over 180 ms with a `whoosh` at low gain; a connected path lights the boards in `--w5` progressively from the sofa (60 ms per tile) so the player sees how far the route reaches. Mia stands on the last connected tile and walks there when the path grows (2 px per frame, reduced motion steps per tile); her `data-emotion` is `calm` while the path grows, `lost` when a `pulse` (a distraction thought from `THOUGHTS`) drifts in as a floating cloud that dims the boards, `held` when the player parks the thought (drag the cloud onto the kitchen noticeboard, `stamp` SFX), `arrived` at the goal. The `cue` actions become drawn objects: `note` is the sticky note peeled off the sofa and stuck to the goal doorway, `say` is a speech bubble from Mia with the intention text; both play `rustle` or a two-note `chime`. Anchor is a small drawn drawing pin on the tile, `click`. The three rounds keep `PATHS[0..2]` and the revisit phase re-asks with the note in place. Stake: the sticky note's ink fades as pulses accumulate (opacity 1 → .35), never a count. The `mia` score in G major 6/8 starts at intensity .3; a pulse raises the counter layer and detunes the pad by 12 cents for two bars (the world going slightly wrong), a park restores it; arrival plays `win`. HUD in the world: mute on the kitchen radio, pause on the wall calendar, round shown as three mugs on the counter. Copy exactly today's (`WHY ARE YOU HERE?`, the intention strings, the messages). Keyboard: arrow keys move a tile cursor, Space rotates, `a` anchors, `n` and `s` for the cues, `p` parks; Playwright drives a full route with keys.

=== DESCRIPTION ===
Mia got up to do one thing. Between the sofa and the kitchen the floor rearranges itself and thoughts drift in like weather. The player turns the floorboards so a path lights up from where she is to where she meant to go, parks each thought on the noticeboard, and leaves a note at the door for the next time. The music is a gentle 6/8 kitchen waltz that goes slightly out of tune whenever a thought is loose and comes back into tune when it is parked.

=== MAJOR VISUAL TECHNIQUES ===
- Tilted top-down room via a single `skewX(-6)` on the floor group; furniture drawn as flat shapes with a 2 px `--w7` shadow.
- Tile rugs: `line` tiles a runner with a stripe, `bend` a quarter-circle rug; ports match `ports(tile)`.
- Path light: `stroke-dasharray` on a route polyline animated by `stroke-dashoffset` so the light travels.
- Thought cloud: three overlapping circles, `feGaussianBlur` 2, floats on a 4 s sine, casts a dim overlay on the boards below.
- Sticky note fade and speech bubble are plain SVG with `opacity` transitions.

=== INTERACTION MODEL ===
- Tap a tile to rotate (pointerup within 300 ms and 8 px of pointerdown); tap and hold 400 ms anchors it.
- Drag the thought cloud to the noticeboard (pointer capture; drop within 60 px snaps).
- Cue buttons are the note and Mia herself; each is a `<button>` in `foreignObject`.
- Pause on the calendar stops the cloud and the score.

=== SOUND & MUSIC ===
- Score `mia` (G major, 96 bpm, 6/8): detuned pad, brushed hat, flute sine, pizzicato thirds. Pulses detune the pad; parking restores; arrival `win`.
- SFX: `whoosh` (rotate, gain .3), `click` (anchor), `rustle` (note), `chime` (say), `stamp` (park), `tick` (a dead-end rotate).

### 2.4 Zoe: before you send, `/lives/play/zoe-before-you-send`

=== PROMPT (exact prompt used) ===
Rebuild the Zoe route in `app/lives/zoe-world/player.tsx` over `src/lives/zoe-world.ts` (draft with fact, need, plan, time; ask; save; sharp reply and repair; setup; revisit) to the Leo bar without changing the reducer. The scene is a phone held in Zoe's hands at night, drawn at `viewBox 0 0 420 760`: the room behind in the `--w1` blue-black (layer 1), Zoe's hands and thumbs (2), the phone body (3), the chat with Rae's messages as drawn bubbles (4), the draft bar (5), a SEND button that is a real drawn thing that misbehaves (6), and the status bar with a battery that is the stake (7). The playable challenge starts at once: the draft is built by tapping one drawn chip each for fact, need and plan and a drawn slider for time, but the SEND button pulses, grows and creeps toward Zoe's thumb at 0.6 px per frame while the draft is incomplete or `sharp`, and touching it before the draft is complete fires the sharp reply branch with a `phone_buzz` and the screen shaking 3 px twice (no shake under reduced motion, a red flash instead). Ask is a drawn chip that sends a question bubble up the chat with a `whoosh` and returns Rae's answer with `notification`. Save is a paper-plane icon folding into the drafts drawer with `zip`. Zoe's `data-emotion` on the hands: `steady` (thumbs resting), `itch` (thumb hovering 4 px above SEND, twitching every 800 ms), `sent` (both thumbs up, one frame), `sorry` after a sharp reply (thumbs curled), `repaired`. The battery stake drains while the send button grows and recharges when the draft gains a part. Complete phase and setup keep their existing choices as drawn chips on Rae's next message. The `zoe` score in A minor at 84 bpm runs at intensity .3 while the draft is calm; the SEND button's growth adds the `sparkle` typing ticks and pushes intensity toward .9 as it nears the thumb; a completed, good send plays `win`; a sharp send plays a two-bar suspended `stinger("sharp")` (add it to the spec: the melody riff one semitone up over a held bass). HUD in the world: mute on the phone's status bar (a drawn speaker glyph, still 44 px), pause is the phone's side button, scenario shown as three dots in the chat header. Copy unchanged. Keyboard: Tab through chips in reading order, Space selects, arrows move the time slider, `Escape` pauses; Playwright completes a good send and a sharp-then-repaired send with keys.

=== DESCRIPTION ===
Rae has cancelled again and Zoe's thumb is over SEND. The button knows it, and it grows. The player builds the reply out of one fact, one need and one request while the button creeps closer, asks Rae what actually happened instead of guessing, and puts the draft away when the feeling is bigger than the reply. A low, ticking A-minor piece stays quiet while the draft is honest and gets busy as the thumb drifts toward the button.

=== MAJOR VISUAL TECHNIQUES ===
- Phone drawn with 8 shapes and a soft `--w3` screen glow that lights the underside of the thumbs.
- SEND button: `transform-origin` at its centre, scale 1 → 1.35 with a 1.2 s pulse, and a translate tween toward the thumb; a 1 px `--w6` outline flickers when it is about to be within reach.
- Chat bubbles slide up 24 px on arrival with a 220 ms ease-out; Rae's are `--w4`, Zoe's `--w5`.
- Screen shake: two 3 px translate keyframes on the phone group, 160 ms total.
- Battery stake: a rect whose width is bound to state, colour `--w5` → `--w6` under 25%.

=== INTERACTION MODEL ===
- Chips are `<button>`s in `foreignObject` on the phone screen; selection swaps the chip into the draft bar.
- The moving SEND is still a `<button>`; its hit area follows it, and its keyboard position stays last in Tab order so keyboard players cannot be tricked.
- Time is a real `<input type="range">` styled as the phone's clock wheel.
- Drafts drawer is a drawn tab at the bottom; save and restore both go through it.

=== SOUND & MUSIC ===
- Score `zoe` (A minor, 84 bpm): sub + square bed, clipped click, detuned square riff, pulse-width pad, typing ticks at high intensity. `sharp` stinger added.
- SFX: `keytap` per chip, `whoosh` (ask), `notification` (reply), `zip` (save), `phone_buzz` (sharp), `chime` (repair), `win`.

### 2.5 Arjun: hold the thread, `/lives/play/arjun-hold-the-thread`

=== PROMPT (exact prompt used) ===
Rebuild the Arjun route in `app/lives/arjun-world/player.tsx` over `src/lives/arjun-world.ts` (meeting with three options and four evidence types access, size, time, idea; ask Noor or Rae; pin, remove, park, retrieve; select, owner, when; anchor; revisit) to the Leo bar without changing the reducer. The scene is a meeting room seen across the table: the far wall with a whiteboard that is the `board` (layer 1), a window with a moving sky (2), the table (3), Noor and Rae seated left and right as drawn characters who react (4), the three option cards standing on the table as small drawn models (a garden, a studio, a library, and so on per `SCENARIOS`) (5), Arjun's notebook in the foreground that is the parking lot (6), and a wall clock whose hand is the stake (7). The playable challenge starts at once: evidence chips are drawn as sticky notes; known ones are already on the whiteboard, unknown ones are question-mark notes over Noor and Rae's heads, and asking is a tap on the person, who answers with a speech bubble and hands the note across the table (a 400 ms slide with `rustle`). Pinning drags a note to the whiteboard (`stamp`), parking drags it to the notebook (`scribble`), retrieving drags it back. Meanwhile the thread drifts: every 6 seconds (5, then 4 in revisit) a drawn distraction slides across the table toward Arjun's hands (a phone lighting up, a stack of unrelated papers, a colleague waving through the glass) and, if not parked in the notebook within 3 seconds, it knocks the most recent pinned note off the board (`thud`), which the player must re-pin. Selecting an option lifts its model 8 px with a `click`; wrong-fit options show the mismatch by the model itself (the garden has steps, the small room has too few chairs) rather than text. Owner and when are drawn as passing the notebook to Noor or Rae and a sun or moon toggle. Anchor draws a single red thread from the question on the whiteboard to the selected option; it is the anchor state made visible. Noor's and Rae's `data-emotion`: `waiting`, `answering`, `agreed`, `bored` (after 15 s without progress, they check their phones, no time cost). The clock stake advances only on distraction hits. The `arjun` score in D dorian at 100 bpm runs at .3 with Rhodes chords and walking bass; each distraction adds the muted trumpet for its lifetime; agreement plays `win`; revisit restarts on the same chords with the changed time shown by the clock jumping. HUD in the world: mute on the room's speakerphone, pause on the door, scenario as three coasters. Copy unchanged. Keyboard: Tab through people, notes, options, notebook; Space acts; arrows move a held note between board, table and notebook; Playwright completes one scenario and its revisit with keys.

=== DESCRIPTION ===
Three spaces, two colleagues, one question, and a table that keeps sliding things toward Arjun. The player asks for what is missing, pins what matters to the whiteboard, and parks everything else in the notebook before it knocks the plan off the wall. A warm office piece in D dorian holds a groove while the thread holds; the moment something drifts in, a muted trumpet leans in with it and leaves when it is parked.

=== MAJOR VISUAL TECHNIQUES ===
- Deep room via three depth bands (wall, table, foreground) each with its own `--w` shade and a 1 px rim light.
- Sticky notes: rounded rects with a folded corner path, slight random rotation (±3°) fixed per note.
- Option models: each drawn from eight shapes, with the mismatch feature drawn literally (steps, chairs, clock).
- Red thread: a `<path>` with `stroke-dasharray` drawn on over 400 ms, wobbling 1 px on a 3 s loop, static under reduced motion.
- Distractions slide with an ease-in so the last third is fast.

=== INTERACTION MODEL ===
- Drag with pointer capture; three drop zones (board, table, notebook) highlight on hover with a 2 px `--w5` inset.
- Tap a person to ask (one tap, one bubble).
- Distraction is a `<button>`: tapping it parks it; dragging also works.
- Selecting an option is a tap; the model rises and stays until another is chosen.

=== SOUND & MUSIC ===
- Score `arjun` (D dorian, 100 bpm): Rhodes bed, rim pulse, walking bass, muted trumpet on distraction. `win` on agreement.
- SFX: `rustle` (note passed), `stamp` (pin), `scribble` (park), `thud` (knock-off), `click` (select), `phone_buzz` (phone distraction), `tick` (clock advance).

### 2.6 Jax: just the list, `/lives/play/jax-just-the-list`

=== PROMPT (exact prompt used) ===
Rebuild the Jax journey (`jax_just_milk` then `jax_checkout` in `src/lives/journeys.ts`, engines `goal_protection` and `semantic_filter`) as one continuous supermarket scene to the Leo bar. ViewBox `0 0 480 800`, portrait: fluorescent ceiling with one flickering tube (layer 1), a long aisle in one-point perspective with shelves converging (2), shelf products as drawn boxes, tins and bottles in the `--w` palette, no brand text (3), the trolley in the foreground seen from behind, its basket the drop zone (4), Jax's hands on the handle with `data-emotion` on the knuckles and a shopping list on paper taped to the handle (5), promotional hanging signs that swing (6), the checkout lane at the end that grows as the aisle scrolls (7). Round one, `JUST MILK!`: the aisle scrolls toward the player at 1.5 px per frame (reduced motion: 40 px every 400 ms) and products lean out from shelves into the trolley's path; the player swipes them left or right off the path (pointer move of at least 40 px within 250 ms, or arrow keys), and lets only the milk reach the trolley, where it drops in with a `plate` at half gain. Anything else that lands in the basket makes the list paper curl (stake) and plays `till` at -12 dB as a preview of the cost. Round two, `ONLY THE LIST!` at the checkout: the belt carries items past Jax at increasing speed; the list on the handle now reads three items; tap to keep an item (it slides into the bag, `zip`), do nothing and it passes (`trolley` rumble); wrong keeps curl the paper. Three waves per round with a two-bar breath where the belt stops and the cashier looks up. Jax `data-emotion`: `steady`, `tempted` (one hand leaves the handle toward a product), `firm` (both hands, knuckles white), `done`. The `jax` score is muzak in F major at 118 bpm: strings bed, trolley-squeak pulse, vibraphone melody, till beep sparkle; intensity follows belt speed; a lure entering the path adds a half-step slide in the strings (a `stinger("lure")`, two beats). HUD in the world: mute on the store's PA speaker, pause on the trolley coin lock, wave as three price tags that flip. Copy unchanged (`JUST MILK!`, `ONLY THE LIST!`, the list words). Keyboard: arrows swipe the nearest item, Space keeps at checkout. Playwright: both rounds by keyboard, sound on and off.

=== DESCRIPTION ===
Jax went in for milk. The aisle keeps handing him things, and at the checkout the belt is fast and the list on the trolley handle is short. The player knocks the extras aside and keeps only what the list says, while the list paper curls every time something sneaks in. The music is the supermarket's own muzak, cheerful and slightly wrong, which speeds up with the belt and lurches a half-step every time a lure leans out.

=== MAJOR VISUAL TECHNIQUES ===
- One-point perspective from four converging lines; product scale and y from a single `depth` value per item.
- Fluorescent flicker: a tube rect with opacity keyframes at irregular intervals (1.3 s, 2.1 s), off under reduced motion.
- Product lean-out: rotate around the shelf edge, 0 → 25°, with a shadow lengthening.
- List paper curl: a `<path>` morph between three states (flat, curled, curled and torn) via `d` swap.
- Checkout belt: a repeating pattern rect with `patternTransform` translated per frame.

=== INTERACTION MODEL ===
- Swipe detection on the whole scene with pointer capture; direction is the sign of dx; the item nearest the trolley receives it.
- Keep at checkout is a tap on the item (a `<button>` per item, 44 px minimum, even though the drawing is smaller).
- Pause on the coin lock stops the aisle and belt.
- Between waves the cashier looks up; the first input starts the next wave.

=== SOUND & MUSIC ===
- Score `jax` (F major, 118 bpm): muzak strings, trolley squeak, vibraphone, till beep; `lure` stinger added; `win` at the end.
- SFX: `plate` (milk in), `till` at low gain (wrong item), `zip` (bag), `trolley` rumble, `whoosh` (swipe), `rustle` (list curl).

### 2.7 Nina: the first line, `/lives/play/nina-the-first-line`

=== PROMPT (exact prompt used) ===
Rebuild the Nina journey (`nina_start_small` semantic filter, then `nina_first_line` which is the `NinaDraft` textarea in `app/lives/nina-draft.tsx`) as one desk scene to the Leo bar, keeping the draft as a real textarea. ViewBox `0 0 480 800`: an evening window with rain (layer 1), a desk lamp whose pool of light is the only bright area (2), the desk with a laptop showing a blank page (3), a mug, a stack of open tabs drawn as paper tabs sticking up from the laptop (4), Nina's hands and forearms with `data-emotion` on the fingers (5), a small plant that grows with progress, the stake (6), and a clock whose face is blank, on purpose (7). Round one, `START SMALL!`: the tabs (`nina_start_small` items) fan up from the laptop one at a time on a 1.4 s cadence; the player taps the ones that belong to the essay to bring them under the lamp and lets the others fall away; each right tap slides the tab into the light with a `rustle`, each wrong tap adds a raindrop streak to the window and makes Nina's fingers `hover` (drumming the desk on a 300 ms loop). Round two, `WRITE THE LINE!`: the laptop page fills the lamp pool and becomes the textarea, 160 chars max, with the current placeholder; every keystroke plays `keytap` and grows the plant one leaf per twelve characters; pressing Keep this draft plays `stamp`, the page slides into a drawn folder and the lamp dims to the night palette over a second. Nina `data-emotion`: `stuck` (hands flat, still), `hover` (drumming), `typing` (fingers moving on a 4-frame loop while input is focused and the last keystroke was under 600 ms ago), `kept`. No timer anywhere in round two; round one has three waves of tabs at 1.4, 1.1 and 0.9 s. The `nina` score is a 3/4 nylon-string piece in B♭ major 7 at 66 bpm at intensity .3; each tab brought into the light adds a note to the sparse melody (the phrase is built by the player); in round two the arpeggio continues and the melody resolves on Keep. HUD in the world: mute on the laptop's speaker grille, pause on the lamp switch, wave as three mug rings on the desk. Copy unchanged (`START SMALL!`, `WRITE THE LINE!`, `First line`, the placeholder, `Keep this draft`). Keyboard: Tab through tabs, Space keeps; round two is the textarea. Playwright: keyboard run through both rounds with sound on and off, asserting the textarea keeps focus after unmuting.

=== DESCRIPTION ===
Nina has an essay and a laptop full of tabs. First she brings only the ones that belong into the lamplight and lets the rest drop; then the page is the only thing lit, and she writes one line. Nothing is timed in the writing. A nylon-string waltz plays at the edge of hearing and gains a note every time she keeps something that matters, and the plant on the desk grows with every twelve characters.

=== MAJOR VISUAL TECHNIQUES ===
- Lamp pool: a radial gradient mask over the whole scene; everything outside is at 35% brightness.
- Rain: 20 short lines with staggered `translateY` animations, opacity .3, static droplets under reduced motion.
- Tabs as paper rectangles with a folded top edge that fan on `rotate` around the laptop hinge.
- Plant: leaves are quadratic paths added to a group, each scaling in 0 → 1 over 250 ms.
- Nina's hands: two groups of five finger paths; `typing` loops finger `translateY` by 2 px in sequence.

=== INTERACTION MODEL ===
- Round one taps are `<button>`s per tab; the falling tabs are not interactive once past the desk edge.
- Round two is a native textarea inside `foreignObject`, unchanged in behaviour; the drawn hands react to `input` events.
- Keep this draft submits the form; the folder animation runs after `onResult`.
- Pause on the lamp switch dims everything and blurs the textarea.

=== SOUND & MUSIC ===
- Score `nina` (B♭ major 7, 66 bpm, 3/4): nylon arpeggio bed, sparse sine melody grown by the player, page rustle at bar ends; resolves on Keep.
- SFX: `rustle` (tab in), `tick` (tab falls), `keytap` (each character, pitch varied ±5%), `stamp` (keep), `rain` as pink noise at -30 dB when sound is on.

### 2.8 Maya: one thing at a time, `/lives/play/maya-one-thing-at-a-time`

=== PROMPT (exact prompt used) ===
Rebuild the Maya journey (`maya_crossing` trace path, `maya_layers` wipe, `maya_turn_it_down` wipe) as one street scene to the Leo bar. ViewBox `0 0 480 800`: sky with slowly moving clouds (layer 1), shopfronts with signs that are shapes, not words (2), the road with a crossing (3), traffic as drawn buses, bikes, a dog on a lead, roadworks, and an advert board, each moving as the real thing (bus: constant speed with a Doppler pass; bike: weaving; dog: stop-start; roadworks: static; advert: flips) (4), Maya on the kerb with headphones around her neck (5), a lamp post with the pedestrian signal that is the stake and a drawn phone in Maya's hand for the notification rounds (6), and a sound-layer overlay: translucent coloured bands that represent noise, one per source (7). Round one, `DRAW A PATH!`: the player traces from Maya to the far kerb with a 44 px wide path while hazards move; the trace is a drawn chalk line that fades from the tail; crossing a hazard breaks the line with a `honk`, `bike_bell` or `bark` matching the hazard, and Maya steps back to the kerb with `data-emotion="startled"`; a clean route lets her walk it (4 px per frame) with `footstep` panned to her x. Round two, `CLEAR ONE!`: the phone fills with drawn notification cards; the player wipes exactly one away with a scrub gesture (three direction changes within 24 px, or repeated Space presses on the focused card) while the others pulse; wiping a second one within the same round shakes the phone once and refills it. Round three, `TURN IT DOWN!`: the seven noise bands sit over the scene, each tied to a source and a sound layer; the player scrubs one band to thin it, and the corresponding source visibly settles (the bus pulls away, the advert stops flipping, the dog sits); the round ends when any one is fully cleared. The stake is the pedestrian signal: green figure fades toward red with elapsed time in round one, and in rounds two and three it is the phone battery and the headphone cord respectively. Maya `data-emotion`: `braced`, `startled`, `walking`, `settled`. The `maya` score in E♭ mixolydian at 108 bpm has traffic hum, alternating footsteps, marimba, horn pads and the signal tick; in round three each band the player thins mutes one score layer or SFX bed, so the music itself becomes quieter as the world does. HUD in the world: mute on Maya's headphones, pause on the signal button, round as three chalk marks on the kerb. Copy unchanged. Keyboard: arrows draw the trace at 6 px per frame from Maya's feet, Space wipes on a focused card or band. Playwright: all three rounds by keyboard with sound on and off.

=== DESCRIPTION ===
Maya is at the kerb and everything is loud: a bus, a bike, a dog, an advert, roadworks, and a phone that will not stop. The player draws her one clear route across, then clears one notification instead of all of them, then thins one layer of the noise until the street settles. Every hazard has its own voice and the music is made of the street; when the player turns one thing down, the music loses that part too.

=== MAJOR VISUAL TECHNIQUES ===
- Depth by three road bands; vehicles scale with band.
- Chalk trace: a polyline with round caps, `stroke-dasharray` fade from the tail using a gradient stroke, breaks by splitting the polyline.
- Noise bands: translucent `--w` rects with a soft blur, each with a mini icon of its source at the left edge.
- Wipe reveals: `mask` with a `<path>` that grows along the scrub direction.
- Signal figure: two paths cross-fading, red pulse at 1 Hz in the last quarter (static under reduced motion).

=== INTERACTION MODEL ===
- Trace with pointer capture; path width 44 px per `config.pathWidth`; a lifted pointer ends the attempt and shows the partial line for a second.
- Scrub detection: three direction reversals within a 24 px box within 700 ms.
- Cards and bands are `<button>`s so keyboard scrubbing is Space × 3 with the same reveal.
- Pause on the signal button freezes traffic and music.

=== SOUND & MUSIC ===
- Score `maya` (E♭ mixolydian, 108 bpm): traffic hum, footsteps, marimba, horn pads, signal tick; round three removes layers per band cleared.
- SFX: `bus` with Doppler, `bike_bell`, `bark`, `honk`, `footstep`, `notification`, `phone_buzz`, `whoosh` (wipe), `signal_tick`, `win`.

---

## 3. THE 32 ARCADE GAMES (`src/lives/games.ts`, Chaos Run)

Grouped by world. A world's scene, palette, score and SFX are built once and each
game is a delta on it; the delta is what the prompt below specifies. Where a game is
also a round inside a public journey (§2), the arcade version reuses that component
with `activeMs` from the registry and the journey's HUD hidden. Every game keeps its
registry `instruction`, `mechanic`, `config`, `difficulty` and `learningLinks`
unchanged; the upgrade is the drawing, the motion, the character reaction, the stake
and the sound.

The Chaos Run itself: between games the score cross-fades from one world spec to the
next over one bar (the outgoing bed fades while the incoming pulse starts on the
downbeat), so a run of ten games is one continuous piece with ten movements. A missed
game plays `rest`, a made game plays `win` as a two-beat stinger inside the crossfade.
Difficulty 1 to 8 maps to score intensity .3 to .9 at game start.

### 3.1 Leo's bedroom (score `leo`)

**leo_mosquito — `GET IT!` (target_swat, tap)**
=== PROMPT === Reuse §2.1's swarm and bedroom at arcade size: one wave, mosquito count from `difficulty` (3 at 1, up to 8 at 8), `activeMs` 5000. Leo sits up in bed reacting; sleep-dial stake; `Mosquito` voices with Doppler; `swat`/`tick`. Keyboard Tab-and-Space as in 2.1.
=== DESCRIPTION === Leo's bedroom for five seconds: every mosquito swatted before the clock and he sleeps.
=== MAJOR VISUAL TECHNIQUES === The full seven-layer room at `viewBox 0 0 480 600`; wing-blur flight modes; palm print; moon shadow frozen for a five-second game.
=== INTERACTION MODEL === Pointerdown swat, nearest 74 px circle; Tab/Space; no drag.
=== SOUND & MUSIC === `leo` score at difficulty intensity; mosquito instrument; `swat`, `tick`, `win`/`rest`.

**leo_lights_out — `LIGHTS OUT!` (precision_timing, timing)**
=== PROMPT === Same room at night. The lamp's pull cord swings on a pendulum (period 1.4 s at difficulty 1, 0.8 s at 8); a small drawn window on the cord's arc marks the sweet spot; the player taps when the cord's toggle is inside it. Leo lies down, eyes open (`awake`); hit: `light_switch`, lamp glow to 0 over 300 ms, Leo's eyes close (`asleep`), the room to night palette; miss: cord swings on, a `tick`, Leo blinks. Stake: the lamp glow itself. Reduced motion: the cord steps between five positions at the same period.
=== DESCRIPTION === One tap on the cord at the right moment and the room goes dark.
=== MAJOR VISUAL TECHNIQUES === Pendulum from a `rotate` on the cord group with easing computed by `sin`; the sweet-spot window drawn as a faint arc segment; glow fade via radial gradient opacity.
=== INTERACTION MODEL === Any pointerdown or Space is the tap; one attempt per swing; the game ends on hit or `activeMs`.
=== SOUND & MUSIC === `leo` score, bed and pulse only; `light_switch` on hit ends the score on `rest`; `tick` on miss.

**leo_one_more — `DON’T SCROLL!` (inhibition, no_input)**
=== PROMPT === Leo in bed holding his phone, the screen the only light. A drawn feed scrolls itself slowly and stops with a card half-visible; the card glows, grows and shows a drawn thumb-shaped prompt with a down arrow, and the phone vibrates (`phone_buzz` at -14 dB, 2 px shake, none under reduced motion). The player wins by doing nothing for `activeMs`. Any pointerdown or key on the phone scrolls it (feed slides, a `whoosh`) and loses. Leo's thumb hovers with `data-emotion="itch"`; at 60% of the time it withdraws (`resisting`); at the end the phone face-down on the bedside with `thud` (`asleep`). Stake: the screen glow, which dims as the player holds out.
=== DESCRIPTION === The feed wants one more scroll. Leo puts the phone down instead.
=== MAJOR VISUAL TECHNIQUES === Screen glow on the ceiling as a radial gradient; the lure card scaling 1 → 1.3; the thumb path with three keyframes.
=== INTERACTION MODEL === Any input on the scene loses, except the mute and pause buttons, which are excluded from the hit test.
=== SOUND & MUSIC === `leo` score at bed only, the sparkle plinks removed; `phone_buzz` lures at 40% and 75% of time; `thud` and `rest` at the end; `whoosh` and a flat `rest` on a scroll.

### 3.2 Theo's morning (score `theo`)

**theo_get_out — `GET OUT!` (semantic_filter, tap_filter)**
=== PROMPT === §2.2's hallway at arcade size; the eleven items slide along the runner toward the door in random order at difficulty speed; tap what should go out of the door (`relevant`), let the rest pass. Right: item zips to Theo's pocket or hand (`zip`); wrong: clock hand jumps (`tick`), Theo `alert`. Stake: the clock wedge. Near-miss items (`nearMiss`) come along looking like essentials (a second phone, a similar key ring) and are drawn with the small giveaway detail.
=== DESCRIPTION === The door is open and the bus is coming. Only the things that go out go out.
=== MAJOR VISUAL TECHNIQUES === Runner perspective, item drift with a slight bob (2 px sine), clock hand overshoot, window light warming.
=== INTERACTION MODEL === Tap items (each a `<button>`); Tab in distance order.
=== SOUND & MUSIC === `theo` score at difficulty intensity; `zip`, `click`, `tick`, `door` on success.

**theo_backwards — `WORK BACKWARDS!` (rapid_sorting, sequence)**
=== PROMPT === The hallway wall becomes a row of drawn picture frames, one per step of the morning (bus stop, front door, shoes, breakfast, shower, alarm), shown out of order. The player taps them from the last step to the first; a correct tap turns that frame gold and hangs it on the wall to the right, forming a timeline read backwards; a wrong tap makes the frame swing on its nail (`thud`, Theo `alert`) and costs one clock jump. The clock wedge is the stake and its hand runs backwards during this game (a small joke the player can notice, no words about it).
=== DESCRIPTION === Start at the bus and walk the morning backwards to the alarm.
=== MAJOR VISUAL TECHNIQUES === Frames as rounded rects with a hanging wire, swing via `rotate` around the nail point with damped oscillation; timeline slide-in 250 ms.
=== INTERACTION MODEL === Tap a frame; Tab across frames left to right.
=== SOUND & MUSIC === `theo` score, bell on each correct frame (pitch stepping down a scale degree per step); `thud` on error; `win`.

**theo_shower — `OUT NOW!` (precision_timing, timing)**
=== PROMPT === The bathroom from §2.2: shower running, steam rising, a mirror fogging from the edges inward. The clear circle in the mirror shrinks; the player taps the tap handle when the circle is between the two drawn rings (sweet spot width from difficulty). Too early: the water stays on and Theo is still soapy (`tick`); too late: the mirror fogs fully and the clock jumps. Hit: water off, steam clears over 500 ms, Theo grabs a towel (`out`), `door`.
=== DESCRIPTION === Get out of the shower while there is still a clear patch of mirror.
=== MAJOR VISUAL TECHNIQUES === Fog as a `mask` with a shrinking circle; steam ellipses; water lines 12 thin paths with `stroke-dashoffset` looping.
=== INTERACTION MODEL === Tap the handle `<button>` or Space; one attempt.
=== SOUND & MUSIC === `shower` bed at -18 dB under the `theo` score; hit stops the bed, `door`; `tick`.

### 3.3 Mia's flat (score `mia`)

**mia_why_here — `WHY ARE YOU HERE?` (object_search, tap)**
=== PROMPT === §2.3's kitchen doorway, viewed from Mia's spot in the doorway. `remindBefore`: the sticky note flashes the goal (`charger`) for 800 ms then peels away. The counter is cluttered with the decoys (banana, sock, book, rubber chicken, tiny horse) and the charger, each drawn and each moving a little the way it would (the banana rocks, the sock slumps, the chicken squeaks when passed over, the horse trots two steps). The player taps the charger; a wrong tap picks the object up and Mia looks at it puzzled (`lost`) for 400 ms, `tick`, note fades a step. Stake: the note's ink.
=== DESCRIPTION === Mia is in the kitchen and cannot remember why. Find the thing she came for.
=== MAJOR VISUAL TECHNIQUES === Tilted top-down counter; each decoy from eight shapes with one idle animation; the note peel is a `rotate` on the corner plus fade.
=== INTERACTION MODEL === Tap objects (`<button>` each); Tab in reading order.
=== SOUND & MUSIC === `mia` score at bed and hat; `rustle` (note), `tick` (wrong), the rubber chicken gets `quack` at pitch 1.4 when tapped, `chime` on the charger.

**mia_list — `KEEP THEM!` (rapid_sorting, sequence)**
=== PROMPT === Mia at the front door with three drawn items on the sticky note (words unchanged from the registry). The items appear as objects around the hallway one at a time in a scrambled order and the player taps them in list order; a right tap slides the object into her bag (`zip`); wrong order makes the note flap and the thought cloud drift in (`lost`). Stake: note ink.
=== DESCRIPTION === Three things on the note. Pick them up in the order they are written.
=== MAJOR VISUAL TECHNIQUES === Bag opening path morph; note flap via `skewY`; objects with a 1 px rim light in the hall.
=== INTERACTION MODEL === Tap; Tab.
=== SOUND & MUSIC === `mia` score; `zip`, `rustle`, `tick`, `win`.

**mia_the_list — `FIND THE LIST!` (object_search, tap)**
=== PROMPT === Mia's living room as a search scene: the list is a paper corner poking out from under one of six things (cushion, magazine, laptop, plant pot, coat, cat). Tap the right one; the cat is a decoy that moves to a new spot every 1.2 s and yawns when tapped (`purr`: brown noise gated at 25 Hz, 400 ms, add it to the bank). Wrong taps lift the object (a 150 ms hop) and drop it, `tick`. Stake: note ink.
=== DESCRIPTION === The list exists. It is under something.
=== MAJOR VISUAL TECHNIQUES === Layered furniture with the paper corner drawn behind one; the cat as six shapes with a tail sine; hop via `translateY` ease-out.
=== INTERACTION MODEL === Tap; Tab.
=== SOUND & MUSIC === `mia` score; `tick`, `purr`, `rustle` on the find, `win`.

### 3.4 Zoe's phone (score `zoe`)

**zoe_dont_send — `DON’T!` (inhibition, no_input)**
=== PROMPT === §2.4's phone. The SEND button runs the registry `taunts` in order (pulses, grows, shakes, grows arrows, says PRESS IT as a drawn label since it is registry copy) across `activeMs`; the player wins by not touching. Any pointerdown or key on the phone loses with `phone_buzz` and the sharp bubble. Thumb `itch` → `resisting` → `steady`. Stake: battery.
=== DESCRIPTION === The button is doing everything it can. Leave it alone.
=== MAJOR VISUAL TECHNIQUES === Scale pulse, `translate` shake, arrow paths fanning in, label sliding up.
=== INTERACTION MODEL === No input wins; mute and pause excluded from the hit test.
=== SOUND & MUSIC === `zoe` score with typing ticks rising to .9; `phone_buzz` at each taunt change at -16 dB; `rest` stinger on success.

**zoe_keyword — `HOLD IT!` (hold_release, hold_release)**
=== PROMPT === Rae's messages arrive in the chat; Zoe's keyword (the registry word) is a drawn tag she holds pressed under her thumb. The player presses and holds the tag; releasing before Rae's question bubble arrives loses the word (it floats up and off, `whoosh`); releasing within 600 ms after the question lands wins (tag snaps into the draft bar, `stamp`). Thumb `holding` with a slight tremble at 1 Hz after 3 s (none under reduced motion, tag darkens instead). Stake: battery.
=== DESCRIPTION === Hold the one word you want to say until it is your turn.
=== MAJOR VISUAL TECHNIQUES === Pressed-state depth via a 2 px shadow collapse; bubble arrival slide; tag float-off with rotation.
=== INTERACTION MODEL === Pointer hold with capture, or Space held; release is the action.
=== SOUND & MUSIC === `zoe` score; `notification` when the question lands; `stamp`/`whoosh`; `win`/`rest`.

**zoe_drafts — `DELETE DRAFTS!` (target_swat, rapid_tap)**
=== PROMPT === The drafts drawer opens and drafts pile up as drawn cards faster than they can be read (spawn interval from difficulty, 900 ms down to 350 ms). Tap a card to delete it: it crumples (path morph, 120 ms) and drops into a drawn bin with `rustle`. Keep the pile under the drawer's top edge (the stake, a line) for `activeMs`. Thumb `busy`; when the pile is low, `steady`.
=== DESCRIPTION === Too many drafts. Delete them faster than they pile up.
=== MAJOR VISUAL TECHNIQUES === Cards stacked with 4 px offsets and ±2° rotation; crumple morph between two paths; bin lid flap.
=== INTERACTION MODEL === Rapid taps, one per card; Space deletes the top card.
=== SOUND & MUSIC === `zoe` score with typing ticks tied to pile height; `rustle` per delete, pitch rising with pile height; `win`.

### 3.5 Arjun's office (score `arjun`)

**arjun_lock_in — `LOCK IN!` (semantic_filter, tap_filter)**
=== PROMPT === §2.5's meeting room. Items slide across the table toward Arjun at difficulty speed: the `relevant` set drawn as documents and charts, the `irrelevant` set drawn literally (a cow, a burger, a spaceship) and the `nearMiss` set as papers that look right until the small detail (a personal envelope, a newspaper masthead). Tap the relevant to pin to the board (`stamp`); tap the wrong to hear `thud` and see Noor look up. Stake: the clock.
=== DESCRIPTION === Only the things this meeting is about go on the board.
=== MAJOR VISUAL TECHNIQUES === Table slide with ease-in; the absurd items drawn with the same seriousness as the documents; near-miss giveaway drawn at 2 px.
=== INTERACTION MODEL === Tap; Tab.
=== SOUND & MUSIC === `arjun` score; `stamp`, `thud`, a `moo` for the cow when tapped (sawtooth 150 Hz, formant 500 Hz, 500 ms, add to the bank), `win`.

**arjun_parking — `PARK IT!` (rapid_sorting, drag)**
=== PROMPT === Thoughts arrive as sticky notes above Arjun's head; the player drags each to the notebook (park) or the whiteboard (relevant) as labelled by the registry config, before the next one arrives. A note left floating for 3 s drifts over Noor and Rae and they `bored`; the clock jumps. Stake: clock.
=== DESCRIPTION === Every thought gets a home: the board if it belongs, the notebook if it can wait.
=== MAJOR VISUAL TECHNIQUES === Notes bob on a 2.5 s sine; drop-zone inset highlight; the notebook page turning after each park.
=== INTERACTION MODEL === Drag with pointer capture, or arrows to move a held note and Space to drop.
=== SOUND & MUSIC === `arjun` score; `scribble`, `stamp`, `tick`, `win`.

**arjun_hold_thread — `STAY WITH IT!` (hold_release, hold_release)**
=== PROMPT === Arjun holds a drawn red thread from the whiteboard question to the selected option (the anchor from §2.5); the player presses and holds; distractions cross the table and try to snag the thread (each snag tugs the thread 6 px, `tick`); releasing during a tug loses it. Release when Noor says the closing line (a bubble with `notification`) wins.
=== DESCRIPTION === Hold the thread through the noise until the meeting comes back to the point.
=== MAJOR VISUAL TECHNIQUES === Thread as a quadratic path whose control point is tugged; distraction slide; Noor's bubble.
=== INTERACTION MODEL === Hold and release, pointer or Space.
=== SOUND & MUSIC === `arjun` score with trumpet per distraction; `tick` per tug; `notification`; `win`/`rest`.

### 3.6 Jax's supermarket (score `jax`)

**jax_just_milk — `JUST MILK!` (goal_protection, swipe)**
=== PROMPT === §2.6 round one at arcade size: one wave, lure rate from difficulty, `activeMs` 5000; swipe lures aside, let the milk in.
=== DESCRIPTION === One thing on the list. Everything else goes back on the shelf.
=== MAJOR VISUAL TECHNIQUES === Aisle perspective, lean-out rotation, list curl.
=== INTERACTION MODEL === Swipe or arrows.
=== SOUND & MUSIC === `jax` score; `whoosh`, `plate`, `till` (wrong), `lure` stinger.

**jax_checkout — `ONLY THE LIST!` (semantic_filter, tap_filter)**
=== PROMPT === §2.6 round two at arcade size: belt speed from difficulty; tap to keep list items, let the rest pass.
=== DESCRIPTION === Milk, bread, eggs. Nothing else in the bag.
=== MAJOR VISUAL TECHNIQUES === Belt pattern translate, bag opening, cashier glance.
=== INTERACTION MODEL === Tap; Tab.
=== SOUND & MUSIC === `jax` score at belt intensity; `zip`, `till`, `trolley`, `win`.

### 3.7 Nina's desk (score `nina`)

**nina_start_small — `START SMALL!` (semantic_filter, tap)**
=== PROMPT === §2.7 round one at arcade size: tab cadence from difficulty; tap the essay tabs into the lamplight.
=== DESCRIPTION === Bring only what belongs into the light.
=== MAJOR VISUAL TECHNIQUES === Lamp mask, tab fan, rain.
=== INTERACTION MODEL === Tap; Tab.
=== SOUND & MUSIC === `nina` score built by the player's taps; `rustle`, `tick`, `win`.

**nina_first_line — `WRITE THE LINE!` (trace_path, trace)**
=== PROMPT === The arcade version is the trace, not the textarea: the blank page under the lamp shows a faint dotted first line (a drawn guide, no words) and the player traces along it left to right with the pen inside a 44 px band; the ink appears behind the pen with `scribble`; leaving the band lifts the pen (`tick`) and the line resumes from where it left. Reaching the right margin completes the line and Nina `kept`. Stake: the plant's leaf.
=== DESCRIPTION === Draw the first line across the page without lifting the pen.
=== MAJOR VISUAL TECHNIQUES === Ink polyline with pressure width (speed → thinner), pen shadow; page under the lamp mask.
=== INTERACTION MODEL === Trace with capture; arrows draw at 6 px per frame.
=== SOUND & MUSIC === `nina` score; `scribble` while moving, `tick` on lift, `stamp` on completion, `win`.

### 3.8 Maya's street (score `maya`)

**maya_crossing — `DRAW A PATH!` (trace_path, trace)**
=== PROMPT === §2.8 round one at arcade size: hazard density from difficulty, `activeMs` 6000, the six registry hazards including `a thought` drawn as a cloud that drifts onto the road.
=== DESCRIPTION === Find one clear line across the street.
=== MAJOR VISUAL TECHNIQUES === Chalk trace, hazard motion true to each, signal fade.
=== INTERACTION MODEL === Trace or arrows.
=== SOUND & MUSIC === `maya` score; hazard SFX with pan; `footstep`; `win`.

**maya_layers — `CLEAR ONE!` (wipe_scrub, wipe)**
=== PROMPT === §2.8 round two: phone notifications, scrub exactly one.
=== DESCRIPTION === Clear one notification, not all of them.
=== MAJOR VISUAL TECHNIQUES === Card pulse, wipe mask, phone shake on over-clearing.
=== INTERACTION MODEL === Scrub or Space × 3 on the focused card.
=== SOUND & MUSIC === `maya` score, marimba only; `notification` per card arriving, `whoosh` on wipe, `phone_buzz` on the second wipe, `win`.

**maya_turn_it_down — `TURN IT DOWN!` (wipe_scrub, wipe)**
=== PROMPT === §2.8 round three: noise bands; scrub one to thin it; the source settles and its score layer mutes.
=== DESCRIPTION === Turn one thing down and hear the street change.
=== MAJOR VISUAL TECHNIQUES === Translucent bands, source settle animations, band thinning by mask.
=== INTERACTION MODEL === Scrub or Space × 3 on the focused band.
=== SOUND & MUSIC === `maya` score full; each band cleared removes its layer or bed; `win` on the first fully cleared band.

### 3.9 Chaos: the ten random games

These have no character; the `character: "random"` slot picks one of the eight who is
drawn watching and reacting from the scene's edge. Each has its own short score.

**wasps — `SWAT!` (target_swat, tap)**
=== PROMPT === A picnic blanket seen from above, a jam jar open at the centre, three wasps (more with difficulty) circling the jar in tightening spirals with the wasp flight signature: fast straight runs, sudden 90° turns, hover. The watching character's hand hovers over the jar. Swat a wasp inside 74 px: it drops onto the blanket (`swat`), the hand flinches. Stake: the jar lid, which the character can close only when the last wasp is gone. Wasp voice: the `Mosquito` instrument at `f0 = 150 + (id%5)*12` Hz with the AM at f0 (a lower, angrier buzz) and a broader lowpass.
=== DESCRIPTION === Wasps at the jam. Swat them before anyone gets stung.
=== MAJOR VISUAL TECHNIQUES === Blanket gingham as an SVG pattern; wasp from five shapes with a striped body; spiral path from a parametric function.
=== INTERACTION MODEL === Tap swat; Tab/Space.
=== SOUND & MUSIC === Score `wasps`: G minor, 126 bpm, bed a nervous tremolo triangle, pulse a shaker (noise 30 ms), no melody. Wasp buzz voices; `swat`; `plate` when the lid closes.

**pancake — `CATCH IT!` (target_swat, catch)**
=== PROMPT === A kitchen hob from the front, a pan in the character's hand at the bottom. A pancake flips up from the pan on a parabola with rotation, the height and rotation rate from difficulty; the player moves the pan (pointer x or arrows) to be under it when it comes down; catch: it lands with `sizzle`, the character `pleased`; miss: it lands on the floor (`thud`), the character `dismayed`, and the cat from Mia's flat appears at the edge. Two or three flips per game.
=== DESCRIPTION === Flip, watch, catch. Keep the pancake in the pan.
=== MAJOR VISUAL TECHNIQUES === Parabola from a fixed timestep with gravity 0.5 px/frame²; pancake as an ellipse that flattens with `scaleY` at the apex; pan shadow tracking x.
=== INTERACTION MODEL === Pointer move sets pan x directly; arrows 6 px per frame.
=== SOUND & MUSIC === Score `pancake`: D major, 100 bpm, ukulele-like plucks (triangle, fast decay) on the off-beats, bed a low hum; `whoosh` on the flip, `sizzle` on catch, `thud` on miss.

**pigeons — `PIGEONS!` (goal_protection, swipe)**
=== PROMPT === A park bench with the character's lunch on it. Pigeons strut in from both sides with the real gait (head-bob two frames per step, 3 steps per second, a pause, a sidestep). Swipe a pigeon and it flaps off (`wingflap` and `coo`), landing again after 1.5 s further out. Keep the lunch untouched for `activeMs`. Stake: the sandwich, which loses a drawn bite per reach.
=== DESCRIPTION === Guard the sandwich from the pigeons.
=== MAJOR VISUAL TECHNIQUES === Pigeon from seven shapes with the head-bob as a `translateX` on the head group; flap as three wing frames over 240 ms; bench perspective.
=== INTERACTION MODEL === Swipe direction on the nearest pigeon; arrows swipe the focused one.
=== SOUND & MUSIC === Score `pigeons`: C major, 92 bpm, a lazy brass-band bed (three detuned squares, lowpass 800 Hz) and tuba on beats 1 and 3; `coo` ambient every 2 s; `wingflap`; `rustle` when the sandwich is bitten.

**toast — `POP IT!` (precision_timing, timing)**
=== PROMPT === A toaster on the counter, seen from the side, a small drawn window in its side showing the bread browning from pale to gold to dark over the game (rate from difficulty). Tap the lever when it is gold; too early is pale (`tick`), too late is smoke (three grey ellipses rising) and the alarm from the ceiling chirps once (`error_buzz` at -22 dB, the only place it is used); on time, `toaster_pop` and the toast jumps 40 px with a plate under it (`plate`). Character watching with `data-emotion` from `waiting` to `pleased` or `coughing`.
=== DESCRIPTION === Pop the toast when it is gold, not before, not after.
=== MAJOR VISUAL TECHNIQUES === Browning as a `fill` interpolated between three palette stops; smoke rise with blur; the lever as a real `<button>` drawn in the SVG.
=== INTERACTION MODEL === One tap or Space.
=== SOUND & MUSIC === Score `toast`: A major, 96 bpm, a breakfast radio jingle (bright square melody, two bars, then rests) over a soft bed; the toaster's element hum (sawtooth 100 Hz, lowpass 300 Hz) rises with browning; `toaster_pop`, `plate`, `tick`.

**bubbles — `POP!` (target_swat, rapid_tap)**
=== PROMPT === A bath from above with the character's knees and a duck; bubbles rise from below at increasing rate, each with a real bubble wobble (an ellipse whose `rx`/`ry` trade on a 0.4 s sine) and a highlight. Tap to pop (`bubble` SFX, pitch from size); pop as many as possible in `activeMs` while the biggest ones drift toward the character's face. Stake: the water line, which rises with uncounted bubbles.
=== DESCRIPTION === Pop the bubbles before the bath overflows.
=== MAJOR VISUAL TECHNIQUES === Bubble wobble, rainbow rim via a thin stroke with a gradient, pop as a six-line burst 120 ms; water line as a wavy path.
=== INTERACTION MODEL === Rapid taps; Space pops the largest.
=== SOUND & MUSIC === Score `bubbles`: E major, 132 bpm, bright arpeggiated sines with a glockenspiel sparkle; `bubble` per pop (each a note in the key nearest the bubble's size); `quack` when the duck is tapped.

**spider — `STAY STILL!` (inhibition, no_input)**
=== PROMPT === The character's forearm across the bottom of the scene; a spider lowers on a thread from the top, lands on the arm, and walks (eight legs in the real alternating tetrapod gait, 4 legs per frame pair) across for `activeMs`. Any input flinches the arm and the spider drops (`thud`, `startled`) and the game is lost. Stake: the character's face, which goes from `braced` to `steady` as the spider nears the far edge and drops off on its own thread.
=== DESCRIPTION === A spider is walking across your arm. Do nothing.
=== MAJOR VISUAL TECHNIQUES === Spider from a body ellipse and eight two-segment legs with the gait as a phase offset; thread as a 1 px line; arm hair as a few thin strokes.
=== INTERACTION MODEL === No input wins; mute and pause excluded.
=== SOUND & MUSIC === Score `spider`: F# minor, 60 bpm, a held bed (two sines a fifth apart) with a pizzicato tick every step at -24 dB; `spider_step`; `whoosh` as it drops off at the end; `rest`.

**rogue_blender — `HOLD THE LID!` (hold_release, hold)**
=== PROMPT === A blender on the counter, the character's hand on the lid. The motor starts; the lid rattles more as the speed climbs (rattle amplitude from difficulty); the player holds for `activeMs`; releasing early lets the lid fly and the contents paint the wall (a spray of ellipses, `thud`). A held hand trembles after 2 s. At the end the motor winds down and the hand lifts.
=== DESCRIPTION === The blender is trying to escape. Keep your hand on the lid.
=== MAJOR VISUAL TECHNIQUES === Lid rattle via a 2 px `translate` jitter at 22 Hz (static under reduced motion, lid rocks instead); contents swirl as three rotating paths; spray as 20 ellipses on random parabolas.
=== INTERACTION MODEL === Hold pointer or Space.
=== SOUND & MUSIC === Score `blender`: none, because the motor is the music: `blender` SFX with pitch rising from 95 to 180 Hz and a lowpass following speed, plus `lid_rattle`; at the end the wind-down plays a `rest` cadence out of the motor's final pitch.

**office_chair — `STEER!` (trace_path, trace)**
=== PROMPT === An office corridor from above, the character sitting in a wheeled chair that rolls forward on its own at difficulty speed; the player draws a path ahead of it and the chair follows the line; obstacles (a bin, a printer, a colleague's legs, a cable) sit in the corridor. Hitting one: the chair spins, `thud`, `dizzy`. Reaching the end of the corridor wins.
=== DESCRIPTION === The chair is rolling. Draw where it should go.
=== MAJOR VISUAL TECHNIQUES === Chair from six shapes with five castor circles that rotate with speed; the drawn path as a dotted guide the chair consumes; obstacle shadows.
=== INTERACTION MODEL === Trace ahead of the chair; arrows extend the path.
=== SOUND & MUSIC === Score `chair`: Bb major, 110 bpm, a jaunty clarinet-like square melody over a walking bass; `wheel_squeak` at intervals scaled by speed; `thud`; `win`.

**sneeze — `HOLD IT IN!` (hold_release, hold)**
=== PROMPT === A library reading room, the character at a desk, a librarian across the room. A sneeze builds: the character's face contorts through five drawn stages over `activeMs` with `sneeze_build`; the player holds to keep it in; releasing early sneezes (`sneeze`, books topple, the librarian looks up). Holding to the end lets the sneeze subside with a long exhale (`whoosh` reversed) and the librarian never looks.
=== DESCRIPTION === It is coming. Hold it in until it passes.
=== MAJOR VISUAL TECHNIQUES === Face stages as five path sets cross-faded; books as a row of rects that fall in sequence; a dust mote parallax in the window light.
=== INTERACTION MODEL === Hold pointer or Space.
=== SOUND & MUSIC === Score `library`: silence except a wall clock tick (`tick` every second at -26 dB) and a ventilation bed (brown noise, -34 dB); the sneeze build is the only rising sound; `rest` at the end.

**ducks — `DUCK OR GOOSE!` (rapid_sorting, sequence)**
=== PROMPT === A pond edge; birds waddle in from the reeds one at a time and the player sorts each left (duck) or right (goose) by swiping or arrows before the next arrives. Ducks and geese are drawn with the real differences (neck length, bill shape, size) and move with the real gait (duck a quick waddle, goose a slow stride with a head sway). A wrong sort makes the bird complain (`quack` or `honk`) and turn around. Stake: the bread in the character's hand.
=== DESCRIPTION === Duck left, goose right. Do not upset the goose.
=== MAJOR VISUAL TECHNIQUES === Bird silhouettes from seven shapes; waddle as a `rotate` ±6° with a `translateY` bob; reeds parallax; water ripple rings where they step in.
=== INTERACTION MODEL === Swipe or arrows on the current bird.
=== SOUND & MUSIC === Score `pond`: F major, 88 bpm, a folk tune on a triangle with a bass on beats 1 and 3, `coo`-style water ambience; `quack`, `honk` (the goose's honk is louder and lower and ducks the music), `win`.

---

## 4. THE APPROACH-RUN ROUNDS (`app/play/mechanics.tsx`, 20 modules)

The learning modules in `src/learn/runs.ts` are played through 14 mechanic
components, each rendered inside `app/play/scene.tsx` with the round's `prop` and the
character's `mood`. These rounds are lighter than the arcade: one screen, one
action, then the 1 to 10 slider that records `cost`. The upgrade is the same bar,
scaled to a single beat: a drawn prop that moves the way the real thing moves, the
character reacting through `mood`, one-frame feedback, and a sound for the action.
There is no per-module score; the run has one.

=== PROMPT (exact prompt used, shared by all 14 mechanics) ===
Upgrade every mechanic in `app/play/mechanics.tsx` and the scene in `app/play/scene.tsx` so a learning round reaches the Leo bar in one beat without adding a word: keep every `round` field, `onResult` contract, `progress`, `mood` and `reducedMotion` prop exactly as they are, and keep the recognition slider in `run-player.tsx` untouched. Give each mechanic a drawn prop in the run's palette built from at most eight SVG shapes with one idle motion true to the object (the phone lights up, the note flutters, the bean rolls to rest, the pan tips), a `data-mood` reaction on the character in the scene within one frame of the player's action, and one diegetic sound from the §1 bank chosen by `prop`, played only when `Sound.muted` is false. Add one run score, `spec run`: C major, 80 bpm, 4/4, a bed of two detuned triangles at -24 dB and a soft pulse on beats 1 and 3, no melody, starting on the first gesture of a run and stopping on the last screen; each round's result plays a one-beat `win` (a rising third) or `rest` (a falling second) in the run key at -12 dB. The `<SoundToggle world="run" />` goes in the scene's top corner as a drawn switch. Under reduced motion every prop idles as a two-frame alternation on a 1 s interval. Keyboard access is already complete; keep it. Unit-test nothing new in mechanics (they are UI), but add a Vitest case for the run score spec and a Playwright case per mechanic that plays one round with sound on. Screen word counts stay where they are (measure with `scripts/text-budget.mjs`, put the number in the commit).

Per-mechanic deltas (DESCRIPTION / VISUAL / INTERACTION / SOUND in one line each):

**tap** (21 rounds, e.g. `context`, `starting`). Tap the one right thing among two or three drawn options. Options are drawn objects on a shelf that rock once when they appear; the picked one slides forward 8 px and the others dim. Tap or Enter. `click`; wrong pick `tick`.

**dont-tap** (15 rounds, e.g. `interruption`, `screens`). A lure (phone, feed, doorbell, snack) does everything to be tapped for the round's duration. The lure pulses 1 → 1.2, lights up, and at 60% vibrates 2 px (none under reduced motion, glow instead); the character's `mood` goes `itch` then `resisting` then `steady`. No input wins. `phone_buzz` or `notification` at -14 dB as the lure, `rest` on success, `whoosh` and a flat `rest` on a tap.

**hold** (12 rounds, e.g. `hyperfocus`, `conflict`). Press and hold until the bar fills. The prop is held down (a lid, a door, a thought bubble) and trembles after 2 s; the character's hand is drawn on it. Pointer or Space held. A low `fridge_hum`-style hold tone at -30 dB rising a fifth over the hold, `stamp` on completion.

**swipe** (7 rounds, e.g. `not-listening`). Swipe a thing away or toward. The prop slides with the finger and snaps at 40 px with a shadow; the character turns their head to follow. Swipe or arrows. `whoosh`, direction-panned.

**drag-capture** (10 rounds, e.g. `working-memory`, `forgotten-commitments`). Drag a floating thought (a `NoteArt` note) into the capture place (notebook, phone note, calendar). The note bobs on a 2.5 s sine and wobbles when lifted; the capture place opens as it nears (a lid or page lift); the character's `mood` goes `held` on drop. Pointer capture drag, or arrows and Space. `rustle` on lift, `stamp` on drop, `tick` if released outside.

**order** (17 rounds, e.g. `deadlines`, `mornings`). Tap steps in order. Steps are drawn frames or objects; a right tap hangs it on a drawn line left to right; a wrong tap swings it (`thud`) and leaves it. Tap or Enter. `bell` pitch stepping up per correct step, `thud` on error.

**timing** (14 rounds, e.g. `sleep`, `eating`). Tap in a window. A pendulum or a filling thing (kettle, bath, browning toast) passes through a drawn sweet spot; the character watches. One tap or Space. `tick` on miss, the prop's own sound on hit (`toaster_pop`, `light_switch`, `plate`).

**recall** (5 rounds, e.g. `forgotten-commitments`). See two or three items, then pick them from a larger set after a beat. Items shown as objects on a table under a lamp that dims for the gap; the character's `mood` goes `thinking`. Tap or Enter. `light_switch` for the dim, `click` per pick, `chime` when all are found.

**sort** (11 rounds, e.g. `household`, `money`). Sort each thing left or right. The thing arrives at centre with a small settle bounce, the two bins tilt toward the finger. Swipe or arrows. `whoosh` and `plate` (right) or `thud` (wrong).

**flip** (9 rounds, e.g. `ambiguity`, `perfectionism`). Flip a card to reveal the other reading. A drawn card rotates in Y over 300 ms with a lighting change (two-tone fill swap at 50%); the character leans in. Tap or Enter. `rustle` on flip.

**pause** (2 rounds, `conflict`). Wait, then choose. A breath ring expands and contracts on a 4 s cycle for the pause, then the choices appear; the character's `mood` goes `breathing` then `steady`. Nothing during the pause, then tap. The bed only, then `click`.

**pick-bean** (20 rounds, e.g. `more-than-attention`, `gut`). Pick the bean (the run's token) that matches. Beans roll in from the edge and come to rest with a two-bounce settle; the picked one hops into the character's hand. Tap or Enter. `bubble` pitched by size, `click` on pick.

**catch** (5 rounds, e.g. `exercise`). Move to catch a falling thing. The thing falls on a parabola with rotation; the catcher (a hand, a bowl, a bag) follows pointer x; the character's `mood` goes `pleased` or `dismayed`. Pointer move or arrows. `whoosh` on the fall, `plate` on catch, `thud` on miss.

**balance** (2 rounds, `sleep`, `eating`). Keep a thing level. A tray or a scale tips toward whichever side the player leans (pointer x or arrows) and the aim is to stay inside the marked band for the round; the character's arms mirror the tilt. Continuous input. A quiet wobble tone (sine 220 Hz, pitch following tilt, -30 dB), `plate` at the end.

=== DESCRIPTION ===
Twenty modules, each a short run of rounds, each round one small thing to do and then a slider for how much it costs you. The rounds already work; the upgrade gives each one a drawn object that behaves like the real thing, a character who visibly reacts, and a small sound for the action, with one quiet piece under the whole run.

=== MAJOR VISUAL TECHNIQUES ===
- Each prop as a self-contained SVG component in `app/play/props.tsx`, keyed by `Prop`, with idle and reacted states.
- Scene character `data-mood` drives face and posture with the same four-state minimum as the arcade characters.
- All motion is transform and opacity; reduced motion swaps to two-frame idles.

=== INTERACTION MODEL ===
- Unchanged input contracts per mechanic; every reaction is visible within one frame.
- The slider that follows is untouched (0 to 10, `How much of an issue is this for you?`, Next).

=== SOUND & MUSIC ===
- One `run` score (C major, 80 bpm, bed and pulse only); `win`/`rest` per round at -12 dB.
- One diegetic SFX per mechanic as listed; lure sounds at -14 dB.
- Mute toggle drawn in the scene corner; the state is the same key as the arcade.

---

## 5. ACCEPTANCE

A game is done when all of these hold, checked in this order and recorded in the commit:

1. `pnpm typecheck`, `pnpm test`, and the game's Playwright spec pass, with the spec
   running once muted and once with sound on, keyboard only, to the result screen.
2. `node scripts/text-budget.mjs` reports the game's screens inside 20 to 60 words and
   the number is in the commit message.
3. The Leo bar checklist from `docs/design/games-to-leo-standard.md` is ticked in the
   PR body: scene, character present and reacting, drawn pieces, motion true to the
   thing, wave rhythm, readable stake, feedback per touch, HUD in world, a11y, no new
   words, and now sound: score plus at least three diegetic SFX, gesture-gated, one
   persisted mute.
4. The audio graph never exceeds 24 voices (assert in a unit test with a fake context)
   and the master compressor is in the chain; nothing plays on load; `visibilitychange`
   to hidden suspends within 50 ms.
5. Under `prefers-reduced-motion: reduce` the game is fully playable and every state is
   visible by colour and position.
6. No new dependency, no asset fetched at runtime, nothing personal in a log, no
   diagnosis language, no numbers shown to the player as a score.
7. One commit per game to main, pushed, with the word count and the checklist.

Order of work: §1 first (everything else depends on it), then §2.1 Leo (proves the
engine against the bar), then the other seven public games in the order they appear
in `src/lives/entry-points.ts`, then §3 world by world so each world's scene is built
once and its arcade deltas follow immediately, then §4.
