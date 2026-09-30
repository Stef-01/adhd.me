// W221: one lexicon, read once, used by both the ranking and the explanation.
//
// See docs/MATCHING-PLAN.md for the options this was chosen from and the constraints that
// eliminated the rest. The short version of why this file exists:
//
// WHAT IT REPLACES. `rankClinicians` held a `focusSignals` map keyed by CLINICIAN ID — about
// twenty-five hand-authored `[phrase, weight]` pairs per doctor. That works for two clinicians
// and fails for the next ten, in two distinct ways. It fails practically, because every new GP
// becomes an engineering task where somebody reads them and invents weights. And it fails
// ethically, because those weights are a private editorial judgement about a named person with
// no audit trail and no way for that person to see or contest what was written about them.
//
// Worse, the EXPLANATION was authored separately, in `getPersonalizedMatch`, as a second lexicon
// covering the same ideas with different phrase lists. Two lexicons for one job, already drifted:
// the ranker weighted "wearing off" and the explainer did not, so a query could be ranked for a
// reason the page then declined to give. This file makes them one computation, and a test asserts
// they cannot disagree again.
//
// WHAT IT IS. A phrase → facet map, owned centrally rather than per clinician. A clinician
// declares facets; a patient's words are read into facets; the score is the overlap. Adding a GP
// is a declaration, not a code change.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE CONSTRAINT THAT SHAPES EVERY LINE OF THIS FILE, stated so the next reader does not have to
// rediscover it: this reads a PREFERENCE ABOUT CARE, never a clinical fact about the person.
//
// "I drink more than I should" is not read as a substance-use finding. It is read as *this person
// wants that conversation held safely*, which is a fact about what they want from a clinician and
// not a fact about them. The distinction is the whole of G7's boundary (docs/GATE-DOSSIER-Q17.md):
// the finder reasons over a clinician's declared attributes, and the moment it starts classifying
// the patient it becomes something the TGA regulates. Where a phrase could be read either way,
// THE PREFERENCE READING IS TAKEN. Every `label` below is written in that voice for the same
// reason — they are the words the reason sentence is built from, and a label like "substance use"
// would be a finding about somebody, where "a substance history held safely" is a description of
// care.

import type { CareArea } from "@/demo/care-archetypes";
import { EI_QUALITIES, EI_QUALITY_KEYS, type EIQuality } from "@/demo/emotional-fit";
import { MATCHABLE_LANGUAGES } from "./languages";
import { bareNegatorBefore, collapsedCueRunPresent, collapsedCueSatisfied, commaBreaksBefore, diagnosisAlreadyMade, findCue, isTightNegator, lackingNotDeclining, onBehalfBefore, reportedRefusal, selfClaimedPatient, softenedNotJust, stem, suppressedByDesireNegation, tokenise, tokeniseKeepingStopwords, withinHedge } from "./read";

/**
 * How a clinician works, as opposed to what they see.
 *
 * THIS VOCABULARY IS NOT DEFINED HERE. It is `EIQuality` in `src/demo/emotional-fit.ts`, which
 * arrived in parallel with this file and is the better-grounded of the two — its facets are the
 * four MSCEIT branches plus the plain interpersonal qualities that decide whether an ADHD consult
 * goes well, and it carries a reader-facing label for each. Two overlapping manner vocabularies
 * would have been the same defect this unit removed from the ranker: one job, two lexicons,
 * drifting. So there is one, it lives there, and this file reads its cues.
 *
 * The one facet added to it here is `structured`, because "documented baseline, review on a
 * schedule" is a real declared way of working that is not an emotional-intelligence quality and
 * that one of the two GPs on the roster leads with.
 */
export type MannerTrait = EIQuality;

export const MANNER_TRAITS: readonly MannerTrait[] = EI_QUALITY_KEYS;

/** A facet is either something a clinician sees or a way they work. Both are declared. */
export type Facet = { kind: "care"; area: CareArea } | { kind: "manner"; trait: MannerTrait };

/**
 * A preference that is a hard filter or a strong lift rather than a facet — the things somebody
 * says that are about access rather than about the care itself.
 */
export type Preference = "woman-gp" | "telehealth-first" | "bulk-billing" | "longer-appointment" | "lived-experience" | "ndis";

/**
 * One thing the reader asked for, with the words to say it back to them.
 *
 * `label` is the closed-vocabulary phrase the reason sentence is composed from. It is not
 * generated, not templated from the patient's own text, and not a paraphrase of it: W213's floor
 * requires the reason to come from a fixed set, and the fixed set is the `label` column below.
 */
export type NeedSignal = {
  facet: Facet | { kind: "preference"; preference: Preference } | { kind: "language"; language: string };
  /** The phrase from the reader's own words that reached this facet. Used for tests and logging. */
  matched: string;
  /** Closed vocabulary. What a surface may say back. */
  label: string;
  /** Relative importance of this facet when it is asked for. */
  weight: number;
};

type Entry = {
  facet: NeedSignal["facet"];
  label: string;
  weight: number;
  /**
   * Phrases that reach this facet. Ordered longest-first at read time so a specific phrase wins
   * over a general one contained inside it — "not just medication" must not be reached by
   * "medication" and then labelled as though the reader asked for the opposite of what they said.
   */
  phrases: readonly string[];
};

const care = (area: CareArea, label: string, weight: number, phrases: readonly string[]): Entry => ({
  facet: { kind: "care", area },
  label,
  weight,
  phrases,
});

const manner = (trait: MannerTrait, label: string, weight: number, phrases: readonly string[]): Entry => ({
  facet: { kind: "manner", trait },
  label,
  weight,
  phrases,
});

const pref = (preference: Preference, label: string, weight: number, phrases: readonly string[]): Entry => ({
  facet: { kind: "preference", preference },
  label,
  weight,
  phrases,
});

/**
 * THE LEXICON. One artifact, reviewed as one artifact.
 *
 * Weights are coarse on purpose — 30 / 20 / 12 rather than a tuned continuum. A tuned weight is a
 * number somebody would have to defend, and the honest position is that these express "this is
 * the thing they asked for" versus "this is context they mentioned", not a calibrated belief.
 * Anything finer would be false precision of exactly the kind the stat rail refuses.
 */
/**
 * Phrases a PREFERENCE facet owns, even though a manner quality also lists them (O116).
 *
 * `manner:not_rushed` and `pref:longer-appointment` both cue "longer appointment". While
 * `stem("longer")` was "longer" the two never met, so the collision sat here unseen since both
 * were authored. O116 taught the stemmer that "longer" is "long" — correctly, since the facet
 * whose LABEL is "A longer first appointment" could not otherwise hear its own adjective — and
 * the two cues immediately collided. FIRST_CLAIM gives a phrase one owner, and the winner was
 * decided by lexicon order and phrase length, which is no way to decide anything: unhurried
 * silently owned the words for the facet named after them, and "a long appointment" stopped
 * reaching `pref:longer-appointment` at all.
 *
 * THE OWNERSHIP IS DECLARED HERE RATHER THAN LEFT TO SORT ORDER. Note what this does NOT do:
 * it does not remove the phrases from `EI_QUALITIES`, because the onboarding interview reads
 * those cue lists DIRECTLY to propose facets from a doctor's own words (W221/O22), and a GP
 * who says "I book longer appointments" is describing an unhurried manner. The two readers
 * legitimately want different answers about the same phrase — one is reading a patient's ask,
 * the other a clinician's description of their practice — and this is the seam where they
 * differ, stated once, in the reader that needs the exception.
 */
const PREFERENCE_OWNED_PHRASES: ReadonlySet<string> = new Set(["longer appointment", "longer first"]);

function mannerPhrases(quality: MannerTrait): readonly string[] {
  return EI_QUALITIES[quality].cues.filter((phrase) => !PREFERENCE_OWNED_PHRASES.has(phrase));
}

/* O260: the assessment asked for in the first person. */
const FIRST_PERSON_ASKS: readonly string[] = [
  "i think i have adhd", "think i have adhd", "i might have adhd", "might have adhd", "i may have adhd", "i probably have adhd",
  "do i have adhd", "could i have adhd", "wondering if i have adhd", "wonder if i have adhd", "wondering whether i have adhd",
  "suspect i have adhd", "i suspect adhd", "find out if i have adhd", "find out if it is adhd", "find out whether i have adhd",
  "undiagnosed", "get diagnosed", "get assessed", "be assessed", "want an assessment", "need an assessment",
  "never been diagnosed", "never diagnosed", "not yet diagnosed", "not been diagnosed", "havent been diagnosed", "have not been diagnosed",
  "pretty sure i have adhd", "sure i have adhd", "certain i have adhd", "convinced i have adhd",
];
/* O260 (the voice eval's `scripts` persona): care after a diagnosis, in the words of a person whose prescriber has gone.
   Each demands its run of words; each also tells the assessment's bare words to stand down (read.ts, DIAGNOSIS_MADE). */
const CONTINUING_CARE: readonly string[] = [
  "ongoing scripts", "ongoing prescriptions", "ongoing prescribing", "take over prescribing", "take over the prescribing", "take over the scripts",
  "take over my scripts", "take over my prescribing", "psychiatrist retired", "psychiatrist has retired", "psychiatrist is retiring", "prescriber retired", "paediatrician retired", "keep me on",
  "ongoing adhd scripts", "adhd scripts", "my adhd scripts", "my scripts", "need scripts", "need my scripts", "scripts continued",
];

/* O260 (2026-09-29, the voice eval's `lived` persona): "a psychologist who's been diagnosed with ADHD
   themself" read as an assessment ask, because "diagnosed" is an assessment cue and nothing claimed it.
   The diagnosis predicated of the CLINICIAN, by a reflexive or by the clinician noun's own relative
   clause, is lived experience; each cue below claims its run of words (O258), so "diagnosed" is spent
   before the assessment cue looks. "someone who was diagnosed" is left out: a carer says it of the
   person they are asking for. */
const LIVED_DIAGNOSED: readonly string[] = [
  ...["themself", "themselves", "herself", "himself"].flatMap((self) => [`diagnosed with adhd ${self}`, `been diagnosed with adhd ${self}`, `has adhd ${self}`, `adhd ${self}`, `diagnosed ${self}`]),
  ...["clinician", "gp", "doctor", "psychologist", "psychiatrist", "coach", "therapist", "counsellor"].flatMap((noun) =>
    ["who was diagnosed", "whos been diagnosed", "who has been diagnosed", "who got diagnosed", "who is diagnosed", "diagnosed with adhd"].map((said) => `${noun} ${said}`)),
  "understands it from the inside", "understand it from the inside", "understands adhd from the inside",
  // 2026-09-30 (the voice eval's `lived` persona): "personal experience with ADHD" named of the clinician, which left "adhd" to the assessment cue.
  "personal experience with adhd", "personal experience of adhd", "lived experience with adhd", "lived experience of adhd", "first hand experience of adhd", "firsthand experience of adhd", "first hand experience with adhd", "firsthand experience with adhd",
];

/* O261 (2026-09-29, docs/matching/RCA-NIGHT-2026-09-29.md stage 3): what people need help with in LIFE, one facet per
   domain the 37 clinicians say they work in (qa/matching/life-domains.md). Every cue is the person's own words for
   the HELP they want or the part of life it is in, never a symptom on its own (O114's rule: "I'm forgetful" is a
   person describing themselves for an assessment, "help getting organised" is an ask), and every multi-word cue
   demands its run of words (RUN_DEMANDED), so "school" reads a school and "my teacher" a student. */
const EXECUTIVE_FUNCTION_CUES: readonly string[] = [
    // ‘stay on top of’ belongs to manner:structured and ‘coaching’ to care:non-medication already; a phrase is one facet’s.
    // ‘adhd coach’ keeps its two tokens and reaches here. Symptom words (‘procrastinate’, ‘losing things’, ‘deadlines’)
    // are refused under O114: a person describing themselves for an assessment is not asking a coach for help.
    "executive function", "executive functioning", "executive functions", "getting things done", "get things done",
    "getting anything done", "get anything done", "getting started", "get started on", "cant get started",
    "cannot get started", "starting tasks", "start tasks", "task initiation", "help with procrastination",
    "help with focus", "help me focus", "help focusing", "focus at work", "focusing at work", "focus at uni",
    "stay focused", "staying focused", "keep focused", "trouble focusing", "help with organisation",
    "help with organization", "get organised", "get organized", "getting organised", "getting organized",
    "stay organised", "staying organised", "organise my life", "organising my life", "organise my time",
    "organising my time", "time management", "manage my time", "managing my time", "time blindness", "prioritising",
    "prioritise", "prioritize", "meeting deadlines", "routines", "daily routines", "build routines", "a routine",
    "structure my day", "structure to my day", "systems that work", "adhd coach", "adhd coaching", "strategies",
    "practical strategies", "tools and strategies", "skills and strategies", "everyday life skills", "life skills",
    "coaching", "a coach", "build habits", "building habits", "better habits", "habits and routines",
    "help with habits", "help me with focus", "help with focusing", "help focusing at work", "needs with focusing",
    "help with my focus", "help with concentration", "help concentrating", "help me concentrate", "help with time",
    "help with deadlines", "help with planning", "help with organising", "help getting started",
    "help me get started", "help starting", "help with procrastinating",
];
const WORK_CAREER_CUES: readonly string[] = [
    "my job", "workplace", "work adjustments", "workplace adjustments", "reasonable adjustments", "career",
    "my career", "performance review", "performance reviews", "performance at work", "high pressure job",
    "high-pressure", "high pressure", "keep losing jobs", "losing my job", "lost my job", "lose my job",
    "keep getting fired", "getting fired", "been fired", "fired", "made redundant", "redundancy", "return to work",
    "back to work", "run a business", "running a business", "my business", "small business", "self employed",
    "self-employed", "sole trader", "freelance", "career change", "changing careers", "leaving my job",
    "quit my job", "adhd at work", "help at work", "help with work", "at work with", "keep my job",
    "my job is on the line", "help with burnout", "recovering from burnout", "burnout recovery", "burnout at work",
    "work burnout", "adhd and work", "work and adhd", "struggling at work", "struggle at work", "cope at work",
    "coping at work", "function at work", "functioning at work", "help me at work", "helps me at work",
    "help at my work", "help with my work", "help me with work", "help me with my work", "support at work",
    "support me at work", "supports me at work", "support with work", "trouble at work", "problems at work",
    "issues at work", "difficulties at work", "struggling with work", "help in my job", "help with my job",
    "help me in my job", "help at my job",
];
const STUDY_SCHOOL_CUES: readonly string[] = [
    "at uni", "uni", "university", "tafe", "college", "exams", "exam", "assignments", "assignment", "studying",
    "studies", "student", "students", "hsc", "atar", "year 12", "year 11", "year 10", "my teacher", "his teacher",
    "her teacher", "their teacher", "the teacher", "the teachers", "teachers say", "teacher says", "teacher thinks",
    "learning difficulties", "learning difficulty", "learning disorder", "learning differences", "learning support",
    "learning plan", "education plan", "iep", "dyslexia", "dyslexic", "dyscalculia", "gifted", "twice exceptional",
    "2e", "school refusal", "school cant", "cant go to school", "wont go to school", "refusing school", "tutoring",
    "tutor", "semester", "thesis", "phd", "postgrad", "apprenticeship", "the readings", "struggling at school",
    "struggles at school", "help at school", "help with school", "school support", "support at school",
    "failing at school", "school work", "schoolwork", "my study", "my studies", "study skills", "help with study",
    "help studying", "keep up at uni", "keep up at school", "failing uni", "failing exams",
];
const PARENTING_CUES: readonly string[] = [
    // Refused: bare ‘parenting’, ‘my parenting’ and ‘parents of’, each collapsing to [parent], the token ‘my parents’ (a
    // manner cue, the family in the room) collapses to.
    "my parents", "as a parent", "parent training", "parenting support", "parenting strategies", "parenting help",
    "help with parenting", "raising a child", "tantrums", "behaviour at home", "his behaviour", "her behaviour",
    "their behaviour", "challenging behaviour", "disruptive behaviour", "bedtime battles", "homework battles",
    "family therapy", "family sessions", "family counselling", "whole family", "the whole family",
    "parent with adhd", "adhd parent", "adhd parents", "mum with adhd", "dad with adhd", "mother with adhd",
    "father with adhd", "single mum", "single dad", "single parent", "parents like me", "as a mum", "as a dad",
    "as a mother", "as a father", "exhausted parent", "parent of a child", "step kids", "stepkids", "the school run",
];
const RELATIONSHIPS_CUES: readonly string[] = [
    "my relationship", "our relationship", "relationship problems", "relationship difficulties",
    "relationship issues", "relationship is suffering", "my marriage", "our marriage", "marriage",
    "marriage counselling", "couples", "couples counselling", "couples therapy", "couple therapy", "as a couple",
    "keep fighting", "always fighting", "fighting all the time", "arguing all the time", "divorce", "divorced",
    "getting divorced", "going through a separation", "breakup", "break up", "broke up", "co-parenting",
    "interpersonal", "people pleasing", "people-pleasing", "people pleaser", "people please", "attachment issues",
    "attachment wounds", "trust issues", "setting boundaries", "hold a boundary", "conflict at home",
    "conflict with my", "my relationships", "relationship strain", "relationship trouble",
    "relationship counselling", "help with my marriage", "relationship help", "in my relationships",
];
const SOCIAL_CONNECTION_CUES: readonly string[] = [
    "social skills", "friendships", "friendship", "making friends", "make friends", "keep friends",
    "keeping friends", "no friends", "few friends", "socialising", "socialise", "socializing", "socialize",
    "social situations", "social life", "small talk", "reading people", "social cues", "connect with people",
    "connecting with people", "connection with others", "socially awkward", "help with masking",
    "help making friends", "help with friendships", "so lonely", "very lonely", "feel isolated", "feeling isolated",
    "being bullied", "gets bullied", "getting bullied", "is bullied", "bullied at school", "help fitting in",
    "social anxiety at", "social skills group",
];
const LATE_DIAGNOSIS_CUES: readonly string[] = [
    // Refused: ‘who i am’ and ‘where to from here’, every word a stopword.
    "late diagnosis", "late diagnosed", "late-diagnosed", "diagnosed late", "diagnosed at", "just been diagnosed",
    "just got diagnosed", "just diagnosed", "recently diagnosed", "newly diagnosed", "new diagnosis",
    "fresh diagnosis", "adjust to the diagnosis", "adjusting to the diagnosis", "adjusting to a diagnosis",
    "make sense of the diagnosis", "make sense of my diagnosis", "make sense of my adhd", "make sense of adhd",
    "make sense of it all", "understand my adhd", "understand myself", "understanding myself", "rethinking my life",
    "rethinking everything", "my whole life makes sense", "whole life makes sense", "explains my whole life",
    "wish i had known", "wish id known", "what it means for me", "what this means for me", "unpack the diagnosis",
    "process the diagnosis", "processing the diagnosis", "grieving the diagnosis", "grief about the diagnosis",
    "self understanding", "self-understanding", "diagnosed as an adult", "adult diagnosis",
    "adjusting to a late diagnosis", "adjusting to my diagnosis", "adjusting to an adhd diagnosis",
    "diagnosed at forty", "diagnosed at fifty", "diagnosed in my forties", "diagnosed in my fifties",
    "diagnosed in my thirties", "coming to terms with the diagnosis", "come to terms with the diagnosis",
    "since my diagnosis", "after my diagnosis", "post diagnosis", "post-diagnosis",
];
const GRIEF_LIFE_CHANGE_CUES: readonly string[] = [
    "grief", "grieving", "bereavement", "bereaved", "lost my mum", "lost my dad", "lost my mother", "lost my father",
    "lost my partner", "lost my wife", "lost my husband", "lost my son", "lost my daughter", "lost my brother",
    "lost my sister", "lost my best friend", "passed away", "life transition", "life transitions", "big life change",
    "major life change", "empty nest", "empty nester", "midlife crisis", "starting over", "fresh start",
    "life upside down", "miscarriage", "stillbirth", "i retired", "my retirement", "after retirement",
    "just retired", "recently retired", "im retired", "my mum died", "my dad died", "my mother died",
    "my father died", "my partner died", "my wife died", "my husband died", "my son died", "my daughter died",
    "my brother died", "my sister died", "a death in the family", "death of my", "big life changes",
    "major life changes", "life is changing", "my whole life is changing", "starting over after",
    "moving interstate and starting over", "moved interstate and starting over",
];
const SLEEP_CUES: readonly string[] = [
    "insomnia", "cant sleep", "cannot sleep", "dont sleep", "not sleeping", "up all night", "night owl",
    "delayed sleep", "delayed sleep phase", "fall asleep", "falling asleep", "stay asleep", "staying asleep",
    "sleep routine", "sleep schedule", "sleep problems", "sleep issues", "sleep is a mess", "my sleep",
    "cant wake up", "getting up in the morning", "melatonin", "body clock", "circadian", "nightmares",
    "restless nights", "up until three", "up until two", "help with sleep", "help me sleep", "help sleeping",
    "trouble sleeping", "sleep is terrible", "terrible sleep", "sleep is awful", "sleep specialist",
    "sleep and adhd", "adhd and sleep", "cant get to sleep", "cannot get to sleep", "get to sleep",
];
const EATING_BODY_CUES: readonly string[] = [
    "eating disorder", "eating disorders", "disordered eating", "binge eating", "bingeing", "binging",
    "restricting food", "restrict food", "anorexia", "bulimia", "arfid", "body image", "relationship with food",
    "comfort eating", "emotional eating", "fussy eating", "picky eating", "help with eating", "help with food",
    "help with my eating", "my eating", "eating and adhd", "adhd and eating", "appetite on stimulants",
    "appetite on medication", "lost my appetite", "weight and adhd", "my weight and", "forget to eat and",
    "forgetting to eat and",
];
const WOMENS_HEALTH_CUES: readonly string[] = [
    "womens health", "women's health", "womens issues", "perimenopause", "perimenopausal", "menopause", "menopausal",
    "hormones", "hormonal", "my period", "my periods", "heavy periods", "period pain", "pmdd", "pms", "menstrual",
    "menstrual cycle", "my cycle", "pcos", "endometriosis", "fertility", "ivf", "trying to conceive", "female adhd",
    "adhd in women", "adhd in girls", "oestrogen", "estrogen", "hrt",
];
const MOVEMENT_EXERCISE_CUES: readonly string[] = [
    "exercise physiologist", "exercise physiology", "use exercise", "exercise to manage", "exercise for my adhd",
    "exercise program", "exercise plan", "physio", "physiotherapy", "physiotherapist", "pilates", "hydrotherapy",
    "after an injury", "my injury", "an injury", "recovering from an injury", "return to sport", "back into sport",
    "get back into sport", "back to the gym", "help with exercise", "exercise and adhd", "adhd and exercise",
    "exercise routine", "an exercise routine", "stick to exercise", "stick to the rehab", "my rehab", "the rehab",
    "my chronic pain", "chronic pain and", "with chronic pain", "for chronic pain", "my back pain",
    "movement and adhd", "get moving again", "keep active with", "help me stay active", "help staying active",
    "help getting fit", "help me get fit", "exercise as medicine", "an exercise plan", "a movement plan",
];
const CULTURAL_BACKGROUND_CUES: readonly string[] = [
    // Refused: ‘where i am from’ and ‘not my first language’ (every word a stopword or a negator). The language-like
    // nationalities (Chinese, Arabic, Greek …) are cued only with family, background, parents or community beside
    // them, because ‘speaks Arabic’ is a language ask; bare ‘faith’ would claim ‘faith in doctors’.
    "my culture", "our culture", "my own culture", "our own culture", "same culture", "shares my culture",
    "my own background", "indian culture", "indian heritage", "indian community", "chinese culture", "arabic culture",
    "greek culture", "italian culture", "vietnamese culture", "korean culture", "japanese culture", "turkish culture",
    "persian culture", "nepali culture", "filipino culture", "lebanese culture", "african culture",
    "culturally", "cultural background", "cultural context", "cultural identity",
    "my background", "our background", "from my background", "same background", "shares my background",
    "understands my background", "understand my background", "understands where i come from", "where i come from",
    "where my family comes from", "where my family is from", "where we come from", "my heritage", "our heritage",
    "migrant", "migrants", "migrant families", "immigrant", "immigrants", "refugee", "refugees", "newly arrived",
    "new to australia", "moved to australia", "came to australia", "arrived in australia", "second language",
    "interpreter", "translator", "indian families", "south asian", "lebanese", "middle eastern", "pacific islander",
    "maori", "samoan", "tongan", "fijian", "sri lankan", "pakistani", "bangladeshi", "afghan", "iranian",
    "latin american", "south american", "brazilian", "peruvian", "colombian", "chilean", "asian background",
    "asian family", "asian parents", "aboriginal", "torres strait", "torres strait islander", "indigenous",
    "first nations", "koori", "murri", "noongar", "my mob", "my community", "our community", "my faith", "our faith",
    "family expectations", "cultural expectations", "traditional family", "traditional parents",
    "shame in my culture", "stigma in my community", "understands migrant", "arabic family", "arabic families",
    "arabic background", "arabic parents", "arabic community", "chinese family", "chinese families",
    "chinese background", "chinese parents", "chinese community", "vietnamese family", "vietnamese families",
    "vietnamese background", "vietnamese parents", "vietnamese community", "korean family", "korean families",
    "korean background", "korean parents", "korean community", "japanese family", "japanese families",
    "japanese background", "japanese parents", "japanese community", "greek family", "greek families",
    "greek background", "greek parents", "greek community", "italian family", "italian families",
    "italian background", "italian parents", "italian community", "turkish family", "turkish families",
    "turkish background", "turkish parents", "turkish community", "persian family", "persian families",
    "persian background", "persian parents", "persian community", "nepali family", "nepali families",
    "nepali background", "nepali parents", "nepali community", "filipino family", "filipino families",
    "filipino background", "filipino parents", "filipino community", "respects my faith", "respect my faith",
    "faith is important", "respects my religion", "faith matters", "my faith matters", "faith in my care",
    "respects my beliefs", "my religion", "our religion", "my religious", "religious background", "my church",
    "my mosque", "muslim family", "hindu family", "christian family", "jewish family", "catholic family",
    "sikh family", "buddhist family", "indian family", "indian background", "indian parents", "african family",
    "african background", "immigrant family", "immigrant parents", "immigrant background", "cald background",
    "cald community", "understands my culture", "understand my culture", "respects my culture", "my culture and",
    "culturally sensitive", "culturally safe", "culturally aware", "cultural safety", "cultural sensitivity",
    "cultural understanding",
];
const NDIS_CUES: readonly string[] = [
    "ndis", "ndis plan", "ndis funding", "ndis funded", "ndis participant", "ndis participants", "ndis supports",
    "my ndis", "plan managed", "plan-managed", "self managed", "self-managed", "through my plan", "on the ndis",
    "national disability insurance", "support coordinator", "plan manager",
];
/** Every multi-word life cue demands its run of words. */
/* O261: a child named by age. O120 refused bare ‘year old’ because an adult says ‘I am forty years old’; ‘my nine year
   old’ and ‘for our 7 year old’ name a child, and each demands its run of words. */
const CHILD_AGE_CUES: readonly string[] = ["my two year old", "our two year old", "for my two year old", "for our two year old", "my three year old", "our three year old", "for my three year old", "for our three year old", "my four year old", "our four year old", "for my four year old", "for our four year old", "my five year old", "our five year old", "for my five year old", "for our five year old", "my six year old", "our six year old", "for my six year old", "for our six year old", "my seven year old", "our seven year old", "for my seven year old", "for our seven year old", "my eight year old", "our eight year old", "for my eight year old", "for our eight year old", "my nine year old", "our nine year old", "for my nine year old", "for our nine year old", "my ten year old", "our ten year old", "for my ten year old", "for our ten year old", "my eleven year old", "our eleven year old", "for my eleven year old", "for our eleven year old", "my twelve year old", "our twelve year old", "for my twelve year old", "for our twelve year old", "my thirteen year old", "our thirteen year old", "for my thirteen year old", "for our thirteen year old", "my fourteen year old", "our fourteen year old", "for my fourteen year old", "for our fourteen year old", "my fifteen year old", "our fifteen year old", "for my fifteen year old", "for our fifteen year old", "my sixteen year old", "our sixteen year old", "for my sixteen year old", "for our sixteen year old", "my seventeen year old", "our seventeen year old", "for my seventeen year old", "for our seventeen year old", "my 2 year old", "our 2 year old", "for my 2 year old", "for our 2 year old", "my 3 year old", "our 3 year old", "for my 3 year old", "for our 3 year old", "my 4 year old", "our 4 year old", "for my 4 year old", "for our 4 year old", "my 5 year old", "our 5 year old", "for my 5 year old", "for our 5 year old", "my 6 year old", "our 6 year old", "for my 6 year old", "for our 6 year old", "my 7 year old", "our 7 year old", "for my 7 year old", "for our 7 year old", "my 8 year old", "our 8 year old", "for my 8 year old", "for our 8 year old", "my 9 year old", "our 9 year old", "for my 9 year old", "for our 9 year old", "my 10 year old", "our 10 year old", "for my 10 year old", "for our 10 year old", "my 11 year old", "our 11 year old", "for my 11 year old", "for our 11 year old", "my 12 year old", "our 12 year old", "for my 12 year old", "for our 12 year old", "my 13 year old", "our 13 year old", "for my 13 year old", "for our 13 year old", "my 14 year old", "our 14 year old", "for my 14 year old", "for our 14 year old", "my 15 year old", "our 15 year old", "for my 15 year old", "for our 15 year old", "my 16 year old", "our 16 year old", "for my 16 year old", "for our 16 year old", "my 17 year old", "our 17 year old", "for my 17 year old", "for our 17 year old"];
const LIFE_RUN: readonly string[] = [CHILD_AGE_CUES, EXECUTIVE_FUNCTION_CUES, WORK_CAREER_CUES, STUDY_SCHOOL_CUES, PARENTING_CUES, RELATIONSHIPS_CUES, SOCIAL_CONNECTION_CUES, LATE_DIAGNOSIS_CUES, GRIEF_LIFE_CHANGE_CUES, SLEEP_CUES, EATING_BODY_CUES, WOMENS_HEALTH_CUES, MOVEMENT_EXERCISE_CUES, CULTURAL_BACKGROUND_CUES, NDIS_CUES].flatMap((cues) => cues.filter((cue) => cue.includes(" ")));

/* O262: the explicit no, and the explicit alternative. Each demands its run of words (RUN_DEMANDED), which is
   what lets "rather not take medication", "non drug" and "more than a prescription" in: O103 and O177 refused
   them because a cue matched across a gap ("a non stimulant drug", "talk more about my prescription"), and a
   run has no gap. */
const NON_MEDICATION_HARD: readonly string[] = [
  "without medication", "no medication", "not just medication", "not a script", "without a script",
  "besides medication", "not ready for medication", "tablets later", "dont want medication",
  "do not want medication", "dont want to be medicated", "do not want to be medicated", "dont want meds",
  "do not want meds", "dont want to take medication", "do not want to take medication", "dont want any medication",
  "dont want medication supports", "rather not take medication", "rather not be medicated",
  "prefer not to take medication", "prefer no medication", "no meds", "without meds", "no tablets",
  "without tablets", "no pills", "without pills", "instead of medication", "instead of meds", "instead of tablets",
  "other than medication", "rather than medication", "alternative to medication", "alternatives to medication",
  "alternative to meds", "alternatives to meds", "less medicated", "non medication", "non-medication",
  "non medicated", "non-medicated", "medication free", "medication-free", "drug free", "drug-free", "non drug",
  "non-drug", "avoid medication", "avoiding medication", "not keen on medication", "more than a prescription",
  "medication as a last resort", "meds as a last resort", "coaching before tablets", "coaching before medication",
  "coaching before meds", "coaching before any script", "coaching before a script", "coaching before any medication",
  "coaching before any tablets", "coaching before trying medication", "therapy before tablets",
  "therapy before medication", "therapy before meds", "therapy before any script", "therapy before a script",
  "therapy before any medication", "therapy before any tablets", "therapy before trying medication",
  "strategies before tablets", "strategies before medication", "strategies before meds",
  "strategies before any script", "strategies before a script", "strategies before any medication",
  "strategies before any tablets", "strategies before trying medication", "skills before tablets",
  "skills before medication", "skills before meds", "skills before any script", "skills before a script",
  "skills before any medication", "skills before any tablets", "skills before trying medication",
  "counselling before tablets", "counselling before medication", "counselling before meds",
  "counselling before any script", "counselling before a script", "counselling before any medication",
  "counselling before any tablets", "counselling before trying medication", "psychology before tablets",
  "psychology before medication", "psychology before meds", "psychology before any script",
  "psychology before a script", "psychology before any medication", "psychology before any tablets",
  "psychology before trying medication", "not another prescription", "not another script", "not more medication",
  "not more tablets", "alternatives to stimulants", "alternative to stimulants",
  // The founder's call of 2026-09-30 08:00 AEST, "I don't like medication treatment options", and the ways a person says the same no.
  "dont like medication", "do not like medication", "dont like meds", "dont like tablets", "dont like taking medication",
  "dont like the idea of medication", "do not like the idea of medication", "not a fan of medication",
  "not a fan of meds", "not keen on tablets", "not keen on meds", "not keen on pills", "rather not be on medication",
  "rather not go on medication", "rather not use medication", "rather not have medication",
  "dont want to go on medication", "do not want to go on medication", "dont want to be on medication",
  "do not want to be on medication", "dont want to go on meds", "dont want to start medication",
  "do not want to start medication", "not interested in medication", "not interested in meds", "dont want pills",
  "do not want pills", "dont want tablets", "do not want tablets", "dont want any meds", "dont want any tablets",
  "dont want stimulants", "do not want stimulants", "stay off medication", "staying off medication",
  "against medication", "anything but medication",
  // "coaching and skills, not medication": the alternative named, and medication refused in two words.
  "not medication", "not meds", "not tablets", "not pills", "not medicine",
];
/** Read as non-medication only in a sentence that mentions medication: on their own they decline nothing. */
const NON_MEDICATION_SOFT: readonly string[] = [
  "strategies first", "skills first", "last resort", "psychological approaches", "lifestyle changes",
  "diet and exercise", "therapy instead", "therapy first", "coaching first", "coaching instead", "other options",
  "another option", "skills and strategies first", "strategies and skills first", "coaching and habits first",
];
const NON_MEDICATION_CUES: readonly string[] = [...NON_MEDICATION_HARD, ...NON_MEDICATION_SOFT];
/** "don't want medication changes / reviewed / increased": the medication stays. "don't want tablets that wear off by lunch": the no is to what these tablets do. */
const MEDICATION_LEFT_ALONE = /\b(?:(?:don'?t|do not) want|not|no) (?:any |my )?(?:medication|meds|tablets|pills|stimulants) (?:chang\w*|review\w*|increas\w*|adjust\w*|switch\w*|touched|messed|that|which)\b/i;
const SOFT_NON_MEDICATION = new Set(NON_MEDICATION_SOFT);
/** The cues that count only beside a word about medication, for the test that reads every cue back. */
export const SOFT_NON_MEDICATION_CUES: ReadonlySet<string> = SOFT_NON_MEDICATION;
/** The words that say medication is what the sentence is about. */
const MEDICATION_WORDS = new Set(["medication", "medications", "medicated", "medicine", "meds", "med", "tablet", "tablets", "pill", "pills", "script", "scripts", "prescription", "prescriptions", "stimulant", "stimulants", "drug", "drugs", "vyvanse", "ritalin", "concerta", "dexamphetamine", "dex"].map(stem));

const LEXICON: readonly Entry[] = [
  // ── What somebody is trying to get done ───────────────────────────────────────────────────
  // ── ADHD ──────────────────────────────────────────────────────────────────────────────────
  care("adhd-assessment", "ADHD assessment", 12, [
    /* O125: the late-diagnosis register. "put a name to" was refused — it would have taken the
       span `manner:sense_making` is already reading in "put a name to what has been going on
       since childhood", the span-theft O123 caught in its own work. */
    "finally sorting this out",
    /* O260: the ask in the first person, each demanding its run of words (RUN_DEMANDED), so it reaches
       whatever else the sentence says about treatment ("my sister is on Vyvanse and I think I have ADHD"). */
    ...FIRST_PERSON_ASKS,
    "adhd", "assessment", "assessed", "diagnosis", "diagnosed", "attention",
    // O49 (corpus aspirations): "diagnose me" collapses to [diagnose] ("me" is a stopword), so
    // the O45 rule demands the authored pair — "can a GP diagnose me" fires, a stray
    // "diagnose" in an unrelated clause does not. "get checked" collapses to [check] and is
    // safe the same way; its raw pair also hears "getting checked" through the stemmer.
    "diagnose me", "get checked",
    // O256: the adult diagnosed as a child who wants it done again; said as itself.
    "reassessment", "reassessed",
  ]),
  // ── G7 BOUNDARY — DO NOT ADD SYMPTOM DESCRIPTIONS TO ANY CARE FACET ──────────────────────────
  // A prior probe read "my brain has never let me finish anything" as a recall gap and closed it by
  // adding "never finish anything" to a care facet. That is a description of the reader's own
  // impairment — DSM inattention text — not a preference about care, and reading it into a facet is
  // the product concluding a diagnosis from a symptom: the move docs/GATE-DOSSIER-Q17.md holds shut
  // and the pitch states publicly ("keyed to clinician attributes — never to a patient's symptoms").
  // Every care cue below names a condition the reader is ASKING FOR CARE ABOUT, the same
  // preference-reading `substance-history` takes for "I drink too much" — never a symptom the finder
  // infers. Symptom sentences are pinned as an intentional non-reach in reach.test.ts. Widen cues
  // for what a reader WANTS or SAYS THEY HAVE, never for what the finder would have to deduce.
  care("child-adolescent-adhd", "Children and adolescents", 26, [
    ...CHILD_AGE_CUES,
    /* O122: THE FIRST-PERSON PLURAL. This facet knew "my son" and "my daughter" and not "our" —
       and a parent booking for a child says "our ten year old", "our boy", "we need answers".
       Each of these collapses to one token, so O45's pair demand is what keeps them precise: a
       stray "boy" cannot fire, only the authored pair can.

       THE PLURAL FORMS WERE REFUSED BY THE CORPUS ITSELF, which is a stronger reason than any
       measurement I could have made. "our son", "our daughter", "our boy", "our girl" were
       written, and "our daughter" immediately broke a G7 `never` pin: "our daughter cries over
       homework every single night" is pinned as reaching NOTHING, a parent describing their
       child's distress, not asking for care, and the cue read the relationship as an ask.
       A bare family reference cannot tell "we need answers for our boy" from "our daughter
       cries over homework", because the difference between them is the ASK, and the cue only
       sees the relationship. That weakness is not new here: the existing "my son"/"my daughter"
       cues share it exactly, and are untested only because no pin happened to use them in a
       description. So the plural forms are not added, and the sentences that wanted them stay
       standing rather than a G7 boundary being moved to fit a cue.

       "year old" was refused too, on measurement: it fires on "I am forty years old and finally
       asking", an ADULT stating their age, which is the harm O120 fixed from the other
       direction, an adult ranked against paediatric GPs. An age is not a relationship. */
    "educational psychologist",
    "my son", "my daughter", "my child", "my kid", "teenager", "adolescent", "children", "school report",
    /* 2026-09-28 (qa/matching/rca.md R11): the age said between "my" and the child, which "my son"
       cannot bridge: "my nine-year-old son" read as nothing. Unlike the refused "year old", each
       names the relationship, so "I am forty years old" stays silent; the precision is "my son"'s. */
    "year old son", "year old daughter", "year old boy", "year old girl", "year old child", "year old kid",
    // O49: the ask phrased from the clinician side — "someone who sees kids". Both verb forms;
    // bare "kids" is refused because stem("kidding") is "kid" and "no kidding" is not a child.
    "sees kids", "see kids",
    // O53: the clinical adjective parents actually type; single and precise.
    "paediatric",
  ]),
  care("titration", "Titration and dose review", 28, [
    /* O139: the review question in the words people use for it. Three tokens keep it clear of
       "the right medication took two years to find", which is a history, not a request. */
    "still the right medication",
    /* O116: the register a dose review is actually asked in — the script needing adjusting,
       the generic brand, the afternoon rebound, and "medication management" as the thing
       being asked FOR rather than therapy. */
    "script needs adjusting", "the generic brand", "afternoon rebound", "medication management",
    "titration", "dose", "wearing off", "wears off", "side effects", "not working", "adjust the dose",
    /* 2026-09-28, R11: the review asked for by its own name, as the voice finder writes it. */
    "medication review", "review my medication", "med review", "meds review",
  ]),
  care("shared-care", "Shared care with a psychiatrist", 18, [
    /* O139: the two registers this facet arrives in — the script that must not lapse, and the
       specialist service that has finished with somebody. "prescription continued" was REFUSED
       on measurement: it fires on "my prescription continued to cost more each month", a cost
       complaint read as a continuity ask. */
    "scripts kept going", "clinic discharged me",
    /* O116: continuity language. Somebody discharged from a clinic, or newly moved, asks for
       their prescribing to be CONTINUED or HANDED BACK, none of which the facet could hear. */
    "hand the prescribing back", "scripts managed", "continue my prescriptions", "between pharmacies",
    "shared care", "psychiatrist", "already diagnosed", "existing prescription",
    ...CONTINUING_CARE,
    /* O256: the continuation register in the words people use for it. "I already have a diagnosis
       and need my ADHD medication continued" reached nothing here and care:adhd-assessment twice
       over (on "diagnosis" and on "adhd"), so the GP who continues medication for people already
       diagnosed, and says he does not assess, ranked behind the assessing GPs and showed the one
       person who never asked for an assessment "Not in their listing: ADHD assessment". */
    "already have a diagnosis", "continue my medication", "medication continued", "continue my scripts", "scripts continued",
    /* "keep prescribing" was written here and REFUSED on measurement: "they keep prescribing me the
       wrong dose" is a titration complaint, and the P0 dry run read it as shared care as well. The
       phrase stays a sign that the diagnosis is made (read.ts, diagnosisAlreadyMade), which is all
       it says for certain. */
    // O49: the paediatric half of shared care, both spellings — the corpus ask names the
    // clinician to be shared WITH, exactly like "psychiatrist" above.
    "paediatrician", "pediatrician",
    // O53: the handover said as itself. Two content tokens ([take, script]).
    "take over my scripts",
    /* 2026-09-28, the journeys test (src/matching/journeys.test.ts): "someone to keep prescribing my
       ADHD medication" read as an assessment and nothing else, the stable patient NEEDS-GAPS.md ranks
       second. Each names prescribing going on, not a cost or a history. */
    "keep prescribing my medication", "someone to keep prescribing", "keep writing my scripts", "continue prescribing my",
  ]),
  // ── Depression & anxiety ────────────────────────────────────────────────────────────────────
  care("depression", "Depression and low mood", 24, [
    /* O123: the facet reads "depression", "depressed", "low mood" already; these are the same
       thing in the words people actually use for it. "black dog" is the Australian idiom and
       carries two content tokens, so it cannot fire on a literal dog sentence alone.

       A MOOD CUE WAS ATTEMPTED TWICE AND REFUSED TWICE, which is the whole unit in miniature.
       "eye on my mood" swallowed "keep an eye", which `manner:structured` was legitimately
       reading as monitoring, a corpus pin caught that. Narrowing to "my mood" then fired on
       "my moods flip fast and I say things I regret", one of the ten sentences marked
       `awaitingFounder`: the cue would have QUIETLY ANSWERED the founder's G7 question in a
       unit written to stop exactly that, and O119's precision probe caught it. So depression
       gains only the idiom, and "keep an eye on my mood while we sort the attention side"
       stays standing. */
    "black dog",
    "depression", "depressed", "low mood", "antidepressant", "antidepressants",
    // Probe: "I've been on antidepressants for six years and nothing shifted" reached nothing.
    "nothing shifted", "nothing helped", "nothing worked",
  ]),
  care("anxiety", "Anxiety", 24, [
    /* O124: the clinic-anxiety phrasings, cued WITHOUT re-adding the word O119 removed.
       That unit deleted bare "panic" because it fired on "a doctor who won't panic about my
       drinking", a figurative line about the DOCTOR, not a person asking for help with
       anxiety. Both cues here carry a second content token, so neither can reach that
       sentence: "white coat" is [white, coat] and means one thing in a clinic, and "panic in
       the waiting" is [panic, wait], order-sensitive, which is a bonus rather than the
       point: "I had to wait and then panic set in about the cost" has the tokens the other
       way round and stays silent. Measured against O119's exact false positive first. */
    "white coat", "panic in the waiting",
    /* O123: "worried sick" is the same register this facet already reads ("anxious",
       "anxiety") and is specific enough not to repeat O119's mistake, that unit removed BARE
       "panic" because it fired on "a doctor who won't panic about my drinking", a figurative
       line about the DOCTOR. The two waiting-room panic phrasings stay uncued for that
       precision reason and NOT for a G7 one: "waiting room" would fire on "the waiting room
       was full". They are a cue-authoring problem, not a founder question. */
    "worried sick",
    "anxiety", "anxious", "treated for anxiety",
    /* O119 NARROWED "panic" → "panic attack". The bare word fired on "a doctor who won't panic
       about my drinking", where "panic" describes the DOCTOR'S reaction and the ask is that
       substance history be held safely, the opposite of a request for anxiety care. Every
       corpus sentence that legitimately wanted this facet says "panic attacks". Bare "panic"
       would otherwise only have reached a description of the reader's own state, which is the
       G7 reading O114 refused for "anger" and "rage" in the facet next door. */
    "panic attack",
    // Working the anxiety/ADHD line out — the reader asking which one it is, not the finder deciding.
    "misdiagnosed", "differential", "wrong answer", "wrong diagnosis",
  ]),
  // ── Other mental health ─────────────────────────────────────────────────────────────────────
  care("trauma-informed", "Trauma-informed care", 28, [
    "trauma", "trauma history", "difficult childhood", "boundaries", "permission", "ptsd", "cptsd",
    /* O104: the PACE-AND-CONSENT-OVER-HISTORY register. Every cue above names the condition
       ("trauma", "ptsd") or the era ("difficult childhood"); nine phrasings stood unheard in
       the corpus and four of them never mention trauma at all, they ask for a way of being
       asked. "Please go slowly with the history questions" is a preference about how the
       appointment is conducted, which is the reading G7 requires and the safest possible
       thing this facet can be cued on: it names no experience and diagnoses nobody.

       "relive" ships as a single word deliberately. It is not a collapse (a one-WORD cue is
       not a multi-word phrase that collapsed, so the O45 pair rule does not apply to it), and
       it is rare enough in this domain to carry the whole ask, "without having to relive
       it", "I don't want to relive everything", where a two-token version would hear only
       one phrasing of it.

       "not be pushed" CARRIES ITS OWN NEGATOR, and it has to. The first draft cued "pushed
       on the details", which is present in the corpus sentence and reached nothing: O72's
       bare-negator rule saw the "not" sitting directly before the cue span and read the ask
       as a refusal of it. But "I need to NOT be pushed on the details" is the ask, the same
       shape as "I don't want to feel rushed", which manner is exempt from by design. Care
       facets are not exempt, so the negator has to live inside the cue's own words, which is
       exactly what O49 did for "not a script". Measured both ways before shipping. */
    "relive", "slowly with the history", "not be pushed",
    /* THE OTHER FIVE ASPIRATIONS ARE NOT CUED, AND THAT IS THIS UNIT'S MAIN DECISION.
       They name what happened to the person, family violence, an abusive relationship,
       "what happened to me before", or, in one case, use a clinical term for a symptom ("I
       dissociate when doctors rush me"). Cueing those means the matcher reading a history off
       a sentence somebody typed into a finder, which is the G7 line, and Q1's first sweep
       already set the precedent for exactly this: three attuned aspirations were left
       standing because "their phrasings read distress rather than a want, and authoring cues
       for them needs a founder-side judgment call". The same call is owed here and a build
       loop is not the thing to make it. Raised in BUILD-STATE as a named founder question. */
  ]),
  care("complex-mental-health", "Bipolar and complex mental health", 26, [
    /* O140: "a thick file" is how somebody with a long psychiatric history describes it when
       they are asking to be read rather than re-triaged. Two content tokens, and it fires on
       nothing else in the corpus. */
    "file is thick",
    /* O123: the register this facet ALREADY reads. Its settled vocabulary is "bipolar",
       "psychosis", "schizophrenia", "schizoaffective", "psych history", pure diagnosis
       disclosure, so a sentence saying "borderline personality disorder plus the attention
       problems" was never a new G7 question. It was a missing word, parked under the founder
       gate because the unit that met it was moving fast. Nothing here reads a symptom the
       reader is describing in themselves; every one names a diagnosis or an admission the
       reader is DISCLOSING in order to ask that it be held.

       "more than one diagnosis" was written and then REMOVED: at three tokens it outranks
       `care:adhd-assessment`'s "diagnosis" and CONSUMES the span, so "complex needs, more than
       one diagnosis already" stopped reaching assessment, a pin caught it. A cue that reads
       one facet by taking a word another facet needs is not a gain, and the aspiration it
       would have served stays standing. */
    "borderline", "personality disorder", "hear voices", "psych ward","bipolar", "complex", "psychosis", "schizophrenia",
    // O53: how people name the whole file rather than one diagnosis. Two content tokens.
    "psych history", "schizoaffective"]),
  care("autism-adhd", "Autism and neurodevelopmental", 26, ["autism", "autistic", "audhd", "sensory",
    // O49: the self-identification word, single and precise (the "neuroaffirming" precedent).
    "neurodivergent"]),
  care("substance-history", "Substance history held safely", 26, [
    /* O123: same register as "I drink more than I should", which the year plan uses as its own
       worked example of the G7 line, a disclosure made in order to ask that the conversation
       be held safely. This facet has read that register since it was written. */
    "clean two years", "past drug use",
    "drink", "drinking", "alcohol", "cannabis", "substance", "non-stimulant",
    // O49: the word people actually use. Two content tokens, so a garden stays a garden.
    "smoke weed",
    /* O107, first register: THE SUBSTANCES THE LIST NEVER LEARNED. The lexicon knew the two
       legal ones and none of the rest, which reads as a list written quickly rather than one
       that made a judgement. Each is a single unambiguous word, no collapse rule applies to
       a one-WORD cue, and naming a substance is the established reading for this facet, not
       a new one: the header of this module uses it as the worked example of G7's preference
       reading ("I drink more than I should" is a request about how a conversation is held,
       not a finding about the person). */
    "methamphetamine", "opioids", "cocaine", "suboxone", "heroin", "vaping weed",
    /* O107, second register: RECOVERY — how people raise this most carefully, and where the
       finder heard nothing at all. Somebody who volunteers "I am in recovery" is asking to be
       met a particular way, which is the whole facet.

       "in recovery" is deliberately TWO WORDS that collapse to one token, which makes the O45
       rule demand the authored pair in the raw stream. That is precisely what makes it safe:
       bare "recovery" fires on "recovery time after surgery", and the pair does not. */
    "in recovery", "sober",
    /* FOUR REFUSED ON MEASUREMENT (O103's method, now standard):
         "clean"     fires on "a clean bill of health"
         "recovery"  fires on "recovery time after surgery", hence the pair above
         "drug use"  fires on "the drug I use works well"
         "ice"       fires on "ice packs for the headaches", the Australian street term is
                     the tempting one and the least safe of all
       Their sentences stay aspirations. A facet about meeting somebody without raised
       eyebrows is the last place to accept a cue that fires on a bill of health. */
  ]),
  care("emotional-regulation", "Emotional regulation", 24, [
    /* O114: THE WANT HALF ONLY, and the cues are shaped to require it. Each of these carries
       the HELP-WITH framing or names the emotional side as a thing to be TAKEN SERIOUSLY —
       "help with the anger", "help with the rage", rather than the emotion word alone.

       The bare words are deliberately absent and pinned absent. "rejection hits me like a
       truck", "my temper goes from zero to a hundred", "my moods flip fast and I say things I
       regret", "crying at work over nothing" are the reader describing their own state, and
       this module's header names that exact trap: a prior probe closed a "recall gap" by
       cueing DSM inattention text into a care facet. Cueing "anger" or "rage" would do the
       same thing to this one. The state half stays standing and goes to the founder question
       with trauma's and attuned's, the third facet to split the same way. */
    "help with the anger", "help with the rage", "the emotional side",
    "rejection sensitivity", "rsd", "emotional regulation", "shame",
    /* O119 REMOVED bare "overwhelmed" and kept the want-framing, which is O114's rule applied
       to the word that unit did not reach. "somebody calm, because I arrive overwhelmed" is a
       person describing their own state and asking for a CALM GP, it reaches
       `manner:steadying` on "calm", correctly, and reading it into a care facet as well is the
       DSM-text trap this module's header names. "overwhelmed" survives in the steadying cue
       list, where it expresses a preference about the clinician rather than a finding about
       the reader. */
    "help with the overwhelm", "feeling overwhelmed by",
    // O17: this area's own doc comment calls dysregulation "what people describe first" — and
    // "emotional dysregulation" reached nothing, because "dysregulation" does not stem to
    // "regulation". The clinical word and the plain phrasings people actually use, added.
    "dysregulation", "big emotions", "big feelings", "emotions take over",
  ]),
  /* O262 (founder, 2026-09-30): "Non-medication supports are when someone explicitly says, 'I don't want
     medication supports,' or 'I'm looking for less medicated options like therapy.'" A person who asks for
     help at work, a coach, strategies or therapy has declined nothing, and that help may include medication.
     So every cue here says NO to medication in its own words, or names the thing wanted in its place; the
     softer ones ("strategies first", "psychological approaches") count only in a sentence that mentions
     medication somewhere (SOFT_NON_MEDICATION, below). "coaching" and "habits" left for
     care:executive-function, where the coaches declare them. */
  care("non-medication", "Non-medication supports", 26, NON_MEDICATION_CUES),
  care("perinatal", "Pregnancy, postpartum and new parents", 26, [
    /* R15: the founder's postpartum call, which nothing in the vocabulary could hear. Single words
       are the clinical and the everyday terms, each precise on its own; the pairs keep two content
       tokens (O25), and "had a baby" collapses to [baby] under the O45 skeleton demand, so bare
       "baby" ("my baby brother", "baby steps") never reaches here. "mum" alone is never cued: family
       presence ("my mum in the room") belongs to manner:culturally_attuned. */
    "postpartum", "postnatal", "post-natal", "perinatal", "antenatal", "pregnant", "pregnancy", "breastfeeding", "newborn", "maternity",
    "post partum", "post natal", "new mum", "new mother", "new parent", "new dad", "new baby", "had a baby", "having a baby", "expecting a baby",
    "baby came", "baby arrived", "gave birth", "giving birth", "baby brain",
    // 2026-09-29: the voice interviewer wrote "understands new mums", and the stemmer leaves a four-letter plural alone.
    "new mums", "new dads",
  ]),

  /**
   * ── How somebody wants to be treated while it happens ──────────────────────────────────────
   *
   * DERIVED FROM `EI_QUALITIES` RATHER THAN RESTATED. Their cue lists and reader-facing labels are
   * the source of truth; restating them here would recreate the two-lexicon drift this unit
   * exists to remove. Weight is uniform because these are alternatives to each other, not a
   * ranking of which way of working is better — that judgement is not the product's to make.
   */
  ...EI_QUALITY_KEYS.map((quality) =>
    manner(quality, EI_QUALITIES[quality].label, 24, mannerPhrases(quality)),
  ),

  // ── Access ────────────────────────────────────────────────────────────────────────────────
  // "A woman clinician", not "A woman GP": the roster holds psychologists, OTs and coaches now, and
  // the label is printed beside every kind the preference reaches.
  /* O261: the life domains. Weights sit with the roster's other care facets (22 to 26); the strong tier orders
     them together with the rest of what was asked, and a person who said "help at work with focus" sees the
     coaches, who declare both, before anyone who declares one. */
  care("executive-function", "Focus and getting things done", 26, EXECUTIVE_FUNCTION_CUES),
  care("work-career", "Work and career", 24, WORK_CAREER_CUES),
  care("study-school", "School, study and learning", 24, STUDY_SCHOOL_CUES),
  care("parenting", "Parenting", 24, PARENTING_CUES),
  care("relationships", "Relationships and couples", 24, RELATIONSHIPS_CUES),
  care("social-connection", "Friendships and social skills", 22, SOCIAL_CONNECTION_CUES),
  care("late-diagnosis", "Adjusting to a late diagnosis", 22, LATE_DIAGNOSIS_CUES),
  care("grief-life-change", "Grief and big life changes", 22, GRIEF_LIFE_CHANGE_CUES),
  care("sleep", "Sleep", 22, SLEEP_CUES),
  care("eating-body", "Eating and body image", 26, EATING_BODY_CUES),
  care("womens-health", "Women's health and hormones", 24, WOMENS_HEALTH_CUES),
  care("movement-exercise", "Exercise and movement", 22, MOVEMENT_EXERCISE_CUES),
  care("cultural-background", "Understands your cultural background", 26, CULTURAL_BACKGROUND_CUES),
  pref("woman-gp", "A woman clinician", 30, [
    /* O128 (tranche seven): "female practitioner" — the corpus asked for it in a sentence the
       existing "female gp" and "female doctor" could not read. The tranche's job is to supply
       the phrasings the author of a cue list did not think of, and this is one. */
    "female practitioner",
    /* O125 WROTE "not a man" HERE AND THE SUITE REVERSED IT, correctly: O114 had already measured
       that cue and refused it, because it fires on "my GP is not a man of many words", a real
       English idiom about somebody being terse. §O114's pin caught the re-add within a minute.
       "a she not a he" was refused separately: it strips to [not] alone, with no content word
       to anchor a pair. Both phrasings stay standing, and the refusals are now in
       REFUSED_CUES so the next author meets them before writing rather than after. */
    "woman gp", "female gp", "woman doctor", "female doctor", "prefer a woman",
    /* O114: the words Australians actually use. Six sentences were lost to a synonym list on
       a preference this roster can genuinely answer, so every one was a reader who would have
       been ordered correctly and was not. Nobody here is describing themselves, they are
       naming who they want to see, so there is no judgement in this half of the unit at all.

       TWO REFUSED, both measured:
         "not a man"      fires on "my GP is not a man of many words", a real English idiom
         "a she not a he" collapses to the single token [not], which is far too loose to ship
                          under any pair rule, hearing it needs the raw RUN demand, and one
                          sentence does not earn a mechanism (the O84 bar) */
    "lady doctor", "lady gp", "safer with a woman", "women doctors",
    /* 2026-09-28, the voice finder's evaluation (qa/matching/rca.md R11): a woman is asked for beside
       every kind of clinician the roster holds, and "a woman psychologist" read as nothing. Each cue
       names the clinician, so "I'm a woman with ADHD", a person describing herself, still reads
       nothing here; that sentence is pinned. */
    "woman clinician", "female clinician", "woman psychologist", "female psychologist",
    "woman psychiatrist", "female psychiatrist", "woman counsellor", "female counsellor",
    "woman therapist", "female therapist", "woman paediatrician", "female paediatrician"]),
  /* O257 (founder, 2026-09-29, docs/matching/HIGH-YIELD.md): a clinician who has ADHD themselves.
     Three of 37 say so in their own words; people ask for it, and it changes who they see. Every
     cue names the CLINICIAN: "I have ADHD myself" is the person and reaches nothing here, and
     "someone with ADHD" was left out because a carer says it of the person they are asking for. */
  pref("lived-experience", "Has ADHD themselves", 30, [
    "clinician with adhd", "clinician who has adhd", "gp with adhd", "gp who has adhd", "psychologist with adhd", "psychologist who has adhd",
    "coach with adhd", "coach who has adhd", "therapist with adhd", "therapist who has adhd", "counsellor with adhd",
    "has adhd themselves", "has adhd herself", "has adhd himself", "have adhd themselves", "adhd themselves", "adhd herself", "adhd himself",
    "lived experience", "been through it themselves", "knows it from the inside", "gets it from the inside", "adhd from the inside", "diagnosed themselves", "diagnosed herself", "diagnosed himself",
    ...LIVED_DIAGNOSED,
  ]),
  /* O261: an NDIS plan is a hard fact about who a person can see; six of 37 say they see participants. */
  pref("ndis", "For NDIS participants", 28, NDIS_CUES),
  pref("telehealth-first", "By phone or telehealth", 28, [
    /* O128: "immunosuppressed" beside O125's "immunocompromised". They are the same reason in
       two words people use interchangeably, and stemming does not bridge them, a reader does
       not get to be unheard because they picked the other one. */
    "immunosuppressed",
    /* O125: the two REASONS people give for wanting telehealth rather than the word itself. A
       reader who says why does not also say "telehealth", which is exactly the register a
       cue list built from the feature name misses. */
    "immunocompromised", "phone calls easier","telehealth", "by phone", "over the phone", "remote", "online",
    // O53: video is how half of them say it, and "phone first" is the ask in appointment order.
    "video appointment", "video call", "phone first",
    /* O108: VIDEO AS A PREPOSITION, and the appointment noun the list somehow lacked.
       "by video" and "over video" collapse to [video] and therefore ship under O45's rule
       demanding the authored pair, which is what makes them safe, because bare "video"
       fires on "I watched a video about ADHD". Same device as O107's "in recovery": the
       precision comes from a mechanism already here rather than a new one.

       "phone appointments" sounds like it should already have worked and did not: "by phone"
       collapses to [phone] and rightly demands its pair, so the commonest way anybody says
       this reached nothing at all. */
    "by video", "over video", "video only", "video reviews", "phone appointments",
    /* THE REGISTER THIS UNIT COULD NOT SAFELY HEAR, and the reason is worth the space.
       Three corpus sentences ask for telehealth by refusing the alternative, "no more
       waiting rooms", "clinic visits are a risk", "phone calls easier than visits". The want
       is real and it is the other side of what they said. But a cue read off the AVOIDED
       thing cannot tell the ask from its mirror image, and each of these was measured firing
       on a sentence meaning the OPPOSITE:
         "clinic visits" fires on "I would prefer clinic visits to telehealth"
         "phone calls"   fires on "I hate phone calls, please do it in person"
         "waiting rooms" fires on "the waiting room makes my anxiety worse", an anxiety
                         sentence, and the [wait, room] collision O84 already paid for
       Hearing the want here needs to read the REFUSAL and invert it, which is a mechanism
       (the negation family, pointed the other way) and not a cue. Left standing, deliberately.
       "video only" survives this test because it names the wanted thing, not the avoided one. */
  ]),
  pref("bulk-billing", "Bulk billing", 24, ["bulk bill", "bulk billed", "bulk billing", "cannot afford", "cheap",
    /* O109: THE FACET KNEW ITS OWN NAME AND NO SYNONYM FOR THE THING IT IS ABOUT. All six of
       its standing aspirations asked about money in words the list did not contain, out of
       pocket, gap fees, Medicare-only, "does it cost anything", on the ask most likely to
       decide whether somebody books at all.

       "out of pocket" collapses to [pocket] and so ships under O45's pair demand, which is
       what keeps it honest. */
    "out of pocket", "gap fee", "gap fees", "medicare only", "cost anything",
    "how much does it cost",
    /* "no out of pocket" CARRIES ITS OWN NEGATOR, the O104 lesson met a second time: the bare
       cue is present in "no out of pocket costs please" and reached nothing, because O72 read
       the adjacent "no" as a refusal of the facet, when wanting NO out-of-pocket cost is
       precisely the bulk-billing ask. The negator has to live inside the cue's own words. */
    "no out of pocket",
    /* TWO REFUSED, AND THE FIRST IS THE MOST IMPORTANT REFUSAL IN THE DAY'S SWEEPS:
         "cannot pay" fires on "I CANNOT PAY ATTENTION for long", an ADHD symptom sentence,
                      and reading that as a request about billing would be both wrong and
                      exactly the kind of wrong G7 exists to prevent. The two corpus sentences
                      it was meant for are covered by "gap fees" and "medicare only" anyway.
         "free"       fires on "free up my afternoons". */
  ]),
  pref("longer-appointment", "A longer first appointment", 20, [
    /* O116: "double slot" and "forty minutes" — and the comparative itself now reaches through
       the stemmer entry rather than through a cue, so every "long…" cue O65 wrote hears
       "longer" too. "more than fifteen minutes" stays refused exactly as O65 refused it. */
    "double slot", "forty minutes","longer first appointment",
    // O65 (the O22 loop on O64's corpus finding): the facet carried ONE three-token cue, so
    // the commonest phrasings of this ask were all unheard — measured, not guessed, in
    // corpus tranche three. Each cue keeps two content tokens (the O25 collapse rule).
    // "more than fifteen minutes" stays UNCUED on purpose: it strips to [fifteen, minute],
    // which is also how distance talk reads ("fifteen minutes from the station"), and that
    // precision is not worth this recall — the corpus carries it as a standing aspiration.
    "long appointment", "long consult", "double appointment", "double session", "extended appointment"]),
];

/**
 * One authored phrase, ready to match: both tokenisations the matcher uses, whether it
 * collapsed, and the facet it speaks for.
 *
 * O101 named this type. It was written inline on `CUES` and reached for elsewhere as
 * `(typeof CUES)[number]`, which made the matcher's central record legible only by
 * inference from the expression that happened to build it.
 */
type Cue = {
  phrase: string;
  tokens: string[];
  raw: string[];
  collapsed: boolean;
  entry: Entry;
};

/*
 * THE CUE TABLE IS BUILT IN FOUR NAMED STAGES (O101).
 *
 * It used to be one chained expression under two doc comments stranded above it in an order
 * that read backwards — the paragraph about sort order sat directly above the dedup loop, which
 * answers a different question. Every comment below is the original prose, moved to the stage
 * it is actually about. No step changed.
 */

/**
 * STAGE 1 — A PHRASE BELONGS TO ONE FACET, and the first entry to list it wins (O7/F10).
 * "overwhelmed" appears in both `care:emotional-regulation` and the steadying manner cues;
 * before this dedup the second copy was DEAD — the stable sort meant the earlier entry always
 * claimed the words, and nothing said so. Dropping later duplicates makes the same behaviour
 * explicit, keeps the self-reach pin honest (every cue in `LEXICON_CUES` genuinely reaches its
 * facet), and leaves the emotional-fit interview's own use of its cue lists untouched.
 */
const FIRST_CLAIM = new Map<string, { phrase: string; entry: Entry }>();
for (const entry of LEXICON) {
  for (const phrase of entry.phrases) {
    if (!FIRST_CLAIM.has(phrase)) FIRST_CLAIM.set(phrase, { phrase, entry });
  }
}

/**
 * STAGE 2 — pre-tokenise, both ways, once.
 *
 * The matcher reads a stripped stream and a raw one, so every cue carries both rather than
 * being re-tokenised per sentence.
 */
const TOKENISED_CUES: readonly Cue[] = [...FIRST_CLAIM.values()].map(({ phrase, entry }) => ({
  phrase,
  tokens: tokenise(phrase),
  raw: tokeniseKeepingStopwords(phrase),
  /* O45: an authored multi-word phrase that ships as at most one content token is matched
     under the collapse-aware rule, see `collapsedCueSatisfied` in read.ts. Computed here,
     once, from the same two tokenisations the matcher itself uses, so the rule's membership
     can never drift from what actually collapses. */
  collapsed: phrase.trim().split(/\s+/).length >= 2 && tokenise(phrase).length <= 1,
  entry,
}));

/**
 * STAGE 3 — drop cues that tokenise to nothing at all.
 *
 * A phrase made entirely of stopwords has no content token to match on, so it would either
 * match everything or nothing depending on the rule that read it. Neither is a cue.
 */
const MATCHABLE_CUES: readonly Cue[] = TOKENISED_CUES.filter((cue) => cue.tokens.length > 0);

/**
 * STAGE 4 — most specific first.
 *
 * ORDER MATTERS AND THE REASON IS A REAL DEFECT IT PREVENTS. "not just medication" contains
 * "medication"; "treated for anxiety" contains "anxiety". Reading short cues first would let a
 * general term claim a sentence whose specific term says something different — in the first case
 * close to the opposite. Sorted by TOKEN count now rather than character length, because that is
 * what specificity means once matching is done on tokens.
 */
const CUES: readonly Cue[] = [...MATCHABLE_CUES].sort(
  (a, b) => b.tokens.length - a.tokens.length || b.phrase.length - a.phrase.length,
);

/**
 * Read what somebody said into the closed vocabulary.
 *
 * Deterministic and total: the same text always yields the same signals, and text that reaches
 * nothing yields an empty list rather than a guess. An empty list is a supported outcome — the
 * finder says so (`matchQuality`) rather than presenting an arbitrary order as a ranking.
 *
 * MATCHING IS ORDERED-SUBSEQUENCE OVER STEMMED TOKENS — see `read.ts` for why, and for the two
 * failure classes it fixes that a substring search could not. The claiming below is unchanged in
 * spirit: a cue that matched some words takes them, so one clause produces one facet.
 *
 * THIS IS THE PLUGGABLE HALF of docs/MATCHING-PLAN.md's architecture. A dense retriever lands here
 * behind this same signature and everything downstream is unchanged, because what crosses the
 * boundary is a closed vocabulary rather than a similarity score.
 */
// R15: "had a baby" collapses to [baby]; the any-pair rule is satisfied by "was a baby", so the full run is demanded.
const RUN_DEMANDED = new Set([
  "over the phone", "in the room with me", "had a baby",
  ...FIRST_PERSON_ASKS, ...CONTINUING_CARE, ...LIFE_RUN, ...NON_MEDICATION_CUES,
  /* O257: every lived-experience cue demands its full raw run, collapsed or not. "gp who has adhd"
     collapses to [gp, adhd] and, matched across a gap, read "a GP for my drinking history and my
     ADHD" as a wish for a GP with ADHD, taking the "adhd" the assessment cue needed. The person
     saying it says it in one breath: "a psychologist who has ADHD herself". */
  "clinician with adhd", "clinician who has adhd", "gp with adhd", "gp who has adhd", "psychologist with adhd", "psychologist who has adhd", "coach with adhd", "coach who has adhd", "therapist with adhd", "therapist who has adhd", "counsellor with adhd", "has adhd themselves", "has adhd herself", "has adhd himself", "have adhd themselves", "adhd themselves", "adhd herself", "adhd himself", "lived experience", "been through it themselves", "knows it from the inside", "gets it from the inside", "adhd from the inside", "diagnosed themselves", "diagnosed herself", "diagnosed himself",
  ...LIVED_DIAGNOSED,
]);

/** O256: the assessment cues that merely name the condition or the diagnosis; disclosure once the diagnosis is said to exist. */
const DISCLOSURE_WORDS = new Set(["adhd", "diagnosis", "diagnosed"]);
/** "understands ADHD", "knows about adult ADHD", "experienced with ADHD in women": the clinician's knowledge, not the person's ask. */
const KNOWS_ADHD = /\b(?:understands?|understanding|understood|knows?|gets|familiar with|experienced? (?:with|in)|works? with|good with|trained in|knowledge of)\s+(?:about\s+)?(?:adult\s+|adults with\s+|women'?s\s+|women with\s+|childhood\s+|my\s+)?adhd\b/gi;
function adhdOnlyAsWhatTheyKnow(text: string): boolean {
  const named = text.match(/\badhd\b/gi)?.length ?? 0;
  return named > 0 && (text.match(KNOWS_ADHD)?.length ?? 0) >= named;
}

export function readNeeds(text: string): NeedSignal[] {
  const sentence = tokenise(text);
  // The same words with the function words kept, for the collapse-aware rule only (O45).
  const rawSentence = tokeniseKeepingStopwords(text);
  const signals: NeedSignal[] = [];
  const seen = new Set<string>();
  /* O106: the token positions already spoken for. Positions, not ranges — a cue claims the
     words it MATCHED, never the words it straddled. See the claiming step below. */
  const claimed = new Set<number>();

  /* PHASE 1 (O78 shape, O81 arrangement): collect every occurrence of every cue that
     survives the occurrence-local rules. findCue retries past a refused span (O78: a
     clause-one refusal must not silence a clause-two ask); the sentence-global collapse
     check skips the cue outright. Desire negation is deliberately NOT decided here —
     it needs to see all spans at once, which is the whole of O81. */
  type Candidate = { cue: Cue; from: number; to: number; at: number[] };
  const candidates: Candidate[] = [];
  for (const cue of CUES) {
    /* O45 (Q1 item 1): a cue that collapsed to one content token fires only when the sentence
       also carries an adjacent pair of the cue's AUTHORED words, "out the door" must look
       like "out the door" somewhere, not merely contain "door". A refused collapsed cue
       claims nothing, so the words stay readable by any cue that genuinely matches them.
       SENTENCE-GLOBAL (the pair test reads the whole raw stream), so no retry can help. */
    /* O94: two collapsed cues demand their FULL raw run rather than any pair — the
       opt-in read.ts's collapsedCueRunPresent documents. "over the phone" leaked through
       [the, phone] onto a phone-menu complaint (O87's pin); "in the room with me" is
       O25's removed phrase come home, every pair design leaked (O84's measurements) and
       the run hears the presence ask while staying silent on "with someone", waiting
       rooms and cold rooms. A cue with a contraction form must never join this set. */
    if (
      (cue.collapsed || RUN_DEMANDED.has(cue.phrase)) &&
      !(RUN_DEMANDED.has(cue.phrase)
        ? collapsedCueRunPresent(rawSentence, cue.raw)
        : collapsedCueSatisfied(rawSentence, cue.raw))
    ) {
      continue;
    }
    let searchFrom = 0;
    while (true) {
      const at = findCue(sentence, cue.tokens, searchFrom);
      if (!at) break;
      searchFrom = at.from + 1;
      /* O76 (the rule O75's hedge pin demanded): a cue sitting wholly inside a conversational
         hedge is filler, not an ask, "a she not a he, if that makes sense" must not reach
         sense_making. The mapping is span-precise, so a genuine ask elsewhere in the sentence
         keeps reaching, before the hedge via findCue's order, after it via the O78 retry. */
      if (withinHedge(sentence, rawSentence, at.from, at.to)) continue;
      /* O77 (O75's other pin): "for my mum" / "on behalf of my mum" names the PATIENT, not a
         relative joining the appointment, so the culturally_attuned reading stands down. ONLY
         that facet: the child facet's whole register is on-behalf ("this is for my teenager"
         IS the ask), the same exemption shape O40 gives manner. */
      if (
        facetKey(cue.entry.facet) === "manner:culturally_attuned" &&
        onBehalfBefore(sentence, rawSentence, at.from, at.to)
      ) {
        continue;
      }
      /* O120: the counter-signal the child facet needs precisely BECAUSE O77 exempts it. That
         exemption says on-behalf IS this facet's register, which is right, and it leaves the
         facet with no way to hear a sentence where the relative is CONTEXT rather than the
         patient. "after my son was diagnosed I recognised myself and now I want my own
         assessment" is an adult asking for their own assessment, and the facet firing ranks
         paediatric GPs for them: a wrong appointment, not a shade of emphasis. "my own" is the
         narrowest construction that says it (see `selfClaimedPatient` for why a general
         self-reference is unsafe and unmeasurable here). */
      if (
        facetKey(cue.entry.facet) === "care:child-adolescent-adhd" &&
        selfClaimedPatient(rawSentence)
      ) {
        continue;
      }
      /* O256: a diagnosis the reader already has is disclosure, not an assessment ask. "I already
         have a diagnosis and need my ADHD medication continued" reached care:adhd-assessment on
         "diagnosis" and on "adhd", and the shared-care GP who continues medication, and says he does
         not assess, showed "Not in their listing: ADHD assessment" to the one person who never asked
         for one. Only the bare words stand down, and only once the raw words say the diagnosis is
         made (`diagnosisAlreadyMade`); an assessment asked for in its own words still reaches, as
         O120's adult does ("after my son was diagnosed … I want my own assessment"). */
      if (
        facetKey(cue.entry.facet) === "care:adhd-assessment" &&
        DISCLOSURE_WORDS.has(cue.phrase) &&
        diagnosisAlreadyMade(rawSentence)
      ) {
        continue;
      }
      /* O263: ADHD named only as what the clinician should know is no assessment ask. "someone who
         understands adult ADHD from personal experience" (a simulated patient, 2026-09-30) was read as an
         ADHD assessment for a person diagnosed the year before. The bare word stands down when every
         "ADHD" in the sentence is governed that way; an assessment asked for in its own words still reaches. */
      if (facetKey(cue.entry.facet) === "care:adhd-assessment" && cue.phrase === "adhd" && adhdOnlyAsWhatTheyKnow(text)) {
        continue;
      }
      /* O262: a soft non-medication cue declines nothing on its own. "strategies first, tablets later" is
         about medication and "I want strategies first" is not, and the difference is whether the
         sentence mentions medication at all. */
      /* O262: "I don't want medication changes" is a person on medication asking for it to be left alone. */
      if (facetKey(cue.entry.facet) === "care:non-medication" && MEDICATION_LEFT_ALONE.test(text)) {
        continue;
      }
      if (
        facetKey(cue.entry.facet) === "care:non-medication" &&
        SOFT_NON_MEDICATION.has(cue.phrase) &&
        !rawSentence.some((word) => MEDICATION_WORDS.has(word))
      ) {
        continue;
      }
      /* O72: a bare "no"/"not" immediately before a care/pref cue span is a refusal ("not
         bulk billing, I am happy to pay for time"), UNLESS the raw stream shows the
         additive "not just" idiom pointing at this cue ("assess me for ADHD, not just the
         anxiety" means anxiety AND MORE). Adjacency-tight, so it is already consume-once
         and stays an occurrence-local check; the negator inside a cue's own phrase is
         untouched because the check looks strictly before the span. Manner exempt (O40). */
      /* O83 joins the same guard: a reporting verb directly before the negator marks the
         refusal as somebody ELSE's, "they said no to titration and I want it anyway" is a
         complaint, which O40/O72 read as a want everywhere else, unless the raw stream
         shows the reader reporting their OWN no ("I said no to titration"), which is a
         refusal that stands. */
      if (
        (cue.entry.facet.kind === "care" || cue.entry.facet.kind === "preference") &&
        bareNegatorBefore(sentence, at.from) &&
        !softenedNotJust(rawSentence, cue.tokens[0]!) &&
        !reportedRefusal(sentence, rawSentence, at.from)
      ) {
        continue;
      }
      /* O92 (O87's second pin): a cue that carries its OWN negator means DECLINING the
         thing, unless the raw determiner says the reader is LACKING it. "what can we do
         without medication" declines; "leaving me without MY script" is a supply
         complaint, and reading it as a non-medication preference was the pinned false
         positive. Same claims-nothing rule, same care/pref scope. */
      if (
        (cue.entry.facet.kind === "care" || cue.entry.facet.kind === "preference") &&
        isTightNegator(cue.tokens[0]!) &&
        lackingNotDeclining(sentence, rawSentence, at.from, at.to)
      ) {
        continue;
      }
      candidates.push({ cue, from: at.from, to: at.to, at: at.at });
    }
  }

  /* PHASE 2 (O81, the O78 audit's headline demand): a desire negation spends itself on the
     NEAREST following span, and only that one, "I don't want a woman GP, bulk billing
     matters more" refuses the woman GP and keeps the bulk-billing ask, where O40's
     everything-in-lead scope suppressed both. MANNER stays exempt exactly as O40 designed
     ("I don't want to feel rushed" IS the not_rushed ask) but now also SPENDS the trigger,
     so a care ask sitting behind a manner object is no longer swallowed. Scope per trigger
     is unchanged: forward, within the lead, never across a clause boundary. */
  const negated = suppressedByDesireNegation(
    sentence,
    candidates.map((candidate) => ({
      from: candidate.from,
      negatable:
        candidate.cue.entry.facet.kind === "care" || candidate.cue.entry.facet.kind === "preference",
    })),
    // O105: where the commas were. A comma ends a negation's scope without ending a cue's.
    commaBreaksBefore(text),
  );

  /* PHASE 3: claiming, in the same specificity order as always. A suppressed occurrence
     claims nothing; words another facet claimed are occupied, not poisoned, so a later
     occurrence of the same cue may still land (the O78 retry, preserved). */
  candidates.forEach((candidate, index) => {
    if (negated.has(index)) return;
    const { cue } = candidate;
    /* O106: A CUE CLAIMS THE WORDS IT MATCHED, NOT THE WORDS IT STRADDLED.
       This compared RANGES, so a cue matching across a gap marked the intervening tokens
       spoken for as well. manner:attuned's "take seriously" therefore claimed
       [take, trauma, seriously] in "a gentle GP who takes trauma seriously", and the word
       "trauma", which that cue never matched, was unavailable to the trauma cue that
       would have. The reader's own word went to another facet and vanished from the read.
       Specificity ordering still does its work: "not just medication" claims [not,
       medication], so the bare "medication" cue finds its token taken exactly as before. */
    if (candidate.at.some((position) => claimed.has(position))) return;

    const key = facetKey(cue.entry.facet);
    /* O258 (2026-09-29): a facet already heard still CLAIMS the words a later cue of its own
       matched, and only the signal is not repeated. Before this the second cue claimed nothing,
       so in "someone who has ADHD themselves and gets it from the inside" the longer cue landed
       first, "has ADHD themselves" was skipped whole, and the bare "adhd" it should have taken
       went to care:adhd-assessment: a person asking for a clinician with ADHD was sent for an
       assessment. The words a person spent on one thing are that thing's, however many times
       they say it. */
    for (const position of candidate.at) claimed.add(position);
    if (seen.has(key)) return;
    seen.add(key);
    signals.push({
      facet: cue.entry.facet,
      matched: cue.phrase,
      label: cue.entry.label,
      weight: cue.entry.weight,
    });
  });

  return signals;
}

/**
 * Whether a clinician's declared record answers an access preference.
 *
 * ONE PLACE (O5/F7). This predicate used to live only inside the ranker's `answers`, which
 * meant the clarifier could not compute `heldBy` for preference facets and so never asked the
 * questions that separate rosters hardest — "do you want a woman GP" splits any mixed roster
 * and is the single most-stated preference in real directory search. The parameter is
 * structural on purpose: this file cannot import the `Clinician` type without a cycle, and the
 * four fields named here are the whole of what a preference reads.
 */
export function holdsPreference(
  clinician: {
    gender: string;
    telehealthFirstAppointment?: boolean;
    livedExperience?: boolean;
    ndis?: boolean;
    manner: readonly string[];
    practicalSignals: readonly string[];
  },
  preference: Preference,
): boolean {
  switch (preference) {
    case "woman-gp":
      return clinician.gender === "woman";
    case "lived-experience":
      return clinician.livedExperience === true;
    case "ndis":
      return clinician.ndis === true;
    case "telehealth-first":
      return clinician.telehealthFirstAppointment === true;
    case "longer-appointment":
      return clinician.manner.includes("not_rushed");
    case "bulk-billing":
      return clinician.practicalSignals.some((signal) => /bulk/i.test(signal));
  }
}

/** Stable identity for a facet, so a reader asking twice for one thing counts once. */
export function facetKey(facet: NeedSignal["facet"]): string {
  if (facet.kind === "care") return `care:${facet.area}`;
  if (facet.kind === "manner") return `manner:${facet.trait}`;
  if (facet.kind === "language") return `language:${facet.language.toLowerCase()}`;
  return `pref:${facet.preference}`;
}

/** The signal a facet key stands for, for a reader that returns keys rather than phrases. */
export function needForKey(key: string, matched: string = key): NeedSignal | null {
  const language = MATCHABLE_LANGUAGES.find((name) => key === facetKey({ kind: "language", language: name }));
  if (language) return { facet: { kind: "language", language }, matched, label: `${language}-speaking`, weight: LANGUAGE_WEIGHT };
  const entry = LEXICON.find((candidate) => facetKey(candidate.facet) === key);
  return entry ? { facet: entry.facet, matched, label: entry.label, weight: entry.weight } : null;
}

/**
 * A language the reader asked for, read against the languages the roster actually declares.
 *
 * WHY THIS IS NOT IN THE LEXICON. Every other facet is a fixed vocabulary shared by all
 * clinicians, so it can live in the static table above. Languages are per-clinician DATA: a
 * static lexicon would have to enumerate every language any clinician might ever speak, a list
 * that goes stale the day somebody who speaks Tamil joins. Reading against the roster's own
 * declarations keeps the property that matters — no per-clinician WEIGHT anywhere — while
 * letting the vocabulary grow with the roster.
 *
 * WHY IT IS IN THIS FILE ANYWAY (the F2 repair). Until the overhaul this lived beside
 * `matchEvidence` as a raw `String.includes` — the exact mechanism W222 tore out of the lexicon
 * for cause — and its signals were shown on the card but never seen by the score, so a
 * language-only query rendered "unmatched" beside a card explaining a ranking that never
 * happened. It now goes through the same tokenise-and-stem pipeline as every cue and returns
 * ordinary `NeedSignal`s, so the ranking, the quality verdict and the explanation all read it
 * or none of them do.
 *
 * English is excluded: "speaks English" is not a match reason in Australia, it is the
 * assumption. And a language the reader never mentioned is never a signal — telling somebody
 * their GP speaks a language they did not ask about is a guess about who they are.
 */
export function languageNeeds(text: string, spoken: readonly string[]): NeedSignal[] {
  const tokens = new Set(tokenise(text));
  const signals: NeedSignal[] = [];
  const seen = new Set<string>();
  for (const language of spoken) {
    if (language.toLowerCase() === "english") continue;
    const key = facetKey({ kind: "language", language });
    if (seen.has(key) || !tokens.has(stem(language.toLowerCase()))) continue;
    seen.add(key);
    signals.push({
      facet: { kind: "language", language },
      matched: language.toLowerCase(),
      label: `${language}-speaking`,
      weight: LANGUAGE_WEIGHT,
    });
  }
  return signals;
}

/**
 * Same tier as the lexicon's strongest facets (30/20/12): an asked-for language is a hard
 * requirement of the appointment, not a nice-to-have, and it was already rendered at this
 * weight before it was scored at all.
 */
const LANGUAGE_WEIGHT = 30;

/** Every label a surface may say back, for the test that pins the vocabulary closed. */
export const NEED_LABELS: readonly string[] = LEXICON.map((entry) => entry.label);

/**
 * A label in two words or fewer, for a chip. Only labels longer than that carry one here; a
 * manner's sits beside its label in `EI_QUALITIES`. Same facet, same voice: a care preference,
 * never a finding about the reader.
 */
const SHORT_LABELS: Readonly<Record<string, string>> = {
  "care:child-adolescent-adhd": "Children, teens",
  "care:titration": "Dose review",
  "care:shared-care": "Shared care",
  "care:depression": "Low mood",
  "care:complex-mental-health": "Complex care",
  "care:autism-adhd": "Autism",
  "care:substance-history": "Substances, safely",
  "care:perinatal": "Postpartum",
  "pref:woman-gp": "Woman clinician",
  "pref:lived-experience": "Lived experience",
  "pref:telehealth-first": "Telehealth",
  "pref:longer-appointment": "Longer appointment",
  "pref:ndis": "NDIS",
  // O261: the life domains, in two words.
  "care:executive-function": "Getting organised",
  "care:work-career": "At work",
  "care:study-school": "School, study",
  "care:relationships": "Relationships",
  "care:social-connection": "Social skills",
  "care:late-diagnosis": "Late diagnosis",
  "care:grief-life-change": "Life changes",
  "care:eating-body": "Eating",
  "care:womens-health": "Women's health",
  "care:movement-exercise": "Exercise",
  "care:cultural-background": "Cultural background",
};

export function shortLabel(need: Pick<NeedSignal, "facet" | "label">): string {
  if (need.facet.kind === "manner") return EI_QUALITIES[need.facet.trait].short ?? need.label;
  return SHORT_LABELS[facetKey(need.facet)] ?? need.label;
}

/** Every lexicon label with its chip words, for the test that holds each chip to its cap. */
export const NEED_SHORT_LABELS: ReadonlyArray<{ label: string; short: string }> = LEXICON.map((entry) => ({
  label: entry.label,
  short: shortLabel(entry),
}));

/**
 * Every phrase in the lexicon with the facet it belongs to, for the self-reachability pin
 * (O7/F10): a stemmer or tokeniser edit that silently unhooks a cue from its own facet must
 * fail a test, not wait for a probe. Phrases only — no weights, no labels — so nothing new is
 * sayable from here.
 */
export const LEXICON_CUES: ReadonlyArray<{ phrase: string; key: string }> = [...FIRST_CLAIM.values()].map(
  ({ phrase, entry }) => ({ phrase, key: facetKey(entry.facet) }),
);
