// O230 (founder-directed): the app's tab register — the four places the product has, named once.
//
// THE SHAPE IS RESEARCHED, NOT INVENTED. The three public health apps with published structure
// agree on it: the NHS App's design system builds the whole product on three "hub" tabs (Home,
// Messages, Profile) it deliberately protects from redesign because the information architecture
// hangs off them; Apple Health ships three (Summary, Sharing, Browse); Zocdoc ships five and —
// the finding that decided this unit — opens cold on SEARCH, not on a hero. None of them opens on
// a marketing page, and none of them puts the thing the app is for behind a link. Hence: the
// finder is tab one and tab one is `/`, and the story that used to hold `/` is a tab like any
// other. The practitioner consensus in the same corpus is 4–5 tabs with an icon AND a text label
// (icon-only is read as a literacy and trust failure in health contexts), so every entry here
// carries both and the label is never hidden at any width.
//
// O233 (founder-directed) CORRECTED WHAT GOES IN IT, and the correction is the lesson. O230 built
// the bar from the researched COUNT and then filled it with the four pages this tree happened to
// have: Examples, Questions and About. Those are things the product knows, not places a person
// goes. A bar is for destinations somebody RETURNS to — the task, their own state, the thing worth
// reading — and everything consulted once belongs behind a settings control, which is what
// `app/app-settings.tsx` now is. Three destinations, inside the researched 3–5 range, chosen this
// time by what a person comes back for.
//
// WHY A REGISTER RATHER THAN JSX. Three things have to agree — the bar, the routes that exist, and
// what a crawler is told about each of them — and they drifted the last three times this tree let
// a list live inside a component (O168's route arrays, U7's robots lists, O189's spine). The test
// beside this file holds every tab to a real page route, and holds the count to the researched
// range in both directions, so a fifth tab is a decision somebody makes on purpose and a sixth is
// a failure.

// 2026-09-08 (founder-directed, the ADHD Life PRD §6): the bar is the PRD's four destinations.
// `Support` is the finder at `/` — the marketplace, and still tab one, still the product; `Today`
// is the one most useful next action; `Learn` keeps its route; `My ADHD` is the personal life
// map. The filters screen (`/profile`) leaves the bar: the PRD puts profile and settings behind
// the top-right control, and the filters are reached from the results screen, the settings sheet
// and the finder's own welcome. The Support tab claims it as current (`also`), so a person editing
// filters is still, visibly, inside the finder.

export interface AppTab {
  /** The route this tab is. Must be a real page route in `app/`. */
  readonly href: string;
  /** Routes this tab also claims as current — deeper screens of the same place. */
  readonly also?: readonly string[];
  /** The word under the icon. Both are always shown — see the header note. */
  readonly label: string;
  /** The Phosphor icon name the bar renders. */
  readonly icon: "MagnifyingGlass" | "UserCircle" | "BookOpen" | "Sun" | "Lifebuoy" | "Compass";
  /** What a person is going there to do. The reason the tab earns a place, in one sentence. */
  readonly purpose: string;
}

/**
 * The bar, in order. Position one is the product; position last is the least-often needed, which
 * is where every surveyed app puts the page about itself.
 */
export const APP_TABS: readonly AppTab[] = [
  {
    href: "/",
    also: ["/profile", "/support"],
    label: "Support",
    icon: "Lifebuoy",
    purpose: "Describe the support you are looking for, in words or out loud, or start from the problem and be walked to the kind of person who helps with it.",
  },
  {
    href: "/today",
    also: ["/start"],
    label: "Today",
    icon: "Sun",
    purpose: "The single most useful next thing for you today — a module, something to try, or a question about how the last thing went.",
  },
  {
    href: "/approach",
    label: "Learn",
    icon: "BookOpen",
    purpose: "Interactive modules that show ADHD in a life like yours and learn what matters to you, plus the reads, the quizzes and the care map.",
  },
  {
    href: "/my-adhd",
    label: "My ADHD",
    icon: "Compass",
    also: ["/manual"],
    purpose: "Your own picture — the biggest friction, what seems to contribute across brain, body, environment and people, and what has helped.",
  },
];

/** The researched range: fewer than three is not a bar, more than five is a menu pretending to be one. */
export const TAB_COUNT_RANGE = { min: 3, max: 5 } as const;

/**
 * The tab a path belongs to, or `undefined` for a route outside the bar (the console, the booking
 * handoff, the legal pages). Longest match wins so `/privacy/counsel-review` cannot be claimed by
 * `/`, and `/` matches only itself.
 */
export function activeTab(pathname: string): AppTab | undefined {
  if (pathname === "/") return APP_TABS[0];
  const claims = (tab: AppTab) => [tab.href, ...(tab.also ?? [])].filter((h) => h !== "/");
  return [...APP_TABS]
    .flatMap((tab) => claims(tab).map((href) => ({ tab, href })))
    .filter(({ href }) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.tab;
}
