// The finder's roster, as one pure reading the screen and its tests share.
//
// `care-finder.tsx` used to derive three rosters inline — the filtered one, the one the sentence's
// named kind narrowed, and the one the kinds band counted off — and the third read the SAVED
// filters while the list ran over the saved filters plus what the sentence asked for. So a
// sentence that said "autism" narrowed the list to providers who declare it, the band still
// offered "GPs · 20", and picking it emptied the screen: exactly the dead end the band exists to
// prevent. Every roster here is derived from the same filters the list runs over.

import { applyFilters, relaxations, type Filters } from "./filters";
import { nearestKm, professionOf, type Clinician } from "@/demo/clinicians";
import { profession, professionsMentioned, type Profession } from "@/support/professions";
import type { SuburbPoint } from "@/geo/suburbs";

export interface CareKind {
  id: Profession;
  count: number;
  plural: string;
}

/** A way out of an empty list: one filter dropped, and how many providers that brings back. */
export interface WayOut {
  label: string;
  filters: Filters;
  count: number;
}

const km = (origin: SuburbPoint | null) => (c: Clinician) => (origin ? nearestKm(c, origin) : null);

/**
 * The roster a search runs over: every filter, then the kinds the sentence names.
 *
 * The profile's kind filter wins over the sentence's: it is the set the person made, and the
 * select on the results screen shows it. The sentence's kind is the default when the profile
 * holds none — "a psychologist near Beecroft" is a psychologist search without a trip to the
 * profile. Read from the words alone (`professionsMentioned`), never inferred from a need.
 */
export function searchRoster(roster: readonly Clinician[], filters: Filters, request: string, origin: SuburbPoint | null): Clinician[] {
  const filtered = applyFilters(roster, filters, origin, km(origin));
  if (filters.professions.length > 0) return filtered;
  const named = professionsMentioned(request);
  return named.length === 0 ? filtered : filtered.filter((c) => named.includes(professionOf(c)));
}

/**
 * The kinds of professional this search reaches, richest first, the sentence's own kinds ahead.
 *
 * Counted off every filter BUT the kind filter — a band that collapsed to the kind you had just
 * picked would be a dead end — and off the same filters the list runs over, so every kind here
 * leads to a list of exactly `count`, never to an empty screen.
 */
export function careKindsFor(roster: readonly Clinician[], filters: Filters, request: string, origin: SuburbPoint | null): CareKind[] {
  const named = professionsMentioned(request);
  const counts = new Map<Profession, number>();
  for (const c of applyFilters(roster, { ...filters, professions: [] }, origin, km(origin))) {
    const p = professionOf(c);
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => (Number(named.includes(b[0])) - Number(named.includes(a[0]))) || b[1] - a[1])
    .map(([id, count]) => ({ id, count, plural: profession(id).plural }));
}

/**
 * The ways out of an empty list: each filter the device holds that, dropped on its own, brings
 * somebody back — most first. `effective` is how the screen turns the held set into the set the
 * list actually runs over (the sentence's own care asks ride along); it is applied to every
 * candidate so the count stated is the count the tap produces.
 */
export function waysOut(
  roster: readonly Clinician[],
  held: Filters,
  request: string,
  origin: SuburbPoint | null,
  effective: (filters: Filters) => Filters = (f) => f,
): WayOut[] {
  if (searchRoster(roster, effective(held), request, origin).length > 0) return [];
  return relaxations(held)
    .map((r) => ({ ...r, count: searchRoster(roster, effective(r.filters), request, origin).length }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
}
