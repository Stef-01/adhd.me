// W182: "the send path is unwired" as a control rather than a claim.
//
// `docs/GATE-DOSSIER-Q14.md` prices G3, and its whole argument rests on one fact: nothing in
// this tree can send an SMS to anybody. Every previous dossier established a fact like that by
// somebody looking, and Q13's found a two-year-old inconsistency that had survived precisely
// because looking is something people stop doing. A check that runs only when somebody remembers
// is the control this tree has watched fail — at W102 for surfaces, W106 for record classes,
// W107 for reachability, W167 for folds. This is the same move for the send path.
//
// The rule: only the SIMULATOR may hold an SMS adapter, and only the messaging package itself
// may name one. A page, a server action, a route handler or an engine module acquiring one is
// the moment G3 stops being enforced by inspection and starts being enforced by a founder
// remembering — and it is the moment the dossier becomes wrong.
//
// This is deliberately NOT a check that `TwilioSmsAdapter` refuses twilio.com; that is W31's own
// test and it passes. The gap it leaves is the interesting one: a wired-up MockSmsAdapter would
// satisfy every existing test in this package while making "nothing has ever been sent" false.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..");

/**
 * Where an SMS adapter is allowed to appear.
 *
 * `src/messaging` owns the adapters, so naming one there is the definition rather than a use.
 * `src/sim` runs the simulator against synthetic recipients, which is the one place a send is
 * both harmless and the point. Anything else is the finding.
 */
const ALLOWED = ["src/messaging/", "src/sim/"];

/** Constructing an adapter, or calling send on something. Both are "wired". */
const WIRED = /new\s+(?:Twilio|Mock)SmsAdapter\b|:\s*SmsAdapter\b|\.send\s*\(/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    if (!/\.tsx?$/.test(full) || /\.test\.tsx?$/.test(full)) return [];
    return [full];
  });
}

const rel = (file: string) => path.relative(ROOT, file).split(path.sep).join("/");

function wiredOutsideTheSimulator(): string[] {
  return [...sourceFiles(path.join(ROOT, "src")), ...sourceFiles(path.join(ROOT, "app"))]
    .map(rel)
    .filter((file) => !ALLOWED.some((prefix) => file.startsWith(prefix)))
    .filter((file) => WIRED.test(readFileSync(path.join(ROOT, file), "utf8")))
    .sort();
}

describe("W182 nothing outside the simulator can send", () => {
  it("no page, route or engine module holds an SMS adapter", () => {
    const wired = wiredOutsideTheSimulator();
    expect(
      wired,
      `these modules can now send, which makes docs/GATE-DOSSIER-Q14.md wrong: ${wired.join(", ")}`,
    ).toEqual([]);
  });

  it("the scan reaches the tree it claims to", () => {
    // Vacuity guard. A walk that found nothing would satisfy the assertion above while checking
    // nothing at all — the failure mode every register in this tree is built against.
    const scanned = [...sourceFiles(path.join(ROOT, "src")), ...sourceFiles(path.join(ROOT, "app"))];
    expect(scanned.length).toBeGreaterThan(100);
    expect(scanned.map(rel)).toContain("app/console/outreach/page.tsx");
    expect(scanned.map(rel)).toContain("src/engine/attribution.ts");
  });

  it("the detector would notice a wired module", () => {
    // The pattern is checked against text that should match, so a regex that silently stopped
    // matching cannot pass as "nothing found".
    for (const wired of [
      "const sms = new MockSmsAdapter();",
      "const sms = new TwilioSmsAdapter(config, log);",
      "async function go(adapter: SmsAdapter) {}",
      "await adapter.send({ to, body });",
    ]) {
      expect(WIRED.test(wired), `the detector missed: ${wired}`).toBe(true);
    }
    expect(WIRED.test("// nothing is sent from this page")).toBe(false);
  });

  it("the simulator is where the one live wiring lives, and it is synthetic", () => {
    // Non-vacuous from the other side: the exemption is doing real work rather than covering an
    // empty set, and what it covers sends to `synthetic:` recipients.
    const harness = readFileSync(path.join(ROOT, "src/sim/harness.ts"), "utf8");
    expect(WIRED.test(harness)).toBe(true);
    expect(harness).toContain("new MockSmsAdapter()");
    expect(harness).toContain("synthetic:");
    expect(harness).not.toContain("TwilioSmsAdapter");
  });
});
