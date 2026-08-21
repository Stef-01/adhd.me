// W246 verify gate (unit half): the absences are derived from the lane's own registers, and no
// count is rendered without the sentence saying which kind of zero it is.
//
// THE TEST THAT MATTERS MOST IS THE DERIVATION ONE. A page that listed these absences by hand would
// pass every assertion about its contents and go stale the first time a module changed — which is
// the failure W226 was built to close one lane over. So each absence is checked against the module
// that owns it rather than against a string in this file.

import { describe, expect, it, vi } from "vitest";
import { lintEducationCopy } from "@/education/advice-lint";
import { CONFIGURED_INTEGRATIONS, CREDENTIAL_GATES } from "@/interop/credentials";
import { SHIPPED_DISCLOSURES } from "@/interop/disclosure-ledger";
import { APPOINTMENT_UNMAPPED, SHIPPED_MAPPINGS } from "@/interop/fhir";
import { REFERRAL_PROFILE_EMPTY_SLOTS, SHIPPED_REFERRAL_PROFILES } from "@/interop/referral-profile";
import { OPEN_LOCAL_SYSTEMS, SHIPPED_BINDINGS, codesNeedingBinding, loadBindings, unboundCodes } from "@/interop/terminology";
import {
  ATTEMPTED_NOT_CONFIRMED,
  INTEROP_GATE_OPEN,
  INTEROP_HEADLINE,
  NONE_OF_THIS_KIND,
  NOTHING_ATTEMPTED,
  interopView,
  meaningFor,
} from "./interop";

describe("W246 a zero says which kind of zero it is", () => {
  it("carries the meaning on every count, as a field rather than as a footnote", () => {
    const view = interopView();
    expect(view.exchanged.length).toBeGreaterThan(3);
    for (const row of view.exchanged) {
      expect(row.count, `${row.label} is not zero — the page's premise has changed`).toBe(0);
      expect(row.meaning, `${row.label} has no meaning attached`).toBe(NOTHING_ATTEMPTED);
    }
    // The distinction this page exists for, in the sentence itself.
    expect(NOTHING_ATTEMPTED).toMatch(/not a count of successful exchanges/);
    expect(INTEROP_HEADLINE).toMatch(/because nothing was attempted, not because everything succeeded/);
  });

  it("says nothing has been exchanged, and that is a fact about the lane", () => {
    // Read from the modules rather than asserted here: if any of them stopped being empty this
    // would fail, which is what makes the page's claim checkable rather than a comment.
    expect(interopView().anythingExchanged).toBe(false);
    expect(SHIPPED_MAPPINGS).toEqual([]);
    expect(SHIPPED_REFERRAL_PROFILES).toEqual([]);
    expect(SHIPPED_DISCLOSURES).toEqual([]);
    expect(CONFIGURED_INTEGRATIONS).toEqual([]);
    expect(INTEROP_GATE_OPEN).toBe(false);
  });

  it("would report an exchange if one had happened, so the emptiness is not the code", async () => {
    // Non-vacuity for the claim above, and the only version of it worth having: the view is run
    // against a lane where one collection is NOT empty, and asked what it says. The first draft of
    // this test built a populated array locally and asserted `populated.length > 0 || ...`, which
    // short-circuits on its own first term and never touches `interopView` at all — a test that
    // could not fail is not a test.
    vi.resetModules();
    vi.doMock("@/interop/fhir", async () => ({
      ...(await vi.importActual<typeof import("@/interop/fhir")>("@/interop/fhir")),
      SHIPPED_MAPPINGS: [{ resource: {} }],
    }));
    const seeded = await import("./interop");
    const view = seeded.interopView();
    vi.doUnmock("@/interop/fhir");
    vi.resetModules();

    expect(view.anythingExchanged, "a populated collection did not reach the view").toBe(true);
    // And the page stops saying nothing was exchanged, rather than saying it above a count of one.
    expect(view.headline).not.toBe(seeded.INTEROP_HEADLINE);
    expect(view.headline).toBe(seeded.SOMETHING_EXCHANGED_HEADLINE);
    const mapped = view.exchanged.find((r) => r.label.startsWith("Appointments"))!;
    expect(mapped.count).toBe(1);
    expect(mapped.meaning, "a non-zero count kept the nothing-was-attempted sentence").toBe(
      seeded.ATTEMPTED_NOT_CONFIRMED,
    );
    // The siblings are still zero, but a different zero: something was tried, just not this.
    const referrals = view.exchanged.find((r) => r.label === "Referrals sent")!;
    expect(referrals.count).toBe(0);
    expect(referrals.meaning).toBe(seeded.NONE_OF_THIS_KIND);
    // And the absence that asserted nothing had been attempted no longer says so.
    expect(view.notExchanged.map((n) => n.what)).not.toContain(
      "No exchange has an outcome, because none has been attempted",
    );
  });

  it("picks the sentence from the count and the lane, with no fourth case", () => {
    // The rule on its own, so the three kinds of zero are pinned somewhere a reader can see them
    // side by side rather than inferred from the seeded view above.
    expect(meaningFor(0, false)).toBe(NOTHING_ATTEMPTED);
    expect(meaningFor(0, true)).toBe(NONE_OF_THIS_KIND);
    expect(meaningFor(3, true)).toBe(ATTEMPTED_NOT_CONFIRMED);
    // A count above zero says the same thing whatever the rest of the lane did.
    expect(meaningFor(3, false)).toBe(ATTEMPTED_NOT_CONFIRMED);
    // The three are distinct sentences, not three names for one.
    expect(new Set([NOTHING_ATTEMPTED, NONE_OF_THIS_KIND, ATTEMPTED_NOT_CONFIRMED]).size).toBe(3);
    // Each says what the number is NOT, which is the half a reader supplies wrongly on their own.
    expect(NONE_OF_THIS_KIND).toMatch(/not the same as nothing having been tried/);
    expect(ATTEMPTED_NOT_CONFIRMED).toMatch(/not a count of deliveries/);
  });
});

describe("W246 the absences are derived from the modules that own them", () => {
  it("counts the unbound codes from W238's own work order", () => {
    const unbound = unboundCodes(loadBindings(SHIPPED_BINDINGS));
    const view = interopView();
    const entry = view.notExchanged.find((n) => n.what.includes("terminology binding"));
    expect(entry, "the unbound codes are not on the page").toBeDefined();
    expect(entry!.what).toContain(`${unbound.length} of ${codesNeedingBinding().length}`);
    expect(unbound.length).toBeGreaterThan(8);
    expect(entry!.declaredIn).toBe("src/interop/terminology.ts");
  });

  it("counts the unsent fields and empty slots from their own registers", () => {
    const view = interopView();
    const fields = view.notExchanged.find((n) => n.what.includes("appointment fields"));
    expect(fields!.what).toContain(`${APPOINTMENT_UNMAPPED.length} appointment fields`);
    expect(fields!.why).toContain(APPOINTMENT_UNMAPPED[0]!.why);

    const slots = view.notExchanged.find((n) => n.what.includes("slots in a referral"));
    expect(slots!.what).toContain(`${REFERRAL_PROFILE_EMPTY_SLOTS.length} slots`);
    expect(REFERRAL_PROFILE_EMPTY_SLOTS.length).toBeGreaterThan(3);

    const open = view.notExchanged.find((n) => n.what.includes("no fixed vocabulary"));
    expect(open!.what).toContain(`${OPEN_LOCAL_SYSTEMS.length} code systems`);
    expect(open!.why).toContain(OPEN_LOCAL_SYSTEMS[0]!.why);
  });

  it("gives every absence a reason and a place to check it", () => {
    const view = interopView();
    expect(view.notExchanged.length).toBeGreaterThan(4);
    for (const item of view.notExchanged) {
      expect(item.why.length, `${item.what} has no reason`).toBeGreaterThan(80);
      expect(item.declaredIn, `${item.what} says nowhere to check`).toMatch(/^src\/interop\//);
    }
    // The absences are the longer half — the row's own emphasis, checked rather than intended.
    expect(view.notExchanged.length).toBeGreaterThan(view.exchanged.length);
  });

  it("names the gate and carries W242's actual refusal, not a restatement", () => {
    const view = interopView();
    expect(view.gate.name).toBe("G1");
    expect(view.gate.covers).toBe(CREDENTIAL_GATES.G1.covers);
    expect(view.gate.refusal).toMatch(/G1/);
    expect(view.gate.refusal).toContain(CREDENTIAL_GATES.G1.covers);
  });

  it("passes the advice linter on everything it authors", () => {
    for (const text of [INTEROP_HEADLINE, NOTHING_ATTEMPTED]) {
      expect(lintEducationCopy(text).map((f) => f.rule), text.slice(0, 40)).toEqual([]);
    }
  });
});
