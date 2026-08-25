// AR1: the taste law becomes a register.
//
// `.claude/skills/adhdme-taste/SKILL.md` is prose, and prose cannot be asserted against — a rule
// can be written there and never checked, or a check can drift from the rule it was written for,
// and no build failure occurs in either case (the premise `docs/AESTHETIC-REVIEW-PLAN.md` opens
// with). This module is the law's machine-readable twin: one entry per rule, carrying the section
// it lives in, a one-line statement, and the incident that produced it.
//
// Every rule in the skill file carries a stable id in `{#id}` at the end of its bullet. The test
// (`taste-register.test.ts`) parses that file and pins agreement in BOTH directions against the
// list below — a rule in the file and not the register fails the build, and so does the reverse.
// Neither this list nor the prose is the sole source; drift between them is a build error.
//
// AR2: every rule also names its enforcement, or names its absence.
//
// A register that only lists rules restates the prose problem one level down — a rule can sit in
// TASTE_RULES forever without anything that checks it, and nothing would say so. Each entry below
// carries either `enforcedBy` (real spec/test files, each tagged `// taste-rule: <id>` so the claim
// is checked against the file rather than typed once and trusted) or `unenforced` (a reason, not a
// placeholder — several below are the honest finding that a rule's own cited incident does not mean
// a standing check exists: `layout.fold-governed` cites W167, but W167's fold register catches a
// different kind of fold — order-independent reduces in ranking code — not visual above-the-fold
// content, so the citation is a false friend and the rule is unenforced today).
//
// MEASURED 2026-08-22, when this was written: 22 rules, 7 enforced, 15 unenforced. `UNENFORCED_COUNT`
// pins the second number so it can only fall on purpose (O177's rule: a queue must distinguish
// "not done" from "decided") — a PR that adds a rule without deciding its enforcement, or silently
// drops a tag a rule's `enforcedBy` still claims, fails the build rather than quietly changing the
// count.
//
// AR3: every enforced rule names the routes it is asserted over, resolved from the SAME derived
// lists its own spec imports (`e2e/site-routes.ts`'s `PUBLIC_ROUTES`/`CONSOLE_ROUTES`, and
// `src/compliance/public-surfaces.ts`'s `PUBLIC_SURFACES`, itself pinned against the filesystem by
// `public-surfaces.test.ts`) — never a hand-typed path array, which is the exact fault O168 fixed
// for one sweep and this generalises to every route-sweeping taste rule. `checkRouteCoverage`
// unions every enforced rule's resolved routes and diffs the result against `ALL_PAGE_ROUTES`
// (also from `e2e/site-routes.ts`): a route reachable by nobody's enforcement must be named in
// `ROUTE_COVERAGE_EXEMPTIONS` with a real reason, or the build fails. Not every enforced rule is a
// route sweep — `interaction.errors-plain` tests a module against a faked recogniser with no page
// navigated at all — so `routeScope` also accepts `not-route-based` for those, distinct from
// `unenforced` (a real check exists; it just is not organised by route).

export type TasteSection =
  | "layout"
  | "type-colour"
  | "interaction"
  | "motion"
  | "honesty"
  | "review-procedure";

export interface TasteRule {
  /** Stable id, matching the `{#id}` marker on the rule's bullet in SKILL.md. */
  id: string;
  section: TasteSection;
  /** One-line statement of the rule. */
  statement: string;
  /**
   * The incident that produced this rule — a ledger unit (`O14`, `W167`, …) where the tree's own
   * record shows the violation being found and fixed, per `git log`/`docs/DESIGN-QA.md` archaeology
   * done for AR1. Where no single fix-incident could be traced (the rule predates this tree's
   * per-unit design record, or names a process rather than a fix), that is stated rather than
   * invented — a wrong citation is worse than an honest gap (see this tree's "report the
   * disagreement" law, `docs/AESTHETIC-REVIEW-PLAN.md` §Standing constraints).
   */
  incident: string;
  /**
   * Real enforcement, as `"<repo-relative file> :: <test name>"` entries. Every file named here
   * must carry a `// taste-rule: <id>` comment (checked by `diffEnforcement` against the actual
   * tree) — the citation is only as good as its cross-check.
   */
  enforcedBy?: readonly string[];
  /** Why no check exists yet. Exactly one of `enforcedBy`/`unenforced` is set, never both, never neither. */
  unenforced?: string;
  /**
   * AR3: which routes `enforcedBy`'s checks actually visit, as a reference to a derived list —
   * never a literal path array, which is the register re-acquiring the exact staleness risk AR1/AR2
   * already refused for rules and enforcement. Required exactly when `enforcedBy` is set; absent
   * when `unenforced` is set (nothing checks the rule, so there is nothing to name routes for).
   */
  routeScope?: RouteScope;
}

/**
 * AR3: the shape of "which routes does this rule's enforcement cover", closed so a new rule cannot
 * invent a fifth kind that `resolveRouteScope`/`checkRouteCoverage` silently ignore.
 */
export type RouteScope =
  | { kind: "route-sweep"; sweep: "public-static" | "console-static" | "public-and-console-static" | "public-all" }
  | { kind: "single-route"; route: string }
  | { kind: "not-route-based"; reason: string };

/**
 * The derived route lists `resolveRouteScope` reads from — passed in rather than imported at the
 * top of this file, so `taste-register.ts` itself stays filesystem-free (AR1/AR2's own choice) and
 * the caller (the test, which already walks the tree) supplies real data.
 */
export interface RouteLists {
  publicStatic: readonly string[];
  consoleStatic: readonly string[];
  publicAll: readonly string[];
}

/**
 * Resolve a `RouteScope` against the real derived lists. `not-route-based` resolves to `null`,
 * distinct from an empty sweep, so a coverage check can tell "nothing to union" from "swept zero
 * routes", which would itself be a collapsed-list bug worth failing loudly on.
 */
export function resolveRouteScope(scope: RouteScope, lists: RouteLists): readonly string[] | null {
  if (scope.kind === "single-route") return [scope.route];
  if (scope.kind === "not-route-based") return null;
  switch (scope.sweep) {
    case "public-static":
      return lists.publicStatic;
    case "console-static":
      return lists.consoleStatic;
    case "public-and-console-static":
      return [...lists.publicStatic, ...lists.consoleStatic];
    case "public-all":
      return lists.publicAll;
  }
}

export interface RouteScopePresenceDiff {
  /** Enforced rules with no `routeScope` — the omission AR3 exists to close. */
  missingRouteScope: string[];
  /** Unenforced rules that set `routeScope` anyway — nothing checks them, so nothing visits a route. */
  unexpectedRouteScope: string[];
}

/** `routeScope` is required exactly where `enforcedBy` is set, mirroring `diffEnforcement`'s
 * `enforcedBy`/`unenforced` exclusivity check one field over. */
export function diffRouteScopePresence(register: readonly TasteRule[]): RouteScopePresenceDiff {
  const missingRouteScope: string[] = [];
  const unexpectedRouteScope: string[] = [];
  for (const rule of register) {
    const hasEnforced = (rule.enforcedBy?.length ?? 0) > 0;
    if (hasEnforced && !rule.routeScope) missingRouteScope.push(rule.id);
    if (!hasEnforced && rule.routeScope) unexpectedRouteScope.push(rule.id);
  }
  return { missingRouteScope: missingRouteScope.sort(), unexpectedRouteScope: unexpectedRouteScope.sort() };
}

export interface RouteCoverageDiff {
  /** In `allPageRoutes`, covered by no enforced rule's resolved scope, and not exempted. */
  uncoveredRoutes: string[];
  /** Exemption entries naming a route that is either already covered or no longer exists. */
  staleExemptions: string[];
}

/**
 * Union every enforced rule's resolved routes and diff against the real route list. An uncovered
 * route must be named in `exemptions` with a reason, or it is reported so the build can fail on it
 * — O168's "a third option that quietly skips" rule, applied to the taste register rather than one
 * sweep's dynamic-route plan.
 */
export function checkRouteCoverage(
  register: readonly TasteRule[],
  allPageRoutes: readonly string[],
  lists: RouteLists,
  exemptions: Readonly<Record<string, string>>,
): RouteCoverageDiff {
  const covered = new Set<string>();
  for (const rule of register) {
    if (!rule.routeScope) continue;
    const routes = resolveRouteScope(rule.routeScope, lists);
    if (routes) for (const r of routes) covered.add(r);
  }

  const uncoveredRoutes = allPageRoutes.filter((r) => !covered.has(r) && !(r in exemptions)).sort();
  const staleExemptions = Object.keys(exemptions)
    .filter((r) => covered.has(r) || !allPageRoutes.includes(r))
    .sort();

  return { uncoveredRoutes, staleExemptions };
}

/**
 * AR3: routes no enforced rule's `routeScope` reaches, named with a real reason rather than
 * silently passing as "covered". `/console/setup/[step]` is the one route O168 already found and
 * declared excluded from `e2e/site-routes.ts`'s own dynamic-route plan (walked instead by
 * `e2e/console.spec.ts`'s wizard test) — that test carries no `taste-rule` tag, so from the
 * register's point of view the gap is real and reported here rather than assumed closed by proxy.
 */
export const ROUTE_COVERAGE_EXEMPTIONS: Readonly<Record<string, string>> = {
  "/console/setup/[step]":
    "no enforced taste rule sweeps this route: it is dynamic (excluded from CONSOLE_ROUTES) and " +
    "under /console (excluded from every honesty.* public sweep). Its steps are walked by " +
    "e2e/console.spec.ts's onboarding wizard test, which asserts the flow completes but carries no " +
    "taste-rule tag and checks no taste property — an honest gap, not yet closed.",
};

export const TASTE_RULES: readonly TasteRule[] = [
  {
    id: "layout.one-idea",
    section: "layout",
    statement:
      "A screen states one thing; controls live inside the statement (the mix hero pattern), never beside it competing.",
    incident: "O24 — GP join landing (patient-mix hero) + whole-surface declutter audit",
    unenforced: "a composition judgement with no assertion form yet; AR3/AR15 add per-route visual coverage, not this",
  },
  {
    id: "layout.fold-governed",
    section: "layout",
    statement:
      "Nothing above the fold that is not the idea; a fold may never cut a tied band or separate a claim from its qualifier.",
    // AR19 closed the false-friend gap this entry used to record: the rule cited W167, whose
    // fold register governs order-independent REDUCES, while nothing checked visual folds. Now
    // e2e/fold.spec.ts asserts both halves at 390×844 and 1280×900 — every public route's h1
    // fully inside the initial viewport, and every declared claim+qualifier pair
    // (src/design/fold-bands.ts's TIED_BANDS) uncut by the fold — with a planted straddling
    // band driven through the same `bandCut` predicate each run so the detector cannot die
    // silently.
    incident: "W167 — the order-independence fold register (the rule's original, false-friend citation; AR19 built the visual check)",
    enforcedBy: ["e2e/fold.spec.ts :: the idea sits above the fold and no tied band is cut, at both widths"],
    routeScope: { kind: "route-sweep", sweep: "public-static" },
  },
  {
    id: "layout.shared-row",
    section: "layout",
    statement:
      "Related facts share a row — a label and its evidence, a name and its distance — rather than requiring the reader to scan two regions to join one fact.",
    incident: "O24 — GP join landing (patient-mix hero) + whole-surface declutter audit",
    unenforced: "a composition judgement with no assertion form yet",
  },
  {
    id: "layout.five-then-rest",
    section: "layout",
    statement:
      "Long lists show a chooseable few with the remainder one tap away; never render an unbounded list as the default state.",
    incident:
      "predates this tree's per-unit design record — no single fix traced; carried from the initial design baseline",
    unenforced: "no check asserts a long list renders a bounded default with a reveal-more affordance",
  },
  {
    id: "type.serif-display",
    section: "type-colour",
    statement: "Serif (Newsreader) at display scale for statements; the sans carries controls and body.",
    incident:
      "predates this tree's per-unit design record — the original typographic choice (CLAUDE.md: this tree chose Newsreader on paper deliberately)",
    unenforced: "no check asserts Newsreader (or any serif) renders at display scale; a font-choice audit, not a gate",
  },
  {
    id: "type.accent-live-tokens",
    section: "type-colour",
    statement: "Accent colour is reserved for live tokens — the value that changes, the word that matters.",
    incident: "O130 — the accent pointed at the wrong thing, and it was a fossil; generalised by O176",
    enforcedBy: [
      "e2e/accent-discipline.spec.ts :: no public surface lets the accent carry more than one meaning",
      "e2e/profile-accent.spec.ts :: profile highlights are a quiet text line, not dated colored bubbles",
    ],
    // accent-discipline.spec.ts sweeps every PUBLIC_ROUTES entry; profile-accent.spec.ts checks one
    // page inside that same sweep more deeply, so it adds depth rather than a wider route scope.
    routeScope: { kind: "route-sweep", sweep: "public-static" },
  },
  {
    id: "type.numeric-typography",
    section: "type-colour",
    statement:
      "tabular-nums wherever numbers change or align; curly quotes, real ellipses, non-breaking spaces inside names and units.",
    incident: "W42 — practice-facing results page (first 'numbers use tabular-nums so columns align' record)",
    unenforced: "no check greps for tabular-nums, curly quotes or real ellipses; a typography-detail sweep not yet built",
  },
  {
    id: "type.palette-tokens",
    section: "type-colour",
    statement: "Palette tokens only; no raw hex in components.",
    incident: "O96 — globals.css sectioned, with a machine-checked proof",
    unenforced:
      "O96's proof was a one-time computed-style diff for one refactor, not a standing gate against raw hex in " +
      "components; AR17/AR18 plan the ongoing check",
  },
  {
    id: "interaction.touch-44",
    section: "interaction",
    statement:
      "44px minimum touch target; decorative smaller visuals may render smaller but the hit area meets the floor.",
    incident: "O14 (cited directly in the rule); enforcement generalised by O145 and O170",
    enforcedBy: [
      "e2e/touch-floor.spec.ts :: no control on a public route is under the floor",
      "e2e/touch-floor.spec.ts :: no control in the console is under the floor",
    ],
    routeScope: { kind: "route-sweep", sweep: "public-and-console-static" },
  },
  {
    id: "interaction.hover-focus",
    section: "interaction",
    statement:
      "Hover styles gated behind @media (hover: hover); touch-action: manipulation on controls; visible :focus-visible ring, never outline: none without a replacement.",
    incident: "O147 — the focus law, made executable",
    enforcedBy: [
      "e2e/keyboard-focus.spec.ts :: every public control is reachable by keyboard and shows where it is",
      "e2e/keyboard-focus.spec.ts :: every console control is reachable by keyboard and shows where it is",
      // AR23: the statement's last clause ("never outline: none without a replacement") gets its
      // STATIC half — the tab-walks above prove focus is visible where the walker lands; the
      // census proves no source anywhere suppresses the ring without a paired replacement, which
      // covers states and elements no finite walk visits.
      "src/design/focus-ring.test.ts :: every component suppression pairs its ring in the same class string, at the pinned counts",
    ],
    routeScope: { kind: "route-sweep", sweep: "public-and-console-static" },
  },
  {
    id: "interaction.errors-plain",
    section: "interaction",
    statement: "Errors are plain sentences with a way out, never error-code language on a patient surface.",
    incident: "O46 — the unearned headline and the mic that stops on its own",
    enforcedBy: [
      "src/voice/speech.test.ts :: says nothing to a patient in error-code language",
      "src/voice/speech.test.ts :: offers typing in every error message, since that is always the way out",
    ],
    routeScope: {
      kind: "not-route-based",
      reason:
        "speech.test.ts drives the voice module directly against a faked SpeechRecognition; no page is navigated, so there is no route to name",
    },
  },
  {
    id: "motion.carries-meaning",
    section: "motion",
    statement:
      "Motion must carry meaning: a value resolving, an order re-sorting, an object staying itself across screens. Nothing that merely draws the eye.",
    incident: "O127 — the motion queue, closed honestly",
    unenforced: "a design judgement (does this motion carry meaning) with no mechanical test; AR9-AR12's mutation probes are the planned enforcement",
  },
  {
    id: "motion.reduced-motion",
    section: "motion",
    statement:
      "prefers-reduced-motion is fully honoured — every effect has a static equal, checked at the hook, not just in CSS.",
    incident: "O127 — the motion queue, closed honestly; gaps found later by O141",
    enforcedBy: [
      "src/quality/landing-motion.test.ts :: keeps the reduced-motion gate, which is still right even though it was not the fix",
      // AR20 widened this rule from one file's source pin to the whole public surface: the
      // census proves every motion-importing file CHECKS the preference (hook, drilled prop,
      // or a declared MotionConfig boundary — the state a hook-grep cannot see), and the sweep
      // proves the RESULT under emulated reduce: nothing rests transformed, no reveal's
      // content is missing. Probe-backed (reduced-motion-probe.spec.ts drives the sweep's own
      // detector with planted violations of both kinds).
      "src/design/reduced-motion.test.ts :: every motion-importing file is covered: hook, drilled prop, or a declared boundary",
      "e2e/reduced-motion.spec.ts :: under reduced motion, no element rests transformed and every reveal's content is present",
    ],
    routeScope: { kind: "route-sweep", sweep: "public-static" },
  },
  {
    id: "motion.autoplay-stop",
    section: "motion",
    statement: "Indefinite autoplay needs a stop: pause on hover, stop on engagement.",
    incident: "O29 — web-guidelines audit + micro-polish",
    unenforced:
      "O29's worked example (mix-hero.tsx's paused-on-hover rotation) was retired with the join form (O188), so the " +
      "rule currently has NO autoplaying surface to bind — no component in app/ runs an indefinite animation outside " +
      "the reduced-motion-governed story sequence. The rule stands for the next autoplay that ships; a check for it " +
      "is written against that surface on the day it exists, not against nothing",
  },
  {
    id: "motion.consult-view-transitions",
    section: "motion",
    statement:
      "Consult react-view-transitions for shared-element and route transitions before reaching for bespoke animation.",
    incident: "process recommendation, not a fix — points at the vendored react-view-transitions skill",
    unenforced: "a process instruction for the author to follow before writing code, not a property of shipped code",
  },
  {
    id: "honesty.claim-earned",
    section: "honesty",
    statement: "A claim renders only when it is earned; counts stand alone otherwise.",
    incident: "O46 — the unearned headline and the mic that stops on its own",
    enforcedBy: [
      "e2e/finder-flow.spec.ts :: collective roster coverage is never presented as one doctor's complete fit (O178)",
      "e2e/finder-flow.spec.ts :: and still says it when the fit really is complete (O121 non-vacuity)",
    ],
    // The whole flow (results, profile, booking) plays out as client state inside "/finder" — it is
    // one route, walked deeply, not several routes navigated between.
    routeScope: { kind: "single-route", route: "/finder" },
  },
  {
    id: "honesty.no-testimonials",
    section: "honesty",
    statement: 'No testimonials, ratings, or "specialist/specialise" anywhere a patient reads.',
    incident: "W11 — the first design-QA checklist pass (2026-08-08); CLAUDE.md law 6",
    enforcedBy: [
      "src/compliance/public-surfaces.test.ts :: flags a testimonial on a professional surface, because that exemption does not exist",
      "src/compliance/public-surfaces.test.ts :: holds a patient surface to all of them",
      "e2e/public-sweep.spec.ts :: every public surface serves copy its audience's rules allow",
    ],
    routeScope: { kind: "route-sweep", sweep: "public-all" },
  },
  {
    id: "honesty.clinician-declaration",
    section: "honesty",
    statement: "Copy about a clinician is their declaration, never our characterisation.",
    incident: "O58 — Dr Anusha Saxena's background, in her own supply",
    unenforced:
      "O58 rewrote one clinician's bio as a one-time content fix; no standing check distinguishes self-declared " +
      "clinician copy from platform narrative anywhere in the roster",
  },
  {
    id: "honesty.qa-capture",
    section: "honesty",
    statement: "Every new/changed screen ships with a qa/ capture and a docs/DESIGN-QA.md entry.",
    incident: "O143 — the design record had been silently falsified",
    unenforced:
      "no check asserts a changed screen shipped with a qa/ capture and a DESIGN-QA.md entry; O143 found this record " +
      "silently falsified once already, which argues for a check rather than against one existing — none exists yet",
  },
  {
    id: "review.screenshot-both-viewports",
    section: "review-procedure",
    statement: "Screenshot the surface at 390x844 and desktop (Playwright against the prod build).",
    incident: "W11 — the first design-QA checklist pass (2026-08-08)",
    unenforced:
      "e2e/ui-audit.spec.ts captures 7 hardcoded routes at phone width only, with no assertion — it cannot fail, so " +
      "it is a capture step rather than a gate; a human procedure, not yet checked",
  },
  {
    id: "review.walk-fix-smallest",
    section: "review-procedure",
    statement: "Walk the checklists above; fix in place, smallest diff.",
    incident: "W11 — the first design-QA checklist pass (2026-08-08)",
    unenforced: "a human review-procedure instruction, not a property of shipped code",
  },
  {
    id: "review.recapture-record",
    section: "review-procedure",
    statement: "Re-capture, record the before/after in docs/DESIGN-QA.md, keep captures in qa/.",
    incident: "W11 — the first design-QA checklist pass (2026-08-08)",
    unenforced: "a human review-procedure instruction; docs/DESIGN-QA.md entries are written by hand, not verified against captures",
  },
];

const SECTION_HEADINGS: Readonly<Record<string, TasteSection>> = {
  Layout: "layout",
  "Type & colour": "type-colour",
  Interaction: "interaction",
  Motion: "motion",
  "Honesty gates": "honesty",
  "Review procedure": "review-procedure",
};

export interface SkillRule {
  id: string;
  section: TasteSection;
}

/**
 * Parse `SKILL.md`'s rule bullets — one entry per `{#id}`-marked list item, grouped by the `## `
 * heading it falls under. A bullet's text may wrap across several lines (the file is prose), so a
 * line starting a new bullet or heading, or a blank line, closes the previous item before its
 * marker is searched for.
 *
 * Returns `unmarked` separately: real content lines under a rule heading that never resolved into
 * a marked bullet (dropped `{#id}`, or a genuinely new rule nobody gave an id) — those are a
 * failure in the file, not the register, and the test reports them by name rather than silently
 * excluding them from the count.
 */
export function parseSkillRules(markdown: string): { rules: SkillRule[]; unmarked: string[] } {
  const rules: SkillRule[] = [];
  const unmarked: string[] = [];
  let section: TasteSection | null = null;
  let item: string[] | null = null;

  const flush = () => {
    if (!item || !section) {
      item = null;
      return;
    }
    const text = item.join(" ").trim();
    const match = /\{#([a-z0-9.-]+)\}\s*$/.exec(text);
    if (match) rules.push({ id: match[1]!, section });
    else unmarked.push(text);
    item = null;
  };

  for (const rawLine of markdown.split("\n")) {
    const heading = /^##\s+(.+?)\s*(?:\(.*)?$/.exec(rawLine);
    if (heading) {
      flush();
      const key = heading[1]!.trim();
      section = SECTION_HEADINGS[key] ?? null;
      continue;
    }
    if (!section) continue;
    if (/^\s*(?:-|\d+\.)\s/.test(rawLine)) {
      flush();
      item = [rawLine.trim()];
    } else if (rawLine.trim() === "") {
      flush();
    } else if (item) {
      item.push(rawLine.trim());
    }
  }
  flush();

  return { rules, unmarked };
}

export interface TasteRegisterDiff {
  /** Rule ids marked in SKILL.md with no register entry. */
  missingFromRegister: string[];
  /** Register entries whose id is not marked on any bullet in SKILL.md. */
  staleInRegister: string[];
  /** Ids marked more than once in SKILL.md. */
  duplicateInSkillFile: string[];
  /** Content bullets under a rule heading that never resolved to a `{#id}` marker. */
  unmarkedInSkillFile: string[];
  /** Ids whose SKILL.md section disagrees with the register's `section` field. */
  sectionMismatch: string[];
}

export function diffTasteRegister(skillMarkdown: string, register: readonly TasteRule[] = TASTE_RULES): TasteRegisterDiff {
  const { rules: skillRules, unmarked } = parseSkillRules(skillMarkdown);

  const seen = new Set<string>();
  const duplicateInSkillFile: string[] = [];
  for (const r of skillRules) {
    if (seen.has(r.id)) duplicateInSkillFile.push(r.id);
    seen.add(r.id);
  }

  const skillIds = new Set(skillRules.map((r) => r.id));
  const registerIds = new Set(register.map((r) => r.id));
  const skillSectionById = new Map(skillRules.map((r) => [r.id, r.section]));

  return {
    missingFromRegister: [...skillIds].filter((id) => !registerIds.has(id)).sort(),
    staleInRegister: [...registerIds].filter((id) => !skillIds.has(id)).sort(),
    duplicateInSkillFile: [...new Set(duplicateInSkillFile)].sort(),
    unmarkedInSkillFile: unmarked,
    sectionMismatch: register
      .filter((r) => skillSectionById.has(r.id) && skillSectionById.get(r.id) !== r.section)
      .map((r) => r.id)
      .sort(),
  };
}

/**
 * AR2: the count of rules with no standing check, pinned so it can only fall on purpose. Adding a
 * rule, or a future edit that quietly drops one's `enforcedBy`, must choose a new number here
 * rather than let the count drift unnoticed (O177's rule: a queue must distinguish "not done" from
 * "decided").
 */
export const UNENFORCED_COUNT = 14; // AR19 enforced layout.fold-governed (was 15)

export interface EnforcementTag {
  /** The rule id named in a `// taste-rule: <id>` comment. */
  id: string;
  /** Repo-relative path of the file carrying the tag. */
  file: string;
}

/**
 * Find every `// taste-rule: <id>` tag in one file's source. Takes content directly (like
 * `parseSkillRules` takes markdown directly) so this is testable against a fabricated string
 * without touching the filesystem; the real tree is walked by the caller (`taste-register.test.ts`,
 * matching this module's own choice to stay filesystem-free).
 */
export function parseEnforcementTags(source: string, file: string): EnforcementTag[] {
  const tags: EnforcementTag[] = [];
  const re = /\/\/\s*taste-rule:\s*([a-z0-9.-]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) tags.push({ id: match[1]!, file });
  return tags;
}

export interface EnforcementDiff {
  /** Rule ids with neither `enforcedBy` nor `unenforced` set. */
  missingBoth: string[];
  /** Rule ids with both set — ambiguous, so refused rather than silently preferring one. */
  bothPresent: string[];
  /** Tag ids found in the tree that name no rule in the register — a spec claiming an unknown rule. */
  unknownTagIds: string[];
  /** `"<ruleId> -> <file>"`: a rule's `enforcedBy` names a file that carries no matching tag. */
  enforcedWithoutTag: string[];
  /** `"<id> -> <file>"`: a tag exists but no rule's `enforcedBy` claims that file for that id. */
  orphanTags: string[];
  /** The register's actual unenforced count, to compare against `UNENFORCED_COUNT`. */
  unenforcedCount: number;
}

/** Cross-check the register's enforcement claims against tags actually found in the tree. */
export function diffEnforcement(register: readonly TasteRule[], tags: readonly EnforcementTag[]): EnforcementDiff {
  const registerIds = new Set(register.map((r) => r.id));
  const tagsById = new Map<string, Set<string>>();
  for (const tag of tags) {
    if (!tagsById.has(tag.id)) tagsById.set(tag.id, new Set());
    tagsById.get(tag.id)!.add(tag.file);
  }

  const missingBoth: string[] = [];
  const bothPresent: string[] = [];
  const enforcedWithoutTag: string[] = [];
  let unenforcedCount = 0;

  for (const rule of register) {
    const hasEnforced = (rule.enforcedBy?.length ?? 0) > 0;
    const hasUnenforced = (rule.unenforced?.length ?? 0) > 0;
    if (!hasEnforced && !hasUnenforced) missingBoth.push(rule.id);
    if (hasEnforced && hasUnenforced) bothPresent.push(rule.id);
    if (hasUnenforced) unenforcedCount++;
    if (hasEnforced) {
      const files = tagsById.get(rule.id) ?? new Set<string>();
      for (const entry of rule.enforcedBy!) {
        const file = entry.split(" :: ")[0]!;
        if (!files.has(file)) enforcedWithoutTag.push(`${rule.id} -> ${file}`);
      }
    }
  }

  const unknownTagIds = [...new Set(tags.filter((t) => !registerIds.has(t.id)).map((t) => t.id))].sort();

  const orphanTags: string[] = [];
  for (const tag of tags) {
    if (!registerIds.has(tag.id)) continue;
    const rule = register.find((r) => r.id === tag.id)!;
    const claimed = (rule.enforcedBy ?? []).some((entry) => entry.split(" :: ")[0] === tag.file);
    if (!claimed) orphanTags.push(`${tag.id} -> ${tag.file}`);
  }

  return {
    missingBoth: missingBoth.sort(),
    bothPresent: bothPresent.sort(),
    unknownTagIds,
    enforcedWithoutTag: [...new Set(enforcedWithoutTag)].sort(),
    orphanTags: [...new Set(orphanTags)].sort(),
    unenforcedCount,
  };
}
