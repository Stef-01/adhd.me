// O208 unit half: the register is complete, argued, and cannot drift from the routes it describes.
// The rendered half — does each `describes-both` surface actually name both interfaces — is
// `e2e/interface-coverage.spec.ts`, because a claim about copy is only true of RENDERED copy
// (W184's lesson, which W192's sweep already learned the hard way for the honesty linters).

import { describe, expect, it } from "vitest";
import { discoverSurfaces } from "./surfaces";
import { eachOf } from "@/quality/non-vacuous";
import { INTERFACE_STANCES, declaredDebt, mustNameBoth } from "./interface-coverage";

const publicRoutes = () =>
  discoverSurfaces("app")
    .filter((s) => s.kind === "page")
    .map((s) => s.path)
    .filter((p) => !p.startsWith("/console") && !p.startsWith("/api"))
    .sort();

describe("O208 every public surface has a decided stance on the two interfaces", () => {
  it("covers exactly the routes the tree serves, both directions", () => {
    // W102's shape, and the reason this is a register rather than a lint: a new public page must
    // make somebody DECIDE whether it describes the product, is one of the interfaces, or is about
    // something else — instead of inheriting a stance by whichever list it happened to land in.
    expect(INTERFACE_STANCES.map((s) => s.path).sort()).toEqual(publicRoutes());
    expect(publicRoutes().length).toBeGreaterThan(12);
  });

  it("argues every stance in a sentence somebody can disagree with", () => {
    // Asserted OUTSIDE the loop as well as guarded inside it, and the redundancy is deliberate.
    // O196's census reads a loop's collection by capturing the expression after `of`, so when a file
    // imports `eachOf` the captured root IS `eachOf` and the guard it is looking for
    // (`eachOf(<collection>`) never matches — a wrapped site can still read as unguarded. Rather
    // than quietly bump that unit's pinned remainder, this block satisfies the census the way it
    // recognises: a real assertion above the loop. Worth its own unit: the 133 may include other
    // already-guarded sites for the same reason.
    expect(INTERFACE_STANCES.length, "the register is empty — nothing was argued").toBeGreaterThan(12);
    for (const stance of eachOf(INTERFACE_STANCES, "the interface-stance register")) {
      expect(stance.why.length, `${stance.path} has a stance without a reason`).toBeGreaterThan(80);
      expect(["describes-both", "is-one", "describes-neither", "declared-debt"]).toContain(stance.stance);
    }
  });

  it("names an owner and a date on every piece of declared debt", () => {
    // Debt without a name is a wish. Each entry says whose decision it is and when it was raised, so
    // "deferred" cannot quietly become "forgotten" — which is what a sentence in a ledger row does.
    const debt = declaredDebt();
    expect(debt.length, "no declared debt — delete the check or record the state").toBeGreaterThan(0);
    for (const entry of debt) {
      expect(entry.owner, `${entry.path} is debt with no owner`).toBeDefined();
      expect(entry.owner!).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(entry.owner!).toMatch(/founder/i);
    }
  });

  it("keeps at least one surface in each stance, so no branch is dead", () => {
    expect(new Set(INTERFACE_STANCES.map((s) => s.stance))).toEqual(
      new Set(["describes-both", "is-one", "describes-neither", "declared-debt"]),
    );
  });

  it("holds the pages whose whole job is describing the product", () => {
    // Named rather than left to the register's shape: these four are where a stale description does
    // the most damage. /faq's answers are also its FAQPage JSON-LD, so a stale one reaches search
    // engines; /privacy and /terms govern a product they must therefore describe completely; and
    // /examples is the page that claims to show what the product actually does.
    const both = mustNameBoth();
    for (const path of ["/faq", "/privacy", "/terms", "/examples"]) {
      expect(both, `${path} must owe an account of both interfaces`).toContain(path);
    }
  });

  it("does not let a surface be its own excuse", () => {
    // `is-one` is the stance most available for misuse: any page could claim to BE an interface and
    // stop owing an account. Bounded to the routes that genuinely are one, so widening it is a diff
    // somebody has to argue for.
    const isOne = INTERFACE_STANCES.filter((s) => s.stance === "is-one").map((s) => s.path).sort();
    expect(isOne).toEqual(["/finder", "/mission", "/network", "/network/[clinician]"]);
  });
});
