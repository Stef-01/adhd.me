// The founders register, moved out of the landing page when About us became its own door
// (founder-directed: "move about us to be a page... main title just say Team"). The laws it
// carried move with it:
//
// EVERY PORTRAIT IS SUPPLIED, AND THE MONOGRAM FALLBACK STAYS ANYWAY. Nothing in this tree
// generates a face for a real person: each photograph was handed over by its subject, framed
// to a shared 3:4. `portrait: null` renders a monogram at the same size, because the next
// founder or advisor added here will not have handed one over on the day they are added.
//
// `logo` points at a file in public/ when there is one licensed to use, and is null otherwise;
// the entry falls back to the institution's name set as a wordmark — a university mark is
// trademarked and not ours to copy off a website.

/**
 * O155, founder-directed 2026-08-21: "also make team hidden at the moment" … "as we are still
 * building and we dont know who will be on it finally".
 *
 * A GATE RATHER THAN A DELETION. Unlinking the door would have hidden the door and left the room
 * open: `/about` publishes four named individuals' faces, roles and affiliations, and one of them
 * was added the same day with no photograph and no role. If the question is WHO IS FINALLY ON THE
 * TEAM, then a live page with the URL guessable is exactly what should not exist yet. So the route
 * stops serving while the page, the data and every plate stay precisely where they are.
 *
 * Flip this to `true` and the team is back — the footer door and the sitemap entry read it too, so
 * one word restores all three. That is what "at the moment" asks for.
 */
export const TEAM_PAGE_PUBLIC = false;

export interface Affiliation {
  name: string;
  logo: string | null;
  href: string;
  /** Alt text and the accessible name of the link. */
  label: string;
}

/** "Dr Anubhav Saxena" -> "AS". The honorific is not an initial. */
export function monogram(name: string): string {
  return name
    .replace(/^Dr\.?\s+/, "")
    .split(" ")
    .map((part) => part[0])
    .join("");
}

/**
 * `role` and `remit` are OPTIONAL because they are characterisations, and W193 does not let this
 * tree write one for a named person out of its own head (O152). Somebody can be added the day
 * their name is supplied and gain a role and a remit when they supply those too; what is never
 * acceptable is a plausible sentence about a real person that nobody said.
 */
export const TEAM: ReadonlyArray<{
  name: string;
  role?: string;
  remit?: string;
  portrait: string | null;
  affiliations: readonly Affiliation[];
}> = [
  {
    name: "Vikram Ganeshalingam",
    // O154 (founder-directed): "remove term cofounder everywhere, as its a team". The bare role
    // line goes; the remit still says what he does.
    remit: "What a person meets when they first look for help.",
    portrait: "/vikram.png",
    affiliations: [
      { name: "Final-year MD candidate, Bond University", logo: null, href: "https://bond.edu.au/", label: "Final-year MD candidate, Bond University" },
    ],
  },
  {
    name: "Dr Anubhav Saxena",
    // O154: the company title goes, the medical credentials stay — they are facts about a
    // doctor, not a claim about the company.
    role: "MBBS, FRACGP",
    remit: "A documented baseline before anything starts, then follow-up on a schedule.",
    portrait: "/anubhav-saxena.png",
    affiliations: [
      { name: "Beecroft", logo: null, href: "#", label: "Beecroft" },
      { name: "University of Sydney", logo: null, href: "https://www.sydney.edu.au/", label: "University of Sydney" },
    ],
  },
  {
    // O90 (founder-directed 2026-08-20): the fourth member. Role and affiliations from
    // her published record (the O58/O71/O88 sourcing in the roster entry); portrait is the
    // founder-supplied O82 photo, centre-cropped to this row's 3:4 convention.
    name: "Dr Anusha Saxena",
    // Founder consistency pass (2026-08-20): her degrees named the way Dr Anubhav's are —
    // the MD in the role line, and both universities (medicine at ANU, B.Psych (Hons) at
    // USyd) in the affiliations.
    // O154: as above.
    role: "MD, FRACGP",
    remit: "Psychology before medicine, and assessment that sees the whole person.",
    portrait: "/anusha-saxena.png",
    affiliations: [
      { name: "Bay Health Clinic", logo: null, href: "#", label: "Bay Health Clinic, Double Bay & Hornsby" },
      { name: "Australian National University", logo: null, href: "https://www.anu.edu.au/", label: "Australian National University" },
      { name: "University of Sydney", logo: null, href: "https://www.sydney.edu.au/", label: "University of Sydney — Bachelor of Psychology (Honours)" },
    ],
  },
  {
    name: "Stefan Thottunkal",
    // O154: bare role line removed.
    remit: "Physician-in-training and health-systems researcher, Stanford Medicine.",
    portrait: "/stefan.png",
    affiliations: [
      {
        name: "NOURISH, Stanford Medicine",
        logo: "/nourish-logo.png",
        href: "https://med.stanford.edu/nourish-project.html",
        label: "NOURISH, Stanford Medicine",
      },
      {
        name: "Harvard T.H. Chan",
        logo: "/hsil-logo.png",
        href: "https://hsph.harvard.edu/research/health-systems-innovation-lab/team/#scholars",
        label: "Health Systems Innovation Lab, Harvard T.H. Chan School of Public Health",
      },
    ],
  },
  {
    /*
     * O152, founder-directed 2026-08-21: "add to team Saif Tareen, bachelor of commerce student
     * at Macquarie university and works at Parliament of australia so have those logos in
     * similarly".
     *
     * A REAL PERSON, so the entry holds the three supplied facts and nothing else. No `role` and
     * no `remit`: every other plate has both, and both are characterisations — writing one for a
     * named person nobody quoted is the exact thing W193 exists to stop. They are one message
     * away from being filled in.
     *
     * `portrait: null` is NOT a placeholder decision. The photograph arrived as a chat image
     * rather than a file, and nothing in this tree generates a face for a real person — so the
     * monogram fallback stands until `public/saif-tareen.png` exists, which is the case the
     * header of this file already anticipated.
     *
     * BOTH AFFILIATIONS CARRY `logo: null` DELIBERATELY, and that is what "similarly" means here.
     * The rule at the top of this file is that a mark ships only when it is licensed to us; Bond,
     * USyd and ANU all render as wordmarks for that reason, so a wordmark IS how this page treats
     * a university. The Parliament of Australia is the stronger case: its identifier is the
     * Commonwealth Coat of Arms, whose use is restricted under Commonwealth guidelines and is not
     * a mark a private company may apply to itself.
     */
    name: "Saif Tareen",
    portrait: null,
    affiliations: [
      {
        name: "Macquarie University",
        logo: null,
        href: "https://www.mq.edu.au/",
        label: "Bachelor of Commerce student, Macquarie University",
      },
      {
        name: "Parliament of Australia",
        logo: null,
        href: "https://www.aph.gov.au/",
        label: "Parliament of Australia",
      },
    ],
  },
];
