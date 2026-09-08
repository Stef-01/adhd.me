"use client";

// O233 (founder-directed): the Profile tab.
//
// A Profile tab in an app without accounts is where a placeholder usually goes — a stub with an
// avatar and a row of settings that do nothing. This one shows the only true answer to "what does
// this app know about me": what the DEVICE is holding, read from the same `sessionStorage` record
// the finder resumes from (`src/finder/state.ts`), plus the controls over it.
//
// O234 (founder-directed): AND the person's own filters. Zocdoc, HealthEngine and the NHS finder
// all keep the sentence per search and the standing facts on the profile — where you are, what
// you need a practice to have — and this tab is that. Every filter here is a declared clinician
// fact the finder already reads (`src/finder/filters.ts` says which), held in `localStorage` on
// this device only, applied to the roster before ranking, and shown on the results screen as the
// strip that says why the list is the length it is. The place is set here too: the results
// screen's field and this one write the same record.
//
// Nothing is invented and nothing is stored to fill the screen. Before a first search the honest
// state is empty, and the empty state says what will appear here and gives the action that fills
// it — which is what an empty state is for.

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, MapPin, Quotes, Trash, X } from "@phosphor-icons/react";
import { nearestKm } from "@/demo/clinicians";
import { rosterFor } from "@/demo/synthetic-roster";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { clearRecord, readRecord, placeFrom, type FinderRecord } from "@/finder/state";
import { APPROACHES, type Approach } from "@/demo/roster";
import {
  activeFilterCount,
  applyFilters,
  APPROACH_LABELS,
  BOOLEAN_FILTER_KEYS,
  CONSULT_RECORDING_CHOICES,
  DISTANCE_CHOICES,
  emptyFilters,
  readFilters,
  writeFilters,
  type BooleanFilterKey,
  type ConsultRecordingChoice,
  type DistanceKm,
  type Filters,
} from "@/finder/filters";
import { resolvePlace, suggestPlaces } from "@/geo/suburbs";
import { MATCHABLE_LANGUAGES } from "@/matching/languages";
import { PROFESSION_ENTRIES, type Profession } from "@/support/professions";
import { AppSettings } from "./app-settings";

/** The switch rows, in the order a person reads them: who, how, then what the rooms have. */
const SWITCHES: ReadonlyArray<{ key: BooleanFilterKey; title: string; detail: string }> = [
  { key: "womanGp", title: "Woman GP", detail: "Only GPs who are women." },
  { key: "telehealth", title: "First appointment by telehealth", detail: "GPs who see new people by phone or video first." },
  { key: "bulkBilling", title: "Bulk billing", detail: "GPs whose practice declares bulk billing." },
  { key: "longerAppointments", title: "Longer appointments", detail: "GPs who declare they do not rush a first visit." },
  { key: "wheelchair", title: "Wheelchair access", detail: "Rooms declared accessible." },
  { key: "openBooks", title: "Taking new patients", detail: "Leave off to see GPs with a waitlist too." },
];

const SPRING = { type: "spring", stiffness: 380, damping: 36, mass: 0.85 } as const;
/** SMOOTH: the segment thumb slides between choices — firm, no bounce, a control not a toy. */
const SEGMENT_SPRING = { type: "spring", stiffness: 520, damping: 42, mass: 0.7 } as const;

export function ProfileView() {
  // O243: every entrance here waits for `ready` — the server render carries no opacity: 0 — and
  // every effect has its static equal under reduced motion.
  const reducedMotion = useReducedMotion();
  // Read on the client only: `sessionStorage` does not exist during the server render, and a
  // profile that flashed "nothing yet" before hydrating would be lying for one frame.
  const [record, setRecord] = useState<FinderRecord | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRecord(readRecord(window.sessionStorage));
    const held = readFilters(window.localStorage);
    // The address bar's place, if the person arrived with one and the device holds none.
    const fromUrl = placeFrom(window.location.search);
    setFilters(held.place || !fromUrl ? held : { ...held, place: fromUrl });
    setReady(true);
  }, []);

  /** Every change is written as it is made — there is no Save on a profile, because there is nothing to submit. */
  // O251: the place suggestions — open while the field has focus and two characters, walked with
  // the arrow keys, chosen with Enter or a tap, dismissed with Escape. The person chooses; the
  // gazetteer never resolves a half-typed name on its own (W189).
  const [placeOpen, setPlaceOpen] = useState(false);
  const [placeActive, setPlaceActive] = useState(0);

  const update = (patch: Partial<Filters>): void => {
    setFilters((current) => {
      const next = { ...current, ...patch };
      writeFilters(window.localStorage, next);
      return next;
    });
  };

  const forget = (): void => {
    clearRecord(window.sessionStorage);
    setRecord(null);
  };

  const clearFilterSet = (): void => update({ ...emptyFilters(), place: filters.place });

  const words = record?.request?.trim() ?? "";
  const place = filters.place;
  const origin = resolvePlace(place);
  const suggestions = placeOpen ? suggestPlaces(place) : [];
  const choosePlace = (suburb: string): void => {
    update({ place: suburb });
    setPlaceOpen(false);
    setPlaceActive(0);
  };
  const onPlaceKey = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setPlaceActive((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setPlaceActive((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choosePlace(suggestions[placeActive]?.suburb ?? suggestions[0]!.suburb);
    } else if (event.key === "Escape") {
      setPlaceOpen(false);
    }
  };
  const held = ready && (words.length > 0 || place.length > 0);
  const onCount = activeFilterCount(filters);
  /**
   * RADIANT: the live count on the sticky bar — the listed GPs these filters leave, measured from
   * the suburb above. Over the listed roster with its example profiles, which is what the finder
   * shows unless the examples switch on its welcome screen is off; that switch is the finder's
   * own state and this tab cannot see it, so the number here is the listed count.
   */
  const shownCount = applyFilters(rosterFor(true), filters, origin, (c) => (origin ? nearestKm(c, origin) : null)).length;

  const toggleProfession = (p: Profession): void => {
    const has = filters.professions.includes(p);
    update({ professions: has ? filters.professions.filter((x) => x !== p) : [...filters.professions, p] });
  };

  const toggleApproach = (a: Approach): void => {
    const has = filters.approach.includes(a);
    update({ approach: has ? filters.approach.filter((x) => x !== a) : [...filters.approach, a] });
  };

  const toggleLanguage = (language: string): void => {
    const has = filters.languages.includes(language);
    update({ languages: has ? filters.languages.filter((l) => l !== language) : [...filters.languages, language] });
  };

  return (
    <main id="main-content" className="me-screen app-page-with-tabs">
      {/* O233: the app's own header. `public-nav.spec.ts` holds every public route to showing the
          mark and reaching home from it, and it was right to fail this one — a tab with no header
          is a screen a person can be lost on. The settings control sits here for the same reason
          it sits on the finder: one place, every surface. */}
      <div className="minimal-header has-settings me-chrome">
        <Link className="wordmark finder-wordmark" href="/" aria-label="ADHD.ME, back to the finder" translate="no">ADHD.ME</Link>
        <AppSettings />
      </div>
      {/* RADIANT: the founder's filter screen — the eyebrow and Reset all on one row, the title
          with the suburb beside it and the close control on the next. Reset all is the same act
          as "Clear the filters" at the foot of the list; the place is kept, as it always was. */}
      <header className="me-head">
        <div className="me-head-row">
          <span className="me-eyebrow">Filter providers</span>
          <button type="button" className="me-reset" onClick={clearFilterSet}>Reset all</button>
        </div>
        <div className="me-head-row me-head-title">
          <span className="me-head-lead">
            <h1>Search <em>Filters</em></h1>
            {place && <span className="me-head-place">{place}</span>}
          </span>
          <Link href="/" className="me-close" aria-label="Close the filters and go back to the finder">
            <X size={16} weight="bold" aria-hidden="true" />
          </Link>
        </div>
        <p>Everything below is held on this device only, for this tab.</p>
      </header>

      {/* ── Where you are ─────────────────────────────────────────────────────────────────── */}
      <section className="me-section" aria-labelledby="me-place-title">
        <h2 id="me-place-title">Where you are</h2>
        <div className="me-place">
          <label htmlFor="me-place">Suburb or postcode</label>
          <input
            id="me-place"
            name="place"
            value={place}
            onChange={(event) => { update({ place: event.target.value.slice(0, 80) }); setPlaceOpen(true); setPlaceActive(0); }}
            onFocus={() => setPlaceOpen(true)}
            onBlur={() => window.setTimeout(() => setPlaceOpen(false), 120)}
            onKeyDown={onPlaceKey}
            placeholder="Southport or 4215"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestions.length > 0}
            aria-controls="me-place-options"
            aria-activedescendant={suggestions.length > 0 ? `me-place-option-${placeActive}` : undefined}
          />
          <ul id="me-place-options" className="me-place-options" role="listbox" aria-label="Places" hidden={suggestions.length === 0}>
            {suggestions.map((s, index) => (
              <li
                key={`${s.suburb}-${s.postcode}`}
                id={`me-place-option-${index}`}
                role="option"
                aria-selected={index === placeActive}
                className={index === placeActive ? "me-place-option is-active" : "me-place-option"}
                onMouseDown={(event) => { event.preventDefault(); choosePlace(s.suburb); }}
                onMouseEnter={() => setPlaceActive(index)}
              >
                <span className="me-place-option-name">{s.suburb}</span>
                <span className="me-place-option-code">{s.postcode}</span>
              </li>
            ))}
          </ul>
          <p className="me-place-status">
            {place.trim() === ""
              ? "Nearer GPs come first among equal matches, and the map after you search is drawn from here."
              : origin
                ? `Distances are measured from ${origin.suburb} (${origin.postcode}).`
                : "We do not cover that location yet."}
          </p>
        </div>
      </section>

      {/* ── Filters ───────────────────────────────────────────────────────────────────────── */}
      <section className="me-section" aria-labelledby="me-filters-title">
        <div className="me-section-head">
          <h2 id="me-filters-title">Filters</h2>
          <span className="me-filter-count" aria-live="polite">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={onCount}
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -6, transition: { duration: 0.1 } }}
                transition={{ type: "spring", stiffness: 520, damping: 34 }}
                style={{ display: "inline-block" }}
              >
                {onCount === 0 ? "None on" : onCount === 1 ? "1 on" : `${onCount} on`}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>
        <p className="me-section-lead">
          Each one narrows the list to providers who declare it. The words you search with still decide the order.
        </p>

        <ul className="me-switches">
          {SWITCHES.map((row, index) => (
            <motion.li
              key={row.key}
              initial={ready && !reducedMotion ? { opacity: 0, x: -10 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...SPRING, delay: index * 0.04, opacity: { duration: 0.2, delay: index * 0.04 } }}
            >
              <label className="me-switch">
                <span>
                  <strong>{row.title}</strong>
                  <small>{row.detail}</small>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={filters[row.key]}
                  onChange={(event) => update({ [row.key]: event.target.checked } as Pick<Filters, BooleanFilterKey>)}
                />
                <span className="me-switch-track" aria-hidden="true" />
              </label>
            </motion.li>
          ))}
        </ul>

        <div className="me-group" role="group" aria-labelledby="me-languages-title">
          <h3 id="me-languages-title">Speaks, besides English</h3>
          <ul className="me-chips">
            {MATCHABLE_LANGUAGES.map((language) => {
              const on = filters.languages.includes(language);
              return (
                <li key={language}>
                  <motion.button
                    type="button"
                    className={on ? "me-chip is-on" : "me-chip"}
                    aria-pressed={on}
                    onClick={() => toggleLanguage(language)}
                    whileTap={reducedMotion ? undefined : { scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 600, damping: 48 }}
                  >
                    {/* A real tick, hidden from the name: the button is still "Tamil" to a reader,
                        and the on-state is never colour alone. */}
                    {on && <span className="me-chip-tick" aria-hidden="true">✓</span>}
                    {language}
                  </motion.button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="me-group me-distance">
          <h3>How far you would travel</h3>
          {/* Pressed buttons rather than radios: every choice is its own tab stop, which is what the
              keyboard sweep holds every public control to, and the pressed state is read as such. */}
          <div className="me-segments" role="group" aria-label="How far you would travel">
            {([null, ...DISTANCE_CHOICES] as DistanceKm[]).map((choice) => {
              const on = filters.withinKm === choice;
              const label = choice === null ? "Any" : `${choice} km`;
              return (
                <button
                  key={label}
                  type="button"
                  className={on ? "me-segment is-on" : "me-segment"}
                  aria-pressed={on}
                  onClick={() => update({ withinKm: choice })}
                >
                  {on && <motion.span className="me-segment-thumb" layoutId="seg-distance" aria-hidden="true" transition={reducedMotion ? { duration: 0 } : SEGMENT_SPRING} />}
                  {label}
                </button>
              );
            })}
          </div>
          <p className="me-group-note">
            {filters.withinKm !== null && !origin
              ? "A distance needs a suburb above before it can apply."
              : "Straight-line, from the suburb above. GPs who see new people by telehealth first are always included."}
          </p>
        </div>

        {/* 2026-09-08 (PRD §38): which KIND of professional. Empty is every kind; the support path
            sets one on the person's behalf when they choose "See providers" from a problem. */}
        <div className="me-group" role="group" aria-labelledby="me-profession-title">
          <h3 id="me-profession-title">Kind of support</h3>
          <ul className="me-chips">
            {PROFESSION_ENTRIES.map((entry) => {
              const on = filters.professions.includes(entry.id);
              return (
                <li key={entry.id}>
                  <motion.button
                    type="button"
                    className={on ? "me-chip is-on" : "me-chip"}
                    aria-pressed={on}
                    onClick={() => toggleProfession(entry.id)}
                    whileTap={reducedMotion ? undefined : { scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 600, damping: 48 }}
                  >
                    {on && <span className="me-chip-tick" aria-hidden="true">✓</span>}
                    {entry.plural.charAt(0).toUpperCase() + entry.plural.slice(1)}
                  </motion.button>
                </li>
              );
            })}
          </ul>
          <p className="me-group-note">
            Leave every chip off to see all of them. Not sure which kind? The support path starts from the problem instead.
          </p>
        </div>

        {/* O248 (founder-directed): how the GP works — whole-person, functional-health, wearables —
            as the GP declares it. Each chip requires the declaration; GPs who have not said are
            left out of a chosen chip rather than assumed. Nothing here is a claim about outcomes. */}
        <div className="me-group" role="group" aria-labelledby="me-approach-title">
          <h3 id="me-approach-title">How they work</h3>
          <ul className="me-chips">
            {APPROACHES.map((a) => {
              const on = filters.approach.includes(a);
              return (
                <li key={a}>
                  <motion.button
                    type="button"
                    className={on ? "me-chip is-on" : "me-chip"}
                    aria-pressed={on}
                    onClick={() => toggleApproach(a)}
                    whileTap={reducedMotion ? undefined : { scale: 0.94 }}
                    transition={{ type: "spring", stiffness: 600, damping: 48 }}
                  >
                    {on && <span className="me-chip-tick" aria-hidden="true">✓</span>}
                    {APPROACH_LABELS[a]}
                  </motion.button>
                </li>
              );
            })}
          </ul>
          <p className="me-group-note">
            As the GP declares it: a whole-person view, openness to functional health, or a look at
            data from a wearable you bring.
          </p>
        </div>

        {/* O236 (founder-directed): a fact modern patients ask about first — whether the consult is
            recorded and transcribed by AI. A declared practice fact, filtered like the others;
            GPs who have not said are left out of either choice rather than assumed. */}
        <div className="me-group">
          <h3>Notes during the consult</h3>
          <div className="me-segments me-segments-3" role="group" aria-label="Notes during the consult">
            {CONSULT_RECORDING_CHOICES.map((choice: ConsultRecordingChoice) => {
              const on = filters.consultRecording === choice;
              const label = choice === "any" ? "Any" : choice === "ai-scribe" ? "AI scribe" : "No AI";
              return (
                <button
                  key={choice}
                  type="button"
                  className={on ? "me-segment is-on" : "me-segment"}
                  aria-pressed={on}
                  onClick={() => update({ consultRecording: choice })}
                >
                  {on && <motion.span className="me-segment-thumb" layoutId="seg-consult" aria-hidden="true" transition={reducedMotion ? { duration: 0 } : SEGMENT_SPRING} />}
                  {label}
                </button>
              );
            })}
          </div>
          <p className="me-group-note">
            Some GPs use an AI scribe that records and transcribes the consult into notes, with your
            consent each time; others write notes without any AI recording. Choosing one shows only
            GPs who have declared it.
          </p>
        </div>

        {onCount > 0 && (
          <button className="me-forget" type="button" onClick={clearFilterSet}>
            <Trash size={16} weight="regular" aria-hidden="true" />
            Clear the filters
          </button>
        )}
      </section>

      {/* ── What this tab holds ───────────────────────────────────────────────────────────── */}
      <section className="me-section" aria-labelledby="me-held-title">
        <h2 id="me-held-title">This search</h2>
        {held ? (
          <>
            <ul className="me-facts">
              {words.length > 0 && (
                <li>
                  <Quotes size={18} weight="regular" aria-hidden="true" />
                  <span>
                    <small>What you described</small>
                    <strong>{words}</strong>
                  </span>
                </li>
              )}
              {place.length > 0 && (
                <li>
                  <MapPin size={18} weight="regular" aria-hidden="true" />
                  <span>
                    <small>Where you said you are</small>
                    <strong>{place}</strong>
                  </span>
                </li>
              )}
            </ul>

            <div className="me-actions">
              <Link className="me-primary" href="/">
                Back to your search<ArrowRight size={17} weight="bold" aria-hidden="true" />
              </Link>
              {words.length > 0 && (
                <button className="me-forget" type="button" onClick={forget}>
                  <Trash size={16} weight="regular" aria-hidden="true" />
                  Forget what I typed
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="me-empty">
            <p>
              Once you describe the GP you are looking for, your words and the suburb you gave will
              appear here, and you can clear them from this device in one tap.
            </p>
            <Link className="me-primary" href="/">
              Describe what you need<ArrowRight size={17} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>

      <p className="me-privacy">
        Nothing you type is sent anywhere. Your filters stay on this device; your words go when this tab closes. <Link href="/privacy">How this works</Link>
      </p>
      {/* RADIANT: the sticky bar the founder drew above the tab bar — the one act this screen is
          for, with the count the filters leave. It goes to the finder, which resumes the search. */}
      <div className="me-sticky">
        <Link className="me-show" href="/">
          Show <span key={shownCount} className="t-digit">{shownCount}</span> provider{shownCount === 1 ? "" : "s"}
          <ArrowRight size={16} weight="bold" aria-hidden="true" />
        </Link>
      </div>
    </main>
  );
}
