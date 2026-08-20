// W235 (O74): the outbound-handoff store — attribution's count, owned instead of evaporating.
//
// O28 made outbound booking intent COUNTABLE (every booking link routes through /go/<id>,
// which 302s to Healthengine) and O31 logged one structured line per click. But that line
// lands in Vercel runtime logs, which the free tier retains for about an hour — so the one
// conversion-adjacent number this product has was evaporating daily. This store is the same
// count with a floor under it: append-only JSONL in the W213/W226 pattern, one row per
// handoff.
//
// WHAT A ROW IS, AND DELIBERATELY IS NOT. A row is { clinicianId, surface, day } — the
// clinician validated against the roster, the surface the /go route's existing allow-list
// shape, the timestamp truncated to the DAY. Nothing about the person: no IP, no user agent,
// no session id, no full timestamp (an exact time plus a small roster is a re-identification
// seed this product refuses to hold). The person is not the unit of measurement; the handoff
// is. That is what lets this file exist without touching a founder gate.
//
// THE HONEST LIMIT, STATED WHERE IT LIVES: on serverless the filesystem is ephemeral, so in
// production the durable copy is still the platform's logs until the Supabase phase gives
// stores a real backend. This module is the mechanism-of-record SHAPE — live wherever the
// filesystem persists (local, e2e, self-hosted), the same posture every other store in this
// tree ships with. The /go route records BEST-EFFORT: a store hiccup must never break the
// redirect, because the redirect is the product.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { clinicians } from "@/demo/clinicians";

export interface OutboundHandoff {
  clinicianId: string;
  surface: string;
  /** YYYY-MM-DD, practice-day granularity — deliberately no finer (see the header). */
  day: string;
}

function defaultStorePath(): string {
  const configured = process.env.ADHDME_OUTBOUND_PATH?.trim();
  return configured || path.join(process.cwd(), ".data", "outbound-handoffs.jsonl");
}

const SURFACE_SHAPE = /^[a-z-]{1,24}$/;

/**
 * Record one handoff. Returns false (never throws) when the row is refused or the write
 * fails — the caller is a redirect that must complete regardless.
 */
export function recordOutbound(
  clinicianId: string,
  surface: string,
  options: { filePath?: string; now?: Date } = {},
): boolean {
  try {
    // Roster-validated: a row for a clinician who does not exist is noise that would read
    // as signal in every tally after them. Unknown ids were already redirected to /finder
    // by the route, so nothing legitimate is lost here.
    if (!clinicians.some((c) => c.id === clinicianId)) return false;
    if (!SURFACE_SHAPE.test(surface)) return false;
    const row: OutboundHandoff = {
      clinicianId,
      surface,
      day: (options.now ?? new Date()).toISOString().slice(0, 10),
    };
    const filePath = options.filePath ?? defaultStorePath();
    mkdirSync(path.dirname(filePath), { recursive: true });
    appendFileSync(filePath, `${JSON.stringify(row)}\n`, "utf8");
    return true;
  } catch {
    return false;
  }
}

/** Every stored handoff, tolerant of a torn tail line (append-only files earn one). */
export function listOutbound(filePath = defaultStorePath()): OutboundHandoff[] {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, "utf8")
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        const row = JSON.parse(line) as OutboundHandoff;
        return typeof row.clinicianId === "string" && typeof row.surface === "string" ? [row] : [];
      } catch {
        return [];
      }
    });
}

export interface OutboundTally {
  clinicianId: string;
  total: number;
  /** surface → count, so "where does booking intent form" is one read. */
  bySurface: Record<string, number>;
}

/** Counts per clinician, roster order, zero-rows included — an empty row is a fact too. */
export function tallyOutbound(filePath = defaultStorePath()): OutboundTally[] {
  const rows = listOutbound(filePath);
  return clinicians.map((clinician) => {
    const mine = rows.filter((row) => row.clinicianId === clinician.id);
    const bySurface: Record<string, number> = {};
    for (const row of mine) bySurface[row.surface] = (bySurface[row.surface] ?? 0) + 1;
    return { clinicianId: clinician.id, total: mine.length, bySurface };
  });
}
