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

export const FOUNDERS: ReadonlyArray<{
  name: string;
  role: string;
  remit: string;
  portrait: string | null;
  affiliations: readonly Affiliation[];
}> = [
  {
    name: "Vikram Ganeshalingam",
    role: "Co-founder",
    remit: "What a person meets when they first look for help.",
    portrait: "/vikram.png",
    affiliations: [
      { name: "Final-year MD candidate, Bond University", logo: null, href: "https://bond.edu.au/", label: "Final-year MD candidate, Bond University" },
    ],
  },
  {
    name: "Dr Anubhav Saxena",
    role: "Co-founder, MBBS, FRACGP",
    remit: "A documented baseline before anything starts, then follow-up on a schedule.",
    portrait: "/anubhav-saxena.png",
    affiliations: [
      { name: "Beecroft", logo: null, href: "#", label: "Beecroft" },
      { name: "University of Sydney", logo: null, href: "https://www.sydney.edu.au/", label: "University of Sydney" },
    ],
  },
  {
    // O90 (founder-directed 2026-08-20): the fourth co-founder. Role and affiliations from
    // her published record (the O58/O71/O88 sourcing in the roster entry); portrait is the
    // founder-supplied O82 photo, centre-cropped to this row's 3:4 convention.
    name: "Dr Anusha Saxena",
    // Founder consistency pass (2026-08-20): her degrees named the way Dr Anubhav's are —
    // the MD in the role line, and both universities (medicine at ANU, B.Psych (Hons) at
    // USyd) in the affiliations.
    role: "Co-founder, MD, FRACGP",
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
    role: "Co-founder",
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
];
