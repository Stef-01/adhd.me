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
    also: ["/profile", "/support", "/first-step"],
    label: "Support",
    icon: "Lifebuoy",
    purpose: "Describe the support you are looking for, in words or out loud, or start from the problem and be walked to the kind of person who helps with it.",
  },
  {
    href: "/approach",
    also: ["/lives"],
    label: "Learn",
    icon: "BookOpen",
    purpose: "Interactive modules that show ADHD in a life like yours and learn what matters to you, plus the reads, the quizzes and the care map.",
  },
  {
    href: "/my-adhd",
    label: "My ADHD",
    icon: "Compass",
    also: ["/today", "/start", "/manual", "/medication", "/adjustments", "/my-map"],
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
