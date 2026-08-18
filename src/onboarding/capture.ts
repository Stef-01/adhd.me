// W229 (O30): the live interview, as functions the screen and the tests share.
//
// WHAT THIS IS. ONBOARDING-INTERVIEW.md's flow, steps 2–4: the founder types the conversation
// as it happens, the machine reads it live, and each proposal is confirmed out loud with the
// STRUCTURED INTERVIEW'S OWN QUESTION before anything is recorded. This module is the pure part
// of that screen — parsing the typed transcript into attributed turns, finding the read-back
// question for a proposed facet, and folding the clinician's spoken answers into the
// `ClinicianBackground` the W226 store already keeps. The React component owns none of this
// logic, so the behaviour that matters is testable without a browser.
//
// THE CONFIRM STEP IS THE INTERVIEW, NOT A SHORTCUT PAST IT. `readTranscript` proposes; the
// question read back for `care:titration` is the same question the keyboard-first interview
// would have asked (`INTERVIEW`'s own `ask`, found by the facet key the two already share).
// That identity is the design: the conversation shrinks the checklist, it does not replace it,
// and a confirmed answer lands as the same three-state record either path produces.

import { EI_QUALITIES, EI_QUALITY_KEYS } from "@/demo/emotional-fit";
import { backgroundFromProposals, type BackgroundFacet, type ClinicianBackground } from "./background";
import { FREQUENCIES, INTERVIEW, type Frequency, type Question } from "./interview";
import type { ProposedBackground, TranscriptTurn } from "./transcript";
import { CARE_AREA_LABELS } from "./types";

/**
 * Parse a typed transcript into attributed turns.
 *
 * One line per turn. A line starting `interviewer:` (or the shorthand `i:`) is the
 * interviewer; every other non-empty line is the clinician. The convention leans the right
 * way on purpose: only CLINICIAN turns are ever read (transcript.ts's rule), so the mistake
 * of forgetting a prefix mislabels a question as clinician speech — which the interviewer
 * sees immediately as a wrong proposal — rather than silently discarding the doctor's words.
 */
export function parseTranscriptText(text: string): TranscriptTurn[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const prefixed = line.match(/^(?:interviewer|i)\s*:\s*(.*)$/i);
      return prefixed
        ? { speaker: "interviewer" as const, text: prefixed[1]!.trim() }
        : { speaker: "clinician" as const, text: line };
    })
    .filter((turn) => turn.text.length > 0);
}

/** The structured interview's care and manner questions, keyed the way facets are. */
const QUESTION_BY_FACET_KEY = new Map<string, Question>(
  INTERVIEW.filter(
    (question) => question.target.kind === "care" || question.target.kind === "manner",
  ).map((question) => [question.id, question]),
);

/**
 * The read-back question for a proposed facet — the interview's OWN question, not a paraphrase.
 *
 * `interview.ts` guarantees every matchable facet has exactly one question and uses the facet
 * key as the question id, so this lookup cannot miss for anything `readTranscript` proposes;
 * the fallback exists only so a future vocabulary drift fails visible in the UI rather than
 * throwing mid-interview.
 */
export function readBackQuestionFor(facetKey: string): string {
  return QUESTION_BY_FACET_KEY.get(facetKey)?.ask ?? "Is this yours? (No scripted question found — the vocabulary and the interview have drifted.)";
}

export function isFrequency(value: string): value is Frequency {
  return (FREQUENCIES as readonly string[]).includes(value);
}

/** One matchable facet the checklist can still ask about. */
export type GapFacet = { key: string; kind: "care" | "manner"; label: string };

/**
 * Every matchable facet, in the interview's own order — care first, then manner — with the
 * label a profile would eventually carry. The two vocabularies are the same ones the readers
 * propose from, so a facet can never be in the gap list AND proposable at once.
 */
export const MATCHABLE_VOCABULARY: readonly GapFacet[] = [
  ...CARE_AREA_LABELS.map((area) => ({ key: `care:${area.id}`, kind: "care" as const, label: area.label })),
  ...EI_QUALITY_KEYS.map((trait) => ({ key: `manner:${trait}`, kind: "manner" as const, label: EI_QUALITIES[trait].label })),
];

/**
 * The gap sweep (O36): the facets the transcript has NOT reached, i.e. the questions still to
 * ask. This list SHRINKING as the doctor talks is the design's whole promise — the
 * conversation shrinks the checklist, it does not replace it (docs/ONBOARDING-INTERVIEW.md
 * step 5).
 */
export function gapFacets(read: ProposedBackground): GapFacet[] {
  const proposed = new Set(
    read.proposed.map((p) => (p.kind === "care" ? `care:${p.area}` : `manner:${p.trait}`)),
  );
  return MATCHABLE_VOCABULARY.filter((facet) => !proposed.has(facet.key));
}

/**
 * Fold the clinician's spoken answers into a reviewable background.
 *
 * often / sometimes → `accepted` (both are declarations; the distinction is KEPT in
 * `frequency`, because collapsing them here would rebuild the tickbox the interview refuses);
 * not-me → `rejected`; a proposal with no answer yet stays `proposed` with nobody named, so
 * the W226 writer's rule — an accepted facet must name who decided it — holds by construction:
 * the only path to `accepted` runs through a recorded answer with the interviewer's name.
 */
export function confirmedBackground(
  clinicianId: string,
  displayName: string,
  read: ProposedBackground,
  answers: Readonly<Record<string, Frequency>>,
  interviewer: string,
): ClinicianBackground {
  const base = backgroundFromProposals(clinicianId, displayName, read.proposed, read.unread);
  const decide = (facet: BackgroundFacet, answer: Frequency): BackgroundFacet => ({
    ...facet,
    frequency: answer,
    status: answer === "not-me" ? ("rejected" as const) : ("accepted" as const),
    decidedBy: interviewer,
  });
  const proposedKeys = new Set(base.facets.map((facet) => facet.key));
  return {
    ...base,
    facets: [
      ...base.facets.map((facet) => {
        const answer = answers[facet.key];
        return answer ? decide(facet, answer) : facet;
      }),
      /* The gap sweep's answers (O36). An answered checklist question lands as a facet with NO
         quote and NO cue — nothing was heard, it was asked — which is the same shape the review
         editor gives a facet a reviewer adds by hand. An UNANSWERED checklist question appears
         nowhere: a question never asked must not be stored as a facet nobody decided. */
      ...MATCHABLE_VOCABULARY.filter((facet) => !proposedKeys.has(facet.key) && answers[facet.key]).map(
        (facet) => decide({ ...facet, status: "proposed" }, answers[facet.key]!),
      ),
    ],
  };
}
