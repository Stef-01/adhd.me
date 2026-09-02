"use client";

// O95: the results screen, verbatim from care-finder.tsx — including the collapsed-screens
// history note, because it explains why this one screen carries so much.

import { CaretRight } from "@phosphor-icons/react";
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
import { CoverageMap } from "../coverage-map";
import { ClinicianPortrait, distinguishingSignals, MotionScreen, StatusLine, Wordmark } from "./shared";

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

  return (
    <MotionScreen key="results" className="results-screen" focusOnArrival={focusOnArrival} focusTarget=".clinician-row">
      <StatusLine line={line} nonce={reranks} />
      <header className="minimal-header">
        <Wordmark />
        <button className="text-action" type="button" onClick={onReset}>Start over</button>
      </header>

      <div className="results-head">
        {/* THE RAW REQUEST IS NEVER A HEADLINE IT DID NOT EARN (O46). When no branch and
            no reading matched, the fallback headline was the person's own text at display
            scale — fine for a sentence, absurd for the fragment a cut-short microphone
            delivers ("Cx." in 40px serif, above a banner admitting nothing was read).
            Unearned text renders as a quiet quote instead: still their words, no longer a
            proclamation — and the eyebrow goes with it (O48): "Based on what you told us"
            above words the product just admitted it could not read was one more line, and
            a contradiction. */}
        {requestHeadline !== requestSummary || quality === "informed" ? (
          <>
            <p className="eyebrow">Based on what you told us</p>
            <h1 tabIndex={-1}>{requestHeadline}</h1>
          </>
        ) : (
          <p className="results-request-quote">&ldquo;{requestSummary}&rdquo;</p>
        )}
        <button className="refine-compact" type="button" onClick={onRefine}>
          <span>Change what you said</span>
        </button>

        <div className="place-field">
          <label htmlFor="place">Where are you?</label>
          <input
            id="place"
            name="place"
            list="covered-suburbs"
            value={place}
            onChange={(event) => onPlaceChange(event.target.value)}
            placeholder="Beecroft"
            autoComplete="address-level2"
          />
          <datalist id="covered-suburbs">
            {coveredSuburbs().map((suburb) => <option key={suburb} value={suburb} />)}
          </datalist>
          {quality === "informed" && fitCopy && (
              <motion.p
                key={fitCopy}
                className="place-status"
                initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
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

          {/* WHEN THE ORDER IS NOT EARNED, SAY SO.
              A probe over realistic first-person queries found the lexicon reached nothing
              on nine of seventeen and that ten tied exactly — including "I think I might
              have ADHD", the likeliest thing anybody types. Every one of those still
              rendered as a ranked list whose order came from the tie-break: from nothing,
              presented as from something. This is one line and it only appears when the
              order means nothing, which is the only time it has anything to add. */}
          {/* O52's story, finished (design-motion-principles pass): when a clarifier answer
              or a suburb re-ranks the list, the rows below GLIDE — but these status lines
              used to teleport in the same frame, the one region changing state with no
              acknowledgment of it. Each now enters with the product's standard small rise
              (0.2s, the house ease, exit subtler than enter) and swaps when its text swaps
              (the key). Under prefers-reduced-motion every line renders in place. */}
          <AnimatePresence initial={false}>
          {quality !== "informed" && (
            <motion.p
              key={`quality-${quality}`}
              className="place-status match-quality"
              initial={reducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {MATCH_QUALITY_COPY[quality]}
            </motion.p>
          )}

          {/* THE TIE THE ROSTER-LEVEL VERDICT CANNOT SEE (O3). "Informed" means an order
              exists somewhere in the list — not necessarily at the top, which is the one
              boundary the reader acts on. When the first band is a tie, say so there. */}
          {tieNote && (
            <motion.p
              key="tie-note"
              className="place-status match-quality"
              initial={reducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {tieNote}
            </motion.p>
          )}

          {/* ONE QUESTION, WHEN THE WORDS DID NOT SEPARATE ANYBODY.
              Saying "this is not a ranking" is honest and it is a dead end: the commonest
              sentence in the product reaches only the facet every GP declares, so the reader
              is told the order means nothing and left where they started. These are the
              facets this roster actually DISAGREES on, so answering one reorders it — a
              question that could not change the order would be data collection from somebody
              who came here to find a GP. Tapping appends the answer in the reader's own
              words and the whole sentence is re-read, so the finder can still say "you said
              this" about a signal it prompted. */}
          {quality !== "informed" && clarifierList.length > 0 && (
            <motion.details
              key="clarify"
              className="results-refine-details"
              initial={reducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <summary>Improve my matches</summary>
              <div className="clarify">
                <p className="clarify-lead">One answer would narrow it:</p>
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
              </div>
            </motion.details>
          )}

          {/* A care area nobody on the roster declares is a gap in the LISTING, and the
              reader should not be left to conclude it is a gap in their question. */}
          {unserved.length > 0 && (
            <motion.p
              key={`unserved-${unserved[0]}`}
              className="place-status match-quality"
              initial={reducedMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* O110: the sentence is composed in the matching module now, where it can be
                  unit-tested — and where it covers preferences and manner, not only care
                  areas. The screen prints what the reader is owed; it does not decide it. */}
              {unserved[0]}
            </motion.p>
          )}
          </AnimatePresence>

          {/* Only when the answer is no. "We do not cover that one" raises the question of
              what IS covered, and this answers it in place instead of leaving somebody to
              guess which suburbs to try. In every other case it would be a block of screen
              saying something the reader did not ask. */}
          {place.trim() !== "" && !origin && (
            <CoverageMap highlight={null} />
          )}

        </div>
      </div>

      <div className="results-list-head">
        <h2>Matches</h2>
        {/* O226: the count sits with the list it describes, not two groups up the page. */}
        {matches.length > shown.length && (
          <span className="results-count">{shown.length} of {matches.length}</span>
        )}
      </div>

      <div className="clinician-list">
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
              onClick={() => onChoose(item)}
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, transition: { duration: 0.16 } }}
              transition={{ delay: Math.min(index * 0.03, 0.18), duration: 0.26, layout: { duration: 0.34, ease: [0.22, 1, 0.36, 1], delay: 0 } }}
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
