import { describe, expect, it } from "vitest";
import { meditationGuide, remainingTime, sharedMeditation, SHARED_DURATION_MS, SHARED_INTERVAL_MS } from "./meditation";

describe("shared meditation clock", () => {
  it("gives everyone the same session, without tying it to request time", () => {
    const a = sharedMeditation(SHARED_INTERVAL_MS * 100 + 1_000);
    const b = sharedMeditation(SHARED_INTERVAL_MS * 100 + 90_000);
    expect(a.startsAt).toBe(b.startsAt);
    expect(a.endsAt).toBe(b.endsAt);
    expect(a.live).toBe(true);
  });
  it("closes at the exact end and rolls into the next quarter hour", () => {
    expect(sharedMeditation(SHARED_DURATION_MS - 1).live).toBe(true);
    expect(sharedMeditation(SHARED_DURATION_MS).live).toBe(false);
    expect(sharedMeditation(SHARED_INTERVAL_MS).startsAt).toBe(SHARED_INTERVAL_MS);
    expect(sharedMeditation(SHARED_INTERVAL_MS).live).toBe(true);
  });
  it("never shows negative time and chooses the current guidance after a late join", () => {
    expect(remainingTime(-500)).toBe("00:00");
    expect(remainingTime(61_000)).toBe("01:01");
    expect(meditationGuide(.6).title).toBe("A thought can pass through.");
    expect(meditationGuide(1).title).toBe("Take your time coming back.");
  });
});
