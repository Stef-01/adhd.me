// W29: booking deep-link providers. A practice books through whichever rail it
// already uses — Meherr's own tokenised page (W7), or its existing HotDoc /
// HealthEngine listing. Each provider turns one invitation into the URL that goes
// in the SMS, and every provider is behind a per-practice flag: unconfigured or
// disabled falls back to the internal link, so a misconfiguration can never send a
// broken or third-party link by accident.
//
// Deep links are public booking URLs — no credentials, no API calls (founder gate
// G1 untouched). The vendor URL *shapes* here follow each platform's published
// booking-link pattern and are configurable per practice; exact reconciliation
// against live listings is part of the gated integration (W39 dossier).
//
// Privacy rule enforced in code: a deep link may never carry patient identifiers.
// The invitation token is an opaque HMAC (W7) and is the only Meherr identifier
// permitted in a URL.

import { signBookingToken } from "@/booking/token";
import type { InvitationId } from "@/domain/types";

export type BookingProviderName = "internal" | "hotdoc" | "healthengine";

export interface DeepLinkContext {
  invitationId: InvitationId;
  clinicianId: string;
  sessionDate: string; // ISO date of the offered session
}

export interface InternalProviderConfig {
  provider: "internal";
  /** Origin of the Meherr booking page, e.g. https://book.careyield.test */
  baseUrl: string;
}

export interface VendorProviderConfig {
  provider: "hotdoc" | "healthengine";
  /** Vendor origin (configurable so sandboxes and tests never hit production). */
  baseUrl: string;
  /** The practice's listing slug on that platform. */
  practiceSlug: string;
  /** clinicianId → the platform's practitioner slug. Unmapped ⇒ fall back. */
  clinicianSlugs: Record<string, string>;
}

export type BookingLinkConfig = InternalProviderConfig | VendorProviderConfig;

export interface PracticeLinkSettings {
  /** Per-practice flag: vendor deep links are off unless explicitly enabled. */
  enabled: boolean;
  config: BookingLinkConfig;
  /** Always required — the fallback whenever a vendor link can't be built. */
  fallback: InternalProviderConfig;
}

export interface BuiltLink {
  url: string;
  provider: BookingProviderName;
  /** Set when a vendor link was requested but the fallback was used instead. */
  fellBackBecause?: "provider_disabled" | "clinician_not_mapped";
}

/** Patient-identifying query keys that must never appear in a booking link. */
const FORBIDDEN_PARAM_KEYS = [
  "patient",
  "patientid",
  "patient_id",
  "name",
  "firstname",
  "surname",
  "dob",
  "email",
  "phone",
  "mobile",
  "medicare",
];

export class UnsafeDeepLinkError extends Error {}

/**
 * Guard every produced link: https only, and no patient-identifying parameters.
 * Throws rather than returning a bad link — a non-compliant URL must never send.
 */
export function assertSafeLink(url: string): void {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") {
    throw new UnsafeDeepLinkError(`booking links must be https (got ${parsed.protocol})`);
  }
  for (const key of parsed.searchParams.keys()) {
    if (FORBIDDEN_PARAM_KEYS.includes(key.toLowerCase().replace(/[^a-z_]/g, ""))) {
      throw new UnsafeDeepLinkError(`booking link may not carry patient identifier "${key}"`);
    }
  }
}

function internalLink(config: InternalProviderConfig, ctx: DeepLinkContext): string {
  return `${config.baseUrl.replace(/\/$/, "")}/book/${signBookingToken(ctx.invitationId)}`;
}

function vendorLink(config: VendorProviderConfig, ctx: DeepLinkContext, slug: string): string {
  const origin = config.baseUrl.replace(/\/$/, "");
  const practice = encodeURIComponent(config.practiceSlug);
  const practitioner = encodeURIComponent(slug);
  // Published booking-link shapes; per-practice configurable, reconciled at W39.
  if (config.provider === "hotdoc") {
    return `${origin}/medical-centres/${practice}/${practitioner}/book?date=${ctx.sessionDate}`;
  }
  return `${origin}/book/${practice}?practitioner=${practitioner}&date=${ctx.sessionDate}`;
}

/**
 * Build the booking link for one invitation. Vendor links require the flag AND a
 * mapped clinician slug; anything missing falls back to the internal tokenised
 * link with the reason recorded (surfaced by ops, not silently swallowed).
 */
export function buildBookingLink(
  settings: PracticeLinkSettings,
  ctx: DeepLinkContext,
): BuiltLink {
  const fallback = (): string => internalLink(settings.fallback, ctx);

  if (settings.config.provider === "internal") {
    const url = internalLink(settings.config, ctx);
    assertSafeLink(url);
    return { url, provider: "internal" };
  }

  if (!settings.enabled) {
    const url = fallback();
    assertSafeLink(url);
    return { url, provider: "internal", fellBackBecause: "provider_disabled" };
  }

  const slug = settings.config.clinicianSlugs[ctx.clinicianId];
  if (!slug) {
    const url = fallback();
    assertSafeLink(url);
    return { url, provider: "internal", fellBackBecause: "clinician_not_mapped" };
  }

  const url = vendorLink(settings.config, ctx, slug);
  assertSafeLink(url);
  return { url, provider: settings.config.provider };
}
