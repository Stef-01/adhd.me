"use server";

import { redirect } from "next/navigation";
import { recordOutcome } from "@/audit/store";
import { getConsole } from "@/console/store";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "../guard";

export async function submitUsefulness(formData: FormData): Promise<void> {
  // Server actions are independently-invocable endpoints — authorize first (W13).
  // A session alone is not authorization (W51): recordOutcome takes no caller
  // identity, so the membership grant has to be checked here or nowhere.
  const { email, record } = await requirePractice();
  const state = getConsole();
  const decision = authorize(state.memberships, email, record.practice.id, "record_usefulness");
  if (!decision.allowed) redirect("/console/usefulness?error=denied");
  const appointmentId = formData.get("appointmentId");
  if (typeof appointmentId !== "string") redirect("/console/usefulness?error=1");
  // W209: the same practice the grant was checked against. It was checked here and then dropped,
  // so the write landed on a queue that belonged to nobody — see src/audit/store.ts.
  const result = recordOutcome(
    {
      appointmentId: appointmentId as string,
      usefulness: formData.getAll("usefulness").map(String),
      clinicianJudgedReasonable: formData.get("clinicianJudgedReasonable") === "on",
    },
    record.practice.id,
  );
  redirect(result.ok ? "/console/usefulness?saved=1" : `/console/usefulness?error=${result.error}`);
}
