import type { CharacterId } from "./types";

export interface LifeJourney {
  slug: string;
  who: CharacterId;
  title: string;
  colour: string;
  ink: string;
  rounds: readonly { game: string; title: string }[];
  practice: readonly { title: string; choices: readonly [string, string]; correct: number; effect: string; sprite: string }[];
  ending: string;
  strategy: string;
}

export const JOURNEYS: readonly LifeJourney[] = [
  {
    slug: "maya-one-thing-at-a-time", who: "maya", title: "One thing at a time.", colour: "#cfe3f5", ink: "#273044",
    rounds: [
      { game: "maya_crossing", title: "Find a clear route." },
      { game: "maya_layers", title: "Clear the notifications." },
      { game: "maya_turn_it_down", title: "Turn one thing down." },
    ],
    practice: [
      { title: "One less interruption.", choices: ["Mute notifications", "Open another feed"], correct: 0, effect: "The phone can wait.", sprite: "phone" },
      { title: "Choose a calmer next step.", choices: ["Do everything at once", "Pause somewhere quiet"], correct: 1, effect: "One input changed. A little more room.", sprite: "bench" },
    ],
    ending: "Change the surroundings. Then take one next step.", strategy: "lower_sensory_floor",
  },
  {
    slug: "arjun-hold-the-thread", who: "arjun", title: "Back to the meeting.", colour: "#dce3f5", ink: "#253047",
    rounds: [
      { game: "arjun_lock_in", title: "Keep what belongs." },
      { game: "arjun_parking", title: "Now, or later?" },
      { game: "arjun_hold_thread", title: "Hold until the question." },
    ],
    practice: [
      { title: "That thought can wait.", choices: ["Follow every tangent", "Write a later note"], correct: 1, effect: "Captured. You do not have to rehearse it.", sprite: "list" },
      { title: "Find your way back.", choices: ["Return to the agenda", "Open another tab"], correct: 0, effect: "One anchor to come back to.", sprite: "agenda" },
    ],
    ending: "Capture the thought. Return to one meeting anchor.", strategy: "parking_lot_note",
  },
  {
    slug: "zoe-before-you-send", who: "zoe", title: "Before you press send.", colour: "#f8ddeb", ink: "#682642",
    rounds: [
      { game: "zoe_dont_send", title: "Leave send alone." },
      { game: "zoe_keyword", title: "Hold your keyword." },
      { game: "zoe_drafts", title: "Clear the extra drafts." },
    ],
    practice: [
      { title: "Give the reply some space.", choices: ["Save it as a draft", "Send every thought"], correct: 0, effect: "The message can wait while the feeling settles.", sprite: "draft" },
      { title: "Come back to one point.", choices: ["Add fourteen more messages", "Keep one clear sentence"], correct: 1, effect: "One thought, with room for a reply.", sprite: "speech" },
    ],
    ending: "Pause. Read it again. Choose what you want to say.", strategy: "pause_before_send",
  },
  {
    slug: "mia-remember-why", who: "mia", title: "What did I come for?", colour: "#e8ddf3", ink: "#513963",
    rounds: [
      { game: "mia_why_here", title: "Find the charger." },
      { game: "mia_list", title: "Milk. Parcel. Stamps." },
      { game: "mia_the_list", title: "Find the list." },
    ],
    practice: [
      { title: "Give the thought a home.", choices: ["Keep repeating it", "Write one visible note"], correct: 1, effect: "The note holds it for you.", sprite: "list" },
      { title: "Put it where you need it.", choices: ["Beside the thing you will use", "Inside a forgotten drawer"], correct: 0, effect: "A reminder at the right moment.", sprite: "keys" },
    ],
    ending: "Write it down. Put the cue where the action happens.", strategy: "external_cue",
  },
  {
    slug: "jax-just-the-list", who: "jax", title: "Just the list.", colour: "#d7ecdf", ink: "#294c3d",
    rounds: [
      { game: "jax_just_milk", title: "Keep the milk. Clear the extras." },
      { game: "jax_checkout", title: "Milk. Bread. Eggs." },
    ],
    practice: [
      { title: "Still thinking about the kayak?", choices: ["Add it to the trolley", "Save the idea for later"], correct: 1, effect: "The idea is saved. The trolley stays clear.", sprite: "kayak" },
      { title: "Before the next shop.", choices: ["Bring a short list", "Rely on the sale signs"], correct: 0, effect: "One list to return to.", sprite: "list" },
    ],
    ending: "Keep the list visible. Give new wants time before buying.", strategy: "park_the_idea",
  },
];
