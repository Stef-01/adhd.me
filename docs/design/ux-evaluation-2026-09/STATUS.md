# UX upgrade: status, 2026-09-27

What the plan in `PLAN.md` asked engineering to build is built, except the phone design for the care
map, which waits on a choice. Everything below the first section needs a person: the founder, counsel,
a clinician, or real users. Nothing in this tree may answer those on their behalf.

## Built

| Item | What changed |
| --- | --- |
| W1 | Urgent help: text and chat rows beside the call rows. |
| W2 | No measure and no "Working well" on the map. |
| W3 | My ADHD keeps dated snapshots; the dashed shape is day one or a month ago, named in a pill. The hub shows one contributor; the axis lists up to three. |
| W4 | "How it fills in", "Answer again" (the old answers stay on the map until the last question), a source line and "What you tried" on each axis. |
| W5 | Where progress lives, Save and Restore a copy, one delete. |
| W6 | The serif rule (a question or a quoted voice), example searches under the finder box, the scenarios stage removed, the refine label, Start over in the bar. |
| W7 | Learn games: "Try these first" (three, goal-matched, played ones left out), "All games" in groups with ticks, the care map as a full-width row, "Saved on this device." |
| W8 | Learn modules: the goals question first, "For you" under it with a line that says where the picks came from, the rest behind "Explore all modules". |
| W9 | Care map: labels upright, no count in the centre, no number in the panel, two columns from 1024px with the panel beside the wheel, the panel scrolled into view on a phone, games and modules for each part of life, palette tokens. |
| W10 | Module page spacing, no category eyebrows, small text off strong fills, no ring on a heading focused by script. |
| W11 | Contrast sampled where axe cannot measure, at 390 and at 1440; nothing under 12px at either width; every new state in the sweep. |
| N15 | Every game's and `/story`'s small text raised to 12px, one commit per game; the sweep's ledger is empty. |
| W12 | The taste register (`src/design/taste-register.ts`) and its twin test. Before and after captures of every changed screen at 390 and 1440 in `qa/ux-2026-09/`. `docs/DESIGN-QA.md` was removed with the other registers on 2026-09-03, so the record sits beside the captures; the taste skill's `{#honesty.qa-capture}` still names that file. |
| N14 | Dates on the person's own clock. |
| Roadmap | Three arcade rounds that taught the wrong thing; the privacy page now says what `/match` sends; opt-in sound for the Chaos Run, never under reduced sensory effects. |

## Waiting on a choice from the founder

- **The care map on a phone (N8).** Labels cannot reach 11px at 390px inside the discs. Two options:
  1. *Dots and lists:* under 600px each node becomes a dot on the wheel, and each quadrant's names
     sit in a list beside it. Every name is readable; the wheel becomes a picture of the four parts.
  2. *Four quadrants:* under 600px the wheel is four tappable quadrants; a tap opens that quadrant's
     list of parts. Fewer things on screen at once; one more tap to reach a part.
  Both are drawn at 390, with word counts, under "The care map on a phone: two options" in
  `qa/ux-2026-09/README.md` (`care-map-phone-option-1.png`, `care-map-phone-option-2.png`,
  `care-map-phone-option-2-open.png`).
  Until one is chosen the care map stays exempt from the 12px sweep, and the exemption names N8.
- **Confirm the decisions the plan proceeded on:** D1 to D12 in `PLAN.md` §4. D3, D4 and D7 shipped
  in Phase 1; D8 to D10 shaped the games pane.
- **`/match` has no way in.** Restore one link or retire it. Keeping it also means the Supabase
  journal (a project and keys) and counsel's review of the new privacy paragraph.
- **Accounts or sync (ADR 0008).** Save and Restore a copy covers the gap until then.
- **Analytics for a pilot.** Off until an analytics ID is set.
- **Whether the care-plan card moves to the hub, and whether `/my-map` retires.**
- **`/demo` in production.** `/practices` links to it; the route stays off unless its switch is set.

## Waiting on counsel

- The seven go-live questions in the README, including an Ahpra review of the name.
- The privacy policy is a draft. It now states what the `/match` request sends and how it is deleted.

## Waiting on a clinician

- All 19 Lives strategies are marked "pending" review.
- The Learn modules and the care-plan wording.
- The sound cues are off by default; whether they help or distract is a question for a playtest.

## Waiting on real people

- No rebuilt game has had an observed playtest.
- The three guided audio sessions are unrecorded.
- On the real roster a person's map reaches one provider, and psychologists have no expertise
  vocabulary: real providers are needed before the matching says much.

## On release day

- Check every crisis number by hand (`docs/ops/crisis-contacts.md`).
