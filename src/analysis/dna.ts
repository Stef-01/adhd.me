// W44: DNA analysis — do Meherr-generated bookings no-show more than organic ones?
// This is the quantitative answer to the supplier-induced-demand critique: if invited patients
// attend at organic rates, the generated visits are real demand surfaced early, not noise.
// Analysis only; never gates sending on its own (guardrail monitors own alerting).

import type { Appointment } from "@/domain/types";
import type { SimResult } from "@/sim/harness";

export interface DnaComparison {
  generated: { attended: number; dna: number; rate: number | null };
  organic: { attended: number; dna: number; rate: number | null };
  /** generated rate ÷ organic rate; null when either rate is undefined. */
  ratio: number | null;
  verdict: "comparable" | "generated_worse" | "generated_better" | "insufficient_data";
}

const MIN_COMPLETED_PER_ARM = 20; // below this, refuse a verdict rather than overfit noise
const COMPARABLE_BAND = 0.25; // ±25% of organic rate counts as comparable

function rate(attended: number, dna: number): number | null {
  const completed = attended + dna;
  return completed === 0 ? null : dna / completed;
}

export function compareDna(appointments: Appointment[]): DnaComparison {
  let genAttended = 0;
  let genDna = 0;
  let orgAttended = 0;
  let orgDna = 0;
  for (const a of appointments) {
    if (a.status === "attended") {
      if (a.generatedByInvitation) genAttended++;
      else orgAttended++;
    } else if (a.status === "dna") {
      if (a.generatedByInvitation) genDna++;
      else orgDna++;
    }
  }
  const generated = { attended: genAttended, dna: genDna, rate: rate(genAttended, genDna) };
  const organic = { attended: orgAttended, dna: orgDna, rate: rate(orgAttended, orgDna) };

  const enough =
    genAttended + genDna >= MIN_COMPLETED_PER_ARM && orgAttended + orgDna >= MIN_COMPLETED_PER_ARM;
  if (!enough || generated.rate === null || organic.rate === null) {
    return { generated, organic, ratio: null, verdict: "insufficient_data" };
  }
  const ratio = organic.rate === 0 ? null : generated.rate / organic.rate;
  let verdict: DnaComparison["verdict"];
  if (ratio === null) {
    verdict = generated.rate === 0 ? "comparable" : "generated_worse";
  } else if (ratio > 1 + COMPARABLE_BAND) {
    verdict = "generated_worse";
  } else if (ratio < 1 - COMPARABLE_BAND) {
    verdict = "generated_better";
  } else {
    verdict = "comparable";
  }
  return { generated, organic, ratio, verdict };
}

export function compareDnaFromSim(result: SimResult): DnaComparison {
  return compareDna(result.appointments);
}
