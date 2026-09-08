// Reflection interpretation (PRD §29): a suggested reading of what a person wrote, which they
// confirm or wave away. ONLY A CONFIRMED INTERPRETATION ENTERS THE MODEL.
//
// No language model. The reading is a closed lexicon of cues — words a person uses for the
// conditions the model already knows about (short on sleep, a vague brief, a manager, a phone) —
// mapped to the subdomain and layer the care map uses. That keeps it honest about what it is:
// a guess said out loud, in the person's own vocabulary, never a verdict. The reflection text
// itself stays where it was written; what enters the model is the subdomain and the note, and
// the analytics event carries the subdomain id and nothing else.
//
// Every note passes the patient rules, and the sentence built from it never says what the person
// is — only what the moment seems to have been about.

import type { Layer, Subdomain } from "./layers";

export interface InterpretationCue {
  readonly subdomain: Subdomain;
  readonly layer: Layer;
  /** The contributor note the model keeps if confirmed — plain words, no diagnosis. */
  readonly note: string;
  /** What the person reads: "It sounds like ‹phrase› was part of it." */
  readonly phrase: string;
  readonly pattern: RegExp;
}

export interface Interpretation {
  readonly subdomain: Subdomain;
  readonly layer: Layer;
  readonly note: string;
  readonly sentence: string;
}

export const INTERPRETATION_CUES: readonly InterpretationCue[] = [
  { subdomain: "sleep", layer: "body", note: "Short on sleep", phrase: "being short on sleep", pattern: /\b(tired|exhausted|knackered|no sleep|not slept|hadn'?t slept|haven'?t slept|slept badly|up (too )?late|late night|couldn'?t sleep)\b/i },
  { subdomain: "structure", layer: "environment", note: "The task was vague", phrase: "the task being vague", pattern: /\b(vague|unclear|ambiguous|no idea what|not sure what|didn'?t know what|don'?t know what|no brief|the brief)\b/i },
  { subdomain: "deadline-design", layer: "environment", note: "The deadline was far away, then suddenly close", phrase: "the deadline being far away, then suddenly close", pattern: /\b(deadline|due (date|tomorrow|today|next week)|last minute|night before|ran out of time)\b/i },
  { subdomain: "peers", layer: "people", note: "Company would have helped", phrase: "having somebody beside you", pattern: /\b(beside me|next to me|somebody with me|someone with me|with a friend|body[- ]?doubl\w*|on my own|alone)\b/i },
  { subdomain: "manager", layer: "people", note: "How work arrived from a manager", phrase: "how the work arrived from your manager", pattern: /\b(boss|manager|supervisor|team lead)\b/i },
  { subdomain: "teachers", layer: "people", note: "How the work arrived from a course", phrase: "how the work arrived from the course", pattern: /\b(lecturer|tutor|teacher|professor|assignment|essay|uni)\b/i },
  { subdomain: "partner", layer: "people", note: "A partner was carrying part of it", phrase: "your partner", pattern: /\b(partner|wife|husband|girlfriend|boyfriend|spouse)\b/i },
  { subdomain: "family", layer: "people", note: "Family were in the picture", phrase: "family", pattern: /\b(mum|mom|dad|mother|father|parents|my kids|the kids|children)\b/i },
  { subdomain: "noise", layer: "environment", note: "A noisy space", phrase: "the noise around you", pattern: /\b(noisy|noise|loud|open[- ]plan)\b/i },
  { subdomain: "attention", layer: "brain", note: "A phone or a feed pulled attention", phrase: "a phone or a feed pulling you", pattern: /\b(phone|scroll\w*|feed|notifications?|instagram|tiktok|youtube|reddit)\b/i },
  { subdomain: "emotional-regulation", layer: "brain", note: "A strong feeling arrived first", phrase: "a strong feeling arriving first", pattern: /\b(anxious|anxiety|panick\w*|panic|overwhelm\w*|ashamed|shame|frustrat\w*|angry|furious|upset|dread\w*|scared|embarrass\w*)\b/i },
  { subdomain: "memory", layer: "brain", note: "Something fell out of working memory", phrase: "something falling out of working memory", pattern: /\b(forgot|forget|forgotten|couldn'?t remember|slipped my mind|lost the thread)\b/i },
  { subdomain: "time", layer: "brain", note: "Time ran differently from how it felt", phrase: "time running differently from how it felt", pattern: /\b(lost track of time|hours went|hours passed|later than I thought|didn'?t notice the time|time got away)\b/i },
  { subdomain: "appetite", layer: "body", note: "Had not eaten", phrase: "not having eaten", pattern: /\b(hadn'?t eaten|haven'?t eaten|didn'?t eat|forgot to eat|skipped (lunch|breakfast|dinner)|starving|hungry)\b/i },
  { subdomain: "medication-experience", layer: "body", note: "A medication day felt different", phrase: "a medication day feeling different", pattern: /\b(medication|meds|my dose|ritalin|vyvanse|dexamphetamine|dexies|concerta)\b/i },
  { subdomain: "workload", layer: "environment", note: "Too much on at once", phrase: "too much being on at once", pattern: /\b(too much on|too many things|so much to do|everything at once|all at once|swamped|snowed under)\b/i },
];

/** At most two readings, in the order the person's own words reach them. */
export function interpret(text: string): Interpretation[] {
  const hits: Array<{ cue: InterpretationCue; at: number }> = [];
  for (const cue of INTERPRETATION_CUES) {
    const m = cue.pattern.exec(text);
    if (m && m.index !== undefined) hits.push({ cue, at: m.index });
  }
  return hits
    .sort((a, b) => a.at - b.at)
    .slice(0, 2)
    .map(({ cue }) => ({ subdomain: cue.subdomain, layer: cue.layer, note: cue.note, sentence: `It sounds like ${cue.phrase} was part of it.` }));
}
