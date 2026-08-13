// W127: where the pathway catalogue and its attestations live for a running console.
//
// W118 and W119 keep their data as values and their functions pure, which is right — a
// governance chain that reaches for storage is one you cannot replay in a test. But a console
// has to read the catalogue from somewhere, so this is that somewhere and nothing else.
//
// It seeds from `SHIPPED_PATHWAYS` and `SHIPPED_ATTESTATIONS`, both of which are empty and
// pinned empty by their own units' tests. That is the load-bearing fact about this module: the
// running product's catalogue starts at zero because the shipped one is zero, so the sign-off
// dashboard's real state and its "nothing is signed off" state are the same state rather than
// a placeholder standing in for one.
//
// Pathways are CONTENT, not practice data. There is deliberately no practice scoping here: a
// pathway signed off by a specialist is signed off, and per-practice copies would mean N
// versions of a clinical document with no single answer to "what was in force in March".
// Which clinicians at a practice may be offered one is W123's question and is scoped there.

import { replayPathway, SHIPPED_PATHWAYS, type PathwayEvent, type PathwayVersion } from "./versioning";
import { SHIPPED_ATTESTATIONS, type PathwayAttestation } from "./approval";

interface RegistryState {
  events: PathwayEvent[];
  attestations: PathwayAttestation[];
}

const globalStore = globalThis as { __meherrPathwayRegistry?: RegistryState };

function initial(): RegistryState {
  return { events: [...SHIPPED_PATHWAYS], attestations: [...SHIPPED_ATTESTATIONS] };
}

function state(): RegistryState {
  globalStore.__meherrPathwayRegistry ??= initial();
  return globalStore.__meherrPathwayRegistry;
}

export function resetPathwayRegistry(): void {
  globalStore.__meherrPathwayRegistry = initial();
}

export function getPathwayEvents(): readonly PathwayEvent[] {
  return state().events;
}

export function getPathwayAttestations(): readonly PathwayAttestation[] {
  return state().attestations;
}

/** Append catalogue events. Used by setup and by the mock seed route; never by a page. */
export function addPathwayEvents(events: readonly PathwayEvent[]): void {
  state().events.push(...events);
}

export function addPathwayAttestations(attestations: readonly PathwayAttestation[]): void {
  state().attestations.push(...attestations);
}

/** Every pathway id the catalogue knows about, in a stable order. */
export function pathwayIds(): string[] {
  return [...new Set(state().events.map((event) => event.pathwayId))].sort();
}

/** Every version of every pathway, replayed. The catalogue as a flat list. */
export function allVersions(): PathwayVersion[] {
  return pathwayIds().flatMap((pathwayId) => replayPathway(getPathwayEvents(), pathwayId).versions);
}
