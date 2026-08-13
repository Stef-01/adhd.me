"use server";

import { redirect } from "next/navigation";
import { numberField } from "@/lib/form-numbers";
import {
  acknowledgeSetupStep,
  completeSetup,
  onboardPractice,
  saveClinicians,
  saveSessionConfig,
  updateRules,
  type ClinicianInput,
} from "@/console/store";
import { APPOINTMENT_TYPES, type SessionConfig } from "@/session/config";
import type { AppointmentType } from "@/domain/types";
import type { EligibilityConfig } from "@/engine/eligibility";
import { nextStep, type SetupStepSlug } from "@/console/setup-steps";
import { requirePractice, requireSession } from "../guard";

// Every action authorizes first (W13) and the store re-checks the role grant (W18).
// On success the wizard advances; on failure it returns to the same step with the
// error surfaced, so a practice is never bounced out of setup by a typo.

function onwards(step: SetupStepSlug, errors: Record<string, string>): never {
  if (Object.keys(errors).length > 0) {
    // Redirect with the error KEY, never the message. Reflecting a caller-supplied
    // string would let anyone craft a link that renders arbitrary text inside the
    // authenticated console; the page maps keys to its own fixed copy instead
    // (same convention as /console/usefulness).
    const key = Object.keys(errors)[0] ?? "form";
    redirect(`/console/setup/${step}?error=${encodeURIComponent(key)}`);
  }
  const next = nextStep(step);
  redirect(next ? `/console/setup/${next}` : "/console");
}

export async function saveStepPractice(formData: FormData): Promise<void> {
  // W166: `requireSession`, not `requirePractice` — this is the step that CREATES the practice,
  // so demanding one first makes step 1 of the wizard unreachable. Same reasoning as `onboard`.
  const email = await requireSession();
  const raw = formData.get("holdoutPercent");
  const errors = onboardPractice(
    {
      name: String(formData.get("name") ?? ""),
      timezone: String(formData.get("timezone") ?? ""),
      holdoutPercent: raw === null || raw === "" ? Number.NaN : Number(raw),
    },
    new Date().toISOString(),
    email,
  );
  onwards("practice", errors);
}

export async function saveStepClinicians(formData: FormData): Promise<void> {
  const { email, record } = await requirePractice();
  const names = formData.getAll("clinicianName").map(String);
  const ids = formData.getAll("clinicianId").map(String);
  const inputs: ClinicianInput[] = names
    .map((displayName, i) => ({
      // Empty id = a new row; a present id keeps that clinician's identity (W41 fix).
      id: (ids[i] || undefined) as ClinicianInput["id"],
      displayName,
      // An unchecked box submits nothing, so participation is read positionally.
      participating: formData.getAll("participating").map(String).includes(String(i)),
    }))
    .filter((c) => c.displayName.trim().length > 0);
  onwards("clinicians", saveClinicians(record.practice.id, inputs, new Date().toISOString(), email));
}

export async function saveStepSessions(formData: FormData): Promise<void> {
  const { email, record } = await requirePractice();
  const chosen = formData.getAll("fillableTypes").map(String) as AppointmentType[];
  const allowlist = formData.getAll("participatingClinicianIds").map(String);
  const config: SessionConfig = {
    fillableTypes: chosen.filter((t) => APPOINTMENT_TYPES.includes(t)),
    participatingClinicianIds: allowlist.length > 0 ? allowlist : "all",
    protectedCapacityFraction: numberField(formData, "protectedCapacityPercent") / 100,
    schedulingWindow: {
      startHour: numberField(formData, "startHour"),
      endHour: numberField(formData, "endHour"),
    },
  };
  const errors = saveSessionConfig(record.practice.id, config, new Date().toISOString(), email);
  // Saving the step is what proves the practice chose these settings rather than
  // inheriting defaults — record it only on success.
  if (Object.keys(errors).length === 0) acknowledgeSetupStep(record.practice.id, "sessions", email);
  onwards("sessions", errors);
}

export async function saveStepRules(formData: FormData): Promise<void> {
  const { email, record } = await requirePractice();
  const config: EligibilityConfig = {
    minDaysSinceLastVisit: numberField(formData, "minDaysSinceLastVisit"),
    futureBookingBlockDays: numberField(formData, "futureBookingBlockDays"),
    maxInvitesPerQuarter: numberField(formData, "maxInvitesPerQuarter"),
    usualClinicianOnly: formData.get("usualClinicianOnly") === "on",
    chronicCareOnly: formData.get("chronicCareOnly") === "on",
  };
  const errors = updateRules(record.practice.id, config, new Date().toISOString(), email);
  // updateRules no-ops when nothing changed, so acknowledgement is recorded here
  // rather than inside it: submitting the step IS the practice accepting the values.
  if (Object.keys(errors).length === 0) acknowledgeSetupStep(record.practice.id, "rules", email);
  onwards("rules", errors);
}

export async function finishSetup(): Promise<void> {
  const { email, record } = await requirePractice();
  onwards("review", completeSetup(record.practice.id, new Date().toISOString(), email));
}
