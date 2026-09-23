# Jax — Just the list

Built 23 September 2026 at `/lives/play/jax-just-the-list`, replacing the two shared arcade rounds
the journey used to borrow (`jax_just_milk`, `jax_checkout`, which remain as arcade games).

## The game

A supermarket aisle in one-point perspective rolls toward Jax's trolley in three lanes. What the list
needs drops in when the trolley is under it: steer by tapping the item, tapping a lane, swiping,
or with the arrow keys. Sale lures lean into the trolley's lane halfway down the aisle; tap them
(or press Space) to knock them away. The wish item (a kayak, speaker or bike light) is tagged
**Want**: tapped, it is saved for later; missed, it rides into the trolley and costs coins.

Three trips rise in pace: one item; three items where one is **sold out** and the list swaps in a
substitute; and a trip where Ari texts an extra item mid-aisle. Each trip ends at the till: an exact
receipt in integer coins, extras can go back, and paying over budget is refused politely. A
considered extra within budget is allowed. A missed need always comes round again.

**Setup (at home, untimed):** stick the list on the fridge, put the food away, and save the wish for
payday. **Revisit:** the list items now carry a tick badge (the list on the fridge made visible), and
the saved wish arrives early **on sale**. Steering into it and leaving it are both valid endings.

## Implementation

- `src/lives/jax-world.ts`: pure reducer with three authored scenarios. 15 Vitest cases: every
  scenario to completion, first product within half a second, lane-only collection, the lure lean,
  wish saving, exact till arithmetic with extras-only returns, the sold-out swap, Ari's request,
  no-stall repeats, setup gating, both revisit outcomes, still mode, pause and replay.
- `app/lives/jax-world/`: the aisle, products, trolley and kitchen drawn inline; the shared kit
  shell, loop, cast and sound engine (F-major muzak, plate/till/zip/thud cues), muted by default.
- The scene keeps a portrait aspect on wide screens, so desktop gains margin rather than a cropped
  aisle.

## Verification

Six Playwright cases: library entry through three trips, tills, setup, revisit with the sale wish
and replay; exact till totals; keyboard-only with sound on; real-time motion and pause; 320 to
1440 px with 44 px targets, reachable exit and axe scans of four phases; no storage writes.
Text budget: 10 to 29 words across the aisle, till, setup, revisit and complete.

Function is tested; engagement is not. Observed playtesting remains outstanding.
