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
];
