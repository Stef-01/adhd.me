"use server";

import { cookies } from "next/headers";
import { numberField } from "@/lib/form-numbers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, signSession } from "@/console/session";
import { rateLimit } from "@/lib/rate-limit";
import { onboardPractice, practicesFor, updateRules } from "@/console/store";
import type { EligibilityConfig } from "@/engine/eligibility";
import { PRACTICE_COOKIE, requirePractice, requireSession } from "./guard";

// Mock auth provider: any staff email signs in (synthetic phase — founder gate
// blocks production credentials; Supabase auth replaces this action's body).
export async function signIn(formData: FormData): Promise<void> {
  const email = formData.get("email");
  if (typeof email !== "string" || !email.includes("@")) redirect("/console/signin?error=1");
  // W37: sign-in is an unauthenticated endpoint — throttle per identifier.
  if (!rateLimit("signin", email.toLowerCase(), { limit: 20, windowMs: 60_000 })) {
    redirect("/console/signin?error=rate");
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signSession(email), { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/console");
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/console/signin");
}

export async function onboard(formData: FormData): Promise<void> {
  // Server actions are independently-invocable POST endpoints — authorize here,
  // not only in the page component that renders the form.
  //
  // W166: `requireSession`, NOT `requirePractice`. This is the action that creates the first
  // practice, so demanding one first would make onboarding unreachable — it would bounce back to
  // the page it posts from, forever. The authorization that matters here is "is anybody signed
  // in", because creating a practice you then own grants nothing over anybody else's.
  const email = await requireSession();
  const errors = onboardPractice(
    {
      name: String(formData.get("name") ?? ""),
      timezone: String(formData.get("timezone") ?? ""),
      // Missing/blank must fail validation, not coerce to 0 and silently disable the
      // holdout arm. Same hazard as every other numeric field — see numberField.
      holdoutPercent: numberField(formData, "holdoutPercent"),
    },
    new Date().toISOString(),
    email,
  );
  if (Object.keys(errors).length > 0) redirect("/console/onboarding?error=1");
  redirect("/console");
}

export async function saveRules(formData: FormData): Promise<void> {
  const { email, record } = await requirePractice();
  const config: EligibilityConfig = {
    minDaysSinceLastVisit: numberField(formData, "minDaysSinceLastVisit"),
    futureBookingBlockDays: numberField(formData, "futureBookingBlockDays"),
    maxInvitesPerQuarter: numberField(formData, "maxInvitesPerQuarter"),
    usualClinicianOnly: formData.get("usualClinicianOnly") === "on",
    chronicCareOnly: formData.get("chronicCareOnly") === "on",
  };
  const errors = updateRules(record.practice.id, config, new Date().toISOString(), email);
  if (Object.keys(errors).length > 0) redirect("/console/rules?error=1");
  redirect("/console");
}

/**
 * Switch which practice this session is acting for.
 *
 * W166: the selection is written to a cookie and NOTHING ELSE. It cannot widen access, because
 * `activePracticeFor` honours it only when the email is already a member — so the worst a forged
 * cookie achieves is picking a practice the user already has. Membership stays the grant; this is
 * a preference. The action still refuses an unknown practice rather than writing it, so a bad
 * value never gets stored in the first place.
 */
export async function switchPractice(formData: FormData): Promise<void> {
  const email = await requireSession();
  const wanted = String(formData.get("practiceId") ?? "");
  const allowed = practicesFor(email).some((r) => (r.practice.id as string) === wanted);
  if (!allowed) redirect("/console?error=denied");
  const jar = await cookies();
  jar.set(PRACTICE_COOKIE, wanted, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/console");
}
