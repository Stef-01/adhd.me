// W192: the public copy sweep — every surface a stranger can reach, and which rules it answers to.
//
// The unit's gate is "no clinical claim on any of them", and taken literally the sweep would fail
// on the day it was written. `/clinicians` names differential diagnosis, pre-stimulant cardiac
// screening and titration review, which is clinical content by any reading. The Y2 dossier noticed
// this, the Q13 dossier re-checked it and noticed it again, and both filed it as an inconsistency. Filing it
// a third time would be the control this tree has watched fail.
//
// SO THE SWEEP CLASSIFIES BY AUDIENCE, AND THE CLASSIFICATION IS THE UNIT. "No clinical claim" is
// not one rule, because the thing it protects against is not one hazard:
//
//   A PATIENT-FACING SURFACE must carry none, and the reason is therapeutic advertising. A
//   patient reading "we treat diabetes" on a website is the object the Ahpra advertising
//   guidelines and the TGA rules are about, and W6/W23 exist for it.
//
//   A PROFESSIONAL SURFACE is a different object. Clinical content addressed to clinicians is
//   professional communication — journals, guidelines and colleges publish it continuously — and
//   applying the patient-advertising rules to it would mean this product cannot describe what it
//   does to the people who would use it. The narrower rules still apply in full: no testimonials,
//   no ratings, no superlatives, and no "specialist" beside a niche scope.
//
// THAT IS A DISTINCTION AND NOT AN EXEMPTION, WHICH IS WHY IT IS DATA. Every public route is
// classified here with an argued reason, checked against the tree in both directions (W102's
// shape), so a new public page fails the suite until somebody decides who it is for. The failure
// mode this guards is the easy one: a page drifting from professional to patient-facing while its
// classification stays put, which is how "no clinical claim" quietly becomes untrue.
//
// AND THE `/clinicians` DECISION IS STILL THE FOUNDER'S, so it is flagged rather than resolved.
// Classifying it professional makes the sweep honest about the rules it applies; it does NOT
// decide whether ADHD.ME should publish clinical guidance at all. That question is live — Q13's
// dossier put it beside G5, noting that `/clinicians` ships real clinical content while W56 has
// held the register chain for two years over transcribing published intervals, which is less
// clinically consequential. Both positions are defensible; they are not simultaneously
// defensible, and `STANDING_FLAGS` keeps that in the suite rather than in a document.

import { lintLandingCopy, type LandingViolation } from "./landing";
import { lintMessageText } from "@/messaging/templates";

export type Audience =
  /** Anyone, including a patient. Therapeutic-advertising rules apply in full. */
  | "patient"
  /** Addressed to clinicians and practice managers. Professional communication. */
  | "professional"
  /**
   * A legal notice addressed to patients — privacy, automated decisions.
   *
   * Found by the sweep on its first run, and it is a page CLASS rather than a sentence, which is
   * why it is a classification and not an allowlist entry. APP 1 requires a privacy policy to
   * state the kinds of personal information an entity holds, and for this product those kinds
   * ARE "diagnoses" and "test results". The patient-copy rules ban naming them because naming
   * them in marketing targets somebody; a notice that cannot name them cannot comply. The
   * marketing rules still apply in full — a privacy notice has no business carrying a
   * testimonial, a rating or a superlative.
   */
  | "patient_notice";

export interface PublicSurface {
  /** URL path as served. */
  path: string;
  audience: Audience;
  /** Why this audience, in a sentence somebody can disagree with. */
  why: string;
}

/**
 * Every route a stranger can reach, and who it is for.
 *
 * Console routes are excluded because they are behind a session; this list is what an
 * unauthenticated visitor can load. Checked against the tree by the test.
 */
export const PUBLIC_SURFACES: readonly PublicSurface[] = [
  {
    path: "/",
    audience: "patient",
    why: "The app itself: since O230 the root IS the clinician finder, whose whole shape is a patient looking for care, so it answers to every patient rule regardless of the roster being synthetic. It was the community landing page until that unit moved the story to `/story` and the product to the front door; the reasoning moved with each of them rather than being rewritten.",
  },
  {
    path: "/book/[token]",
    audience: "patient",
    why: "A patient following a link from an invitation. The most patient-facing surface in the product, and the only one reached by somebody who was contacted rather than somebody who went looking.",
  },
  {
    path: "/approach",
    audience: "patient",
    why: "The landing page's argument at length, addressed to the same reader the landing page is: somebody deciding whether to look for a GP. Same rules, same linter, and the copy is the copy that was on `/` until it moved here — nothing was relaxed by giving it a route of its own.",
  },
  {
    path: "/about",
    audience: "patient",
    why: "The team, on their own page — GATED SHUT since O155 (founder-directed 2026-08-21: \"make team hidden at the moment… we are still building and we dont know who will be on it finally\"). `TEAM_PAGE_PUBLIC` is false, so the route calls `notFound()`, carries `robots: noindex`, is absent from the sitemap and has no door in either footer. The entry stays here rather than being deleted because the page is one word from returning, and a surface that can come back needs its compliance reasoning kept with it: same reader as the landing, same rules, roles and affiliations are each person's own record, portraits are supplied, and nothing on it makes a clinical claim.",
  },
  {
    path: "/clinicians",
    audience: "professional",
    why: "A walkthrough addressed to GPs, describing what the software does with a worked clinical example. Clinical content between clinicians is professional communication rather than therapeutic advertising — see STANDING_FLAGS, because whether to publish it at all is a separate and open question.",
  },
  {
    path: "/clinicians/join",
    audience: "professional",
    why: "The invitation for GPs who want to be listed — O188 retired the application form, so the page is a pitch and one email address; it collects nothing on-page and asks nothing about any patient. Public because a GP has to be able to reach it without an account, which is also why it is swept.",
  },
  {
    path: "/demo",
    audience: "professional",
    why: "A presenter view for showing the product to a practice. Not linked from anywhere a patient would be, but public, so it is swept.",
  },
  {
    path: "/examples",
    audience: "patient",
    why: "Worked examples of the finder on demo scenarios — the compliant form of a case-studies page. Read by somebody deciding whether to trust the product, so it answers to every patient rule; it deliberately contains no patient story, because a patient outcome presented as marketing is a testimonial and the National Law prohibits those.",
  },
  {
    path: "/faq",
    audience: "patient",
    why: "Questions a person searching for ADHD care arrives with, answered as administrative fact. The single likeliest page to be quoted back to somebody, so its copy is held to every patient rule including the ones about claims and conditions.",
  },
  {
    path: "/profile",
    audience: "patient",
    why: "O233's Profile tab. It renders only what this device's own session already holds — the words the person described and the suburb they gave — so it publishes nothing and personalises nothing, but it is a patient-facing app surface and every sentence on it answers to the patient rules.",
  },
  {
    path: "/story",
    audience: "patient",
    why: "Why the product exists, at length: the account that occupied `/` until O230 made the front door the app. Same reader as before — somebody deciding whether to look for a GP — and the same rules, the same linter and the same copy; only the address changed.",
  },
  {
    path: "/practices",
    audience: "professional",
    why: "The B2B landing page, addressed to practice owners and managers. W23's linter was written for this page specifically.",
  },
  {
    path: "/thanks",
    audience: "patient",
    why: "The page after the interest form. Whoever registered reads it, and it makes one operational promise (a person replies within two business days), which is exactly the kind of sentence the sweep exists to hold to account.",
  },
  {
    path: "/terms",
    audience: "patient_notice",
    why: "Terms of use are read by the same person the privacy policy addresses, and carry the same duty: administrative fact in plain words, no clinical claims, the canonical responsibility statement rendered from its constant. Draft-marked and counsel-gated alongside the privacy policy (O39).",
  },
  {
    path: "/privacy",
    audience: "patient_notice",
    why: "A privacy notice is read by the people whose data it concerns, and APP 1 requires it to state the kinds of information held — which for this product means naming diagnoses and test results. Marketing rules apply; the data-category rules cannot, or the notice cannot be written.",
  },
  {
    path: "/privacy/counsel-review",
    audience: "patient_notice",
    why: "Explains why the two legal documents are draft-marked and what an independent lawyer has been asked to check — the automated-decisions transparency move applied to the legal process itself. Read by the person the drafts concern, so it answers to the same patient rules.",
  },
  {
    path: "/privacy/automated-decisions",
    audience: "patient_notice",
    why: "Same reason as /privacy. An ADM transparency notice exists for the person the decision is about, and describing what the software decides means naming what it decides it from.",
  },
];

/**
 * Rules a professional surface is NOT held to, with the argument for each.
 *
 * By RULE rather than by matched word, unlike W184's surname list, because the exemption is about
 * the audience a rule was written for rather than about a lexical collision.
 *
 * These two are W23's. W6's rules are handled differently and the difference is the finding —
 * see `sweepSurface`.
 */
export const PROFESSIONAL_EXEMPT_RULES: Readonly<Record<string, string>> = {
  "no-clinical-claims":
    "Written for patient-facing copy, where naming a treatment is therapeutic advertising. Between clinicians it is how the work is described at all, and a product that cannot say what it does to the people who would use it cannot be explained.",
  "no-condition-targeting":
    "Naming a condition to a patient targets them; naming one to a GP describes a cohort. The same words, and a different act.",
};

/** The rules a surface answers to, given its audience. Computed, never transcribed. */
export function rulesFor(
  audience: Audience,
  landingRules: readonly string[],
  messageRules: readonly string[] = [],
): string[] {
  if (audience === "patient") return [...new Set([...landingRules, ...messageRules])].sort();
  // Both other classes drop the data-category rules, for different reasons argued above, and keep
  // every marketing rule. W6 is absent from both by construction — see `sweepSurface`.
  return landingRules.filter((rule) => !(rule in PROFESSIONAL_EXEMPT_RULES)).sort();
}

export interface SurfaceFinding extends LandingViolation {
  path: string;
}

/**
 * Sweep one surface's rendered text.
 *
 * Takes the text rather than fetching it, so the same function serves a real page in an e2e and a
 * fixture in a unit test — and the e2e is the one that matters, because a rule applied to a copy
 * bundle is not a rule applied to what the page actually serves (W184's lesson, one unit later).
 *
 * W6 IS NOT APPLIED TO A PROFESSIONAL SURFACE AT ALL, and working out why was most of this unit.
 * The first version exempted W6's rules one at a time and the list kept growing: `no-overdue-
 * framing`, `no-clinical-necessity` (a GP page says "required"), `no-test-results-bait`,
 * `no-checkup-prompting`, `no-deterioration`, `no-diagnosis-or-condition` — six of its eight. A
 * six-entry exemption list is not an exemption, it is a signal that the wrong instrument is being
 * used: **W6 lints a message SENT TO A PATIENT**, and every rule in it is about what that message
 * may say to that person. Running it over a page addressed to GPs asks the wrong question of every
 * line. So professional surfaces get W23, which was written for public web copy, and W6's two
 * rules that genuinely generalise — testimonials and superlatives — are already W23's as well.
 */
export function sweepSurface(path: string, audience: Audience, text: string): SurfaceFinding[] {
  const marketing = lintLandingCopy(text).filter(
    (v) => !(audience !== "patient" && v.rule in PROFESSIONAL_EXEMPT_RULES),
  );
  const patientMessage = audience === "patient" ? lintMessageText(text) : [];
  return [...marketing, ...patientMessage].map((v) => ({ ...v, path }));
}

/**
 * Findings accepted with a reason and a review date.
 *
 * W53's audit-allowlist pattern, borrowed wholesale because the problem is identical: a check
 * that cannot record an accepted exception gets switched off the first time it is inconvenient,
 * and a check that accepts silently stops being a check. So an exception is DATA — the exact
 * path, rule and matched text, an argument, and a date somebody has to look again.
 *
 * WHAT THIS LIST IS FOR, WITH THE CASE THAT ESTABLISHED IT. `\bdiagnos\w*\b` fires on the landing
 * page, and it should — that pattern exists because a patient-facing page saying "diagnosis" is
 * usually offering one. On `/` the word appears in a sentence about people who ALREADY CARRY a
 * diagnosis of anxiety and were never assessed for anything else. That is a description of who the
 * pathway fails, not an offer, and the linter cannot see the difference because the difference is
 * who the sentence is about.
 *
 * Accepted rather than exempted, and accepted rather than edited: quietly widening the rule would
 * drop the word everywhere it does matter, and editing the sentence to satisfy a regex would
 * remove the one group the page exists to name. Whether it belongs on a patient-reachable page is
 * an advertising-compliance judgement, so it carries a review date.
 *
 * THIS LIST WILL BE LONGER FOR THIS PRODUCT THAN FOR THE ONE IT WAS WRITTEN FOR, and the reason is
 * structural rather than sloppy — see the `/finder` entry in STANDING_FLAGS. Each entry still has
 * to be argued individually, which is the point: a long list of reasoned acceptances is reviewable,
 * and a widened rule is not.
 */
export interface AcceptedFinding {
  path: string;
  rule: string;
  /** The exact matched text. A rule accepted in general would be a rule switched off. */
  match: string;
  why: string;
  /** ISO date. Past this, somebody looks again. */
  reviewBy: string;
}

export const ACCEPTED_FINDINGS: readonly AcceptedFinding[] = [
  // EMPTY, AND THAT IS A RESULT RATHER THAN AN OVERSIGHT.
  //
  // Two entries lived here for the landing page's use of "diagnosis". The 2026-08-13 rewrite cut
  // that page from eight sections to five and the sentence went with it, so both acceptances
  // stopped describing anything. The test checks BOTH directions and failed on exactly that: an
  // acceptance for a finding the page no longer produces reads as coverage, which is worse than
  // no acceptance at all because it looks like somebody considered the case recently.
  //
  // Deleted rather than kept "in case it comes back". If the wording returns, so does the finding,
  // and it can be argued again then with a fresh review date.
  //
  // THE NETWORK'S AND THE MISSION PAGE'S ACCEPTANCES LEFT WITH THEIR SURFACES when the two
  // interfaces were split into separate deployments. Three entries went: the open founder gate on
  // `/network` ("Mental health", the same question `mental-health-on-profile` asks by the finder
  // road) and the two the founder's own mission sentence produced on `/mission`. None of them was
  // decided here — they moved to the deployment that still serves those pages, which is where the
  // reviewer who owns that call will find them. The equivalent finder-road gate is UNCHANGED and
  // still open below.
  //

];


/**
 * Open questions that are not about a route, and therefore cannot live in `STANDING_FLAGS`.
 *
 * The route map is checked in both directions — a flagged path must be a surface the sweep covers,
 * because a flag about a page that has moved reads as coverage. That invariant is worth keeping, so
 * a concern that spans every surface gets its own list rather than a fake key that would weaken it.
 *
 * Exactly one entry, and it is not a small one.
 */
export const PRODUCT_FLAGS: Readonly<Record<string, string>> = {
  "brand-is-a-condition":
    "The product is called ADHD.ME, so every patient-facing surface names a condition in its title, its URL and every sentence naming the product. That is condition-targeting by construction, arriving through the one string no linter can refuse — see the header of src/compliance/landing.ts, which is why `no-condition-targeting` must never be given the word. It needs an Ahpra advertising review of the NAME, separately from the copy. The product this tree was adapted from deliberately kept the condition out of its brand and out of its B2B positioning; this one cannot. That is a defensible choice and a different risk position, and it should be taken deliberately rather than inherited from a rename.",
};

/** Findings not covered by an acceptance. These fail the sweep. */
export function unaccepted(
  findings: readonly SurfaceFinding[],
  accepted: readonly AcceptedFinding[] = ACCEPTED_FINDINGS,
): SurfaceFinding[] {
  return findings.filter(
    (f) =>
      !accepted.some((a) => a.path === f.path && a.rule === f.rule && a.match === f.match),
  );
}

/**
 * What this sweep does NOT establish, stated so a green run is not over-read.
 *
 * Found while writing the unit: the linters hold a short vocabulary. They know "diagnosis",
 * "diabetes", "kidney" and a handful beside them; they do not know "methylphenidate",
 * "lisdexamfetamine", "DSM-5-TR" or "ASRS". A page can therefore carry clinical content and pass, which is
 * exactly what `/clinicians` mostly does — its `diagnosis` and `diabetes` are what trip, not the
 * drug names. Widening the vocabulary is a real unit and not this one; pretending the bound is
 * not there would make every future green run mean more than it does.
 *
 * The sweep also runs over RENDERED TEXT rather than source, and the reason is concrete: scanning
 * the source of /clinicians reports a `no-ratings` hit on the word "review", which turns out to be
 * the identifier `is-reviewed` in a className. A source scan measures the code; only a rendered
 * scan measures what a stranger reads.
 */
export const VOCABULARY_BOUND =
  "This sweep enforces the vocabulary W6 and W23 hold, not the concept of a clinical claim. Drug names, criteria names and procedure names are not in those lists, so a surface can carry clinical content and pass. Widening the vocabulary is its own unit.";

/**
 * Open questions this sweep is deliberately not answering.
 *
 * THIS DOCSTRING USED TO SAY "kept where the suite can see them", and argue that a flag with a test
 * around it gets read every run while a flag in a document gets re-noticed once a quarter. The
 * argument was right and the claim is no longer true: the 2026-09-03 strip removed the register
 * tests, and nothing now imports `STANDING_FLAGS` or `PRODUCT_FLAGS`. They are prose.
 *
 * Re-adding a test would be rebuilding the apparatus the founder had just deleted, so instead both
 * lists are indexed from README.md §"What needs a founder decision before this goes live", which is
 * the one place all of them are named together. If you are reading this file and not that section,
 * read that section. These are founder decisions; nothing here resolves one.
 */
export const STANDING_FLAGS: Readonly<Record<string, string>> = {
  "/clinicians":
    "Names real clinical territory (differential diagnosis, pre-stimulant cardiac screening, titration review) while G5 has held the register chain for two years over transcribing published cycle-of-care intervals, which is less clinically consequential. Classifying this surface professional makes the SWEEP honest about which rules it applies; it does not decide whether ADHD.ME should publish clinical guidance at all, and that decision is the founder's. Raised in the Y2 gate dossier, restated in the Q13 one, and unresolved in both — those documents were deleted on 2026-09-03, so this entry and README.md's founder-decision index are now the whole record of it. NARROWED, NOT CLOSED: the walkthrough's learning list now LINKS OUT to AADPA and NICE rather than restating their content, and a link is not a claim — but the page still names the territory.",
  // O230 moved the finder to `/`; the flag is about what the surface RENDERS, so it moved too.
  "/":
    "A patient-facing surface whose content is people describing what they want from a clinician, in their own words — which for this product means the rendered page carries 'diagnosis', 'medication', 'psychiatrist' and drug classes. The distinction the rules cannot see is that these are QUOTED REQUESTS rather than claims the product makes: 'I want a GP who will discuss non-stimulant options honestly' is a preference, and the same words in the product's voice would be an offer. That distinction is real and it is a judgement, so the findings it produces are accepted individually in ACCEPTED_FINDINGS with review dates rather than the patient classification being weakened.",
};
