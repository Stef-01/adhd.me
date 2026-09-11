// §72: the words of an audio session, as data. An audio block names a transcript by id; the
// renderer reads it aloud on the screen until an asset exists, and the validator refuses an audio
// block whose transcript is not here. Nothing in this file assumes a recording.

export interface Transcript {
  readonly id: string;
  /** Short lines, one breath each, in the order they are spoken. */
  readonly lines: readonly string[];
}

export const TRANSCRIPTS: readonly Transcript[] = [
  {
    id: "sixty_second_reset",
    lines: [
      "Sixty seconds. Nothing to fix.",
      "Feet on the floor. Notice the weight of them.",
      "One breath in, slower than usual. Out, slower again.",
      "Name what you can hear. Three things.",
      "One more breath.",
      "Now the next thing, just the first step of it.",
    ],
  },
  {
    id: "before_a_hard_conversation",
    lines: [
      "Five minutes before it. Sit or stand, whichever is easier to keep still in.",
      "What is the one thing you want them to know? One sentence. Hold it.",
      "Breathe out longer than in. Three times.",
      "What are you afraid they will say? Name it once, then let it sit beside you instead of in front of you.",
      "The one sentence again.",
      "If it goes sideways, you can pause. Saying so out loud is allowed.",
      "Last breath. Then go.",
    ],
  },
  {
    id: "brain_everywhere_grounding",
    lines: [
      "Everything at once. That is the moment this is for.",
      "Five things you can see. Slowly, one at a time.",
      "Four things you can feel: the chair, the floor, your hands, the air.",
      "Three things you can hear.",
      "Two you can smell, or two you remember smelling.",
      "One thing you will do next. Only one.",
    ],
  },
];

export function transcript(id: string): Transcript | null {
  return TRANSCRIPTS.find((t) => t.id === id) ?? null;
}
