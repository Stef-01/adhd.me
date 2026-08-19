// W231 (O47): the standing reach corpus — first-person requests as data, with the gate the
// year plan asked for (Q1 item 1: "reach percentage per facet tracked in CI; any drop fails
// the build").
//
// WHAT AN ENTRY IS. One request, written the way a person actually asks, with its expectations
// pinned in three registers:
//
//   `reaches` — facets this text MUST reach. A hard pin: any miss fails the build by name.
//   `never`   — facets this text MUST NOT reach. The false-positive discipline O25 and O45
//               established; the corpus tests over-reach as hard as it tests misses.
//   `aspires` — facets the request is genuinely ABOUT but the lexicon cannot hear yet. This is
//               the measurable gap list: per-facet reach over (reaches ∪ aspires) is asserted
//               against `REACH_FLOORS` below, so hearing can only improve or fail loudly.
//
// THE CORPUS IS NOT WRITTEN FROM THE LEXICON. Half of each facet's entries avoid its own
// vocabulary on purpose (the reach.test.ts rule): a corpus copied off the cue list measures
// only that somebody can copy a list. Entries are synthetic search phrasings — no clinical
// content, no patient data, no founder gate touched — and paraphrase variants are the point:
// the same ask said three ways is three tests of the stopword/stemming/collapse machinery.
//
// FLOORS ARE MEASURED, NEVER GUESSED. Every number in `REACH_FLOORS` was read off a real run
// at the commit that set it. Raising a floor is a deliberate act in a unit that widened the
// lexicon; LOWERING one to make a failing build pass is the move the ratchet exists to refuse
// (reach.test.ts's own law, restated here because this file will outlive its author's session).
//
// GROWTH. ~500 entries is the Q1 target; this file starts the standing tranche. Founder
// entries land in the same shape. When an `aspires` facet starts reaching, promote it to
// `reaches` and raise the facet's floor in the same commit — that is the loop the plan calls
// the golden-file suite.

export type CorpusEntry = {
  /** The request, first person, as typed or spoken into the finder. */
  text: string;
  /** Facet keys this text must reach. */
  reaches?: readonly string[];
  /** Facet keys this text must never reach. */
  never?: readonly string[];
  /** Facet keys this text is about but the lexicon cannot hear yet — the gap list. */
  aspires?: readonly string[];
};

export const REACH_CORPUS: readonly CorpusEntry[] = [
  // ── care:adhd-assessment ─────────────────────────────────────────────────────────────────
  { text: "I need an ADHD assessment", reaches: ["care:adhd-assessment"] },
  { text: "I want to get assessed properly, start to finish", reaches: ["care:adhd-assessment"] },
  { text: "I think I have ADHD and I want to find out for real", reaches: ["care:adhd-assessment"] },
  { text: "can a GP actually diagnose me or do I need a psychiatrist", reaches: ["care:adhd-assessment"] },
  { text: "I have been putting off getting checked for years", reaches: ["care:adhd-assessment"] },

  // ── care:child-adolescent-adhd ───────────────────────────────────────────────────────────
  { text: "this is for my teenager", reaches: ["care:child-adolescent-adhd"] },
  { text: "my daughter is twelve and school keeps calling", reaches: ["care:child-adolescent-adhd"] },
  { text: "looking for someone who sees kids", reaches: ["care:child-adolescent-adhd"] },
  { text: "my son cannot sit through a class", reaches: ["care:child-adolescent-adhd"] },

  // ── care:titration ───────────────────────────────────────────────────────────────────────
  { text: "my dose keeps wearing off by early afternoon", reaches: ["care:titration"] },
  { text: "get the dose right", reaches: ["care:titration"] },
  { text: "the medication works but the side effects are rough", reaches: ["care:titration"] },
  { text: "I need someone to adjust the dose without a three month wait", reaches: ["care:titration"] },
  { text: "I don't want my dose changed", never: ["care:titration"] },

  // ── care:shared-care ─────────────────────────────────────────────────────────────────────
  { text: "shared care with my psychiatrist", reaches: ["care:shared-care"] },
  { text: "my psychiatrist wants my GP to take over the scripts", reaches: ["care:shared-care"] },
  { text: "a GP who will work with my paediatrician", reaches: ["care:shared-care"] },

  // ── care:depression ──────────────────────────────────────────────────────────────────────
  { text: "low mood most days", reaches: ["care:depression"] },
  { text: "depression on top of the ADHD", reaches: ["care:depression"] },
  { text: "everything has felt flat for months", never: ["care:depression"] },

  // ── care:anxiety ─────────────────────────────────────────────────────────────────────────
  { text: "anxiety is the bigger problem some weeks", reaches: ["care:anxiety"] },
  { text: "panic attacks before every appointment", reaches: ["care:anxiety"] },
  { text: "I was treated for anxiety for years before anyone mentioned ADHD", reaches: ["care:anxiety"] },

  // ── care:trauma-informed ─────────────────────────────────────────────────────────────────
  { text: "there is trauma in the history and it is hard to talk about", reaches: ["care:trauma-informed"] },
  { text: "PTSD and probably ADHD, in that order", reaches: ["care:trauma-informed"] },

  // ── care:complex-mental-health ───────────────────────────────────────────────────────────
  { text: "bipolar as well, so it is complicated", reaches: ["care:complex-mental-health"] },
  { text: "I have a complex mental health history and most GPs flinch", reaches: ["care:complex-mental-health"] },

  // ── care:autism-adhd ─────────────────────────────────────────────────────────────────────
  { text: "I think I am AuDHD", reaches: ["care:autism-adhd"] },
  { text: "autistic and probably ADHD too", reaches: ["care:autism-adhd"] },
  { text: "neurodivergent, the whole picture, not just attention", reaches: ["care:autism-adhd"] },

  // ── care:substance-history ───────────────────────────────────────────────────────────────
  { text: "somewhere I can be honest about how much I drink", reaches: ["care:substance-history"] },
  { text: "I smoke weed most nights and I need to be able to say that", reaches: ["care:substance-history"] },
  { text: "honest about drinking", reaches: ["care:substance-history"] },

  // ── care:emotional-regulation ────────────────────────────────────────────────────────────
  { text: "rejection sensitivity is wrecking my relationships", reaches: ["care:emotional-regulation"] },
  { text: "my emotions take over before I can think", reaches: ["care:emotional-regulation"] },
  { text: "emotional dysregulation, the real kind", reaches: ["care:emotional-regulation"] },
  { text: "big emotions over small things", reaches: ["care:emotional-regulation"] },

  // ── care:non-medication ──────────────────────────────────────────────────────────────────
  { text: "not just medication", reaches: ["care:non-medication"] },
  { text: "I want options that are not a script", reaches: ["care:non-medication"] },
  { text: "coaching and habits first, tablets later if ever", reaches: ["care:non-medication"] },

  // ── manner:attuned ───────────────────────────────────────────────────────────────────────
  { text: "I want someone who won't make me feel like I'm making it up", reaches: ["manner:non_judgmental"] },
  { text: "every doctor so far has brushed me off", reaches: ["manner:attuned"] },
  { text: "I need to actually feel heard for once", reaches: ["manner:attuned"] },
  { text: "taken seriously, that is the whole ask", reaches: ["manner:attuned"] },

  // ── manner:steadying ─────────────────────────────────────────────────────────────────────
  { text: "I'm always on edge in waiting rooms", reaches: ["manner:steadying"] },
  { text: "somebody calm, because I arrive overwhelmed", reaches: ["manner:steadying"] },
  { text: "gentle and reassuring, not brisk", reaches: ["manner:steadying"] },

  // ── manner:sense_making ──────────────────────────────────────────────────────────────────
  { text: "I want to actually understand what's happening to me", reaches: ["manner:sense_making"] },
  { text: "someone who explains things in plain english", reaches: ["manner:sense_making"] },
  { text: "help me join the dots on thirty years of this", reaches: ["manner:sense_making"] },

  // ── manner:motivating ────────────────────────────────────────────────────────────────────
  { text: "a plan I can actually act on, built around what already works", reaches: ["manner:motivating"] },
  { text: "someone strengths focused, not deficit focused", reaches: ["manner:motivating"] },
  { text: "a doctor who is neurodiversity affirming", reaches: ["manner:motivating"] },

  // ── manner:unhurried ─────────────────────────────────────────────────────────────────────
  { text: "I can never get a word in before the appointment is over", reaches: ["manner:unhurried"] },
  { text: "she rushed me out the door in ten minutes", reaches: ["manner:unhurried"] },
  { text: "a longer first appointment so I can actually explain", reaches: ["pref:longer-appointment"] },
  { text: "my GP is next door to the chemist", never: ["manner:unhurried"] },

  // ── manner:non_judgmental ────────────────────────────────────────────────────────────────
  { text: "no lectures, I have heard them all", reaches: ["manner:non_judgmental"] },
  { text: "somewhere I will not be judged for the coping I have done", reaches: ["manner:non_judgmental"] },
  // O50 (morphology): each of these previously missed on an inflection the suffix rules cannot
  // bridge — "believes" stranded at [believ], bare "judge" unable to meet the cue "judged".
  // The INFLECTIONS table in read.ts is what makes them hearable; these pins hold it there.
  { text: "nobody ever believes me", reaches: ["manner:non_judgmental"] },
  { text: "quick to judge, every one of them", reaches: ["manner:non_judgmental"] },
  { text: "I need to be able to tell the truth without the face", reaches: ["manner:non_judgmental"] },

  // ── manner:collaborative ─────────────────────────────────────────────────────────────────
  { text: "decisions made with me, not for me", reaches: ["manner:collaborative"] },
  { text: "I want a say in the plan", reaches: ["manner:collaborative"] },

  // ── manner:culturally_attuned ────────────────────────────────────────────────────────────
  { text: "my mum thinks this is nonsense and she'll be in the room", reaches: ["manner:culturally_attuned"] },
  { text: "family will be involved whether anyone likes it or not", reaches: ["manner:culturally_attuned"] },
  { text: "someone who respects my faith", reaches: ["manner:culturally_attuned"] },
  { text: "my rooms are above the pharmacy", never: ["manner:culturally_attuned"] },

  // ── manner:structured ────────────────────────────────────────────────────────────────────
  { text: "a thorough structured assessment with the heart checked first", reaches: ["manner:structured", "care:adhd-assessment"] },
  { text: "I need to know it's not going to hurt my heart before I start anything", reaches: ["manner:structured"] },
  { text: "documented baseline and a proper follow-up plan", reaches: ["manner:structured"] },
  { text: "someone methodical who will not just leave me to it", reaches: ["manner:structured"] },
  { text: "the school is on the edge of town", never: ["manner:steadying"] },

  // ── preferences ──────────────────────────────────────────────────────────────────────────
  { text: "I would prefer a woman GP", reaches: ["pref:woman-gp"] },
  { text: "a female doctor please", reaches: ["pref:woman-gp"] },
  { text: "can the first appointment be over the phone", reaches: ["pref:telehealth-first"] },
  { text: "telehealth to start, I am rural", reaches: ["pref:telehealth-first"] },
  { text: "bulk billed if at all possible", reaches: ["pref:bulk-billing"] },
  { text: "I cannot afford gap fees", reaches: ["pref:bulk-billing"] },
  { text: "a longer appointment booked from the start", reaches: ["manner:unhurried"] },
  { text: "I don't need it bulk billed", never: ["pref:bulk-billing"] },

  // ── languages ────────────────────────────────────────────────────────────────────────────
  // Language matching is deliberately absent here: it runs through `languageNeeds` against the
  // ROSTER'S declared languages, not the lexicon, so a corpus keyed to `readNeeds` cannot see
  // it and pinning it here would assert the wrong layer. The steadying half still belongs.
  { text: "a calm GP who speaks Hindi", reaches: ["manner:steadying"] },

  // ── negation discipline (O40) ────────────────────────────────────────────────────────────
  { text: "I'm not looking for a diagnosis, just someone to talk to", never: ["care:adhd-assessment"] },
  { text: "no interest in titration at all", never: ["care:titration"] },
  { text: "my GP won't do titration and I need someone who will", reaches: ["care:titration"] },
  { text: "I've never had an assessment and I want one", reaches: ["care:adhd-assessment"] },
  { text: "I don't want to feel rushed", reaches: ["manner:unhurried"] },

  // ── collapse discipline (O45) ────────────────────────────────────────────────────────────
  { text: "the practice name is on the sign", never: ["manner:sense_making"] },
  { text: "the clinic was in plain sight of the station", never: ["manner:sense_making"] },
  { text: "the appointment took my whole afternoon", never: ["manner:attuned"] },

  // ── G7 BOUNDARY: symptom descriptions are INTENTIONAL non-reaches ───────────────────────
  // needs.ts's law beside the assessment cues: the finder reads what somebody ASKS FOR, never
  // what it would have to deduce from an impairment description. These entries keep that
  // boundary as data — a cue addition that makes any of them reach fails the build by name.

  // ── oblique phrasings: the real test of hearing (mostly aspirational on entry) ───────────
  { text: "I've been on antidepressants for six years and nothing shifted", reaches: ["care:depression"] },
  { text: "work keeps writing me up for the same thing", never: ["care:adhd-assessment"] },
  { text: "my brain has never let me finish anything", never: ["care:adhd-assessment"] },
  { text: "I am so tired of masking all day", never: ["care:autism-adhd"] },
  { text: "the house is chaos and so is my head", never: ["care:adhd-assessment"] },
  { text: "I cry in the car after every appointment", aspires: ["manner:attuned"] },
  { text: "I need someone who has seen women like me before", aspires: ["manner:attuned"] },
  { text: "diagnosed at forty and still getting my head around it", reaches: ["manner:sense_making"] },
  { text: "I want the science, not the pep talk", reaches: ["manner:sense_making"] },
  { text: "appointments where I do not have to perform being fine", aspires: ["manner:attuned"] },
];

/** Per-facet reach over the corpus: entries that name the facet in `reaches` or `aspires`. */
export function corpusReachByFacet(
  read: (text: string) => readonly string[],
): Array<{ facet: string; asked: number; heard: number }> {
  const tally = new Map<string, { asked: number; heard: number }>();
  for (const entry of REACH_CORPUS) {
    const wanted = [...(entry.reaches ?? []), ...(entry.aspires ?? [])];
    if (wanted.length === 0) continue;
    const got = new Set(read(entry.text));
    for (const facet of wanted) {
      const row = tally.get(facet) ?? { asked: 0, heard: 0 };
      row.asked++;
      if (got.has(facet)) row.heard++;
      tally.set(facet, row);
    }
  }
  return [...tally.entries()]
    .map(([facet, row]) => ({ facet, ...row }))
    .sort((a, b) => a.facet.localeCompare(b.facet));
}

/**
 * The measured floors. Written by reading a real run, per the header — an entry here is
 * "at least this many of this facet's corpus asks are heard", as a count rather than a
 * percentage so a one-entry facet cannot pass on rounding.
 */
export const REACH_FLOORS: Readonly<Record<string, number>> = {
  // Measured 2026-08-19 (O47); RAISED 2026-08-19 (O49) after the first aspiration sweep
  // promoted sixteen entries the widened lexicon now hears, and again (O50) when the
  // inflection table bridged the believe/judge wart families. Three attuned aspirations stay
  // open on purpose — see the O49 ledger row for the hesitations.
  "care:adhd-assessment": 7,
  "care:anxiety": 3,
  "care:autism-adhd": 3,
  "care:child-adolescent-adhd": 4,
  "care:complex-mental-health": 2,
  "care:depression": 3,
  "care:emotional-regulation": 4,
  "care:non-medication": 3,
  "care:shared-care": 3,
  "care:substance-history": 3,
  "care:titration": 5,
  "care:trauma-informed": 2,
  "manner:attuned": 3,
  "manner:collaborative": 2,
  "manner:culturally_attuned": 3,
  "manner:motivating": 3,
  "manner:non_judgmental": 6,
  "manner:sense_making": 5,
  "manner:steadying": 4,
  "manner:structured": 4,
  "manner:unhurried": 4,
  "pref:bulk-billing": 2,
  "pref:longer-appointment": 1,
  "pref:telehealth-first": 2,
  "pref:woman-gp": 2,
};
