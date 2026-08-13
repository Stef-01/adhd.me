// W18: multi-tenancy — roles and the single authorization decision point.
// Deny is the default everywhere: no membership, wrong practice, or an action outside
// the role's grant all refuse. The SQL mirror (migration 0003) enforces the same
// boundary at the row level; these functions are the app-layer twin the tests exercise.

export type Role = "owner" | "manager" | "clinician";

export type TenancyAction =
  | "view_dashboard"
  | "edit_rules"
  | "manage_members"
  | "record_usefulness"
  | "pause_sending"
  /** W109: open the evidence vault. Credentialing roles only — see `openVault`. */
  | "read_credential_evidence";

export interface Membership {
  practiceId: string;
  email: string;
  role: Role;
}

/** Grants per role. Owner ⊇ manager ⊇ clinician by construction — asserted in tests. */
const GRANTS: Record<Role, readonly TenancyAction[]> = {
  owner: [
    "view_dashboard",
    "edit_rules",
    "manage_members",
    "record_usefulness",
    "pause_sending",
    "read_credential_evidence",
  ],
  manager: ["view_dashboard", "edit_rules", "record_usefulness", "pause_sending", "read_credential_evidence"],
  clinician: ["view_dashboard", "record_usefulness"],
};

export const ALL_ACTIONS = GRANTS.owner;
export const ALL_ROLES: readonly Role[] = ["owner", "manager", "clinician"];

export function can(role: Role, action: TenancyAction): boolean {
  return GRANTS[role].includes(action);
}

export type AuthzDecision =
  | { allowed: true; role: Role }
  | { allowed: false; reason: "no_membership" | "role_denied" };

/**
 * The decision point: is `email` allowed to perform `action` at `practiceId`?
 * Membership is looked up scoped to the practice, so belonging to practice A
 * grants exactly nothing at practice B.
 */
export function authorize(
  memberships: readonly Membership[],
  email: string,
  practiceId: string,
  action: TenancyAction,
): AuthzDecision {
  const membership = memberships.find((m) => m.practiceId === practiceId && m.email === email);
  if (!membership) return { allowed: false, reason: "no_membership" };
  if (!can(membership.role, action)) return { allowed: false, reason: "role_denied" };
  return { allowed: true, role: membership.role };
}

/** Row-level scope filter — the TS twin of the RLS policies in migration 0003. */
export function scopeToPractice<T extends { practiceId: string }>(
  rows: readonly T[],
  practiceId: string,
): T[] {
  return rows.filter((r) => r.practiceId === practiceId);
}
