"use client";

// O95: the results screen, verbatim from care-finder.tsx — including the collapsed-screens
// history note, because it explains why this one screen carries so much.

import { CaretRight } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import {
  closedBooksNote,
  distanceTo,
  getPersonalizedMatch,
  locationLabel,
  MATCH_QUALITY_COPY,
  type Clinician,
  type MatchQuality,
} from "@/demo/clinicians";
import { type Clarifier } from "@/matching/clarify";
import { coveredSuburbs, type SuburbPoint } from "@/geo/suburbs";
import { CoverageMap } from "../coverage-map";
import { ClinicianPortrait, distinguishingSignals, MotionScreen, Wordmark } from "./shared";

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
  place,
  origin,
  matches,
  shown,
  allSignals,
  request,
  reducedMotion,
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
  place: string;
  origin: SuburbPoint | null;
  matches: readonly Clinician[];
  shown: readonly Clinician[];
  allSignals: string[][];
  request: string;
  reducedMotion: boolean | null;
  onReset: () => void;
  onRefine: () => void;
  onPlaceChange: (value: string) => void;
  onClarify: (answer: string) => void;
  onShowAll: () => void;
  onChoose: (clinician: Clinician) => void;
}) {
  return (
    <MotionScreen key="results" className="results-screen">
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
            <h1>{requestHeadline}</h1>
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
          {/* Says how many are SHOWN, not how many exist. "16 GPs" above a list of five
              is a number that describes something the reader cannot see. And it only
              claims "ranked on what you asked for" when that is TRUE (O11): on an
              unmatched or tied query this line used to assert a ranking two lines above
              the banner saying there is no ranking — two sentences about the same fact,
              one of them false. When the order is not earned the quality banner owns the
              whole explanation — and when everyone is shown anyway, the bare count ("3 of
              3.") said nothing at all and is dropped (O46). */}
          {(() => {
            const countLine = place.trim() === ""
              ? quality === "informed"
                ? shown.length === 1
                  ? "This GP does what you asked for."
                  : `These ${shown.length} GPs do what you asked for.`
                : shown.length === matches.length
                  ? null
                  : `Showing ${shown.length} of ${matches.length}.`
              : origin
                ? `Nearest to ${origin.suburb} first.`
                : quality === "informed"
                  ? "We do not cover that one yet, so these are ordered on what you asked for."
                  : "We do not cover that one yet.";
            return countLine ? <p className="place-status" role="status">{countLine}</p> : null;
          })()}

          {/* WHEN THE ORDER IS NOT EARNED, SAY SO.
              A probe over realistic first-person queries found the lexicon reached nothing
              on nine of seventeen and that ten tied exactly — including "I think I might
              have ADHD", the likeliest thing anybody types. Every one of those still
              rendered as a ranked list whose order came from the tie-break: from nothing,
              presented as from something. This is one line and it only appears when the
              order means nothing, which is the only time it has anything to add. */}
          {quality !== "informed" && (
            <p className="place-status match-quality" role="status">
              {MATCH_QUALITY_COPY[quality]}
            </p>
          )}

          {/* THE TIE THE ROSTER-LEVEL VERDICT CANNOT SEE (O3). "Informed" means an order
              exists somewhere in the list — not necessarily at the top, which is the one
              boundary the reader acts on. When the first band is a tie, say so there. */}
          {tieNote && (
            <p className="place-status match-quality" role="status">
              {tieNote}
            </p>
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
          )}

          {/* A care area nobody on the roster declares is a gap in the LISTING, and the
              reader should not be left to conclude it is a gap in their question. */}
          {unserved.length > 0 && (
            <p className="place-status match-quality" role="status">
              {`No GP listed today says they do ${unserved[0]!.toLowerCase()}. That is a gap in our listing, not in what you asked for.`}
            </p>
          )}

          {/* Only when the answer is no. "We do not cover that one" raises the question of
              what IS covered, and this answers it in place instead of leaving somebody to
              guess which suburbs to try. In every other case it would be a block of screen
              saying something the reader did not ask. */}
          {place.trim() !== "" && !origin && (
            <CoverageMap highlight={null} />
          )}
        </div>
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
          const itemMatch = getPersonalizedMatch(item, request);
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
                <small>{reasons.slice(0, 2).join(", ") || item.focus}</small>
                {/* O85: every place they consult, one label — a second location is a
                    fact the reader sees, and the distance sentence names which rooms
                    it measured when that matters. */}
                <small className="row-availability">{away ? `${locationLabel(item)}, ${away}` : locationLabel(item)}</small>
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
