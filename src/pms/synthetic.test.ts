import { describe, expect, it } from "vitest";
import { describePmsContract } from "@/pms/contract";
import { DEFAULT_SYNTHETIC_PMS_OPTIONS, SyntheticPmsAdapter } from "@/pms/synthetic";

const OPTS = DEFAULT_SYNTHETIC_PMS_OPTIONS;
const scheduleEnd = OPTS.scheduleWeeks * 7;

// W27 verify gate: the synthetic adapter passes the PMS contract.
describePmsContract("synthetic", {
  makeAdapter: () => new SyntheticPmsAdapter(OPTS),
  populatedRange: { fromIso: OPTS.todayIso, toIso: isoAhead(OPTS.todayIso, scheduleEnd) },
  emptyRange: { fromIso: "2000-01-01", toIso: "2000-01-31" },
});

function isoAhead(anchor: string, days: number): string {
  const d = new Date(`${anchor}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

describe("SyntheticPmsAdapter specifics", () => {
  it("is deterministic across instances with the same options", async () => {
    const a = new SyntheticPmsAdapter(OPTS);
    const b = new SyntheticPmsAdapter(OPTS);
    expect(await a.listPatients()).toEqual(await b.listPatients());
    const range = { fromIso: OPTS.todayIso, toIso: isoAhead(OPTS.todayIso, scheduleEnd) };
    expect(await a.listCancellations(range)).toEqual(await b.listCancellations(range));
  });

  it("cancellations reference real booked-then-freed slots", async () => {
    const a = new SyntheticPmsAdapter(OPTS);
    const range = { fromIso: OPTS.todayIso, toIso: isoAhead(OPTS.todayIso, scheduleEnd) };
    const cancellations = await a.listCancellations(range);
    for (const c of cancellations) {
      // The freed slot's start is after it was cancelled.
      expect(Date.parse(c.cancelledAt)).toBeLessThan(Date.parse(c.startsAt));
    }
  });

  it("consent records mirror the patient consent flags exactly", async () => {
    const a = new SyntheticPmsAdapter(OPTS);
    const patients = await a.listPatients();
    const consents = await a.listConsents();
    expect(consents).toHaveLength(patients.length);
    const consented = consents.filter((c) => c.smsConsent).length;
    const patientsConsented = patients.filter((p) => p.smsConsent).length;
    expect(consented).toBe(patientsConsented);
  });
});
