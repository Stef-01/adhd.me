// Y5-1: the guardrail alert on /console/results counts every practice's complaints.
//
// W206's discipline, followed rather than described: the finding is confirmed by writing the
// failing test FIRST, before the fix and before the write-up. A finding a test has not reproduced
// is a hypothesis about code somebody read.
//
// THE SHAPE IS Y4-1'S, IN A THIRD PLACE. Y4-1 was the complaints page rendering the whole store,
// and the console home rendering an unfiltered open count as "N open complaints — review now".
// W206 fixed both. `app/console/results/page.tsx` does the same thing a third time:
//
//     metricsFromSim(runSim(DEFAULT_SIM_CONFIG), getComplaints().complaints)
//
// `getComplaints().complaints` is the entire store. `metricsFromSim` counts the open ones, and
// `evaluateGuardrails` turns that count into an alert rendered to whichever practice is signed in.
// The page resolves no practice anywhere — there is no `practiceRecord`, no `activePracticeFor`.
//
// WHAT IS AND IS NOT LEAKED, because the severity turns on it. No complaint ROW is rendered here,
// so unlike Y4-1 no patient-linked data reaches the screen. What crosses the boundary is the
// EXISTENCE AND COUNT of other practices' open complaints, and the consequence W206 named for the
// console home applies unchanged: a practice with none of its own is shown a guardrail alert about
// somebody else's, which is a false call to action about a monitor that is supposed to be the
// practice's own.

import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_GUARDRAILS, evaluateGuardrails, metricsFromSim } from "@/guardrails/monitors";
import { complaintsFor, getComplaints, resetComplaints, submitComplaint } from "@/complaints/store";
import { onboardPractice, practicesFor, resetConsole } from "@/console/store";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";

const AT = "2026-08-21T00:00:00+10:00";
const ALICE = "alice@practice-a.test";
const BOB = "bob@practice-b.test";

function twoPractices(): { aliceId: string; bobId: string } {
  resetConsole();
  resetComplaints();
  expect(onboardPractice({ name: "Practice A", timezone: "Australia/Sydney", holdoutPercent: 10 }, AT, ALICE)).toEqual({});
  expect(onboardPractice({ name: "Practice B", timezone: "Australia/Perth", holdoutPercent: 20 }, AT, BOB)).toEqual({});
  return {
    aliceId: practicesFor(ALICE)[0]!.practice.id as string,
    bobId: practicesFor(BOB)[0]!.practice.id as string,
  };
}

describe("Y5-1 the results page's complaint monitor is not scoped to a practice", () => {
  beforeEach(() => {
    resetConsole();
    resetComplaints();
  });

  // `runSim` dominates this file's runtime, and nothing here varies with it — every assertion is
  // about the COMPLAINT list handed alongside. Run once.
  const SIM = runSim(DEFAULT_SIM_CONFIG);

  it("counts only the signed-in practice's complaints, not the store's", () => {
    const { aliceId, bobId } = twoPractices();
    // Bob has an open complaint. Alice has none.
    submitComplaint({ channel: "phone", summary: "Bob's practice, unhappy about timing", wantsOptOut: false }, AT, bobId);
    expect(complaintsFor(aliceId), "the fixture gave Alice a complaint").toEqual([]);
    expect(complaintsFor(bobId).length).toBe(1);

    // What the page computes NOW, scoped as the query.
    const forAlice = metricsFromSim(SIM, [...complaintsFor(aliceId)]);
    expect(forAlice.openComplaints, "Alice's monitor counted somebody else's complaint").toBe(0);
    expect(metricsFromSim(SIM, [...complaintsFor(bobId)]).openComplaints).toBe(1);

    // And the unscoped expression, which is what the page used to run: it still counts Bob's,
    // so the assertion above is not passing because the store happens to be empty.
    expect(
      metricsFromSim(SIM, getComplaints().complaints).openComplaints,
      "the store holds nothing — the scoped assertion above proves nothing",
    ).toBe(1);
  });

  it("shows Alice no alert that Bob's complaint would have raised", () => {
    const { aliceId, bobId } = twoPractices();
    submitComplaint({ channel: "phone", summary: "Bob's practice, unhappy about timing", wantsOptOut: false }, AT, bobId);
    const scoped = evaluateGuardrails(metricsFromSim(SIM, [...complaintsFor(aliceId)]), DEFAULT_GUARDRAILS);
    const unscoped = evaluateGuardrails(metricsFromSim(SIM, getComplaints().complaints), DEFAULT_GUARDRAILS);
    // The two differ, which is the whole finding: the page's old expression raised an alert on
    // Alice's screen that her own practice had not earned.
    expect(unscoped.map((a) => a.monitor).sort()).not.toEqual(scoped.map((a) => a.monitor).sort());
    expect(scoped.some((a) => a.monitor === "complaints")).toBe(false);
    expect(unscoped.some((a) => a.monitor === "complaints")).toBe(true);
  });

  it("holds against the page itself, so the fix cannot be reverted quietly", () => {
    // The regression guard proper. The assertions above are about `metricsFromSim`; this one is
    // about the CALL SITE, which is where the defect actually lived and where a future edit would
    // reintroduce it.
    // Comments stripped first, and the stripper checked. This guard fired on its own page's
    // comment — which quotes the old expression in order to explain the fix — and that is the
    // SIXTH time in this session's work that a source scan has matched the sentence describing its
    // own rule. See AUDIT-Y5.md: the recurrence is a finding, not a nuisance.
    const raw = readFileSync(path.join(process.cwd(), "app/console/results/page.tsx"), "utf8");
    const page = raw
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/.*$/gm, "$1 ");
    expect(page, "the stripper emptied the page").toContain("export default async function");
    expect(page, "the results page reads the whole complaints store again").not.toContain(
      "getComplaints()",
    );
    expect(page, "the results page no longer scopes its complaint monitor").toContain(
      "complaintsFor(record.practice.id",
    );
    // And it resolves a practice at all — the page had no practice context whatsoever.
    expect(page).toContain("requirePractice()");
  });
});
