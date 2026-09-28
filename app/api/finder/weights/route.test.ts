// What the ratings have taught: nothing until enough visits, then a bounded multiplier per ask.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseRating, rateVisit, resetFinderDb } from "@/db/finder";
import { MIN_SAMPLES } from "@/db/learn";
import { GET } from "./route";

beforeEach(() => {
  resetFinderDb();
  vi.stubEnv("SUPABASE_URL", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
});
afterEach(() => vi.unstubAllEnvs());

const visit = (i: number, stars: number, met: boolean) =>
  rateVisit(parseRating({ handoffId: `11111111-1111-4111-8111-${String(i).padStart(12, "0")}`, clinicianId: "mei-chao", stars, asked: ["manner:unhurried"], met: met ? ["manner:unhurried"] : [] })!);

describe("GET /api/finder/weights", () => {
  it("teaches nothing with no visits", async () => {
    expect(await (await GET()).json()).toEqual({ weights: {}, visits: 0 });
  });

  it("raises an ask whose declared visits went better, once both sides have enough", async () => {
    for (let i = 0; i < MIN_SAMPLES; i++) {
      visit(i, 5, true);
      visit(100 + i, 3, false);
    }
    expect(await (await GET()).json()).toEqual({ weights: { "manner:unhurried": 1.25 }, visits: 2 * MIN_SAMPLES });
  });
});
