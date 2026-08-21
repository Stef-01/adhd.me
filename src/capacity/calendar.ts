// W227: the calendar as declared data, and the refusal that nothing seasonal is inferred.
//
// TWO HALVES, AND THE FIRST ONE SHIPS EMPTY. W56's posture, for the same reason it was right
// there: the loader is the guarantee, the values are a data change behind a source somebody has
// actually opened.
//
// THE TEMPTATION HERE IS UNUSUALLY STRONG AND IT POINTS AT WHOEVER WRITES THIS FILE. A public
// holiday calendar looks like the safest data in the tree — everybody knows Anzac Day is 25 April.
// But the dates a diary turns on are the OBSERVED ones: the substitute Monday when a fixed date
// falls on a weekend, which varies by state and by year. Reconstructing those from memory and
// attaching a citation to them would produce a calendar that looks sourced and is not, and a
// forecast that skipped a Monday the practice actually worked. A calendar without a verified
// source is exactly what this loader exists to refuse, including when the refusal lands on its own
// author.
//
// SO `SHIPPED_HOLIDAYS` IS EMPTY AND A TEST PINS IT. Every consumer must already handle a calendar
// that knows nothing, which with an empty catalogue is the only path there is — the same argument
// W56 made about an unsigned-off condition taking the production path in every test run.
//
// THE SECOND HALF IS THE ROW'S ACTUAL GATE: NOTHING SEASONAL IS INFERRED FROM THE PRACTICE'S OWN
// HISTORY. That risk is live rather than hypothetical now that W223 exists. A forecaster that
// explained its own variance seasonally — "Thursdays before Christmas run empty" — would have
// invented a calendar out of six weeks of diary, and it would read as insight rather than as the
// overfitting it is. Six observations of a Thursday cannot distinguish a school holiday from a
// wet week from nothing at all.
//
// THE GUARD IS THEREFORE A PROPERTY OF THE LANE, NOT A RULE IN A COMMENT. A `HolidayCalendar` can
// only be READ — `isHoliday` takes a date and answers from declared entries — and there is no
// function anywhere that returns a calendar, a season or a month DERIVED from occurrences. The
// test asserts that over the shipped forecaster rather than over this module, because this module
// is not where the inference would appear.

/** Where a calendar entry came from. Every field required — an entry cannot exist without one. */
export interface HolidayProvenance {
  /** Enough to identify the source to somebody who wants to check it. */
  citation: string;
  url: string;
  publishedOn: string;
  retrievedOn: string;
}

/**
 * One non-working or reduced-capacity day, as declared.
 *
 * `observedOn` is the date the day is actually taken, which is the only date a diary cares about,
 * and it is a separate field from the nominal one precisely because they differ and the difference
 * is where a remembered calendar goes wrong.
 */
export interface CalendarDay {
  id: string;
  /** The jurisdiction this applies in. A calendar without one is a calendar for nowhere. */
  jurisdiction: string;
  name: string;
  /** The nominal date, as the holiday is named. */
  fallsOn: string;
  /** The date it is actually observed. Often the same; when it differs, this is the one that counts. */
  observedOn: string;
  provenance: HolidayProvenance;
}

export interface CalendarRejection {
  id: string;
  reason: string;
}

export interface HolidayCalendar {
  days: readonly CalendarDay[];
  /** Rows refused at load, with why. Never silently dropped (W56's rule). */
  rejected: readonly CalendarRejection[];
}

/**
 * The shipped calendar. EMPTY, and pinned empty by its own test.
 *
 * Not a stub and not an oversight: see the module note. Filling this requires opening a published
 * source and recording what it says, which is a data change with no code change behind it.
 */
export const SHIPPED_HOLIDAYS: readonly unknown[] = [];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validateProvenance(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return "provenance missing";
  const { citation, url, publishedOn, retrievedOn } = value as Partial<HolidayProvenance>;
  if (typeof citation !== "string" || citation.trim().length < 8) {
    return "citation missing or too short to identify a source";
  }
  if (typeof url !== "string" || !url.startsWith("https://")) return "source url must be https";
  if (typeof publishedOn !== "string" || !ISO_DATE.test(publishedOn)) {
    return "publishedOn missing or not an ISO date";
  }
  if (typeof retrievedOn !== "string" || !ISO_DATE.test(retrievedOn)) {
    return "retrievedOn missing or not an ISO date";
  }
  // A source retrieved before it was published is a citation to something that did not exist yet,
  // which is what a fabricated provenance looks like when somebody fills the fields from memory.
  if (retrievedOn < publishedOn) return "retrievedOn precedes publishedOn";
  return null;
}

/**
 * Load a calendar, refusing every row that cannot be checked — with the reason.
 *
 * The guarantee is a property of this function rather than of today's contents, so it holds for
 * whatever is loaded later. Duplicate ids are refused rather than last-one-wins: a silently
 * overwritten holiday is a working day the practice thinks is closed.
 */
export function loadCalendar(rows: readonly unknown[]): HolidayCalendar {
  const days: CalendarDay[] = [];
  const rejected: CalendarRejection[] = [];
  const seen = new Set<string>();

  rows.forEach((row, index) => {
    const at = `row ${index}`;
    if (typeof row !== "object" || row === null) {
      rejected.push({ id: at, reason: "not an object" });
      return;
    }
    const candidate = row as Partial<CalendarDay>;
    const id = typeof candidate.id === "string" && candidate.id.length > 0 ? candidate.id : at;

    if (typeof candidate.id !== "string" || candidate.id.trim().length === 0) {
      rejected.push({ id, reason: "id missing" });
      return;
    }
    if (seen.has(candidate.id)) {
      rejected.push({ id, reason: "duplicate id — a silently overwritten holiday is a day the practice thinks it is closed" });
      return;
    }
    if (typeof candidate.jurisdiction !== "string" || candidate.jurisdiction.trim().length === 0) {
      rejected.push({ id, reason: "jurisdiction missing — a holiday without one applies nowhere" });
      return;
    }
    if (typeof candidate.name !== "string" || candidate.name.trim().length === 0) {
      rejected.push({ id, reason: "name missing" });
      return;
    }
    if (typeof candidate.fallsOn !== "string" || !ISO_DATE.test(candidate.fallsOn)) {
      rejected.push({ id, reason: "fallsOn missing or not an ISO date" });
      return;
    }
    if (typeof candidate.observedOn !== "string" || !ISO_DATE.test(candidate.observedOn)) {
      rejected.push({ id, reason: "observedOn missing or not an ISO date — the observed date is the one a diary turns on" });
      return;
    }
    const provenanceProblem = validateProvenance(candidate.provenance);
    if (provenanceProblem !== null) {
      rejected.push({ id, reason: provenanceProblem });
      return;
    }

    seen.add(candidate.id);
    days.push(candidate as CalendarDay);
  });

  return { days, rejected };
}

/**
 * Whether a date is a declared non-working day in a jurisdiction.
 *
 * Reads `observedOn`, never `fallsOn`: the substitute day is the one the practice is shut. With an
 * empty calendar this answers `false` for every date, which is the honest answer — "not declared"
 * rather than "known to be a working day" — and is why `calendarKnowsNothing` exists beside it.
 */
export function isDeclaredHoliday(
  calendar: HolidayCalendar,
  jurisdiction: string,
  dayIso: string,
): boolean {
  return calendar.days.some((day) => day.jurisdiction === jurisdiction && day.observedOn === dayIso);
}

/**
 * Whether the calendar holds anything at all for a jurisdiction.
 *
 * A caller that does not check this cannot tell "no holiday that day" from "no calendar" — the
 * same distinction W179 draws between nothing happened and nothing recorded, and the reason a
 * `false` from `isDeclaredHoliday` must never be rendered as "open as usual".
 */
export function calendarKnowsNothing(calendar: HolidayCalendar, jurisdiction: string): boolean {
  return !calendar.days.some((day) => day.jurisdiction === jurisdiction);
}

export const CALENDAR_UNKNOWN_COPY =
  "No public holiday calendar has been loaded for this practice, so nothing here allows for closures. A day this page treats as ordinary may be one the practice was shut, and that is a gap in what has been recorded rather than a finding about the diary.";
