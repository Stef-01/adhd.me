// W244 verify gate: "a failed or unacknowledged exchange is `unknown`, never 'delivered' — W170's
// rule applied at the one boundary where the tree cannot see the other side."
//
// THE LOAD-BEARING TEST IS THE 200 WITH NOTHING IN IT. Every integration in the world reads a
// success status as delivery, and it is the single most common way "we sent it" becomes "they got
// it" without anybody deciding to lie. So the sweep runs every status code that looks like success
// and asserts none of them reaches `acknowledged`.
//
// The resolution property is swept rather than sampled, for the same reason W243's was: the shapes
// that break it are the ones nobody writes a case for — a retry whose second failure clears the
// first, a "no news is good news" window, a reconciliation that reads absence from an error report
// as confirmation.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { lintEducationCopy } from "@/education/advice-lint";
import { OUTCOME_VERDICT_COPY } from "@/outcomes/model";
import * as mod from "./exchange";
import {
  EXCHANGE_OUTCOME_COPY,
  UNKNOWN_REASON_COPY,
  exchangeOutcome,
  readExchange,
  wasReceived,
  type ExchangeRecord,
  type ExchangeResponse,
} from "./exchange";

const SOURCE = readFileSync(path.join(process.cwd(), "src/interop/exchange.ts"), "utf8");
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");

const response = (over: Partial<ExchangeResponse> = {}): ExchangeResponse => ({
  completed: true,
  status: 200,
  theirAcknowledgement: null,
  theirRefusal: null,
  unreadable: false,
  atIso: "2026-08-20T09:15:00+10:00",
  ...over,
});

type UnknownWhy = keyof typeof UNKNOWN_REASON_COPY;

const unknown = (why: UnknownWhy = "timed_out"): ExchangeRecord => ({
  outcome: "unknown",
  why,
  atIso: "2026-08-20T09:15:00+10:00",
});

describe("W244 a success status is not an acknowledgement", () => {
  it("reads every success-looking status with an empty payload as unknown", () => {
    // The whole unit. A 200 says a request reached something willing to answer — a gateway, a
    // queue, a load balancer — and none of those is the system that was supposed to receive this.
    let checked = 0;
    for (const status of [200, 201, 202, 203, 204, 299]) {
      const record = readExchange(response({ status }));
      checked += 1;
      expect(record.outcome, `status ${status} was read as delivery`).toBe("unknown");
      if (record.outcome !== "unknown") continue;
      expect(record.why).toBe("no_acknowledgement_in_payload");
    }
    expect(checked).toBe(6);
  });

  it("consults the status for nothing at all, checked on the source", () => {
    // Carried for the record and nothing more. A branch on `status` is how a status code comes to
    // decide an outcome six months from now, in a commit that looks like handling an edge case.
    expect(CODE, "the stripper removed the code too").toContain("export function readExchange");
    expect(CODE, "the outcome is decided from a status code").not.toMatch(
      /status\s*(===|!==|>=|<=|>|<)|\bstatus\b\s*\?\?|Math\.floor\(\s*\w*status/,
    );
  });

  it("reaches acknowledged only through the other side's own words", () => {
    const acked = readExchange(
      response({ status: null, theirAcknowledgement: { by: "Example PHN", reference: "PHN-9931" } }),
    );
    expect(acked.outcome).toBe("acknowledged");
    if (acked.outcome !== "acknowledged") return;
    expect(acked.theirReference).toBe("PHN-9931");
    // And it works with NO status at all, which is the proof that the payload is the route: a
    // transport that reported nothing still yields an acknowledgement when the other side spoke.
    expect(wasReceived({ attempts: [acked] })).toBe(true);
  });

  it("keeps a refusal out of the failure bucket", () => {
    // The other side saying no is a working exchange with a negative answer. Folding it into the
    // errors loses the one piece of information that would tell somebody what to fix.
    const refused = readExchange(
      response({ status: 422, theirRefusal: { by: "Example PHN", reason: "Patient is not on our list." } }),
    );
    expect(refused.outcome).toBe("refused");
    if (refused.outcome !== "refused") return;
    expect(refused.theirReason).toBe("Patient is not on our list.");
    expect(wasReceived({ attempts: [refused] })).toBe(false);
    expect(EXCHANGE_OUTCOME_COPY.refused).toMatch(/not a failure/);
  });

  it("gives every way of not knowing its own reason", () => {
    const produced = new Set<string>();
    for (const over of [
      { completed: false },
      { unreadable: true },
      {},
    ]) {
      const record = readExchange(response(over));
      if (record.outcome === "unknown") produced.add(record.why);
    }
    produced.add("never_attempted");
    produced.add("timed_out");
    expect([...produced].sort()).toEqual(Object.keys(UNKNOWN_REASON_COPY).sort());
    // A timeout says nothing about arrival, and the copy says so rather than implying a longer wait
    // would settle it.
    expect(UNKNOWN_REASON_COPY.timed_out).toMatch(/change the wait rather than the answer/);
  });
});

describe("W244 silence can only leave the question open", () => {
  it("never resolves a run of unknowns into a delivery, however long the run", () => {
    // Swept: every length of failure run, every reason, in every order. The shapes that break this
    // are the ones nobody writes a case for — a retry whose second failure clears the first, a "no
    // news is good news" window, a count that becomes confidence.
    const reasons = Object.keys(UNKNOWN_REASON_COPY) as UnknownWhy[];
    let checked = 0;
    for (let length = 1; length <= 12; length += 1) {
      for (const reason of reasons) {
        const attempts = Array.from({ length }, (_, i) =>
          unknown(reasons[(reasons.indexOf(reason) + i) % reasons.length]!),
        );
        const outcome = exchangeOutcome({ attempts });
        checked += 1;
        expect(outcome.outcome, `${length} unknowns became a delivery`).toBe("unknown");
        expect(wasReceived({ attempts })).toBe(false);
      }
    }
    expect(checked).toBe(12 * reasons.length);
    expect(checked).toBeGreaterThan(50);
  });

  it("resolves only when the other side speaks, at any point in the run", () => {
    // Non-vacuity for the sweep above: the same histories DO resolve the moment an acknowledgement
    // appears, so "always unknown" is a fact about silence rather than about this function.
    const ack: ExchangeRecord = {
      outcome: "acknowledged",
      acknowledgedBy: "Example PHN",
      theirReference: "PHN-1",
      atIso: "2026-08-20T09:20:00+10:00",
    };
    for (const at of [0, 1, 5]) {
      const attempts = [...Array.from({ length: 6 }, () => unknown())];
      attempts.splice(at, 0, ack);
      expect(exchangeOutcome({ attempts }).outcome, `ack at ${at}`).toBe("acknowledged");
      expect(wasReceived({ attempts })).toBe(true);
    }
  });

  it("keeps a refusal spoken once, even if later attempts go quiet", () => {
    // They told us. A later silence does not withdraw it, and reporting the exchange as unknown
    // would lose a reason somebody could act on.
    const refusal: ExchangeRecord = {
      outcome: "refused",
      refusedBy: "Example PHN",
      theirReason: "Patient is not on our list.",
      atIso: "2026-08-20T09:16:00+10:00",
    };
    expect(exchangeOutcome({ attempts: [refusal, unknown(), unknown()] }).outcome).toBe("refused");
  });

  it("takes no window, no attempt threshold and no clock", () => {
    // @ts-expect-error — no "no news is good news" window.
    void exchangeOutcome({ attempts: [] }, { assumeDeliveredAfterHours: 24 });
    // @ts-expect-error — and no attempt count that becomes confidence.
    void wasReceived({ attempts: [] }, { afterAttempts: 3 });
    expect(exchangeOutcome({ attempts: [] }).outcome).toBe("unknown");
  });

  it("exports nothing that could turn an unknown into a delivery", () => {
    expect(Object.keys(mod).filter((k) => typeof (mod as Record<string, unknown>)[k] === "function").sort()).toEqual([
      "exchangeOutcome",
      "readExchange",
      "wasReceived",
    ]);
    const structure = CODE.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^'\\]|\\.)*'/g, "''");
    expect(structure).not.toMatch(/\bassume|\bpresum|\bmarkDelivered|\boptimistic|\bprobably/i);
  });
});

describe("W244 it inherits W170's rule rather than restating it", () => {
  it("has three outcomes where a careless model has two, and says why the third exists", () => {
    expect(Object.keys(EXCHANGE_OUTCOME_COPY).sort()).toEqual(["acknowledged", "refused", "unknown"]);
    expect(EXCHANGE_OUTCOME_COPY.unknown).toMatch(/It may have arrived, it may have been dropped/);
    // The same distinction W170 draws for outcomes, made here about a boundary rather than a
    // record — checked against W170's own wording so the two are visibly the same argument.
    expect(OUTCOME_VERDICT_COPY.not_recorded.length).toBeGreaterThan(0);
    expect(EXCHANGE_OUTCOME_COPY.unknown).toMatch(/rather than as sent/);
  });

  it("passes the advice linter on everything it says", () => {
    for (const text of [...Object.values(EXCHANGE_OUTCOME_COPY), ...Object.values(UNKNOWN_REASON_COPY)]) {
      expect(lintEducationCopy(text).map((f) => f.rule), text.slice(0, 40)).toEqual([]);
    }
  });
});
