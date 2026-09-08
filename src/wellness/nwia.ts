// The National Wellness Institute of Australia's wellness model (wellnessaustralia.org), as this
// app uses it — founder-directed, 2026-09-08: "implement their key principles and learnings …
// in a minimalist, key-principles way. I don't want to add clutter."
//
// WHAT WAS TAKEN, AND FROM WHERE. Two things, both from the public pages (the site itself is not
// reachable from the build environment; the text below is paraphrased from what its pages say and
// attributed on every surface that shows it):
//   1. The paradigm: a well person's awareness, understanding and active decision-making align
//      with their values and aspirations. That is already this app's spine — experience, understand,
//      recognise, reflect, try, decide — so it is stated once, on the care map, and not repeated.
//   2. The nine dimensions, which "all impact upon each other and our overall balance": Physical,
//      Social, Emotional, Work, Spiritual values, Intellectual, Cultural values, Environment,
//      Finances. The app's own map is the eco-bio-psychosocial one (four layers, PRD §25); the NWIA
//      dimensions are a second reading of the SAME nodes — each subdomain maps to one or two — so
//      the balance principle can be said in one line on My ADHD ("in your picture / not yet") and
//      on a node, without a second map.
//
// Nothing here scores a dimension. The one thing computed is which dimensions the person's own
// signals touch, and which they have said nothing about — the balance principle, said honestly.

import type { Subdomain } from "@/model/layers";

export const NWIA_URL = "https://www.wellnessaustralia.org/the-wellness-dimensions/";
export const NWIA_NAME = "National Wellness Institute of Australia";

/** The paradigm, in one sentence, paraphrased from the Institute's public description. */
export const NWIA_PARADIGM =
  "A well person’s awareness, understanding and active decision-making line up with their own values and aspirations — and the nine dimensions of a life all affect each other, and the balance between them.";

export const NWIA_DIMENSIONS = ["physical", "social", "emotional", "work", "spiritual", "intellectual", "cultural", "environment", "finances"] as const;
export type NwiaDimension = (typeof NWIA_DIMENSIONS)[number];

export const NWIA_LABELS: Readonly<Record<NwiaDimension, string>> = {
  physical: "Physical",
  social: "Social",
  emotional: "Emotional",
  work: "Work",
  spiritual: "Spiritual values",
  intellectual: "Intellectual",
  cultural: "Cultural values",
  environment: "Environment",
  finances: "Finances",
};

/** One line each, in this app's voice — what the dimension is about for a person with ADHD. */
export const NWIA_MEANINGS: Readonly<Record<NwiaDimension, string>> = {
  physical: "Sleep, movement, food and energy — the body the brain runs on.",
  social: "The people around you, and how the pattern lands between you.",
  emotional: "How feelings arrive and settle, and what you do in the middle.",
  work: "Work and study: how tasks arrive, start and finish.",
  spiritual: "What matters to you, and whether the days line up with it.",
  intellectual: "Curiosity, learning and the interest that switches attention on.",
  cultural: "Family, background and community — what is expected, and by whom.",
  environment: "The structure, noise and space around you.",
  finances: "Money and admin: the bills, the impulse buys, the forms.",
};

/** Each of the app's subdomains read as one or two NWIA dimensions. Every subdomain maps. */
export const NWIA_OF: Readonly<Record<Subdomain, readonly NwiaDimension[]>> = {
  activation: ["work", "intellectual"],
  attention: ["intellectual", "work"],
  memory: ["intellectual"],
  switching: ["work"],
  inhibition: ["emotional", "finances"],
  time: ["work"],
  "emotional-regulation": ["emotional"],
  sleep: ["physical"],
  movement: ["physical"],
  appetite: ["physical"],
  energy: ["physical"],
  "medication-experience": ["physical"],
  structure: ["environment"],
  noise: ["environment"],
  workload: ["work"],
  "deadline-design": ["work", "environment"],
  "living-environment": ["environment", "finances"],
  "study-context": ["work", "intellectual"],
  "workplace-context": ["work"],
  partner: ["social"],
  family: ["social", "cultural"],
  manager: ["work", "social"],
  teachers: ["social", "intellectual"],
  peers: ["social"],
  clinicians: ["social"],
};

export function nwiaFor(subdomain: Subdomain): readonly NwiaDimension[] {
  return NWIA_OF[subdomain];
}

/**
 * The balance principle, computed honestly: which dimensions the person's own signals touch,
 * and which nothing has touched yet. Spiritual values has no node on the map — the app's nearest
 * thing to "the days line up with what matters to you" is the goal a person set at the door, so
 * a set goal is what touches it.
 */
export function nwiaBalance(subdomains: readonly Subdomain[], options: { goal?: boolean } = {}): { touched: NwiaDimension[]; untouched: NwiaDimension[] } {
  const touched = new Set<NwiaDimension>();
  for (const s of subdomains) for (const d of NWIA_OF[s]) touched.add(d);
  if (options.goal) touched.add("spiritual");
  return {
    touched: NWIA_DIMENSIONS.filter((d) => touched.has(d)),
    untouched: NWIA_DIMENSIONS.filter((d) => !touched.has(d)),
  };
}
