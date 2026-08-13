"use server";

import { redirect } from "next/navigation";
import { getConsole } from "@/console/store";
import type { PracticeId } from "@/domain/types";
import { applyKillSwitch, applyPracticePause } from "@/ops/store";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "../guard";

// Ops controls are a pause_sending grant (owner/manager). Server actions are
// independently-invocable endpoints, so authorize here (W13), not only in the page.
async function requirePauseGrant(): Promise<PracticeId> {
  const { email, record } = await requirePractice();
  const state = getConsole();
  const decision = authorize(state.memberships, email, record.practice.id, "pause_sending");
  if (!decision.allowed) redirect("/console/ops?error=denied");
  return record.practice.id;
}

export async function toggleKillSwitch(formData: FormData): Promise<void> {
  await requirePauseGrant();
  applyKillSwitch(formData.get("engage") === "1", new Date().toISOString());
  redirect("/console/ops");
}

export async function togglePracticePause(formData: FormData): Promise<void> {
  const practiceId = await requirePauseGrant();
  applyPracticePause(practiceId, formData.get("pause") === "1", new Date().toISOString());
  redirect("/console/ops");
}
