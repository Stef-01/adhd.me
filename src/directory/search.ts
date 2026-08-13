// W189: a directory search that does not choose a clinician for anybody.
//
// THE G7 LINE RUNS THROUGH THIS MODULE, AND IT IS NOT WHERE PEOPLE EXPECT.
//
// It is tempting to think the boundary is about the ANSWER — that software crosses into
// regulated clinical decision support when it names a doctor. It does not. The boundary is at
// the QUESTION, and specifically at whose body the question is about:
//
//   "Tell us what is wrong and we will find you the right doctor" takes a description of a
//   patient's symptoms, reasons over it, and returns a clinical recommendation. That is
//   software making a decision about a person's care, and it is what G7 refuses.
//
//   "These clinicians have told us they see a lot of women's health; here they all are" takes
//   an attribute OF A CLINICIAN, which the clinician declared about themselves, and filters a
//   list on it. Nobody described a patient. Nothing was inferred about anybody.
//
// SO THE PATIENT NEVER DESCRIBES THEMSELVES. Every field of a `DirectorySearch` is an attribute
// of a clinician or a place, chosen from a closed set the directory already publishes. There is
// no free-text box, because free text is where a patient types "pain when I", and a product that
// receives that sentence is reasoning about a patient whether or not it meant to. The type has
// no field it could arrive in, which is the same posture W183 took to the specialist title:
// unrepresentable, not filtered afterwards.
//
// AND THE RESULT IS NOT A SELECTION. There is no score, no relevance, no best match, no top
// result, no "recommended for you". W151's rule — order, never withhold — is the whole output
// contract: every clinician who matches the filters is returned, the order is stated, and the
// statement describes the order that was actually used.
//
// THAT LAST CLAUSE IS THE ONE WITH TEETH. A page saying "sorted by distance" over a list sorted
// by signup date is worse than a page saying nothing, because a reader who is told the basis
// stops looking for one. So `ORDERING` is a single declared list of keys, the comparator is
// BUILT from it, and the sentence shown to a reader is GENERATED from it. There is no second
// place to edit, so the description cannot drift from the behaviour — the only way to change the
// order is to change the list all three come from.
//
// ORDERING IS NOT RANKING, WHICH IS WHY THE KEYS ARE WHAT THEY ARE. Any list has an order and
// every reader reads the top of it first, so a neutral order is not available and pretending
// otherwise would be the dishonest option. What is available is an order that carries no
// judgement about anybody's care: whether they are taking new patients (a fact about
// availability, which is the question actually being asked), then place, then name. No key here
// is a claim that one clinician is better than another — W83's rule, which refused an internal
// productivity board, and which matters more in public and about a named person.

import { isSpecialist, type DirectoryProfile } from "./profile";

/**
 * What a searcher may ask about. Every field is an attribute of a CLINICIAN or a PLACE.
 *
 * There is deliberately no `symptom`, no `condition`, no `reason`, no `concern` and no free-text
 * field of any name. G7's boundary is the question, not the answer: a box a patient can type a
 * symptom into makes this software that reasons about a patient, whatever the code then does
 * with the string. A test scans this file for such a field, so adding one fails rather than
 * shipping.
 */
export interface DirectorySearch {
  /** Suburb, matched exactly against what the profile declares. */
  suburb?: string;
  state?: DirectoryProfile["location"]["state"];
  /** A language the clinician declared speaking. */
  language?: string;
  /** Only clinicians currently taking new patients. */
  acceptingNewPatients?: boolean;
  /**
   * A focus area, chosen FROM THE DIRECTORY'S OWN PUBLISHED LABELS — never typed.
   *
   * This is the field that looks like the G7 problem and is not, and the distinction is the
   * whole unit. The searcher is not saying "I have this condition"; they are picking a label a
   * clinician published about their own practice, from a list this module generates out of the
   * profiles themselves. Matching is exact against that list, so an unpublished string finds
   * nothing rather than being interpreted.
   */
  focusLabel?: string;
}

/**
 * Field names this search will never have, with the reason.
 *
 * Data rather than prose, so the test that scans for them reads the same list a human does, and
 * so adding one means deleting a stated refusal instead of adding a property.
 */
export const REFUSED_SEARCH_FIELDS: Readonly<Record<string, string>> = {
  symptom: "A symptom is a description of the searcher's body. Accepting one makes this software that reasons about a patient — G7, and the TGA boundary the gate exists to keep.",
  condition: "Same as symptom, in the searcher's words rather than a clinician's. A clinician's declared focus area is a different fact about a different person.",
  reason: "\"Reason for visit\" is a symptom box with a neutral label on it.",
  concern: "As above.",
  query: "A free-text box cannot be kept clinical or non-clinical by intention. Whatever it is labelled, somebody will type a symptom into it.",
  urgency: "Asking how urgent it feels is triage, and triage is the thing this product does not do.",
  score: "A relevance score is a ranking of clinicians dressed as arithmetic.",
};

/**
 * The order, declared once.
 *
 * The comparator and the reader-facing sentence are both built from this list, so the three
 * cannot drift. A stated basis that has fallen out of step with the code is worse than no
 * statement at all: a reader told the basis stops looking for one.
 */
export const ORDERING: readonly { key: string; describe: string }[] = [
  {
    key: "acceptingNewPatients",
    describe: "clinicians taking new patients first",
  },
  { key: "suburb", describe: "then by suburb, alphabetically" },
  { key: "displayName", describe: "then by name, alphabetically" },
];

/** The sentence a page shows about the order, generated from the same list the comparator uses. */
export function orderingBasis(): string {
  return (
    `Ordered by ${ORDERING.map((o) => o.describe).join(", ")}. ` +
    "This is not a ranking and not a recommendation. Nothing here says one clinician is a " +
    "better choice than another, and the order does not change based on anything you told us."
  );
}

const keyOf = (profile: DirectoryProfile, key: string): string => {
  switch (key) {
    // Inverted so `false` sorts after `true` under a plain string compare — spelled out rather
    // than relying on "0" < "1" being obvious to the next reader.
    case "acceptingNewPatients":
      return profile.acceptingNewPatients ? "0" : "1";
    case "suburb":
      return profile.location.suburb;
    case "displayName":
      return profile.displayName;
    default:
      return "";
  }
};

/**
 * Compare on the declared keys, in order.
 *
 * Ties fall through to the next key and the last key is the name, so two profiles compare equal
 * only when they share a name, a suburb and an availability — at which point the order between
 * them cannot carry meaning. The order-dependence class this tree has found ten times does not
 * get to arrive in the one list a patient reads.
 */
function compare(a: DirectoryProfile, b: DirectoryProfile): number {
  for (const { key } of ORDERING) {
    const result = keyOf(a, key).localeCompare(keyOf(b, key));
    if (result !== 0) return result;
  }
  return 0;
}

/** Focus labels a profile publishes, lowercased for matching. Specialists publish none (W183). */
const labelsOf = (profile: DirectoryProfile): string[] =>
  isSpecialist(profile) ? [] : profile.focus.map((statement) => statement.label.toLowerCase());

/**
 * Every focus label the directory currently publishes.
 *
 * Generated from the profiles rather than maintained beside them, so the choices a searcher is
 * offered are exactly the claims clinicians have made — a hand-kept list would eventually offer
 * a label nobody declared, which is the product inventing a category.
 */
export function publishedFocusLabels(profiles: readonly DirectoryProfile[]): string[] {
  return [...new Set(profiles.flatMap((profile) => labelsOf(profile)))].sort();
}

export interface SearchResults {
  /** Every match, in the stated order. Never truncated and never collapsed — W151. */
  matches: readonly DirectoryProfile[];
  /** How many were considered, so a reader can see the filters did something. */
  considered: number;
  /** The order, in words, generated from the same declaration the comparator uses. */
  basis: string;
  /** What was filtered on, echoed back, so a zero result is legible (W179). */
  filters: DirectorySearch;
}

/**
 * Run a search.
 *
 * Returns every match. There is no limit parameter and no pagination: "top 5" is a selection
 * made by software, and a product that shows five of nine has chosen four clinicians' worth of
 * invisibility on a basis it never stated.
 */
export function searchDirectory(
  profiles: readonly DirectoryProfile[],
  search: DirectorySearch,
): SearchResults {
  const wanted = search.focusLabel?.toLowerCase();
  const matches = profiles
    .filter((profile) => (search.suburb ? profile.location.suburb === search.suburb : true))
    .filter((profile) => (search.state ? profile.location.state === search.state : true))
    .filter((profile) =>
      search.language ? profile.languages.includes(search.language) : true,
    )
    .filter((profile) =>
      search.acceptingNewPatients === undefined
        ? true
        : profile.acceptingNewPatients === search.acceptingNewPatients,
    )
    // Exact match against a published label. Nothing is interpreted, stemmed or fuzzy-matched:
    // a near-miss that silently becomes a hit is the product deciding what somebody meant.
    .filter((profile) => (wanted ? labelsOf(profile).includes(wanted) : true))
    .slice()
    .sort(compare);

  return { matches, considered: profiles.length, basis: orderingBasis(), filters: search };
}
