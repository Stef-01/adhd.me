// W60 verify gate (store side): per-practice isolation, and the G5 guard that keeps
// real clinical content out of the placeholder catalogue until W56 is unblocked.

import { beforeEach, describe, expect, it } from "vitest";
import type { ConditionCode, PracticeId } from "@/domain/types";
import {
  getRegisters,
  registersFor,
  resetRegisters,
  seedCounts,
  setRegisterEnabled,
} from "./store";

const PRACTICE_A = "practice-a" as PracticeId;
const PRACTICE_B = "practice-b" as PracticeId;
const REGISTER_A = "placeholder_register_a" as ConditionCode;

beforeEach(() => {
  resetRegisters();
});

describe("W60 register isolation", () => {
  it("every register is on by default", () => {
    expect(registersFor(PRACTICE_A).every((r) => r.enabled)).toBe(true);
  });

  it("disabling a register affects only the practice that disabled it", () => {
    setRegisterEnabled(PRACTICE_A, REGISTER_A, false);

    const a = registersFor(PRACTICE_A).find((r) => r.condition.code === REGISTER_A);
    const b = registersFor(PRACTICE_B).find((r) => r.condition.code === REGISTER_A);

    expect(a?.enabled).toBe(false);
    expect(b?.enabled).toBe(true);
  });

  it("one practice's other registers are untouched", () => {
    setRegisterEnabled(PRACTICE_A, REGISTER_A, false);
    const others = registersFor(PRACTICE_A).filter((r) => r.condition.code !== REGISTER_A);
    expect(others.every((r) => r.enabled)).toBe(true);
  });

  it("re-enabling restores it for that practice only", () => {
    setRegisterEnabled(PRACTICE_A, REGISTER_A, false);
    setRegisterEnabled(PRACTICE_B, REGISTER_A, false);
    setRegisterEnabled(PRACTICE_A, REGISTER_A, true);

    expect(registersFor(PRACTICE_A).find((r) => r.condition.code === REGISTER_A)?.enabled).toBe(true);
    expect(registersFor(PRACTICE_B).find((r) => r.condition.code === REGISTER_A)?.enabled).toBe(false);
  });

  it("disabling twice is idempotent and does not duplicate the entry", () => {
    setRegisterEnabled(PRACTICE_A, REGISTER_A, false);
    setRegisterEnabled(PRACTICE_A, REGISTER_A, false);
    expect(getRegisters().disabledByPractice[PRACTICE_A]).toEqual([REGISTER_A]);
  });

  it("refuses an unknown register instead of recording phantom state", () => {
    const result = setRegisterEnabled(PRACTICE_A, "not_a_register" as ConditionCode, false);

    expect(result).toEqual({ ok: false, reason: "unknown_register" });
    expect(getRegisters().disabledByPractice[PRACTICE_A]).toBeUndefined();
  });

  it("counts are per practice and default to zero", () => {
    seedCounts(PRACTICE_A, { [REGISTER_A]: { memberCount: 42, gapCount: 9 } });

    expect(registersFor(PRACTICE_A).find((r) => r.condition.code === REGISTER_A)?.counts).toEqual({
      memberCount: 42,
      gapCount: 9,
    });
    expect(registersFor(PRACTICE_B).find((r) => r.condition.code === REGISTER_A)?.counts).toEqual({
      memberCount: 0,
      gapCount: 0,
    });
  });
});

describe("W60 G5 boundary", () => {
  // W56 — the real guideline intervals — is blocked pending a founder ruling on
  // whether transcribed guidance is clinical content. This unit needed a catalogue to
  // render, so it ships placeholders. These assertions stop real clinical values from
  // arriving through this store ahead of that ruling.
  const CLINICAL_TERMS = [
    "diabet",
    "ckd",
    "kidney",
    "hba1c",
    "cycle of care",
    "kha-cari",
    "gpccmp",
    "asthma",
    "copd",
    "cardiovascular",
  ];

  it("the shipped catalogue names no real condition or guideline", () => {
    const state = getRegisters();
    const text = JSON.stringify(state).toLowerCase();

    for (const term of CLINICAL_TERMS) {
      expect(text, `catalogue must not mention "${term}" before W56 clears G5`).not.toContain(term);
    }
  });

  it("every placeholder interval says outright that it is not guidance", () => {
    for (const interval of getRegisters().intervals) {
      expect(interval.provenance.citation.toLowerCase()).toContain("not clinical guidance");
      // A placeholder must not masquerade as a citable source.
      expect(interval.provenance.url).toContain("example.invalid");
    }
  });

  it("placeholder intervals still satisfy the W55 provenance contract", () => {
    // The container's guarantees hold even for placeholders: no interval without a
    // source, an https URL, and a retrieval no earlier than publication.
    for (const interval of getRegisters().intervals) {
      const { citation, url, publishedOn, retrievedOn } = interval.provenance;
      expect(citation.trim()).not.toBe("");
      expect(url.startsWith("https://")).toBe(true);
      expect(retrievedOn >= publishedOn).toBe(true);
      expect(interval.intervalMonths).toBeGreaterThan(0);
    }
  });
});
