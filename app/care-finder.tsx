"use client";

import { AnimatePresence, MotionConfig, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { careArchetypes } from "@/demo/care-archetypes";
import {
  clinicians,
  getPersonalizedMatch,
  matchEvidence,
  matchQuality,
  needsFor,
  rankBands,
  rankCliniciansNear,
  requestFitCopy,
  requestFitSummary,
  topTieNote,
  unservedAsks,
  missedAsks,
  nearestKm,
  type Clinician,
} from "@/demo/clinicians";
import { rosterFor } from "@/demo/synthetic-roster";
import { clarifiers } from "@/matching/clarify";
import { resolvePlace, type SuburbPoint } from "@/geo/suburbs";
import {
  DEFAULT_SPEECH_LANGUAGE,
  dropCarriedStream,
  LISTENING_TIMEOUT_MS,
  speechDebugFacts,
  speechUnavailable,
  startSpeech,
  type SpeechLanguage,
  type SpeechSession,
} from "@/voice/speech";
import { NO_BANNER, speechBanner } from "@/finder/speech-banner";
import {
  activeFilterCount,
  applyFilters,
  describeFilters,
  emptyFilters,
  readFilters,
  writeFilters,
  type Filters,
} from "@/finder/filters";
import { AppTabs } from "./app-tabs";
import { useFinderHistory } from "./finder-history";
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
 *
 * U8: the state machine is still here — which stage follows which — but WHERE a stage lives is
 * `src/finder/state.ts`'s: a history entry per stage, the words in the tab, `place` in the URL.
 * `useFinderHistory` is the wiring: `goTo` for a forward move, `backTo` for an in-app Back, and
 * the browser's own Back, Forward and reload arrive as stage changes this file never sees.
 */

const defaultArchetype = careArchetypes[0]!;
const exampleRequest = defaultArchetype.request;

export function CareFinder() {
  const [archetypeIndex, setArchetypeIndex] = useState(0);
  // The scenario browser rotates on its own until the visitor takes over.
  const [autoCycle, setAutoCycle] = useState(true);
  const reducedMotion = useReducedMotion();
  const [draft, setDraft] = useState("");
  const [request, setRequest] = useState(exampleRequest);
  /**
   * O217 (founder decision `synthetic-roster-tickbox`): whether the ranking includes the
   * invented example profiles. Default OFF — the real roster is the product; the personas are
   * an explicit opt-in for testing, and every derived read (quality, bands, tie notes, the
   * compare table) threads the SAME roster so no sentence on the screen describes a list the
   * ranking did not run over.
   */
  /** O226 (founder-amended): the example roster ships ON — this is a testing deployment, and the
   * switch (relocated to the welcome screen's folded testing options) is the way OFF. */
  const [includeSynthetic, setIncludeSynthetic] = useState(true);
  /**
   * O234: the device's filters (`src/finder/filters.ts`), read on arrival and applied to the roster
   * BEFORE ranking — a filter narrows, the sentence orders, and every derived read below threads the
   * same narrowed roster, so no sentence on the screen describes a list the ranking did not run over.
   */
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [matchIndex, setMatchIndex] = useState(0);
  const [matchDirection, setMatchDirection] = useState<1 | -1>(1);
  // Speech state. `heard` is the live transcript, so the screen shows words as they arrive; that
  // is the only reliable signal to somebody that the microphone is actually working.
  // Where the person says they are. A typed suburb or postcode, never the device's location: no
  // permission prompt, and no coordinate leaves the browser. U8: it arrives on the URL (the one
  // thing an address carries) and is read at arrival, before the first paint.
  const [place, setPlace] = useState("");
  const origin: SuburbPoint | null = useMemo(() => resolvePlace(place), [place]);
  const roster = useMemo(
    () => applyFilters(rosterFor(includeSynthetic), filters, origin, (c) => (origin ? nearestKm(c, origin) : null)),
    [includeSynthetic, filters, origin],
  );
  const { stage, arrivalKey, goTo, backTo, remember, rememberPlace } = useFinderHistory((arrival) => {
    // O234: the filters the device holds, and the place it holds when the address bar carries
    // none — a search started from the front door reads back what the profile set. A place on
    // the URL still wins: a link that carries a suburb must re-rank the way the link says.
    const held = readFilters(window.localStorage);
    setFilters(held);
    const arrivedPlace = arrival.place || held.place;
    setPlace(arrivedPlace);
    if (!arrival.place && held.place) rememberPlace(held.place);
    debug.current = arrival.debug;
    arrivalStage.current = arrival.resumed ? arrival.stage : "welcome";
    if (!arrival.resumed) return;
    // A resumed tab: its words and its chosen match. The match is found by id in the ranking the
    // restored words produce — the same expression `matches` derives from, over the roster this
    // mount starts with.
    const { record } = arrival;
    const words = record.request || exampleRequest;
    setRequest(words);
    setDraft(record.draft);
    const resumedOrigin = resolvePlace(arrivedPlace);
    const resumedRoster = applyFilters(rosterFor(includeSynthetic), held, resumedOrigin, (c) => (resumedOrigin ? nearestKm(c, resumedOrigin) : null));
    const found = rankCliniciansNear(words, resumedOrigin, resumedRoster).findIndex((item) => item.id === record.matchId);
    setMatchIndex(Math.max(0, found));
  });
  /**
   * O224: DERIVED, NOT SET. `matches` is fully determined by (request, origin, roster); it was
   * imperative state with EIGHT setter sites, each recomputing the rank by hand — the O222
   * stale-roster hazard in the tickbox handler existed only because of that shape, and the seam
   * pin polices call sites that a derivation simply does not have. `rankCliniciansNear` with a
   * null origin IS `rankClinicians`, so one expression covers every former site; the scenarios
   * stage never displays matches, so its priming setters carried no behavior at all.
   */
  const matches = useMemo(() => rankCliniciansNear(request, origin, roster), [request, origin, roster]);
  // Round 2: sixteen near-identical rows is the "long list" anti-pattern. Five is enough to choose
  // from, and the rest are one tap away for somebody who wants to read all of them.
  const [showAll, setShowAll] = useState(false);
  const [heard, setHeard] = useState("");
  /**
   * U10: the sentence over the typing screen's box and whether a retry control stands beside it,
   * as one reducer (`speech-banner.ts`) fed events from the microphone's lifecycle below — and
   * `cleared` from EVERY route off the typing screen, which is the U10 fix: two setters used to
   * be cleared from `startListening` alone, so a block message outlived the words it was about.
   * O48: the permission failure's way back is a BUTTON, not a sentence. WebKit only starts
   * recognition from a screen tap, so the O18 auto-retry that runs after the Allow dialog can
   * be refused no matter what the module does — the recovery that actually works on an iPhone
   * is the person tapping again, with permission now granted. The copy said "try once more";
   * this renders the once-more as a control beside it.
   */
  const [banner, dispatchBanner] = useReducer(speechBanner, NO_BANNER);
  /** U10: `?debug=1` as it arrived (O18, the founder's phone) — held here, never re-read from a URL a place edit rewrites. */
  const debug = useRef(false);
  /**
   * U10: the listening timeout. A recogniser that hears nothing for a minute is ended THROUGH
   * `stop()`, the same path as the person's own tap, so whatever it held arrives in `onFinal`;
   * `timedOut` tells that handler which end it was, and the timer is keyed to its session so a
   * restart or a cancel never stops a later one.
   */
  const listenTimer = useRef<number | null>(null);
  const timedOut = useRef(false);
  function clearListenTimer() {
    if (listenTimer.current !== null) window.clearTimeout(listenTimer.current);
    listenTimer.current = null;
  }
  /**
   * O59 (Standing debt 4): which language the microphone listens in. Default English (AU),
   * as it always was; the alternatives are exactly the languages the listed GPs declare
   * (`SPEECH_LANGUAGES` states the basis). Choosing one restarts listening in it, and while a
   * non-English language is active the honesty line renders — matching reads English for now.
   */
  const [speechLang, setSpeechLang] = useState(DEFAULT_SPEECH_LANGUAGE);
  const speech = useRef<SpeechSession | null>(null);
  /** True only between the microphone tap and its onFinal — the person asked for the finish. */
  const stopRequested = useRef(false);
  /**
   * U9: what the screen says about the microphone, as state the stages can announce. `finishing`
   * is the same window as `stopRequested`, rendered: the one microphone control shows it as
   * `aria-busy` and a caption. `restartedIn` is the language a restart was asked for, so the
   * listening screen's live region says which one, and `micStopped` is whether the typing screen
   * was reached from the microphone — by the person, by an error or by the browser ending the
   * session — so its line says "Listening stopped" rather than an instruction to type.
   */
  const [finishing, setFinishing] = useState(false);
  const [restartedIn, setRestartedIn] = useState<SpeechLanguage | null>(null);
  const [micStopped, setMicStopped] = useState(false);
  /**
   * U9: focus follows a stage change the person made — never the page's own arrival. The stage
   * the finder arrived at (the server's welcome, or a resumed reload's stage) is recorded by the
   * arrival callback; the first stage that differs from it is a move, and from then on every
   * stage — the arrival stage included, when returned to — takes focus on mount.
   */
  const arrivalStage = useRef<Stage>("welcome");
  const moved = useRef(false);

  const archetype = careArchetypes[archetypeIndex] ?? defaultArchetype;
  const clinician = matches[matchIndex] ?? clinicians[0]!;

  const focusOnArrival = moved.current || stage !== arrivalStage.current;
  useEffect(() => {
    if (stage !== arrivalStage.current) moved.current = true;
  }, [stage]);

  // Stop the microphone whenever this screen is left, by any route: the X, a stage change, an
  // unmount. A recogniser left running after its screen is gone keeps the mic light on, which is
  // alarming and correct to be alarmed by.
  useEffect(() => {
    if (stage === "listening") return;
    speech.current?.cancel();
    speech.current = null;
    clearListenTimer();
    setFinishing(false);
  }, [stage]);

  // U9: leaving the listening screen, by any route, is the microphone stopping. This cleanup runs
  // AFTER the stage has changed, so the two ways to the typing screen that do not pass through the
  // microphone clear it themselves at the moment of leaving: `startListening` (no session at all)
  // and the results screen's "Change what you said" (below).
  useEffect(() => {
    if (stage !== "listening") return;
    return () => setMicStopped(true);
  }, [stage]);

  // O69: leaving the finder also drops any stream a failed session is carrying for the
  // recovery tap — the mic light must not outlive the screen the retry button lives on.
  useEffect(() => () => {
    speech.current?.cancel();
    clearListenTimer();
    dropCarriedStream();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stage]);

  // The words are the tab's the moment they exist, not only on a move — a reload mid-sentence on
  // the typing screen keeps the sentence. Nothing here reaches the URL or a history entry.
  useEffect(() => {
    remember({ request, draft, matchId: clinician.id });
  }, [remember, request, draft, clinician.id]);

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
  /** O222: ONE pass — the rows index into this instead of re-running the lexicon per row,
   * and the roster threads through so the printed reasons derive from the ranked roster. */
  const allMatches = useMemo(
    () => matches.map((item) => getPersonalizedMatch(item, request, roster)),
    [matches, request, roster],
  );
  const allSignals = useMemo(() => allMatches.map((m) => m.signals), [allMatches]);
  /**
   * ONE PIPELINE RUN PER RENDER (O8 review). These four were each computed inline in the JSX,
   * some more than once, and every call re-runs the full lexicon read over the request — a
   * dozen redundant scans per keystroke once the geo field re-renders the results stage.
   */
  const quality = useMemo(() => matchQuality(request, roster), [request, roster]);
  const tieNote = useMemo(() => topTieNote(request, roster), [request, roster]);
  /** Read only when a tie exists — unconditional, this would ADD a rankBands run to the common
   * no-tie render; conditional, it matches the old cost exactly with the derivation named. */
  const bands = useMemo(() => (tieNote ? rankBands(request, roster) : []), [tieNote, request, roster]);
  const clarifierList = useMemo(() => clarifiers(request, matches), [request, matches]);
  const unserved = useMemo(() => unservedAsks(request, roster), [request, roster]);
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
    const topBand = bands[0];
    return Math.max(5, topBand ? topBand.clinicians.length : 5);
  }, [tieNote, bands]);
  const shown = showAll ? matches : matches.slice(0, visibleCount);

  const personalizedMatch = useMemo(() => getPersonalizedMatch(clinician, request, roster), [clinician, request, roster]);
  /**
   * The evidence behind the pills, with provenance (O21). `matchEvidence` already carries the
   * phrase from the reader's OWN words that reached each facet (`matched`) — the ranking has
   * always known it; the page just never showed it. Quoting it back beside the closed-vocabulary
   * label is attribution, not templating: the reason sentence is still composed only from the
   * fixed set (W213), and the quote is visibly the reader's text, not the product's claim.
   */
  // O222 (review finding): these two were NOT threaded, so with the tickbox on the profile's
  // evidence and its "does not answer" list ran over the 2-entry real roster while the ranking
  // ran over 22 — exactly what the comment on `roster` above promises cannot happen. The
  // call-site pin in engine-seam.test.ts now refuses a defaulted roster read in this file.
  const profileEvidence = useMemo(() => matchEvidence(clinician, request, roster), [clinician, request, roster]);
  /**
   * The asks this clinician does NOT answer (O51) — the same needsFor read as the evidence
   * with the filter inverted, so the two lists partition what the reader asked and cannot
   * disagree with the ranking. Named here because a page that lists only the hits invites the
   * reader to assume the rest were hits too, which is the quiet dishonesty the console's
   * "Missed" column was built to prevent — for staff. The reader gets the same truth.
   */
  const profileMissed = useMemo(() => missedAsks(clinician, request, roster), [clinician, request, roster]);

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
      new Set(matchEvidence(item, request, roster).map((need) => need.label));
    const left = declaredBy(clinician);
    const right = declaredBy(compareWith);
    const seen = new Set<string>();
    const rows: CompareRow[] = [];
    for (const ask of needsFor(request, roster)) {
      if (seen.has(ask.label)) continue;
      seen.add(ask.label);
      rows.push({ label: ask.label, left: left.has(ask.label), right: right.has(ask.label) });
    }
    return rows;
  }, [clinician, compareWith, request, roster]);

  /** @param restarted U9: a language change on the listening screen, which the live region names. */
  function startListening(language = speechLang, restarted = false) {
    // A second tap must not orphan a live recogniser (O12 RCA): without this, the first
    // session kept running with no handle — its handlers nulled the shared ref out from under
    // the new session, the stage-change cleanup found nothing to cancel, and the microphone
    // light stayed on over the typing screen. Cancel first, always.
    speech.current?.cancel();
    speech.current = null;
    clearListenTimer();
    timedOut.current = false;
    setHeard("");
    dispatchBanner({ type: "cleared" });
    stopRequested.current = false;
    setFinishing(false);
    setRestartedIn(restarted ? language : null);
    setMicStopped(false);

    const session = startSpeech({
      onPartial: setHeard,
      onFinal: (text) => {
        // Only release the ref this session still owns — a stale handler from a replaced
        // session must not clobber its successor's handle (O12 RCA).
        if (speech.current === session) speech.current = null;
        clearListenTimer();
        // Nothing heard is not an error worth a red message; it is a reason to let somebody type.
        // U10: unless it was a full minute of nothing — then the banner says so, still not as
        // an error (no retry control, no debug suffix), and the box is one tap from the mic.
        if (!text) {
          dispatchBanner({ type: "ended", text: "", timedOut: timedOut.current });
          goTo("type");
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
        dispatchBanner({ type: "ended", text, timedOut: timedOut.current });
        goTo("type");
      },
      onError: (error, raw) => {
        if (speech.current === session) speech.current = null;
        clearListenTimer();
        // A deliberate stop is not a failure to report.
        if (error === "aborted") return;
        // ?debug=1 appends the browser's raw error code for the founder's own phone (O18).
        // The Web Speech API's code is the only diagnostic it gives, and the production RCA
        // stalled for a day because "unknown" flattened it away. Patients never see this:
        // the default banner stays a plain sentence with no error-code language. U10: the flag
        // is the arrival's (`debug`), not the address bar's — a place edit rewrites that.
        dispatchBanner({ type: "failed", error, raw, debug: debug.current });
        // O70: the raw code alone could not separate the iOS failure family (B2 in
        // docs/MIC-FAILURE-MODES.md), so the debug banner now carries the environment that
        // produced it — standalone flag, mic-permission state, secure context, language.
        // Appended when it resolves, onto the banner it belongs to; patients never see any of this.
        if (debug.current) {
          void speechDebugFacts(language.tag).then((facts) => dispatchBanner({ type: "facts", error, raw, facts }));
        }
        // O48: the permission-flavoured failures get their once-more as a button (the reducer
        // decides which). The next tap carries the gesture WebKit wants.
        goTo("type");
      },
    }, language.tag);

    // Unsupported browser, insecure origin, or a constructor that threw: go to typing AND say
    // why (O12 RCA) — the silent version was indistinguishable from a broken button, which is
    // exactly how it was reported.
    if (!session) {
      dispatchBanner({ type: "unavailable", reason: speechUnavailable() ?? "unsupported" });
      goTo("type");
      return;
    }

    speech.current = session;
    goTo("listening");
    // U10: a minute of listening is the ceiling. Ended through `stop()` — the person's own path
    // — so words in hand arrive via `onFinal` and land in the box; nothing ever reaches `onError`.
    listenTimer.current = window.setTimeout(() => {
      listenTimer.current = null;
      if (speech.current !== session) return;
      timedOut.current = true;
      session.stop();
    }, LISTENING_TIMEOUT_MS);
  }

  /**
   * The microphone control, tapped while listening, asks the recogniser to finish; the final
   * transcript arrives through onFinal. U9: one control, not two — it was a "Done" button beside
   * a decorative mic; now the mic is the toggle (`aria-pressed`) and shows the finish it is
   * waiting on (`aria-busy`, "Finishing…"). It stays enabled through that window: a second tap
   * asks again, so a recogniser that never delivers cannot leave the person stuck.
   */
  function finishListening() {
    if (speech.current) {
      stopRequested.current = true;
      setFinishing(true);
      speech.current.stop();
      return;
    }
    goTo("type");
  }

  function findMatches(value = request) {
    const nextRequest = value.trim() || archetype.request;
    setRequest(nextRequest);
    setMatchIndex(0);
    setShowAll(false);
    // U10: the typing screen is being left — its banner does not follow the person to results.
    dispatchBanner({ type: "cleared" });
    // Straight to the results. The sort is synchronous and already done; the screen that used to
    // sit here spent 4.25 seconds saying so.
    goTo("results");
  }

  function chooseClinician(selected: Clinician) {
    const index = matches.findIndex((item) => item.id === selected.id);
    if (index >= 0) setMatchIndex(index);
    goTo("profile");
  }

  function reset() {
    backTo("welcome");
    setDraft("");
    setRequest(archetype.request);
    setMatchIndex(0);
    setMatchDirection(1);
    dispatchBanner({ type: "cleared" });
  }

  /**
   * O217: the tickbox's own handler — re-ranks in place with the roster the choice implies, the
   * same shape as a suburb edit or a clarifier answer: the list changes where the reader is
   * looking, nobody is sent back a step.
   */
  function toggleSynthetic(next: boolean) {
    setIncludeSynthetic(next);
    // The list re-ranks by derivation the moment the state lands — the stale-state hazard this
    // handler used to work around is gone with the setter.
    setMatchIndex(0);
    setShowAll(false);
  }

  /** O234: the place the person types on the results screen is the profile's place too. */
  function changePlace(value: string) {
    setPlace(value);
    rememberPlace(value);
    setFilters((current) => {
      const next = { ...current, place: value };
      writeFilters(window.localStorage, next);
      return next;
    });
    setMatchIndex(0);
  }

  /** O234: every narrowing filter off, the place kept — it orders, it never excluded anybody. */
  function clearNarrowingFilters() {
    const next: Filters = { ...emptyFilters(), place: filters.place };
    writeFilters(window.localStorage, next);
    setFilters(next);
    setMatchIndex(0);
    setShowAll(false);
  }

  function cycleArchetype(direction: 1 | -1) {
    const nextIndex = (archetypeIndex + direction + careArchetypes.length) % careArchetypes.length;
    const nextArchetype = careArchetypes[nextIndex] ?? defaultArchetype;
    setArchetypeIndex(nextIndex);
    setRequest(nextArchetype.request);
    setDraft("");
    setMatchIndex(0);
    setMatchDirection(direction);
  }

  /**
   * O230: the tab bar belongs to the app's ROOT surfaces, and a native push hides it — the same
   * rule every phone-shaped health app follows, because a person part-way through one task should
   * not be one mis-tap from losing it. Welcome and results are where somebody is choosing what to
   * do; everything else is inside a task with its own way back, and the booking screen already
   * owns the bottom edge with a fixed bar of its own.
   */
  const tabsHidden = stage !== "welcome" && stage !== "results";

  return (
    <MotionConfig reducedMotion="user">
      <main
        id="main-content"
        className="care-app patient-v2"
        data-stage={stage}
        data-tabs={tabsHidden ? "hidden" : "visible"}
      >
        {/* U9: no live region here. The shell used to be `aria-live="polite"`, so every stage
            change read the whole new screen aloud; each stage now owns one `role="status"` line
            (`StatusLine`) scripted in `src/finder/announce.ts`. */}
        <section className="care-shell">
          <AnimatePresence key={arrivalKey} mode="wait" initial={false}>

        {stage === "welcome" && (
          <WelcomeStage
            key="welcome"
            focusOnArrival={focusOnArrival}
            draft={draft}
            setDraft={setDraft}
            reducedMotion={reducedMotion}
            onSearch={findMatches}
            includeSynthetic={includeSynthetic}
            onToggleSynthetic={toggleSynthetic}
            onTalk={() => startListening()}
            onScenarios={() => {
              setAutoCycle(true);
              goTo("scenarios");
            }}
          />
        )}

        {stage === "scenarios" && (
          <ScenariosStage
            key="scenarios"
            focusOnArrival={focusOnArrival}
            archetype={archetype}
            archetypeIndex={archetypeIndex}
            matchDirection={matchDirection}
            onBack={() => backTo("welcome")}
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
            focusOnArrival={focusOnArrival}
            heard={heard}
            finishing={finishing}
            restartedIn={restartedIn}
            reducedMotion={reducedMotion}
            speechLang={speechLang}
            onFinish={finishListening}
            onCancel={() => backTo("welcome")}
            onType={() => goTo("type")}
            onLanguage={(language) => {
              setSpeechLang(language);
              startListening(language, true);
            }}
          />
        )}

        {stage === "type" && (
          <TypeStage
            key="type"
            focusOnArrival={focusOnArrival}
            micStopped={micStopped}
            draft={draft}
            setDraft={setDraft}
            speechMessage={banner.message}
            speechRetryable={banner.retryable}
            onRetryMic={() => startListening()}
            onBack={() => backTo("welcome")}
            onSearch={findMatches}
          />
        )}

        {stage === "results" && (
          <ResultsStage
            key="results"
            focusOnArrival={focusOnArrival}
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
            personalized={allMatches}
            allSignals={allSignals}
            request={request}
            reducedMotion={reducedMotion}
            onReset={reset}
            onRefine={() => {
              setDraft(request);
              setMicStopped(false);
              // U10: back to the box with its words — never with the last microphone message.
              dispatchBanner({ type: "cleared" });
              goTo("type");
            }}
            onPlaceChange={changePlace}
            filterLabels={activeFilterCount(filters) > 0 ? describeFilters(filters) : []}
            onClearFilters={clearNarrowingFilters}
            onClarify={(answer) => setRequest(`${request}, ${answer}`)}
            onShowAll={() => setShowAll(true)}
            onChoose={chooseClinician}
          />
        )}

        {stage === "profile" && (
          <ProfileStage
            key="profile"
            focusOnArrival={focusOnArrival}
            clinician={clinician}
            personalizedSignals={personalizedMatch.signals}
            profileEvidence={profileEvidence}
            profileMissed={profileMissed}
            request={request}
            origin={origin}
            compareName={compareRows.length > 0 && compareWith ? compareWith.shortName : null}
            onBack={() => backTo("results")}
            onCompare={() => goTo("compare")}
            onBook={() => goTo("booking")}
          />
        )}

        {stage === "compare" && compareWith && (
          <CompareStage
            key="compare"
            focusOnArrival={focusOnArrival}
            left={clinician}
            right={compareWith}
            rows={compareRows}
            onBack={() => backTo("results")}
            onOpenRight={() => {
              chooseClinician(compareWith);
            }}
          />
        )}

        {stage === "booking" && (
          <BookingStage
            key="booking"
            focusOnArrival={focusOnArrival}
            clinician={clinician}
            onBack={() => backTo("profile")}
          />
        )}

          </AnimatePresence>
        </section>
      </main>
      <AppTabs hidden={tabsHidden} />
    </MotionConfig>
  );
}
