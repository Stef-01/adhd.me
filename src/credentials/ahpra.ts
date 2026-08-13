// W111: Ahpra register lookup — read-only, recorded, never inferred.
//
// The public Ahpra register is the authoritative answer to "is this person registered, and
// with what conditions on their practice?". Reading it is how a credential stops being a claim
// the clinician typed and becomes a fact somebody can check. This module does the reading and
// nothing else.
//
// Four boundaries, in the order they would be crossed by accident:
//
//   1. READ-ONLY, AND A LOOKUP IS NOT A CREDENTIAL. `lookup()` returns what the register said
//      and when. It does not create, upgrade or vouch for a credential — W108's model is the
//      only thing that holds one, and binding a lookup to a credential is a later unit's job.
//      Keeping them apart matters because a register hit says "this person is registered", not
//      "this person may do the thing", and collapsing the two is how a registration becomes an
//      implied competence.
//   2. NO INFERENCE FROM ABSENCE. A name that does not match is `not_found`, which means the
//      lookup found nothing — NOT that the person is unregistered. Names are entered
//      differently, registers lag, and searches are imperfect. The union has no "unregistered"
//      member, so the system cannot represent a conclusion this lookup is not entitled to
//      draw. Same shape as W92's refusal to distinguish a missing letter from a missed visit.
//   3. THE LIVE REGISTER IS GATED. The constructor refuses any real Ahpra host, the same
//      posture W28 took for PMS vendors and W36 for Twilio. Scraping or querying the live
//      register touches real practitioners' data and has its own terms; that is a founder
//      decision (G1-class), not something a build unit opens by wiring a URL.
//   4. EVERY RESULT CARRIES ITS AGE. A registration checked in March is evidence about March.
//      `checkedAt` is required, so a caller cannot hold a result without knowing how old it is
//      — the W88 lesson, applied at the point of collection rather than bolted on later.
//
// Notably absent: any notion of a practitioner being "good", "endorsed for" a scope we care
// about, or ranked. The register records registration and restrictions. It does not grade
// people, and neither does this.

export type AhpraRegistrationStatus =
  | "registered"
  | "registered_with_conditions"
  | "suspended"
  | "cancelled";

/**
 * What a lookup found. `not_found` is deliberately a separate outcome from any status: it
 * describes the SEARCH, not the practitioner.
 */
export type AhpraLookupOutcome =
  | { found: true; record: AhpraRecord }
  | { found: false; reason: "not_found" | "ambiguous" | "lookup_unavailable" };

export interface AhpraRecord {
  /** Ahpra registration number, as printed on the register. */
  registrationNumber: string;
  familyName: string;
  givenName: string;
  profession: string;
  status: AhpraRegistrationStatus;
  /**
   * Conditions or undertakings recorded against the registration, verbatim. Never summarised
   * or scored — a condition is a legal statement and paraphrasing one is a claim about it.
   */
  conditions: readonly string[];
  /** Registration expiry as the register states it, when it states one. */
  registrationExpiresOn: string | null;
  /** When WE read this. A registration checked in March is evidence about March. */
  checkedAt: string;
  /** Where it was read from, so a stale or wrong record can be traced. */
  sourceUrl: string;
}

export interface AhpraQuery {
  registrationNumber?: string;
  familyName?: string;
  givenName?: string;
}

/** The transport. Supplied by the caller so the adapter never owns a network client. */
export interface AhpraRegisterClient {
  search(query: AhpraQuery): Promise<readonly AhpraRecord[]>;
}

export interface AhpraAdapterConfig {
  /** Where the adapter WOULD talk to the register. Live Ahpra hosts are refused. */
  baseUrl: string;
}

// The live register and its immediate relatives. Refused in this phase.
const LIVE_HOST_PATTERNS = [/(^|\.)ahpra\.gov\.au$/i, /(^|\.)medicalboard\.gov\.au$/i, /register\.ahpra/i];

export class AhpraRegisterAdapter {
  private readonly sourceUrl: string;

  constructor(
    config: AhpraAdapterConfig,
    private readonly client: AhpraRegisterClient,
  ) {
    const host = new URL(config.baseUrl).hostname;
    if (LIVE_HOST_PATTERNS.some((re) => re.test(host))) {
      throw new Error(
        `founder gate: live Ahpra register endpoints are not permitted in this phase (${host})`,
      );
    }
    this.sourceUrl = config.baseUrl;
  }

  /**
   * Look somebody up.
   *
   * A query with nothing in it is refused rather than run: an empty search against a register
   * of practitioners is a request for the whole register, and the shape of the answer
   * (`ambiguous`) would hide that.
   *
   * More than one match is `ambiguous`, never "the first one". Two practitioners share a name
   * more often than any single practice notices, and picking one silently attaches a
   * registration to the wrong person — the failure that is hardest to detect afterwards,
   * because the record looks complete.
   */
  async lookup(query: AhpraQuery, checkedAtIso: string): Promise<AhpraLookupOutcome> {
    if (!hasCriteria(query)) return { found: false, reason: "lookup_unavailable" };

    let matches: readonly AhpraRecord[];
    try {
      matches = await this.client.search(query);
    } catch {
      // A failed lookup is a failed lookup. It is never evidence about the practitioner, so it
      // cannot become `not_found` — that would turn an outage into an absence of registration.
      return { found: false, reason: "lookup_unavailable" };
    }

    if (matches.length === 0) return { found: false, reason: "not_found" };
    if (matches.length > 1) return { found: false, reason: "ambiguous" };

    const record = matches[0]!;
    // Stamped here, not trusted from the client: the age of the evidence is a property of when
    // WE read it, and a client that supplied its own could make a stale read look fresh.
    return { found: true, record: { ...record, checkedAt: checkedAtIso, sourceUrl: this.sourceUrl } };
  }
}

function hasCriteria(query: AhpraQuery): boolean {
  return [query.registrationNumber, query.familyName, query.givenName].some(
    (v) => typeof v === "string" && v.trim() !== "",
  );
}

/** Plain-English outcomes, for the surfaces that show them. */
export const AHPRA_OUTCOME_COPY: Record<
  Exclude<AhpraLookupOutcome, { found: true }>["reason"],
  string
> = {
  not_found:
    "No matching entry was found on the register. That means the search found nothing, not that the person is unregistered — check the spelling and the registration number.",
  ambiguous:
    "More than one entry matched. Meherr will not guess between them; add the registration number.",
  lookup_unavailable:
    "The register could not be checked. Nothing has been recorded either way.",
};

export const AHPRA_STATUS_COPY: Record<AhpraRegistrationStatus, string> = {
  registered: "Registered",
  registered_with_conditions: "Registered, with conditions recorded on the register",
  suspended: "Registration suspended",
  cancelled: "Registration cancelled",
};
