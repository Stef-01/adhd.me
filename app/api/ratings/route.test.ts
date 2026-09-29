// The ratings route: a finder visit's stars and words, one per visit, for a clinician the finder lists.

import { beforeEach, describe, expect, it } from "vitest";
import { ratings, resetFinderDb } from "@/db/finder";
import { resetRateLimits } from "@/lib/rate-limit";
import { clinicians } from "@/demo/clinicians";
import { POST } from "./route";

const HANDOFF = "11111111-1111-4111-8111-111111111111";
const clinicianId = clinicians[0]!.id;
const rate = (body: unknown, caller = "203.0.113.9") =>
  POST(new Request("http://local/api/ratings", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": caller }, body: JSON.stringify(body) }));

beforeEach(() => {
  resetFinderDb();
  resetRateLimits();
});

describe("POST /api/ratings", () => {
  it("records the stars, then the note, as one rating", async () => {
    expect((await rate({ handoffId: HANDOFF, clinicianId, stars: 4, asked: ["pref:woman-gp"], met: ["pref:woman-gp"] })).status).toBe(204);
    expect((await rate({ handoffId: HANDOFF, clinicianId, stars: 4, feedback: "Unhurried and kind." })).status).toBe(204);
    expect(ratings()).toHaveLength(1);
    expect(ratings()[0]).toMatchObject({ source: "finder", stars: 4, feedback: "Unhurried and kind.", met: ["pref:woman-gp"] });
  });

  it("refuses a clinician the finder does not list, stars off the scale, and a body that is not a rating", async () => {
    expect((await rate({ handoffId: HANDOFF, clinicianId: "nobody-here", stars: 4 })).status).toBe(400);
    expect((await rate({ handoffId: HANDOFF, clinicianId, stars: 7 })).status).toBe(400);
    expect((await POST(new Request("http://local/api/ratings", { method: "POST", body: "stars" }))).status).toBe(400);
    expect(ratings()).toEqual([]);
  });

  it("holds one caller to 20 in ten minutes", async () => {
    for (let i = 0; i < 20; i++) expect((await rate({ handoffId: HANDOFF, clinicianId, stars: 3 })).status).toBe(204);
    expect((await rate({ handoffId: HANDOFF, clinicianId, stars: 3 })).status).toBe(429);
  });
});
