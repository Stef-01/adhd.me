import { describe, expect, it } from "vitest";
import {
  assertSafeLink,
  buildBookingLink,
  UnsafeDeepLinkError,
  type DeepLinkContext,
  type InternalProviderConfig,
  type PracticeLinkSettings,
  type VendorProviderConfig,
} from "@/booking/deeplink";
import { verifyBookingToken } from "@/booking/token";
import type { InvitationId } from "@/domain/types";

const CTX: DeepLinkContext = {
  invitationId: "inv-2026-09-01-clin-7-0" as InvitationId,
  clinicianId: "clin-7",
  sessionDate: "2026-09-01",
};

const INTERNAL: InternalProviderConfig = {
  provider: "internal",
  baseUrl: "https://book.careyield.test",
};

const HOTDOC: VendorProviderConfig = {
  provider: "hotdoc",
  baseUrl: "https://sandbox.hotdoc.test",
  practiceSlug: "demo-family-practice",
  clinicianSlugs: { "clin-7": "dr-amara-lee" },
};

const HEALTHENGINE: VendorProviderConfig = {
  provider: "healthengine",
  baseUrl: "https://sandbox.healthengine.test",
  practiceSlug: "demo-family-practice",
  clinicianSlugs: { "clin-7": "amara-lee" },
};

const settings = (
  config: PracticeLinkSettings["config"],
  enabled = true,
): PracticeLinkSettings => ({ enabled, config, fallback: INTERNAL });

describe("W29 booking deep-link formats", () => {
  it("internal provider emits the tokenised Meherr link", () => {
    const link = buildBookingLink(settings(INTERNAL), CTX);
    expect(link.provider).toBe("internal");
    expect(link.url.startsWith("https://book.careyield.test/book/")).toBe(true);
    // The token in the link resolves back to this invitation and nothing else.
    const token = link.url.split("/book/")[1]!;
    expect(verifyBookingToken(token)).toBe(CTX.invitationId);
  });

  it("hotdoc link matches the configured format exactly", () => {
    const link = buildBookingLink(settings(HOTDOC), CTX);
    expect(link).toEqual({
      provider: "hotdoc",
      url: "https://sandbox.hotdoc.test/medical-centres/demo-family-practice/dr-amara-lee/book?date=2026-09-01",
    });
  });

  it("healthengine link matches the configured format exactly", () => {
    const link = buildBookingLink(settings(HEALTHENGINE), CTX);
    expect(link).toEqual({
      provider: "healthengine",
      url: "https://sandbox.healthengine.test/book/demo-family-practice?practitioner=amara-lee&date=2026-09-01",
    });
  });

  it("trims a trailing slash on the configured origin", () => {
    const link = buildBookingLink(settings({ ...HOTDOC, baseUrl: "https://sandbox.hotdoc.test/" }), CTX);
    expect(link.url).not.toContain(".test//");
  });

  it("percent-encodes slugs that contain URL-significant characters", () => {
    const link = buildBookingLink(
      settings({
        ...HEALTHENGINE,
        practiceSlug: "demo practice & co",
        clinicianSlugs: { "clin-7": "dr a/b" },
      }),
      CTX,
    );
    expect(link.url).toContain("demo%20practice%20%26%20co");
    expect(link.url).toContain("practitioner=dr%20a%2Fb");
    // Still one well-formed URL with the intended path.
    expect(new URL(link.url).pathname).toBe("/book/demo%20practice%20%26%20co");
  });
});

describe("W29 flag + fallback behaviour", () => {
  it("falls back to the internal link when the vendor flag is off", () => {
    const link = buildBookingLink(settings(HOTDOC, false), CTX);
    expect(link.provider).toBe("internal");
    expect(link.fellBackBecause).toBe("provider_disabled");
    expect(link.url.startsWith("https://book.careyield.test/book/")).toBe(true);
  });

  it("falls back when the clinician has no vendor slug mapped", () => {
    const link = buildBookingLink(settings({ ...HOTDOC, clinicianSlugs: {} }), CTX);
    expect(link.provider).toBe("internal");
    expect(link.fellBackBecause).toBe("clinician_not_mapped");
  });

  it("a successful vendor link records no fallback reason", () => {
    expect(buildBookingLink(settings(HOTDOC), CTX).fellBackBecause).toBeUndefined();
  });
});

describe("W29 link safety guard", () => {
  it("rejects non-https links", () => {
    expect(() => assertSafeLink("http://book.careyield.test/book/abc")).toThrow(UnsafeDeepLinkError);
    expect(() =>
      buildBookingLink(settings({ ...INTERNAL, baseUrl: "http://book.careyield.test" }), CTX),
    ).toThrow(/https/);
  });

  it("rejects any link carrying a patient identifier", () => {
    for (const bad of [
      "https://x.test/book?patient_id=123",
      "https://x.test/book?dob=1980-01-01",
      "https://x.test/book?mobile=0400000000",
      "https://x.test/book?firstName=Alex",
    ]) {
      expect(() => assertSafeLink(bad)).toThrow(UnsafeDeepLinkError);
    }
  });

  it("permits the non-identifying params the providers actually use", () => {
    expect(() => assertSafeLink("https://x.test/book/p?practitioner=a-b&date=2026-09-01")).not.toThrow();
  });

  it("no produced link carries the patient id", () => {
    for (const config of [INTERNAL, HOTDOC, HEALTHENGINE]) {
      const link = buildBookingLink(settings(config), CTX);
      expect(link.url).not.toContain("pat-");
    }
  });
});
