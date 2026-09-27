import { afterEach, describe, expect, it } from "vitest";
import { isoDaysFrom, localDay } from "./dates";

const tz = process.env.TZ;
afterEach(() => { process.env.TZ = tz; });

describe("localDay", () => {
  it("is the day on the person's clock, not the UTC day", () => {
    // 8am on 27 September in Sydney is still 26 September in UTC.
    process.env.TZ = "Australia/Sydney";
    const morning = new Date("2026-09-26T22:00:00Z");
    expect(morning.toISOString().slice(0, 10)).toBe("2026-09-26");
    expect(localDay(morning)).toBe("2026-09-27");
  });

  it("pads single-digit months and days", () => {
    expect(localDay(new Date(2026, 0, 5, 12))).toBe("2026-01-05");
  });

  it("leaves the UTC date arithmetic the console uses alone", () => {
    expect(isoDaysFrom("2026-09-26", 1)).toBe("2026-09-27");
  });
});
