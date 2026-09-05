"use client";

// O95: the results screen, verbatim from care-finder.tsx — including the collapsed-screens
// history note, because it explains why this one screen carries so much.

import { CaretRight, FunnelSimple, MagnifyingGlass, MapTrifold, PencilSimple, Sparkle } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  closedBooksNote,
  distanceTo,
  locationLabel,
  type Clinician,
  type MatchQuality,
} from "@/demo/clinicians";
import { type Clarifier } from "@/matching/clarify";
import { type SuburbPoint } from "@/geo/suburbs";
import { resultsAnnouncement } from "@/finder/announce";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Sheet } from "../sheet";

/** O235: Leaflet reads `window` on import, so the map is a client-only chunk fetched the first time a place resolves. */
const NearbyMap = dynamic(() => import("./nearby-map").then((m) => m.NearbyMap), {
  ssr: false,
  loading: () => <div className="nearby-map nearby-map-loading" aria-hidden="true" />,
});
import { ClinicianPortrait, distinguishingSignals, EASE_OUT, MotionScreen, STAGE_SPRING, StatusLine, Wordmark } from "./shared";

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
  orderNote,
  clarifierList,
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
  /** Q4 "why this order": the one sentence saying what built the sequence — see `orderNote` in `src/demo/clinicians.ts`. */
  orderNote: string;
  clarifierList: readonly Clarifier[];
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
  /**
   * O238 (founder-directed, "make map open up with a button, it causes too much clutter … the
   * north star is simplicity"): the map is behind one control on the list's own header, closed by
   * default. The row keys render only while it is open, because they are keys to the map.
   */
  const [mapOpen, setMapOpen] = useState(false);
  /** O244 (founder-directed): the clarifiers live behind a star — no label — that opens a sheet. */
  const [clarifyOpen, setClarifyOpen] = useState(false);
  const mapShown = mapOpen && origin !== null && shown.length > 0;
  /** O234: the filters left nobody. The verdict lines below describe a roster; with no roster they describe nothing, so they stand down. */
  const empty = matches.length === 0;
  const clarifiable = !empty && quality !== "informed" && clarifierList.length > 0;
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
        {/* O237 (founder-directed, "improve aesthetic and minimalism … just show the results"):
            the head is the search summary and, when a suburb is known, the map. The place is set
            on the Profile tab (or carried by a link); the verdict sentences — "no listed GP matches
            every part", "the first N answer equally well", "nearer to X comes first" — are gone
            from the screen. What they said is still true and still enforced: the list heading
            reads "Matches" only when the words produced an order and "All listed GPs" when they
            did not, the fold never cuts a tied band, and the clarifier chips stand ready when the
            words reached nothing. Honesty moved from paragraphs into structure. */}
        <motion.div
          className="results-summary"
          role="group"
          aria-label="Your search"
          initial={reducedMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...STAGE_SPRING, opacity: { duration: 0.2 } }}
        >
          <button type="button" className="results-summary-words" onClick={onRefine} aria-label="Change what you said">
            <MagnifyingGlass size={18} weight="bold" aria-hidden="true" />
            <span className="results-summary-text">{requestSummary}</span>
            <PencilSimple size={16} weight="bold" aria-hidden="true" />
          </button>
        </motion.div>

        {/* THE RAW REQUEST IS NEVER A HEADLINE IT DID NOT EARN (O46): the headline renders only
            when a reading earned it; otherwise the summary card above already shows the words. */}
        {requestHeadline !== requestSummary && (
          <h1 className="results-title" tabIndex={-1}>{requestHeadline}</h1>
        )}

      </div>

      {/* O244: the questions, in the sheet. Tapping one appends the answer in the reader's own
          words and re-ranks; the sheet closes so the re-ordered list is what they see next. */}
      <Sheet open={clarifyOpen} title="Improve my matches" onClose={() => setClarifyOpen(false)}>
        <div className="clarify">
          <p className="clarify-sub">One answer would narrow it:</p>
          <ul className="clarify-row">
            {clarifierList.map((clarifier) => (
              <li key={clarifier.facetKey}>
                <button
                  type="button"
                  className="clarify-chip"
                  onClick={() => {
                    setClarifyOpen(false);
                    onClarify(clarifier.answer);
                  }}
                >
                  {clarifier.prompt}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Sheet>

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
            {filterLabels.map((label, index) => (
              <motion.li
                key={label}
                className="filter-chip"
                initial={reducedMotion ? false : { opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 520, damping: 32, delay: 0.05 + index * 0.04 }}
              >
                {label}
              </motion.li>
            ))}
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
              ? "Loosening one filter usually brings the list back."
              : "Try a different suburb, or change the filters on your profile."}
          </p>
          <div className="results-empty-actions">
            <button className="me-primary" type="button" onClick={onClearFilters}>Clear the filters</button>
            <Link className="results-empty-edit" href="/profile">Change them</Link>
          </div>
        </div>
      )}

      {!empty && (
      <>
      <motion.div
        className="results-list-head"
        initial={reducedMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...STAGE_SPRING, delay: 0.06, opacity: { duration: 0.2, delay: 0.06 } }}
      >
        <h2>{quality === "informed" ? "Matches" : "All listed GPs"}</h2>
        <span className="results-list-tools">
          {/* O226: the count sits with the list it describes, not two groups up the page. */}
          {matches.length > shown.length && (
            <span className="results-count">
              {/* Number pop-in: keyed on the value, so the digits re-enter only when the count
                  actually changes — a filter narrowing the list, a "show more" widening it. */}
              <span key={shown.length} className="t-digit">{shown.length}</span> of {matches.length}
            </span>
          )}
          {/* O244: the star. One tap opens the questions that would narrow the list; the sheet is
              the app's one modal idiom, so it drags, closes on Escape and returns focus. */}
          {clarifiable && (
            <button
              type="button"
              className={clarifyOpen ? "clarify-star is-open" : "clarify-star"}
              aria-label="Improve my matches"
              aria-haspopup="dialog"
              aria-expanded={clarifyOpen}
              onClick={() => setClarifyOpen(true)}
            >
              <Sparkle size={18} weight={clarifyOpen ? "fill" : "bold"} aria-hidden="true" />
            </button>
          )}
          {/* O238: the map, behind a control, only when a suburb is known to draw it from. */}
          {origin && (
            <button
              type="button"
              className={mapShown ? "map-toggle is-open" : "map-toggle"}
              aria-pressed={mapShown}
              aria-controls="nearby-map-panel"
              onClick={() => setMapOpen((open) => !open)}
            >
              <MapTrifold size={16} weight={mapShown ? "fill" : "bold"} aria-hidden="true" />
              {mapShown ? "Hide map" : "Map"}
            </button>
          )}
        </span>
      </motion.div>
      {/* WHY THIS ORDER, SAID OUT LOUD (Roadmap Q4; Product Principle #1 — "start with the
          person's words, then show how those words affected the order"). O237 was right to delete
          the four verdict paragraphs that used to sit at the top of this screen, but it left the
          sequence itself unexplained: the rows each said why THEY were a match, and nothing said
          what the ORDER was. A reader could not tell a list their words earned from a list in the
          listing's own arbitrary order, which is exactly the claim the product makes.
          One sentence, derived from the same `needsFor`/`matchQuality` read the ranking used, so
          it cannot describe an order the list does not have — and it changes voice in the three
          cases where there is no real order rather than dressing them up as one.
          It sits under the heading, not above it: the heading names the group, the line qualifies
          it, and a person who already trusts the order can skip a line of small grey text where
          they could not skip a paragraph. It arrives on the head's own spring at the head's own
          delay, so it reads as part of that block rather than a second, later event.
          The tie note joins it as a second sentence in the same paragraph rather than a second
          line: it is only ever present in the `informed` case, where it narrows a claim the first
          sentence just made, and two greys stacked would read as a warning stack. */}
      <motion.p
        className="results-order-note"
        initial={reducedMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...STAGE_SPRING, delay: 0.06, opacity: { duration: 0.2, delay: 0.06 } }}
      >
        {orderNote}
        {tieNote ? ` ${tieNote}` : ""}
      </motion.p>
      </>
      )}

      {/* O235: the nearby map — only once the place resolves, and only when asked for. */}
      <AnimatePresence initial={false}>
        {mapShown && (
          <motion.div
            key="map"
            id="nearby-map-panel"
            className="nearby-map-panel"
            // transitions.dev panel reveal: the panel does not only unfold, it comes into FOCUS —
            // a small blur clears as it opens, so the map reads as arriving rather than as a box
            // whose height changed. The close keeps its quick tween and drops the blur lane: a
            // dismissal gets out of the way, it does not un-focus.
            initial={reducedMotion ? false : { opacity: 0, height: 0, filter: "blur(2px)" }}
            animate={{ opacity: 1, height: "auto", filter: "blur(0px)" }}
            exit={reducedMotion ? undefined : { opacity: 0, height: 0, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
            transition={{ ...STAGE_SPRING, opacity: { duration: 0.2 }, filter: { duration: 0.2 } }}
          >
            <NearbyMap origin={origin!} shown={shown} onPick={pickFromMap} />
          </motion.div>
        )}
      </AnimatePresence>

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
              // transitions.dev texts reveal: each row rises AND resolves — a 2px blur clears on
              // the same beat as the opacity — so the list condenses into place line by line
              // instead of fading in as a block. The stagger it already had is the recipe's, and
              // the 0.2s cap keeps the total under the ~300ms the motion scale allows; the exit is
              // a single quiet fade with no blur, so a row leaving never reverse-reveals.
              initial={reducedMotion ? false : { opacity: 0, y: 10, filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={reducedMotion ? undefined : { opacity: 0, transition: { duration: 0.16 } }}
              transition={{ ...STAGE_SPRING, delay: Math.min(index * 0.04, 0.2), opacity: { duration: 0.22 }, filter: { duration: 0.22 }, layout: { ...STAGE_SPRING, delay: 0 } }}
              whileTap={reducedMotion ? undefined : { scale: 0.985 }}
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
              {mapShown && <span className="row-key" aria-hidden="true">{index + 1}</span>}
            </motion.button>
          );
          })}
        </AnimatePresence>
      </div>

      {matches.length > shown.length && (
        <motion.button
          className="show-all"
          type="button"
          onClick={onShowAll}
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.3 }}
          whileTap={reducedMotion ? undefined : { scale: 0.985 }}
        >
          Show the other {matches.length - shown.length}
        </motion.button>
      )}
    </MotionScreen>
  );
}
