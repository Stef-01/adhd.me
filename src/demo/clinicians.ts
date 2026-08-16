import type { CareArchetype, CareArea } from "./care-archetypes";
import { describeDistance, distanceKm, resolvePlace, type SuburbPoint } from "@/geo/suburbs";
import { emotionalFitScore, emotionalFitSignals, type EIQuality } from "./emotional-fit";

/**
 * The roster behind /finder and the walkthrough.
 *
 * EVERY ENTRY IS NOW A REAL PERSON, WHICH INVERTS WHAT THIS FILE USED TO BE. It held fifteen
 * invented personas — invented people, invented availability, invented suburbs — with Dr Saxena
 * as the single marked exception, and that is what let the finder be shown to anybody without a
 * practice agreement in place. The personas are gone. Two real GPs at Beecroft Family & Skin
 * Cancer Clinic remain, and `realPerson` is set on both.
 *
 * THE COST OF THAT IS THAT NOTHING HERE MAY BE INVENTED ANY MORE, and several fields did not
 * survive the change. `nextAvailable` held a written-in time and is deleted (see `booking`).
 * Qualifications, languages, practice, prior posts and the biographies are taken from what each
 * doctor publishes about himself; where this file says something neither of them has published —
 * `nswAdhdTrained` above all — it is a DECLARATION relayed from the founders, not a check ADHD.ME
 * performed, and the surfaces say so.
 *
 * A NOTE ON WHAT IS STILL OWED. Dr Yadav's biography is written from his public record and his
 * co-founders' account of how he works, not from his own words. That is a stopgap: a biography is
 * the one field a clinician should write himself, and this one should be replaced with his copy
 * before the directory gate (G6) lifts.
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

export type { CareArea };

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
      };
  acceptingNewPatients: boolean;
  focus: string;
  matchLine: string;
  fitSignals: string[];
  practicalSignals: string[];
  about: string;
  experience: string[];
  languages: string[];
  careAreas: CareArea[];
  wheelchairAccessible: boolean;
  appointmentLength: string;
  keywords: string[];
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
   * Set when the entry describes a real, identifiable clinician rather than a demo persona.
   *
   * The finder shows synthetic and real entries side by side, and a reader cannot tell them apart
   * from the copy. Holding it as data means a surface can say which is which, and means nobody
   * later mistakes a real person's record for one they may freely edit.
   */
  realPerson?: true;
  /**
   * A material interest the reader would want disclosed — carried BESIDE the listing, always.
   *
   * A founder of this product appearing in its own directory is a conflict whether or not the
   * ranking favours them, because the reader cannot see the ranking. The disclosure is a field on
   * the record rather than a sentence in someone's `about`, so it cannot be edited out of the copy
   * while the interest remains, and so the finder renders it without having to know who is who.
   *
   * The public directory (src/directory/profile.ts) has no equivalent field yet and does not need
   * one while `SHIPPED_DIRECTORY_PROFILES` is empty behind founder gate G6. It WILL need one
   * before that gate lifts, and adding it there means an entry in W193's `DISCLOSED_FIELDS` too.
   */
  founderInterest?: string;
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
    practice: "Beecroft Family & Skin Cancer Clinic",
    reach: "Practice appointments and phone consultations",
    image: "/clinicians/anubhav-saxena.png",
    acceptingNewPatients: true,
    focus: "Structured assessment, baseline physical screening & titration",
    matchLine: "A measured assessment with the physical baseline done properly, then titration reviewed on a schedule.",
    fitSignals: ["ADHD assessment", "Baseline physical screening", "Titration", "Phone consultations"],
    practicalSignals: ["Mixed billing", "Phone consultations", "Structured review schedule"],
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
      "adult-adhd",
      "titration",
      "cardiac-screening",
      "substance-history",
      "sleep",
      "shared-care",
    ],
    nswAdhdTrained: true,
    wheelchairAccessible: true,
    appointmentLength: "Long first appointment, scheduled reviews",
    telehealthFirstAppointment: true,
    booking: {
      via: "healthengine",
      practitionerId: "123180",
      url: "https://healthengine.com.au/doctor/nsw/beecroft/dr-anubhav-saxena/p123180",
    },
    keywords: ["adhd", "assessment", "structured", "thorough", "measured", "baseline", "bloods", "pathology", "physical", "heart", "cardiac", "cardiovascular", "blood pressure", "metabolic", "sleep", "titration", "dose", "medication", "stimulant", "monitoring", "review", "telehealth", "phone", "remote", "online", "substance", "drinking", "alcohol", "cannabis", "history", "non-stimulant", "shared care", "hindi", "urdu", "adult", "founder"],
    realPerson: true,
    founderInterest:
      "Dr Saxena is a co-founder of ADHD.ME. Disclosed because he appears in a directory his own company operates, and a reader cannot see the ranking that put him there.",
  },
  {
    id: "tushar-yadav",
    name: "Dr Tushar Yadav",
    shortName: "Dr Yadav",
    gender: "man",
    pronouns: "he/him",
    title: "General practitioner, MBBS",
    suburb: "Beecroft",
    practice: "Beecroft Family & Skin Cancer Clinic",
    reach: "Practice appointments",
    // No portrait supplied. Renders as a monogram; nothing here generates a face for a real person.
    image: null,
    acceptingNewPatients: true,
    focus: "Unhurried first appointments & ADHD care alongside the rest of general practice",
    matchLine: "A longer first appointment with a GP who will take the whole history before reaching for a conclusion.",
    fitSignals: ["ADHD assessment", "Longer first appointment", "Hindi", "Family context"],
    practicalSignals: ["Mixed billing", "Beecroft rooms", "Longer first appointment"],
    about:
      "Tushar qualified in medicine at Monash and has worked across Western Sydney and the North Shore — Royal North Shore, Western Sydney Local Health District, North Sydney — before joining the Beecroft practice. He sees ADHD the way he sees the rest of general practice: as something that arrives in the middle of a whole life, usually alongside sleep that has never been right, a job that has become hard to hold, or a family who have their own view about what is going on. He would rather spend a long first appointment getting the history straight than reach a conclusion quickly, and he speaks Hindi, which for a good number of families in this part of Sydney is the difference between explaining something and explaining it properly.",
    experience: [
      "Adult ADHD assessment",
      "Longer first appointments",
      "Sleep and mood alongside ADHD",
      "Family and cultural context",
    ],
    languages: ["English", "Hindi"],
    careAreas: [
      "adhd-assessment",
      "adult-adhd",
      "comorbid-mood",
      "sleep",
      "shared-care",
    ],
    nswAdhdTrained: true,
    wheelchairAccessible: true,
    appointmentLength: "Longer first appointments available",
    // NOT BOOKABLE ONLINE, AND THIS IS A FACT RATHER THAN A GAP. Healthengine lists Dr Yadav at
    // this practice as "Not Available" with no Book control, because his column is not synced to
    // their platform. Inventing a slot picker for him would be inventing appointments for a real
    // clinician, so the surface sends the reader to the practice instead and says why.
    booking: {
      via: "practice",
      url: "https://healthengine.com.au/medical-centre/nsw/beecroft/beecroft-family-and-skin-cancer-clinic/s15072",
      note: "Dr Yadav's appointments are not online yet — the practice books him by phone.",
    },
    keywords: ["adhd", "assessment", "adult", "unhurried", "longer", "long appointment", "history", "sleep", "insomnia", "mood", "anxiety", "depression", "family", "cultural", "culture", "hindi", "indian", "south asian", "work", "job", "beecroft", "shared care", "explain", "calm"],
    realPerson: true,
  },
];

/**
 * Rank the roster against a free-text request.
 *
 * The weights are per-clinician and per-phrase, which is a deliberate refusal to build a general
 * relevance model: a general model would be a quality ranking of named clinicians derived from
 * inference, which W83 refused internally and which is worse in public. These weights only
 * express what each clinician SAYS they see often, matched against what the person SAID they want.
 */
export function rankClinicians(query: string): Clinician[] {
  const words = query.toLowerCase();
  const focusSignals: Record<string, Array<[string, number]>> = {
    "anubhav-saxena": [["structured", 26], ["thorough", 24], ["measured", 22], ["baseline", 24], ["bloods", 22], ["pathology", 20], ["physical", 18], ["heart", 16], ["cardiac", 16], ["blood pressure", 16], ["metabolic", 20], ["titration", 22], ["dose", 18], ["stimulant", 18], ["monitoring", 20], ["review", 16], ["telehealth", 30], ["phone", 22], ["remote", 24], ["online", 24], ["substance", 26], ["drinking", 24], ["alcohol", 24], ["cannabis", 24], ["non-stimulant", 26], ["shared care", 14], ["urdu", 26], ["adhd", 8], ["assessment", 10]],
    "tushar-yadav": [["unhurried", 26], ["longer", 22], ["long appointment", 24], ["not rushed", 26], ["rushed", 20], ["time", 12], ["history", 20], ["whole story", 24], ["listen", 22], ["sleep", 22], ["insomnia", 22], ["tired", 18], ["exhausted", 18], ["mood", 20], ["anxiety", 18], ["anxious", 18], ["depression", 18], ["family", 16], ["cultural", 20], ["culture", 20], ["hindi", 26], ["indian", 16], ["south asian", 18], ["work", 16], ["job", 16], ["explain", 14], ["calm", 14], ["adhd", 8], ["assessment", 10]],
  };

  return [...clinicians].sort((a, b) => {
    const score = (clinician: Clinician) => {
      const focusScore = (focusSignals[clinician.id] ?? []).reduce(
        (total, [keyword, weight]) => total + (words.includes(keyword) ? weight : 0),
        0,
      );
      const mannerScore = clinician.keywords.reduce(
        (total, keyword) => total + (words.includes(keyword) ? 2 : 0),
        0,
      );
      const requestsWoman = /\b(?:woman|female)\s+(?:gp|doctor|clinician)\b/.test(words)
        || /\bprefer(?:red)?\s+(?:a\s+)?woman\b/.test(words);
      const genderScore = requestsWoman && clinician.gender === "woman" ? 18 : 0;
      const languageScore = clinician.languages.some((language) =>
        language !== "English" && words.includes(language.toLowerCase()),
      ) ? 18 : 0;
      return focusScore + mannerScore + genderScore + languageScore;
    };

    const byScore = score(b) - score(a);
    if (byScore !== 0) return byScore;

    /**
     * A TIE MUST NEVER BE BROKEN IN THE FOUNDER'S FAVOUR, AND UNTIL NOW IT SILENTLY WAS.
     *
     * `Array.prototype.sort` is stable, so equal scores kept source order — and Dr Saxena is the
     * first record in the file. On "I think I might have ADHD and I would like an assessment",
     * which names nothing either GP is weighted for, both score identically and the founder took
     * first place on every such request. With fifteen invented clinicians the effect was buried
     * under the noise of a long roster; with two it is half the queries, and it is exactly the
     * bias a reader cannot see and cannot check.
     *
     * Reordering the file would only move the accident. The rule is stated instead: where the
     * stated preference does not separate them, a clinician with a disclosed interest in this
     * product sorts BEHIND one without. It costs the founder nothing he has earned on fit, and it
     * means the top slot is never his by default.
     */
    const conflicted = (clinician: Clinician) => (clinician.founderInterest ? 1 : 0);
    return conflicted(a) - conflicted(b);
  });
}

/**
 * Rank by stated preference, then bring the near ones forward.
 *
 * TWO-STAGE ON PURPOSE. Distance does not outrank fit: somebody who asked for a Tamil-speaking GP
 * is not helped by the nearest one who does not speak Tamil, and a directory that sorted purely by
 * kilometres would quietly undo everything the preference weights express. So the preference order
 * is computed first and distance only reorders WITHIN a band of comparable fit.
 *
 * Clinicians whose suburb is not in the gazetteer keep their preference position rather than
 * sinking. An unknown location is a gap in our data, and penalising a practice for it would be
 * making them pay for our missing row.
 */
export function rankCliniciansNear(query: string, origin: SuburbPoint | null): Clinician[] {
  const byFit = rankClinicians(query);
  if (!origin) return byFit;

  const fitRank = new Map(byFit.map((c, i) => [c.id, i]));
  const km = (c: Clinician) => {
    const point = resolvePlace(c.suburb);
    return point ? distanceKm(origin, point) : null;
  };

  return [...byFit].sort((a, b) => {
    const byPreference = fitRank.get(a.id)! - fitRank.get(b.id)!;
    // Somebody you do not travel to is equally near from everywhere, so distance has nothing to
    // say about them and their stated-preference position stands.
    if (a.telehealthFirstAppointment || b.telehealthFirstAppointment) return byPreference;
    if (Math.abs(byPreference) > COMPARABLE_FIT_BAND) return byPreference;
    const da = km(a);
    const db = km(b);
    if (da === null || db === null) return byPreference;
    return da - db;
  });
}

/**
 * How close in the preference order two clinicians must be before distance decides between them.
 *
 * Four is a judgement, and a small one on a sixteen-entry roster: it lets the top handful reorder
 * by geography while keeping somebody ranked 12th on fit from jumping to first for being nearby.
 */
const COMPARABLE_FIT_BAND = 4;

/** The distance sentence for a clinician, or null when there is nothing honest to say. */
export function distanceTo(clinician: Clinician, origin: SuburbPoint | null): string | null {
  // A kilometre figure beside somebody you never travel to is a number that answers no question.
  if (clinician.telehealthFirstAppointment) return "by telehealth, wherever you are";
  if (!origin) return null;
  const point = resolvePlace(clinician.suburb);
  if (!point) return null;
  return describeDistance(distanceKm(origin, point));
}

export function cliniciansMatchingArchetype(archetype: CareArchetype): Clinician[] {
  const { requirements } = archetype;

  return clinicians.filter((clinician) => {
    const matchesGender = !requirements.preferredGender || clinician.gender === requirements.preferredGender;
    const matchesLanguage = !requirements.languageOptions?.length || requirements.languageOptions.some((language) =>
      clinician.languages.some((spoken) => spoken.toLowerCase() === language.toLowerCase()),
    );
    const matchesCareAreas = requirements.careAreas.every((area) => clinician.careAreas.includes(area));
    const matchesAccess = !requirements.wheelchairAccessible || clinician.wheelchairAccessible;

    return matchesGender && matchesLanguage && matchesCareAreas && matchesAccess;
  });
}

/**
 * "a", "a and b", "a, b and c" - a readable list, so no surface needs a separator character.
 *
 * `Intl.ListFormat` rather than hand-rolled joining, for two reasons. It gets the Australian
 * conjunction right (no Oxford comma) without this file holding an opinion about it, and the
 * hand-rolled version indexed `items[items.length - 1]`, which W167's fold-site register counts
 * as a fold and would have needed a declared rationale. A fold that does not have to exist is
 * better removed than declared.
 */
const LIST_FORMAT = new Intl.ListFormat("en-AU", { style: "long", type: "conjunction" });

function asList(items: readonly string[]): string {
  return LIST_FORMAT.format(items);
}

export function getPersonalizedMatch(clinician: Clinician, query: string) {
  const words = query.toLowerCase();
  const signals: string[] = [];
  const hasAny = (terms: string[]) => terms.some((term) => words.includes(term));

  if (hasAny(["adhd", "attention", "assessment", "assessed", "diagnosis", "diagnosed"]) && clinician.careAreas.includes("adhd-assessment")) {
    signals.push("ADHD assessment");
  }
  if (hasAny(["child", "my son", "my daughter", "kid", "children", "teenager", "adolescent", "school"]) && clinician.careAreas.includes("child-adolescent-adhd")) {
    signals.push("Children and adolescents");
  }
  if (hasAny(["late", "missed", "masking", "coping", "perimenopause", "menopause", "hormonal", "woman", "women"]) && clinician.careAreas.includes("adhd-in-women")) {
    signals.push("Late-recognised presentations in women");
  }
  if (hasAny(["autism", "autistic", "audhd", "sensory"]) && clinician.careAreas.includes("autism-adhd")) {
    signals.push("Co-occurring autism");
  }
  if (hasAny(["titration", "dose", "side effects", "wearing off", "not working", "adjust", "review"]) && clinician.careAreas.includes("titration")) {
    signals.push("Titration and dose review");
  }
  if (hasAny(["heart", "cardiac", "cardiovascular", "blood pressure", "safe", "safety", "baseline", "physical"]) && clinician.careAreas.includes("cardiac-screening")) {
    signals.push("Baseline physical screening");
  }
  if (hasAny(["without medication", "no medication", "not just medication", "alternatives", "coaching", "habits"]) && clinician.careAreas.includes("non-medication")) {
    signals.push("Non-medication supports");
  }
  if (hasAny(["rejection sensitivity", "rsd", "emotional", "regulation", "shame", "overwhelmed"]) && clinician.careAreas.includes("emotional-regulation")) {
    signals.push("Emotional regulation");
  }
  if (hasAny(["anxiety", "anxious", "depression", "antidepressant", "misdiagnosed", "differential", "which one"]) && clinician.careAreas.includes("comorbid-mood")) {
    signals.push("Anxiety and mood differential");
  }
  if (hasAny(["substance", "drinking", "alcohol", "cannabis", "non-stimulant"]) && clinician.careAreas.includes("substance-history")) {
    signals.push("Substance history held safely");
  }
  if (hasAny(["sleep", "insomnia", "tired", "exhausted"]) && clinician.careAreas.includes("sleep")) {
    signals.push("Sleep review");
  }
  if (hasAny(["disability", "disabled", "wheelchair", "autonomy", "accessible", "adjustments", "ndis"]) && clinician.careAreas.includes("disability-rights")) {
    signals.push("Disability rights");
  }
  if (hasAny(["trauma history", "trauma-informed", "trauma", "childhood", "permission", "boundaries", "cptsd"]) && clinician.careAreas.includes("trauma-informed")) {
    signals.push("Trauma-informed care");
  }
  if (hasAny(["ptsd", "bipolar", "psychiatrist", "psychiatric", "complex mental health"]) && clinician.careAreas.includes("complex-mental-health")) {
    signals.push("Complex mental-health shared care");
  }
  if (hasAny(["work", "employer", "workplace", "university", "study", "adjustments", "letter", "documentation"]) && clinician.careAreas.includes("student-academic")) {
    signals.push("Study and workplace documentation");
  }
  if (hasAny(["paediatrician", "psychiatrist", "referral", "waitlist", "shared care", "already diagnosed", "diagnosed already"]) && clinician.careAreas.includes("shared-care")) {
    signals.push("Shared care");
  }

  const requestedLanguage = clinician.languages.find((language) =>
    language !== "English" && words.includes(language.toLowerCase()),
  );
  if (requestedLanguage) signals.push(`${requestedLanguage}-speaking`);

  const requestsWoman = /\b(?:woman|female)\s+(?:gp|doctor|clinician)\b/.test(words)
    || /\bprefer(?:red)?\s+(?:a\s+)?woman\b/.test(words)
    || /\bsafer with (?:a\s+)?[^.]*woman gp\b/.test(words);
  if (requestsWoman && clinician.gender === "woman") signals.push("Woman GP");

  if (hasAny(["telehealth", "remote", "online", "cannot travel", "can't travel"])
    && clinician.practicalSignals.some((signal) => signal.toLowerCase().includes("telehealth"))) {
    signals.push("Telehealth available");
  }
  if (hasAny(["wheelchair", "accessible"]) && clinician.wheelchairAccessible) {
    signals.push("Wheelchair accessible");
  }

  const uniqueSignals = [...new Set(signals)].slice(0, 4);
  // Joined as prose, not as a middle-dot chain. Four signals separated by dots is a metadata
  // strip pretending to be a sentence, and the surfaces that show the signals as pills would
  // then be printing the same list twice in two different visual languages.
  const reason = uniqueSignals.length
    ? `Matches your stated priorities: ${asList(uniqueSignals)}.`
    : "Accepting new patients. Review the profile to decide whether this approach fits.";

  return { signals: uniqueSignals, reason };
}
