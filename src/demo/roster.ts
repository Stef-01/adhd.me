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
import type { ExpertiseTag, Profession } from "@/support/professions";

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
  careProfile?: import("@/support/care-preferences").CareDeclaration;
  id: string;
  name: string;
  /**
   * 2026-09-08 (founder-directed, the ADHD Life PRD §38): which kind of professional this is.
   * The roster began as GPs only, so an entry that says nothing is a GP (`professionOf`); every
   * allied entry says what it is. A closed vocabulary — `src/support/professions.ts`.
   */
  profession?: Profession;
  /**
   * PRD §40: what an allied provider says they work on, in the closed expertise taxonomy — the
   * problem a person would recognise, never "ADHD" alone. A declaration, like every other field.
   */
  expertise?: readonly ExpertiseTag[];
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
    // answer we never ran. Both Beecroft declarations landed 2026-08-14 (21196bd), Dr Anu
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
      "Anubhav trained at the University of Sydney and has worked in general practice right across Sydney, Seven Hills, Double Bay, Hoxton Park, Hornsby, before settling at Beecroft. He works from measurement rather than impression: a documented baseline before anything starts, then review at set intervals instead of whenever a problem gets loud enough to prompt a call. He covers cardiovascular and sleep screening before a stimulant is considered, and treats a substance history as a safety question rather than a character one. He also does aged-care and home visits, and gives a good deal of his spare time to the long-suffering cause of the Parramatta Eels.",
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
    name: "Dr Anu Saxena",
    shortName: "Dr Anu Saxena",
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
    // 2026-09-10 (founder-directed, second pass: "find one where she is smiling"): the file holds
    // a still from her ADHD.ME interview footage (tape 01819989 at 685.2s). Her likeness is the
    // frame as shot — nothing about her is generated; the microphone pop filter beside her
    // shoulder was retouched out of the background with an inpainting model. Cropped square.
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
      "Anu is an experienced GP with a background in psychology, psychiatry and general medicine. She has completed endorsed ADHD prescriber training and values culturally sensitive, holistic care. She speaks English, Hindi and Urdu.",
    // O88: her official bio, supplied through the founder (2026-08-20), merged with the
    // already-verified detail from O58 — nothing below is authored for her.
    about:
      "Anu is an experienced GP at Bay Health Clinic in Double Bay, and a Fellow of the Royal Australian College of General Practitioners. She came to medicine through psychology, a Bachelor of Psychology with First Class Honours at the University of Sydney, then her MD at the Australian National University, with a background in psychiatry and general medicine: hospital training across NSW, including Blacktown and Bathurst, rotations in cardiology, paediatrics and psychiatry, and the Sydney Child Health Program through the Sydney Children's Hospital Network; she holds a Diploma of Child Health. Her clinical interests are ADHD, mental health, women's health and functional medicine. She has completed an endorsed ADHD prescriber course, is training in Focused Psychological Strategies, and is completing further qualifications in functional medicine, nutrition, lifestyle medicine and health coaching. Of Indian origin and speaking Hindi and Urdu, she values culturally sensitive, holistic and patient-centred care. Outside medicine she enjoys travelling, learning about different cultures, charity and community work, and staying active through sport, cricket and tennis included. The finer grain of how she works day to day will still be added from her own onboarding answers.",
    experience: [
      "General practice, Bay Health Clinic, Double Bay",
      "Fellow of the Royal Australian College of General Practitioners",
      "Medical degree, Australian National University",
      "Bachelor of Psychology (First Class Honours), University of Sydney",
      "Hospital training across NSW, rotations in cardiology, paediatrics and psychiatry",
      "Sydney Child Health Program, Sydney Children's Hospital Network",
      "Diploma of Child Health",
      "Endorsed ADHD prescriber course, completed",
      "Focused Psychological Strategies, training underway",
      "Functional medicine, nutrition, lifestyle medicine & health coaching, further qualifications underway",
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
      "Dr Anu Saxena has a declared interest in ADHD.ME. Disclosed because she appears in a directory run by a company she is connected with, and a reader cannot see the ranking that put her there.",
    realPerson: true,
  },
  /*
   * ─────────────────────────────────────────────────────────────────────────────────────────
   * O252 (founder-directed, 2026-09-20: "implement all profiles from adhd repo"): the nine
   * clinicians the network page already publishes, brought into the app's own roster.
   *
   * WHERE EVERY WORD BELOW COMES FROM. The marketing site (Stef-01/revamped-adhd.me) generates
   * eleven clinician pages from one data set, `scripts/build-profiles.py`. Two of those eleven
   * are the GPs above. The other nine were live on the public site and absent from the product,
   * so a reader inside the app could not reach a single psychologist or occupational therapist
   * this company already lists. Each field below is copied from that data set, which is itself
   * each clinician's own published biography. Nothing here is authored for them, and the
   * real-person law above is unchanged: no portrait is generated, no availability is invented,
   * no competence is claimed on anybody's behalf. `about` is each person's paragraphs joined
   * into one string and otherwise verbatim, punctuation included — a first pass through this
   * block tidied three of them (a duplicated word of Lachlan Avent's, two slashes of Lauren
   * Poulos's, and "school can't" beside Flynn Simonis's "school refusal") and all three are
   * restored, because a biography is a person's own words and tidying is authoring.
   *
   * THE ONE JUDGEMENT THIS BLOCK MAKES, STATED SO IT CAN BE CHECKED. `careAreas` is a three-state
   * declaration and nobody here has sat the onboarding interview. So the rule applied uniformly
   * is the one O2 set: what a clinician LEADS WITH — the work their own page says they focus on
   * or are passionate about — is recorded at the "often" grade; the flat list of presentations
   * they say they have experience with is recorded at the "sometimes" grade, at half weight. A
   * clinician whose page never mentions ADHD carries no ADHD area, however plausible one would
   * look on a card: Kate Row and Ellie Putland and Samantha Courtney are psychologists this
   * company lists, not ADHD claims this file is entitled to make for them.
   *
   * CAPACITY IS UNDATED ON PURPOSE. Each clinic publishes a booking route, which is a declaration
   * that they take new clients; none publishes a date it was last confirmed. `capacityGrade`
   * reads an undated open declaration as `stale-open`, which is exactly what it is, and writing
   * today's date here to make it read `fresh-open` would be inventing the check.
   *
   * NO `disclosedInterest` ON THE GOALS ENTRIES, and that absence is the honest one: the
   * disclosure the site carries for GOALS Psychology is a statement that the clinic is
   * independent and ADHD.ME receives no part of what you pay. That is the ABSENCE of an
   * interest, and this field exists to declare a material interest that exists. It is carried as
   * a practical signal instead. Paula Garrido's is a real disclosure and is written as one.
   * ─────────────────────────────────────────────────────────────────────────────────────────
   */
  {
    id: "paula-garrido",
    name: "Paula Garrido",
    shortName: "Paula Garrido",
    profession: "psychologist",
    gender: "woman",
    pronouns: "she/her",
    title: "Clinical psychologist, MClinPsych ADHD-CCSP ASDCS",
    // The clinic is online only, so this is where the practice is registered rather than a room
    // anybody visits — the reach line below says so, and `telehealthFirstAppointment` keeps the
    // distance sentence off her card entirely.
    suburb: "Sydney",
    practice: "Wellness Psychology Clinic",
    reach: "Telehealth, Australia-wide; the clinic is online only",
    image: "/clinicians/paula-garrido.jpg",
    acceptingNewPatients: true,
    focus: "ADHD and other neurodevelopmental differences, neuroaffirming and trauma-informed",
    matchLine: "Compassionate, neuroaffirming and trauma-informed care for ADHD and other neurodevelopmental differences.",
    fitSignals: ["Neuroaffirming", "Trauma-informed", "ADHD & autism certified"],
    practicalSignals: ["$253 a session, $149 Medicare rebate", "Fee set and charged by the clinic"],
    summary:
      "Paula is a clinical psychologist with extensive experience supporting people with ADHD and other neurodevelopmental differences. She has a special interest in compassionate, neuroaffirming and trauma-informed care.",
    about:
      "Paula Garrido is a Clinical Psychologist with extensive experience supporting individuals with ADHD and other neurodevelopmental differences. She has a special interest in providing compassionate, neuroaffirming, and trauma-informed psychological care, helping individuals better understand their unique strengths, challenges, and ways of experiencing the world. With additional training in ADHD, autism, complex trauma, and evidence-based psychological therapies, Paula supports individuals to navigate challenges with emotional regulation, executive functioning, anxiety, self-esteem, relationships, and everyday life. Her warm, collaborative, and non-judgmental approach creates a safe space for clients to explore their experiences, develop practical strategies, build self-understanding, and work towards meaningful and lasting change. Paula holds a Master of Clinical Psychology and is an ADHD-Certified Clinical Services Provider (ADHD-CCSP) and Certified Autism Spectrum Disorder Clinical Specialist (ASDCS).",
    experience: [
      "Clinical psychologist, Wellness Psychology Clinic, telehealth Australia-wide",
      "Master of Clinical Psychology",
      "ADHD-Certified Clinical Services Provider (ADHD-CCSP)",
      "Certified Autism Spectrum Disorder Clinical Specialist (ASDCS)",
      "Additional training in ADHD, autism, complex trauma and evidence-based psychological therapies",
    ],
    // Not published on her page; English until she names her own.
    languages: ["English"],
    careAreas: ["autism-adhd", "trauma-informed", "non-medication"],
    careAreasSometimes: ["emotional-regulation", "anxiety"],
    // Her own words: "warm, collaborative, and non-judgmental", and a practice built on helping
    // people "better understand their unique strengths, challenges, and ways of experiencing".
    manner: ["collaborative", "non_judgmental", "sense_making", "attuned"],
    expertise: ["emotional-regulation"],
    wheelchairAccessible: false,
    appointmentLength: "60-minute sessions by secure video; times set with the clinic",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://wellnesspsychologyclinic.com.au/appointment-page/",
      note: "The clinic takes appointment requests through its own form rather than an online picker.",
    },
    disclosedInterestLabel: "Clinic connection disclosed",
    disclosedInterest:
      "Paula consults through Wellness Psychology Clinic, which also lists Dr Anu Saxena, who has a declared interest in ADHD.ME.",
    realPerson: true,
  },
  {
    id: "kate-row",
    name: "Kate Row",
    shortName: "Kate Row",
    profession: "psychologist",
    gender: "woman",
    pronouns: "she/her",
    title: "Psychologist and clinic director, BSc(Psych) BA PostGradDip(Psych)",
    suburb: "Fortitude Valley",
    practice: "GOALS Psychology",
    reach: "Clinic appointments in Fortitude Valley, and telehealth Australia-wide",
    image: "/clinicians/kate-row.jpg",
    acceptingNewPatients: true,
    focus: "Goals, practical coping strategies and NDIS journeys, toddlers through to adults",
    matchLine: "Toddlers through to adults, working from the goals you name towards a practical toolkit for reaching them.",
    fitSignals: ["Toddlers to adults", "NDIS journeys", "CBT, ACT & MI"],
    practicalSignals: ["Independent clinic; fee quoted when you book", "Free 15-minute call for new clients"],
    summary:
      "Kate works with toddlers, children, teenagers and adults, and directs the clinic. She works from the goals a person names towards a practical toolkit of coping strategies.",
    about:
      "Kate works with toddlers, children, teenagers, and adults. The main therapeutic modalities she utilises include Cognitive Behavioural Therapy (CBT), Acceptance and Commitment Therapy (ACT), Motivational Interviewing (MI), solution-focused brief therapy, communication, and social skills building for growing client's toolkits of practical coping strategies. Kate enjoys working with clients to identify their goals and work towards achieving them to improve overall well-being and live their most fulfilling lives possible. She has a life-long passion for working with clients with diffabilities/disabilities and supporting individuals and families through their NDIS journey to thrive. Kate is mum to three children.",
    experience: [
      "Psychologist and clinic director, GOALS Psychology, Fortitude Valley",
      "Cognitive Behavioural Therapy (CBT), Acceptance and Commitment Therapy (ACT) and Motivational Interviewing (MI)",
      "Solution-focused brief therapy, communication and social skills building",
      "Supporting individuals and families through their NDIS journey",
      "Career counselling and post-schooling decision making",
      "Bachelor of Science (Psychology) and Bachelor of Arts",
      "Postgraduate Diploma in Psychology",
    ],
    languages: ["English"],
    careAreas: ["non-medication"],
    // Her page names goals, wellbeing and a toolkit a person can use — motivating and
    // collaborative in the manner vocabulary, and nothing beyond what she wrote.
    manner: ["motivating", "collaborative"],
    wheelchairAccessible: true,
    appointmentLength: "50-minute sessions; times set with the clinic",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.halaxy.com/book/goals-psychology/location/726621",
      note: "GOALS Psychology books through Halaxy, and offers new clients a free 15-minute call first.",
    },
    realPerson: true,
  },
  {
    id: "ellie-putland",
    name: "Ellie Putland",
    shortName: "Ellie Putland",
    profession: "psychologist",
    gender: "woman",
    pronouns: "she/her",
    title: "Psychologist, BPsychSc(Hons I)",
    suburb: "Fortitude Valley",
    practice: "GOALS Psychology",
    reach: "Clinic appointments in Fortitude Valley, and telehealth Australia-wide",
    image: "/clinicians/ellie-putland.jpg",
    acceptingNewPatients: true,
    focus: "Trauma-informed work with young people, with families brought in where it helps",
    matchLine: "Trauma-informed work with young people who want to bring their stressors down, with families brought in where it helps.",
    fitSignals: ["Trauma-informed", "Young people", "CBT, ACT & DBT"],
    practicalSignals: ["Independent clinic; fee quoted when you book", "Free 15-minute call for new clients"],
    summary:
      "Ellie works with children, teenagers and adults from a trauma-informed care framework, and works with families towards the goals a person names.",
    about:
      "Ellie works with children, teenagers and adults. She works with clients from a trauma-informed care framework and works collaboratively with families on psychoeducation towards their goals. Ellie utilises Cognitive Behavioural Therapy (CBT), Acceptance and Commitment Therapy (ACT), Dialectical Behaviour Therapy (DBT) and Motivational Interviewing. Ellie is experienced in administering an array of assessments, incorporating relevant resources into sessions and liaising with clients' wider support teams wherever helpful towards client goals. By supporting clients to develop and refine their psychological and coping skills, Ellie has a particular passion for supporting young people who would like to reduce their stressors. With a Bachelor of Psychological Science from Griffith University with 1st class Honours, Ellie is also an Associate Member of the Australian Psychological Society.",
    experience: [
      "Psychologist, GOALS Psychology, Fortitude Valley",
      "Trauma-informed care framework, working collaboratively with families",
      "Cognitive Behavioural Therapy (CBT), Acceptance and Commitment Therapy (ACT), Dialectical Behaviour Therapy (DBT) and Motivational Interviewing",
      "Experienced in administering an array of assessments",
      "Liaison with clients' wider support teams",
      "Bachelor of Psychological Science with First Class Honours, Griffith University",
      "Associate Member of the Australian Psychological Society",
    ],
    languages: ["English"],
    careAreas: ["trauma-informed", "non-medication"],
    manner: ["collaborative", "steadying"],
    wheelchairAccessible: true,
    appointmentLength: "50-minute sessions; times set with the clinic",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.halaxy.com/book/goals-psychology/location/726621",
      note: "GOALS Psychology books through Halaxy, and offers new clients a free 15-minute call first.",
    },
    realPerson: true,
  },
  {
    id: "lachlan-avent",
    name: "Lachlan Avent",
    shortName: "Lachlan Avent",
    profession: "psychologist",
    gender: "man",
    pronouns: "he/him",
    title: "Psychologist, BPsychSc(Hons)",
    suburb: "Fortitude Valley",
    practice: "GOALS Psychology",
    reach: "Clinic appointments in Fortitude Valley, and telehealth Australia-wide",
    image: "/clinicians/lachlan-avent.jpg",
    acceptingNewPatients: true,
    focus: "Autism and ADHD assessment for children, teenagers and adults, and therapy alongside",
    matchLine: "A safe space to be heard, plus autism and ADHD assessment, for children, teenagers and adults.",
    fitSignals: ["Autism & ADHD assessment", "Children to adults", "Triple P practitioner"],
    practicalSignals: ["Independent clinic; fee quoted when you book", "Free 15-minute call for new clients"],
    summary:
      "Lachlan works with children, teenagers and adults, and offers autism assessment and ADHD assessment appointments. He is a certified Triple P Stepping Stones practitioner.",
    about:
      "Lachlan works with children, teenagers and adults and is passionate about providing a safe space for clients to express themselves, achieve their potential and meet the challenges that life presents. He is experienced working with clients who have autism, ADHD, OCD, specific learning disorders, depression, intellectual disability, are experiencing anxiety, phobias, depression, issues with self-esteem / confidence, stress / burn out, anger, bullying, interpersonal difficulties, and provides parenting support. Lachlan utilises Cognitive Behavioural Therapy (CBT), Dialectical Behavioural Therapy (DBT), Acceptance and Commitment Therapy (ACT), Motivational Interviewing (MI) and Emotion Focussed Therapy (EFT) to support clients to create meaningful change and build skills to live a life that fulfils them. Lachlan is experienced in administering assessments including the WISC, WIAT, WAIS, ADOS, MIGDAS and offers appointments for autism assessment and ADHD assessment. Lachlan is also a certified Triple P Stepping Stones Parenting Program Practitioner. Lachlan holds a Bachelor of Psychological Science with Honours from the University of Queensland.",
    experience: [
      "Psychologist, GOALS Psychology, Fortitude Valley",
      "Autism assessment and ADHD assessment appointments",
      "Assessment administration including the WISC, WIAT, WAIS, ADOS and MIGDAS",
      "Cognitive Behavioural Therapy (CBT), Dialectical Behavioural Therapy (DBT), Acceptance and Commitment Therapy (ACT), Motivational Interviewing (MI) and Emotion Focussed Therapy (EFT)",
      "Certified Triple P Stepping Stones Parenting Program Practitioner",
      "Bachelor of Psychological Science with Honours, University of Queensland",
    ],
    languages: ["English"],
    careAreas: ["adhd-assessment", "autism-adhd", "child-adolescent-adhd", "non-medication"],
    careAreasSometimes: ["anxiety", "depression"],
    manner: ["non_judgmental", "motivating"],
    // O253: his page names anger among the presentations he works with, which is what this tag
    // is for. Nothing else in the expertise taxonomy matches what he published.
    expertise: ["emotional-regulation"],
    wheelchairAccessible: true,
    appointmentLength: "50-minute sessions; times set with the clinic",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.halaxy.com/book/goals-psychology/location/726621",
      note: "GOALS Psychology books through Halaxy, and offers new clients a free 15-minute call first.",
    },
    realPerson: true,
  },
  {
    id: "samantha-courtney",
    name: "Samantha Courtney",
    shortName: "Samantha Courtney",
    profession: "psychologist",
    gender: "woman",
    pronouns: "she/her",
    title: "Psychologist, BPsychSc BSocSc(Psych)(Hons I) CEDC-MH",
    suburb: "Fortitude Valley",
    practice: "GOALS Psychology",
    reach: "Clinic appointments in Fortitude Valley, and telehealth Australia-wide",
    image: "/clinicians/samantha-courtney.jpg",
    acceptingNewPatients: true,
    focus: "Credentialed eating disorder care, perinatal mental health and trauma",
    matchLine: "Credentialed eating disorder care, perinatal mental health and trauma, in a calm and inclusive room.",
    fitSignals: ["Eating disorders", "Perinatal & fertility", "CEDC-MH credentialed"],
    practicalSignals: ["Independent clinic; fee quoted when you book", "Free 15-minute call for new clients"],
    summary:
      "Samantha works with teenagers and adults. She is a Credentialed Eating Disorder Clinician, and works from a trauma-informed care framework and a strengths-based lens.",
    about:
      "Samantha works with teenagers and adults. She has experience working with clients who are experiencing difficulties with eating disorders, perinatal mental health, fertility, functional neurological disorder (FND), anxiety, depression, postnatal anxiety and depression, trauma and PTSD, and life stressors, including major life transitions such as parenthood, injuries, retiring and personal losses. Samantha is a Credentialed Eating Disorder Clinician (CEDC-MH) and her experience includes supporting clients who are mums, new parents, athletes, and clients from diverse life experiences with co-occurring health conditions to navigate eating disorder treatment. She is able to liaise with clients' wider support teams such as dieticians, GPs and psychiatrists wherever helpful towards client goals. Samantha works from a trauma-informed care framework and a strengths-based lens to provide a calm, inclusive, and supportive environment for her clients to engage in individualised interventions. She utilises therapy modalities including Cognitive Behavioural Therapy (CBT), Acceptance and Commitment Therapy (ACT) and Dialectical Behaviour Therapy (DBT). Sam holds a Bachelor of Psychological Science from the University of New England, and a Bachelor of Social Science in Psychology (1st Class Honours) from the University of the Sunshine Coast.",
    experience: [
      "Psychologist, GOALS Psychology, Fortitude Valley",
      "Credentialed Eating Disorder Clinician (CEDC-MH)",
      "Eating disorder treatment with mums, new parents, athletes, and clients with co-occurring health conditions",
      "Perinatal mental health, fertility, and functional neurological disorder (FND)",
      "Trauma-informed care framework and a strengths-based lens",
      "Cognitive Behavioural Therapy (CBT), Acceptance and Commitment Therapy (ACT) and Dialectical Behaviour Therapy (DBT)",
      "Liaison with dieticians, GPs and psychiatrists",
      "Bachelor of Psychological Science, University of New England",
      "Bachelor of Social Science in Psychology (First Class Honours), University of the Sunshine Coast",
    ],
    languages: ["English"],
    careAreas: ["trauma-informed", "non-medication"],
    careAreasSometimes: ["anxiety", "depression"],
    // "a calm, inclusive, and supportive environment" and "a strengths-based lens", her words.
    manner: ["steadying", "non_judgmental", "motivating"],
    expertise: ["regular-eating"],
    wheelchairAccessible: true,
    appointmentLength: "50-minute sessions; times set with the clinic",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.halaxy.com/book/goals-psychology/location/726621",
      note: "GOALS Psychology books through Halaxy, and offers new clients a free 15-minute call first.",
    },
    realPerson: true,
  },
  {
    id: "lauren-poulos",
    name: "Lauren Poulos",
    shortName: "Lauren Poulos",
    profession: "psychologist",
    gender: "woman",
    pronouns: "she/her",
    title: "Psychologist, BPsychSc(Hons) MProfPsych",
    suburb: "Fortitude Valley",
    practice: "GOALS Psychology",
    reach: "Clinic appointments in Fortitude Valley, telehealth Australia-wide, and home, school and community visits across Brisbane",
    image: "/clinicians/lauren-poulos.jpg",
    acceptingNewPatients: true,
    focus: "Early intervention and play-based work with toddlers and children",
    matchLine: "Early intervention and play-based work with toddlers and children, and steady support for teens and adults.",
    fitSignals: ["Toddlers & children", "PCIT & early intervention", "Psychometric assessment"],
    practicalSignals: ["Independent clinic; fee quoted when you book", "Home, school and community visits"],
    summary:
      "Lauren works with toddlers, children, teens and adults. She works in early intervention, in clinic and at home, and is experienced with Parent-Child Interaction Therapy.",
    about:
      "Lauren works with toddlers, children, teens and adults. She is experienced working with clients who are experiencing anxiety, depression, emotional regulation, neurodivergence, autism, ADHD, intellectual disability, self esteem/ confidence, trauma, friendships & socialising, and offers parenting support among other presenting concerns. Lauren thoroughly enjoys facilitating a safe and collaborative space where clients can explore their goals and work toward meaningful change. She is experienced with Cognitive Behavioural Therapy (CBT), Motivational Interviewing (MI), skills building and coping strategies, Parent-Child Interaction Therapy (PCIT) and facilitating programs relating to managing disruptive behaviours in children to strengthen family dynamics. Lauren also has experience working with children in an early intervention context both in-clinic and at-home settings. Lauren holds a Bachelor of Psychological Sciences with Honours from the University of Queensland and a Master of Professional Psychology from Bond University.",
    experience: [
      "Psychologist, GOALS Psychology, Fortitude Valley",
      "Early intervention with children, in clinic and at home",
      "Parent-Child Interaction Therapy (PCIT)",
      "Programs for managing disruptive behaviours in children to strengthen family dynamics",
      "Cognitive Behavioural Therapy (CBT), Motivational Interviewing (MI), skills building and coping strategies",
      "Psychometric assessment",
      "Communication methods including Proloquo2Go, PECS and ALD",
      "Bachelor of Psychological Sciences with Honours, University of Queensland",
      "Master of Professional Psychology, Bond University",
    ],
    languages: ["English"],
    careAreas: ["non-medication"],
    careAreasSometimes: ["child-adolescent-adhd", "autism-adhd", "emotional-regulation", "anxiety", "depression", "trauma-informed"],
    manner: ["collaborative", "steadying"],
    expertise: ["emotional-regulation"],
    wheelchairAccessible: true,
    appointmentLength: "50-minute sessions; times set with the clinic",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.halaxy.com/book/goals-psychology/location/726621",
      note: "GOALS Psychology books through Halaxy, and offers new clients a free 15-minute call first.",
    },
    realPerson: true,
  },
  {
    id: "alice-bui",
    name: "Alice Bui",
    shortName: "Alice Bui",
    profession: "psychologist",
    gender: "woman",
    pronouns: "she/her",
    title: "Provisional psychologist, BPsych BPsychSc(Hons), Master of Clinical Psychology in progress",
    suburb: "Fortitude Valley",
    practice: "GOALS Psychology",
    reach: "Clinic appointments in Fortitude Valley, and telehealth Australia-wide",
    image: "/clinicians/alice-bui.jpg",
    acceptingNewPatients: true,
    focus: "Trauma-informed therapy with cultural sensitivity, refugee and newly arrived clients",
    matchLine: "Trauma-informed therapy with cultural sensitivity, and a particular welcome for refugee and newly arrived clients.",
    fitSignals: ["Trauma-informed", "CALD & refugee clients", "CBT, ACT, DBT & narrative"],
    practicalSignals: ["Independent clinic; fee quoted when you book", "No Medicare rebate for provisional sessions"],
    summary:
      "Alice works with children, teens and adults. Her therapy style is trauma-informed, and she works with refugee and newly arrived clients and clients from culturally and linguistically diverse backgrounds.",
    about:
      "Alice works with children, teens and adults. She is experienced working with clients regarding trauma, PTSD, anxiety, depression, adjustment difficulties, autism, ADHD, intellectual disability, neurodivergence, emotional dysregulation, behavioural challenges, among other presenting concerns. Her therapy style is trauma-informed and emphasises a safe collaborative space. Alice has special clinical interests in evidence-based practice for clients who have experienced trauma. She is particularly passionate about working with clients who are refugees and newly arrived backgrounds and thoroughly enjoys supporting clients from culturally and linguistically diverse (CALD) backgrounds who have experienced displacement, cultural transition and complex trauma with cultural sensitivity to tailor interventions to their unique lived experiences. Alice is experienced with Cognitive Behavioural Therapy (CBT), Acceptance and Commitment Therapy (ACT), Dialectical Behaviour Therapy (DBT) and Narrative Therapy. Alice holds a Bachelor of Psychology from Macquarie University, Bachelor of Psychological Science (Honours) and is currently completing a Master of Clinical Psychology.",
    experience: [
      "Provisional psychologist, GOALS Psychology, Fortitude Valley",
      "Evidence-based practice for clients who have experienced trauma",
      "Work with refugee and newly arrived clients, and clients from culturally and linguistically diverse (CALD) backgrounds",
      "Displacement, cultural transition and complex trauma",
      "Cognitive Behavioural Therapy (CBT), Acceptance and Commitment Therapy (ACT), Dialectical Behaviour Therapy (DBT) and Narrative Therapy",
      "Bachelor of Psychology, Macquarie University",
      "Bachelor of Psychological Science (Honours)",
      "Master of Clinical Psychology, currently completing",
    ],
    languages: ["English"],
    careAreas: ["trauma-informed", "non-medication"],
    careAreasSometimes: ["autism-adhd", "emotional-regulation", "anxiety", "depression"],
    // "cultural sensitivity to tailor interventions to their unique lived experiences" and
    // "a safe collaborative space" — her own page, and nothing read into it.
    manner: ["culturally_attuned", "collaborative", "non_judgmental"],
    expertise: ["emotional-regulation"],
    wheelchairAccessible: true,
    appointmentLength: "50-minute sessions; times set with the clinic",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.halaxy.com/book/goals-psychology/location/726621",
      note: "GOALS Psychology books through Halaxy, and offers new clients a free 15-minute call first.",
    },
    realPerson: true,
  },
  {
    id: "meera-lakhani",
    name: "Meera Lakhani",
    shortName: "Meera Lakhani",
    profession: "psychologist",
    gender: "woman",
    pronouns: "she/her",
    title: "Educational and developmental psychologist, BPsychSc MPsych(Ed&Dev)",
    suburb: "Fortitude Valley",
    practice: "GOALS Psychology",
    reach: "Clinic appointments in Fortitude Valley, and telehealth Australia-wide",
    image: "/clinicians/meera-lakhani.jpg",
    acceptingNewPatients: true,
    focus: "Autism, ADHD and cognitive assessment, educational and developmental",
    matchLine: "Autism, ADHD and cognitive assessment that leaves you understanding your own neurotype better.",
    fitSignals: ["Autism & ADHD assessment", "Cognitive assessment", "Educational & developmental"],
    practicalSignals: ["Independent clinic; fee quoted when you book", "Arranged with the clinic rather than booked online"],
    summary:
      "Meera works with children, teenagers and adults. Her current focus is neurodivergence assessment: autism assessment, ADHD assessment and cognitive assessment.",
    about:
      "Meera works with children, teenagers and adults. She enjoys working with clients to understand their goals then create a plan to achieve their goals. Meera is passionate about helping clients to identify their unique areas of strengths and difficulties and collaborate with relevant stakeholders to maximise positive outcomes in their lives. Meera's current focus is on neurodivergence assessments: autism assessment, ADHD assessment and cognitive assessment. She utilises assessment tools including WISC, WAIS, WIAT, MIGDAS and others as required to support clients with discovering an enhanced understanding of their unique neurotype. Meera is especially passionate about working with young adults and their families, in a way that aligns with their values and beliefs, to be the best version of themselves. She thrives on supporting clients to lean into vulnerability, learn new skills and navigate life's challenges. Meera holds a Bachelor of Psychological Science from The University of Queensland and a Master of Psychology - Educational & Developmental from Queensland University of Technology. She has previously worked as a Psychologist in a school and at the Queensland Children's Hospital Child Development Service.",
    experience: [
      "Educational and developmental psychologist, GOALS Psychology, Fortitude Valley",
      "Neurodivergence assessment: autism assessment, ADHD assessment and cognitive assessment",
      "Assessment tools including the WISC, WAIS, WIAT and MIGDAS",
      "Educational and developmental assessments",
      "Circle of Security (COS), Cognitive Behavioural Therapy (CBT), Acceptance and Commitment Therapy (ACT) and attachment theory",
      "Previously a psychologist in a school, and at the Queensland Children's Hospital Child Development Service",
      "Bachelor of Psychological Science, University of Queensland",
      "Master of Psychology (Educational & Developmental), Queensland University of Technology",
    ],
    languages: ["English"],
    careAreas: ["adhd-assessment", "autism-adhd", "child-adolescent-adhd"],
    careAreasSometimes: ["non-medication"],
    manner: ["sense_making", "collaborative", "motivating"],
    expertise: ["late-diagnosis"],
    wheelchairAccessible: true,
    appointmentLength: "Arranged with the clinic rather than booked online",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.goalspsychology.com/contact",
      note: "Meera's appointments are arranged with the clinic rather than booked online.",
    },
    realPerson: true,
  },
  {
    id: "flynn-simonis",
    name: "Flynn Simonis",
    shortName: "Flynn Simonis",
    profession: "occupational-therapist",
    gender: "man",
    pronouns: "he/him",
    title: "Occupational therapist",
    suburb: "Fortitude Valley",
    practice: "GOALS Psychology",
    reach: "Clinic appointments in Fortitude Valley, telehealth Australia-wide, and home, school and community visits across Brisbane",
    image: "/clinicians/flynn-simonis.jpg",
    acceptingNewPatients: true,
    focus: "Paediatric occupational therapy led by the child's own interests",
    matchLine: "Paediatric occupational therapy led by the child's own interests, in clinic, at home or at school.",
    fitSignals: ["Paediatric OT", "Home & school visits", "FCA report writing"],
    practicalSignals: ["Independent clinic; fee quoted when you book", "Clinic, home, kindergarten and school visits"],
    summary:
      "Flynn works with toddlers, children, teenagers and young adults. He runs sessions guided by his client's interests, in clinic, at home, at kindergarten or at school.",
    about:
      "Flynn works with toddlers, children, teenagers and young adults. He is experienced working with clients who have experienced developmental trauma, neurodivergence, autism, Attention-Deficit Hyperactivity Disorder (ADHD), school refusal / school can't, developmental delay, non-verbal communication profiles, Generalised Anxiety Disorder (GAD), emotional regulation, parenting support, intellectual disability, Oppositional Defiant Disorder (ODD), Rett Syndrome, and Muscular Dystrophy and many other presentations. Flynn enjoys supporting children with varying communication styles, sensory profiles, emotional regulation needs, and functional challenges. Flynn is particularly passionate about paediatric occupational therapy including play therapy and parent training. He facilitates sessions that are guided by his client's interests, recognising that children engage and learn best when therapy is meaningful and motivating towards skill development for participation in everyday life. Flynn emphasises a foundation of communication with families, schools and multidisciplinary teams, to create a safe, supportive, creative and fun therapy environment. He values family-centred practice in working with caregivers to ensure that recommended strategies are practical, achievable and able to be easily implemented into daily routines. Flynn offers in-clinic, home visits, kindergarten and school visit appointments where appropriate towards his clients' goals. Flynn is also experienced with Functional Capacity Assessments (FCAs) and report writing, and facilitating group programs including LEGO, Minecraft and Ninja Warrior-style social and movement programs, outdoor adventure and nature camps, all supporting goals including social skills, teamwork, and motor development, building independence, resilience, and confidence in children and young people.",
    experience: [
      "Occupational therapist, GOALS Psychology, Fortitude Valley",
      "Paediatric occupational therapy, including play therapy and parent training",
      "Functional Capacity Assessments (FCAs) and report writing",
      "Group programs including LEGO, Minecraft and Ninja Warrior-style social and movement programs",
      "Outdoor adventure and nature camps building independence, resilience and confidence",
      "Sensory profiles, emotional regulation needs and functional challenges",
      "Family-centred practice with caregivers, schools and multidisciplinary teams",
      "In-clinic, home visit, kindergarten and school visit appointments",
    ],
    languages: ["English"],
    careAreas: ["non-medication"],
    careAreasSometimes: ["child-adolescent-adhd", "autism-adhd", "emotional-regulation"],
    // "a safe, supportive, creative and fun therapy environment", "family-centred practice in
    // working with caregivers", "guided by his client's interests" — his page, in the closed
    // manner vocabulary.
    manner: ["steadying", "collaborative", "motivating"],
    expertise: ["emotional-regulation", "household-organisation"],
    wheelchairAccessible: true,
    appointmentLength: "Clinic, home, kindergarten and school visits; times set with the clinic",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.halaxy.com/book/goals-psychology/location/726621",
      note: "GOALS Psychology books through Halaxy, and offers new clients a free 15-minute call first.",
    },
    realPerson: true,
  },
];

/** The profession an entry carries, with the roster's original meaning — no profession is a GP. */
export function professionOf(clinician: Pick<Clinician, "profession">): Profession {
  return clinician.profession ?? "gp";
}
