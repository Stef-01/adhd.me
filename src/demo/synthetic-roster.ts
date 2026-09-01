// O217: the synthetic example roster — invented GP profiles the finder can OPT INTO for testing.
//
// FOUNDER DECISION `synthetic-roster-tickbox` (src/design/founder-gates.ts, 2026-09-01) is the
// authority for this file's existence: the persona purge made the `clinicians` roster
// real-people-only, and the founder has asked for example profiles back — in the live finder,
// behind a reader-visible tickbox, this deployment only, because "this finder system of the
// adhdme repo is not public so it's ok it's just for testing".
//
// WHAT KEEPS THIS FROM BEING THE THING THE PURGE REMOVED. The purge's harm was invented detail
// PRESENTED AS REAL: fabricated availability under plausible names, bookable-looking mocks.
// Every line of defence here is against that, and `synthetic-roster.test.ts` enforces each:
//   * `synthetic: true` on every entry, never `realPerson` — the surfaces read the flag and say
//     "Example profile" out loud wherever one renders;
//   * `image: null` always — the monogram renders; nothing generates a face, because a generated
//     face IS a fabricated person presented as genuine;
//   * `booking.via: "synthetic-none"` with no url — there is nobody to book and no control that
//     pretends otherwise;
//   * practice names self-mark ("… Example Practice"), so no invented practice can collide with
//     a real business;
//   * no `disclosedInterest` — an invented conflict is still an invented claim, and the
//     founder-behind ranking laws stay testable against real data only;
//   * every rendered string passes the same patient-surface linter as real copy — invented does
//     not mean exempt, it renders to the same reader;
//   * the `clinicians` export, ROSTER_SIZE, the coverage map and every public count stay
//     real-only: this list reaches a ranking ONLY through the finder's tickbox.
//
// THIS IS NOT `syntheticClinician()` (synthetic-clinician.ts) AND MUST NOT MERGE WITH IT. That
// template is the engine tests' neutral blank and its own law says it never reaches a surface;
// these personas exist to reach one. Coupling them would put fifty ranking laws back at the
// mercy of somebody editing a persona for looks — the exact tangle W193/O179 untied.
//
// WHY THE SET LOOKS THE WAY IT DOES. Eight personas, designed rather than sampled: together
// with the two real GPs they cover every `CareArea` in the closed vocabulary, four matchable
// languages beyond the real roster's, all three genders, a spread of manner facets, two closed
// books (the closed-outranks-nothing law visible), stale and fresh capacity declarations (all
// three O56 freshness grades render), and one telehealth-first entry (the distance law's
// exception exercised). Suburbs are real gazetteer rows so computed distance works — a suburb
// is a place, not a person, and inventing one would break the arithmetic without protecting
// anybody.

import type { Clinician } from "./roster";
import { clinicians } from "./roster";

/** The one sentence every persona's `about` must end with — the census pins its presence. */
export const SYNTHETIC_ABOUT_NOTICE =
  "This is a fictional example profile used for trying the finder. It describes nobody.";

/** The shared booking explanation — the census pins that no persona carries anything else. */
export const SYNTHETIC_BOOKING_NOTE =
  "This is an example profile used for trying the finder. There is nobody to book.";

export const SYNTHETIC_CLINICIANS: readonly Clinician[] = [
  {
    id: "example-mei-chao",
    name: "Dr Mei Chao",
    shortName: "Dr Chao",
    gender: "woman",
    pronouns: "she/her",
    title: "General practitioner, MBBS FRACGP",
    suburb: "Epping",
    practice: "Epping Example Practice",
    reach: "Practice appointments",
    image: null,
    acceptingNewPatients: true,
    capacityDeclaredAt: "2026-08-25",
    focus: "ADHD assessment across ages, titration",
    matchLine: "Says she sees ADHD assessment often, for adults and for school-age patients, with titration reviewed on a schedule.",
    fitSignals: ["ADHD assessment", "Children and adolescents", "Titration", "Mandarin"],
    practicalSignals: ["Mixed billing"],
    summary:
      "Mei says she sees ADHD assessment often, in adults and in children and adolescents, and reviews titration on a set schedule. She consults in English and Mandarin.",
    about:
      `Mei is an invented example GP. Her profile declares frequent adult and child ADHD assessment, scheduled titration review, and consultations in English and Mandarin. ${SYNTHETIC_ABOUT_NOTICE}`,
    experience: ["Structured adult ADHD assessment", "Child and adolescent assessment", "Titration and scheduled review"],
    languages: ["English", "Mandarin"],
    careAreas: ["adhd-assessment", "child-adolescent-adhd", "titration"],
    manner: ["unhurried", "collaborative"],
    wheelchairAccessible: true,
    appointmentLength: "Long first appointment",
    booking: { via: "synthetic-none", note: SYNTHETIC_BOOKING_NOTE },
    synthetic: true,
  },
  {
    id: "example-tomas-rivera",
    name: "Dr Tomás Rivera",
    shortName: "Dr Rivera",
    gender: "man",
    pronouns: "he/him",
    title: "General practitioner, MD FRACGP",
    suburb: "Bondi Junction",
    practice: "Bondi Junction Example Practice",
    reach: "Practice appointments",
    image: null,
    acceptingNewPatients: true,
    // Stale on purpose: an open declaration past the 90-day freshness window, so the
    // stale-open capacity grade renders somewhere a tester can see it.
    capacityDeclaredAt: "2026-04-02",
    focus: "ADHD assessment alongside low mood and anxiety",
    matchLine: "Says he often sees ADHD questions that arrive together with low mood or anxiety.",
    fitSignals: ["ADHD assessment", "Low mood", "Anxiety", "Spanish"],
    practicalSignals: ["Mixed billing"],
    summary:
      "Tomás says he often sees ADHD questions that arrive together with low mood or anxiety, and works out with the patient which thread to pull first. He consults in English and Spanish.",
    about:
      `Tomás is an invented example GP. His profile declares frequent ADHD assessment alongside depression and anxiety care, and consultations in English and Spanish. ${SYNTHETIC_ABOUT_NOTICE}`,
    experience: ["Adult ADHD assessment", "Depression and anxiety care in general practice"],
    languages: ["English", "Spanish"],
    careAreas: ["adhd-assessment", "depression", "anxiety"],
    manner: ["attuned", "non_judgmental"],
    wheelchairAccessible: true,
    appointmentLength: "Appointment lengths set with the practice",
    booking: { via: "synthetic-none", note: SYNTHETIC_BOOKING_NOTE },
    synthetic: true,
  },
  {
    id: "example-priya-nair",
    name: "Dr Priya Nair",
    shortName: "Dr Nair",
    gender: "woman",
    pronouns: "she/her",
    title: "General practitioner, MBBS FRACGP DCH",
    suburb: "Hornsby",
    practice: "Hornsby Example Practice",
    reach: "Practice appointments",
    image: null,
    // Closed books: the closed-never-outranks-open-at-equal-fit law, visible to a tester.
    acceptingNewPatients: false,
    capacityDeclaredAt: "2026-08-20",
    focus: "ADHD and autism presenting together, non-medication supports",
    matchLine: "Says she often sees ADHD and autism presenting together, and gives the non-medication half of a plan real room.",
    fitSignals: ["ADHD assessment", "Autism and ADHD", "Non-medication supports", "Malayalam"],
    practicalSignals: ["Mixed billing"],
    summary:
      "Priya says she often sees co-occurring ADHD and autism, and puts as much of the plan into non-medication supports as into anything else. She consults in English and Malayalam.",
    about:
      `Priya is an invented example GP. Her profile declares frequent co-occurring ADHD and autism work and non-medication supports, and consultations in English and Malayalam. ${SYNTHETIC_ABOUT_NOTICE}`,
    experience: ["Adult ADHD assessment", "Co-occurring autism and ADHD", "Non-medication and psychological supports"],
    languages: ["English", "Malayalam"],
    careAreas: ["adhd-assessment", "autism-adhd", "non-medication"],
    manner: ["sense_making", "collaborative"],
    wheelchairAccessible: false,
    appointmentLength: "Long first appointment",
    booking: { via: "synthetic-none", note: SYNTHETIC_BOOKING_NOTE },
    synthetic: true,
  },
  {
    id: "example-owen-hartley",
    name: "Dr Owen Hartley",
    shortName: "Dr Hartley",
    gender: "man",
    pronouns: "he/him",
    title: "General practitioner, MBBS FRACGP",
    suburb: "Southport",
    practice: "Southport Example Practice",
    reach: "Telehealth and practice appointments",
    image: null,
    acceptingNewPatients: true,
    capacityDeclaredAt: "2026-08-28",
    focus: "Structured assessment, titration, substance history taken seriously",
    matchLine: "Says he works from a documented baseline, reviews titration on a schedule, and takes a substance history as a safety question.",
    fitSignals: ["ADHD assessment", "Titration", "Substance history", "Telehealth"],
    practicalSignals: ["Mixed billing", "Telehealth follow-ups"],
    summary:
      "Owen says he works from a documented baseline, reviews titration on a schedule, and takes a substance history as a safety question rather than a judgement. First appointments can be by telehealth.",
    about:
      `Owen is an invented example GP. His profile declares structured assessment, scheduled titration review, substance-history care, and telehealth-first appointments. ${SYNTHETIC_ABOUT_NOTICE}`,
    experience: ["Structured adult ADHD assessment", "Titration and scheduled review", "Substance-history care in general practice"],
    languages: ["English"],
    careAreas: ["adhd-assessment", "titration", "substance-history"],
    manner: ["structured", "steadying"],
    wheelchairAccessible: true,
    appointmentLength: "Long first appointment, scheduled reviews",
    telehealthFirstAppointment: true,
    booking: { via: "synthetic-none", note: SYNTHETIC_BOOKING_NOTE },
    synthetic: true,
  },
  {
    id: "example-sarah-whitfield",
    name: "Dr Sarah Whitfield",
    shortName: "Dr Whitfield",
    gender: "woman",
    pronouns: "she/her",
    title: "General practitioner, MBBS FRACGP",
    suburb: "Pennant Hills",
    practice: "Pennant Hills Example Practice",
    reach: "Practice appointments",
    image: null,
    acceptingNewPatients: true,
    capacityDeclaredAt: "2026-08-22",
    focus: "Trauma-aware assessment, emotional regulation",
    matchLine: "Says she often sees emotional regulation and rejection sensitivity first, and takes assessment at a trauma-aware pace.",
    fitSignals: ["ADHD assessment", "Emotional regulation", "Trauma-aware care"],
    practicalSignals: ["Mixed billing", "Extended first appointment"],
    summary:
      "Sarah says the thing she hears first is often emotional regulation and rejection sensitivity, and that she takes assessment at a trauma-aware pace with time to be heard.",
    about:
      `Sarah is an invented example GP. Her profile declares trauma-aware ADHD assessment and frequent emotional-regulation work. ${SYNTHETIC_ABOUT_NOTICE}`,
    experience: ["Adult ADHD assessment", "Trauma-aware general practice", "Emotional regulation and rejection sensitivity"],
    languages: ["English"],
    careAreas: ["adhd-assessment", "emotional-regulation", "trauma-informed"],
    manner: ["attuned", "steadying", "non_judgmental"],
    wheelchairAccessible: true,
    appointmentLength: "Extended first appointment",
    booking: { via: "synthetic-none", note: SYNTHETIC_BOOKING_NOTE },
    synthetic: true,
  },
  {
    id: "example-daniel-okafor",
    name: "Dr Daniel Okafor",
    shortName: "Dr Okafor",
    gender: "man",
    pronouns: "he/him",
    title: "General practitioner, MBBS FRACGP",
    suburb: "Surfers Paradise",
    practice: "Surfers Paradise Example Practice",
    reach: "Practice appointments",
    image: null,
    acceptingNewPatients: true,
    // Stale on purpose — the second stale-open grade, so the state is not a single row's quirk.
    capacityDeclaredAt: "2026-03-15",
    focus: "Shared care, complex presentations held with their psychiatrist",
    matchLine: "Says he often carries GP shared care under a psychiatrist's plan, including complex presentations.",
    fitSignals: ["ADHD assessment", "Shared care", "Complex presentations", "Igbo"],
    practicalSignals: ["Mixed billing"],
    summary:
      "Daniel says he often carries GP shared care under a psychiatrist's or paediatrician's plan, including bipolar and other complex presentations held with their psychiatrist and team. He consults in English and Igbo.",
    about:
      `Daniel is an invented example GP. His profile declares frequent shared-care arrangements and complex presentations held with their psychiatrist, and consultations in English and Igbo. ${SYNTHETIC_ABOUT_NOTICE}`,
    experience: ["GP shared care under psychiatrist plans", "Complex presentations held with their psychiatrist and team"],
    languages: ["English", "Igbo"],
    careAreas: ["adhd-assessment", "shared-care", "complex-mental-health"],
    manner: ["sense_making", "structured"],
    wheelchairAccessible: true,
    appointmentLength: "Appointment lengths set with the practice",
    booking: { via: "synthetic-none", note: SYNTHETIC_BOOKING_NOTE },
    synthetic: true,
  },
  {
    id: "example-hana-yoshida",
    name: "Dr Hana Yoshida",
    shortName: "Dr Yoshida",
    gender: "woman",
    pronouns: "she/her",
    title: "General practitioner, MBBS FRACGP",
    suburb: "Rose Bay",
    practice: "Rose Bay Example Practice",
    reach: "Practice appointments",
    image: null,
    // The second closed-books entry, so closed rows appear in more than one suburb.
    acceptingNewPatients: false,
    capacityDeclaredAt: "2026-08-10",
    focus: "ADHD assessment alongside anxiety, non-medication supports",
    matchLine: "Says she often sees anxiety and ADHD presenting through each other, with unhurried appointments and non-medication supports in the plan.",
    fitSignals: ["ADHD assessment", "Anxiety", "Non-medication supports", "Vietnamese"],
    practicalSignals: ["Mixed billing"],
    summary:
      "Hana says she often sees anxiety and ADHD presenting through each other, keeps first appointments unhurried, and gives non-medication supports real room in the plan. She consults in English and Vietnamese.",
    about:
      `Hana is an invented example GP. Her profile declares frequent anxiety-and-ADHD work, unhurried appointments and non-medication supports, and consultations in English and Vietnamese. ${SYNTHETIC_ABOUT_NOTICE}`,
    experience: ["Adult ADHD assessment", "Anxiety care in general practice", "Non-medication and psychological supports"],
    languages: ["English", "Vietnamese"],
    careAreas: ["adhd-assessment", "anxiety", "non-medication"],
    careAreasSometimes: ["depression"],
    manner: ["unhurried", "culturally_attuned"],
    wheelchairAccessible: false,
    appointmentLength: "Long first appointment",
    booking: { via: "synthetic-none", note: SYNTHETIC_BOOKING_NOTE },
    synthetic: true,
  },
  {
    id: "example-ash-coleman",
    name: "Dr Ash Coleman",
    shortName: "Dr Coleman",
    gender: "non-binary",
    pronouns: "they/them",
    title: "General practitioner, MBBS FRACGP",
    suburb: "Robina",
    practice: "Robina Example Practice",
    reach: "Telehealth and practice appointments",
    image: null,
    acceptingNewPatients: true,
    capacityDeclaredAt: "2026-08-27",
    focus: "ADHD assessment, low mood, emotional regulation",
    matchLine: "Says they often see ADHD alongside low mood and emotional regulation, and decide the plan with the patient.",
    fitSignals: ["ADHD assessment", "Low mood", "Emotional regulation", "Telehealth"],
    practicalSignals: ["Mixed billing", "Telehealth follow-ups"],
    summary:
      "Ash says they often see ADHD alongside low mood and emotional-regulation questions, work from strengths, and decide the plan with the patient rather than for them. First appointments can be by telehealth.",
    about:
      `Ash is an invented example GP. Their profile declares frequent ADHD, low-mood and emotional-regulation work, collaborative planning, and telehealth-first appointments. ${SYNTHETIC_ABOUT_NOTICE}`,
    experience: ["Adult ADHD assessment", "Depression care in general practice", "Emotional regulation and rejection sensitivity"],
    languages: ["English"],
    careAreas: ["adhd-assessment", "depression", "emotional-regulation"],
    manner: ["collaborative", "motivating"],
    wheelchairAccessible: true,
    appointmentLength: "Long first appointment",
    telehealthFirstAppointment: true,
    booking: { via: "synthetic-none", note: SYNTHETIC_BOOKING_NOTE },
    synthetic: true,
  },
];

/**
 * The roster the finder ranks while the tickbox is ON: the real entries first in source order,
 * then the personas. Source order is NOT display order — `rankClinicians` sorts it — this is
 * just the honest construction: nothing here removes or reorders a real entry.
 */
export const demoRoster: readonly Clinician[] = [...clinicians, ...SYNTHETIC_CLINICIANS];
