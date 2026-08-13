// W105: Meherr-staff access — the control the community interest register never had.
//
// W102 found `/console/interest` and `/api/interest/export` authorised by "is anyone signed
// in": any console user at any practice could read and download every community signup's name
// and email. The register is a Meherr-run community program, not practice data, so the correct
// control is "Meherr staff only" — and the product had no way to say that.
//
// It is DELIBERATELY NOT A FOURTH ROLE. Adding `meherr_staff` to `Role` would route it through
// `authorize()`, which resolves practice memberships — and then a practice owner using
// `manage_members` could grant Meherr-staff access to themselves. That is the W97 lesson
// inverted: W97 resolved group roles DOWN to site memberships precisely so a group role could
// never grant more than a site role, and the requirement here runs the other way, so this must
// not go through the practice authorization path at all. A separate list that no practice can
// write is a structural guarantee; a fourth role would be a convention.
//
// IT SHIPS EMPTY, the same posture as W68's safety rules and W69's content catalogue. Nobody
// is Meherr staff until the founder says who is, so today the answer is "nobody can read it",
// which is strictly safer than yesterday's "everyone signed in can". The register is not
// deleted, and the surface still explains itself — the control is present and closed, not
// missing.
//
// The grant list is CODE rather than configuration on purpose. At this scale it is a handful
// of internal people, a commit is an auditable record of who was added and by whom, and an
// environment variable would be an ungoverned way to hand out access to real people's contact
// details.

export interface StaffGrant {
  email: string;
  /** Who added them. A grant with no author is not a grant. */
  grantedBy: string;
  grantedAt: string;
}

/**
 * Meherr staff. **Ships empty and a test pins it that way** — adding an entry is a founder
 * decision, made in a commit, not something a unit does in passing.
 */
export const MEHERR_STAFF: readonly StaffGrant[] = [];

function normalise(email: string): string {
  return email.trim().toLowerCase();
}

export function isMeherrStaff(
  email: string | null | undefined,
  grants: readonly StaffGrant[] = MEHERR_STAFF,
): boolean {
  if (!email) return false;
  const wanted = normalise(email);
  if (wanted === "") return false;
  return grants.some((g) => normalise(g.email) === wanted);
}

/** Plain-English refusal for the surfaces that use this gate. */
export const STAFF_REFUSAL_COPY =
  "This register belongs to the Meherr community program, not to your practice, so it is not shown here. Nobody has been granted access to it yet.";
