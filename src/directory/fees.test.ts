// W198 verify gate: no comparison, no ranking, no "value" language; the copy linter reaches every
// fee field.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { directoryCopyRules } from "./copy-lint";
import * as mod from "./fees";
import {
  BILLING_COPY,
  FEE_FIELDS,
  FEE_FIELD_LINTING,
  FEE_ONLY_RULES,
  FEE_REFUSAL_COPY,
  FEE_RULE_COPY,
  type FeeLine,
  REFUSED_FEE_FIELDS,
  feeCaveat,
  feeCopyRules,
  feeLines,
  feeSchedule,
  lintFeeText,
} from "./fees";

const line = (over: Partial<FeeLine> = {}): FeeLine => ({
  service: "Standard consultation",
  arrangement: "private_fee",
  feeCents: 9500,
  bulkBillingCriteria: null,
  ...over,
});

const bulk = line({ service: "Care plan review", arrangement: "bulk_billed", feeCents: null });
const mixed = line({
  service: "Long consultation",
  arrangement: "mixed",
  feeCents: 14500,
  bulkBillingCriteria: "Concession card holders and patients under 16.",
});

const ok = () => {
  const result = feeSchedule("prac-1", [line(), bulk, mixed], "2026-07-01");
  if (!result.ok) throw new Error(`fixture refused: ${result.errors.join(", ")}`);
  return result.schedule;
};

describe("W198 a fee is a fact the practice states", () => {
  it("builds a schedule and keeps the date it was stated on", () => {
    expect(ok().statedOn).toBe("2026-07-01");
    expect(ok().lines).toHaveLength(3);
  });

  it("renders no charge rather than a price of zero", () => {
    // Zero would read as a price. "No charge" is what a bulk-billed line means.
    const rendered = feeLines(ok());
    expect(rendered[1]!.amount).toBe("No charge");
    expect(rendered[0]!.amount).toBe("$95.00");
  });

  it("refuses a bulk-billed line that carries a fee, and a charged line that does not", () => {
    const both = feeSchedule(
      "prac-1",
      [line({ arrangement: "bulk_billed", feeCents: 9500 }), line({ feeCents: null })],
      "2026-07-01",
    );
    expect(both.ok).toBe(false);
    if (both.ok) return;
    expect(both.errors.sort()).toEqual(["fee_missing_on_a_charged_line", "fee_on_a_bulk_billed_line"]);
  });

  it("refuses mixed billing that does not say who is bulk billed", () => {
    const result = feeSchedule("prac-1", [line({ arrangement: "mixed", bulkBillingCriteria: " " })], "2026-07-01");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("criteria_missing_on_a_mixed_line");
  });

  it("refuses a fee with no date, because a fee nobody can date is one nobody can rely on", () => {
    const result = feeSchedule("prac-1", [line()], "soon");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("date_missing_or_unreadable");
  });

  it("returns every problem rather than the first", () => {
    const result = feeSchedule("prac-1", [line({ service: "", feeCents: -1 })], "nope");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.length).toBeGreaterThan(2);
  });

  it("explains every refusal it can give", () => {
    for (const [reason, copy] of Object.entries(FEE_REFUSAL_COPY)) {
      expect(copy.length, `${reason} has no explanation`).toBeGreaterThan(30);
    }
  });
});

describe("W198 what we charge is a fact; what you will pay is not", () => {
  it("has no out-of-pocket, rebate or gap field, and says why", () => {
    // The sharp refusal, and it is not about advertising. Told they will pay less than they do, a
    // patient finds out at the counter after the appointment.
    // Asserted on the FIELDS, not on the text. Scanning the rendered string was the first
    // version and it failed on this module's own honest sentence — BILLING_COPY says "you claim
    // your Medicare rebate afterwards", which is the framing that makes the refusal true rather
    // than a violation of it. Same collision as W184, W188 and W190: a scan whose subject is the
    // thing it bans matches the sentence doing the banning.
    for (const key of Object.keys(ok().lines[0]!)) {
      expect(key, `${key} is an out-of-pocket estimate`).not.toMatch(/outOfPocket|rebate|gap|discount/i);
    }
    expect(Object.keys(feeLines(ok())[0]!).sort()).toEqual(["amount", "note", "service"]);
    for (const [field, why] of Object.entries(REFUSED_FEE_FIELDS)) {
      expect(why.length, `${field} is refused without a reason`).toBeGreaterThan(80);
      expect(FEE_FIELDS, `${field} is both offered and refused`).not.toContain(field);
    }
    expect(Object.keys(REFUSED_FEE_FIELDS)).toContain("outOfPocketCents");
  });

  it("refuses copy that estimates what a patient will pay", () => {
    for (const attempt of [
      "Standard consultation, about $40 out of pocket",
      "Long consultation — you'll pay $53 after the rebate",
      "No-gap appointments available",
    ]) {
      const result = feeSchedule("prac-1", [line({ service: attempt })], "2026-07-01");
      expect(result.ok, attempt).toBe(false);
      if (result.ok) continue;
      expect(result.errors).toContain("copy_makes_a_claim");
    }
  });

  it("says the distinction in the caveat that travels with the schedule", () => {
    // Rendered, not documented — W149's rule for anything that leaves the product that explains it.
    const caveat = feeCaveat(ok());
    expect(caveat).toContain("2026-07-01");
    expect(caveat).toContain("not an estimate of your final cost");
    expect(caveat).toContain("your own");
  });
});

describe("W198 no comparison, no ranking", () => {
  it("refuses comparative and value language on any fee field", () => {
    const attempts: Array<[string, Partial<FeeLine>]> = [
      ["great value", { service: "Standard consultation — great value" }],
      ["cheaper", { service: "Cheaper than the clinic down the road" }],
      ["affordable", { service: "Affordable long consultation" }],
      ["discount", { arrangement: "mixed", bulkBillingCriteria: "Discount for regulars." }],
    ];
    for (const [label, over] of attempts) {
      const result = feeSchedule("prac-1", [line(over)], "2026-07-01");
      expect(result.ok, label).toBe(false);
      if (result.ok) continue;
      expect(result.violations.length, label).toBeGreaterThan(0);
    }
  });

  it("keeps the practice's declared order and offers no way to sort by price", () => {
    // A price list sorted by price is a price-comparison site, and it would be one `sort` away.
    // The order out is the order in, whatever the prices are.
    const cheapLast = feeSchedule(
      "prac-1",
      // Named so the fixture does not trip the value rules it is not testing — "Cheap second"
      // was the first attempt and `no-value-language` refused it, correctly.
      [line({ service: "Longer appointment", feeCents: 20000 }), line({ service: "Brief appointment", feeCents: 5000 })],
      "2026-07-01",
    );
    expect(cheapLast.ok).toBe(true);
    if (!cheapLast.ok) return;
    expect(feeLines(cheapLast.schedule).map((l) => l.service)).toEqual([
      "Longer appointment",
      "Brief appointment",
    ]);

    for (const name of Object.keys(mod)) {
      expect(name, `${name} sounds like ordering or comparison`).not.toMatch(
        /sort|rank|cheapest|compare|order[A-Z]|byPrice/i,
      );
    }
  });

  it("reads no price for ordering anywhere in the module", () => {
    // Structural: a comparator over feeCents is what a ranking would be built from.
    // Narrowed to sorting by PRICE. Banning `.sort(` outright was the first version and it failed
    // on `feeCopyRules`, which sorts rule NAMES — ordering a rule list is not ordering a price
    // list, and a check that cannot tell them apart would push the next author into a worse
    // shape to get around it.
    const source = readFileSync(path.join(__dirname, "fees.ts"), "utf8");
    // A comparator between TWO fees, not any comparison involving one — `line.feeCents < 0` is
    // validation, and the first version of this banned it. Fifth collision of the same shape in
    // five units; see the method note in fees.ts.
    const priceComparator = /\.feeCents\s*[-<>]\s*\w+\.feeCents/;
    expect(source).not.toMatch(priceComparator);
    expect(source).not.toMatch(/sort\([^)]*fee/i);
    // Non-vacuous: the matcher does find a price comparator when there is one.
    expect(priceComparator.test("lines.sort((a, b) => a.feeCents - b.feeCents)")).toBe(true);
  });

  it("explains every fee-specific rule it adds", () => {
    for (const rule of FEE_ONLY_RULES) {
      expect(FEE_RULE_COPY[rule], `${rule} has no explanation`).toBeDefined();
      expect(FEE_RULE_COPY[rule]!.length).toBeGreaterThan(80);
    }
    expect(FEE_ONLY_RULES.length).toBeGreaterThan(2);
  });
});

describe("W198 the copy linter reaches every fee field", () => {
  it("declares one disposition per field, both directions", () => {
    // W184's shape. A field added to the schedule fails here until somebody says how it is linted.
    expect(Object.keys(FEE_FIELD_LINTING).sort()).toEqual([...FEE_FIELDS].sort());
    for (const [field, disposition] of Object.entries(FEE_FIELD_LINTING)) {
      if (disposition.kind === "structured") {
        expect(disposition.why.length, `${field} is exempt without a reason`).toBeGreaterThan(40);
      }
    }
  });

  it("declares every field the schedule's own values carry", () => {
    // Checked against a real value rather than a list retyped here — a list that agrees with
    // itself forever is the failure W102 exists against.
    const [first] = ok().lines;
    for (const key of Object.keys(first!)) {
      expect(FEE_FIELDS, `${key} is on a FeeLine but not declared`).toContain(key);
    }
    expect(FEE_FIELDS).toContain("statedOn");
  });

  it("walks every linted field — a violation in each is reported", () => {
    // Seeded in turn, so a `continue` added to the loop would pass every other test here.
    const seeded: Array<[string, FeeLine]> = [
      ["lines[0].service", line({ service: "Great value consultation" })],
      [
        "lines[0].bulkBillingCriteria",
        line({ arrangement: "mixed", bulkBillingCriteria: "Cheaper for regulars." }),
      ],
    ];
    for (const [field, seededLine] of seeded) {
      const result = feeSchedule("prac-1", [seededLine], "2026-07-01");
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.violations.map((v) => v.field), field).toContain(field);
    }
  });

  it("applies W23 and W6's rules too, unioned rather than restated", () => {
    // W139's device, fourth use. A rule added upstream reaches fee copy the same day.
    const rules = feeCopyRules(directoryCopyRules());
    for (const rule of directoryCopyRules()) expect(rules).toContain(rule);
    for (const rule of FEE_ONLY_RULES) expect(rules).toContain(rule);
    expect(feeCopyRules(["no-invented-rule"])).toContain("no-invented-rule");
    // And through the real path, not only in the list.
    expect(lintFeeText("we treat diabetes", "lines[0].service").map((v) => v.rule)).toContain(
      "no-clinical-claims",
    );
  });

  it("lints the copy this module ships, not only the copy a practice supplies", () => {
    // BILLING_COPY renders to a patient. A module that lints its input and not its own output has
    // checked the wrong half — W154's shape.
    for (const [arrangement, copy] of Object.entries(BILLING_COPY)) {
      expect(lintFeeText(copy, arrangement), `BILLING_COPY.${arrangement} fails its own rules`).toEqual([]);
    }
    expect(lintFeeText(feeCaveat(ok()), "caveat")).toEqual([]);
  });

  it("passes an ordinary schedule, so the refusals mean something", () => {
    const result = feeSchedule("prac-1", [line(), bulk, mixed], "2026-07-01");
    expect(result.ok).toBe(true);
  });
});
