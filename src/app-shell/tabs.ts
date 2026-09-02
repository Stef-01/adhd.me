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
// WHY A REGISTER RATHER THAN JSX. Three things have to agree — the bar, the routes that exist, and
// what a crawler is told about each of them — and they drifted the last three times this tree let
// a list live inside a component (O168's route arrays, U7's robots lists, O189's spine). The test
// beside this file holds every tab to a real page route, and holds the count to the researched
// range in both directions, so a fifth tab is a decision somebody makes on purpose and a sixth is
// a failure.

export interface AppTab {
  /** The route this tab is. Must be a real page route in `app/`. */
  readonly href: string;
  /** The word under the icon. Both are always shown — see the header note. */
  readonly label: string;
  /** The Phosphor icon name the bar renders. */
  readonly icon: "MagnifyingGlass" | "Notebook" | "Question" | "Info";
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
    label: "Find",
    icon: "MagnifyingGlass",
    purpose: "Describe the GP you are looking for, in words or out loud, and read the order the description produces.",
  },
  {
    href: "/examples",
    label: "Examples",
    icon: "Notebook",
    purpose: "See the same matching run over written scenarios, so the ordering can be checked against a request somebody else wrote.",
  },
  {
    href: "/faq",
    label: "Questions",
    icon: "Question",
    purpose: "What this is, what it costs, where it operates and how the order is decided — answered without clinical advice.",
  },
  {
    href: "/story",
    label: "About",
    icon: "Info",
    purpose: "Why the product exists and what the route through assessment costs today; the account that used to occupy the front door.",
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
  return [...APP_TABS]
    .filter((tab) => tab.href !== "/" && (pathname === tab.href || pathname.startsWith(`${tab.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
