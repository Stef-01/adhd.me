import type { CareArchetype, CareArea } from "./care-archetypes";
import { describeDistance, distanceKm, resolvePlace, type SuburbPoint } from "@/geo/suburbs";

/**
 * The demo roster behind /finder and the walkthrough.
 *
 * SYNTHETIC, WITH ONE EXCEPTION THAT IS MARKED. Fifteen of these are demo personas — invented
 * people, invented availability, invented suburbs — which is what lets the finder be shown to
 * anybody without a practice agreement in place. Dr Anubhav Saxena is a real person and a
 * founder of this product, and both of those facts are carried on the record rather than left
 * for a reader to discover: see `realPerson` and `founderInterest` below.
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
  nextAvailable: string;
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
    id: "maya-singh",
    name: "Dr Maya Singh",
    shortName: "Dr Singh",
    gender: "woman",
    pronouns: "she/her",
    title: "General practitioner",
    suburb: "Beecroft",
    reach: "Practice appointments",
    image: "/clinicians/maya-singh.png",
    nextAvailable: "Tuesday, 10:20 am",
    acceptingNewPatients: true,
    focus: "Adult ADHD assessment & late diagnosis in women",
    matchLine: "ADHD assessment that takes a lifetime of coping seriously as evidence, not as proof you are fine.",
    fitSignals: ["ADHD assessment", "Hindi & Punjabi", "Late diagnosis in women", "Longer first visits"],
    practicalSignals: ["Bulk billing eligible", "8 min by bus", "Evening appointments"],
    about:
      "Maya sees adults asking the question for the first time in their thirties or forties, often after a child was assessed. She works through developmental history, school reports where they still exist, and the coping strategies that hid the difficulty. She says plainly when the picture does not meet criteria.",
    experience: ["Adult ADHD assessment", "Late-recognised presentations in women", "Anxiety and low mood alongside ADHD", "Referral and shared care"],
    languages: ["English", "Hindi", "Punjabi"],
    careAreas: ["adhd-assessment", "adult-adhd", "adhd-in-women", "comorbid-mood"],
    nswAdhdTrained: true,
    wheelchairAccessible: false,
    appointmentLength: "Longer first appointments available",
    keywords: ["adhd", "assessment", "assessed", "diagnosis", "diagnosed", "adult", "late", "woman", "female", "women", "missed", "overlooked", "coping", "masking", "calm", "explain", "anxiety", "mood", "depression", "hindi", "punjabi", "indian", "south asian", "cultural", "culture", "family", "my daughter was diagnosed"],
  },
  {
    id: "daniel-okafor",
    name: "Dr Daniel Okafor",
    shortName: "Dr Okafor",
    gender: "man",
    pronouns: "he/him",
    title: "General practitioner",
    suburb: "Robina",
    reach: "Practice appointments",
    image: "/clinicians/daniel-okafor.png",
    nextAvailable: "Monday, 3:40 pm",
    acceptingNewPatients: true,
    focus: "Pre-treatment heart checks & titration monitoring",
    matchLine: "The physical-health half of starting medication: baseline checks first, then dose review that actually happens.",
    fitSignals: ["Cardiac screening", "Titration monitoring", "Shared care"],
    practicalSignals: ["Mixed billing", "9 min by train", "On-site pathology"],
    about:
      "Daniel does the groundwork a stimulant decision rests on: blood pressure, heart rate, cardiac and family history, and the questions that decide whether a specialist opinion is needed before anything is prescribed. He then holds the follow-up through titration rather than leaving it to the next available appointment.",
    experience: ["Baseline cardiovascular screening", "Blood pressure and heart-rate monitoring", "Titration follow-up", "Shared-care prescribing"],
    languages: ["English", "Igbo"],
    careAreas: ["adhd-assessment", "adult-adhd", "cardiac-screening", "titration"],
    nswAdhdTrained: true,
    wheelchairAccessible: false,
    appointmentLength: "Standard and longer appointments",
    keywords: ["adhd", "assessment", "medication", "stimulant", "methylphenidate", "dexamphetamine", "lisdexamfetamine", "titration", "dose", "starting medication", "heart", "cardiac", "cardiovascular", "blood pressure", "pulse", "safe", "safety", "check", "monitoring", "follow-up", "shared care", "physical health"],
  },
  {
    id: "linh-nguyen",
    name: "Dr Linh Nguyen",
    shortName: "Dr Nguyen",
    gender: "woman",
    pronouns: "she/her",
    title: "General practitioner",
    suburb: "Cheltenham",
    reach: "Practice appointments",
    image: "/clinicians/linh-nguyen.png",
    nextAvailable: "Wednesday, 9:00 am",
    acceptingNewPatients: true,
    focus: "Accessible assessment & disability rights",
    matchLine: "Assessment built around access needs, with consent and autonomy held explicitly throughout.",
    fitSignals: ["Disability rights", "Vietnamese", "Accessible assessment", "Autonomy"],
    practicalSignals: ["Bulk bills care plans", "12 min by train", "Wheelchair accessible"],
    about:
      "Linh assesses disabled adults for ADHD without treating an existing diagnosis as the whole explanation. She plans around access needs, explains what each step is for before it happens, and supports the adjustment documentation that follows, at work, at study, or with a support scheme.",
    experience: ["Disability-rights focused care", "Adult ADHD assessment", "Co-occurring autism", "Adjustment and support documentation"],
    languages: ["English", "Vietnamese"],
    careAreas: ["adhd-assessment", "adult-adhd", "disability-rights", "autism-adhd"],
    nswAdhdTrained: true,
    wheelchairAccessible: true,
    appointmentLength: "Longer appointments available",
    keywords: ["adhd", "assessment", "disability", "disabled", "wheelchair", "accessible", "access", "rights", "autonomy", "consent", "advocate", "adjustments", "support", "ndis", "vietnamese", "autism", "autistic", "audhd", "coordination", "diagnosis"],
  },
  {
    id: "aisha-rahman",
    name: "Dr Aisha Rahman",
    shortName: "Dr Rahman",
    gender: "woman",
    pronouns: "she/her",
    title: "General practitioner",
    suburb: "Pennant Hills",
    reach: "Practice appointments",
    image: "/clinicians/aisha-rahman.png",
    nextAvailable: "Thursday, 11:10 am",
    acceptingNewPatients: true,
    focus: "Child & adolescent assessment, paediatric shared care",
    matchLine: "Arabic-language support through a child's assessment, including the school half of it.",
    fitSignals: ["Child & adolescent", "Arabic", "Paediatric shared care", "School reports"],
    practicalSignals: ["Bulk billing eligible", "14 min by train", "Wheelchair accessible"],
    about:
      "Aisha helps families start a child's assessment and keep it moving: gathering teacher observations and rating scales, preparing the paediatric referral properly so the wait is not wasted, and carrying the shared-care follow-up once a plan exists.",
    experience: ["Child and adolescent ADHD", "Teacher and school reports", "Paediatric referral and shared care", "Family and interpreter-supported consultations"],
    languages: ["English", "Arabic"],
    careAreas: ["adhd-assessment", "child-adolescent-adhd", "shared-care", "student-academic"],
    nswAdhdTrained: true,
    wheelchairAccessible: true,
    appointmentLength: "Longer appointments available",
    keywords: ["adhd", "assessment", "child", "my son", "my daughter", "kid", "children", "teenager", "adolescent", "school", "teacher", "classroom", "report", "paediatrician", "paediatric", "referral", "waitlist", "arabic", "family", "interpreter", "shared care", "plan"],
  },
  {
    id: "tom-bennett",
    name: "Dr Tom Bennett",
    shortName: "Dr Bennett",
    gender: "man",
    pronouns: "he/him",
    title: "General practitioner",
    suburb: "Beecroft",
    reach: "Practice appointments",
    image: "/clinicians/tom-bennett.png",
    nextAvailable: "Tuesday, 4:30 pm",
    acceptingNewPatients: true,
    focus: "Adult ADHD assessment & non-medication supports",
    matchLine: "Assessment that does not assume medication is the only outcome you came for.",
    fitSignals: ["ADHD assessment", "Non-medication options", "Emotional regulation", "Clear plans"],
    practicalSignals: ["Mixed billing", "11 min by bus", "Telehealth follow-ups"],
    about:
      "Tom assesses adults and then talks about the whole plan, not only whether a script is appropriate: sleep, structure, workload, coaching and what to change first. Appointments use written steps and realistic follow-up, without reading executive-function difficulty as not caring.",
    experience: ["Adult ADHD assessment", "Non-medication strategies", "Emotional dysregulation and rejection sensitivity", "Shared care"],
    languages: ["English"],
    careAreas: ["adhd-assessment", "adult-adhd", "non-medication", "emotional-regulation"],
    nswAdhdTrained: true,
    wheelchairAccessible: false,
    appointmentLength: "Standard and longer appointments",
    keywords: ["adhd", "assessment", "attention", "neurodivergent", "executive function", "overwhelmed", "structured", "clear steps", "without medication", "no medication", "not just medication", "alternatives", "coaching", "habits", "rejection sensitivity", "rsd", "emotional", "regulation", "shame", "shared care", "adult"],
  },
  {
    id: "sofia-alvarez",
    name: "Dr Sofia Alvarez",
    shortName: "Dr Alvarez",
    gender: "woman",
    pronouns: "she/her",
    title: "General practitioner",
    suburb: "Beecroft",
    reach: "Practice appointments",
    image: "/clinicians/sofia-alvarez.png",
    nextAvailable: "Friday, 8:40 am",
    acceptingNewPatients: true,
    focus: "Child assessment & school documentation",
    matchLine: "Spanish-language support through a child's assessment, and paperwork the school will accept.",
    fitSignals: ["Child & adolescent", "Spanish", "School adjustments", "Non-medication supports"],
    practicalSignals: ["Bulk bills", "12 min walk", "Saturday mornings"],
    about:
      "Sofia works with families whose child is struggling at school before anyone has used the word ADHD. She helps gather what an assessment needs, writes the documentation a school will act on, and sets out the classroom and home supports that do not wait on a diagnosis.",
    experience: ["Child and adolescent ADHD", "School and learning adjustments", "Behavioural and environmental supports", "Parent-supported consultations"],
    languages: ["English", "Spanish"],
    careAreas: ["adhd-assessment", "child-adolescent-adhd", "student-academic", "non-medication"],
    nswAdhdTrained: true,
    wheelchairAccessible: false,
    appointmentLength: "Standard and longer appointments",
    keywords: ["adhd", "assessment", "child", "my son", "my daughter", "school", "teacher", "learning", "classroom", "falling behind", "concentrate", "adjustments", "documentation", "letter", "plan", "spanish", "behaviour", "without medication", "supports", "parent"],
  },
  {
    id: "noah-williams",
    name: "Dr Noah Williams",
    shortName: "Dr Williams",
    gender: "man",
    pronouns: "he/him",
    title: "General practitioner",
    suburb: "Epping",
    reach: "Practice appointments",
    image: "/clinicians/noah-williams.png",
    nextAvailable: "Wednesday, 1:20 pm",
    acceptingNewPatients: true,
    focus: "ADHD alongside complex mental health, shared care",
    matchLine: "ADHD questions held alongside bipolar or PTSD, with your psychiatrist rather than around them.",
    fitSignals: ["Complex mental health", "Psychiatrist shared care", "Comorbid mood", "Longer visits"],
    practicalSignals: ["Bulk billing eligible", "16 min by bus", "Telehealth available"],
    about:
      "Noah works with people whose ADHD question sits alongside PTSD, bipolar disorder, long-standing anxiety or a substance-use history, where sequence matters and one diagnosis has often been used to explain everything. He coordinates with treating psychiatrists; specialist medication decisions stay within shared care.",
    experience: ["PTSD and bipolar shared care", "ADHD assessment with psychiatric comorbidity", "Anxiety, depression and substance-use history", "Psychiatrist coordination"],
    languages: ["English"],
    careAreas: ["adhd-assessment", "adult-adhd", "complex-mental-health", "comorbid-mood", "shared-care", "trauma-informed", "substance-history"],
    nswAdhdTrained: true,
    wheelchairAccessible: false,
    appointmentLength: "Longer appointments available",
    keywords: ["adhd", "assessment", "mental health", "ptsd", "bipolar", "psychiatrist", "psychiatric", "shared care", "medication", "anxiety", "depression", "trauma", "complex", "comorbid", "misdiagnosed", "wrong diagnosis", "explained away", "substance", "drinking", "alcohol", "cannabis", "addict", "non-stimulant", "gentle", "longer", "coordinate", "adult"],
  },
  {
    id: "priya-nair",
    name: "Dr Priya Nair",
    shortName: "Dr Nair",
    gender: "woman",
    pronouns: "she/her",
    title: "General practitioner",
    suburb: "Southport",
    reach: "Practice appointments",
    image: "/clinicians/priya-nair.png",
    nextAvailable: "Monday, 9:30 am",
    acceptingNewPatients: true,
    focus: "Adult ADHD, Tamil & Malayalam, family context",
    matchLine: "Tamil and Malayalam ADHD assessment where the family does not yet believe it is real.",
    fitSignals: ["ADHD assessment", "Tamil & Malayalam", "South Indian context", "Late diagnosis in women"],
    practicalSignals: ["Bulk bills", "11 min by train", "Telehealth follow-ups"],
    about:
      "Priya assesses adults navigating an ADHD question inside families where it reads as laziness or a Western invention. She makes room for that conversation without requiring anyone to win it first, and keeps what is discussed private from relatives unless the patient asks otherwise.",
    experience: ["Adult ADHD assessment", "Late-recognised presentations in women", "Anxiety and low mood", "Culturally responsive consultations"],
    languages: ["English", "Malayalam", "Tamil"],
    careAreas: ["adhd-assessment", "adult-adhd", "adhd-in-women", "comorbid-mood"],
    nswAdhdTrained: true,
    wheelchairAccessible: false,
    appointmentLength: "Longer first appointments available",
    keywords: ["adhd", "assessment", "diagnosis", "south indian", "indian", "malayalam", "tamil", "cultural", "culture", "family", "family pressure", "lazy", "excuse", "not real", "woman", "women", "young", "anxiety", "mood", "judgement", "private", "adult", "late"],
  },
  {
    id: "anjali-menon",
    name: "Dr Anjali Menon",
    shortName: "Dr Menon",
    gender: "woman",
    pronouns: "she/her",
    title: "General practitioner",
    suburb: "Pennant Hills",
    reach: "Practice appointments",
    image: "/clinicians/anjali-menon.png",
    nextAvailable: "Tuesday, 12:30 pm",
    acceptingNewPatients: true,
    focus: "ADHD in women, hormonal change & sleep",
    matchLine: "Tamil and Malayalam assessment for symptoms that got louder in your forties, not newer.",
    fitSignals: ["ADHD in women", "Tamil & Malayalam", "Hormonal change", "Sleep"],
    practicalSignals: ["Bulk billing eligible", "18 min by bus", "Long first visits"],
    about:
      "Anjali sees women whose difficulty became unmanageable around perimenopause or after a baby, where the strategies that worked for thirty years stopped working. She treats that as a history worth taking properly rather than as evidence the problem is recent, and reviews sleep alongside it.",
    experience: ["ADHD assessment in women", "Hormonal change and symptom shift", "Sleep and circadian review", "Shared decision-making"],
    languages: ["English", "Malayalam", "Tamil"],
    careAreas: ["adhd-assessment", "adult-adhd", "adhd-in-women", "sleep"],
    nswAdhdTrained: true,
    wheelchairAccessible: false,
    appointmentLength: "Longer first appointments available",
    keywords: ["adhd", "assessment", "woman", "women", "perimenopause", "menopause", "hormonal", "hormones", "cycle", "after my baby", "got worse", "worse lately", "coping stopped", "sleep", "insomnia", "tired", "exhausted", "south indian", "malayalam", "tamil", "unhurried", "explain", "late", "adult"],
  },
  {
    id: "nisha-kapoor",
    name: "Dr Nisha Kapoor",
    shortName: "Dr Kapoor",
    gender: "woman",
    pronouns: "she/her",
    title: "General practitioner",
    suburb: "Surfers Paradise",
    reach: "Practice appointments",
    image: "/clinicians/nisha-kapoor.png",
    nextAvailable: "Wednesday, 3:10 pm",
    acceptingNewPatients: true,
    focus: "ADHD & anxiety: which is which",
    matchLine: "Hindi and Punjabi assessment that separates ADHD from the anxiety it has been called for years.",
    fitSignals: ["ADHD assessment", "Hindi & Punjabi", "Anxiety differential", "Longer visits"],
    practicalSignals: ["Bulk bills care plans", "12 min by train", "Evening appointments"],
    about:
      "Nisha works through the question of whether long-treated anxiety or depression has been the whole story. She goes back to what was happening at school, checks understanding as she goes, and does not rush the decision in either direction.",
    experience: ["Adult ADHD assessment", "Anxiety and depression differential", "Developmental history taking", "Referral and shared care"],
    languages: ["English", "Hindi", "Punjabi"],
    careAreas: ["adhd-assessment", "adult-adhd", "comorbid-mood", "adhd-in-women"],
    nswAdhdTrained: true,
    wheelchairAccessible: false,
    appointmentLength: "Standard and longer appointments",
    keywords: ["adhd", "assessment", "anxiety", "anxious", "depression", "antidepressant", "treated for anxiety", "misdiagnosed", "differential", "which one", "hindi", "punjabi", "woman", "women", "mood", "family", "family expectations", "calm", "explain", "slowly", "school", "adult"],
  },
  {
    id: "camila-torres",
    name: "Dr Camila Torres",
    shortName: "Dr Torres",
    gender: "woman",
    pronouns: "she/her",
    title: "General practitioner",
    suburb: "Southport",
    reach: "Practice appointments",
    image: "/clinicians/camila-torres.png",
    nextAvailable: "Monday, 11:20 am",
    acceptingNewPatients: true,
    focus: "Titration follow-up & workplace adjustments",
    matchLine: "Spanish-language dose review that keeps happening, plus the letter your employer needs.",
    fitSignals: ["Titration", "Spanish", "Workplace adjustments", "Telehealth follow-ups"],
    practicalSignals: ["Mixed billing", "14 min by bus", "Telehealth follow-ups"],
    about:
      "Camila holds the weeks after a diagnosis, when the dose is still being found and most people are left waiting for a review. She tracks effect, appetite, sleep and blood pressure across visits, and writes the study or workplace documentation that turns a diagnosis into an actual adjustment.",
    experience: ["Titration and dose review", "Side-effect monitoring", "Workplace and study adjustments", "Shared-care prescribing"],
    languages: ["English", "Spanish"],
    careAreas: ["adhd-assessment", "adult-adhd", "titration", "student-academic"],
    nswAdhdTrained: true,
    wheelchairAccessible: false,
    appointmentLength: "Standard and longer appointments",
    keywords: ["adhd", "titration", "dose", "medication", "review", "side effects", "appetite", "not working", "wearing off", "adjust", "follow-up", "spanish", "work", "employer", "workplace", "university", "study", "adjustments", "letter", "documentation", "diagnosed already", "assessment"],
  },
  {
    id: "leila-haddad",
    name: "Dr Leila Haddad",
    shortName: "Dr Haddad",
    gender: "woman",
    pronouns: "she/her",
    title: "General practitioner",
    suburb: "Broadbeach",
    reach: "Practice appointments",
    image: "/clinicians/leila-haddad.png",
    nextAvailable: "Thursday, 2:40 pm",
    acceptingNewPatients: true,
    focus: "Adolescent assessment & anxiety, family context",
    matchLine: "Arabic-language assessment for a teenager, with the anxiety and the family both in the room.",
    fitSignals: ["Child & adolescent", "Arabic", "Anxiety differential", "Shared care"],
    practicalSignals: ["Bulk billing eligible", "10 min by train", "Wheelchair accessible"],
    about:
      "Leila assesses adolescents where school refusal, anxiety and attention difficulty have become hard to separate. She can involve family when invited while keeping the young person's confidentiality explicit, and coordinates with paediatric and mental-health teams.",
    experience: ["Adolescent ADHD assessment", "Anxiety and school refusal", "Paediatric and mental-health coordination", "Family-inclusive consultations"],
    languages: ["English", "Arabic"],
    careAreas: ["adhd-assessment", "child-adolescent-adhd", "comorbid-mood", "shared-care"],
    nswAdhdTrained: true,
    wheelchairAccessible: true,
    appointmentLength: "Longer appointments available",
    keywords: ["adhd", "assessment", "teenager", "adolescent", "my son", "my daughter", "school refusal", "school", "anxiety", "anxious", "arabic", "mental health", "paediatrician", "coordinate", "family", "consent", "confidential", "preferences", "child"],
  },
  {
    id: "hanh-tran",
    name: "Dr Hanh Tran",
    shortName: "Dr Tran",
    gender: "woman",
    pronouns: "she/her",
    title: "General practitioner",
    suburb: "Cheltenham",
    reach: "Practice appointments",
    image: "/clinicians/hanh-tran.png",
    nextAvailable: "Friday, 10:10 am",
    acceptingNewPatients: true,
    focus: "Co-occurring autism & ADHD, accessible care",
    matchLine: "Vietnamese-language assessment that can hold autism and ADHD as two answers, not one.",
    fitSignals: ["Autism & ADHD", "Vietnamese", "Disability rights", "Accessible assessment"],
    practicalSignals: ["Bulk bills care plans", "9 min by train", "Wheelchair accessible"],
    about:
      "Hanh assesses adults who have been given one neurodevelopmental explanation and suspect there are two. She plans around sensory and access needs, explains decisions clearly, and supports the documentation needed for study, work or a support scheme.",
    experience: ["Co-occurring autism and ADHD", "Adult ADHD assessment", "Disability-rights focused care", "Adjustment documentation"],
    languages: ["English", "Vietnamese"],
    careAreas: ["adhd-assessment", "autism-adhd", "disability-rights", "adult-adhd"],
    nswAdhdTrained: true,
    wheelchairAccessible: true,
    appointmentLength: "Longer appointments available",
    keywords: ["adhd", "autism", "autistic", "audhd", "both", "assessment", "neurodivergent", "disability", "disabled", "disability rights", "wheelchair", "accessible", "sensory", "autonomy", "consent", "vietnamese", "ndis", "adjustments", "documentation", "adult"],
  },
  {
    id: "grace-chen",
    name: "Dr Grace Chen",
    shortName: "Dr Chen",
    gender: "woman",
    pronouns: "she/her",
    title: "General practitioner",
    suburb: "Surfers Paradise",
    reach: "Practice appointments",
    image: "/clinicians/grace-chen.png",
    nextAvailable: "Tuesday, 1:40 pm",
    acceptingNewPatients: true,
    focus: "Autism & ADHD assessment, sensory-considerate",
    matchLine: "Neurodiversity-affirming assessment in a room built for it, with written steps to take home.",
    fitSignals: ["Autism & ADHD", "Sensory-considerate", "Non-medication supports", "Clear plans"],
    practicalSignals: ["Mixed billing", "15 min by bus", "Sensory-considerate rooms"],
    about:
      "Grace assesses adults for ADHD and co-occurring autism in appointments designed to be survivable: lower light, no waiting-room ambush, written summaries afterwards. She sets out medication and non-medication options side by side without treating either as the default.",
    experience: ["Adult ADHD and autism assessment", "Sensory-considerate consultations", "Non-medication strategies", "Emotional regulation support"],
    languages: ["English", "Mandarin"],
    careAreas: ["adhd-assessment", "autism-adhd", "adult-adhd", "non-medication", "emotional-regulation"],
    nswAdhdTrained: true,
    wheelchairAccessible: true,
    appointmentLength: "Standard and longer appointments",
    keywords: ["adhd", "autism", "autistic", "audhd", "assessment", "attention", "neurodivergent", "neurodiversity", "affirming", "sensory", "overwhelmed", "clear steps", "written", "mandarin", "without medication", "options", "realistic", "adult", "woman"],
  },
  {
    id: "erin-walsh",
    name: "Dr Erin Walsh",
    shortName: "Dr Walsh",
    gender: "woman",
    pronouns: "she/her",
    title: "General practitioner",
    suburb: "Robina",
    reach: "Practice appointments",
    image: "/clinicians/erin-walsh.png",
    nextAvailable: "Monday, 1:20 pm",
    acceptingNewPatients: true,
    focus: "Trauma-informed assessment",
    matchLine: "Assessment that can tell trauma and ADHD apart without making you relive either.",
    fitSignals: ["Trauma-informed", "Complex mental health", "Longer visits", "Consent-led"],
    practicalSignals: ["Bulk billing eligible", "8 min by train", "Long appointments"],
    about:
      "Erin assesses people for whom childhood history is not a neutral topic, where trauma and ADHD present through each other and being asked to prove either is its own harm. Appointments prioritise consent and control, with psychiatrist coordination where specialist treatment is involved.",
    experience: ["Trauma-informed GP care", "ADHD assessment with trauma history", "PTSD and bipolar shared care", "Consent-led consultations"],
    languages: ["English"],
    careAreas: ["adhd-assessment", "trauma-informed", "adult-adhd", "complex-mental-health", "shared-care"],
    nswAdhdTrained: true,
    wheelchairAccessible: false,
    appointmentLength: "Longer appointments available",
    keywords: ["adhd", "assessment", "trauma", "trauma history", "trauma-informed", "childhood", "difficult childhood", "permission", "boundaries", "consent", "control", "ptsd", "bipolar", "psychiatrist", "shared care", "cptsd", "anxiety", "depression", "gentle", "longer", "mental health", "unhurried", "no records", "adult"],
  },
  {
    id: "anubhav-saxena",
    name: "Dr Anubhav Saxena",
    shortName: "Dr Saxena",
    gender: "man",
    pronouns: "he/him",
    title: "General practitioner",
    suburb: "Beecroft",
    reach: "Practice appointments",
    // A real person's likeness is theirs to supply. Renders as a monogram until he provides one.
    image: null,
    nextAvailable: "Thursday, 8:30 am",
    acceptingNewPatients: true,
    focus: "Structured assessment, baseline physical screening & titration",
    matchLine: "A measured assessment with the physical baseline done properly, then titration reviewed on a schedule.",
    fitSignals: ["ADHD assessment", "Baseline physical screening", "Titration", "Telehealth"],
    practicalSignals: ["Mixed billing", "Telehealth Australia-wide", "Structured review schedule"],
    about:
      "Anubhav works from measurement: a documented baseline before anything starts, then review at set intervals rather than when a problem gets loud enough to prompt a call. He covers cardiovascular and sleep screening before a stimulant is considered, takes a substance history as a safety question rather than a character one, and coordinates with the treating psychiatrist where prescribing sits with them.",
    experience: [
      "Structured adult ADHD assessment",
      "Baseline cardiovascular and metabolic screening",
      "Titration and scheduled review",
      "Telehealth follow-up",
    ],
    languages: ["English", "Hindi"],
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
    keywords: ["adhd", "assessment", "structured", "thorough", "measured", "baseline", "bloods", "pathology", "physical", "heart", "cardiac", "cardiovascular", "blood pressure", "metabolic", "sleep", "titration", "dose", "medication", "stimulant", "monitoring", "review", "telehealth", "remote", "online", "substance", "drinking", "alcohol", "cannabis", "history", "non-stimulant", "shared care", "hindi", "adult", "founder"],
    realPerson: true,
    founderInterest:
      "Dr Saxena is a co-founder of ADHD.ME. Disclosed because he appears in a directory his own company operates, and a reader cannot see the ranking that put him there.",
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
    "maya-singh": [["adhd", 12], ["assessment", 10], ["late", 20], ["missed", 20], ["masking", 20], ["coping", 16], ["hindi", 26], ["punjabi", 26], ["family expectations", 16], ["family", 8], ["anxiety", 10], ["mood", 10], ["calm", 12], ["explain", 10], ["south asian", 12], ["woman", 10], ["women", 10], ["my daughter was diagnosed", 24]],
    "daniel-okafor": [["adhd", 8], ["heart", 26], ["cardiac", 26], ["cardiovascular", 26], ["blood pressure", 22], ["safe", 16], ["safety", 16], ["starting medication", 22], ["stimulant", 20], ["titration", 20], ["dose", 16], ["monitoring", 18], ["follow-up", 14], ["physical health", 20], ["shared care", 12]],
    "linh-nguyen": [["disability rights", 30], ["disabled", 24], ["wheelchair", 24], ["autonomy", 20], ["consent", 16], ["accessible", 18], ["adjustments", 18], ["ndis", 22], ["vietnamese", 28], ["autism", 14], ["adhd", 8], ["assessment", 8]],
    "aisha-rahman": [["child", 24], ["my son", 26], ["my daughter", 26], ["kid", 20], ["children", 20], ["school", 20], ["teacher", 22], ["paediatrician", 24], ["referral", 16], ["waitlist", 18], ["arabic", 28], ["interpreter", 18], ["shared care", 14], ["adhd", 8]],
    "tom-bennett": [["adhd", 12], ["without medication", 28], ["no medication", 28], ["not just medication", 28], ["alternatives", 22], ["coaching", 20], ["executive function", 24], ["rejection sensitivity", 24], ["rsd", 24], ["emotional", 18], ["regulation", 18], ["clear steps", 18], ["overwhelmed", 12], ["neurodivergent", 16], ["shared care", 10]],
    "sofia-alvarez": [["child", 22], ["my son", 24], ["my daughter", 24], ["school", 24], ["teacher", 20], ["learning", 20], ["classroom", 22], ["falling behind", 24], ["adjustments", 20], ["documentation", 18], ["letter", 16], ["spanish", 28], ["behaviour", 16], ["without medication", 16], ["parent", 16], ["adhd", 8]],
    "noah-williams": [["ptsd", 32], ["bipolar", 34], ["psychiatrist", 22], ["psychiatric", 22], ["shared care", 18], ["medication", 12], ["complex", 20], ["comorbid", 22], ["misdiagnosed", 22], ["wrong diagnosis", 24], ["explained away", 24], ["mental health", 18], ["anxiety", 14], ["depression", 14], ["trauma", 14], ["trauma history", 20], ["trauma-informed", 18], ["childhood", 14], ["substance", 20], ["drinking", 18], ["alcohol", 18], ["cannabis", 18], ["addict", 20], ["non-stimulant", 18], ["gentle", 12], ["longer", 10], ["adhd", 8]],
    "priya-nair": [["south indian", 28], ["malayalam", 28], ["tamil", 28], ["indian", 12], ["cultural", 14], ["culture", 14], ["family pressure", 20], ["lazy", 24], ["excuse", 22], ["not real", 24], ["family", 10], ["private", 16], ["anxiety", 10], ["woman", 10], ["women", 10], ["adhd", 10], ["assessment", 8], ["young", 4]],
    "anjali-menon": [["perimenopause", 30], ["menopause", 28], ["hormonal", 26], ["hormones", 26], ["cycle", 18], ["after my baby", 24], ["got worse", 24], ["worse lately", 22], ["coping stopped", 26], ["sleep", 20], ["insomnia", 20], ["exhausted", 16], ["south indian", 22], ["malayalam", 26], ["tamil", 26], ["woman", 12], ["women", 12], ["unhurried", 8], ["adhd", 8]],
    "nisha-kapoor": [["anxiety", 22], ["anxious", 22], ["depression", 20], ["antidepressant", 26], ["treated for anxiety", 30], ["misdiagnosed", 20], ["differential", 20], ["which one", 22], ["hindi", 24], ["punjabi", 24], ["family expectations", 14], ["family", 8], ["calm", 10], ["explain", 9], ["slowly", 9], ["school", 10], ["woman", 10], ["adhd", 8]],
    "camila-torres": [["titration", 30], ["dose", 26], ["review", 18], ["side effects", 26], ["appetite", 22], ["not working", 24], ["wearing off", 26], ["adjust", 20], ["spanish", 26], ["work", 18], ["employer", 22], ["workplace", 22], ["university", 22], ["study", 20], ["adjustments", 18], ["letter", 18], ["documentation", 18], ["diagnosed already", 22], ["follow-up", 14]],
    "leila-haddad": [["teenager", 26], ["adolescent", 26], ["my son", 20], ["my daughter", 20], ["school refusal", 28], ["school", 16], ["anxiety", 18], ["anxious", 18], ["arabic", 26], ["mental health", 14], ["paediatrician", 18], ["coordinate", 12], ["family", 10], ["confidential", 16], ["child", 14], ["adhd", 8]],
    "hanh-tran": [["autism", 26], ["autistic", 26], ["audhd", 30], ["both", 16], ["disability rights", 26], ["disabled", 22], ["wheelchair", 22], ["sensory", 20], ["autonomy", 18], ["consent", 15], ["accessible", 17], ["vietnamese", 26], ["ndis", 20], ["adjustments", 16], ["adhd", 8]],
    "grace-chen": [["autism", 24], ["autistic", 24], ["audhd", 28], ["neurodiversity", 26], ["affirming", 24], ["sensory", 24], ["neurodivergent", 22], ["written", 18], ["clear steps", 18], ["without medication", 18], ["options", 14], ["mandarin", 26], ["overwhelmed", 12], ["adhd", 8], ["woman", 8]],
    "erin-walsh": [["trauma history", 32], ["trauma", 24], ["trauma-informed", 30], ["childhood", 22], ["difficult childhood", 28], ["permission", 24], ["boundaries", 22], ["consent", 20], ["control", 16], ["ptsd", 26], ["cptsd", 28], ["bipolar", 20], ["psychiatrist", 16], ["shared care", 14], ["no records", 22], ["anxiety", 12], ["depression", 12], ["gentle", 12], ["longer", 10], ["unhurried", 10], ["woman", 8]],
    "anubhav-saxena": [["structured", 26], ["thorough", 24], ["measured", 22], ["baseline", 24], ["bloods", 22], ["pathology", 20], ["physical", 18], ["heart", 16], ["cardiac", 16], ["blood pressure", 16], ["metabolic", 20], ["sleep", 16], ["titration", 22], ["dose", 18], ["stimulant", 18], ["monitoring", 20], ["review", 16], ["telehealth", 30], ["remote", 24], ["online", 24], ["substance", 26], ["drinking", 24], ["alcohol", 24], ["cannabis", 24], ["non-stimulant", 26], ["shared care", 14], ["hindi", 18], ["adhd", 8], ["assessment", 10]],
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

    return score(b) - score(a);
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
