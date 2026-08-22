"use client";

import { AnimatePresence, MotionConfig, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { careArchetypes } from "@/demo/care-archetypes";
import {
  clinicians,
  getPersonalizedMatch,
  matchEvidence,
  matchQuality,
  needsFor,
  rankBands,
  rankCliniciansNear,
  rankClinicians,
  requestFitCopy,
  requestFitSummary,
  topTieNote,
  unservedAsks,
  missedAsks,
  type Clinician,
} from "@/demo/clinicians";
import { clarifiers } from "@/matching/clarify";
import { resolvePlace, type SuburbPoint } from "@/geo/suburbs";
import {
  DEFAULT_SPEECH_LANGUAGE,
  dropCarriedStream,
  speechDebugFacts,
  SPEECH_ERROR_COPY,
  SPEECH_UNAVAILABLE_COPY,
  speechUnavailable,
  startSpeech,
  type SpeechSession,
} from "@/voice/speech";
import { getRequestHeadline, type Stage } from "./finder-stages/shared";
import { WelcomeStage } from "./finder-stages/welcome-stage";
import { ScenariosStage } from "./finder-stages/scenarios-stage";
import { ListeningStage } from "./finder-stages/listening-stage";
import { TypeStage } from "./finder-stages/type-stage";
import { ResultsStage } from "./finder-stages/results-stage";
import { ProfileStage } from "./finder-stages/profile-stage";
import { CompareStage, type CompareRow } from "./finder-stages/compare-stage";
import { BookingStage } from "./finder-stages/booking-stage";

/**
 * O95 (refactor lane, queue item 1): the 1,253-line single file became this orchestrator
 * plus app/finder-stages/ — one file per screen, shared pieces in shared.tsx. The state
 * machine, the speech session lifecycle (O69: it must not split across files) and every
 * memo stay here; stages receive state and named handlers as props. Behaviour-identical
 * by construction, with the e2e suites (finder-flow, voice, booking, mobile-fit, a11y)
 * run unchanged as the definition of "identical".
 */

const defaultArchetype = careArchetypes[0]!;
const exampleRequest = defaultArchetype.request;

export function CareFinder() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [archetypeIndex, setArchetypeIndex] = useState(0);
  // The scenario browser rotates on its own until the visitor takes over.
  const [autoCycle, setAutoCycle] = useState(true);
  const reducedMotion = useReducedMotion();
  const [draft, setDraft] = useState("");
  const [request, setRequest] = useState(exampleRequest);
  const [matches, setMatches] = useState(() => rankClinicians(exampleRequest));
  const [matchIndex, setMatchIndex] = useState(0);
  const [matchDirection, setMatchDirection] = useState<1 | -1>(1);
  // Speech state. `heard` is the live transcript, so the screen shows words as they arrive; that
  // is the only reliable signal to somebody that the microphone is actually working.
  // Where the person says they are. A typed suburb or postcode, never the device's location: no
  // permission prompt, and no coordinate leaves the browser.
  const [place, setPlace] = useState("");
  const origin: SuburbPoint | null = useMemo(() => resolvePlace(place), [place]);
  // Round 2: sixteen near-identical rows is the "long list" anti-pattern. Five is enough to choose
  // from, and the rest are one tap away for somebody who wants to read all of them.
  const [showAll, setShowAll] = useState(false);
  const [heard, setHeard] = useState("");
  const [speechMessage, setSpeechMessage] = useState<string | null>(null);
  /**
   * O48: the permission failure's way back is a BUTTON, not a sentence. WebKit only starts
   * recognition from a screen tap, so the O18 auto-retry that runs after the Allow dialog can
   * be refused no matter what the module does — the recovery that actually works on an iPhone
   * is the person tapping again, with permission now granted. The copy said "try once more";
   * this renders the once-more as a control beside it.
   */
  const [speechRetryable, setSpeechRetryable] = useState(false);
  /**
   * O59 (Standing debt 4): which language the microphone listens in. Default English (AU),
   * as it always was; the alternatives are exactly the languages the listed GPs declare
   * (`SPEECH_LANGUAGES` states the basis). Choosing one restarts listening in it, and while a
   * non-English language is active the honesty line renders — matching reads English for now.
   */
  const [speechLang, setSpeechLang] = useState(DEFAULT_SPEECH_LANGUAGE);
  const speech = useRef<SpeechSession | null>(null);
  /** True only between the Done tap and its onFinal — the person asked for the finish. */
  const stopRequested = useRef(false);

  const archetype = careArchetypes[archetypeIndex] ?? defaultArchetype;
  const clinician = matches[matchIndex] ?? clinicians[0]!;

  // Stop the microphone whenever this screen is left, by any route: the X, a stage change, an
  // unmount. A recogniser left running after its screen is gone keeps the mic light on, which is
  // alarming and correct to be alarmed by.
  useEffect(() => {
    if (stage === "listening") return;
    speech.current?.cancel();
    speech.current = null;
  }, [stage]);

  // O69: leaving the finder also drops any stream a failed session is carrying for the
  // recovery tap — the mic light must not outlive the screen the retry button lives on.
  useEffect(() => () => {
    speech.current?.cancel();
    dropCarriedStream();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stage]);

  /**
   * O95 audit fix: this interval used to run four sibling setState calls INSIDE the
   * setArchetypeIndex updater. Updaters must be pure — StrictMode replays them, and React
   * is free to call them more than once — so the interval now only advances the index,
   * and the effect below derives the scenario's request/matches from wherever the index
   * lands. Same rendered output on every path; the side effects just live where React
   * expects them.
   */
  useEffect(() => {
    if (stage !== "scenarios" || !autoCycle || reducedMotion) return;
    const timer = window.setInterval(() => {
      setArchetypeIndex((current) => (current + 1) % careArchetypes.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [stage, autoCycle, reducedMotion]);

  // The auto-cycle's side effects, out of the updater. Auto only: a manual cycle sets
  // autoCycle false first and carries its own direction, so this never fights it.
  useEffect(() => {
    if (stage !== "scenarios" || !autoCycle) return;
    const current = careArchetypes[archetypeIndex] ?? defaultArchetype;
    setRequest(current.request);
    setMatches(rankClinicians(current.request));
    setMatchIndex(0);
    setMatchDirection(1);
  }, [stage, autoCycle, archetypeIndex]);

  const requestSummary = useMemo(() => {
    const cleaned = request.trim().replace(/[.!?]+$/, "");
    if (!cleaned) return exampleRequest;
    return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}.`;
  }, [request]);
  const requestHeadline = useMemo(
    () => request.trim() === archetype.request ? archetype.headline : getRequestHeadline(request, requestSummary),
    [archetype.headline, archetype.request, request, requestSummary],
  );
  const allSignals = useMemo(
    () => matches.map((item) => getPersonalizedMatch(item, request).signals),
    [matches, request],
  );
  /**
   * ONE PIPELINE RUN PER RENDER (O8 review). These four were each computed inline in the JSX,
   * some more than once, and every call re-runs the full lexicon read over the request — a
   * dozen redundant scans per keystroke once the geo field re-renders the results stage.
   */
  const quality = useMemo(() => matchQuality(request), [request]);
  const tieNote = useMemo(() => topTieNote(request), [request]);
  const clarifierList = useMemo(() => clarifiers(request, matches), [request, matches]);
  const unserved = useMemo(() => unservedAsks(request), [request]);
  const fitCopy = useMemo(
    () => requestFitCopy(requestFitSummary(request, matches), matches.length),
    [request, matches],
  );

  /**
   * The fold never cuts a tied band (O8 review): topTieNote says "the first N answered equally
   * well — read them as a group", and slicing at five while the tied group is eight would tell
   * the reader to read three rows they cannot see. When the top band overruns the default
   * fold, the fold moves to the end of the band.
   */
  const visibleCount = useMemo(() => {
    if (!tieNote) return 5;
    const topBand = rankBands(request)[0];
    return Math.max(5, topBand ? topBand.clinicians.length : 5);
  }, [request, tieNote]);
  const shown = showAll ? matches : matches.slice(0, visibleCount);

  const personalizedMatch = useMemo(() => getPersonalizedMatch(clinician, request), [clinician, request]);
  /**
   * The evidence behind the pills, with provenance (O21). `matchEvidence` already carries the
   * phrase from the reader's OWN words that reached each facet (`matched`) — the ranking has
   * always known it; the page just never showed it. Quoting it back beside the closed-vocabulary
   * label is attribution, not templating: the reason sentence is still composed only from the
   * fixed set (W213), and the quote is visibly the reader's text, not the product's claim.
   */
  const profileEvidence = useMemo(() => matchEvidence(clinician, request), [clinician, request]);
  /**
   * The asks this clinician does NOT answer (O51) — the same needsFor read as the evidence
   * with the filter inverted, so the two lists partition what the reader asked and cannot
   * disagree with the ranking. Named here because a page that lists only the hits invites the
   * reader to assume the rest were hits too, which is the quiet dishonesty the console's
   * "Missed" column was built to prevent — for staff. The reader gets the same truth.
   */
  const profileMissed = useMemo(() => missedAsks(clinician, request), [clinician, request]);

  /**
   * O102: the other GP to hold this one against, and the table that compares them.
   *
   * THE PARTNER IS CHOSEN, NOT PICKED. A chooser would be a second decision on the screen
   * that exists to make the first one easier, so the comparison is with the NEIGHBOUR in the
   * order the reader is already reading — the one below, or the one above when this is the
   * last. That is the comparison somebody is actually making when they open a profile from a
   * list.
   */
  const compareWith = useMemo(() => {
    if (matches.length < 2) return null;
    return matches[matchIndex + 1] ?? matches[matchIndex - 1] ?? null;
  }, [matches, matchIndex]);

  /**
   * One row per ask the reader made, deduplicated by the closed-vocabulary label the row
   * renders. Membership comes from `matchEvidence` — the same evidence the RANKING scored —
   * so the table cannot tell a story the order disagrees with. Empty when the reader's words
   * reached nothing, which is what hides the control: a compare table with no rows would be
   * a claim of thoroughness with nothing behind it.
   */
  const compareRows: readonly CompareRow[] = useMemo(() => {
    if (!compareWith) return [];
    const declaredBy = (item: Clinician) =>
      new Set(matchEvidence(item, request).map((need) => need.label));
    const left = declaredBy(clinician);
    const right = declaredBy(compareWith);
    const seen = new Set<string>();
    const rows: CompareRow[] = [];
    for (const ask of needsFor(request)) {
      if (seen.has(ask.label)) continue;
      seen.add(ask.label);
      rows.push({ label: ask.label, left: left.has(ask.label), right: right.has(ask.label) });
    }
    return rows;
  }, [clinician, compareWith, request]);

  function startListening(language = speechLang) {
    // A second tap must not orphan a live recogniser (O12 RCA): without this, the first
    // session kept running with no handle — its handlers nulled the shared ref out from under
    // the new session, the stage-change cleanup found nothing to cancel, and the microphone
    // light stayed on over the typing screen. Cancel first, always.
    speech.current?.cancel();
    speech.current = null;
    setHeard("");
    setSpeechMessage(null);
    setSpeechRetryable(false);
    stopRequested.current = false;

    const session = startSpeech({
      onPartial: setHeard,
      onFinal: (text) => {
        // Only release the ref this session still owns — a stale handler from a replaced
        // session must not clobber its successor's handle (O12 RCA).
        if (speech.current === session) speech.current = null;
        // Nothing heard is not an error worth a red message; it is a reason to let somebody type.
        if (!text) {
          setStage("type");
          return;
        }
        setHeard(text);
        setDraft(text);
        /**
         * ONLY A FINISH THE PERSON ASKED FOR SEARCHES (O46). iOS Safari ends continuous
         * recognition on its own — after a pause, or seconds in — delivering a fragment. This
         * used to auto-submit that fragment, so a person mid-sentence landed on a results
         * screen headlined by half a word ("Cx.") with no idea why: the exact "press allow and
         * then it breaks" report. The review screen that once absorbed this was collapsed in
         * the minimalism round; its safety note lives on here — a browser-initiated end now
         * lands the words in the editable box instead, one tap from searching.
         */
        if (stopRequested.current) {
          findMatches(text);
          return;
        }
        setSpeechMessage("The microphone stopped on its own. What it heard is below — add to it, or search.");
        setStage("type");
      },
      onError: (error, raw) => {
        if (speech.current === session) speech.current = null;
        // A deliberate stop is not a failure to report.
        if (error === "aborted") return;
        // ?debug=1 appends the browser's raw error code for the founder's own phone (O18).
        // The Web Speech API's code is the only diagnostic it gives, and the production RCA
        // stalled for a day because "unknown" flattened it away. Patients never see this:
        // the default banner stays a plain sentence with no error-code language.
        const debug = new URLSearchParams(window.location.search).has("debug");
        setSpeechMessage(debug ? `${SPEECH_ERROR_COPY[error]} [${raw}]` : SPEECH_ERROR_COPY[error]);
        // O70: the raw code alone could not separate the iOS failure family (B2 in
        // docs/MIC-FAILURE-MODES.md), so the debug banner now carries the environment that
        // produced it — standalone flag, mic-permission state, secure context, language.
        // Appended when it resolves; patients never see any of this.
        if (debug) {
          void speechDebugFacts(language.tag).then((facts) =>
            setSpeechMessage(`${SPEECH_ERROR_COPY[error]} [${raw} | ${facts}]`),
          );
        }
        // O48: the permission-flavoured failures get their once-more as a button — see
        // `speechRetryable` above. The next tap carries the gesture WebKit wants.
        setSpeechRetryable(error === "service-not-allowed" || error === "not-allowed");
        setStage("type");
      },
    }, language.tag);

    // Unsupported browser, insecure origin, or a constructor that threw: go to typing AND say
    // why (O12 RCA) — the silent version was indistinguishable from a broken button, which is
    // exactly how it was reported.
    if (!session) {
      setSpeechMessage(SPEECH_UNAVAILABLE_COPY[speechUnavailable() ?? "unsupported"]);
      setStage("type");
      return;
    }

    speech.current = session;
    setStage("listening");
  }

  /** "Done" asks the recogniser to finish; the final transcript arrives through onFinal. */
  function finishListening() {
    if (speech.current) {
      stopRequested.current = true;
      speech.current.stop();
      return;
    }
    setStage("type");
  }

  function findMatches(value = request) {
    const nextRequest = value.trim() || archetype.request;
    setRequest(nextRequest);
    setMatches(rankCliniciansNear(nextRequest, origin));
    setMatchIndex(0);
    setShowAll(false);
    // Straight to the results. The sort is synchronous and already done; the screen that used to
    // sit here spent 4.25 seconds saying so.
    setStage("results");
  }

  function chooseClinician(selected: Clinician) {
    const index = matches.findIndex((item) => item.id === selected.id);
    if (index >= 0) setMatchIndex(index);
    setStage("profile");
  }

  function reset() {
    setStage("welcome");
    setDraft("");
    setRequest(archetype.request);
    setMatches(rankClinicians(archetype.request));
    setMatchIndex(0);
    setMatchDirection(1);
  }

  function cycleArchetype(direction: 1 | -1) {
    const nextIndex = (archetypeIndex + direction + careArchetypes.length) % careArchetypes.length;
    const nextArchetype = careArchetypes[nextIndex] ?? defaultArchetype;
    setArchetypeIndex(nextIndex);
    setRequest(nextArchetype.request);
    setDraft("");
    setMatches(rankClinicians(nextArchetype.request));
    setMatchIndex(0);
    setMatchDirection(direction);
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="care-app patient-v2" data-stage={stage}>
        <section className="care-shell" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>

        {stage === "welcome" && (
          <WelcomeStage
            key="welcome"
            draft={draft}
            setDraft={setDraft}
            reducedMotion={reducedMotion}
            onSearch={findMatches}
            onTalk={() => startListening()}
            onScenarios={() => {
              setAutoCycle(true);
              setStage("scenarios");
            }}
          />
        )}

        {stage === "scenarios" && (
          <ScenariosStage
            key="scenarios"
            archetype={archetype}
            archetypeIndex={archetypeIndex}
            matchDirection={matchDirection}
            onBack={() => setStage("welcome")}
            onCycle={(direction) => {
              setAutoCycle(false);
              cycleArchetype(direction);
            }}
            onTry={() => findMatches(archetype.request)}
          />
        )}

        {stage === "listening" && (
          <ListeningStage
            key="listening"
            heard={heard}
            reducedMotion={reducedMotion}
            speechLang={speechLang}
            onFinish={finishListening}
            onCancel={() => setStage("welcome")}
            onType={() => setStage("type")}
            onLanguage={(language) => {
              setSpeechLang(language);
              startListening(language);
            }}
          />
        )}

        {stage === "type" && (
          <TypeStage
            key="type"
            draft={draft}
            setDraft={setDraft}
            speechMessage={speechMessage}
            speechRetryable={speechRetryable}
            onRetryMic={() => startListening()}
            onBack={() => setStage("welcome")}
            onSearch={findMatches}
          />
        )}

        {stage === "results" && (
          <ResultsStage
            key="results"
            requestHeadline={requestHeadline}
            requestSummary={requestSummary}
            quality={quality}
            tieNote={tieNote}
            clarifierList={clarifierList}
            unserved={unserved}
            fitCopy={fitCopy}
            place={place}
            origin={origin}
            matches={matches}
            shown={shown}
            allSignals={allSignals}
            request={request}
            reducedMotion={reducedMotion}
            onReset={reset}
            onRefine={() => {
              setDraft(request);
              setStage("type");
            }}
            onPlaceChange={(value) => {
              setPlace(value);
              setMatches(rankCliniciansNear(request, resolvePlace(value)));
            }}
            onClarify={(answer) => {
              const next = `${request}, ${answer}`;
              setRequest(next);
              setMatches(rankCliniciansNear(next, origin));
            }}
            onShowAll={() => setShowAll(true)}
            onChoose={chooseClinician}
          />
        )}

        {stage === "profile" && (
          <ProfileStage
            key="profile"
            clinician={clinician}
            personalizedSignals={personalizedMatch.signals}
            profileEvidence={profileEvidence}
            profileMissed={profileMissed}
            request={request}
            origin={origin}
            compareName={compareRows.length > 0 && compareWith ? compareWith.shortName : null}
            onBack={() => setStage("results")}
            onCompare={() => setStage("compare")}
            onBook={() => setStage("booking")}
          />
        )}

        {stage === "compare" && compareWith && (
          <CompareStage
            key="compare"
            left={clinician}
            right={compareWith}
            rows={compareRows}
            onBack={() => setStage("results")}
            onOpenRight={() => {
              chooseClinician(compareWith);
            }}
          />
        )}

        {stage === "booking" && (
          <BookingStage key="booking" clinician={clinician} onBack={() => setStage("profile")} />
        )}

          </AnimatePresence>
        </section>
      </main>
    </MotionConfig>
  );
}
