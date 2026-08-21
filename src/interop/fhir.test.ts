// W235 verify gate: "round-trip over synthetic records; an unmapped field is NAMED in the output
// rather than dropped silently."
//
// The round trip is the load-bearing test and it is run over EVERY synthetic appointment rather
// than a sample, because a mapping loses things in corners — the record with a null patient, the
// status nobody thought about — and a sample is chosen by whoever already believes the mapping
// works.
//
// The naming half is checked against the domain TYPE in both directions, so a field added to
// `Appointment` next year cannot become silently unmapped. That is the same silence one level up,
// and it is the one a mapper actually dies of.

import { describe, expect, it } from "vitest";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import { lintEducationCopy } from "@/education/advice-lint";
import type { Appointment } from "@/domain/types";
import { describeMappingContract, describeNoLiveEndpoint } from "./contract";
import {
  APPOINTMENT_STATUS_MAP,
  APPOINTMENT_TYPE_MAP,
  APPOINTMENT_TYPE_SYSTEM,
  APPOINTMENT_UNMAPPED,
  FHIR_READ_REFUSAL_COPY,
  SHIPPED_MAPPINGS,
  appointmentFromFhir,
  appointmentToFhir,
} from "./fhir";

const sim = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6 });
const PRACTICE = String(sim.practice.id);

describe("W235 the round trip is total over the synthetic practice", () => {
  it("returns every appointment unchanged, over all of them", () => {
    // Every record, not a sample: a sample is chosen by somebody who already believes the mapping
    // works, and the records that break a mapper are the odd ones.
    expect(sim.appointments.length).toBeGreaterThan(8000);
    let checked = 0;
    for (const appointment of sim.appointments) {
      const mapped = appointmentToFhir(appointment);
      const back = appointmentFromFhir(mapped.resource, PRACTICE);
      expect(back.read, `${appointment.id} did not survive the round trip`).toBe(true);
      if (!back.read) continue;
      checked += 1;
      // Compared by VALUE against the original, minus the field the mapping declares it drops.
      const { generatedByInvitation: _dropped, ...rest } = appointment;
      const { generatedByInvitation: _also, ...came } = back.appointment;
      expect(came, `${appointment.id} changed in the round trip`).toEqual(rest);
    }
    expect(checked).toBe(sim.appointments.length);
  });

  it("covers every status the simulation produces, and every status the map declares", () => {
    // Non-vacuity for the sweep above: if the sim only ever produced `booked`, the round trip
    // would be a test of one branch wearing eight thousand records.
    const seen = new Set(sim.appointments.map((a) => a.status));
    expect(seen.size).toBeGreaterThan(2);
    // And the statuses the sim never produces are round-tripped from fixtures, so no member of the
    // map is untested — `cancelled` in particular, which the sim has never once recorded.
    for (const status of Object.keys(APPOINTMENT_STATUS_MAP) as Appointment["status"][]) {
      const fixture: Appointment = {
        ...sim.appointments[0]!,
        status,
        patientId: status === "open" ? null : sim.appointments[0]!.patientId,
      };
      const back = appointmentFromFhir(appointmentToFhir(fixture).resource, PRACTICE);
      expect(back.read, `${status} did not survive`).toBe(true);
      if (back.read) expect(back.appointment.status).toBe(status);
    }
  });

  it("keeps a null patient null rather than inventing one", () => {
    const open = sim.appointments.find((a) => a.patientId === null)!;
    expect(open).toBeDefined();
    const mapped = appointmentToFhir(open);
    expect(mapped.resource.participant.map((p) => p.actor.reference)).toEqual([
      `Practitioner/${open.clinicianId}`,
    ]);
    const back = appointmentFromFhir(mapped.resource, PRACTICE);
    expect(back.read && back.appointment.patientId).toBeNull();
  });
});

describe("W235 an unmapped field is named, in both directions", () => {
  it("names every domain field that is not mapped, and nothing that is", () => {
    // The check that matters most: derived from a real value's own keys, so a field added to
    // `Appointment` next year is either mapped or fails here. A hand-written list would have gone
    // quietly out of date — the same silence this unit is about, one level up.
    const domainFields = Object.keys(sim.appointments[0]!);
    expect(domainFields.length).toBeGreaterThan(5);
    const mapped = appointmentToFhir(sim.appointments[0]!);
    const named = new Set(mapped.unmapped.map((u) => u.field));

    // "MAPPED" MEANS THE VALUE SURVIVES, NOT THAT THE KEY REAPPEARS. The first version checked
    // whether the field was present on the round-tripped object — and `generatedByInvitation` is
    // always present there, fabricated as `false`, so setting `unmapped: []` left this test GREEN
    // when I seeded it. A field that comes back as a default is not carried; it is invented.
    // Mutating it and checking the change survives cannot be fooled that way.
    const MUTATIONS: Record<string, (a: Appointment) => Appointment> = {
      id: (a) => ({ ...a, id: "w235-changed" as Appointment["id"] }),
      practiceId: (a) => ({ ...a, practiceId: "other-practice" as Appointment["practiceId"] }),
      clinicianId: (a) => ({ ...a, clinicianId: "other-clinician" as Appointment["clinicianId"] }),
      startsAt: (a) => ({ ...a, startsAt: "2027-01-02T11:30:00+10:00" }),
      status: (a) => ({ ...a, status: (a.status === "booked" ? "cancelled" : "booked") as Appointment["status"] }),
      patientId: (a) => ({ ...a, patientId: a.patientId === null ? ("pat-999" as Appointment["patientId"]) : null }),
      generatedByInvitation: (a) => ({ ...a, generatedByInvitation: !a.generatedByInvitation }),
      appointmentType: (a) => ({ ...a, appointmentType: a.appointmentType === "long" ? "telehealth" : "long" }),
    };
    // Both directions on the mutation table itself, so a new domain field cannot slip past by
    // simply having no mutation written for it.
    expect(Object.keys(MUTATIONS).sort()).toEqual([...domainFields].sort());

    const base = sim.appointments.find((a) => a.patientId !== null)!;
    for (const field of domainFields) {
      const mutated = MUTATIONS[field]!(base);
      const back = appointmentFromFhir(appointmentToFhir(mutated).resource, PRACTICE);
      expect(back.read, `${field}: the mutated record did not round trip at all`).toBe(true);
      if (!back.read) continue;
      const carried =
        (back.appointment as unknown as Record<string, unknown>)[field] ===
        (mutated as unknown as Record<string, unknown>)[field];
      expect(carried || named.has(field), `${field} is neither carried nor named`).toBe(true);
      expect(carried && named.has(field), `${field} is named as unmapped but is carried`).toBe(false);
    }
    // Both directions: nothing is named as unmapped that actually survives.
    for (const { field, why } of mapped.unmapped) {
      expect(domainFields, `${field} is named but is not a domain field`).toContain(field);
      expect(why.length, `${field} is dropped without a reason`).toBeGreaterThan(60);
    }
  });

  it("names the same fields on the way back in", () => {
    // A receiver's silence about a field is the same fact from the other side. Defaulting
    // `generatedByInvitation` to false without saying so would be this product inventing its own
    // attribution record out of a third party's data.
    const back = appointmentFromFhir(appointmentToFhir(sim.appointments[0]!).resource, PRACTICE);
    expect(back.read).toBe(true);
    if (!back.read) return;
    expect(back.unmapped.map((u) => u.field)).toEqual(APPOINTMENT_UNMAPPED.map((u) => u.field));
    expect(back.appointment.generatedByInvitation).toBe(false);
  });

  it("gives every status mapping a reason a reviewer could disagree with", () => {
    for (const [status, entry] of Object.entries(APPOINTMENT_STATUS_MAP)) {
      expect(entry.fhir.length, `${status} maps to nothing`).toBeGreaterThan(0);
      expect(entry.why.length, `${status} is mapped without a reason`).toBeGreaterThan(6);
    }
    // The two that are judgements rather than bookkeeping carry a real argument.
    expect(APPOINTMENT_STATUS_MAP.open.why.length).toBeGreaterThan(120);
    expect(APPOINTMENT_STATUS_MAP.dna.why.length).toBeGreaterThan(120);
    // And no two domain statuses collapse onto one FHIR status, which would make the round trip
    // ambiguous and would have been invisible in a test that only went one way.
    const targets = Object.values(APPOINTMENT_STATUS_MAP).map((e) => e.fhir);
    expect(new Set(targets).size).toBe(targets.length);
  });
});

describe("W235 it refuses rather than guessing, and it sends nothing", () => {
  it("refuses a resource it cannot read, each with its own reason", () => {
    const good = appointmentToFhir(sim.appointments[0]!).resource;
    const cases: Array<[string, unknown, keyof typeof FHIR_READ_REFUSAL_COPY]> = [
      ["not a resource", { resourceType: "Patient" }, "not_an_appointment"],
      ["a string", "Appointment", "not_an_appointment"],
      ["an unknown status", { ...good, status: "proposed" }, "unknown_status"],
      ["no start", { ...good, start: "sometime" }, "missing_start"],
      ["no practitioner", { ...good, participant: [] }, "no_practitioner"],
      [
        "an appointment type from another system",
        { ...good, appointmentType: { coding: [{ system: "http://terminology.hl7.org/x", code: "long" }] } },
        "unknown_appointment_type",
      ],
      [
        "an appointment type this mapping does not carry",
        { ...good, appointmentType: { coding: [{ system: APPOINTMENT_TYPE_SYSTEM, code: "home-visit" }] } },
        "unknown_appointment_type",
      ],
      // W247. Two patients on one Appointment used to READ, and read as the first one — a booking
      // attributed to a named person on the strength of array order. R4 allows several
      // participants; what this mapping will not do is choose.
      [
        "two patients on one appointment",
        {
          ...good,
          participant: [
            ...(good.participant ?? []),
            { actor: { reference: "Patient/someone-else" }, status: "accepted" },
          ],
        },
        "ambiguous_participant",
      ],
      [
        "two practitioners on one appointment",
        {
          ...good,
          participant: [
            ...(good.participant ?? []),
            { actor: { reference: "Practitioner/someone-else" }, status: "accepted" },
          ],
        },
        "ambiguous_participant",
      ],
    ];
    const produced = new Set<string>();
    for (const [label, resource, expected] of cases) {
      const result = appointmentFromFhir(resource, PRACTICE);
      expect(result.read, label).toBe(false);
      if (result.read) continue;
      expect(result.why, label).toBe(expected);
      expect(result.copy, label).toBe(FHIR_READ_REFUSAL_COPY[expected]);
      produced.add(result.why);
    }
    expect([...produced].sort()).toEqual(Object.keys(FHIR_READ_REFUSAL_COPY).sort());
  });

  it("keeps an untyped slot untyped rather than coding it as ordinary", () => {
    // W17 treats an undefined type as always fillable, so coding it `standard` would narrow it —
    // and the round trip would then hand back a slot the practice never described that way.
    const untyped: Appointment = { ...sim.appointments[0]!, appointmentType: undefined };
    const mapped = appointmentToFhir(untyped);
    expect(mapped.resource.appointmentType).toBeUndefined();
    const back = appointmentFromFhir(mapped.resource, PRACTICE);
    expect(back.read && back.appointment.appointmentType).toBeUndefined();
    // And a typed one survives with its own code, so the branch above is not the only one tested.
    for (const type of Object.keys(APPOINTMENT_TYPE_MAP) as Appointment["appointmentType"][]) {
      const typed = { ...sim.appointments[0]!, appointmentType: type };
      const round = appointmentFromFhir(appointmentToFhir(typed).resource, PRACTICE);
      expect(round.read && round.appointment.appointmentType, String(type)).toBe(type);
    }
  });

  it("names its own code system as its own, rather than borrowing a real one", () => {
    // R4 wants a coding system URI and there is no national code set this tree has a citation for
    // (W56's rule). A local system named as local is honest; borrowing a terminology URI to look
    // conformant would not be. W238 is where binding gets done properly.
    expect(APPOINTMENT_TYPE_SYSTEM).toContain("adhd.me");
    expect(APPOINTMENT_TYPE_SYSTEM).not.toMatch(/hl7\.org|snomed|loinc/i);
  });

  it("refuses an unrecognised status rather than reading it as the nearest familiar one", () => {
    // R4 has statuses this mapping does not carry — `proposed`, `pending`, `waitlist`. Guessing at
    // one would silently change what the record says happened.
    for (const status of ["proposed", "pending", "waitlist", "entered-in-error"]) {
      const result = appointmentFromFhir({ ...appointmentToFhir(sim.appointments[0]!).resource, status }, PRACTICE);
      expect(result.read, status).toBe(false);
    }
  });

  it("ships nothing, and has nowhere to send anything", () => {
    expect(SHIPPED_MAPPINGS).toEqual([]);
    // No client, no endpoint, no serialiser that reaches a network. W237 builds the conformance
    // harness against recorded fixtures; W242 holds the credentials posture.
    const source = new URL("./fhir.ts", import.meta.url).pathname;
    const code = require("node:fs").readFileSync(source, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
    expect(code).toContain("export function appointmentToFhir");
    expect(code).not.toMatch(/\bfetch\s*\(|axios|https?:\/\/|XMLHttpRequest|WebSocket/);
  });

  it("passes the advice linter on everything it says", () => {
    const texts = [
      ...Object.values(FHIR_READ_REFUSAL_COPY),
      ...APPOINTMENT_UNMAPPED.map((u) => u.why),
      ...Object.values(APPOINTMENT_STATUS_MAP).map((e) => e.why),
    ];
    for (const text of texts) {
      expect(lintEducationCopy(text).map((f) => f.rule), text.slice(0, 40)).toEqual([]);
    }
  });
});

// W237: the lane's conformance contract, consumed here. Its green run is what makes this a
// conformant mapping — the five properties it checks were each a real defect in this tree within
// the hour before the contract existed, including two in this very file.
describeMappingContract("appointments (W235)", {
  corpus: [
    sim.appointments[0]!,
    sim.appointments.find((a) => a.patientId === null)!,
    { ...sim.appointments[0]!, status: "cancelled" as const },
    { ...sim.appointments[0]!, appointmentType: undefined },
    { ...sim.appointments[0]!, status: "dna" as const, appointmentType: "telehealth" as const },
  ],
  toResource: (a) => appointmentToFhir(a),
  fromResource: (resource) => {
    const back = appointmentFromFhir(resource, PRACTICE);
    return back.read ? { ok: true as const, value: back.appointment, unmapped: back.unmapped } : { ok: false as const };
  },
  mutations: {
    id: (a) => ({ ...a, id: "w237-changed" as Appointment["id"] }),
    practiceId: (a) => ({ ...a, practiceId: "other-practice" as Appointment["practiceId"] }),
    clinicianId: (a) => ({ ...a, clinicianId: "other-clinician" as Appointment["clinicianId"] }),
    startsAt: (a) => ({ ...a, startsAt: "2027-01-02T11:30:00+10:00" }),
    status: (a) => ({ ...a, status: (a.status === "booked" ? "cancelled" : "booked") as Appointment["status"] }),
    patientId: (a) => ({ ...a, patientId: a.patientId === null ? ("pat-999" as Appointment["patientId"]) : null }),
    generatedByInvitation: (a) => ({ ...a, generatedByInvitation: !a.generatedByInvitation }),
    appointmentType: (a) => ({
      ...a,
      appointmentType: (a.appointmentType === "long" ? "telehealth" : "long") as Appointment["appointmentType"],
    }),
  },
  suppliedByCaller: ["practiceId"],
  humanText: null,
});

describeNoLiveEndpoint();
