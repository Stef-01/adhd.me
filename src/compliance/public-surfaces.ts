// W192: the public copy sweep — every surface a stranger can reach, and which rules it answers to.
//
// The unit's gate is "no clinical claim on any of them", and taken literally the sweep would fail
// on the day it was written. `/clinicians` carries Rotterdam criteria, COCP suitability and
// metformin titration, which is clinical content by any reading. The Y2 dossier noticed this, the
// Q13 dossier re-checked it and noticed it again, and both filed it as an inconsistency. Filing it
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
// decide whether Meherr should publish clinical guidance at all. That question is live — Q13's
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
    why: "The community landing page. Anybody can arrive here from a search engine, so it is read by patients whether or not it is addressed to them.",
  },
  {
    path: "/book/[token]",
    audience: "patient",
    why: "A patient following a link from an invitation. The most patient-facing surface in the product, and the only one reached by somebody who was contacted rather than somebody who went looking.",
  },
  {
    path: "/clinicians",
    audience: "professional",
    why: "A walkthrough addressed to GPs, describing what the software does with a worked clinical example. Clinical content between clinicians is professional communication rather than therapeutic advertising — see STANDING_FLAGS, because whether to publish it at all is a separate and open question.",
  },
  {
    path: "/demo",
    audience: "professional",
    why: "A presenter view for showing the product to a practice. Not linked from anywhere a patient would be, but public, so it is swept.",
  },
  {
    path: "/finder",
    audience: "patient",
    why: "A synthetic clinician finder. Its whole shape is a patient looking for care, so it answers to the patient rules regardless of the data being synthetic.",
  },
  {
    path: "/practices",
    audience: "professional",
    why: "The B2B landing page, addressed to practice owners and managers. W23's linter was written for this page specifically.",
  },
  {
    path: "/privacy",
    audience: "patient_notice",
    why: "A privacy notice is read by the people whose data it concerns, and APP 1 requires it to state the kinds of information held — which for this product means naming diagnoses and test results. Marketing rules apply; the data-category rules cannot, or the notice cannot be written.",
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
 * FOUND BY THIS SWEEP ON ITS FIRST RUN. The landing page says "a lymphoedema clinic, a VR headset
 * and my own diagnosis led me here". `\bdiagnos\w*\b` fires, and it should — that pattern exists
 * because a patient-facing page saying "diagnosis" is usually offering one. Here it is the founder
 * describing her own, in the first person, in a paragraph about why she started the company. That
 * is autobiography rather than a therapeutic claim, and the linter cannot see the difference
 * because the difference is who the sentence is about.
 *
 * Accepted rather than exempted, and accepted rather than edited: rewriting a founder's account of
 * her own illness to satisfy a regex is the wrong move by a wide margin, and quietly widening the
 * rule would drop the word everywhere it does matter. Whether a first-person diagnosis belongs on
 * a patient-reachable page is an advertising-compliance judgement, so it has a review date on it.
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
  {
    path: "/",
    rule: "no-clinical-claims",
    match: "diagnosis",
    why: "The founder's first-person account of her own diagnosis, in the paragraph explaining why she started the company. Autobiography, not an offer of diagnosis — the rule cannot tell the difference because the difference is whose diagnosis it is.",
    reviewBy: "2027-02-11",
  },
  {
    path: "/",
    rule: "no-diagnosis-or-condition",
    match: "diagnosis",
    why: "Same sentence, caught a second time by W6's patient-message linter. Accepted on the same grounds and listed separately so neither rule is switched off by accepting the other.",
    reviewBy: "2027-02-11",
  },
];

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
 * "diabetes", "kidney" and a handful beside them; they do not know "metformin", "COCP",
 * "Rotterdam" or "titration". A page can therefore carry clinical content and pass, which is
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
 * Open questions this sweep is deliberately not answering, kept where the suite can see them.
 *
 * A flag in a document gets re-noticed once a quarter by whoever happens to read it; a flag with
 * a test around it gets read every run. These are founder decisions, so the loop records them and
 * does not resolve them.
 */
export const STANDING_FLAGS: Readonly<Record<string, string>> = {
  "/clinicians":
    "Ships real clinical guidance (Rotterdam criteria, COCP suitability, metformin titration) while G5 has held the register chain for two years over transcribing published cycle-of-care intervals, which is less clinically consequential. Classifying this surface professional makes the SWEEP honest about which rules it applies; it does not decide whether Meherr should publish clinical guidance at all, and that decision is the founder's. Raised in docs/GATE-DOSSIER-Y2.md, restated in docs/GATE-DOSSIER-Q13.md, and unresolved in both.",
};
