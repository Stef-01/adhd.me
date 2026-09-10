// §12, §41, §47: the eight lives — who they are, what pattern they live, which mechanics suit them,
// and what each is trying. Copy passes the patient rules; §79 tone: describe, never diagnose.
import type { CharacterId, InputMechanic, LearningDomain } from "./types";

export interface LivesCharacter {
  readonly id: CharacterId;
  readonly name: string;
  /** One line, the story's hook (§41). */
  readonly hook: string;
  /** §47: the dominant lived pattern, in plain words. */
  readonly pattern: string;
  readonly mechanics: readonly InputMechanic[];
  /** §12: the learning domains this character's moments open. */
  readonly domains: readonly LearningDomain[];
  /** §41: "Things Theo is trying" — strategy ids. */
  readonly trying: readonly string[];
  /** The line on a resonance card (§36). */
  readonly moment: string;
}

export const CHARACTERS: readonly LivesCharacter[] = [
  { id: "maya", name: "Maya", hook: "Can find her way through a spreadsheet. Cannot find her way across a busy intersection.", pattern: "Distractibility and overwhelm", mechanics: ["trace", "tap_filter", "tap"], domains: ["sensory_management", "environment", "planning", "transitions", "mindfulness"], trying: ["lower_sensory_floor", "overwhelm_reset", "transition_reset"], moment: "Everything at the crossing was loud at once." },
  { id: "leo", name: "Leo", hook: "Falls asleep anywhere except in bed.", pattern: "Restlessness and sensory intensity", mechanics: ["tap", "catch", "rapid_tap"], domains: ["sleep", "sensory_management", "mindfulness"], trying: ["lower_sensory_floor", "sleep_wind_down", "brain_dump_bed"], moment: "Why is that tiny sound SO loud?" },
  { id: "arjun", name: "Arjun", hook: "Runs the numbers for the whole company. Loses the meeting to a cow.", pattern: "High achievement, wandering attention, deep focus", mechanics: ["tap_filter", "sequence"], domains: ["attention", "working_memory", "prioritisation"], trying: ["meeting_anchor", "parking_lot_note", "transition_reset"], moment: "Where did my attention go?" },
  { id: "zoe", name: "Zoe", hook: "Says the thing. Then the next thing. Then fourteen things.", pattern: "Impulsivity and quick feeling", mechanics: ["no_input", "hold", "tap"], domains: ["impulsivity", "communication", "relationships", "emotional_regulation"], trying: ["pause_before_send", "hold_the_keyword", "park_the_idea"], moment: "Ever wanted to reply immediately and regretted it?" },
  { id: "theo", name: "Theo", hook: "Can estimate the economic impact of a project. Cannot estimate how long a shower takes.", pattern: "Time blindness and transitions", mechanics: ["sequence", "tap_filter", "trace"], domains: ["time_management", "transitions", "planning", "environment"], trying: ["reverse_planning", "launch_pad", "transition_reset"], moment: "It was 7:55 and the bookshelf needed reorganising." },
  { id: "mia", name: "Mia", hook: "Walks into rooms with purpose. Leaves them with a banana.", pattern: "Working memory and daydreaming", mechanics: ["tap", "sequence", "hold_release"], domains: ["working_memory", "organisation", "environment"], trying: ["external_cue", "put_it_where", "launch_pad", "brain_dump_bed"], moment: "Why am I in this room?" },
  { id: "jax", name: "Jax", hook: "Went out for milk. Came back with a kayak.", pattern: "Novelty and impulse", mechanics: ["swipe", "tap"], domains: ["impulsivity", "prioritisation", "planning"], trying: ["park_the_idea", "pause_before_send", "external_cue"], moment: "Just milk. Just. Milk." },
  { id: "nina", name: "Nina", hook: "Can write the perfect email. Has been about to start it since Tuesday.", pattern: "Starting and perfectionism", mechanics: ["tap", "no_input"], domains: ["task_initiation", "emotional_regulation", "planning", "self_understanding"], trying: ["sixty_second_start", "imperfect_first_draft", "reverse_planning"], moment: "The task became a mountain before it began." },
];

export function character(id: CharacterId): LivesCharacter {
  const c = CHARACTERS.find((x) => x.id === id);
  if (!c) throw new Error(`lives: unknown character ${id}`);
  return c;
}
