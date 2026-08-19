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

  // ═══ TRANCHE TWO (O53) — authored, then measured, then retagged to reality ═══════════════
  // Emphasis: paraphrase depth on the thin facets, more `never` discipline (G7 symptoms,
  // O40 negation, O45 collapse), and clause-mixing entries that exercise all three rules at
  // once. Same law as tranche one: nothing below was pinned `reaches` without a real run.

  // ── care:adhd-assessment, said six more ways ─────────────────────────────────────────────
  { text: "time to find out properly whether this is ADHD", reaches: ["care:adhd-assessment"] },
  { text: "an adult assessment, I was never tested as a kid", reaches: ["care:adhd-assessment"] },
  { text: "start the diagnosis process", reaches: ["care:adhd-assessment"] },
  { text: "assess me for ADHD, not just the anxiety", reaches: ["care:adhd-assessment", "care:anxiety"] },
  { text: "how do I get tested for ADHD", reaches: ["care:adhd-assessment"] },
  { text: "a full workup for adult ADHD", reaches: ["care:adhd-assessment"] },

  // ── care:child-adolescent-adhd ───────────────────────────────────────────────────────────
  { text: "my kid's teacher suggested an assessment", reaches: ["care:child-adolescent-adhd", "care:adhd-assessment"] },
  { text: "a paediatric ADHD assessment", reaches: ["care:child-adolescent-adhd"] },
  { text: "my teenager needs this sorted before the HSC", reaches: ["care:child-adolescent-adhd"] },
  { text: "both my children probably have it", reaches: ["care:child-adolescent-adhd"] },

  // ── care:titration ───────────────────────────────────────────────────────────────────────
  { text: "the afternoon crash is brutal, the dose is wrong", reaches: ["care:titration"] },
  { text: "my script needs adjusting", aspires: ["care:titration"] },
  { text: "increase the dose or change the medication, something", reaches: ["care:titration"] },
  { text: "side effects worse than the thing being treated", reaches: ["care:titration"] },
  { text: "the stimulant wears off before school pickup", reaches: ["care:titration"] },
  { text: "I don't want a higher dose", never: ["care:titration"] },

  // ── care:shared-care ─────────────────────────────────────────────────────────────────────
  { text: "my psychiatrist discharged me back to GP care", reaches: ["care:shared-care"] },
  { text: "co-manage with the paediatrician", reaches: ["care:shared-care"] },
  { text: "take over my scripts from the ADHD clinic", reaches: ["care:shared-care"] },
  { text: "the shared care agreement paperwork needs a GP", reaches: ["care:shared-care"] },

  // ── care:depression / care:anxiety ───────────────────────────────────────────────────────
  { text: "the depression is back on top of everything", reaches: ["care:depression"] },
  { text: "low mood and no interest in anything for months", reaches: ["care:depression"] },
  { text: "the antidepressants did nothing for the real problem", reaches: ["care:depression"] },
  { text: "flat and hopeless most days", never: ["care:depression"] },
  { text: "panic in the waiting room every time", reaches: ["care:anxiety"] },
  { text: "health anxiety on top of everything else", reaches: ["care:anxiety"] },
  { text: "treated for anxiety for a decade when it was ADHD all along", reaches: ["care:anxiety"] },
  { text: "wound up and anxious about the assessment itself", reaches: ["care:anxiety", "care:adhd-assessment"] },

  // ── care:trauma-informed / care:complex-mental-health ───────────────────────────────────
  { text: "a trauma informed GP please", reaches: ["care:trauma-informed"] },
  { text: "I need to not be pushed on the details of the history", aspires: ["care:trauma-informed"] },
  { text: "childhood was rough and it comes up in appointments", aspires: ["care:trauma-informed"] },
  { text: "cptsd and probably ADHD underneath it", reaches: ["care:trauma-informed"] },
  { text: "schizoaffective and ADHD together, it is a lot", reaches: ["care:complex-mental-health"] },
  { text: "a psychosis history, so stimulants are complicated", reaches: ["care:complex-mental-health"] },
  { text: "a complicated psych history most GPs won't touch", reaches: ["care:complex-mental-health"] },

  // ── care:autism-adhd / care:substance-history ───────────────────────────────────────────
  { text: "an AuDHD friendly GP", reaches: ["care:autism-adhd"] },
  { text: "autistic burnout and maybe ADHD underneath", reaches: ["care:autism-adhd"] },
  { text: "sensory stuff makes clinics hard for me", reaches: ["care:autism-adhd"] },
  { text: "assessed for autism last year, ADHD is next", reaches: ["care:autism-adhd", "care:adhd-assessment"] },
  { text: "I use alcohol to cope and I know it", reaches: ["care:substance-history"] },
  { text: "clean two years and I need that respected, not relitigated", aspires: ["care:substance-history"] },
  { text: "vaping weed for sleep most nights", aspires: ["care:substance-history"] },
  { text: "a doctor who won't panic about my drinking", reaches: ["care:substance-history"] },

  // ── care:emotional-regulation / care:non-medication ─────────────────────────────────────
  { text: "RSD is the worst part of all of it", reaches: ["care:emotional-regulation"] },
  { text: "rage over tiny things and then the shame after", reaches: ["care:emotional-regulation"] },
  { text: "want to try coaching before tablets", reaches: ["care:non-medication"] },
  { text: "not ready for medication yet, what else is there", aspires: ["care:non-medication"] },
  { text: "alternatives to stimulants please", reaches: ["care:non-medication"] },
  { text: "no interest in coaching, the medication is working", never: ["care:non-medication"] },

  // ── manner, said more ways ───────────────────────────────────────────────────────────────
  { text: "a doctor who does not roll their eyes", aspires: ["manner:attuned"] },
  { text: "listened to properly for once", reaches: ["manner:attuned"] },
  { text: "somebody who won't dismiss me at hello", reaches: ["manner:attuned"] },
  { text: "take my concerns seriously", reaches: ["manner:attuned"] },
  { text: "sick of being brushed off", reaches: ["manner:attuned"] },
  { text: "I shake in waiting rooms, I need calm", reaches: ["manner:steadying"] },
  { text: "someone reassuring, I arrive overwhelmed", reaches: ["manner:steadying"] },
  { text: "a calm voice and no rushing", reaches: ["manner:steadying", "manner:unhurried"] },
  { text: "explain what ADHD actually is, properly", aspires: ["manner:sense_making"] },
  { text: "help me understand my own brain", aspires: ["manner:sense_making"] },
  { text: "the whole picture in plain english", reaches: ["manner:sense_making"] },
  { text: "why do the meds work, I want the mechanism", aspires: ["manner:sense_making"] },
  { text: "build on what I already do well", aspires: ["manner:motivating"] },
  { text: "a plan that works with my chaos, not against it", aspires: ["manner:motivating"] },
  { text: "strengths first, please", reaches: ["manner:motivating"] },
  { text: "a double appointment from the start", aspires: ["pref:longer-appointment"] },
  { text: "time to actually talk", reaches: ["manner:unhurried"] },
  { text: "not shoved out the door in twelve minutes", reaches: ["manner:unhurried"] },
  { text: "no shame about how I have coped", aspires: ["manner:non_judgmental"] },
  { text: "somewhere safe to say the ugly bits out loud", reaches: ["manner:non_judgmental"] },
  { text: "explain my options and let me choose", reaches: ["manner:collaborative"] },
  { text: "decide together or not at all", reaches: ["manner:collaborative"] },
  { text: "talk the choices through with me", reaches: ["manner:collaborative"] },
  { text: "a GP who gets South Asian families", reaches: ["manner:culturally_attuned"] },
  { text: "my community views this stuff badly and it matters", reaches: ["manner:culturally_attuned"] },
  { text: "my mother comes in to translate", reaches: ["manner:culturally_attuned"] },
  { text: "faith matters in my care", reaches: ["manner:culturally_attuned"] },
  { text: "baseline bloods first and a written plan", reaches: ["manner:structured"] },
  { text: "monitoring on a schedule, not when things break", reaches: ["manner:structured"] },
  { text: "methodical follow-up, please", reaches: ["manner:structured"] },

  // ── preferences, said more ways ──────────────────────────────────────────────────────────
  { text: "a lady doctor if at all possible", aspires: ["pref:woman-gp"] },
  { text: "video appointments only, I am rural", reaches: ["pref:telehealth-first"] },
  { text: "keep it bulk billed please", reaches: ["pref:bulk-billing"] },
  { text: "a woman doctor who bulk bills", reaches: ["pref:woman-gp", "pref:bulk-billing"] },
  { text: "phone first, clinic later if we must", reaches: ["pref:telehealth-first"] },

  // ── G7: more symptom descriptions, pinned as intentional non-reaches ────────────────────
  { text: "I lose my keys every single day", never: ["care:adhd-assessment"] },
  { text: "my head is a browser with forty tabs open", never: ["care:adhd-assessment"] },
  { text: "I zone out mid conversation constantly", never: ["care:adhd-assessment"] },
  { text: "always late no matter what I try", never: ["care:adhd-assessment"] },

  // ── discipline mixes: negation, collapse and clause scope in one breath ─────────────────
  { text: "I don't want medication changes, just someone who listens", never: ["care:titration"], reaches: ["manner:attuned"] },
  { text: "not looking for an assessment. my dose needs looking at", never: ["care:adhd-assessment"], reaches: ["care:titration"] },
  { text: "next door to the pharmacy there is a clinic", never: ["manner:unhurried", "manner:culturally_attuned"] },
  { text: "the sign on the practice door says closed", never: ["manner:sense_making"] },
  { text: "she was quick to judge and rushed me out the door", reaches: ["manner:non_judgmental", "manner:unhurried"] },

  // ═══ TRANCHE THREE (O64, 2026-08-19): the thin floors fed first. ═══════════════════════
  // Authored against the floors as they stood (longer-appointment at ONE, woman-gp 3,
  // trauma-informed/motivating/bulk-billing/telehealth-first 4), then MEASURED and tagged
  // from measurement: `reaches` is what the reader actually heard, `aspires` is the intended
  // reach it could not hear — the lexicon's to-do list, grown deliberately. Growth only: no
  // cue was edited in this tranche, so every tag below is the reader as it already was.

  // ── pref:longer-appointment — one reaching phrasing existed; these are the misses ───────
  { text: "please book me a long appointment for the first visit", aspires: ["pref:longer-appointment"] },
  { text: "a proper long consult, not a squeeze-in", aspires: ["pref:longer-appointment"] },
  { text: "can we make the first one a double session", aspires: ["pref:longer-appointment"] },
  // Heard as unhurried manner but not as the booking preference — both truths recorded.
  { text: "I need more than fifteen minutes to get through this", reaches: ["manner:unhurried"], aspires: ["pref:longer-appointment"] },
  { text: "an extended appointment so nothing gets cut off", reaches: ["manner:unhurried"], aspires: ["pref:longer-appointment"] },

  // ── pref:woman-gp ────────────────────────────────────────────────────────────────────────
  { text: "a female GP is important to me", reaches: ["pref:woman-gp"] },
  { text: "I would feel safer with a woman", aspires: ["pref:woman-gp"] },
  { text: "women doctors only please, after what happened", aspires: ["pref:woman-gp"] },

  // ── pref:telehealth-first / pref:bulk-billing ────────────────────────────────────────────
  { text: "I cannot get into a clinic, everything has to be online", reaches: ["pref:telehealth-first"] },
  { text: "a video call for the first appointment please", reaches: ["pref:telehealth-first"] },
  { text: "phone appointments suit my shift work better", aspires: ["pref:telehealth-first"] },
  { text: "it has to be bulk billed, I am on a pension", reaches: ["pref:bulk-billing"] },
  { text: "money is tight so bulk billing matters", reaches: ["pref:bulk-billing"] },
  { text: "no out of pocket costs please", aspires: ["pref:bulk-billing"] },

  // ── care:trauma-informed ─────────────────────────────────────────────────────────────────
  { text: "I need someone trauma informed, my last doctor was not", reaches: ["care:trauma-informed"] },
  { text: "complex PTSD alongside the attention stuff", reaches: ["care:trauma-informed", "care:complex-mental-health", "care:adhd-assessment"] },
  { text: "there is family violence in my past and it affects appointments", aspires: ["care:trauma-informed"] },
  { text: "an abusive relationship left me jumpy in clinics", aspires: ["care:trauma-informed"] },

  // ── manner:motivating ────────────────────────────────────────────────────────────────────
  { text: "I want to work with my strengths, not just hear what is broken", reaches: ["manner:motivating"] },
  { text: "someone encouraging rather than critical", reaches: ["manner:motivating"] },
  { text: "a doctor who is hopeful about what I can do", reaches: ["manner:motivating"] },
  { text: "neurodiversity affirming care or nothing", reaches: ["manner:motivating"] },

  // ── care:substance-history ───────────────────────────────────────────────────────────────
  { text: "I used to drink heavily and I am upfront about it", reaches: ["care:substance-history"] },
  { text: "there is a substance history they will see in my file", reaches: ["care:substance-history"] },
  { text: "I am in recovery and need that respected", aspires: ["care:substance-history"] },
  { text: "methamphetamine years ago, clean since", aspires: ["care:substance-history"] },

  // ── care:complex-mental-health ───────────────────────────────────────────────────────────
  { text: "bipolar and maybe ADHD, it is complicated", reaches: ["care:complex-mental-health", "care:adhd-assessment"] },
  { text: "schizophrenia is managed, the focus trouble is not", reaches: ["care:complex-mental-health"] },
  // BPD by name is silent to the reader today — a gap worth closing carefully, not by reflex.
  { text: "borderline personality disorder plus the attention problems", reaches: ["care:adhd-assessment"], aspires: ["care:complex-mental-health"] },
  { text: "I hear voices sometimes and I still want this looked at", aspires: ["care:complex-mental-health"] },

  // ── care:non-medication / manner:collaborative ───────────────────────────────────────────
  { text: "coaching and skills, not another prescription", reaches: ["care:non-medication"] },
  { text: "what can we do without medication", reaches: ["care:non-medication"] },
  { text: "I want strategies first, tablets later if ever", aspires: ["care:non-medication"] },
  { text: "psychological approaches before anything else", aspires: ["care:non-medication"] },
  { text: "treatment choices talked through with me, never over my head", reaches: ["manner:collaborative"] },
  { text: "I want a say in my own treatment plan", reaches: ["manner:collaborative"] },
  { text: "someone who works alongside me as a partner", aspires: ["manner:collaborative"] },

  // ── care:depression / manner:sense_making ────────────────────────────────────────────────
  { text: "the low moods are back and worse than the distraction", reaches: ["care:depression"] },
  { text: "depression on top of everything else", reaches: ["care:depression"] },
  { text: "help me join the dots on why my life looks like this", reaches: ["manner:sense_making"] },
  { text: "I want it to finally make sense", reaches: ["manner:sense_making"] },
  { text: "someone who can explain what is actually going on with me", reaches: ["manner:sense_making", "manner:collaborative"] },

  // ── care:emotional-regulation / manner:steadying ─────────────────────────────────────────
  { text: "big feelings I cannot switch off", reaches: ["care:emotional-regulation"] },
  { text: "I get overwhelmed in appointments and need someone calm", reaches: ["care:emotional-regulation", "manner:steadying"] },
  { text: "a gentle doctor, I am easily rattled", reaches: ["manner:steadying"] },
  // This facet's territory IS the description (see care-archetypes.ts), so unheard
  // descriptions are candidate cues here — aspires, not never, unlike depression below.
  { text: "rejection hits me like a truck", aspires: ["care:emotional-regulation"] },
  { text: "my temper goes from zero to a hundred in seconds", aspires: ["care:emotional-regulation"] },

  // ── care:shared-care / care:anxiety / care:autism-adhd / care:child-adolescent-adhd ─────
  { text: "my psychiatrist wants a GP to share the care with", reaches: ["care:shared-care"] },
  { text: "shared care with the psychiatrist who diagnosed me", reaches: ["care:shared-care", "care:adhd-assessment"] },
  { text: "panic attacks in supermarkets, it is getting worse", reaches: ["care:anxiety"] },
  { text: "I am autistic as well, the two tangle together", reaches: ["care:autism-adhd"] },
  { text: "AuDHD, both sides need understanding", reaches: ["care:autism-adhd"] },
  { text: "my teenager is falling apart at school", reaches: ["care:child-adolescent-adhd"] },
  { text: "our ten year old needs an assessment", reaches: ["care:adhd-assessment"], aspires: ["care:child-adolescent-adhd"] },

  // ── manner breadth: culturally_attuned, attuned, non_judgmental, unhurried, structured ──
  { text: "someone who understands where my family comes from", reaches: ["manner:culturally_attuned"] },
  { text: "a doctor who gets cultural context, mine is complicated", reaches: ["manner:culturally_attuned"] },
  { text: "I want to be believed the first time I say it", aspires: ["manner:attuned"] },
  { text: "somewhere I will not be judged for how long I left this", reaches: ["manner:non_judgmental"] },
  { text: "no lectures, I know the history looks bad", reaches: ["manner:non_judgmental"] },
  { text: "I do not want to be rushed out the door again", reaches: ["manner:unhurried"] },
  { text: "a methodical workup done properly", reaches: ["manner:structured"] },

  // ── anchors: titration and assessment phrasings not yet in the set ──────────────────────
  { text: "the dose needs adjusting, it stopped holding in the afternoons", reaches: ["care:titration"] },
  { text: "I think it has been ADHD all along, test me properly", reaches: ["care:adhd-assessment", "manner:structured"] },

  // ── G7: state descriptions with no want, pinned as intentional non-reaches ──────────────
  { text: "flat for months, everything is heavy", never: ["care:depression"] },
  { text: "the worry never stops, even when things are fine", never: ["care:anxiety"] },
  { text: "my brain jumps channels mid-sentence", never: ["care:adhd-assessment"] },
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
  // Measured 2026-08-19 (O47); raised by O49 (first sweep), O50 (inflection table), O53
  // (tranche two: ~200 entries) and O64 (tranche three: thin facets fed first, 262 entries,
  // floors re-measured off the grown set). The open aspirations are the standing lexicon
  // to-do list; the three attuned hesitations from O49 remain the founder's call.
  // pref:longer-appointment is STILL 1 after a tranche aimed straight at it — four new
  // phrasings ("long appointment", "long consult", "double session", "more than fifteen
  // minutes") all land as aspirations, which is the loudest cue-gap this file currently
  // names for the O22 review.
  "care:adhd-assessment": 22,
  "care:anxiety": 9,
  "care:autism-adhd": 9,
  "care:child-adolescent-adhd": 9,
  "care:complex-mental-health": 8,
  "care:depression": 8,
  "care:emotional-regulation": 8,
  "care:non-medication": 7,
  "care:shared-care": 9,
  "care:substance-history": 7,
  "care:titration": 11,
  "care:trauma-informed": 6,
  "manner:attuned": 8,
  "manner:collaborative": 8,
  "manner:culturally_attuned": 9,
  "manner:motivating": 8,
  "manner:non_judgmental": 10,
  "manner:sense_making": 9,
  "manner:steadying": 9,
  "manner:structured": 9,
  "manner:unhurried": 11,
  "pref:bulk-billing": 6,
  "pref:longer-appointment": 1,
  "pref:telehealth-first": 6,
  "pref:woman-gp": 4,
};
