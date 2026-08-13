// W126: the pathway audit trail, on W10's spine.
//
// Q10 built a governance chain — draft, publish, review, sign off, bind, escalate, withdraw —
// spread across five modules, each holding the piece it needs. That is right for the code and
// wrong for an auditor, whose question is never "what does approval.ts think". It is: what
// happened to this pathway, in what order, and who did each part.
//
// So this is one append-only trail over the whole chain, and it uses W10's spine rather than
// imitating it. W10's `verifySequence`/`verifySequenceAgainst` were generalised for this unit
// so the pathway trail is checked BY that code, not by a copy of it — an integrity check that
// exists twice gets fixed once, and the copy then quietly guarantees less.
//
// What this trail does NOT carry is patient consent. W125's records name a patient, and the
// pathway audit trail is a CONTENT governance document that a specialist reviewer, a regulator
// or an indemnifier may read. Putting patient ids in it would make every reader of a pathway's
// history a reader of who agreed to it — the same privacy-shaped mistake W110 refused when it
// declined to file credentialing history on the invitation spine. Consent has its own record,
// attached to the patient, which is where a consent question is actually asked.
//
// Every event carries `at` and `by`, both required. W122's rule: a change nobody can attribute
// is a change nobody can question, and an audit trail of unattributed changes is a list.

import { verifySequence, verifySequenceAgainst, type LogAnchor, type LogVerdict } from "@/spine/spine";
import type { PathwayAttestationKind } from "./approval";
import type { EscalationAction } from "./escalation";

interface AuditBase {
  at: string;
  /** Who did it. Required — see the module note. */
  by: string;
  pathwayId: string;
  /** W118's content hash: every event is about an exact set of criteria. */
  versionHash: string;
}

export type PathwayAuditEvent =
  | (AuditBase & { kind: "version_drafted"; ordinal: number })
  | (AuditBase & { kind: "version_published" })
  | (AuditBase & { kind: "version_withdrawn"; reason: string })
  | (AuditBase & { kind: "attestation_recorded"; attestation: PathwayAttestationKind; finding: string })
  | (AuditBase & { kind: "attestation_revoked"; attestation: PathwayAttestationKind; reason: string })
  | (AuditBase & { kind: "escalation_rule_set"; factCode: string; action: EscalationAction })
  | (AuditBase & { kind: "binding_set"; conditionCode: string });

export type PathwayAuditEntry = PathwayAuditEvent & { readonly seq: number };
export type PathwayAuditLog = readonly PathwayAuditEntry[];

export const EMPTY_AUDIT_LOG: PathwayAuditLog = Object.freeze([]);

export type AuditRejection = "attributed_to_nobody" | "undated" | "out_of_order";

export type AuditAppend =
  | { ok: true; log: PathwayAuditLog }
  | { ok: false; reason: AuditRejection };

/**
 * Append an event.
 *
 * Refuses an unattributed or undated one outright rather than storing it with a gap: a trail
 * that accepts "somebody did something" has recorded that something happened and nothing else.
 * Also refuses an event dated before the last one, because a trail whose order does not match
 * its dates cannot answer "in what order".
 */
export function appendAudit(log: PathwayAuditLog, event: PathwayAuditEvent): AuditAppend {
  if (event.by.trim() === "") return { ok: false, reason: "attributed_to_nobody" };
  if (event.at.trim() === "") return { ok: false, reason: "undated" };
  const last = log.at(-1);
  if (last && event.at < last.at) return { ok: false, reason: "out_of_order" };

  const entry = Object.freeze({ ...event, seq: log.length }) as PathwayAuditEntry;
  return { ok: true, log: Object.freeze([...log, entry]) as PathwayAuditLog };
}

/**
 * Mirrors W118's `PathwayVersionState` (with `draft` spelled `drafted`, since the trail records
 * the ACT rather than the state).
 *
 * W129 finding: `superseded` was missing, so a version replaced by a newer publication still
 * read as `published` here. An audit trail that disagrees with the system it audits is worse
 * than no audit trail — somebody reconciling an incident would take "in force" from the trail
 * while the pathway model said otherwise. It is DERIVED in replay rather than added as an event
 * kind, so nobody has to remember to record it.
 */
export type VersionState = "drafted" | "published" | "superseded" | "withdrawn";

export interface AttestationState {
  kind: PathwayAttestationKind;
  by: string;
  at: string;
  finding: string;
  revokedAt: string | null;
  revokedReason: string | null;
}

/** The governance state of one version, rebuilt from the trail alone. */
export interface VersionAudit {
  pathwayId: string;
  versionHash: string;
  ordinal: number | null;
  state: VersionState;
  draftedBy: string | null;
  draftedAt: string | null;
  publishedBy: string | null;
  publishedAt: string | null;
  withdrawnReason: string | null;
  attestations: AttestationState[];
  escalationRules: Array<{ factCode: string; action: EscalationAction; by: string; at: string }>;
  binding: { conditionCode: string; by: string; at: string } | null;
}

export interface ReplayedAudit {
  versions: VersionAudit[];
}

function key(event: { pathwayId: string; versionHash: string }): string {
  return `${event.pathwayId}::${event.versionHash}`;
}

/**
 * Rebuild every version's governance state from the trail.
 *
 * The unit's gate is that replay reproduces every state transition, so this is total over any
 * prefix: the state after n events is the state those n events imply, with nothing carried in
 * from outside the log.
 */
export function replayAudit(log: PathwayAuditLog): ReplayedAudit {
  const byVersion = new Map<string, VersionAudit>();

  const ensure = (event: PathwayAuditEvent): VersionAudit => {
    const existing = byVersion.get(key(event));
    if (existing) return existing;
    const fresh: VersionAudit = {
      pathwayId: event.pathwayId,
      versionHash: event.versionHash,
      ordinal: null,
      // An event about a version we never saw drafted still creates a row: an audit trail that
      // silently ignored it would hide exactly the anomaly an auditor is looking for.
      state: "drafted",
      draftedBy: null,
      draftedAt: null,
      publishedBy: null,
      publishedAt: null,
      withdrawnReason: null,
      attestations: [],
      escalationRules: [],
      binding: null,
    };
    byVersion.set(key(event), fresh);
    return fresh;
  };

  for (const entry of log) {
    const version = ensure(entry);
    switch (entry.kind) {
      case "version_drafted":
        version.ordinal = entry.ordinal;
        version.draftedBy = entry.by;
        version.draftedAt = entry.at;
        break;
      case "version_published":
        // Publishing supersedes whichever version of the SAME pathway was in force. W118's
        // `pathwayAt` asserts at most one is published at any instant; deriving it here keeps
        // this trail agreeing with that rather than quietly diverging.
        for (const other of byVersion.values()) {
          if (other.pathwayId === entry.pathwayId && other !== version && other.state === "published") {
            other.state = "superseded";
          }
        }
        version.state = "published";
        version.publishedBy = entry.by;
        version.publishedAt = entry.at;
        break;
      case "version_withdrawn":
        version.state = "withdrawn";
        version.withdrawnReason = entry.reason;
        break;
      case "attestation_recorded":
        version.attestations.push({
          kind: entry.attestation,
          by: entry.by,
          at: entry.at,
          finding: entry.finding,
          revokedAt: null,
          revokedReason: null,
        });
        break;
      case "attestation_revoked": {
        // Revoke the live one of that kind. Revocation marks the attestation rather than
        // deleting it: the review really did happen, and an audit that cannot see a withdrawn
        // sign-off cannot answer why a pathway stopped being usable.
        const live = version.attestations.find(
          (a) => a.kind === entry.attestation && a.revokedAt === null,
        );
        if (live) {
          live.revokedAt = entry.at;
          live.revokedReason = entry.reason;
        }
        break;
      }
      case "escalation_rule_set":
        version.escalationRules.push({
          factCode: entry.factCode,
          action: entry.action,
          by: entry.by,
          at: entry.at,
        });
        break;
      case "binding_set":
        version.binding = { conditionCode: entry.conditionCode, by: entry.by, at: entry.at };
        break;
    }
  }

  return { versions: [...byVersion.values()] };
}

/** Contiguity, via W10's own check. */
export function verifyAuditLog(log: PathwayAuditLog): boolean {
  return verifySequence(log);
}

/** Truncation detection, via W10's own check. An anchor must live outside the log. */
export function verifyAuditLogAgainst(log: PathwayAuditLog, anchor: LogAnchor): LogVerdict {
  return verifySequenceAgainst(log, anchor);
}

export function explainAuditRejection(reason: AuditRejection): string {
  switch (reason) {
    case "attributed_to_nobody":
      return "Record who did this. A change nobody can attribute is a change nobody can question.";
    case "undated":
      return "Record when it happened.";
    case "out_of_order":
      return "This event is dated before the one it follows — a trail whose order does not match its dates cannot answer 'in what order'.";
  }
}
