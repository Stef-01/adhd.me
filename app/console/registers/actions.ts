"use server";

import { redirect } from "next/navigation";
import type { ConditionCode } from "@/domain/types";
import { getConsole, recordConfigChange } from "@/console/store";
import { setRegisterEnabled } from "@/registers/store";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "../guard";

// Turning a register off changes who the practice will contact, so it is a rules-level
// change and rides the existing `edit_rules` grant (owner + manager) rather than adding
// a new one. Server actions are independently-invocable endpoints, so authorize here
// (W13), not only in the page.
export async function toggleRegister(formData: FormData): Promise<void> {
  const { email, record } = await requirePractice();
  const state = getConsole();

  const decision = authorize(state.memberships, email, record.practice.id, "edit_rules");
  if (!decision.allowed) redirect("/console/registers?error=denied");

  const conditionCode = formData.get("conditionCode");
  if (typeof conditionCode !== "string" || conditionCode === "") {
    redirect("/console/registers?error=unknown_register");
  }

  const enable = formData.get("enable") === "1";
  const result = setRegisterEnabled(record.practice.id, conditionCode as ConditionCode, enable);
  // Only ever redirect with an error KEY, never a message built from input (W41).
  if (!result.ok) redirect(`/console/registers?error=${result.reason}`);

  // AR40: the rules-level change this action's header claims it is, now recorded like one.
  // Written only past the store's unknown-code refusal, so the interpolated code is a register
  // that exists — W41's rule for anything a detail string carries.
  recordConfigChange(
    record.practice.id,
    new Date().toISOString(),
    `register-${conditionCode}`,
    `register ${conditionCode} turned ${enable ? "on" : "off"}`,
  );

  redirect("/console/registers");
}
