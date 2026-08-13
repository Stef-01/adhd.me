// W17 verify gate: the session config is honoured in a sim run.

import { describe, expect, it } from "vitest";
import { DEFAULT_SIM_CONFIG, runSim } from "./harness";
import { DEFAULT_SESSION_CONFIG } from "@/session/config";

// A small, fast world; the effects below are monotone so a short run shows them.
const BASE = { ...DEFAULT_SIM_CONFIG, weeks: 8, patientCount: 1_500, clinicianCount: 6 };

describe("W17 session config honoured in sim", () => {
  it("no participating clinicians → nothing is pooled or sent", () => {
    const result = runSim({
      ...BASE,
      session: { ...DEFAULT_SESSION_CONFIG, participatingClinicianIds: [] },
    });
    expect(result.totals.sessionsPooled).toBe(0);
    expect(result.totals.invitationsSent).toBe(0);
    expect(result.totals.booked).toBe(0);
  });

  it("a clinician allowlist restricts sends to listed clinicians", () => {
    const all = runSim(BASE);
    // Take the first clinician id that actually sent in the open run by allowlisting one.
    const oneId = all.appointments.find((a) => a.generatedByInvitation)?.clinicianId;
    expect(oneId).toBeDefined();
    const restricted = runSim({
      ...BASE,
      session: { ...DEFAULT_SESSION_CONFIG, participatingClinicianIds: [oneId as string] },
    });
    const senders = new Set(
      restricted.appointments.filter((a) => a.generatedByInvitation).map((a) => a.clinicianId),
    );
    expect([...senders].every((id) => id === oneId)).toBe(true);
    expect(restricted.totals.invitationsSent).toBeLessThan(all.totals.invitationsSent);
  });

  it("protected capacity reduces the offers made vs an unprotected run", () => {
    // Protected capacity directly caps how many slots may be offered; booking
    // totals aren't monotone because the loop re-pools remaining slots over weeks.
    const open = runSim(BASE);
    const protectedRun = runSim({
      ...BASE,
      session: { ...DEFAULT_SESSION_CONFIG, protectedCapacityFraction: 0.5 },
    });
    expect(protectedRun.totals.invitationsSent).toBeLessThan(open.totals.invitationsSent);
  });

  it("fully protected capacity offers nothing", () => {
    const result = runSim({
      ...BASE,
      session: { ...DEFAULT_SESSION_CONFIG, protectedCapacityFraction: 1 },
    });
    expect(result.totals.invitationsSent).toBe(0);
  });

  it("a narrow scheduling window reduces offers", () => {
    const wide = runSim(BASE);
    const narrow = runSim({
      ...BASE,
      session: { ...DEFAULT_SESSION_CONFIG, schedulingWindow: { startHour: 8, endHour: 9 } },
    });
    expect(narrow.totals.invitationsSent).toBeLessThan(wide.totals.invitationsSent);
    expect(narrow.totals.invitationsSent).toBeGreaterThan(0);
  });

  it("restricting fillable types reduces offers", () => {
    const allTypes = runSim(BASE);
    const standardOnly = runSim({
      ...BASE,
      session: { ...DEFAULT_SESSION_CONFIG, fillableTypes: ["standard"] },
    });
    expect(standardOnly.totals.invitationsSent).toBeLessThan(allTypes.totals.invitationsSent);
    expect(standardOnly.totals.invitationsSent).toBeGreaterThan(0);
  });

  it("the default config is a no-op (all slots offerable)", () => {
    // Explicit DEFAULT_SESSION_CONFIG equals BASE's session; sanity that nothing is filtered by default.
    const result = runSim(BASE);
    expect(result.totals.invitationsSent).toBeGreaterThan(0);
    expect(result.totals.booked).toBeGreaterThan(0);
  });
});
