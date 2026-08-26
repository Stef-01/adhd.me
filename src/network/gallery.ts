// O192 (founder-directed): the network gallery's data and its framing copy.
//
// TWO INTERFACES OVER ONE ROSTER. `/finder` asks you to describe what you need and ranks the
// roster against it. `/network` shows you the same people and lets you read them. Same entries,
// same declared strings, same disclosure — query-first versus browse-first. Nothing here is a
// second source of truth about a clinician: this module SELECTS and FRAMES, and every sentence
// about a doctor still comes out of `src/demo/roster.ts`.
//
// THE GATE THIS FILE STAYS ON THE RIGHT SIDE OF. `src/directory/profile.ts` holds the formal
// directory model and its `SHIPPED_DIRECTORY_PROFILES` register, pinned empty behind founder gate
// G6 (network/directory public launch — an Ahpra advertising review of every field a profile can
// emit). This module does not import that register, does not mint a `DirectoryProfile`, and adds
// no field the tree was not already publishing at `/finder`. Rearranging an already-public
// disclosure is not the same act as publishing directory copy, and the second one is the founder's
// to authorise. If a future unit wants richer profile copy than the roster carries, that is G6 and
// it stops here.
//
// WHY THE FRAMING SENTENCES ARE DATA. They are the only words on the page that are OURS rather
// than a clinician's, which makes them the only place a claim could be smuggled in beside a real
// person's name. Held as constants so `gallery.test.ts` can run the W23 landing linter over them
// directly, rather than hoping the rendered sweep catches it later.

import { clinicians, type Clinician } from "@/demo/clinicians";

/**
 * Everyone the network shows, in roster order.
 *
 * Deliberately the whole roster rather than a filtered subset: a gallery that quietly dropped an
 * entry would be making an editorial judgement about a named doctor, which is exactly the thing
 * `honesty.clinician-declaration` refuses. If somebody should not appear, they leave the roster.
 */
export const NETWORK_CLINICIANS: readonly Clinician[] = clinicians;

/**
 * The count, for a sentence that states it plainly.
 *
 * `honesty.claim-earned`: a count stands alone. The gallery says how many GPs there are and does
 * not dress the number as a selection, a shortlist, or a promise about coverage.
 */
export const NETWORK_SIZE = NETWORK_CLINICIANS.length;

/**
 * The page's own words — the framing, not the people.
 *
 * Written to do one job each and to survive the W23 linter (see this module's test): no
 * superlative, no testimonial, no rating, no clinical claim, and no sentence that characterises a
 * doctor. The `declarationNote` is load-bearing rather than decorative: it is the sentence that
 * tells a reader the bios below are each doctor's own account of how they work.
 */
const SPELLED = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/**
 * The network's size in words, derived — never transcribed.
 *
 * ROUND 4: the deck said "Sydney GPs" and never said how many, which let a reader assume a
 * directory and meet two people. `honesty.claim-earned` says a count stands alone, and the honest
 * version of a small network is to say it is small: somebody who knows they are looking at two
 * doctors can decide what to do with that, and somebody who expected forty feels misled. Spelled
 * for the small numbers a sentence reads better with, numeric past ten.
 */
export function networkSizeInWords(size: number = NETWORK_SIZE): string {
  return SPELLED[size] ?? String(size);
}

export const NETWORK_COPY = {
  eyebrow: "The network",
  /** The one idea this screen states. */
  heading: "The GPs who make\u00A0up this network.",
  /** Sets the count and hands the voice to the clinicians in the same breath. */
  declarationNote:
    `${networkSizeInWords()[0]!.toUpperCase()}${networkSizeInWords().slice(1)} Sydney GPs today, in their own words. Everything on these pages is what each doctor says about how they work — their languages, where they consult, and what they say they see often. None of it is our description of them.`,
  /** The social-impact frame: why a browsable network exists at all. */
  purposeHeading: "Why the network is open to read.",
  purposeBody:
    "Finding a GP who understands you should not depend on who you happen to know. So the people here are listed to be read, not ranked: what each one says they do, in the words they chose, with the practical things — languages, rooms, how long a first appointment runs — on the same page rather than three clicks away. You decide who sounds like a fit.",
  /** The bridge to the other interface, stated as a choice rather than a redirect. */
  finderBridge: "Would rather describe what you are looking for and have the list ordered around it?",
  galleryEmpty: "No GP is listed in the network right now.",
} as const;

/** Every framing string, for a linter that must not miss one when a field is added. */
export function networkCopyStrings(): string[] {
  return Object.values(NETWORK_COPY);
}

/**
 * The subject pronoun to use when a heading talks ABOUT a clinician.
 *
 * ROUND 3, AND IT IS THE SMALLEST CHANGE ON THE PAGE FOR THE LARGEST REASON. The section heading
 * read "What Dr Saxena says they see often" for a doctor whose roster entry says `he/him`. It is
 * not ungrammatical — singular they is fine — but it is the sentence a reader notices, and what
 * they notice is that the page does not know who he is. On a surface whose whole job is "these are
 * people who will understand you", getting somebody's pronoun right in the one heading that names
 * them is not a nicety; it is the product demonstrating the attention it claims.
 *
 * Derived from `pronouns` (the clinician's own declaration) rather than from `gender`, because the
 * pronoun is the thing they stated and gender is a separate field they did not state it in.
 * Unknown or unparseable forms fall back to "they", which is correct for anybody and wrong for
 * nobody.
 */
export function subjectPronoun(clinician: Clinician): string {
  const first = clinician.pronouns.split(/[\/\s]/)[0]?.trim().toLowerCase();
  return first === "he" || first === "she" || first === "they" ? first : "they";
}

/**
 * A present-tense verb agreeing with the pronoun above: `verbFor(c, "see")` → "sees" or "see".
 *
 * ROUND 7 GENERALISED ROUND 3, because round 3 fixed one heading and left the same mistake in two
 * more places. The profile's fact list said "How THEY consult" and "as at the date THEY told us"
 * for a doctor whose roster entry declares he/him — the same small wrongness as the heading, in
 * smaller type, on the same page. A helper per verb would have kept inviting that; one helper
 * makes the agreement the default thing to reach for.
 *
 * Deliberately naive (append "s"), because the vocabulary a profile needs is small and regular —
 * see, consult, work. A verb that needs more than this should be reworded rather than smuggled
 * through a conjugation table nobody maintains.
 */
export function verbFor(clinician: Clinician, base: string): string {
  return subjectPronoun(clinician) === "they" ? base : `${base}s`;
}

/**
 * The possessive determiner: "his" / "her" / "their".
 *
 * ROUND 7, and it is the last of round 3's family. The profile's own voice label read "In their
 * words" on a page about ONE person whose pronoun the page already knows — the deck says "in their
 * own words" correctly, because the deck is about everybody, and the label was inherited from it
 * without noticing that the subject had changed from a roster to a man.
 */
export function possessiveFor(clinician: Clinician): string {
  const subject = subjectPronoun(clinician);
  return subject === "he" ? "his" : subject === "she" ? "her" : "their";
}

/** "he sees" / "they see" — the verb has to agree with the pronoun above. */
export function seesVerb(clinician: Clinician): string {
  return verbFor(clinician, "see");
}

/**
 * The suburbs a clinician consults in, primary first, as one readable list.
 *
 * O85's rule, restated for the gallery: a second consulting room is a fact the reader sees, not a
 * detail behind a click. Joined here rather than in the component so the ordering is testable.
 */
export function consultingSuburbs(clinician: Clinician): string[] {
  return [clinician.suburb, ...(clinician.alsoConsultsAt ?? [])];
}

/**
 * The next and previous clinician for the profile's slide controls, wrapping at both ends.
 *
 * Wraps deliberately: a two-person network with dead-ended arrows reads as a broken control, and
 * the reader is browsing rather than working through a queue. Returns the same id when there is
 * only one entry, so the caller can hide the control instead of rendering a no-op.
 */
export function neighbours(id: string, roster: readonly Clinician[] = NETWORK_CLINICIANS) {
  const index = roster.findIndex((c) => c.id === id);
  if (index === -1) return null;
  const size = roster.length;
  return {
    previous: roster[(index - 1 + size) % size]!,
    next: roster[(index + 1) % size]!,
    position: index + 1,
    of: size,
  };
}
