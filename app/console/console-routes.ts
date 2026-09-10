// The console spine (docs/console-spine-brief.md): six screens in the tab bar, everything else
// behind /console/more. A folded route keeps its path and its spec; only the navigation changed.

export type ConsoleRoute = { href: string; label: string; exact?: boolean; staffOnly?: boolean };

export const SPINE: readonly ConsoleRoute[] = [
  { href: "/console", label: "Home", exact: true },
  // "Measurement", not "Incrementality": the tab bar is on the results page, whose rule (W42) is
  // plain English with no measurement jargon, and the results page already calls this screen
  // the detailed measurement view.
  { href: "/console/dashboard", label: "Measurement" },
  // Exact: /console/matching/audit is folded, so it must not light this tab.
  { href: "/console/matching", label: "Matching", exact: true },
  { href: "/console/capacity", label: "Capacity" },
  { href: "/console/referrals", label: "Referrals" },
  { href: "/console/outcomes", label: "Outcomes" },
  { href: "/console/results", label: "Results" },
  // Folded too, and kept reachable from the tab bar, as the brief says.
  { href: "/console/setup/practice", label: "Setup" },
];

export const MORE: ConsoleRoute = { href: "/console/more", label: "More" };

export const FOLDED_GROUPS: ReadonlyArray<{
  label: string;
  note?: string;
  routes: readonly ConsoleRoute[];
}> = [
  {
    label: "Run care",
    routes: [
      { href: "/console/ops", label: "Operations queue" },
      { href: "/console/complaints", label: "Complaints" },
      { href: "/console/outreach", label: "Outreach" },
    ],
  },
  {
    label: "Configure",
    routes: [
      { href: "/console/setup/practice", label: "Practice setup" },
      { href: "/console/rules", label: "Eligibility rules" },
      { href: "/console/registers", label: "Registers" },
      { href: "/console/case-mix", label: "Case mix" },
      { href: "/console/credentials", label: "Credentials" },
      { href: "/console/gp", label: "GP profiles" },
    ],
  },
  {
    label: "Measure",
    routes: [
      { href: "/console/responses", label: "Responses" },
      { href: "/console/reporting", label: "Reporting" },
      { href: "/console/roi", label: "ROI" },
    ],
  },
  {
    label: "Govern",
    routes: [
      { href: "/console/capability", label: "Capability" },
      { href: "/console/pathways", label: "Pathways" },
      { href: "/console/education", label: "Education" },
      { href: "/console/interop", label: "Interoperability" },
      { href: "/console/verticals", label: "Service views" },
    ],
  },
  {
    label: "Demonstrate",
    routes: [
      { href: "/console/matching/audit", label: "Matching audit" },
      { href: "/console/allocation", label: "Allocation" },
      { href: "/console/interview", label: "Interview" },
      { href: "/console/interest", label: "Interest", staffOnly: true },
      { href: "/console/applications", label: "Applications", staffOnly: true },
    ],
  },
  {
    // The brief's first two to fold: reached by no spec, kept until somebody asks by name.
    label: "Folded first",
    note: "Kept until a practice asks for one by name.",
    routes: [
      { href: "/console/privacy", label: "Privacy requests" },
      { href: "/console/usefulness", label: "Usefulness audit" },
    ],
  },
];

export function routeIsActive(pathname: string, route: ConsoleRoute): boolean {
  if (route.exact) return pathname === route.href;
  if (route.href === "/console/setup/practice") return pathname.startsWith("/console/setup/");
  return pathname === route.href || pathname.startsWith(`${route.href}/`);
}
