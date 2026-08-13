"use server";

// W33: privacy actions. Export and delete are owner/manager operations (edit_rules
// grant — the practice-stewardship tier). Server actions are independently-invocable
// endpoints, so the grant is checked here, not only in the page.

import { redirect } from "next/navigation";
import { getConsole } from "@/console/store";
import { deletePatientEverywhere, runRetention } from "@/privacy/store";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "../guard";

async function requirePrivacyGrant(): Promise<void> {
  const { email, record } = await requirePractice();
  const state = getConsole();
  const decision = authorize(state.memberships, email, record.practice.id, "edit_rules");
  if (!decision.allowed) redirect("/console/privacy?error=denied");
}

export async function exportPatient(formData: FormData): Promise<void> {
  await requirePrivacyGrant();
  const patientId = String(formData.get("patientId") ?? "").trim();
  if (!patientId) redirect("/console/privacy?error=missing");
  redirect(`/console/privacy?export=${encodeURIComponent(patientId)}`);
}

export async function erasePatient(formData: FormData): Promise<void> {
  await requirePrivacyGrant();
  const patientId = String(formData.get("patientId") ?? "").trim();
  if (!patientId || formData.get("confirm") !== "on") {
    redirect("/console/privacy?error=confirm");
  }
  deletePatientEverywhere(patientId, new Date().toISOString());
  redirect("/console/privacy?deleted=1");
}

/**
 * Apply the retention policy now.
 *
 * runRetention existed but nothing called it, while the console displayed the policy as
 * though it were in force (W51 audit). Rather than delete the function or quietly leave the
 * claim standing, the capability is real and operator-triggered, and the page says outright
 * that nothing runs it on a schedule yet. Scheduled enforcement belongs with real
 * persistence; an honest manual button belongs now.
 */
export async function applyRetention(): Promise<void> {
  await requirePrivacyGrant();
  runRetention(new Date().toISOString());
  redirect("/console/privacy?retention=applied");
}
