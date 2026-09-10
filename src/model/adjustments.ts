// Institutional navigation (PRD §45): the adjustments a university or a workplace can put on paper,
// who to ask for them, and what to bring. Content, not a service: the app makes no application and
// holds no letter. It says what exists, which most people are never told, and points at the person
// who can grant it — the university's own support service, a manager, or the GP whose letter is
// often the one piece of paper both of them ask for.
//
// Everything here is a patient surface. It names no diagnosis, promises no outcome, and describes
// nobody's rights in legal terms — "commonly available" is the strongest claim it makes, because
// what a given university or employer offers is theirs to say.

import type { Subdomain } from "./layers";
import type { ModelRecord } from "./store";
import type { Profession } from "@/support/professions";

export type AdjustmentTrack = "university" | "work";

export interface AdjustmentEntry {
  readonly id: AdjustmentTrack;
  readonly title: string;
  readonly eyebrow: string;
  readonly lede: string;
  /** Adjustments people with ADHD commonly ask for and commonly get. Short, concrete, no promise. */
  readonly commonlyAvailable: readonly string[];
  /** Who grants it, in order: the person or office to ask first. */
  readonly whoToAsk: readonly string[];
  /** What to have in hand before asking. Each maps to something this app already helps with, or a GP. */
  readonly bring: readonly string[];
  /** The order the process usually runs in. */
  readonly steps: readonly string[];
  /** The kinds of help the finder can show for this track. */
  readonly professions: readonly Profession[];
  /** The need subdomains that make this the track to lead with. */
  readonly subdomains: readonly Subdomain[];
}

export const ADJUSTMENT_TRACKS: readonly AdjustmentEntry[] = [
  {
    id: "university",
    title: "Study adjustments",
    eyebrow: "University and TAFE",
    lede: "Every Australian university and TAFE runs an accessibility or disability service, and ADHD is one of the things it exists for. Most students are never told. Registering once puts the adjustments on paper so you are not asking each lecturer from scratch.",
    commonlyAvailable: [
      "Extensions without a fresh case each time",
      "Extra time, quieter exam room",
      "Recorded lectures, or the notes",
      "Briefs in writing, done defined",
      "Reduced load, full-time status kept",
      "A named contact who speaks for you",
    ],
    whoToAsk: [
      "The accessibility or disability service, often called Student Support, Accessibility Services or Disability Services",
      "A course coordinator, for a one-off extension while registration is under way",
      "A GP, for the letter the service usually asks for",
    ],
    bring: [
      "A letter from a GP or whoever assessed you, the service usually asks for one",
      "Your manual: what helps, what makes it harder, how to work with you",
      "A short list of where it falls apart: deadlines, exams, briefs, mornings",
    ],
    steps: [
      "Find the service on the university's website and book an appointment; most take them online",
      "Ask the GP for a letter that says what you find hard, not a label",
      "Meet the adviser and agree an access plan, the document that names your adjustments",
      "Send the plan to each unit's coordinator at the start of term; the service will show you how",
      "Use it. An extension you are entitled to and do not ask for helps nobody",
    ],
    professions: ["university-support", "gp", "adhd-coach"],
    subdomains: ["study-context", "teachers", "deadline-design"],
  },
  {
    id: "work",
    title: "Workplace adjustments",
    eyebrow: "Work",
    lede: "Employers in Australia are expected to make reasonable adjustments for a condition that affects how somebody works, and most of the adjustments that help with ADHD cost nothing. You do not have to disclose everything, or anything, to ask for some of them.",
    commonlyAvailable: [
      "Briefs in writing, done defined",
      "One weekly check-in",
      "A quieter desk, or days at home",
      "Milestones somebody is waiting for",
      "Meeting notes or a recording",
      "Flexible start times",
    ],
    whoToAsk: [
      "Your manager, for anything that is really just a way of working, most of the list above",
      "HR or a people team, for a formal adjustment, or when a manager will not engage",
      "An occupational therapist, for a written assessment of what would help in your role",
    ],
    bring: [
      "Your manual, or the part of it you are willing to share, how to work with you",
      "Two or three specific asks, not a label; ‘briefs in writing’ is easier to grant than ‘support’",
      "If you want the formal route, a letter from a GP or an occupational therapist",
    ],
    steps: [
      "Decide what you want to say. You can ask for a way of working without naming ADHD at all",
      "Pick the two adjustments that would change most, and ask for those first",
      "Put the ask in writing after the conversation, so it exists",
      "If it needs to be formal, ask HR what their process is and bring the letter",
      "Review after a month: what landed, what did not, what to ask for next",
    ],
    professions: ["occupational-therapist", "adhd-coach", "gp"],
    subdomains: ["workplace-context", "manager", "workload"],
  },
];

export function adjustmentTrack(id: AdjustmentTrack): AdjustmentEntry {
  const entry = ADJUSTMENT_TRACKS.find((t) => t.id === id);
  if (!entry) throw new Error(`adjustments: unknown track ${id}`);
  return entry;
}

/** The track a need points at, if it is an institutional one; null for a need that is not. */
export function trackForSubdomain(subdomain: Subdomain): AdjustmentTrack | null {
  return ADJUSTMENT_TRACKS.find((t) => t.subdomains.includes(subdomain))?.id ?? null;
}

/**
 * Which track to lead with for this person: the one their top need names, else what they said
 * ADHD affects most, else university first — the one fewer people know exists.
 */
export function leadingTrack(record: ModelRecord, topSubdomain: Subdomain | null): AdjustmentTrack {
  if (topSubdomain) {
    const t = trackForSubdomain(topSubdomain);
    if (t) return t;
  }
  const affects = record.onboarding?.affects;
  if (affects === "work") return "work";
  if (affects === "study") return "university";
  return "university";
}
