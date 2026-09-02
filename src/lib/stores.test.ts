// W51 audit fix. The point of this file is the completeness test: a registry that must be
// updated by hand is a registry that drifts, and this one had already drifted four stores
// deep before anyone noticed (the demo's missing rate-limit reset made relaunched demos
// refuse bookings for no visible reason).
//
// So the registry is checked against the source tree. Adding a store without registering it
// fails here, at the point the store is added, rather than silently in a demo months later.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resetAllStores, STORE_RESETTERS } from "./stores";

const SRC = path.resolve(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith(".ts") && !full.endsWith(".test.ts") ? [full] : [];
  });
}

/**
 * Every `export function resetX()` in src/, by name — excluding this module's own aggregate,
 * which resets stores rather than being one.
 */
function exportedResetters(): string[] {
  const found = new Set<string>();
  for (const file of sourceFiles(SRC)) {
    if (file.endsWith(path.join("lib", "stores.ts"))) continue;
    for (const m of readFileSync(file, "utf8").matchAll(/^export function (reset[A-Za-z0-9_]*)\s*\(/gm)) {
      found.add(m[1]!);
    }
  }
  return [...found].sort();
}

describe("W51 audit fix: the store registry cannot drift", () => {
  it("registers every reset function the source tree exports", () => {
    // If this fails, a store was added without joining the registry — which is exactly how
    // the demo ended up unable to reset the rate limiter, the registers, the capability
    // graph and the interest store.
    const exported = exportedResetters();
    const registered = Object.keys(STORE_RESETTERS).sort();
    const missing = exported.filter((name) => !registered.includes(name));
    expect(missing, `unregistered store resetters: ${missing.join(", ")}`).toEqual([]);
  });

  it("registers nothing that no longer exists", () => {
    const exported = exportedResetters();
    const stale = Object.keys(STORE_RESETTERS).filter((name) => !exported.includes(name));
    expect(stale, `registry names a resetter the tree no longer exports: ${stale.join(", ")}`).toEqual([]);
  });

  it("includes the rate limiter — the one whose absence broke relaunched demos", () => {
    expect(Object.keys(STORE_RESETTERS)).toContain("resetRateLimits");
  });

  it("resetAllStores runs every registered resetter without throwing", () => {
    expect(() => resetAllStores()).not.toThrow();
    expect(Object.keys(STORE_RESETTERS).length).toBeGreaterThanOrEqual(10);
  });

  it("U4: gives every store its own globalThis key, so one reset cannot empty another", () => {
    // The reporter's first draft reused `__adhdMeOps`, the ops store's key. Each module's reset
    // then replaced the other's state: /console/ops threw on a missing switch after the reporter
    // reset, and the reporter threw on a missing ring after the demo reset. Both passed alone.
    const owners = new Map<string, string[]>();
    for (const file of sourceFiles(SRC)) {
      for (const m of readFileSync(file, "utf8").matchAll(/globalThis as \{\s*(__adhdMe[A-Za-z0-9_]*)\??:/g)) {
        owners.set(m[1]!, [...(owners.get(m[1]!) ?? []), path.relative(SRC, file)]);
      }
    }
    expect(owners.size, "no globalThis store keys found — the scanner sees nothing").toBeGreaterThanOrEqual(10);
    const shared = [...owners].filter(([, files]) => files.length > 1).map(([key, files]) => `${key}: ${files.join(", ")}`);
    expect(shared, `a globalThis key is owned by more than one module: ${shared.join("; ")}`).toEqual([]);
  });
});
