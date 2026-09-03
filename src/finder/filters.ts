// O234 (founder-directed): the person's own filters — held on the device, applied before ranking.
//
// WHAT A FILTER IS HERE, AND WHAT IT IS NOT. The finder orders the roster around a sentence, and
// `src/matching/needs.ts` reads preferences OUT of that sentence ("a woman GP", "bulk billed") as
// soft signals the ranking weighs. A filter is the other thing: a fact about the person that does
// not change from search to search — they need a ramp, they need Tamil, they will not travel past
// Hornsby — and that NARROWS the roster rather than reordering it. Zocdoc, HealthEngine and the
// NHS finder all split it the same way: the query is per search, the filters live on the profile.
// So these live on the Profile tab, are applied to the roster before `rankCliniciansNear` runs,
// and the results screen says how many are on and gives one control that clears them.
//
// WHERE IT LIVES. `localStorage`, under a versioned key, on the same terms as `state.ts`'s record:
// a filter set is a preference, not a sentence, so it survives the tab (a person who needs
// wheelchair access needs it next week too), and it never reaches a URL, a history entry, a log
// line or an analytics event — plan §2.8 Q-A. The place is held here as well as in the address
// bar: the finder still reads `?place=` (a link that carries a suburb must still re-rank), but
// the profile is where a person SETS it, and a search started from the front door reads it back.
//
// EVERY FIELD IS A DECLARED CLINICIAN FACT. `holdsPreference` is the same function the ranking
// uses, so "woman GP" on the profile and "a woman GP" in a sentence agree on who qualifies; the
// language list is `MATCHABLE_LANGUAGES`, the set the roster actually declares; wheelchair access
// and open books are roster fields. No filter is inferred from anything a person wrote.

import { holdsPreference } from "@/matching/needs";
import { MATCHABLE_LANGUAGES } from "@/matching/languages";
import { APPROACHES, type Approach } from "@/demo/roster";
import type { SuburbPoint } from "@/geo/suburbs";

export const FILTERS_VERSION = 1;
/** The localStorage key. Versioned in the name too, so two shapes never share one slot. */
export const FILTERS_KEY = `adhdme.filters.v${FILTERS_VERSION}`;

/** The distance ceilings a person can choose; `null` is no ceiling. Straight-line, as everywhere. */
export const DISTANCE_CHOICES = [5, 10, 20] as const;
export type DistanceKm = (typeof DISTANCE_CHOICES)[number] | null;

export interface Filters {
  v: typeof FILTERS_VERSION;
  /** Suburb or postcode the person said they are in. Not a device location — typed, like the finder's field. */
  place: string;
  womanGp: boolean;
  telehealth: boolean;
  bulkBilling: boolean;
  longerAppointments: boolean;
  wheelchair: boolean;
  /** Only GPs whose books are declared open. */
  openBooks: boolean;
  /** Languages beside English the GP must declare. A subset of `MATCHABLE_LANGUAGES`. */
  languages: string[];
  /** Furthest consulting location to include, in km from `place`. Ignored until `place` resolves. */
  withinKm: DistanceKm;
  /**
   * O236: how the GP takes notes. "ai-scribe" keeps only GPs who declare they use an AI scribe (with
   * consent); "no-ai" keeps only GPs who declare they never record or AI-transcribe a consult;
   * "any" does not narrow. Undeclared GPs are excluded by either choice — silence is not a yes.
   */
  consultRecording: ConsultRecordingChoice;
  /** O248: ways of working the GP must declare. A subset of `APPROACHES`; every chosen one is required. */
  approach: Approach[];
}

export const CONSULT_RECORDING_CHOICES = ["any", "ai-scribe", "no-ai"] as const;

/** The declaration, said the way the GP declares it — a way of working, never a claim about outcomes. */
export const APPROACH_LABELS: Readonly<Record<Approach, string>> = {
  holistic: "Whole-person approach",
  functional: "Open to functional health",
  wearables: "Open to wearable data",
};
export type ConsultRecordingChoice = (typeof CONSULT_RECORDING_CHOICES)[number];

/** The structural slice of a clinician a filter reads — the same shape `holdsPreference` takes, plus the roster facts. */
export interface Filterable {
  gender: string;
  telehealthFirstAppointment?: boolean;
  manner: readonly string[];
  practicalSignals: readonly string[];
  languages: readonly string[];
  wheelchairAccessible: boolean;
  acceptingNewPatients: boolean;
  consultRecording?: "ai-scribe" | "no-ai";
  approach?: readonly Approach[];
}

export function emptyFilters(): Filters {
  return {
    v: FILTERS_VERSION,
    place: "",
    womanGp: false,
    telehealth: false,
    bulkBilling: false,
    longerAppointments: false,
    wheelchair: false,
    openBooks: false,
    languages: [],
    withinKm: null,
    consultRecording: "any",
    approach: [],
  };
}

export const BOOLEAN_FILTER_KEYS = ["womanGp", "telehealth", "bulkBilling", "longerAppointments", "wheelchair", "openBooks"] as const;
export type BooleanFilterKey = (typeof BOOLEAN_FILTER_KEYS)[number];

function isDistance(value: unknown): value is DistanceKm {
  return value === null || (DISTANCE_CHOICES as readonly number[]).includes(value as number);
}

/** The device's filters, or the empty set when none, another version, or malformed. Never throws. */
export function readFilters(storage: Pick<Storage, "getItem">): Filters {
  let raw: string | null;
  try {
    raw = storage.getItem(FILTERS_KEY);
  } catch {
    return emptyFilters();
  }
  if (!raw) return emptyFilters();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyFilters();
    const r = parsed as Partial<Filters>;
    if (r.v !== FILTERS_VERSION) return emptyFilters();
    if (typeof r.place !== "string") return emptyFilters();
    if (!BOOLEAN_FILTER_KEYS.every((key) => typeof r[key] === "boolean")) return emptyFilters();
    if (!Array.isArray(r.languages) || !r.languages.every((l) => (MATCHABLE_LANGUAGES as readonly string[]).includes(l))) return emptyFilters();
    if (!isDistance(r.withinKm)) return emptyFilters();
    if (!(CONSULT_RECORDING_CHOICES as readonly unknown[]).includes(r.consultRecording)) return emptyFilters();
    if (!Array.isArray(r.approach) || !r.approach.every((a) => (APPROACHES as readonly string[]).includes(a))) return emptyFilters();
    return {
      v: FILTERS_VERSION,
      place: r.place.trim().slice(0, 80),
      womanGp: r.womanGp === true,
      telehealth: r.telehealth === true,
      bulkBilling: r.bulkBilling === true,
      longerAppointments: r.longerAppointments === true,
      wheelchair: r.wheelchair === true,
      openBooks: r.openBooks === true,
      languages: [...r.languages],
      withinKm: r.withinKm ?? null,
      consultRecording: r.consultRecording as ConsultRecordingChoice,
      approach: [...(r.approach as Approach[])],
    };
  } catch {
    return emptyFilters();
  }
}

/** Write the set; an empty set removes the key so a device holds nothing it does not need. */
export function writeFilters(storage: Pick<Storage, "setItem" | "removeItem">, filters: Filters): void {
  try {
    if (activeFilterCount(filters) === 0 && !filters.place.trim()) storage.removeItem(FILTERS_KEY);
    else storage.setItem(FILTERS_KEY, JSON.stringify(filters));
  } catch {
    // Storage refused (private mode, quota): the filters still apply for this render; they just do not persist.
  }
}

export function clearFilters(storage: Pick<Storage, "removeItem">): void {
  try {
    storage.removeItem(FILTERS_KEY);
  } catch {
    // Nothing to clear, or storage refused; either way the device holds nothing.
  }
}

/** How many filters narrow the roster. The place is not a filter — it orders, it does not exclude — but a distance ceiling is. */
export function activeFilterCount(filters: Filters): number {
  let n = BOOLEAN_FILTER_KEYS.filter((key) => filters[key]).length;
  n += filters.languages.length;
  if (filters.withinKm !== null) n += 1;
  if (filters.consultRecording !== "any") n += 1;
  n += filters.approach.length;
  return n;
}

/** The labels of the filters that are on, in a fixed order, for the results screen's chips. */
export function describeFilters(filters: Filters): string[] {
  const out: string[] = [];
  if (filters.womanGp) out.push("Woman GP");
  if (filters.telehealth) out.push("Telehealth");
  if (filters.bulkBilling) out.push("Bulk billing");
  if (filters.longerAppointments) out.push("Longer appointments");
  if (filters.wheelchair) out.push("Wheelchair access");
  if (filters.openBooks) out.push("Taking new patients");
  for (const language of filters.languages) out.push(`Speaks ${language}`);
  if (filters.withinKm !== null) out.push(`Within ${filters.withinKm} km`);
  if (filters.consultRecording === "ai-scribe") out.push("Uses an AI scribe");
  if (filters.consultRecording === "no-ai") out.push("No AI recording");
  for (const a of filters.approach) out.push(APPROACH_LABELS[a]);
  return out;
}

/**
 * Narrow a roster to the clinicians who answer every filter that is on.
 *
 * @param nearestKm How far the clinician's nearest consulting location is from `origin`, or
 *   null when the clinician cannot be placed. Passed in rather than computed so this module
 *   reads no roster geometry of its own — one distance function, the ranking's.
 *
 * Two deliberate readings:
 *   - A distance ceiling applies only once the place resolves; a ceiling with no origin would
 *     exclude everybody, which is a filter deciding something the person has not said.
 *   - A telehealth-first GP passes the distance ceiling — the whole point of a first appointment
 *     by telehealth is that the rooms are not where the person has to get to. A GP who cannot
 *     be placed (a suburb outside the gazetteer) does NOT pass: an unknown distance is not a
 *     short one.
 */
export function applyFilters<T extends Filterable>(
  roster: readonly T[],
  filters: Filters,
  origin: SuburbPoint | null,
  nearestKm: (clinician: T) => number | null,
): T[] {
  return roster.filter((clinician) => {
    if (filters.womanGp && !holdsPreference(clinician, "woman-gp")) return false;
    if (filters.telehealth && !holdsPreference(clinician, "telehealth-first")) return false;
    if (filters.bulkBilling && !holdsPreference(clinician, "bulk-billing")) return false;
    if (filters.longerAppointments && !holdsPreference(clinician, "longer-appointment")) return false;
    if (filters.wheelchair && !clinician.wheelchairAccessible) return false;
    if (filters.openBooks && !clinician.acceptingNewPatients) return false;
    if (filters.languages.some((language) => !clinician.languages.includes(language))) return false;
    if (filters.consultRecording !== "any" && clinician.consultRecording !== filters.consultRecording) return false;
    if (filters.approach.some((a) => !(clinician.approach ?? []).includes(a))) return false;
    if (filters.withinKm !== null && origin) {
      if (clinician.telehealthFirstAppointment === true) return true;
      const km = nearestKm(clinician);
      if (km === null || km > filters.withinKm) return false;
    }
    return true;
  });
}
