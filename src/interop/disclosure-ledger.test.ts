// W239 verify gate: "what left, to whom and when; W204's unresolved question — whether the log
// holds the FIGURES or only the fact of sending — is named in the module and left to the founder,
// with the model built so either answer is a one-line change."
//
// "ONE-LINE CHANGE" IS THE CLAIM THAT NEEDS PROVING, and it cannot be proved by reading the code —
// an optional `figures?` field would also look like a one-line change and would in fact be a
// decision made by whichever call site was written first. So the derivation is checked at the TYPE
// level for both settings, and the runtime boundary is checked for the setting that is live.

import { describe, expect, it } from "vitest";
import { lintEducationCopy } from "@/education/advice-lint";
import { PROPOSED_DISCLOSURE_LOG } from "@/reporting/retention";
import {
  DISCLOSURE_LIFE_DAYS,
  DISCLOSURE_OPEN_QUESTION,
  DISCLOSURE_PAYLOAD_POSTURE,
  DISCLOSURE_POSTURE_COPY,
  DISCLOSURE_REJECTION_COPY,
  SHIPPED_DISCLOSURES,
  appendDisclosure,
  disclosuresTo,
  type DisclosureEntry,
  type EntryUnder,
} from "./disclosure-ledger";
import * as mod from "./disclosure-ledger";
import { recordDisclosureConsent, withdrawDisclosureConsent, type DisclosureConsent } from "./disclosure-consent";

/**
 * A recorded permission, minted through W243's only door.
 *
 * W243 REQUIRED THIS FIXTURE TO CHANGE, and the typecheck is what said so: the entry type gained a
 * `consent` member and this file stopped compiling. That is the gate working — a disclosure cannot
 * be recorded as having happened without the thing that made it allowed, and the compiler is what
 * enforces it rather than a reviewer noticing.
 */
const consentFor = (recipient = "Example PHN", expiresOnIso: string | null = null): DisclosureConsent => {
  const result = recordDisclosureConsent({
    patientId: "pat-7",
    recipient,
    statement: "Agreed that the practice may send quarterly activity figures about their care to this recipient.",
    recordedAtIso: "2026-08-01",
    expiresOnIso,
    decision: "given",
  });
  if (!result.recorded) throw new Error("fixture consent was refused");
  return result.consent;
};

const entry = (over: Partial<DisclosureEntry> = {}): DisclosureEntry => ({
  disclosureId: "disc-1",
  practiceId: "prac-a",
  recipient: "Example PHN",
  what: "quarterly-reporting-summary",
  disclosedAtIso: "2026-08-20T09:15:00+10:00",
  basis: "Requested under the PHN's commissioning agreement, approved by the practice principal.",
  consent: consentFor(),
  ...over,
});

describe("W239 the open question is named, and either answer is one line", () => {
  it("carries W204's question verbatim rather than paraphrasing it", () => {
    // Two phrasings of one open question drift, and the drift is invisible — W177's rule, and the
    // reason this is `toBe` rather than "mentions figures".
    expect(DISCLOSURE_OPEN_QUESTION).toBe(PROPOSED_DISCLOSURE_LOG.openQuestion);
    expect(DISCLOSURE_OPEN_QUESTION).toMatch(/FIGURES/);
    expect(DISCLOSURE_OPEN_QUESTION).toMatch(/founder call/);
  });

  it("derives the entry shape from the constant, for BOTH answers", () => {
    // The claim that needs proving. An optional `figures?` field would look like a one-line change
    // too, and would leave the choice to whichever call site was written first. Checked at the type
    // level for both settings, so flipping the constant genuinely changes what compiles.
    const factOnly: EntryUnder<"fact_only"> = entry();
    expect(factOnly.recipient).toBe("Example PHN");
    // @ts-expect-error — under `fact_only` there is no `figures` member at all. Not optional: absent.
    void factOnly.figures;

    const withFigures: EntryUnder<"figures_included"> = {
      ...entry(),
      figures: { values: { invited: 120, attended: 31, incrementalAttended: null } },
    };
    expect(withFigures.figures.values.invited).toBe(120);
    // @ts-expect-error — and under `figures_included` it is required, so an entry without it does
    // not compile. That is what makes the change one line rather than a convention.
    const missing: EntryUnder<"figures_included"> = entry();
    void missing;
  });

  it("is set to fact_only today, and says what that means in a sentence", () => {
    expect(DISCLOSURE_PAYLOAD_POSTURE).toBe("fact_only");
    expect(Object.keys(DISCLOSURE_POSTURE_COPY).sort()).toEqual(["fact_only", "figures_included"]);
    expect(DISCLOSURE_POSTURE_COPY.fact_only).toMatch(/cannot answer what they were told/);
    // And the other answer's consequence is stated too, so the founder reads both before choosing.
    expect(DISCLOSURE_POSTURE_COPY.figures_included).toMatch(/lasting copy of practice-identifiable data/);
  });

  it("refuses figures at the boundary, not only in the type", () => {
    // A value crossing a module edge is `unknown` at runtime whatever the type said. This is the
    // check that stops figures reaching a fact-only ledger from a caller compiled against the other
    // answer — and it refuses rather than trimming, because silently dropping them would leave the
    // caller believing they were recorded.
    const smuggled = { ...entry(), figures: { values: { attended: 31 } } } as DisclosureEntry;
    const result = appendDisclosure([], smuggled);
    expect(result.appended).toBe(false);
    if (result.appended) return;
    expect(result.why).toBe("figures_under_fact_only");
    expect(result.copy).toMatch(/refused rather than trimmed/);
  });
});

describe("W239 it records what left, to whom and when — and refuses what it cannot", () => {
  it("appends a complete entry and returns a new ledger", () => {
    const result = appendDisclosure([], entry());
    expect(result.appended).toBe(true);
    if (!result.appended) return;
    expect(result.ledger).toHaveLength(1);
    expect(result.ledger[0]!.recipient).toBe("Example PHN");
    // A new ledger, not a mutated one: the input is untouched, which is what makes an append-only
    // record checkable rather than a claim about discipline.
    const before: DisclosureEntry[] = [];
    appendDisclosure(before, entry());
    expect(before).toHaveLength(0);
  });

  it("refuses each incomplete entry with its own reason", () => {
    const cases: Array<[string, DisclosureEntry, keyof typeof DISCLOSURE_REJECTION_COPY]> = [
      ["no id", entry({ disclosureId: "  " }), "no_disclosure_id"],
      ["no recipient", entry({ recipient: "" }), "no_recipient"],
      ["no basis", entry({ basis: "" }), "no_basis"],
      ["unreadable time", entry({ disclosedAtIso: "last Tuesday" }), "unreadable_timestamp"],
    ];
    const produced = new Set<string>();
    for (const [label, candidate, expected] of cases) {
      const result = appendDisclosure([], candidate);
      expect(result.appended, label).toBe(false);
      if (result.appended) continue;
      expect(result.why, label).toBe(expected);
      expect(result.copy, label).toBe(DISCLOSURE_REJECTION_COPY[expected]);
      produced.add(result.why);
    }
    const dup = appendDisclosure([entry()], entry());
    expect(dup.appended).toBe(false);
    if (!dup.appended) produced.add(dup.why);
    const smuggled = appendDisclosure([], { ...entry(), figures: {} } as DisclosureEntry);
    if (!smuggled.appended) produced.add(smuggled.why);
    const withoutPermission = appendDisclosure([], entry({ consent: consentFor("Somebody Else") }));
    if (!withoutPermission.appended) produced.add(withoutPermission.why);
    // Both directions: every declared rejection is reachable, and nothing reachable is undeclared.
    expect([...produced].sort()).toEqual(Object.keys(DISCLOSURE_REJECTION_COPY).sort());
  });

  it("refuses to overwrite an entry rather than replacing it", () => {
    // A ledger whose entries can be replaced cannot be relied on to say what left.
    const first = appendDisclosure([], entry());
    expect(first.appended).toBe(true);
    if (!first.appended) return;
    const again = appendDisclosure(first.ledger, entry({ recipient: "Somebody Else" }));
    expect(again.appended).toBe(false);
    if (!again.appended) expect(again.why).toBe("duplicate_disclosure_id");
    expect(first.ledger[0]!.recipient).toBe("Example PHN");
  });

  it("answers what one recipient was told, in the order it left", () => {
    let ledger: readonly DisclosureEntry[] = [];
    for (const [id, at, to] of [
      ["d3", "2026-08-22T09:00:00+10:00", "Example PHN"],
      ["d1", "2026-08-20T09:00:00+10:00", "Example PHN"],
      ["d2", "2026-08-21T09:00:00+10:00", "Another Recipient"],
    ] as const) {
      // Consent per RECIPIENT — the fixture that used one consent for both was refused for the
      // second, which is the model working: consent to one recipient is not consent to another.
      const result = appendDisclosure(
        ledger,
        entry({ disclosureId: id, disclosedAtIso: at, recipient: to, consent: consentFor(to) }),
      );
      if (result.appended) ledger = result.ledger;
    }
    expect(disclosuresTo(ledger, "Example PHN").map((e) => e.disclosureId)).toEqual(["d1", "d3"]);
    expect(disclosuresTo(ledger, "Another Recipient")).toHaveLength(1);
    expect(disclosuresTo(ledger, "Nobody")).toEqual([]);
  });
});

describe("W243 the ledger cannot record a disclosure that was not permitted", () => {
  it("refuses an entry whose consent was for a different recipient", () => {
    const result = appendDisclosure([], entry({ consent: consentFor("Somebody Else") }));
    expect(result.appended).toBe(false);
    if (result.appended) return;
    expect(result.why).toBe("consent_not_current");
    expect(result.copy).toMatch(/evidence that nobody checked/);
    expect(result.copy).toMatch(/Consent to one recipient is not consent to another/);
  });

  it("refuses an entry whose consent had been withdrawn before the disclosure", () => {
    const withdrawn = withdrawDisclosureConsent(consentFor(), "2026-08-10");
    const result = appendDisclosure([], entry({ consent: withdrawn }));
    expect(result.appended).toBe(false);
    if (!result.appended) expect(result.why).toBe("consent_not_current");
  });

  it("accepts a disclosure whose consent lapsed AFTER it left, because it happened lawfully", () => {
    // Checked at the moment of disclosure rather than of appending. A consent that was current when
    // the report left and lapsed before somebody wrote it down was a lawful disclosure, and refusing
    // it here would lose the record of a thing that actually happened.
    const lapsing = consentFor("Example PHN", "2026-08-21");
    const result = appendDisclosure([], entry({ consent: lapsing, disclosedAtIso: "2026-08-20T09:15:00+10:00" }));
    expect(result.appended).toBe(true);
    const later = appendDisclosure([], entry({
      disclosureId: "disc-late",
      consent: lapsing,
      disclosedAtIso: "2026-08-25T09:15:00+10:00",
    }));
    expect(later.appended).toBe(false);
  });
});

describe("W239 the store stays shut, and the ledger cannot recompute", () => {
  it("holds no store and has appended nothing", () => {
    expect(SHIPPED_DISCLOSURES).toEqual([]);
    expect(Object.keys(mod).filter((k) => typeof (mod as Record<string, unknown>)[k] === "function").sort()).toEqual([
      "appendDisclosure",
      "disclosuresTo",
    ]);
  });

  it("has no globalThis handle, no fetch and no rail import", () => {
    // W204's argument, which this unit is not entitled to override: a store that exists is a store
    // something can be written to, and G9 is unratified. And a ledger that could recompute would
    // answer today's question with today's figures and look right doing it.
    const code = require("node:fs")
      .readFileSync(new URL("./disclosure-ledger.ts", import.meta.url).pathname, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/\/\/[^\n]*/g, " ");
    expect(code, "the stripper removed the code too").toContain("export function appendDisclosure");
    expect(code).not.toMatch(/globalThis|\bfetch\s*\(|localStorage|\.query\(|\bawait\b/);
    // One import, and it is the retention posture it carries from.
    expect([...code.matchAll(/from "([^"]+)"/g)].map((m) => m[1]).sort()).toEqual(
      ["./disclosure-consent", "@/reporting/retention"].sort(),
    );
  });

  it("carries W204's proposed life rather than restating it", () => {
    expect(DISCLOSURE_LIFE_DAYS).toBe(PROPOSED_DISCLOSURE_LOG.proposedLifeDays);
    expect(DISCLOSURE_LIFE_DAYS).toBe(2555);

    // CHECKED ON HOW THE VALUE GOT THERE, not only on the value. Seeded with the number restated
    // as its own literal, the two assertions above both passed — 2555 equals 2555 — and the drift
    // they exist to prevent would only surface the day W204's number changed, which is exactly the
    // day nobody is looking at this file. The same shape-versus-content mistake as four other
    // guards corrected this session.
    const code = require("node:fs")
      .readFileSync(new URL("./disclosure-ledger.ts", import.meta.url).pathname, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/\/\/[^\n]*/g, " ");
    expect(code).toContain("PROPOSED_DISCLOSURE_LOG.proposedLifeDays");
    expect(code, "the retention life is written as its own number").not.toMatch(/\b2555\b/);
  });

  it("passes the advice linter on everything it says", () => {
    for (const text of [...Object.values(DISCLOSURE_REJECTION_COPY), ...Object.values(DISCLOSURE_POSTURE_COPY)]) {
      expect(lintEducationCopy(text).map((f) => f.rule), text.slice(0, 40)).toEqual([]);
    }
  });
});
