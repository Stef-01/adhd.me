// W193 (O100): the roster DATA — the `Clinician` type and every entry — split out of
// clinicians.ts so a roster edit can never touch a ranking line. Nothing here is new: the
// type, the entries and the real-person header below moved verbatim, and clinicians.ts
// re-exports both, so this is a seam and not a rename — every import site in the tree still
// says "@/demo/clinicians".
//
// WHY THE SEAM IS WORTH HAVING HERE SPECIFICALLY: every entry is a real person. A change in
// this file is a factual claim about a named doctor, checked against what they published. A
// change in clinicians.ts is a behaviour change, checked against the corpus. They are
// different reviews, and they now have different files.
//
// FILED UNDER W193 because that is the unit that governs disclosing a named clinician, and
// this module is now the one place the disclosed values live. The attribution is not
// decorative: W200's copy census finds a module by reading this first line, and O100's first
// draft of this file had no `// W<n>` header at all — which fired CENSUS-1 in the latent
// findings register on the twelfth header-less module, exactly as W210 designed it to.

import type { CareArea } from "./care-archetypes";

// Re-exported through clinicians.ts, which is what the tree imports; kept here because the
// `Clinician` type below is written in terms of it.
export type { CareArea };
import { type EIQuality } from "./emotional-fit";

/**
 * The roster behind /finder and the walkthrough.
 *
 * EVERY ENTRY IS NOW A REAL PERSON, WHICH INVERTS WHAT THIS FILE USED TO BE. It held fifteen
 * invented personas — invented people, invented availability, invented suburbs — with Dr Saxena
 * as the single marked exception, and that is what let the finder be shown to anybody without a
 * practice agreement in place. The personas are gone. Every current entry is a real GP and
 * `realPerson` is set on each one.
 *
 * THE COST OF THAT IS THAT NOTHING HERE MAY BE INVENTED ANY MORE, and several fields did not
 * survive the change. `nextAvailable` held a written-in time and is deleted (see `booking`).
 * Qualifications, languages, practice, prior posts and the biographies are taken from what each
 * doctor publishes about himself; where this file says something neither of them has published —
 * `nswAdhdTrained` above all — it is a DECLARATION relayed from the founders, not a check ADHD.ME
 * performed, and the surfaces say so.
 *
 * WHY `careAreas` IS A CLOSED VOCABULARY AND NOT FREE TEXT. Matching reads these, and a free
 * string would let a demo persona claim an area the archetypes cannot express, which produces
 * a finder that appears to work and silently cannot match. `CareArea` is therefore a union, and
 * an archetype requiring an area no clinician holds is a type error rather than an empty result.
 *
 * NOTHING HERE IS A COMPETENCE CLAIM. `focus`, `about` and `experience` are what a clinician says
 * they see often. This product does not assess clinicians, does not rank them by quality, and —
 * per src/directory/profile.ts — could not publish "ADHD specialist" even if somebody asked,
 * because ADHD is not an Ahpra-recognised specialty and s 133 governs the word.
 */

export const APPROACHES = ["holistic", "functional", "wearables"] as const;
export type Approach = (typeof APPROACHES)[number];

export type Clinician = {
  id: string;
  name: string;
  shortName: string;
  gender: "woman" | "man" | "non-binary";
  pronouns: string;
  title: string;
  suburb: string;
  /**
   * Only meaningful for a practice somebody travels to.
   *
   * The `distance` string this replaced was a fabricated "4.8 km away" measured from nowhere: the
   * same number rendered for a reader in the next street and one two suburbs over. Distance is now
   * computed from the suburb the person gives (src/geo/suburbs.ts), and this field carries only
   * what is true without knowing where they are.
   */
  reach: string;
  /**
   * A portrait, or null.
   *
   * Null is a supported state, not a gap to fill later: the demo personas are synthetic and their
   * portraits are too, and a real clinician's likeness is theirs to supply. Surfaces render a
   * monogram when this is null. Nothing in this tree generates a face for a real person.
   */
  image: string | null;
  /** The practice these rooms belong to, as the practice writes it. */
  practice: string;
  /**
   * How a reader actually gets an appointment — PHASE 1, AND DELIBERATELY NOT A SLOT PICKER.
   *
   * `nextAvailable: string` used to live here, holding "Thursday, 8:30 am", and the booking screen
   * offered it beside two more times that were written into the component. That was survivable
   * while every clinician was invented. It is not survivable now: both entries are real people at
   * a real practice, and a hardcoded time is a fabricated appointment offered under a named
   * doctor. Deleted rather than moved somewhere safer.
   *
   * ADHD.ME DOES NOT HOLD AVAILABILITY, AND PHASE 1 DOES NOT TRY TO. Healthengine's own API is
   * inbound-only — a practice management system PUSHES a column to them; there is no sanctioned
   * read endpoint for a third party — and their robots.txt disallows `/api/`, `/json/`, `/book/`
   * and `/appointment/` to everyone. Scraping the GraphQL call their page makes would put stale
   * times under a real doctor's name and pick a fight with the platform this product will want a
   * partnership with. So the reader is handed OFF: they choose a clinician here, and the
   * appointment is chosen and confirmed on Healthengine, which is the system that actually knows.
   */
  booking:
    | {
        /** Bookable on Healthengine. `url` is their profile, which carries their live picker. */
        via: "healthengine";
        practitionerId: string;
        url: string;
      }
    | {
        /** Not synced to any online platform. The reader is sent to the practice, and told why. */
        via: "practice";
        url: string;
        note: string;
      }
    | {
        /**
         * O217: a synthetic example profile — there is nobody to book, and the variant says so
         * in the type. Deliberately carries NO url: a fabricated booking route under an invented
         * doctor is exactly the mock the persona purge removed, so a surface holding one of
         * these renders an explanation instead of a control, and `/go/` has nothing to read.
         */
        via: "synthetic-none";
        note: string;
      };
  acceptingNewPatients: boolean;
  /**
   * When the books declaration was last made or reconfirmed (O56, year plan Q2 item 7).
   * ISO date. Capacity is the one declared fact that goes wrong by itself — a GP's books
   * close without anybody editing a profile — so the mechanism prices its age in: see
   * `capacityGrade`. Optional because a future entry may arrive undated, and an undated
   * declaration cannot claim freshness (it grades as stale, never as fresh).
   */
  capacityDeclaredAt?: string;
  focus: string;
  matchLine: string;
  fitSignals: string[];
  practicalSignals: string[];
  /** A concise, first-viewport introduction; the full biography stays in `about`. */
  summary: string;
  about: string;
  experience: string[];
  languages: string[];
  careAreas: CareArea[];
  /**
   * Areas declared "sometimes" rather than "often" — the interview's three-state answer
   * (docs/MATCHING-PLAN.md §5), made representable by O2/F1. Breadth has to cost something:
   * a sometimes-declared area answers an ask at half its weight, so ticking every box in the
   * interview is no longer the dominant strategy. Absent means the profile predates the
   * three-state interview and every declaration is read as "often" — which is exactly what
   * those interviews asked.
   */
  careAreasSometimes?: CareArea[];
  /**
   * Consulting locations beside the primary `suburb`, when a clinician genuinely works from
   * more than one (O85). Suburb names resolved against the same gazetteer as everything
   * else; DECLARED (founder- or clinician-supplied) and never inferred — and nothing about
   * a second location is invented to fill it out: no practice name, no separate hours,
   * until whoever supplied the location supplies those too. The distance machinery reads
   * the NEAREST of a clinician's locations, and the sentence names which rooms it measured
   * whenever that is not the primary suburb, so a distance to one location never renders
   * beside the other's name.
   */
  alsoConsultsAt?: string[];
  /**
   * Set ONLY while a clinician is listed ahead of their onboarding interview (O34): a dated
   * note that manner claims are theirs to make there. The roster law still holds — a profile
   * with no manner can never match half of what people ask — but the honest intermediate
   * state is VISIBLE and dated, not silently complete and not filled in for them. The roster
   * test accepts an empty `manner` only when this is present.
   */
  mannerPending?: string;
  /**
   * How this clinician works, declared by them, closed vocabulary (`MannerTrait`).
   *
   * The half of "will they understand me" that clinical scope cannot carry. Somebody writing "I
   * get rushed every time and I lose my thread" is not naming a care area; they are naming a way
   * of working. Before this field the only way to express that was a hand-written keyword weight
   * on one doctor's name in `rankClinicians`, which is a private editorial judgement about a
   * named person. Declared in the onboarding interview instead — see docs/MATCHING-PLAN.md §5.
   */
  manner: EIQuality[];
  wheelchairAccessible: boolean;
  /**
   * O236 (founder-directed): whether the GP uses an AI scribe — software that records and
   * transcribes the consult into notes — declared by the practice. "ai-scribe" means they do,
   * with the patient's consent asked each time; "no-ai" means notes are written without any AI
   * recording or transcription. Absent means undeclared, which the filter treats as neither: a
   * person who asks for one or the other is shown only GPs who have said. A practice fact, not a
   * clinical one — it says nothing about the care — and a real clinician carries it only when
   * they or their practice have stated it (the real-person law), so today only the example
   * profiles do.
   */
  consultRecording?: "ai-scribe" | "no-ai";
  /**
   * O248 (founder-directed): how the GP says they work, beyond the clinical scope — declared by
   * them, closed vocabulary, filterable. "holistic": takes a whole-person view (sleep, work,
   * relationships) alongside the assessment. "functional": open to functional-health approaches
   * alongside standard care. "wearables": happy to look at data from a wearable the person brings.
   * Each is a statement about the GP's own way of working, never a claim about outcomes, and a real
   * clinician carries it only when they have said so — today only the example profiles do.
   */
  approach?: readonly Approach[];
  appointmentLength: string;
  /*
   * `keywords: string[]` stood here until O100 and is deliberately not replaced. It held
   * ~40 free words per clinician for the per-clinician keyword weights the ranker used
   * BEFORE W221; the facet system replaced that mechanism and nothing in the tree has read
   * the field since. It surfaced when this module joined W200's copy census: the words were
   * never rendered, so nobody saw them, and one of them ("pathology") tripped the
   * no-test-results-bait rule. Dead free text attributed to three named doctors is worth
   * deleting rather than accepting an exemption for.
   */
  /**
   * Set when the FIRST appointment can be by telehealth, not just the follow-ups.
   *
   * The distinction matters for ranking rather than for display. A clinician somebody can see
   * without travelling is equally reachable from every suburb, so sorting them by the distance to
   * rooms they do not need to visit measures the wrong thing: Dr Saxena sat 3rd on stated
   * preference and fell to 13th the moment a Beecroft origin was given, which put him behind a
   * "show the other eleven" fold for a service that is available anywhere in the state.
   *
   * Deliberately not inferred from `practicalSignals`. Several clinicians offer telehealth
   * FOLLOW-UPS and still need a first visit in person, and reading a display string to decide a
   * ranking rule would collapse that difference silently.
   */
  telehealthFirstAppointment?: true;
  /**
   * The clinician says they have completed the training NSW requires to carry ADHD care without
   * ongoing psychiatrist involvement.
   *
   * DECLARED, NOT CHECKED, and the surfaces say so. W193 splits every published field into
   * "checkable on a public register" and "the clinician told us", and this is firmly the second:
   * there is no public register of who has done it, so ADHD.ME cannot confirm it and must not
   * render it as though it had. It is a boolean rather than a certificate reference for the same
   * reason W183 refuses a free-text bio: a field that can hold evidence invites publishing it.
   */
  nswAdhdTrained?: true;
  /**
   * A material interest this clinician has in ADHD.ME, and the short form rendered beside their
   * listing — RESTORED by O184 after being removed without an argument.
   *
   * WHY IT CAME BACK. O156 was founder-directed: "remove all mentions of founder on entire site".
   * O158 answered that correctly — it removed the WORD and kept the DISCLOSURE, rewording it so
   * neither string says "founder", and pinned that with a test. A later commit ("feat: strengthen
   * matching and simplify clinician profiles" — one line, no reasoning) removed the disclosure
   * itself along with its component and its unit guard, leaving two real GPs with a commercial
   * interest listed in a directory run by the company they are connected with, and no disclosure
   * anywhere on the product.
   *
   * That was an extrapolation from the directive, not the directive. The strings below contain no
   * "founder" and never did, so keeping them was always compatible with O156. Restored VERBATIM as
   * the founder reviewed them rather than reworded here: these are factual claims about named real
   * people and this file is not entitled to author them.
   *
   * `disclosedInterest` presumes nothing — Dr Saxena owns his CLINIC and is ADHD.ME's first clinic
   * partner; he does not own the entity, and a field holding a factual claim about a real person
   * has to be able to say the narrower thing. `disclosedInterestLabel` is per-person because the
   * two entries describe DIFFERENT relationships, and one hardcoded badge is what let a single
   * wrong word stand for both (O158).
   *
   * IT DOES NOT TOUCH THE RANKING, AND THAT IS DELIBERATE. W221 sorted a disclosed interest behind
   * an undisclosed one; O182's appraisal found that rule is a TAX ON DISCLOSURE whose rational
   * answer is to stop disclosing. Whether interest belongs in the comparator at all is founder
   * decision G-A1 and is not taken here. Disclosure itself is a different question, and not
   * optional.
   */
  disclosedInterest?: string;
  disclosedInterestLabel?: string;
  /**
   * Set when the entry describes a real, identifiable clinician rather than a demo persona.
   *
   * The finder shows synthetic and real entries side by side, and a reader cannot tell them apart
   * from the copy. Holding it as data means a surface can say which is which, and means nobody
   * later mistakes a real person's record for one they may freely edit.
   */
  realPerson?: true;
  /**
   * O217 (founder decision `synthetic-roster-tickbox`): set on an invented example profile.
   *
   * Exactly one of `realPerson`/`synthetic` must be set on any entry a surface renders —
   * `synthetic-roster.test.ts` enforces the exclusivity, and every surface that can show a
   * synthetic entry labels it out loud ("Example profile"). The `clinicians` export stays
   * real-only; synthetic entries live in `synthetic-roster.ts` and reach a ranking only through
   * the finder's own opt-in tickbox.
   */
  synthetic?: true;
};

export const clinicians: Clinician[] = [
  {
    id: "anubhav-saxena",
    name: "Dr Anubhav Saxena",
    shortName: "Dr Saxena",
    gender: "man",
    pronouns: "he/him",
    title: "General practitioner, MBBS FRACGP MPhil BSc(Adv) DCH",
    suburb: "Beecroft",
    // O86: the founder supplied Double Bay as his second consulting location (2026-08-20,
    // "similar in the finder view for Anubhav, add Beecroft and Double Bay"). The suburb is
    // the whole of what was supplied — no Double Bay practice name or booking route is
    // written here — and his telehealth-first posture is untouched: the distance sentence
    // stays "by telehealth, wherever you are", so the second location changes the LABEL a
    // reader sees, never the kilometre arithmetic (O85's rooms-naming rule only speaks for
    // clinicians somebody travels to).
    alsoConsultsAt: ["Double Bay"],
    practice: "Beecroft Family & Skin Cancer Clinic",
    reach: "Practice appointments and phone consultations",
    image: "/clinicians/anubhav-saxena.png",
    acceptingNewPatients: true,
    // The date each declaration went on the record, from this file's own history — not a survey
    // answer we never ran. Both Beecroft declarations landed 2026-08-14 (21196bd), Dr Anusha
    // Saxena's 2026-08-18 (PR #4). Reconfirming moves the date; nothing else does.
    capacityDeclaredAt: "2026-08-14",
    focus: "Structured assessment, baseline physical screening & titration",
    matchLine: "A measured assessment with the physical baseline done properly, then titration reviewed on a schedule.",
    fitSignals: ["ADHD assessment", "Baseline physical screening", "Titration", "Phone consultations"],
    // O183: "Phone consultations" removed. M3 made the profile DERIVE the telehealth label from
    // `telehealthFirstAppointment` below, so this free-text string had become a second, vaguer name
    // for a fact the page already states as "Telehealth" — both rendered, on the same screen. The
    // founder's directive was that telehealth is the clearer word; leaving the older phrasing
    // beside the derived one puts the ambiguity back and doubles the row.
    practicalSignals: ["Mixed billing", "Structured review schedule"],
    summary:
      "Anubhav takes a measured approach to ADHD care, with a documented physical baseline and scheduled reviews during titration. He also covers cardiovascular and sleep screening, and approaches substance history as a safety question rather than a judgement.",
    about:
      "Anubhav trained at the University of Sydney and has worked in general practice right across Sydney — Seven Hills, Double Bay, Hoxton Park, Hornsby — before settling at Beecroft. He works from measurement rather than impression: a documented baseline before anything starts, then review at set intervals instead of whenever a problem gets loud enough to prompt a call. He covers cardiovascular and sleep screening before a stimulant is considered, and treats a substance history as a safety question rather than a character one. He also does aged-care and home visits, and gives a good deal of his spare time to the long-suffering cause of the Parramatta Eels.",
    experience: [
      "Structured adult ADHD assessment",
      "Baseline cardiovascular and metabolic screening",
      "Titration and scheduled review",
      "Chronic disease management",
    ],
    languages: ["English", "Hindi", "Urdu"],
    careAreas: [
      "adhd-assessment",
      "titration",
      "substance-history",
      "shared-care",
    ],
    // M3 (F6): `unhurried`'s own interview question ("Do you book a longer first appointment
    // for this, and roughly how long?", interview.ts) and appointmentLength's question ("How
    // long is a first appointment... and is a longer one bookable?") ask the SAME real-world
    // fact through two separate interview items. His appointmentLength answer below already
    // settles it — "Long first appointment" is exactly what the unhurried question asks — so
    // this is the missing half of one declaration, not a new characterisation authored by this
    // tree (real-person-fields.ts's "declared... never characterised by us" rule is unbroken:
    // the source is still his own answer, just carried into both fields it answers).
    manner: ["structured", "non_judgmental", "sense_making", "unhurried"],
    nswAdhdTrained: true,
    wheelchairAccessible: true,
    appointmentLength: "Long first appointment, scheduled reviews",
    telehealthFirstAppointment: true,
    booking: {
      via: "healthengine",
      practitionerId: "123180",
      url: "https://healthengine.com.au/doctor/nsw/beecroft/dr-anubhav-saxena/p123180",
    },
    disclosedInterestLabel: "First clinic partner",
    disclosedInterest:
      "Dr Saxena owns Beecroft Family & Skin Cancer Clinic, which is ADHD.ME's first clinic partner. Disclosed because he appears in a directory run by a company his clinic has a commercial relationship with, and a reader cannot see the ranking that put him there.",
    realPerson: true,
  },
  {
    /**
     * O34: LISTED AT HER OWN REQUEST, relayed by the founder (2026-08-18: "she has asked us
     * to upload it ASAP"), which is the consent the W228 checklist required. Every claim
     * below is sourced: identity, practice and booking from the founder's instruction; the
     * interests from HER OWN published Healthengine bio (special interest in mental health,
     * First Class Honours in Psychology at the University of Sydney, clinical psychiatry
     * experience; other interests women's health and paediatrics) — interest-level claims
     * are recorded at the interview's "sometimes" grade, not inflated to "often". What her
     * interview has not yet captured is left EMPTY and marked, never guessed: no manner
     * claims (mannerPending), English only until she names her languages, no
     * accessibility claims, and no portrait — she chose the monogram for now.
     *
     * O58 (2026-08-19): the founder supplied her professional background in this session, and
     * everything it added below is sourced to that message: the endorsed ADHD prescriber
     * course completed (relayed as `nswAdhdTrained` — the field is a declaration relayed from
     * the founders, and this is that relay). O163 CORRECTION: this used to claim the word
     * "prescriber" itself "never renders on a patient surface, per the no-clinical-claims
     * register". That was false and had been since it was written — it renders TWICE on her
     * profile, in `about` and in the experience list, measured on the live page. The reason
     * nobody noticed is structural and is the finding O163 was really about: the compliance
     * sweeps lint public ROUTES, and a clinician profile is reached by an interaction, so no
     * sweep had ever read this surface. `e2e/profile-sweep.spec.ts` now does, and the finding
     * is carried there as an OPEN founder decision rather than quietly reworded — the sentence
     * is a founder-relayed credential about a named doctor, and the regex matches inside a
     * course title. Focused Psychological Strategies
     * training UNDERWAY, functional medicine / nutrition / lifestyle nutrition / health
     * coaching qualifications UNDERWAY (in-progress study renders as in progress, never as
     * held), and her interest in functional and lifestyle medicine recorded as
     * `non-medication` at the "sometimes" grade — the same interest-level rule as above. Her
     * approach paragraph ("holistic, patient-centred…") is quoted in `about` AS her own
     * description; it is not translated into manner declarations, which stay hers to make in
     * the onboarding interview.
     *
     * O71 (2026-08-19, founder-directed launch pass): attributes added from her PUBLISHED
     * professional record only — the practice's own doctors page (beecroftfp.com.au/about-us)
     * and her Healthengine profiles (p150804 Beecroft, p160121 Double Bay), read via search
     * snippets because the egress proxy blocks the sites directly. Published there: medical
     * degree at ANU; FRACGP; hospital training across NSW (Blacktown and Bathurst Hospitals)
     * with rotations in cardiology, paediatrics and psychiatry; the Sydney Child Health
     * Program (Sydney Children's Hospital Network); special interests in women's health,
     * child health, mental wellbeing, gut health, cardiovascular and metabolic health,
     * weight management and healthy ageing; a stated focus on preventative health and
     * functional medicine — corroborating the founder-supplied O58 bio. EXCLUDED on purpose:
     * a review snippet praising her ("helpful and listens") — testimonial content never
     * lands anywhere in this tree, whatever its warmth. No new facet grades: published
     * INTERESTS inform copy and keywords; care/manner declarations stay exactly where her
     * interview left them.
     */
    id: "anusha-saxena",
    name: "Dr Anusha Saxena",
    shortName: "Dr Anusha Saxena",
    gender: "woman",
    pronouns: "she/her",
    // Founder consistency pass (2026-08-20): degrees named as supplied — MD (ANU),
    // B.Psych (Hons) (USyd), DCH — the same register Dr Anubhav's title uses.
    title: "General practitioner, MD FRACGP BPsych(Hons) DCH",
    suburb: "Double Bay",
    // O85: the founder supplied Hornsby as her second consulting location (2026-08-20,
    // "put in Hornsby too as location"). The suburb is the whole of what was supplied:
    // no Hornsby practice name, hours or booking route is invented here, and her
    // Healthengine booking below remains the Double Bay profile until she or the founder
    // supplies a Hornsby one.
    alsoConsultsAt: ["Hornsby"],
    practice: "Bay Health Clinic",
    reach: "Practice appointments in Double Bay and Hornsby",
    // O82: her portrait, supplied by the founder on her behalf (2026-08-20) — the only route a
    // real person's likeness enters this tree. Until then the monogram was her choice, not a gap.
    image: "/clinicians/anusha-saxena.png",
    acceptingNewPatients: true,
    capacityDeclaredAt: "2026-08-18",
    focus: "ADHD assessment & management, mental health, women's health & functional medicine",
    matchLine: "Brings a mental-health focus to general practice, with psychology training behind it.",
    fitSignals: ["ADHD assessment", "Mental health focus", "Women's health", "Hindi & Urdu", "Lifestyle & preventative care"],
    // Billing leads by roster convention; hers is stated by the practice until her interview
    // supplies the specifics — a fact about where the fact lives, not a guess at it.
    // O183: "New patients welcome" removed for the same reason as Dr Anubhav's phone line — the
    // profile derives "Accepting new patients" from `acceptingNewPatients` below, so this restated
    // it in different words a few millimetres away. What remains is the one fact nothing derives:
    // where her billing position is stated. The row a reader sees is not shorter, because the
    // derivation was always supplying that line.
    practicalSignals: ["Billing set by the practice"],
    summary:
      "Anusha is an experienced GP with a background in psychology, psychiatry and general medicine. She has completed endorsed ADHD prescriber training and values culturally sensitive, holistic care. She speaks English, Hindi and Urdu.",
    // O88: her official bio, supplied through the founder (2026-08-20), merged with the
    // already-verified detail from O58 — nothing below is authored for her.
    about:
      "Anusha is an experienced GP at Bay Health Clinic in Double Bay, and a Fellow of the Royal Australian College of General Practitioners. She came to medicine through psychology — a Bachelor of Psychology with First Class Honours at the University of Sydney — then her MD at the Australian National University, with a background in psychiatry and general medicine: hospital training across NSW, including Blacktown and Bathurst, rotations in cardiology, paediatrics and psychiatry, and the Sydney Child Health Program through the Sydney Children's Hospital Network; she holds a Diploma of Child Health. Her clinical interests are ADHD, mental health, women's health and functional medicine. She has completed an endorsed ADHD prescriber course, is training in Focused Psychological Strategies, and is completing further qualifications in functional medicine, nutrition, lifestyle medicine and health coaching. Of Indian origin and speaking Hindi and Urdu, she values culturally sensitive, holistic and patient-centred care. Outside medicine she enjoys travelling, learning about different cultures, charity and community work, and staying active through sport — cricket and tennis included. The finer grain of how she works day to day will still be added from her own onboarding answers.",
    experience: [
      "General practice, Bay Health Clinic, Double Bay",
      "Fellow of the Royal Australian College of General Practitioners",
      "Medical degree, Australian National University",
      "Bachelor of Psychology (First Class Honours), University of Sydney",
      "Hospital training across NSW — rotations in cardiology, paediatrics and psychiatry",
      "Sydney Child Health Program, Sydney Children's Hospital Network",
      "Diploma of Child Health",
      "Endorsed ADHD prescriber course — completed",
      "Focused Psychological Strategies — training underway",
      "Functional medicine, nutrition, lifestyle medicine & health coaching — further qualifications underway",
    ],
    // O88: from her supplied bio — "of Indian origin and speaking Hindi and Urdu". Languages
    // are ranked on (O1), so this is a matching fact, not decoration.
    languages: ["English", "Hindi", "Urdu"],
    careAreas: ["adhd-assessment"],
    // Interest-level claims from her bio sit at the "sometimes" grade until her interview
    // upgrades or removes them — half weight, honestly earned (O2). `non-medication` is O58's
    // addition: her stated interest in functional and lifestyle medicine plus the Focused
    // Psychological Strategies training underway is exactly that facet's territory
    // ("non-medication and psychological supports"), claimed at interest grade, not above it.
    careAreasSometimes: ["depression", "anxiety", "child-adolescent-adhd", "non-medication"],
    // O88: her first manner claims, in her own supplied words — "values culturally sensitive,
    // holistic and patient-centred care". Culturally sensitive care from a Hindi- and
    // Urdu-speaking GP of Indian origin is culturally_attuned; holistic and patient-centred is
    // attuned (the whole-person facet). Claimed because SHE said them — the day-to-day grain
    // of how she works is still her interview's to add, but a values statement she supplied is
    // not something this file may leave unheard. mannerPending ends here: it existed to mark
    // an EMPTY manner as pending, not to outlive her first declarations.
    manner: ["culturally_attuned", "attuned"],
    // The endorsed ADHD prescriber course she has completed, relayed by the founder 2026-08-19
    // — the declaration this field exists to carry. telehealthFirstAppointment stays omitted:
    // not claimed, and omission is exactly what that means.
    nswAdhdTrained: true,
    wheelchairAccessible: false,
    appointmentLength: "Appointment lengths set with the practice",
    booking: {
      via: "healthengine",
      practitionerId: "160121",
      url: "https://healthengine.com.au/doctor/nsw/double-bay/dr-anusha-saxena/p160121",
    },
    disclosedInterestLabel: "Declared interest in ADHD.ME",
    disclosedInterest:
      "Dr Anusha Saxena has a declared interest in ADHD.ME. Disclosed because she appears in a directory run by a company she is connected with, and a reader cannot see the ranking that put her there.",
    realPerson: true,
  },
];
