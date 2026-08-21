"use client";

// O30: the interview screen — the transcript field is real, and the machine listens while
// the interviewer types.
//
// THE SHAPE OF THE CONVERSATION (docs/ONBOARDING-INTERVIEW.md): no form on screen while the
// doctor talks. The interviewer types what is said; beneath the transcript, proposals appear
// live, each carrying the sentence it came from and the STRUCTURED INTERVIEW'S OWN question
// as its read-back. The interviewer asks that question out loud and records the doctor's
// answer — often / sometimes / not me. NO AUTO-ACCEPT AND NO BULK ACCEPT: the only path from
// a proposal to a declaration is one recorded answer at a time, which is what keeps "I don't
// see children for this" from becoming a paediatric listing because a word appeared.
//
// WHAT SAVING WRITES. The same W226 draft record the matching console's review editor writes —
// never a profile; SHIPPED_DIRECTORY_PROFILES stays empty behind founder gate G6. The spoken
// answer is kept as `frequency` beside the review status, because "sometimes" and "often"
// both accept and the difference is information the matcher may weight later.
//
// The logic lives in src/onboarding/capture.ts; this file is the rendering of it.

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState, useTransition } from "react";
import { saveReview, type SaveState } from "../matching/actions";
import {
  confirmedBackground,
  gapFacets,
  parseTranscriptText,
  readBackQuestionFor,
} from "@/onboarding/capture";
import { FREQUENCIES, type Frequency } from "@/onboarding/interview";
import { readTranscript } from "@/onboarding/transcript";
import { proposeDeclarations, reachGaps } from "@/onboarding/expertise";
import { facetKey } from "@/matching/needs";

const ANSWER_LABEL: Record<Frequency, string> = {
  often: "Often",
  sometimes: "Sometimes",
  "not-me": "Not me",
};

/** A stable synthetic id from the display name. Draft store only; never a published identity. */
function clinicianIdFrom(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unnamed";
}

export function InterviewScreen() {
  const reducedMotion = useReducedMotion();
  const [clinicianName, setClinicianName] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [transcriptText, setTranscriptText] = useState("");
  const [answers, setAnswers] = useState<Record<string, Frequency>>({});
  const [readBack, setReadBack] = useState(false);
  const [save, setSave] = useState<SaveState>({ status: "idle", message: "" });
  const [saving, startSaving] = useTransition();

  const turns = useMemo(() => parseTranscriptText(transcriptText), [transcriptText]);
  const read = useMemo(() => readTranscript(turns), [turns]);
  const clinicianSpeech = useMemo(
    () => turns.filter((turn) => turn.speaker === "clinician").map((turn) => turn.text).join(" "),
    [turns],
  );
  // The cross-check (W227): which of the same words the PATIENT'S reader also hears. A facet
  // both readers reach is one patients ask for in their own words — worth confirming first.
  const crossCheck = useMemo(() => proposeDeclarations(clinicianSpeech), [clinicianSpeech]);
  const patientKeys = useMemo(
    () => new Set(crossCheck.map((proposal) => facetKey(proposal.facet))),
    [crossCheck],
  );
  const languageProposals = crossCheck.filter((proposal) => proposal.facet.kind === "language");
  const patientSilent = useMemo(() => reachGaps(clinicianSpeech), [clinicianSpeech]);

  const answered = read.proposed.filter((proposal) => {
    const key = proposal.kind === "care" ? `care:${proposal.area}` : `manner:${proposal.trait}`;
    return answers[key] !== undefined;
  }).length;
  // The gap sweep (O36): what the conversation has not covered yet. Watching this number fall
  // as the doctor talks is the screen's whole argument for the conversation-first design.
  const gaps = useMemo(() => gapFacets(read), [read]);
  const gapsToAsk = gaps.filter((facet) => answers[facet.key] === undefined).length;

  const readyToSave =
    clinicianName.trim().length >= 2 && interviewer.trim().length >= 2 && turns.length > 0;

  const record = (key: string, answer: Frequency) =>
    setAnswers((current) => {
      // Recording the same answer again un-records it — the correction gesture, so a
      // mis-click is one tap to undo rather than a wrong declaration to notice later.
      if (current[key] === answer) {
        const { [key]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [key]: answer };
    });

  const submit = () =>
    startSaving(async () => {
      const background = {
        ...confirmedBackground(
          clinicianIdFrom(clinicianName),
          clinicianName.trim(),
          read,
          answers,
          interviewer.trim(),
        ),
        readBackConfirmed: readBack,
        // The reach-gap feed rides the save (O38): what a patient's words could not reach in
        // this doctor's speech is part of the interview's record, not just its display.
        patientSilent,
      };
      setSave(await saveReview(background, interviewer.trim()));
    });

  return (
    <div className="iv">
      <section className="mc-section" aria-labelledby="iv-who">
        <h2 id="iv-who">Who is in the room</h2>
        <div className="iv-who">
          <label className="iv-field">
            <span>Doctor’s name, as patients will see it</span>
            <input
              type="text"
              value={clinicianName}
              onChange={(event) => setClinicianName(event.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="iv-field">
            <span>Interviewer — recorded beside every answer</span>
            <input
              type="text"
              value={interviewer}
              onChange={(event) => setInterviewer(event.target.value)}
              autoComplete="off"
            />
          </label>
        </div>
      </section>

      <section className="mc-section" aria-labelledby="iv-tx">
        <h2 id="iv-tx">The conversation</h2>
        <p className="mc-note">
          Type what is said, one line per turn. Start your own turns with{" "}
          <code>i:</code> — only the doctor’s words are ever read. Text only, kept internal,
          never published.
        </p>
        <label className="iv-field iv-transcript">
          <span className="sr-only">Interview transcript</span>
          <textarea
            value={transcriptText}
            onChange={(event) => setTranscriptText(event.target.value)}
            rows={10}
            placeholder={"i: How does a first appointment usually go?\nI book a longer first appointment, you cannot take a history in fifteen minutes."}
          />
        </label>
      </section>

      <section className="mc-section" aria-labelledby="iv-props">
        <h2 id="iv-props">
          Heard so far{read.proposed.length > 0 ? ` — ${answered} of ${read.proposed.length} confirmed` : ""}
        </h2>
        <p className="mc-note">
          Each proposal carries the sentence it came from and the interview’s own question.
          Ask the question as written, then record the answer. A proposal is never a
          declaration; the recorded answer is what makes it one.
        </p>
        {read.proposed.length === 0 ? (
          <p className="mc-empty">Nothing yet. Proposals appear here as the doctor talks.</p>
        ) : (
          <ul className="iv-proposals" aria-live="polite">
            <AnimatePresence initial={false}>
              {read.proposed.map((proposal) => {
                const key =
                  proposal.kind === "care" ? `care:${proposal.area}` : `manner:${proposal.trait}`;
                const answer = answers[key];
                return (
                  <motion.li
                    key={key}
                    className={`iv-proposal${answer ? ` iv-${answer}` : ""}`}
                    initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reducedMotion ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <div className="iv-proposal-head">
                      <span className={`mc-tag mc-tag-${proposal.kind}`}>{proposal.label}</span>
                      {patientKeys.has(key) && (
                        <span className="iv-cross">patients ask for this in their own words</span>
                      )}
                    </div>
                    <blockquote className="mc-quote">“{proposal.quote}”</blockquote>
                    <p className="iv-question">{readBackQuestionFor(key)}</p>
                    <div className="iv-answers" role="group" aria-label={`Record the answer for ${proposal.label}`}>
                      {FREQUENCIES.map((frequency) => (
                        <button
                          key={frequency}
                          type="button"
                          className="iv-answer"
                          aria-pressed={answer === frequency}
                          onClick={() => record(key, frequency)}
                        >
                          {ANSWER_LABEL[frequency]}
                        </button>
                      ))}
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}

        {languageProposals.length > 0 && (
          <>
            <h3 className="mc-sub">Languages mentioned</h3>
            <p className="mc-note">
              Asked directly in the structured questions — the read-back below is the wording.
            </p>
            <ul className="mc-unread">
              {languageProposals.map((proposal) => (
                <li key={proposal.label}>{proposal.toConfirm}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="mc-section" aria-labelledby="iv-sweep">
        <h2 id="iv-sweep">
          Still to ask{gaps.length > 0 ? ` — ${gapsToAsk} of ${gaps.length}` : ""}
        </h2>
        <p className="mc-note">
          The checklist the conversation has not covered yet — it shrinks as the doctor talks.
          Ask what is left from here, same three answers; a question never asked is recorded
          nowhere.
        </p>
        {gaps.length === 0 ? (
          <p className="mc-empty">Nothing left. The conversation reached every facet.</p>
        ) : (
          <ul className="iv-sweep">
            {gaps.map((facet) => {
              const answer = answers[facet.key];
              return (
                <li key={facet.key} className={`iv-sweep-row${answer ? ` iv-${answer}` : ""}`}>
                  <p className="iv-sweep-question">
                    {readBackQuestionFor(facet.key)}
                    <span className="iv-sweep-label">{facet.label}</span>
                  </p>
                  <div className="iv-answers" role="group" aria-label={`Record the answer for ${facet.label}`}>
                    {FREQUENCIES.map((frequency) => (
                      <button
                        key={frequency}
                        type="button"
                        className="iv-answer"
                        aria-pressed={answer === frequency}
                        onClick={() => record(facet.key, frequency)}
                      >
                        {ANSWER_LABEL[frequency]}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {(read.unread.length > 0 || patientSilent.length > 0) && (
        <section className="mc-section" aria-labelledby="iv-gaps">
          <h2 id="iv-gaps">For after the interview</h2>
          <details className="iv-gaps">
            <summary>
              Sentences the machine could not hear ({read.unread.length + patientSilent.length})
            </summary>
            {read.unread.length > 0 && (
              <>
                <p className="mc-note">The vocabulary could not read these at all:</p>
                <ul className="mc-unread">
                  {read.unread.map((line) => <li key={line}>“{line}”</li>)}
                </ul>
              </>
            )}
            {patientSilent.length > 0 && (
              <>
                <p className="mc-note">Said by the doctor, silent to a patient’s search:</p>
                <ul className="mc-unread">
                  {patientSilent.map((line) => <li key={line}>“{line}”</li>)}
                </ul>
              </>
            )}
            <p className="mc-note">
              Kept rather than discarded — this is the lexicon’s to-do list, written by the
              people it is about.
            </p>
          </details>
        </section>
      )}

      <section className="mc-section" aria-labelledby="iv-save">
        <h2 id="iv-save">Record it</h2>
        <label className="be-confirm">
          <input
            type="checkbox"
            checked={readBack}
            onChange={(event) => setReadBack(event.target.checked)}
          />
          <span>
            Every recorded answer was read back and the doctor says it is them. Until this is
            ticked the interview saves as a draft.
          </span>
        </label>
        <div className="be-save">
          <button
            type="button"
            className="be-save-button"
            disabled={saving || !readyToSave}
            onClick={submit}
          >
            {saving ? "Saving…" : "Save this interview"}
          </button>
          {save.status !== "idle" && (
            <p className={`be-save-msg be-save-${save.status}`} role="status">{save.message}</p>
          )}
        </div>
        <p className="be-persist">
          Saving writes the same draft record the review editor writes — which answers were
          recorded, by whom, and whether they were read back. Never a profile:{" "}
          <code>SHIPPED_DIRECTORY_PROFILES</code> stays empty behind gate G6.
        </p>
      </section>
    </div>
  );
}
