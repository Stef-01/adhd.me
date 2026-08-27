// O197: the mission page's words, held to the copy law everywhere except the one sentence the
// founder wrote — and the exclusion itself is what this file checks hardest.
//
// THE SHAPE, AND WHY IT IS THIS SHAPE. A filter that skips "founder copy" is one careless edit
// away from being a filter that skips whatever is inconvenient. So the split is DATA
// (`FOUNDER_AUTHORED`), it is asserted to be exactly one sentence, and the sentence is asserted
// to be the founder's actual words rather than whatever currently sits in the field. Everything
// on the other side of the split is linted with nothing behind it: the loop's own prose gets no
// benefit from standing next to copy that was ruled out of the loop's hands.
//
// AND THE ACCEPTANCE IS CHECKED FROM THIS END TOO. The rendered sweep reports the founder's
// sentence to the reviewers who own that call, which only works if the acceptance entries exist,
// name this path, and name the exact word the linters match. A missing entry would block the page;
// an entry keyed on the wrong match would pass it silently. Both are failures here.

import { describe, expect, it } from "vitest";
import { lintLandingCopy } from "@/compliance/landing";
import { ACCEPTED_FINDINGS, sweepSurface } from "@/compliance/public-surfaces";
import { eachOf } from "@/quality/non-vacuous";
import { NETWORK_SIZE } from "./gallery";
import { FOUNDER_AUTHORED, MISSION_COPY, missionCopyStrings, statesCovered } from "./mission";

/** Everything on the page that is the loop's own prose. */
function ourStrings(): string[] {
  return missionCopyStrings().filter((text) => !FOUNDER_AUTHORED.includes(text));
}

describe("O197 the mission page's copy", () => {
  it("lints every sentence that is ours, with no acceptance behind any of them", () => {
    const ours = ourStrings();
    // Non-vacuity: a refactor that stopped exporting the copy, or one that quietly widened
    // FOUNDER_AUTHORED, would otherwise lint nothing and pass.
    expect(ours.length).toBeGreaterThan(5);
    for (const text of eachOf(ours, "the mission page's own copy")) {
      expect(lintLandingCopy(text), `mission copy: "${text}"`).toEqual([]);
    }
  });

  it("excludes exactly one sentence, and only because the founder wrote it", () => {
    // The whole point of holding the exclusion as data. One entry, named, verbatim — so widening
    // it is a diff somebody has to argue for rather than a filter quietly growing.
    expect(FOUNDER_AUTHORED).toHaveLength(1);
    expect(FOUNDER_AUTHORED[0]).toBe(MISSION_COPY.statement);
    // The founder's brief, in the words they gave it in. If the sentence drifts from these, it is
    // no longer the copy the exclusion was granted for and this test says so.
    expect(MISSION_COPY.statement).toContain("find the best doctors in each state");
    expect(MISSION_COPY.statement).toContain("cultural and personal qualities");
    expect(MISSION_COPY.statement).toContain("more connected and comfortable");
  });

  it("keeps the excluded sentence inside the page's own copy, not beside it", () => {
    // A guard against the lazy fix: moving the founder's sentence out of MISSION_COPY would make
    // this file green and leave the sentence rendering unlinted and unreported. It must stay in
    // the bundle the sweep and the acceptance both key on.
    expect(missionCopyStrings()).toContain(MISSION_COPY.statement);
  });

  it("reports the founder's sentence rather than blocking it, via an acceptance per rule", () => {
    // The rendered sweep runs over /mission as a patient surface. Whatever it finds must be found
    // ONLY in the founder's sentence, and each finding must have an acceptance keyed to the exact
    // path, rule and matched word.
    const findings = sweepSurface("/mission", "patient", missionCopyStrings().join("\n"));
    expect(findings.length, "the sweep found nothing — the acceptance below would be stale").toBeGreaterThan(0);

    for (const finding of eachOf(findings, "the mission page's sweep findings")) {
      expect(
        MISSION_COPY.statement.toLowerCase(),
        `${finding.rule} matched "${finding.match}" outside the founder's sentence — that is the ` +
          `loop's own copy and has no acceptance behind it`,
      ).toContain(finding.match.toLowerCase());

      const accepted = ACCEPTED_FINDINGS.find(
        (a) => a.path === "/mission" && a.rule === finding.rule && a.match === finding.match,
      );
      expect(
        accepted,
        `/mission produces ${finding.rule} on "${finding.match}" with no acceptance — the page ` +
          `would block instead of reporting to the reviewers who own the call`,
      ).toBeDefined();
      expect(accepted!.why.length).toBeGreaterThan(200);
      expect(accepted!.reviewBy).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("accepts nothing on this path the page does not actually produce", () => {
    // The other direction, W102's shape. An acceptance for a finding the page no longer emits
    // reads as coverage, which is worse than no acceptance because it looks freshly considered.
    const produced = sweepSurface("/mission", "patient", missionCopyStrings().join("\n"));
    const forThisPage = eachOf(
      ACCEPTED_FINDINGS.filter((a) => a.path === "/mission"),
      "the acceptances entered against /mission",
    );
    for (const accepted of forThisPage) {
      expect(
        produced.some((f) => f.rule === accepted.rule && f.match === accepted.match),
        `/mission accepts ${accepted.rule} on "${accepted.match}" but no longer produces it — ` +
          `delete the entry rather than leaving a reassurance about a finding nobody has`,
      ).toBe(true);
    }
  });

  it("states the network's reach from the roster, so the page cannot outrun it", () => {
    // honesty.claim-earned. A mission about every state, on a page that does not say how many
    // states there are, is the exact gap between ambition and coverage this paragraph closes.
    expect(statesCovered()).toEqual(["New South Wales"]);
    expect(statesCovered([])).toEqual([]);
    expect(MISSION_COPY.reachBody).toContain("New South Wales");
    expect(NETWORK_SIZE).toBeGreaterThan(0);
  });

  it("says whose words a clinician's page carries, before sending anybody to read them", () => {
    // honesty.clinician-declaration, on the page that introduces the network rather than only on
    // the network itself: the reader is told the pages are each doctor's own account BEFORE they
    // click, not after.
    expect(MISSION_COPY.howBody).toMatch(/in the words each doctor chose/i);
    expect(MISSION_COPY.howBody).toMatch(/we do not rank them/i);
  });
});
