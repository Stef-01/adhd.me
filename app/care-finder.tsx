"use client";

import { carePreferencesFromRequest, combineCarePreferences } from "@/support/care-preferences";
import { AnimatePresence, MotionConfig, useReducedMotion } from "motion/react";
import { StageDirection } from "./finder-stages/shared";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { careArchetypes } from "@/demo/care-archetypes";
import {
  clinicians,
  getPersonalizedMatch,
  matchEvidence,
  matchQuality,
  orderNote,
  rankBands,
  rankCliniciansNear,
  scoreAgainst,
  topTieNote,
  missedAsks,
  type Clinician,
  type Demonstrated,
} from "@/demo/clinicians";
import { profession, professionsMentioned, type Profession } from "@/support/professions";
import { fitLabels, fitReason, orderByProblemFit, strengthReason } from "@/support/problem-fit";
import { deviceLearningStorage } from "@/learn/cursor";
import { readModel } from "@/model/store";
import { topNeed, type Need } from "@/model/needs";
import { careKindsFor, searchRoster, waysOut as waysOutOf, type WayOut } from "@/finder/pipeline";
import { clarifiers } from "@/matching/clarify";
import { facetKey, shortLabel } from "@/matching/needs";
import { checkSafety } from "@/model/safety";
import { firstSteps } from "@/finder/first-steps";
import { heardChips } from "@/finder/heard";
import { FINDER_COPY } from "./finder-copy";
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
  describeFilters,
  emptyFilters,
  readFilters,
  type BooleanFilterKey,
  writeFilters,
  type Filters,
} from "@/finder/filters";
import { useFinderHistory } from "./finder-history";
import { getRequestHeadline, type Stage } from "./finder-stages/shared";
import { WelcomeStage } from "./finder-stages/welcome-stage";
import { ListeningStage } from "./finder-stages/listening-stage";
import { VoiceStage } from "./finder-stages/voice-stage";
import { useFinderMode, useModelRead, useWhyMatched } from "./finder-read";
import { loadClips } from "@/voice/clips";
import { fakeVoice, startLink } from "@/voice/link";
import { handOff, newId, track, trackSearch, trackVoiceCall } from "@/finder/track";
import type { EventKind, SearchSource } from "@/db/finder";
import type { CallSummary } from "./finder-stages/voice-stage";
import type { Reveal } from "@/voice/conversation";
import { TypeStage } from "./finder-stages/type-stage";
import { ResultsStage } from "./finder-stages/results-stage";
import { ProfileStage } from "./finder-stages/profile-stage";
import { CompareStage, type CompareRow } from "./finder-stages/compare-stage";
import { BookingStage } from "./finder-stages/booking-stage";

/** The most words of a request the results card prints (O260): the screen holds 60 in all. */
const SUMMARY_WORDS = 20;

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
/** What `/api/finder/weights` serves, and the request whose list was on screen when it landed. */
type Taught = { weights: Record<string, number>; quality: Demonstrated; heldFor: string | null };
const UNTAUGHT: Taught = { weights: {}, quality: {}, heldFor: null };
/** The stages that show no list. */
const LISTLESS: ReadonlySet<Stage> = new Set(["welcome", "listening", "voice", "type"]);

/**
 * @param readLevel `ADHDME_LLM_LEVEL` in effect (LLM-MATCHING-PLAN §15): at 0 the finder reads the words itself and asks nothing.
 * @param voice `ADHDME_VOICE` in effect: the microphone opens the voice finder (src/voice) rather than dictation.
 */
export function CareFinder({ readLevel = 0, voice = false }: { readLevel?: number; voice?: boolean }) {
  const reducedMotion = useReducedMotion();
  const { mode, chooseMode, level, talks } = useFinderMode(readLevel, voice);
  // The sentences the voice finder says are fetched while the welcome screen is read, so the first
  // is played the moment the microphone opens (O263).
  useEffect(() => {
    if (talks) void loadClips();
  }, [talks]);
  const [draft, setDraft] = useState("");
  const [request, setRequest] = useState(exampleRequest);
  /**
   * O234: the device's filters (`src/finder/filters.ts`), read on arrival and applied to the roster
   * BEFORE ranking — a filter narrows, the sentence orders, and every derived read below threads the
   * same narrowed roster, so no sentence on the screen describes a list the ranking did not run over.
   */
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [clearedCareRequest, setClearedCareRequest] = useState<string | null>(null);
  /** The care asks the sentence itself carries ("autism", "an Aboriginal clinician"), unless Clear dropped them. */
  const requestCare = useMemo(() => (clearedCareRequest === request ? {} : carePreferencesFromRequest(request)), [request, clearedCareRequest]);
  /** The held set plus the sentence's own care asks: the set every roster below runs over. */
  const withRequestCare = useCallback((held: Filters): Filters => ({ ...held, ...combineCarePreferences(held, requestCare) }), [requestCare]);
  const effectiveFilters = useMemo(() => withRequestCare(filters), [filters, withRequestCare]);
  const [matchIndex, setMatchIndex] = useState(0);
  // Speech state. `heard` is the live transcript, so the screen shows words as they arrive; that
  // is the only reliable signal to somebody that the microphone is actually working.
  // Where the person says they are. A typed suburb or postcode, never the device's location: no
  // permission prompt, and no coordinate leaves the browser. U8: it arrives on the URL (the one
  // thing an address carries) and is read at arrival, before the first paint.
  const [place, setPlace] = useState("");
  const origin: SuburbPoint | null = useMemo(() => resolvePlace(place), [place]);
  /**
   * The roster this search runs over: every filter, then the kind the sentence names (PRD §38,
   * "a psychologist near Beecroft"). One pure reading in `src/finder/pipeline.ts`, shared with
   * the tests that hold every chip to the engine. Every derived read below threads THIS roster,
   * so no sentence describes a list the ranking did not run over.
   */
  const roster = useMemo(() => searchRoster(clinicians, effectiveFilters, request, origin), [effectiveFilters, request, origin]);
  /**
   * THE KINDS OF CARE THIS SEARCH REACHES (Charmaine Bernie, occupational therapist and
   * service-access researcher, 2026-09-11). She named identification and navigation — "helping
   * people work out what they actually need and how to access it" — as one of the two core
   * drivers of the problem, and the cost of getting it wrong as years on the wrong waitlist.
   * The finder was answering a different question: it returned one undifferentiated list, mostly
   * GPs, with a profession printed small on the few rows that were not. A person could not see
   * that a psychologist, an occupational therapist and a coach were all in the answer, so they
   * could not choose between them, which is the choice the whole problem turns on.
   *
   * So the kinds are the band above the list: every profession this search actually reaches, in
   * the order the person's own words point at, each one a filter. Counted BEFORE the profession
   * filter is applied — a band that collapsed to the kind you just picked would be a dead end —
   * and off the SAME filters the list runs over (the held set plus the sentence's own care asks:
   * counted off the held set alone, "autism" offered "GPs · 20" and picking it emptied the
   * screen), so every kind here leads to exactly the list it counts. Nothing is invented: the
   * professions are the roster's own, and the order is the person's words first, then how many
   * of each the search found. `careKindsFor` in `src/finder/pipeline.ts` is the reading.
   */
  const careKinds = useMemo(() => careKindsFor(clinicians, effectiveFilters, request, origin), [effectiveFilters, request, origin]);
  const { stage, arrivalKey, direction, goTo, backTo, remember, rememberPlace } = useFinderHistory((arrival) => {
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
    const resumedRoster = searchRoster(clinicians, { ...held, ...combineCarePreferences(held, carePreferencesFromRequest(words)) }, words, resumedOrigin);
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
  /**
   * Problem fit (PRD §42): what the personal model has learned about this person — read on the
   * client, after mount, like every device fact — reorders the ALLIED entries among themselves by
   * how their declared expertise answers the top need. GPs stay where the engine ranked them.
   */
  const [need, setNeed] = useState<Need | null>(null);
  useEffect(() => { setNeed(topNeed(readModel(deviceLearningStorage))); }, []);
  /**
   * "What we heard" (LLM-MATCHING-PLAN §15): the read the ranking runs on, its strongest facets as
   * chips, and the ones the person took out, which last until the words change. With none taken
   * out the list is exactly the one it always was; with some, `rankClinicians` ranks on the rest,
   * in the browser, without a request.
   */
  const [removedHeard, setRemovedHeard] = useState<{ request: string; keys: readonly string[] }>({ request: "", keys: [] });
  const removed = useMemo(() => new Set(removedHeard.request === request ? removedHeard.keys : []), [removedHeard, request]);
  const { reading, modelNeeds, heard: ownRead, unlisted, readAhead } = useModelRead(level, request, roster, stage === "results");
  const read = modelNeeds ?? ownRead;
  const heardFacets = useMemo(() => heardChips(read, FINDER_COPY.heardChip.max), [read]);
  /** Words that say someone may be in danger (src/model/safety.ts): the results lead with urgent help, as the voice finder does. */
  const danger = useMemo(() => { const rule = checkSafety(request); return rule !== null && rule.severity !== "support"; }, [request]);
  /** For a parent, three first steps above the list (src/finder/first-steps.ts); the list then opens on three rows. */
  const steps = useMemo(() => (reading ? null : firstSteps(heardFacets.map((chip) => chip.key).filter((key) => !removed.has(key)), request)), [reading, heardFacets, removed, request]);
  const kept = useMemo(() => read.filter((n) => !removed.has(facetKey(n.facet))), [read, removed]);
  /** A removed facet is no reason for a row or a profile either. */
  const removedLabels = useMemo(() => {
    const keptLabels = new Set(kept.map((n) => n.label));
    return new Set(read.filter((n) => removed.has(facetKey(n.facet)) && !keptLabels.has(n.label)).map((n) => n.label));
  }, [read, removed, kept]);
  /**
   * What the stars after visits have taught: a multiplier per ask (src/db/learn.ts) and one per
   * clinician for how their visits went (src/db/quality.ts, "demonstrated quality"). Bounded, never
   * shown, and with none the list is ranked exactly as it always was. They land just after the page
   * opens; a list already on screen then (a tab come back to) keeps its order, the next one takes them.
   */
  const [taught, setTaught] = useState<Taught>(UNTAUGHT);
  const listed = useRef<string | null>(null);
  useEffect(() => {
    listed.current = LISTLESS.has(stage) ? null : request;
  });
  useEffect(() => {
    fetch("/api/finder/weights")
      .then((reply) => (reply.ok ? (reply.json() as Promise<Partial<Taught>>) : null))
      .then((answer) => answer && setTaught({ weights: answer.weights ?? {}, quality: answer.quality ?? {}, heldFor: listed.current }))
      .catch(() => undefined);
  }, []);
  const live = taught.heldFor === request ? UNTAUGHT : taught;
  const askWeights = live.weights;
  const learned = useMemo(
    () => (kept.some((n) => askWeights[facetKey(n.facet)] !== undefined) ? kept.map((n) => ({ ...n, weight: n.weight * (askWeights[facetKey(n.facet)] ?? 1) })) : null),
    [kept, askWeights],
  );
  /** Undefined is the lexicon's own path, with its weighting, when nothing is taken out or learned. */
  const rankNeeds = learned ?? (removed.size === 0 && !modelNeeds ? undefined : kept);
  // The map reorders allied entries only among those level on the asks (problem-fit.ts, R15).
  const matches = useMemo(() => {
    const asked = rankNeeds ?? kept;
    return orderByProblemFit(rankCliniciansNear(request, origin, roster, undefined, rankNeeds, live.quality), need, (c) => scoreAgainst(c, asked));
  }, [request, origin, roster, need, rankNeeds, kept, live.quality]);
  const fitFor = useCallback((c: Clinician) => fitReason(c, need), [need]);
  // The matched tags, in the taxonomy's own order, capped at the three Calm Clarity allows in a
  // row. These are the person's own map read back to them.
  const tagsFor = useCallback((c: Clinician) => fitLabels(c, need).slice(0, 3), [need]);
  const strengthFor = useCallback((c: Clinician) => strengthReason(c, need), [need]);
  /**
   * The ways out of an empty list: each held filter that, dropped on its own, brings somebody
   * back, with the count the tap produces. Only the held set is offered one by one; the
   * sentence's own care asks go with "Clear the filters", as they always did.
   */
  const ways = useMemo<WayOut[]>(
    () => (matches.length > 0 ? [] : waysOutOf(clinicians, filters, request, origin, withRequestCare)),
    [matches.length, filters, request, origin, withRequestCare],
  );
  /** With nothing on, the kind the sentence named is what emptied the list, and the screen says which. */
  const emptyKind = useMemo(() => {
    if (matches.length > 0 || activeFilterCount(effectiveFilters) > 0) return null;
    const named = professionsMentioned(request);
    return named.length > 0 ? named.map((p) => profession(p).plural).join(" or ") : null;
  }, [matches.length, effectiveFilters, request]);
  // Round 2: sixteen near-identical rows is the "long list" anti-pattern. Five is enough to choose
  // from, and "N more" adds five at a time for somebody who wants to read on.
  const [more, setMore] = useState(0);
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

  // The request the finder falls back to when a search is empty; the scenarios stage that cycled
  // through the others is gone (PLAN.md W6b), and /examples keeps the long archetypes.
  const archetype = defaultArchetype;
  const clinician = matches[matchIndex] ?? clinicians[0]!;
  /** Why this clinician, in their own words: asked as the profile opens, shown under "Why matched". */
  const insights = useWhyMatched(level, request, stage === "profile" ? clinician.id : null);

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


  const requestSummary = useMemo(() => {
    const cleaned = request.trim().replace(/[.!?]+$/, "");
    if (!cleaned) return exampleRequest;
    // A spoken request is every answer the person gave (stage 2 of docs/matching/RCA-NIGHT-2026-09-29.md), and a
    // typed one can be a paragraph: the card shows the first SUMMARY_WORDS and "Change what you said" holds them all.
    const all = cleaned.split(/\s+/);
    const shown = all.length > SUMMARY_WORDS ? `${all.slice(0, SUMMARY_WORDS).join(" ")}…` : `${cleaned}.`;
    return `${shown.charAt(0).toUpperCase()}${shown.slice(1)}`;
  }, [request]);
  const requestHeadline = useMemo(
    () => request.trim() === archetype.request ? archetype.headline : getRequestHeadline(request, requestSummary),
    [archetype.headline, archetype.request, request, requestSummary],
  );
  /** A row names a facet in its chip's words: one fact, said the same way across one screen. */
  const chipWords = useMemo(() => new Map(read.map((n) => [n.label, shortLabel(n)])), [read]);
  /** O222: ONE pass — the rows index into this instead of re-running the lexicon per row,
   * and the roster threads through so the printed reasons derive from the ranked roster. */
  // O259: a manner trait is never a word on a row ("Making sense" sat on three rows for a plain-language ask).
  const mannerLabels = useMemo(() => new Set(read.filter((n) => n.facet.kind === "manner").map((n) => n.label)), [read]);
  const allMatches = useMemo(
    () => matches.map((item) => {
      const match = getPersonalizedMatch(item, request, roster, read);
      return { ...match, signals: match.signals.filter((s) => !removedLabels.has(s) && !mannerLabels.has(s)).map((s) => chipWords.get(s) ?? s) };
    }),
    [matches, request, roster, read, removedLabels, mannerLabels, chipWords],
  );
  /**
   * ONE PIPELINE RUN PER RENDER (O8 review). These four were each computed inline in the JSX,
   * some more than once, and every call re-runs the full lexicon read over the request — a
   * dozen redundant scans per keystroke once the geo field re-renders the results stage.
   */
  /* O259: the list claims "Matches" on what the person can see. A manner trait still orders the last tier, but
     with every visible chip out, or with nothing but manner read, the heading is the plain count and the
     clarifier asks a question that changes the list. */
  const quality = useMemo(() => {
    const asked = rankNeeds ?? kept;
    const visible = asked.filter((n) => n.facet.kind !== "manner");
    return visible.length === asked.length ? matchQuality(request, roster, rankNeeds) : matchQuality(request, roster, visible);
  }, [request, roster, rankNeeds, kept]);
  const tieNote = useMemo(() => topTieNote(request, roster), [request, roster]);
  /** Read only when a tie exists — unconditional, this would ADD a rankBands run to the common
   * no-tie render; conditional, it matches the old cost exactly with the derivation named. */
  const bands = useMemo(() => (tieNote ? rankBands(request, roster) : []), [tieNote, request, roster]);
  const clarifierList = useMemo(() => clarifiers(request, matches), [request, matches]);
  /**
   * Q4 "why this order": one sentence naming what produced the sequence, computed here with the
   * rest of the single pipeline pass rather than in the JSX. `nearest` is the same condition
   * `rankCliniciansNear` uses to reorder at all, so the distance clause and the distance sort
   * turn on together.
   */
  const orderCopy = useMemo(() => orderNote(request, roster, { nearest: origin !== null }), [request, roster, origin]);

  /**
   * The fold never cuts a tied band (O8 review): topTieNote says "the first N answered equally
   * well — read them as a group", and slicing at five while the tied group is eight would tell
   * the reader to read three rows they cannot see. When the top band overruns the default
   * fold, the fold moves to the end of the band.
   */
  const visibleCount = useMemo(() => {
    const fold = steps ? 3 : 5;
    if (!tieNote) return fold;
    const topBand = bands[0];
    return Math.max(fold, topBand ? topBand.clinicians.length : fold);
  }, [tieNote, bands, steps]);
  const shown = matches.slice(0, visibleCount + more);
  /** The signals of the rows the list opens on: one every one of them shares is no reason to pick between them. */
  const foldSignals = useMemo(() => allMatches.slice(0, visibleCount).map((m) => m.signals), [allMatches, visibleCount]);

  const personalizedMatch = useMemo(() => {
    const match = getPersonalizedMatch(clinician, request, roster, read);
    return { ...match, signals: match.signals.filter((s) => !removedLabels.has(s)) };
  }, [clinician, request, roster, read, removedLabels]);
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
  // O259: manner traits are read for the ranking's last tier and shown nowhere (founder, 2026-09-29).
  const profileEvidence = useMemo(() => matchEvidence(clinician, request, roster, read).filter((n) => n.facet.kind !== "manner" && !removed.has(facetKey(n.facet))), [clinician, request, roster, read, removed]);
  /**
   * The asks this clinician does NOT answer (O51) — the same needsFor read as the evidence
   * with the filter inverted, so the two lists partition what the reader asked and cannot
   * disagree with the ranking. Named here because a page that lists only the hits invites the
   * reader to assume the rest were hits too, which is the quiet dishonesty the console's
   * "Missed" column was built to prevent — for staff. The reader gets the same truth.
   */
  const profileMissed = useMemo(() => missedAsks(clinician, request, roster, read).filter((n) => n.facet.kind !== "manner" && !removed.has(facetKey(n.facet))), [clinician, request, roster, read, removed]);

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
      new Set(matchEvidence(item, request, roster, read).map((need) => need.label));
    const left = declaredBy(clinician);
    const right = declaredBy(compareWith);
    const seen = new Set<string>();
    const rows: CompareRow[] = [];
    for (const ask of kept) {
      if (seen.has(ask.label)) continue;
      seen.add(ask.label);
      rows.push({ label: ask.label, left: left.has(ask.label), right: right.has(ask.label) });
    }
    return rows;
  }, [clinician, compareWith, request, roster, read, kept]);

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
          findMatches(text, "dictation");
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

  function findMatches(value = request, source: SearchSource = "typed") {
    requestSource.current = source;
    const nextRequest = value.trim() || archetype.request;
    setRequest(nextRequest);
    // A new search is a new list: whatever the ratings taught applies to it, the same words or not.
    setTaught((held) => (held.heldFor === null ? held : { ...held, heldFor: null }));
    setMatchIndex(0);
    setMore(0);
    // U10: the typing screen is being left — its banner does not follow the person to results.
    dispatchBanner({ type: "cleared" });
    // Straight to the results. The sort is synchronous and already done; the screen that used to
    // sit here spent 4.25 seconds saying so.
    goTo("results");
  }

  /**
   * The finder's record (src/db/finder.ts): one search once its list has settled (the read landed,
   * or there was none), what the person does with it, the handoff, and a voice call's summary.
   * Sent and forgotten; nothing here waits.
   */
  const requestSource = useRef<SearchSource>("typed");
  const tracked = useRef<{ request: string; id: string } | null>(null);
  const pendingCall = useRef<CallSummary | null>(null);
  useEffect(() => {
    if (stage !== "results" || reading || tracked.current?.request === request) return;
    const id = newId();
    tracked.current = { request, id };
    trackSearch({
      id,
      source: requestSource.current,
      requestText: request,
      place,
      filters: effectiveFilters as unknown as Record<string, unknown>,
      readSource: modelNeeds ? "llm" : "lexicon",
      asked: kept.map((n) => facetKey(n.facet)),
      unlisted,
      shown: matches.slice(0, visibleCount).map((c) => c.id),
    });
    if (pendingCall.current) trackVoiceCall(pendingCall.current, id);
    pendingCall.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once per request, when its list first shows.
  }, [stage, reading, request]);
  function note(kind: EventKind, clinicianId: string | null = null) {
    if (tracked.current) track("event", { id: newId(), searchId: tracked.current.id, kind, clinicianId });
  }
  /** Every turn, the call so far, under the call's own id: the same row, filled in as it goes. */
  function voiceCallProgress(call: CallSummary) {
    trackVoiceCall(call, null);
  }
  function voiceCallEnded(call: CallSummary) {
    if (call.outcome !== "revealed") {
      trackVoiceCall(call, null);
      return;
    }
    // The list for this call's words may already be on record (the read finished before the call
    // closed): send the call now, against that search; otherwise the search effect sends it.
    const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
    if (tracked.current && same(tracked.current.request, call.request)) trackVoiceCall(call, tracked.current.id);
    else pendingCall.current = call;
  }

  /** The voice finder's last answer: its sentence is the request, its suburb the place. */
  function revealVoice({ request: words, place: spoken }: Reveal) {
    if (spoken && resolvePlace(spoken)) {
      setPlace(spoken);
      rememberPlace(spoken);
    }
    setDraft(words);
    findMatches(words, "voice");
  }

  function chooseClinician(selected: Clinician) {
    note("profile", selected.id);
    const index = matches.findIndex((item) => item.id === selected.id);
    if (index >= 0) setMatchIndex(index);
    goTo("profile");
  }

  function reset() {
    backTo("welcome");
    setDraft("");
    setRequest(archetype.request);
    setMatchIndex(0);
    dispatchBanner({ type: "cleared" });
  }

  /** RADIANT: one yes/no filter switched from the results chips; written to the device like the profile does. */
  function toggleFilter(key: BooleanFilterKey) {
    note("filter");
    const next: Filters = { ...filters, [key]: !filters[key] };
    writeFilters(window.localStorage, next);
    setFilters(next);
    setMatchIndex(0);
    setMore(0);
  }

  /**
   * A kind of care picked from the band: the same profession filter the support path writes, so
   * the two doors into the roster set one thing. Picking the kind already on narrows to nothing
   * new, so it clears instead — the band is how you get back to everybody as well as how you
   * leave it.
   */
  function pickKind(id: Profession | null) {
    const held = filters.professions;
    const next: Filters = { ...filters, professions: id === null || (held.length === 1 && held[0] === id) ? [] : [id] };
    writeFilters(window.localStorage, next);
    setFilters(next);
    setMatchIndex(0);
    setMore(0);
  }

  /** A "What we heard" chip tapped: out of the ranking, or back in. The list re-ranks in place. */
  function toggleHeard(key: string) {
    note("heard");
    const keys = removed.has(key) ? [...removed].filter((k) => k !== key) : [...removed, key];
    setRemovedHeard({ request, keys });
    setMatchIndex(0);
    setMore(0);
  }

  /** One held filter dropped from the empty screen's way out, written to the device like a chip. */
  function relaxFilters(next: Filters) {
    writeFilters(window.localStorage, next);
    setFilters(next);
    setMatchIndex(0);
    setMore(0);
  }

  /** O234: every narrowing filter off, the place kept — it orders, it never excluded anybody. */
  function clearNarrowingFilters() {
    setClearedCareRequest(request);
    const next: Filters = { ...emptyFilters(), place: filters.place };
    writeFilters(window.localStorage, next);
    setFilters(next);
    setMatchIndex(0);
    setMore(0);
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
          {/* O249 (apple-design appraisal, finding 4): the leaving screen goes at once — its exit
              is instant, so the next screen exists on the very next frame and a tap during the
              change lands on something. Overlapping the two (sync mode) was tried first and left
              screens stranded when two changes came within a frame of each other; an instant exit
              is the interruptible version that cannot strand anything. The context carries the
              direction so the arrival comes from the side the person is moving from. */}
          <StageDirection.Provider value={direction}>
          <AnimatePresence key={arrivalKey} mode="wait" initial={false}>

        {stage === "welcome" && (
          <WelcomeStage
            key="welcome"
            focusOnArrival={focusOnArrival}
            draft={draft}
            setDraft={setDraft}
            reducedMotion={reducedMotion}
            onSearch={findMatches}
            mode={mode}
            onMode={chooseMode}
            onTalk={() => {
              if (!talks && !fakeVoice()) return startListening();
              // The call starts in the tap, while the screen arrives.
              startLink();
              goTo("voice");
            }}
          />
        )}

        {stage === "voice" && (
          <VoiceStage
            key="voice"
            focusOnArrival={focusOnArrival}
            reducedMotion={reducedMotion}
            onReveal={revealVoice}
            onHeard={readAhead}
            onCallEnd={voiceCallEnded}
            onCallProgress={voiceCallProgress}
            onLeave={(words) => {
              setDraft(words);
              backTo("welcome");
            }}
            onType={(words) => {
              setDraft(words);
              goTo("type");
            }}
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
            fitFor={fitFor}
            focusOnArrival={focusOnArrival}
            requestHeadline={requestHeadline}
            requestSummary={requestSummary}
            quality={quality}
            tieNote={tieNote}
            orderNote={orderCopy}
            clarifierList={clarifierList}
            origin={origin}
            matches={matches}
            shown={shown}
            personalized={allMatches}
            foldSignals={foldSignals}
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
            filterLabels={activeFilterCount(effectiveFilters) > 0 ? describeFilters(effectiveFilters) : []}
            onClearFilters={clearNarrowingFilters}
            waysOut={ways}
            onRelax={relaxFilters}
            emptyKind={emptyKind}
            heard={heardFacets}
            removedHeard={removed}
            steps={steps}
            danger={danger}
            onToggleHeard={toggleHeard}
            reading={reading}
            place={place}
            filters={effectiveFilters}
            onToggleFilter={toggleFilter}
            careKinds={careKinds}
            onPickKind={pickKind}
            onClarify={(answer) => setRequest(`${request}, ${answer}`)}
            onShowMore={() => {
              note("more");
              setMore((n) => n + 5);
            }}
            onChoose={chooseClinician}
          />
        )}

        {stage === "profile" && (
          <ProfileStage
            key="profile"
            focusOnArrival={focusOnArrival}
            problemFit={fitFor(clinician)}
            fitTags={tagsFor(clinician)}
            strengthFit={strengthFor(clinician)}
            clinician={clinician}
            personalizedSignals={personalizedMatch.signals}
            profileEvidence={profileEvidence}
            profileMissed={profileMissed}
            insights={insights}
            request={request}
            origin={origin}
            compareName={compareRows.length > 0 && compareWith ? compareWith.shortName : null}
            onBack={() => backTo("results")}
            onCompare={() => {
              note("compare", clinician.id);
              goTo("compare");
            }}
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
            onHandoff={() =>
              handOff({
                searchId: tracked.current?.id ?? null,
                clinicianId: clinician.id,
                name: clinician.name,
                asked: kept.map((n) => facetKey(n.facet)),
                met: profileEvidence.map((n) => facetKey(n.facet)),
              })
            }
          />
        )}

          </AnimatePresence>
          </StageDirection.Provider>
        </section>
      </main>
    </MotionConfig>
  );
}
