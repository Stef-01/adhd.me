"use client";

// O95: the results screen, verbatim from care-finder.tsx — including the collapsed-screens
// history note, because it explains why this one screen carries so much.

import { CaretRight, FunnelSimple, MagnifyingGlass, MapPin, PencilSimple, Sparkle } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  closedBooksNote,
  distanceTo,
  locationLabel,
  MATCH_QUALITY_COPY,
  type Clinician,
  type MatchQuality,
} from "@/demo/clinicians";
import { type Clarifier } from "@/matching/clarify";
import { coveredSuburbs, type SuburbPoint } from "@/geo/suburbs";
import { resultsAnnouncement } from "@/finder/announce";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CoverageMap } from "../coverage-map";

/** O235: Leaflet reads `window` on import, so the map is a client-only chunk fetched the first time a place resolves. */
const NearbyMap = dynamic(() => import("./nearby-map").then((m) => m.NearbyMap), {
  ssr: false,
  loading: () => <div className="nearby-map nearby-map-loading" aria-hidden="true" />,
});
import { ClinicianPortrait, distinguishingSignals, EASE_OUT, MotionScreen, StatusLine, Wordmark } from "./shared";

/* ROUND 1 OF THE MINIMALISM PASS COLLAPSED FOUR SCREENS INTO THIS ONE.
   Gone: `review` (read your own words back, then press continue), `matching` (a 4.25s
   animation of three rotating reassurances while a synchronous sort had already
   finished), and the swipe deck, which showed ONE clinician at a time with a large
   portrait and made comparing two of them a memory exercise.
   A person choosing a GP is comparing, so the list is the primary view and the only one.
   Where you are moved here from its own screen because it belongs beside the results it
   changes: editing it re-ranks in place instead of sending anybody back a step. */
export function ResultsStage({
  requestHeadline,
  requestSummary,
  quality,
  tieNote,
  clarifierList,
  unserved,
  fitCopy,
  place,
  origin,
  matches,
  shown,
  personalized,
  allSignals,
  request,
  reducedMotion,
  focusOnArrival,
  onReset,
  onRefine,
  onPlaceChange,
  onClarify,
  onShowAll,
  onChoose,
  filterLabels,
  onClearFilters,
}: {
  requestHeadline: string;
  requestSummary: string;
  quality: MatchQuality;
  tieNote: string | null;
  clarifierList: readonly Clarifier[];
  unserved: readonly string[];
  fitCopy: string | null;
  place: string;
  origin: SuburbPoint | null;
  matches: readonly Clinician[];
  shown: readonly Clinician[];
  /** O222: the one personalized-match pass, computed in care-finder; rows index into it. */
  personalized: readonly { reason: string; signals: string[] }[];
  allSignals: string[][];
  request: string;
  reducedMotion: boolean | null;
  focusOnArrival: boolean;
  onReset: () => void;
  onRefine: () => void;
  onPlaceChange: (value: string) => void;
  onClarify: (answer: string) => void;
  onShowAll: () => void;
  onChoose: (clinician: Clinician) => void;
  /** O234: the labels of the device's filters that are on — the strip above the list, and the empty state's reason. */
  filterLabels: readonly string[];
  onClearFilters: () => void;
}) {
  // U9: the one live line this screen owns. The status paragraphs below used to be five separate
  // `role="status"` regions inside a live shell, so a place edit read the fit line, the distance
  // line, the quality verdict and the whole re-ordered list. Now the region says the count and
  // the place, and "Re-ranked:" once the list is not the one the screen arrived with — `matches`
  // is derived from (request, origin, roster), so a new identity IS a re-rank, and the counter
  // re-announces a re-rank that repeats the same count.
  const arrivalMatches = useRef(matches);
  const [reranks, setReranks] = useState(0);
  useEffect(() => {
    if (matches === arrivalMatches.current) return;
    setReranks((n) => n + 1);
  }, [matches]);
  const line = resultsAnnouncement({ count: matches.length, suburb: origin?.suburb ?? null, reranked: reranks > 0 });

  /**
   * O234: a stop on the map, tapped. The row is brought into view and given FOCUS — the ring is
   * the mark, and it is the same mark a keyboard user already gets, so nothing new has to be
   * invented to say "this one". Opening the profile from the map would take a person somewhere
   * they did not choose from a number; finding the row lets them read it first.
   */
  const list = useRef<HTMLDivElement | null>(null);
  /** O234: the filters left nobody. The verdict lines below describe a roster; with no roster they describe nothing, so they stand down. */
  const empty = matches.length === 0;
  const pickFromMap = (clinician: Clinician) => {
    const row = list.current?.querySelector<HTMLElement>(`[data-clinician="${clinician.id}"]`);
    if (!row) return;
    row.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    row.focus({ preventScroll: true });
  };

  return (
    <MotionScreen key="results" className="results-screen" focusOnArrival={focusOnArrival} focusTarget=".clinician-row">
      <StatusLine line={line} nonce={reranks} />
      <header className="minimal-header">
        <Wordmark />
        <button className="text-action" type="button" onClick={onReset}>Start over</button>
      </header>

      <div className="results-head">
        {/* O236 (founder-directed, "more modern"): the results screen opens on a SEARCH SUMMARY —
            the words and the place as one compact card, the pattern every reference finder uses
            (Zocdoc's results bar, HealthEngine's chip row) — instead of a quote, an underlined
            control and a labelled form field stacked down the screen. The words are a button that
            reopens the box; the place is a pill-shaped field that still re-ranks in place as it is
            typed (finder-flow/history/a11y prove that), with its label read to screen readers and
            not painted. */}
        <div className="results-summary" role="group" aria-label="Your search">
          <button type="button" className="results-summary-words" onClick={onRefine} aria-label="Change what you said">
            <MagnifyingGlass size={18} weight="bold" aria-hidden="true" />
            <span className="results-summary-text">{requestSummary}</span>
            <PencilSimple size={16} weight="bold" aria-hidden="true" />
          </button>
          <div className={origin ? "results-summary-place is-set" : "results-summary-place"}>
            <MapPin size={18} weight={origin ? "fill" : "bold"} aria-hidden="true" />
            <label className="sr-only" htmlFor="place">Where are you?</label>
            <input
              id="place"
              name="place"
              list="covered-suburbs"
              value={place}
              onChange={(event) => onPlaceChange(event.target.value)}
              placeholder="Your suburb"
              autoComplete="address-level2"
            />
            <datalist id="covered-suburbs">
              {coveredSuburbs().map((suburb) => <option key={suburb} value={suburb} />)}
            </datalist>
          </div>
        </div>

        {/* THE RAW REQUEST IS NEVER A HEADLINE IT DID NOT EARN (O46): the headline renders only
            when a reading earned it; otherwise the summary card above already shows the words. */}
        {(requestHeadline !== requestSummary || quality === "informed") && (
          <h1 className="results-title" tabIndex={-1}>{requestHeadline}</h1>
        )}

        <div className="results-notes">
          {!empty && quality === "informed" && fitCopy && (
              <motion.p
                key={fitCopy}
                className="place-status"
                initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
              >
                {fitCopy}
              </motion.p>
          )}
          {place.trim() !== "" && (
            <p className="place-status">
              {origin
                ? `Among otherwise equal matches, nearer to ${origin.suburb} comes first.`
                : "We do not cover that location yet."}
            </p>
          )}

          {/* WHEN THE ORDER IS NOT EARNED, SAY SO (probe over realistic first-person queries: nine
              of seventeen reached nothing). One line, only when the order means nothing. */}
          <AnimatePresence initial={false}>
          {!empty && quality !== "informed" && (
            <motion.p
              key={`quality-${quality}`}
              className="place-status match-quality"
              initial={reducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
            >
              {MATCH_QUALITY_COPY[quality]}
            </motion.p>
          )}

          {/* THE TIE THE ROSTER-LEVEL VERDICT CANNOT SEE (O3). */}
          {!empty && tieNote && (
            <motion.p
              key="tie-note"
              className="place-status match-quality"
              initial={reducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
            >
              {tieNote}
            </motion.p>
          )}

          {/* ONE QUESTION, WHEN THE WORDS DID NOT SEPARATE ANYBODY: the facets this roster
              actually disagrees on, as chips in the open (O236: no longer folded behind a
              disclosure — a suggestion row is the modern idiom and the answer is one tap). Tapping
              appends the answer in the reader's own words. */}
          {!empty && quality !== "informed" && clarifierList.length > 0 && (
            <motion.div
              key="clarify"
              className="clarify"
              initial={reducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
            >
              <p className="clarify-lead">
                <Sparkle size={15} weight="fill" aria-hidden="true" />
                Improve my matches
              </p>
              <p className="clarify-sub">One answer would narrow it:</p>
              <ul className="clarify-row">
                {clarifierList.map((clarifier) => (
                  <li key={clarifier.facetKey}>
                    <button
                      type="button"
                      className="clarify-chip"
                      onClick={() => onClarify(clarifier.answer)}
                    >
                      {clarifier.prompt}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* A care area nobody on the roster declares is a gap in the LISTING. O110: the sentence
              is composed in the matching module. */}
          {!empty && unserved.length > 0 && (
            <motion.p
              key={`unserved-${unserved[0]}`}
              className="place-status match-quality"
              initial={reducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
            >
              {unserved[0]}
            </motion.p>
          )}
          </AnimatePresence>

          {/* Only when the answer is no: what IS covered, in place. */}
          {place.trim() !== "" && !origin && (
            <CoverageMap highlight={null} />
          )}
        </div>

        {/* O234/O235: the nearby map — only once the place resolves. */}
        {origin && shown.length > 0 && (
          <NearbyMap origin={origin} shown={shown} onPick={pickFromMap} />
        )}
      </div>

      {/* O234: the filters the device is holding, said on the screen they narrow. A person who set
          "wheelchair access" on Tuesday must be able to see on Thursday why the list is short —
          and clear it here, without a trip to the profile. Edit goes there; the set lives there. */}
      {filterLabels.length > 0 && (
        <div className="filter-strip" role="group" aria-label="Your filters">
          <span className="filter-strip-lead">
            <FunnelSimple size={15} weight="bold" aria-hidden="true" />
            Your filters
          </span>
          <ul className="filter-chips">
            {filterLabels.map((label) => <li key={label} className="filter-chip">{label}</li>)}
          </ul>
          <span className="filter-strip-actions">
            <Link className="filter-edit" href="/profile">Edit</Link>
            <button className="filter-clear" type="button" onClick={onClearFilters}>Clear</button>
          </span>
        </div>
      )}

      {/* O234, AR24 kind `no-results`: the roster was ranked and the filters left nobody. The
          sentence names the filters as the cause, because that is the one thing the person can
          change, and both ways out are on the screen. */}
      {empty && (
        <div className="results-empty">
          <p className="results-empty-lead">No listed GP answers every filter you set.</p>
          <p className="results-empty-detail">
            {filterLabels.length > 0
              ? `On right now: ${filterLabels.join(", ")}. Loosening one usually brings the list back.`
              : "Try a different suburb, or change the filters on your profile."}
          </p>
          <div className="results-empty-actions">
            <button className="me-primary" type="button" onClick={onClearFilters}>Clear the filters</button>
            <Link className="results-empty-edit" href="/profile">Change them</Link>
          </div>
        </div>
      )}

      {!empty && (
      <div className="results-list-head">
        <h2>Matches</h2>
        {/* O226: the count sits with the list it describes, not two groups up the page. */}
        {matches.length > shown.length && (
          <span className="results-count">{shown.length} of {matches.length}</span>
        )}
      </div>
      )}

      <div className="clinician-list" ref={list}>
        {/* O52: the re-sort, made visible. A clarifier answer re-ranks this list, and the
            order changing is the product's whole argument — so rows GLIDE to their new
            positions (`layout="position"`) instead of teleporting, and a row pushed out
            of the visible fold leaves visibly rather than vanishing. The surrounding
            MotionConfig reducedMotion="user" is what makes the static equal automatic:
            under prefers-reduced-motion the reorder is instant, which is the same truth
            without the movement. */}
        <AnimatePresence initial={false}>
          {shown.map((item, index) => {
          // `shown` is always a prefix slice of `matches`, so the indices align.
          const itemMatch = personalized[index]!;
          const away = distanceTo(item, origin);
          const reasons = distinguishingSignals(itemMatch.signals, allSignals);
          return (
            <motion.button
              key={item.id}
              className="clinician-row"
              type="button"
              layout="position"
              data-clinician={item.id}
              onClick={() => onChoose(item)}
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, transition: { duration: 0.16 } }}
              transition={{ delay: Math.min(index * 0.03, 0.18), duration: 0.26, layout: { duration: 0.34, ease: EASE_OUT, delay: 0 } }}
              whileTap={reducedMotion ? undefined : { scale: 0.99 }}
            >
              {/* O67: the same layoutId as the profile's portrait frame, so the chosen
                  GP's image travels from this slot into the hero as ONE object — the
                  continuity is shown, not asserted by the repeated name. The wrapper
                  exists because layoutId needs a measurable box of its own. */}
              <motion.span
                className="row-portrait-anchor"
                layoutId={`gp-portrait-${item.id}`}
                data-portrait-of={item.id}
              >
                <ClinicianPortrait clinician={item} variant="thumb" />
              </motion.span>
              <span>
                <strong>{item.name}</strong>
                {/* O217: an invented entry says so ON THE ROW, before any other fact about it —
                    the label is the disclosure mechanism, not the name or the copy. */}
                <small>{reasons.slice(0, 2).join(", ") || item.focus}</small>
                {/* O85: every place they consult, one label — a second location is a
                    fact the reader sees, and the distance sentence names which rooms
                    it measured when that matters. */}
                {/* O130: `row-location`, not `row-availability`. The accent on that class is a
                    fossil of `nextAvailable` — a written-in appointment time, deleted when the
                    roster became real people — and it had been painting a static suburb ever
                    since. A location is not a value that changes; the closed-books note below
                    is, and keeps it. */}
                <small className="row-location">{away ? `${locationLabel(item)}, ${away}` : locationLabel(item)}</small>
                {/* Closed books never outrank open ones at equal fit, and never hide
                    either — the row says why somebody unactionable is still here (O4).
                    The "they fit what you asked" sentence only renders when a fit was
                    actually computed; otherwise the neutral fact stands alone. */}
                {closedBooksNote(item, request) && (
                  <small className="row-availability">{closedBooksNote(item, request)}</small>
                )}
              </span>
              <CaretRight size={20} weight="light" aria-hidden="true" />
              {/* O234: the row's KEY on the map — a position, not a rank — shown only while the
                  map is, so a number never stands over the list claiming an order it did not earn. */}
              {origin && <span className="row-key" aria-hidden="true">{index + 1}</span>}
            </motion.button>
          );
          })}
        </AnimatePresence>
      </div>

      {matches.length > shown.length && (
        <button className="show-all" type="button" onClick={onShowAll}>
          Show the other {matches.length - shown.length}
        </button>
      )}
    </MotionScreen>
  );
}
