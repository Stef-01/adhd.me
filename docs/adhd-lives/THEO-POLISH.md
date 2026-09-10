# Theo: Out the door

Second illustrated practice game, after Leo shipped in PR #20. The user explicitly requested
the next game and asked to continue. The existing `theo_get_out` character scenario supplies
the subject: time blindness, leaving home, and distracting side quests.

Pack 3/4/5 essentials from a seeded hallway of 6/8/11 objects, then explicitly open the door.
Usual/busy/everything-at-once mornings allow 24/20/16 seconds. A picked distraction is a detour;
three unique detours end the round. Repeated inputs are idempotent. An early door action tells
the player what is missing rather than ending the round. Untimed mode and reduced motion remove
the clock; the same packing and detour rules remain. Practice never writes learner signals.

The separate practice route is `/lives/play/theo-out-the-door`, linked from Learn and Theo's
character. The existing short Chaos Run variant retains its established timing and rules.

The supplied reference clone's Wire/WireMGSceneMaster mechanisms inform drag-to-target,
disable-after-completion, all-target completion and pause input handling. No Unity code or
artwork is copied. All props and the hallway are original SVG. Unlike the reference's immediate
mismatch loss, Theo allows two recoverable detours, fitting this scenario's learning aim.

Visual direction: butter #f8d889, apricot #df8f60, fern #80b6a0, deep green #34483e,
paper #fff6dc, lilac #6677b8. The illustrated doorway and launch pad are the signature.
Existing Newsreader display and Inter UI type maintain continuity. Desktop uses hallway beside
object shelves; phone stacks a compact hallway above shelves. Drag lift/snap and door/character
departure communicate actions; reduced motion removes transitions. No ambient attention loops.

QA: packing/duplicates/door gate, detours, invalid drops, pointer drag, touch, keyboard, timeout,
pause and hidden tabs, replay, no profile writes, hydration, accessibility, 320/390/768/1440 layouts,
reference comparison, focused tests then app-wide CI before merge to main.
