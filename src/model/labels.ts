// The sentence a subdomain is called when it is a need — "Starting work before deadline
// pressure takes over" — kept apart from the needs engine so the survey scorer can name a
// friction without importing the engine that reads its results.

import { subdomain as subdomainEntry, type Subdomain } from "./layers";

const SUBDOMAIN_LABELS: Partial<Record<Subdomain, string>> = {
  activation: "Starting work before deadline pressure takes over",
  attention: "Keeping attention where you point it",
  memory: "Holding things in mind",
  switching: "Getting back to a task after an interruption",
  time: "Feeling how far away a deadline is",
  "emotional-regulation": "Feelings arriving fast and settling slowly",
  sleep: "Sleep, and what a short night costs",
  movement: "Keeping movement going",
  "living-environment": "The household load",
  partner: "Being understood by the people close to you",
  "deadline-design": "Long deadlines with little structure",
  "workplace-context": "How work arrives",
  "study-context": "How study is set up",
  "medication-experience": "What medication does and does not change",
  appetite: "Eating regularly",
  energy: "Energy through the day",
  structure: "How much structure a day has",
  noise: "Noise and interruption where you work",
  workload: "How much is on at once",
};

export function needLabel(sub: Subdomain): string {
  return SUBDOMAIN_LABELS[sub] ?? subdomainEntry(sub).label;
}

