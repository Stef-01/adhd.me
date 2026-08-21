// W242: the credentials posture — the loader enforces the gate, not the values.
//
// THE DIFFERENCE IS THE WHOLE UNIT AND IT IS EASY TO MISS. "There are no credentials in the tree"
// is a fact about today's contents, and it stops being true the first time somebody adds one, in a
// commit that looks like configuration. "Nothing can be constructed while G1 is shut" is a property
// of the code, and it holds whatever the contents become. W56 drew exactly this line for clinical
// intervals: the emptiness is not the guarantee, the refusal is.
//
// SO THE REFUSAL FIRES EVEN WHEN A CREDENTIAL IS PRESENT. `interopCredentials` takes whatever it is
// given and refuses it while the gate is shut — the test supplies a plausible secret and watches it
// be refused, because a refusal that only ever sees `undefined` is a refusal nobody has tested.
//
// AND THE SCAN IS THE SECOND LINE, NOT THE GATE. A regex hunting secrets in `src/` is worth having
// and is not a guarantee: it finds what it knows to look for, and a credential in a shape nobody
// anticipated walks past it. The first line is that no code path exists to USE one.
//
// WHICH GATE COVERS WHAT, because a reader who assumes one gate covers everything is the reader who
// ships behind the wrong one. G1 covers credentials for real PMS and booking APIs. G8 covers sending
// patient-derived content to a third-party model vendor and says nothing about credentials. G10
// covers payer and insurer data flows and says nothing about credentials either. A live integration
// needs G1 open whatever else is open.

/** The named gates, with what each does and does not cover. Carried from the plan, not paraphrased. */
export const CREDENTIAL_GATES = {
  G1: {
    covers:
      "real PMS/booking API credentials (Halo/Best Practice, HotDoc partner access)",
    definedIn: "docs/FIVE-YEAR-PLAN.md §4",
    isTheBlocker: true,
  },
  G8: {
    covers:
      "sending patient-derived content, identified or not, to a third-party model API. It says nothing about credentials, and a G8 ruling does not open a PMS integration.",
    definedIn: "docs/FIVE-YEAR-PLAN.md §5 (proposed, unratified)",
    isTheBlocker: false,
  },
  G10: {
    covers:
      "payer and insurer data flows. It says nothing about credentials either, and W240/W241 are blocked on it separately.",
    definedIn: "docs/FIVE-YEAR-PLAN.md §4 (proposed, unratified)",
    isTheBlocker: false,
  },
} as const;

/** Whether the credential gate is open. Shut, and this constant is the only thing that says so. */
export const G1_OPEN = false;

export type CredentialRefusal = "gate_shut" | "no_credential_supplied" | "credential_in_source";

export const CREDENTIAL_REFUSAL_COPY: Record<CredentialRefusal, string> = {
  gate_shut: `No live integration can be configured. G1 covers ${CREDENTIAL_GATES.G1.covers}, it is shut, and it is the blocker for anything live regardless of what else has been ruled on — a credential being present changes nothing while it is.`,
  no_credential_supplied:
    "No credential was supplied. Recorded as its own refusal rather than folded into the gate one, because 'the gate is shut' and 'nobody passed anything' are different situations and a reader who cannot tell them apart will go looking in the wrong place.",
  credential_in_source:
    "The supplied credential came from a literal in the tree rather than from the environment. It is refused whatever the gate says: a secret committed to a repository is disclosed the moment it is written, and no later gate ruling can undo that.",
};

/**
 * Where a credential may come from. One member, and it is not the tree.
 *
 * W215's one-member-union shape: a second source is a visible widening of a declared type rather
 * than an option somebody passes.
 */
export type CredentialSource = "process_environment";

export const ALL_CREDENTIAL_SOURCES: readonly CredentialSource[] = ["process_environment"];

export interface CredentialRequest {
  /** Which integration. Named so a refusal says what was refused. */
  integration: string;
  /** The value, from wherever the caller got it. This module does not read the environment itself. */
  value: string | undefined;
  source: CredentialSource | "source_literal";
}

export type CredentialResult =
  | { configured: true; integration: string }
  | { configured: false; why: CredentialRefusal; copy: string; integration: string };

/**
 * Configure an integration — or refuse, which today is always.
 *
 * TAKES A CREDENTIAL AND REFUSES IT ANYWAY. That ordering is the unit: the gate is checked before
 * anything about the value, so the refusal is a property of the code rather than of the tree being
 * empty today. A caller with a perfectly good credential gets the same answer as a caller with
 * none, and the reason names the gate rather than the missing value.
 */
export function interopCredentials(request: CredentialRequest): CredentialResult {
  // A literal in the tree is refused first and independently of the gate: a secret committed to a
  // repository is disclosed the moment it is written, and no later ruling undoes that.
  if (request.source === "source_literal") {
    return {
      configured: false,
      why: "credential_in_source",
      copy: CREDENTIAL_REFUSAL_COPY.credential_in_source,
      integration: request.integration,
    };
  }
  if (!G1_OPEN) {
    return {
      configured: false,
      why: "gate_shut",
      copy: CREDENTIAL_REFUSAL_COPY.gate_shut,
      integration: request.integration,
    };
  }
  if (request.value === undefined || request.value.trim().length === 0) {
    return {
      configured: false,
      why: "no_credential_supplied",
      copy: CREDENTIAL_REFUSAL_COPY.no_credential_supplied,
      integration: request.integration,
    };
  }
  return { configured: true, integration: request.integration };
}

/** PROPOSED FOR NOBODY — no integration is configured. Pinned empty by this module's test. */
export const CONFIGURED_INTEGRATIONS: readonly string[] = [];
