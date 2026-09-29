// What the ratings have taught: nothing until enough visits, then a bounded multiplier per ask and,
// for a clinician with enough rated visits, one for how their visits went.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseRating, rateVisit, resetFinderDb } from "@/db/finder";
import { MIN_SAMPLES } from "@/db/learn";
import { MIN_VISITS } from "@/db/quality";
import { GET } from "./route";

beforeEach(() => {
  resetFinderDb();
  vi.stubEnv("SUPABASE_URL", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
});
afterEach(() => vi.unstubAllEnvs());

const visit = (i: number, stars: number, met: boolean, clinicianId = "mei-chao") =>
  rateVisit(parseRating({ handoffId: `11111111-1111-4111-8111-${String(i).padStart(12, "0")}`, clinicianId, stars, asked: ["manner:not_rushed"], met: met ? ["manner:not_rushed"] : [] })!);

describe("GET /api/finder/weights", () => {
  it("teaches nothing with no visits", async () => {
    expect(await (await GET()).json()).toEqual({ weights: {}, visits: 0, quality: {} });
  });

  it("raises an ask whose declared visits went better, once both sides have enough", async () => {
    for (let i = 0; i < MIN_SAMPLES; i++) {
      visit(i, 5, true);
      visit(100 + i, 3, false);
    }
    expect(await (await GET()).json()).toEqual({ weights: { "manner:not_rushed": 1.25 }, visits: 2 * MIN_SAMPLES, quality: {} });
  });

  it("moves a clinician whose visits went better than everybody's, once they have enough", async () => {
    for (let i = 0; i < MIN_VISITS; i++) {
      visit(i, 5, true, "mei-chao");
      visit(100 + i, 2, true, "other");
    }
    const { quality } = (await (await GET()).json()) as { quality: Record<string, number> };
    expect(quality["mei-chao"]).toBeGreaterThan(1);
    expect(quality.other).toBeLessThan(1);
  });
});
