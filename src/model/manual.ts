// My Manual (PRD §27): three sections a person writes about themselves — what helps, what makes
// things harder, how to work with me. The rule of the page is in its title: it is *theirs*. The app
// offers suggestions drawn from what they have already told it (an experiment that helped, a need
// they said was theirs, a pattern they confirmed) and never writes a line for them; a suggestion
// becomes text only when they add it. Nothing here is a label about the person: every suggestion
// is a thing that helps or a thing that is harder, in the person's own frame.

import { strategyById } from "@/learn/interactive";
import { deriveNeeds } from "./needs";
import type { ManualSection, ModelRecord } from "./store";
import type { Subdomain } from "./layers";

export interface ManualSectionSpec {
  readonly id: ManualSection;
  readonly title: string;
  /** One line under the title: what goes here. */
  readonly prompt: string;
  readonly placeholder: string;
}

export const MANUAL_SECTIONS: readonly ManualSectionSpec[] = [
  { id: "helps", title: "What helps me", prompt: "The conditions and small moves that make things go better for you.", placeholder: "A clear first step. Somebody in the room. Food on the desk." },
  { id: "harder", title: "What makes it harder", prompt: "The situations where things reliably go wrong — so they can be planned around, not fought.", placeholder: "Vague briefs. Five hours’ sleep. A phone within reach." },
  { id: "work-with-me", title: "How to work with me", prompt: "What you would tell a manager, a partner or a friend who wants to make it easier.", placeholder: "Tell me the deadline early. One thing at a time. Write it down." },
];

/** What the "how to work with me" section could say for a need in a given subdomain. */
const WORK_WITH_ME: Partial<Record<Subdomain, string>> = {
  activation: "Give me a clear first step, not the whole task",
  attention: "One thing at a time; a quiet spot when it matters",
  memory: "Write it down, or send it after you say it",
  switching: "Let me finish the thing I am in before the next one",
  inhibition: "A day between an idea and a decision suits me",
  time: "Tell me the deadline early, and again a few days out",
  "emotional-regulation": "If I go quiet, give me twenty minutes; I will come back",
  sleep: "Mornings after a short night are not my best; afternoons are",
  movement: "I think better after moving; a walking meeting works",
  appetite: "If I have gone quiet at 3pm, I probably have not eaten",
  energy: "Front-load the hard thing; my afternoons run on fumes",
  structure: "Fixed times and a check-in beat an open week",
  noise: "Headphones on means I am working, not ignoring you",
  workload: "Tell me what to drop when something new comes in",
  "deadline-design": "Milestones along the way, not one far-off date",
  "living-environment": "A visible list at home, not a verbal one",
  "study-context": "Assessments spelled out early, with the first step named",
  "workplace-context": "Instructions in writing, and one place they live",
  partner: "Say the thing, and say when it is due, in one message",
  family: "Ask me what helps rather than what is wrong",
  manager: "A written brief with what ‘done’ looks like",
  teachers: "The first step of an assignment named, not just the date",
  peers: "Company makes some things easier; ask me which",
  clinicians: "I will bring notes; help me turn them into questions",
};

/** Suggestions per section, from the record only. Empty arrays when there is nothing to draw on. */
export function manualSuggestions(record: ModelRecord): Readonly<Record<ManualSection, readonly string[]>> {
  const needs = deriveNeeds(record).slice(0, 4);
  const helps = new Set<string>();
  for (const e of record.experiments) {
    if (e.outcome === "a-lot" || e.outcome === "a-little") {
      const title = strategyById(e.strategyId)?.strategy.title;
      if (title) helps.add(title);
    }
  }
  for (const n of needs) for (const c of n.context ?? []) if (c.startsWith("Easier ")) helps.add(c.replace(/^Easier /, "").replace(/^\w/, (ch) => ch.toUpperCase()));
  const harder = new Set<string>();
  for (const n of needs) {
    harder.add(n.label);
    for (const c of n.contributors) if (c.note && !c.note.startsWith("Easier")) harder.add(c.note);
  }
  const work = new Set<string>();
  for (const n of needs) {
    const line = WORK_WITH_ME[n.subdomain];
    if (line) work.add(line);
    for (const c of n.contributors) { const l = WORK_WITH_ME[c.subdomain]; if (l) work.add(l); }
  }
  const dedupe = (set: Set<string>, section: ManualSection) => [...set].filter((s) => !record.manual[section].includes(s)).slice(0, 6);
  return { helps: dedupe(helps, "helps"), harder: dedupe(harder, "harder"), "work-with-me": dedupe(work, "work-with-me") };
}

/** The manual as plain text, for copying to a person. Only the person's own words. */
export function manualText(record: ModelRecord): string {
  const parts: string[] = [];
  for (const s of MANUAL_SECTIONS) {
    const text = record.manual[s.id].trim();
    if (text) parts.push(`${s.title}\n${text}`);
  }
  return parts.join("\n\n");
}

/** Append a suggestion as its own line. */
export function withLine(text: string, line: string): string {
  const t = text.replace(/\s+$/, "");
  return t ? `${t}\n${line}` : line;
}
