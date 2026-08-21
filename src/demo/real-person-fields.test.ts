// W193 (O162): the basis register, checked both directions against the live roster.

import { describe, expect, it } from "vitest";
import { clinicians } from "@/demo/clinicians";
import { REAL_PERSON_FIELDS, realPersonFieldNames } from "@/demo/real-person-fields";

const realPeople = clinicians.filter((clinician) => clinician.realPerson);

describe("every claim about a named doctor has a stated basis", () => {
  it("has real people to be about, and fields on them", () => {
    // Non-vacuity: an empty roster satisfies every loop below.
    expect(realPeople.length).toBeGreaterThan(0);
    expect(realPersonFieldNames().length).toBeGreaterThan(20);
  });

  /**
   * THE DIRECTION THAT WOULD HAVE CAUGHT O158.
   *
   * A field on a real person's record with no entry here is a claim about a named doctor whose
   * source nobody has written down. That is exactly what "Dr Saxena has an ownership interest in
   * ADHD.ME" was: an inference, entered into a field, published, and caught only because the
   * founder read it.
   */
  it("names every field present on a real clinician", () => {
    const unexplained: string[] = [];
    for (const clinician of realPeople) {
      for (const key of Object.keys(clinician)) {
        if (!(key in REAL_PERSON_FIELDS)) unexplained.push(`${clinician.id}.${key}`);
      }
    }
    expect(
      unexplained,
      `these are claims about a named doctor with no stated basis:\n${unexplained.join("\n")}`,
    ).toEqual([]);
  });

  /** And the other way: an entry describing a field nobody carries is a register describing fiction. */
  it("names nothing the roster does not carry", () => {
    const carried = new Set(realPeople.flatMap((clinician) => Object.keys(clinician)));
    const stale = realPersonFieldNames().filter((name) => !carried.has(name));
    expect(stale, `register entries for fields no real clinician has:\n${stale.join("\n")}`).toEqual([]);
  });

  /**
   * A basis is only worth having if it says something. `founder-stated` is the load-bearing one —
   * it marks a claim relayed about a third party, checkable by nobody — so it must cite what was
   * said rather than assert that something was.
   */
  it("gives every field a source specific enough to check", () => {
    for (const [name, field] of Object.entries(REAL_PERSON_FIELDS)) {
      expect(field.source.length, `${name} has no usable source`).toBeGreaterThan(30);
    }
  });
});
