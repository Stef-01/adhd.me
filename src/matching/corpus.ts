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
  // Promoted by O65: heard since the cue set grew past its single three-token phrase.
  { text: "a double appointment from the start", reaches: ["pref:longer-appointment"] },
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

  // ── pref:longer-appointment — O64 authored these as misses against a one-cue facet;
  //    O65 grew the cue set and the promotion gate demanded these retags in the same commit.
  { text: "please book me a long appointment for the first visit", reaches: ["pref:longer-appointment"] },
  { text: "a proper long consult, not a squeeze-in", reaches: ["pref:longer-appointment"] },
  { text: "can we make the first one a double session", reaches: ["pref:longer-appointment"] },
  // Still only unhurried MANNER: "more than fifteen minutes" is deliberately uncued — it
  // strips to [fifteen, minute], which is also distance talk, and that precision is not
  // worth this recall. The standing aspiration is the record of that decision.
  { text: "I need more than fifteen minutes to get through this", reaches: ["manner:unhurried"], aspires: ["pref:longer-appointment"] },
  { text: "an extended appointment so nothing gets cut off", reaches: ["manner:unhurried", "pref:longer-appointment"] },

  // ── O65 leak pins: long-words-without-the-ask must stay silent to this facet ────────────
  { text: "the waiting list at that clinic is long", never: ["pref:longer-appointment"] },
  { text: "it took a long time to get this referral sorted", never: ["pref:longer-appointment"] },
  { text: "I doubled back to the pharmacy on the way home", never: ["pref:longer-appointment"] },

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

  // ═══ TRANCHE FOUR (O68, 2026-08-19): compound requests and the discipline registers. ═════
  // Real sentences carry two and three asks at once, and until now the corpus was mostly
  // single-ask — so this tranche's first job is compounds, measured whole. Tagged from
  // measurement as always: reaches = heard, aspires = the to-do list, never = the boundary.

  // ── compounds: two and three asks in one breath ─────────────────────────────────────────
  { text: "a woman GP who bulk bills and won't rush me", reaches: ["pref:woman-gp", "pref:bulk-billing", "manner:unhurried"] },
  { text: "a female doctor for an ADHD assessment, by video if possible", reaches: ["care:adhd-assessment", "pref:woman-gp"], aspires: ["pref:telehealth-first"] },
  { text: "bulk billed titration review with someone patient", reaches: ["care:titration", "pref:bulk-billing"], aspires: ["manner:unhurried"] },
  { text: "a calm woman doctor who understands anxiety", reaches: ["care:anxiety", "manner:steadying", "pref:woman-gp"] },
  { text: "telehealth assessment and I speak Hindi at home", reaches: ["care:adhd-assessment", "pref:telehealth-first"] },
  { text: "a gentle GP who takes trauma seriously and bulk bills", reaches: ["manner:attuned", "manner:steadying", "pref:bulk-billing"], aspires: ["care:trauma-informed"] },
  { text: "shared care with my psychiatrist, and don't rush the appointments", reaches: ["care:shared-care", "manner:unhurried"] },
  { text: "an unhurried structured assessment with the heart checks done first", reaches: ["care:adhd-assessment", "manner:structured", "manner:unhurried"] },
  { text: "my teenager needs an assessment and we want a woman doctor", reaches: ["care:adhd-assessment", "care:child-adolescent-adhd", "pref:woman-gp"] },
  { text: "a non-judgmental GP for my drinking history and my ADHD", reaches: ["care:adhd-assessment", "care:substance-history", "manner:non_judgmental"] },
  { text: "someone strengths focused who also handles the depression side", reaches: ["care:depression", "manner:motivating"] },
  { text: "video appointments and a doctor who explains what is going on", reaches: ["pref:telehealth-first", "manner:sense_making", "manner:collaborative"] },
  { text: "an autistic-friendly GP who won't lecture me about my past", reaches: ["care:autism-adhd"], aspires: ["manner:non_judgmental"] },
  { text: "a woman GP in the eastern suburbs who does titration", reaches: ["care:titration", "pref:woman-gp"] },
  { text: "phone first, bulk billed, and please actually listen", reaches: ["pref:telehealth-first", "pref:bulk-billing"], aspires: ["manner:attuned"] },

  // ── paraphrase depth on the lowest floors ────────────────────────────────────────────────
  { text: "gender matters to me, a woman doctor", reaches: ["pref:woman-gp"] },
  { text: "a lady GP would make this easier", aspires: ["pref:woman-gp"] },
  { text: "someone who is not a man, please", aspires: ["pref:woman-gp"] },
  { text: "trauma informed care is non-negotiable for me", reaches: ["care:trauma-informed"] },
  { text: "I need the trauma handled gently or not at all", reaches: ["care:trauma-informed"] },
  { text: "on a healthcare card, so bulk billing please", reaches: ["pref:bulk-billing"] },
  { text: "I cannot pay gap fees on my wage", aspires: ["pref:bulk-billing"] },
  { text: "everything online please, I am housebound", reaches: ["pref:telehealth-first"] },
  { text: "remote appointments only, I live three hours out", reaches: ["pref:telehealth-first"] },

  // ── mid facets: substance, non-medication, shared-care, complex ─────────────────────────
  { text: "my drinking is part of this story", reaches: ["care:substance-history"] },
  { text: "sober two years and proud of it, keep that in mind", aspires: ["care:substance-history"] },
  { text: "skills and strategies before any script", aspires: ["care:non-medication"] },
  { text: "I would rather not take medication if there is another way", aspires: ["care:non-medication"] },
  { text: "my psychiatrist suggested GP shared care", reaches: ["care:shared-care"] },
  { text: "a GP willing to do the shared care paperwork", reaches: ["care:shared-care"] },
  { text: "schizoaffective and finally ready to look at the attention side", reaches: ["care:adhd-assessment", "care:complex-mental-health"] },
  { text: "complex needs, more than one diagnosis already", reaches: ["care:adhd-assessment", "care:complex-mental-health"] },

  // ── G7: more symptom sentences with no want, pinned silent ──────────────────────────────
  { text: "I start ten things and finish none", never: ["care:adhd-assessment"] },
  { text: "time just disappears on me", never: ["care:adhd-assessment"] },
  { text: "everyone says I talk over them", never: ["care:adhd-assessment"] },
  { text: "my desk is buried and so am I", never: ["care:adhd-assessment"] },

  // ── logistics with shared vocabulary, pinned silent where they could leak ───────────────
  { text: "the practice is next to the train station", never: ["manner:unhurried"] },
  { text: "I park behind the chemist on Tuesdays", never: ["manner:unhurried"] },
  { text: "my last GP retired in March", never: ["care:adhd-assessment"] },
  { text: "the referral letter is dated last week", never: ["care:shared-care"] },

  // ── negation and collapse discipline, walked at the O40/O53 seams ───────────────────────
  { text: "not after therapy, I want the assessment done properly", reaches: ["manner:structured"], aspires: ["care:adhd-assessment"] },
  { text: "no more waiting rooms, video only from here", aspires: ["pref:telehealth-first"] },
  { text: "I don't want a woman GP, whoever is soonest", never: ["pref:woman-gp"] },
  // Promoted by O81: this sat in the aspiration list since O68 looking like a lexicon gap,
  // and the O78 audit showed it never was one — O40's everything-in-lead scope was
  // swallowing the second ask. Consume-once spends the trigger on "the dose" and the
  // diagnosis question now reaches.
  { text: "no interest in the dose, I want the diagnosis question answered", never: ["care:titration"], reaches: ["care:adhd-assessment"] },
  { text: "I never feel heard and I want that to change", reaches: ["manner:attuned"] },
  { text: "don't need it bulk billed but do need evenings", never: ["pref:bulk-billing"] },
  /**
   * O68 pinned this as the corpus's first KNOWN FALSE POSITIVE (bare "not" before a cue did
   * not negate); O72 built the rule and retagged it in the same commit, exactly as the pin
   * demanded. Building the rule surfaced its own boundary, kept as the next two pins: the
   * additive "not just" idiom must NOT be read as refusal.
   */
  { text: "not bulk billing, I am happy to pay for time", never: ["pref:bulk-billing"] },
  { text: "not telehealth for this, it has to be face to face", never: ["pref:telehealth-first"] },

  // ═══ TRANCHE FIVE (O75, 2026-08-20): the registers real traffic arrives in. ══════════════
  // Question forms ("is there a doctor who…"), on-behalf bookings (a partner or parent typing
  // for the person), life-stage context, and polite indirect asks — none of which the corpus
  // held before, though search boxes are full of them. Tagged from a measured run as always:
  // reaches = heard today, aspires = the to-do list, never = the boundary. The tranche's
  // harvest of KNOWN FALSE POSITIVES is pinned as today's truth, O68's pattern: each carries
  // the retag its fix unit must make.

  // ── question forms: the ask arrives as a question about the roster ──────────────────────
  { text: "is there a doctor who bulk bills new patients", reaches: ["pref:bulk-billing"] },
  { text: "do any of your GPs do dose adjustments", reaches: ["care:titration"] },
  { text: "can the assessment be done over video", reaches: ["care:adhd-assessment"], aspires: ["pref:telehealth-first"] },
  { text: "is a woman doctor available", reaches: ["pref:woman-gp"] },
  { text: "does anyone there see children", reaches: ["care:child-adolescent-adhd"] },
  { text: "who handles shared care agreements", reaches: ["care:shared-care"] },
  { text: "can I ask for a longer appointment when I book", reaches: ["manner:unhurried"], aspires: ["pref:longer-appointment"] },
  { text: "do you have anyone who understands autism as well", reaches: ["care:autism-adhd"] },

  // ── on-behalf: somebody else is typing ───────────────────────────────────────────────────
  { text: "booking for my husband, he keeps putting the assessment off", reaches: ["care:adhd-assessment"] },
  { text: "my wife would prefer a woman GP for this", reaches: ["pref:woman-gp"] },
  { text: "my partner needs the dose looked at and cannot get in anywhere", reaches: ["care:titration"] },
  /**
   * O75 pinned this as a KNOWN FALSE POSITIVE (the on-behalf register colliding with the
   * family-PRESENCE cues — "my mum" here is the PATIENT, not a relative joining the
   * appointment); O77 built the governor rule and retagged it in the same commit, the O68
   * pattern's third full run. The structured reach ("looked into properly") was honest all
   * along and stays. The rule's own boundary pins sit beside it below.
   */
  { text: "booking on behalf of my mum, she wants this looked into properly", reaches: ["manner:structured"], never: ["manner:culturally_attuned"] },
  // O77's boundary as data: a pure on-behalf sentence is silent to the facet, while a
  // presence ask keeps reaching even with a "for" later in the clause — the governor must
  // sit DIRECTLY before the family reference, O72's adjacency lesson applied again.
  { text: "the appointment is for my mum, I am just organising it", never: ["manner:culturally_attuned"] },
  { text: "I want my mum in the room for this", reaches: ["manner:culturally_attuned"] },
  { text: "my son's paediatrician says a GP can manage this now", reaches: ["care:shared-care"], aspires: ["care:child-adolescent-adhd"] },
  { text: "year seven has been a disaster, we need answers for our boy", aspires: ["care:child-adolescent-adhd"] },

  // ── life-stage and situation: the context the ask rides in on ───────────────────────────
  { text: "I am at uni and my study is falling apart, I want this assessed", reaches: ["care:adhd-assessment"] },
  { text: "fifty years old and finally sorting this out properly", reaches: ["manner:structured"], aspires: ["care:adhd-assessment"] },
  { text: "shift work means I can only do phone appointments", aspires: ["pref:telehealth-first"] },
  { text: "a new baby at home, everything has to be online for now", reaches: ["pref:telehealth-first"] },
  { text: "I am a nurse and I need someone who will not treat me like I should know better", aspires: ["manner:non_judgmental"] },
  { text: "I am immunocompromised so clinic visits are a risk", aspires: ["pref:telehealth-first"] },

  // ── polite indirect asks: hedged, but still asks ─────────────────────────────────────────
  { text: "ideally someone gentle, I get flustered", reaches: ["manner:steadying"] },
  { text: "if at all possible I would like it bulk billed", reaches: ["pref:bulk-billing"] },
  { text: "I would feel more comfortable with a female doctor", reaches: ["pref:woman-gp"] },
  { text: "it would help if things were explained step by step", aspires: ["manner:sense_making"] },

  // ── compounds, continued from tranche four ───────────────────────────────────────────────
  { text: "a woman GP for my daughter's assessment, bulk billed if possible", reaches: ["care:adhd-assessment", "care:child-adolescent-adhd", "pref:woman-gp", "pref:bulk-billing"] },
  { text: "titration by telehealth because I live remote", reaches: ["care:titration", "pref:telehealth-first"] },
  { text: "a structured assessment, explained in plain english, with no rushing", reaches: ["care:adhd-assessment", "manner:structured", "manner:sense_making", "manner:unhurried"] },
  { text: "shared care and someone calm, my psychiatrist can be blunt", reaches: ["care:shared-care", "manner:steadying"] },
  { text: "an autism aware doctor who bulk bills", reaches: ["care:autism-adhd", "pref:bulk-billing"] },
  { text: "someone collaborative about the dose, it is my body", reaches: ["manner:collaborative", "care:titration"] },
  { text: "late diagnosed autistic, now querying the ADHD part", reaches: ["care:autism-adhd", "care:adhd-assessment"] },
  { text: "a GP good with anxious teenagers", reaches: ["care:child-adolescent-adhd", "care:anxiety"] },

  // ── paraphrase depth and honest gaps, facet by facet ─────────────────────────────────────
  { text: "a formal diagnosis so work will make adjustments", reaches: ["care:adhd-assessment"] },
  { text: "get the paperwork that proves it is ADHD", reaches: ["care:adhd-assessment"] },
  { text: "put a name to what has been going on since childhood", reaches: ["manner:sense_making"], aspires: ["care:adhd-assessment"] },
  { text: "the black dog is back and I want it dealt with alongside the ADHD", reaches: ["care:adhd-assessment"], aspires: ["care:depression"] },
  { text: "keep an eye on my mood while we sort the attention side", reaches: ["manner:structured", "care:adhd-assessment"], aspires: ["care:depression"] },
  // "flat" descriptions without a want are pinned `never` above, so the depression gap here
  // is deliberately NOT an aspiration — a cue on "flat" would break those pins. The heard
  // half (taken seriously) is the ask; the mood word stays the reader's silence.
  { text: "burnt out and flat, and I want both taken seriously", reaches: ["manner:attuned"] },
  { text: "the generic brand hits different and nobody will discuss it", aspires: ["care:titration"] },
  { text: "review whether this is still the right medication for me", aspires: ["care:titration"] },
  { text: "the ADHD clinic discharged me and I need my scripts kept going", aspires: ["care:shared-care"] },
  { text: "hand the prescribing back to a GP near home", aspires: ["care:shared-care"] },
  { text: "lifestyle changes before we talk prescriptions", aspires: ["care:non-medication"] },
  { text: "I want to try the non-drug route first", aspires: ["care:non-medication"] },
  { text: "what works besides medication", aspires: ["care:non-medication"] },
  { text: "help with the anger that comes out of nowhere", aspires: ["care:emotional-regulation"] },
  { text: "my moods flip fast and I say things I regret", aspires: ["care:emotional-regulation"] },
  { text: "I want the emotional side taken as seriously as the focus side", reaches: ["manner:attuned"], aspires: ["care:emotional-regulation"] },
  { text: "please go slowly with the history questions", aspires: ["care:trauma-informed"] },
  { text: "a doctor trained in trauma, not just aware of it", reaches: ["care:trauma-informed"] },
  { text: "what happened to me before makes doctors hard to trust", aspires: ["care:trauma-informed"] },
  { text: "I need my past drug use handled without the raised eyebrows", aspires: ["care:substance-history", "manner:non_judgmental"] },
  { text: "opioids were a chapter of my life, closed now", aspires: ["care:substance-history"] },
  { text: "more than one diagnosis in my file and I need a GP who can hold it all", reaches: ["care:adhd-assessment"], aspires: ["care:complex-mental-health"] },
  { text: "my psych history scares GPs off and I am tired of it", reaches: ["care:complex-mental-health"] },
  { text: "sensory friendly appointments would change everything", reaches: ["care:autism-adhd"] },
  { text: "white coat panic is real for me", reaches: ["care:anxiety"], aspires: ["manner:steadying"] },
  { text: "the anxiety needs treating alongside, not instead", reaches: ["care:anxiety"] },
  { text: "social anxiety makes phone calls easier than visits", reaches: ["care:anxiety"], aspires: ["pref:telehealth-first"] },
  { text: "my family does not believe in ADHD and I need help navigating that", reaches: ["manner:culturally_attuned"] },
  { text: "English is my second language and appointments move too fast", aspires: ["manner:culturally_attuned", "manner:unhurried"] },
  { text: "I rehearse what to say and still leave unheard", aspires: ["manner:attuned"] },
  { text: "believe women when they describe this", aspires: ["manner:non_judgmental"] },
  { text: "I need the appointment to not feel like an interrogation", aspires: ["manner:steadying"] },
  { text: "bloods and blood pressure done before any script", aspires: ["manner:structured"] },
  { text: "I want the follow up booked before I leave each time", aspires: ["manner:structured"] },
  { text: "ask me what I think before deciding", aspires: ["manner:collaborative"] },
  { text: "run the options past me first", aspires: ["manner:collaborative"] },
  { text: "someone who sees what is right with me too", aspires: ["manner:motivating"] },
  { text: "less what is wrong with you, more what we can build", aspires: ["manner:motivating"] },
  { text: "the good doctors never make you watch the clock", aspires: ["manner:unhurried"] },
  { text: "give me the full appointment, not the doorway version", aspires: ["manner:unhurried"] },
  { text: "a female GP for personal reasons", reaches: ["pref:woman-gp"] },
  { text: "medicare only, I cannot pay extra", aspires: ["pref:bulk-billing"] },
  { text: "does it cost anything out of pocket", aspires: ["pref:bulk-billing"] },
  { text: "an online consult first then face to face if needed", reaches: ["pref:telehealth-first"] },

  // ── G7: more symptom-only sentences, pinned silent ───────────────────────────────────────
  { text: "I doom scroll until three in the morning", never: ["care:adhd-assessment"] },
  { text: "my thoughts race the moment my head hits the pillow", never: ["care:adhd-assessment", "care:anxiety"] },
  { text: "I forget birthdays, deadlines, everything", never: ["care:adhd-assessment"] },
  { text: "I hyperfocus for ten hours and forget to eat", never: ["care:adhd-assessment"] },
  { text: "the laundry sits there for weeks", never: ["care:adhd-assessment"] },

  // ── logistics noise with shared vocabulary, pinned silent ────────────────────────────────
  { text: "my last appointment ran late by an hour", never: ["manner:unhurried"] },
  { text: "the clinic phone rings out every time I call", never: ["pref:telehealth-first"] },
  { text: "reception said to bring the referral in person", never: ["care:shared-care"] },
  { text: "the car park behind the clinic is always full", never: ["manner:unhurried"] },

  // ── O72 discipline: bare negators and the not-just veto, walked further ─────────────────
  { text: "not shared care, I want someone to own the whole thing", never: ["care:shared-care"] },
  { text: "no video appointments, my internet is hopeless", never: ["pref:telehealth-first"] },
  // The veto's second worked case: additive "not just X" keeps the ask alive.
  { text: "not just the dose, I want the whole plan looked at again", reaches: ["care:titration"] },
  { text: "no assessment needed, that part is done, I need the scripts managed", never: ["care:adhd-assessment"], aspires: ["care:shared-care"] },
  { text: "I don't want telehealth, I need to be in the room with someone", never: ["pref:telehealth-first", "manner:culturally_attuned"] },
  /**
   * O75 pinned this as a KNOWN FALSE POSITIVE (the conversational hedge "if that makes
   * sense" fired the sense_making cue though it asks for nothing); O76 built the hedge rule
   * and retagged it in the same commit, exactly as the pin demanded — the second time the
   * O68 pattern has run to completion. The woman-gp half is the real ask, still unheard.
   */
  { text: "a she not a he, if that makes sense", never: ["manner:sense_making"], aspires: ["pref:woman-gp"] },
  // O76's own boundary, pinned as data beside the rule's tests: the veto is span-precise,
  // so a trailing hedge never silences the genuine ask in front of it — and a real ask
  // elsewhere in a hedged sentence still reaches.
  { text: "I want a woman doctor, if that makes sense", reaches: ["pref:woman-gp"], never: ["manner:sense_making"] },
  { text: "help me make sense of thirty years, if that makes sense", reaches: ["manner:sense_making"] },

  // ═══ O78 (founder-directed matching audit): what the close read found, as data. ═════════
  // FIXED in the same commit — suppression is now per-OCCURRENCE (findCue retries past a
  // refused span), so a clause-one refusal or hedge no longer silences a clause-two ask:
  { text: "I don't want titration. but titration support is exactly what I came for", reaches: ["care:titration"] },
  { text: "not bulk billing at my old clinic. bulk billing is essential now", reaches: ["pref:bulk-billing"] },
  { text: "if that makes sense is all I ever say, but truly I need help to make sense of this", reaches: ["manner:sense_making"] },
  // NAMED by the O78 audit as its gap list; each retag below lands with its rule, forced
  // by the promotion gate. Design sketches live in docs/MATCHING-AUDIT-O78.md.
  // 1) desire-negation over-scope — FIXED BY O81 (consume-once: a negation spends itself
  //    on the nearest following ask, not everything in its lead; a shorter lead was ruled
  //    out because "don't want anyone touching the dose" is a real refusal). The refused
  //    half stays refused and the following ask now reaches, in one entry:
  { text: "I don't want a woman GP, bulk billing matters more", never: ["pref:woman-gp"], reaches: ["pref:bulk-billing"] },
  // 2) reported refusal — FIXED BY O83 ({said, told} before the negator vetoes the O72
  //    suppression; the raw stream's subject walk keeps the reader's OWN reported "no"
  //    refusing). The rule's earned sentences sit beside the promoted one:
  { text: "they said no to titration and I want it anyway", reaches: ["care:titration"] },
  { text: "my old GP told me no on a dose review, I need someone who will", reaches: ["care:titration"] },
  { text: "the practice said no to telehealth, which is exactly what I need", reaches: ["pref:telehealth-first"] },
  // The self-report boundary: "I said no" is a standing refusal however it is tensed —
  // the subject walk crosses auxiliaries ("I have said no"), so neither of these reaches.
  { text: "I said no to titration and I still mean it", never: ["care:titration"] },
  { text: "I have said no to the dose before and nothing has changed", never: ["care:titration"] },
  // 3) presence phrasing — INVESTIGATED BY O84 AND REFUSED, the O65 pattern: this stays a
  //    STANDING aspiration because both candidate cues were built and measured into leaks.
  //    [sit, room] hears "I hate sitting in waiting rooms" through the insertion gap; the
  //    collapsed "room with me" (O45 pair [room, with]) hears "in the room with someone" —
  //    the O77 never pin below caught that one in-build. The discriminator is "me", a
  //    stopword no pair can carry; this promotes only when a raw-run mechanism earns its
  //    way in. The register's OTHER phrasing was cuable and landed: "support person".
  { text: "I am here for my mum's sake, she will sit in the room with me", aspires: ["manner:culturally_attuned"] },

  // ═══ O84: the sit-register refusal, as data — and the phrasing that survived. ═══════════
  // The support-person ask reaches; the leak sentences that killed the candidate cues are
  // pinned silent so a future naive cue fails here by name.
  { text: "can I bring a support person to the appointment", reaches: ["manner:culturally_attuned"] },
  { text: "I will have my support person with me", reaches: ["manner:culturally_attuned"] },
  { text: "I hate sitting in waiting rooms", never: ["manner:culturally_attuned"] },
  { text: "the room was cold last time", never: ["manner:culturally_attuned"] },
  { text: "peer support has helped me before", never: ["manner:culturally_attuned"] },
  { text: "my support worker suggested this", never: ["manner:culturally_attuned"] },
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
  // (tranche two: ~200 entries), O64 (tranche three), O65 and O68 (tranche four: compounds +
  // discipline registers, 311 entries), and O75 (tranche five: question forms, on-behalf
  // bookings, life-stage and hedged registers — 401 entries, 18 floors raised on the same
  // run). The open aspirations are the standing lexicon to-do list; the three attuned
  // hesitations from O49 remain the founder's call.
  // pref:longer-appointment sat at 1 after O64's tranche aimed straight at it; O65 closed
  // the gap (five two-token cues) and the floor is the measured count — the standing gap,
  // "more than fifteen minutes", is the recorded precision/recall decision, not a miss
  // nobody noticed.
  "care:adhd-assessment": 41,
  "care:anxiety": 14,
  "care:autism-adhd": 14,
  "care:child-adolescent-adhd": 13,
  "care:complex-mental-health": 11,
  "care:depression": 9,
  "care:emotional-regulation": 8,
  "care:non-medication": 7,
  "care:shared-care": 15,
  "care:substance-history": 9,
  // O78 audit: titration, sense_making and bulk-billing each +1 from the per-occurrence
  // suppression fix's own pins (a clause-two ask now survives a clause-one refusal or hedge).
  "care:titration": 21,
  "care:trauma-informed": 9,
  "manner:attuned": 12,
  "manner:collaborative": 10,
  "manner:culturally_attuned": 13,
  "manner:motivating": 9,
  "manner:non_judgmental": 11,
  "manner:sense_making": 14,
  "manner:steadying": 13,
  "manner:structured": 15,
  "manner:unhurried": 16,
  // bulk-billing lowered 12→11 by O72: the count lost the KNOWN FALSE POSITIVE ("not bulk
  // billing…" retagged reaches→never when the bare-not rule landed) — a correction, not a
  // hearing lost. The ratchet law forbids lowering to pass; lowering because an entry was
  // honestly reclassified is the one sanctioned direction, and this comment is its record.
  // (O75 raised it back past the old mark on new heard entries: 11→15.)
  "pref:bulk-billing": 17,
  "pref:longer-appointment": 6,
  "pref:telehealth-first": 15,
  // O76: +1 from the hedge rule's own boundary pin ("I want a woman doctor, if that makes
  // sense"). sense_making holds at 13 through that unit — it lost the retagged hedge false
  // positive and gained the genuine-ask-then-trailing-hedge pin on the same run.
  // O77: culturally_attuned holds at 11 the same way — the on-behalf retag took one out
  // and the presence boundary pin ("I want my mum in the room for this") put one back.
  "pref:woman-gp": 16,
};
