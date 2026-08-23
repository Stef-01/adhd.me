// AR1 verify gate: the taste register and `.claude/skills/adhdme-taste/SKILL.md` agree in BOTH
// directions. Neither is the sole source — a rule marked in the file and missing from the
// register fails, and so does a register entry with no marked bullet in the file.
//
// AR2 verify gate: every rule names its enforcement or its absence, and an `enforcedBy` claim is
// checked against a `// taste-rule: <id>` tag actually present in the named file — not just typed
// into the register and trusted. The walk below is this test's own (order-independence.ts and
// mobile-fit.spec.ts already read the tree the same way; taste-register.ts itself stays
// filesystem-free, matching its AR1 choice to take markdown as a string).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_PAGE_ROUTES, CONSOLE_ROUTES, PUBLIC_ROUTES } from "../../e2e/site-routes";
import { PUBLIC_SURFACES } from "../compliance/public-surfaces";
import {
  checkRouteCoverage,
  diffEnforcement,
  diffRouteScopePresence,
  diffTasteRegister,
  parseEnforcementTags,
  parseSkillRules,
  resolveRouteScope,
  ROUTE_COVERAGE_EXEMPTIONS,
  TASTE_RULES,
  UNENFORCED_COUNT,
  type EnforcementTag,
  type RouteLists,
  type TasteRule,
} from "./taste-register";

/** The real derived lists AR3's coverage check runs against — the same imports the enforced
 * rules' own spec files use, so a rule cannot claim coverage of a list nobody actually swept. */
const REAL_ROUTE_LISTS: RouteLists = {
  publicStatic: PUBLIC_ROUTES,
  consoleStatic: CONSOLE_ROUTES,
  publicAll: PUBLIC_SURFACES.map((s) => s.path),
};

const SKILL_FILE = ".claude/skills/adhdme-taste/SKILL.md";
const skillMarkdown = () => readFileSync(SKILL_FILE, "utf8");

/** Every `.spec.ts`/`.test.ts` file under `e2e/` and `src/`, tags parsed out of its real content. */
function discoverEnforcementTags(root: string): EnforcementTag[] {
  const tags: EnforcementTag[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir).sort()) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(spec|test)\.ts$/.test(entry)) continue;
      const source = readFileSync(full, "utf8");
      const file = full.slice(root.length + 1).replaceAll("\\", "/");
      tags.push(...parseEnforcementTags(source, file));
    }
  };
  walk(join(root, "e2e"));
  walk(join(root, "src"));
  return tags;
}

describe("AR1 the taste law is a checked register", () => {
  it("agrees with SKILL.md in both directions, with no unmarked bullets or duplicate ids", () => {
    const diff = diffTasteRegister(skillMarkdown());
    expect(diff.missingFromRegister, "marked in SKILL.md but absent from TASTE_RULES").toEqual([]);
    expect(diff.staleInRegister, "in TASTE_RULES but no longer marked in SKILL.md").toEqual([]);
    expect(diff.duplicateInSkillFile, "id marked on more than one bullet").toEqual([]);
    expect(diff.unmarkedInSkillFile, "content bullet under a rule heading with no {#id} marker").toEqual([]);
    expect(diff.sectionMismatch, "register section disagrees with the heading the id is marked under").toEqual([]);
  });

  it("finds every rule currently in the file — guards against a vacuous pass", () => {
    // A parser that silently matched nothing would make the equality checks above pass by
    // finding zero on both sides. Pin a floor so that failure mode is visible.
    const { rules } = parseSkillRules(skillMarkdown());
    expect(rules.length).toBeGreaterThanOrEqual(20);
    expect(rules.length).toBe(TASTE_RULES.length);
  });

  it("is a non-vacuous check: an unmarked rule, a stale id and a bad section each get caught", () => {
    const base = skillMarkdown();

    const droppedMarker = base.replace("{#layout.one-idea}", "");
    expect(diffTasteRegister(droppedMarker).unmarkedInSkillFile.length).toBeGreaterThan(0);

    const renamedMarker = base.replace("{#layout.one-idea}", "{#layout.one-idea-v2}");
    const renamedDiff = diffTasteRegister(renamedMarker);
    expect(renamedDiff.missingFromRegister).toContain("layout.one-idea-v2");
    expect(renamedDiff.staleInRegister).toContain("layout.one-idea");

    // A register entry filed under the wrong section relative to its marked heading must be visible.
    const wrongSection: readonly TasteRule[] = TASTE_RULES.map((r) =>
      r.id === "interaction.touch-44" ? { ...r, section: "motion" } : r,
    );
    expect(diffTasteRegister(base, wrongSection).sectionMismatch).toContain("interaction.touch-44");
  });

  it("every register entry carries a non-empty statement and incident", () => {
    for (const rule of TASTE_RULES) {
      expect(rule.statement.length, `${rule.id} has no statement`).toBeGreaterThan(10);
      expect(rule.incident.length, `${rule.id} has no incident`).toBeGreaterThan(5);
    }
  });

  it("has no duplicate ids within the register itself", () => {
    const ids = TASTE_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("AR2 every rule names its enforcement, or names its absence", () => {
  it("no rule omits both fields, and none sets both", () => {
    const diff = diffEnforcement(TASTE_RULES, []);
    expect(diff.missingBoth, "neither enforcedBy nor unenforced set").toEqual([]);
    expect(diff.bothPresent, "both enforcedBy and unenforced set — ambiguous").toEqual([]);
  });

  it("the unenforced count is pinned, so it can only fall deliberately", () => {
    const diff = diffEnforcement(TASTE_RULES, []);
    expect(
      diff.unenforcedCount,
      "a rule's enforcement status changed — update UNENFORCED_COUNT deliberately, in the same commit",
    ).toBe(UNENFORCED_COUNT);
  });

  it("every enforcedBy claim is backed by a real taste-rule tag in the named file", () => {
    const tags = discoverEnforcementTags(process.cwd());
    const diff = diffEnforcement(TASTE_RULES, tags);
    expect(diff.enforcedWithoutTag, "register claims enforcement a file's own tag does not confirm").toEqual([]);
    expect(diff.orphanTags, "a file tags a rule id no register entry's enforcedBy claims for that file").toEqual([]);
    expect(diff.unknownTagIds, "a file tags a rule id that does not exist in TASTE_RULES").toEqual([]);
  });

  it("finds tags that are actually there — guards against a vacuous pass", () => {
    // A walker or a parser that silently matched nothing would make every check above pass by
    // finding zero tags, exactly the failure mode AR1's own non-vacuity test guards against.
    const tags = discoverEnforcementTags(process.cwd());
    expect(tags.length).toBeGreaterThanOrEqual(7);
  });

  it("is a non-vacuous check: a missing tag, an orphan tag and an unknown id each get caught", () => {
    // Mutating the REAL tree's tags (rather than a small fabricated set) — a fabricated set that
    // covers only the rule under test would itself report every OTHER enforced rule as untagged,
    // which is not the failure mode this test is checking for.
    const realTags = discoverEnforcementTags(process.cwd());
    const enforcedRule = TASTE_RULES.find((r) => r.id === "interaction.touch-44")!;
    const claimedPath = enforcedRule.enforcedBy![0]!.split(" :: ")[0]!;

    const oneTagDropped = realTags.filter((t) => !(t.id === "interaction.touch-44" && t.file === claimedPath));
    expect(diffEnforcement(TASTE_RULES, oneTagDropped).enforcedWithoutTag).toContain(
      `interaction.touch-44 -> ${claimedPath}`,
    );

    const clean = diffEnforcement(TASTE_RULES, realTags);
    expect(clean.enforcedWithoutTag, "the real tree, untouched, should already be clean").toEqual([]);
    expect(clean.orphanTags, "the real tree, untouched, should already be clean").toEqual([]);

    const withOrphan = [...realTags, { id: "interaction.touch-44", file: "e2e/some-other-spec.spec.ts" }];
    expect(diffEnforcement(TASTE_RULES, withOrphan).orphanTags).toContain(
      "interaction.touch-44 -> e2e/some-other-spec.spec.ts",
    );

    const withUnknown = [...realTags, { id: "not-a-real-rule", file: "e2e/whatever.spec.ts" }];
    expect(diffEnforcement(TASTE_RULES, withUnknown).unknownTagIds).toContain("not-a-real-rule");
  });

  it("parseEnforcementTags finds a marker anywhere in a file, not just its first line", () => {
    // Built by concatenation so this fixture's own marker text cannot be picked up when
    // discoverEnforcementTags scans this very file's source — the string literal below is not
    // the four characters "// taste-rule:" in sequence anywhere in taste-register.test.ts itself.
    const marker = ["//", " taste", "-rule: honesty.no-testimonials"].join("");
    const fixture = `// some header\n${marker}\nimport x from 'y';\n`;
    expect(parseEnforcementTags(fixture, "fixture.ts")).toEqual([
      { id: "honesty.no-testimonials", file: "fixture.ts" },
    ]);
    expect(parseEnforcementTags("// nothing here", "fixture.ts")).toEqual([]);
  });

  it("every enforcedBy entry names a real file and a non-empty test description", () => {
    for (const rule of TASTE_RULES) {
      for (const entry of rule.enforcedBy ?? []) {
        const [file, test] = entry.split(" :: ");
        expect(file, `${rule.id}'s enforcedBy entry has no " :: " separator: ${entry}`).toBeTruthy();
        expect(test, `${rule.id}'s enforcedBy entry has no test name: ${entry}`).toBeTruthy();
      }
    }
  });

  it("every unenforced reason is a real sentence, not a placeholder", () => {
    for (const rule of TASTE_RULES) {
      if (rule.unenforced) expect(rule.unenforced.length, rule.id).toBeGreaterThan(20);
    }
  });
});

describe("AR3 every enforced rule names the routes it is asserted over", () => {
  it("routeScope is set exactly where enforcedBy is set", () => {
    const diff = diffRouteScopePresence(TASTE_RULES);
    expect(diff.missingRouteScope, "enforced rule with no routeScope").toEqual([]);
    expect(diff.unexpectedRouteScope, "unenforced rule with a routeScope set anyway").toEqual([]);
  });

  it("resolves each rule's scope to a non-empty route list, or explicitly not-route-based", () => {
    for (const rule of TASTE_RULES) {
      if (!rule.routeScope) continue;
      const routes = resolveRouteScope(rule.routeScope, REAL_ROUTE_LISTS);
      if (rule.routeScope.kind === "not-route-based") {
        expect(routes, rule.id).toBeNull();
        expect(rule.routeScope.reason.length, rule.id).toBeGreaterThan(20);
      } else {
        expect(routes, rule.id).not.toBeNull();
        expect(routes!.length, `${rule.id} resolved to zero routes`).toBeGreaterThan(0);
        for (const r of routes!) expect(ALL_PAGE_ROUTES, `${rule.id} -> ${r}`).toContain(r);
      }
    }
  });

  it("the real tree's route coverage is clean: no uncovered route, no stale exemption", () => {
    const diff = checkRouteCoverage(TASTE_RULES, ALL_PAGE_ROUTES, REAL_ROUTE_LISTS, ROUTE_COVERAGE_EXEMPTIONS);
    expect(diff.uncoveredRoutes, "route in ALL_PAGE_ROUTES with no enforced rule and no exemption").toEqual([]);
    expect(diff.staleExemptions, "exemption naming a route that is now covered or no longer exists").toEqual([]);
  });

  it("every exemption reason is a real sentence, not a placeholder", () => {
    for (const reason of Object.values(ROUTE_COVERAGE_EXEMPTIONS)) {
      expect(reason.length).toBeGreaterThan(20);
    }
  });

  it("finds a real, non-collapsed route list — guards against a vacuous pass", () => {
    // A collapsed ALL_PAGE_ROUTES (e.g. discoverSurfaces silently returning nothing) would make
    // the coverage check above pass by finding zero routes to cover, exactly the failure mode
    // AR1/AR2's own non-vacuity tests guard against one level up.
    expect(ALL_PAGE_ROUTES.length).toBeGreaterThan(20);
  });

  it("is a non-vacuous check: an uncovered route is caught, and a stale exemption is caught", () => {
    const withExtraRoute = [...ALL_PAGE_ROUTES, "/a-route-nothing-sweeps"];
    const introduced = checkRouteCoverage(TASTE_RULES, withExtraRoute, REAL_ROUTE_LISTS, ROUTE_COVERAGE_EXEMPTIONS);
    expect(introduced.uncoveredRoutes).toContain("/a-route-nothing-sweeps");

    const staleExemptions = { ...ROUTE_COVERAGE_EXEMPTIONS, "/finder": "this route is actually covered" };
    const stale = checkRouteCoverage(TASTE_RULES, ALL_PAGE_ROUTES, REAL_ROUTE_LISTS, staleExemptions);
    expect(stale.staleExemptions).toContain("/finder");

    const missingRoute = { ...ROUTE_COVERAGE_EXEMPTIONS, "/route-that-does-not-exist": "made up for the test" };
    const gone = checkRouteCoverage(TASTE_RULES, ALL_PAGE_ROUTES, REAL_ROUTE_LISTS, missingRoute);
    expect(gone.staleExemptions).toContain("/route-that-does-not-exist");

    // Dropping the one real exemption reintroduces the exact gap it names.
    const withoutExemption = checkRouteCoverage(TASTE_RULES, ALL_PAGE_ROUTES, REAL_ROUTE_LISTS, {});
    expect(withoutExemption.uncoveredRoutes).toContain("/console/setup/[step]");
  });

  it("route-sweep scopes resolve to the same lists their own spec files import, not a copy", () => {
    // touch-44 and hover-focus both claim public-and-console-static; their union must be exactly
    // PUBLIC_ROUTES + CONSOLE_ROUTES with no drift introduced by resolveRouteScope's spread.
    const touch44 = TASTE_RULES.find((r) => r.id === "interaction.touch-44")!;
    const resolved = resolveRouteScope(touch44.routeScope!, REAL_ROUTE_LISTS)!;
    expect(new Set(resolved)).toEqual(new Set([...PUBLIC_ROUTES, ...CONSOLE_ROUTES]));
  });
});
