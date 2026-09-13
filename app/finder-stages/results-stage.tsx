"use client";

// O95: the results screen, verbatim from care-finder.tsx — including the collapsed-screens
// history note, because it explains why this one screen carries so much.

import { CaretRight, FunnelSimple, MagnifyingGlass, MapPin, MapTrifold, PencilSimple, Sparkle } from "@phosphor-icons/react";
import { activeFilterCount, BOOLEAN_FILTER_KEYS, BOOLEAN_FILTER_LABELS, type BooleanFilterKey, type Filters } from "@/finder/filters";
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
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { NumberTicker } from "@/components/ui/number-ticker";
import dynamic from "next/dynamic";
import { Sheet } from "../sheet";
import { professionOf } from "@/demo/clinicians";
import { professionLabel, type Profession } from "@/support/professions";

/** O235: Leaflet reads `window` on import, so the map is a client-only chunk fetched the first time a place resolves. */
const NearbyMap = dynamic(() => import("./nearby-map").then((m) => m.NearbyMap), {
  ssr: false,
  loading: () => <div className="nearby-map nearby-map-loading" aria-hidden="true" />,
});
import { ClinicianPortrait, distinguishingSignals, EASE_OUT, MotionScreen, PRESS_SPRING, STAGE_SPRING, StatusLine, Wordmark } from "./shared";

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
  place,
  filters,
  onToggleFilter,
  careKinds,
  onPickKind,
  fitFor,
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
  /** RADIANT: the suburb the list is measured from, shown as a pill beside the wordmark. */
  place: string;
  /** RADIANT: the device's filters, so the quick chips can show which are on and switch them. */
  filters: Filters;
  onToggleFilter: (key: BooleanFilterKey) => void;
  /** The kinds of care this search reaches, richest first — see `careKinds` in care-finder.tsx. */
  careKinds: readonly { id: Profession; count: number; plural: string }[];
  onPickKind: (id: Profession | null) => void;
  /** PRD §42: the problem-fit sentence for an allied provider, from the personal model, or null. */
  fitFor?: (clinician: Clinician) => string | null;
}) {
  /** The filters the chips cannot show — a language, a distance, a way of working — as a count on the Filters pill. */
  const otherFilterCount = activeFilterCount(filters) - BOOLEAN_FILTER_KEYS.filter((key) => filters[key]).length;
  /** The kind the band has narrowed to, if any — the heading has to say what the list is. */
  const pickedKind = careKinds.find((k) => filters.professions.includes(k.id))?.plural ?? null;
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
        <span className="header-brand">
          <Wordmark />
          {/* RADIANT: the suburb the search is measured from, beside the brand — the one fact the
              header holds that changes from person to person. Absent when no place is set. */}
          {place && <span className="results-place">{place}</span>}
        </span>
        <button className="text-action" type="button" onClick={onReset}>Start over</button>
      </header>

      <div className="results-head">
        {/* O237 (founder-directed, "improve aesthetic and minimalism … just show the results"):
            the head is the search summary and, when a suburb is known, the map. The place is set
            on the Profile tab (or carried by a link); the verdict sentences, "no listed GP matches
            every part", "the first N answer equally well", "nearer to X comes first", are gone
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
      {/* RADIANT: the quick filters. Every yes/no filter is a pill the person can switch here,
          filled when it is on; the filters that are not yes/no (a language, a distance, a way of
          working) are counted on the Filters pill, which opens the profile where they are set.
          The group keeps its name and its Clear control: what is narrowing the list is visible
          here and can be cleared here, exactly as the grey strip promised. */}
      <div className="filter-strip" role="group" aria-label="Your filters">
        <ul className="filter-chips">
          {BOOLEAN_FILTER_KEYS.map((key) => (
            <li key={key}>
              <button type="button" className="filter-chip" aria-pressed={filters[key]} onClick={() => onToggleFilter(key)}>
                {BOOLEAN_FILTER_LABELS[key]}
              </button>
            </li>
          ))}
          <li>
            <Link className="filter-chip" href="/profile">
              <FunnelSimple size={14} weight="bold" aria-hidden="true" />
              Filters
              {otherFilterCount > 0 && <span className="filter-chip-count">{otherFilterCount}</span>}
            </Link>
          </li>
        </ul>
        {filterLabels.length > 0 && (
          <button className="filter-clear" type="button" onClick={onClearFilters}>Clear</button>
        )}
      </div>

      {/* THE KINDS OF CARE THIS SEARCH REACHES (2026-09-11). ADHD care is multidisciplinary and the
          list was not: one column, mostly GPs, with the profession printed small on the few rows
          that were not one. The band names every kind the search actually found, in the order the
          person's own words point at, and each one narrows the list to it. It only renders when
          there is more than one kind, because a band offering one choice is not a choice — and a
          kind is only on it when the search found somebody of that kind, so no chip is a dead end.
          Word-frugal on purpose: the plural alone, no count and no blurb, because this screen sits
          at the text budget's ceiling and what a kind is for belongs on the kind's own list.
          A plain list with a name, NOT role="group": the role overrode the list semantics and left
          three <li> with no list parent, which axe reads as serious. The filter strip above is the
          pattern — the group is the wrapper, the list is a list. */}
      <div className="finder-professions">
      {careKinds.length > 1 && (
        <ul className="care-kinds" aria-label="Kinds of care">
          {careKinds.slice(0, 3).map((kind) => (
            <li key={kind.id}>
              <button
                type="button"
                className="care-kind"
                data-kind={kind.id}
                aria-pressed={filters.professions.includes(kind.id)}
                onClick={() => onPickKind(kind.id)}
              >
                {kind.plural}
                <span className="sr-only">, {kind.count} found</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {careKinds.length > 1 && <NativeSelect className="finder-profession" aria-label="Provider profession" value={filters.professions.length === 1 ? filters.professions[0] : ""} onChange={event => onPickKind((event.target.value || null) as Profession | null)}>
        <NativeSelectOption value="">All professions</NativeSelectOption>
        {careKinds.map(kind => <NativeSelectOption key={kind.id} value={kind.id}>{kind.plural}</NativeSelectOption>)}
      </NativeSelect>}
      </div>
      {/* O234, AR24 kind `no-results`: the roster was ranked and the filters left nobody. The
          sentence names the filters as the cause, because that is the one thing the person can
          change, and both ways out are on the screen. */}
      {empty && (
        <div className="results-empty">
          <p className="results-empty-lead">No listed provider answers every filter you set.</p>
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
        {/* transitions.dev text states swap: this heading changes in place when a clarifier answer
            turns "All listed GPs" into "Matches", the moment the product's claim becomes true. The
            old word leaves upward through a small blur while the new one rises in from below, on
            the tap beat, so the change is seen rather than noticed later. */}
        <h2 className="t-text-swap-slot">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={quality === "informed" ? "matches" : pickedKind ?? "all"}
              className="t-text-swap"
              initial={reducedMotion ? false : { opacity: 0, y: 4, filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -4, filter: "blur(2px)", transition: { duration: 0.15 } }}
              transition={{ duration: 0.15, ease: EASE_OUT }}
            >
              {/* 2026-09-11: with a kind picked, "All listed providers" was over a list of two
                  psychologists — the heading has to name what the list actually is. */}
              {quality === "informed" ? "Matches" : pickedKind ? <>Listed <em>{pickedKind}</em></> : <>All listed <em>providers</em></>}
            </motion.span>
          </AnimatePresence>
        </h2>
        <span className="results-list-tools">
          {/* RADIANT: the mark beside the count, only when the order was earned — a badge that
              means "ordered on what you asked for" and is absent when nothing was. */}
          {quality === "informed" && (
            <span className="results-spark" role="img" aria-label="Ordered on what you asked for">
              <Sparkle size={16} weight="fill" aria-hidden="true" />
            </span>
          )}
          {/* O226: the count sits with the list it describes, not two groups up the page. */}
          {matches.length > shown.length && (
            <span className="results-count">
              {/* Number pop-in: keyed on the value, so the digits re-enter only when the count
                  actually changes, a filter narrowing the list, a "show more" widening it. */}
              <span><span className="sr-only">{shown.length}</span><NumberTicker value={shown.length} aria-hidden="true" className="finder-count-number" /></span> of {matches.length}
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
              aria-controls={mapShown ? "nearby-map-panel" : undefined}
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
          it cannot describe an order the list does not have, and it changes voice in the three
          cases where there is no real order rather than dressing them up as one.
          It sits under the heading, not above it: the heading names the group, the line qualifies
          it, and a person who already trusts the order can skip a line of small grey text where
          they could not skip a paragraph. It arrives on the head's own spring at the head's own
          delay, so it reads as part of that block rather than a second, later event.
          The tie note joins it as a second sentence in the same paragraph rather than a second
          line: it is only ever present in the `informed` case, where it narrows a claim the first
          sentence just made, and two greys stacked would read as a warning stack. */}
      {/* Phase M (ADR 0007): the other way in. A listing shows everybody and leaves the choosing to
          the reader; a match proposes three, each with a reason, and each GP answers from their
          side. Offered here as a sentence and a link, never as a redirect, because the finder
          is the product's front door and this is a second one beside it. */}

      </>
      )}

      <div className={mapShown ? "results-browser has-map" : "results-browser"}>
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
            order changing is the product's whole argument, so rows GLIDE to their new
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
              className={index === 0 && quality === "informed" ? "clinician-row is-lead" : "clinician-row"}
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
              // The lift is HERE and not in `globals.css`, and it has to be: when this row's
              // entrance settles, motion leaves `transform: none` as an INLINE style, and an
              // inline declaration beats any stylesheet rule without `!important`. A CSS
              // `.clinician-row:hover { transform: ... }` therefore computes to `none` and does
              // nothing — measured, after writing one. Every hover state the app already had is
              // colour and shadow only, which is why the gap never showed: those are the
              // properties motion does not write.
              //
              // BOTH CARRY THEIR OWN TRANSITION, and that is the point of them. The `transition`
              // prop above is this component's default for EVERY animation on it, and it holds the
              // entrance stagger's `delay` — up to 200ms at the fifth row. Inherited, that delay
              // lands on the pointer states too: the row would wait a fifth of a second before
              // acknowledging a hover or a press, on the exact interaction where latency is most
              // felt. `PRESS_SPRING` is the curve the app's other pressables already use, and it
              // has no delay to inherit. (The press was already here and already inheriting it —
              // the lift is what made it visible.)
              whileHover={reducedMotion ? undefined : { y: -2, transition: PRESS_SPRING }}
              whileTap={reducedMotion ? undefined : { scale: 0.985, transition: PRESS_SPRING }}
            >
              {/* O67: the same layoutId as the profile's portrait frame, so the chosen
                  GP's image travels from this slot into the hero as ONE object, the
                  continuity is shown, not asserted by the repeated name. The wrapper
                  exists because layoutId needs a measurable box of its own. */}
              <motion.span
                className="row-portrait-anchor"
                layoutId={`gp-portrait-${item.id}`}
                data-portrait-of={item.id}
              >
                <ClinicianPortrait clinician={item} variant="thumb" eager={index < 5} />
              </motion.span>
              <span className="row-copy"><strong>{item.name}</strong>
                {/* O217: an invented entry says so ON THE ROW, before any other fact about it —
                    the label is the disclosure mechanism, not the name or the copy. */}
                <small className="row-focus">{professionOf(item) !== "gp" ? `${professionLabel(professionOf(item))} · ` : ""}{fitFor?.(item) ?? (reasons.slice(0, 1).join(", ") || item.focus)}</small>
                {/* O85: every place they consult, one label — a second location is a
                    fact the reader sees, and the distance sentence names which rooms
                    it measured when that matters. */}
                {/* O130: `row-location`, not `row-availability`. The accent on that class is a
                    fossil of `nextAvailable`, a written-in appointment time, deleted when the
                    roster became real people, and it had been painting a static suburb ever
                    since. A location is not a value that changes; the closed-books note below
                    is, and keeps it. */}
                <small className="row-location">
                  <MapPin size={14} weight="fill" aria-hidden="true" />
                  {away ? `${locationLabel(item)}, ${away}` : locationLabel(item)}
                </small>
                {/* Closed books never outrank open ones at equal fit, and never hide
                    either, the row says why somebody unactionable is still here (O4).
                    The "they fit what you asked" sentence only renders when a fit was
                    actually computed; otherwise the neutral fact stands alone. */}
                {!item.acceptingNewPatients && closedBooksNote(item, request) && (
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
          {matches.length - shown.length} more
        </motion.button>
      )}
    </MotionScreen>
  );
}
