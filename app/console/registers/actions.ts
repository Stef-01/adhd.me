"use server";

import { redirect } from "next/navigation";
import type { ConditionCode } from "@/domain/types";
import { getConsole } from "@/console/store";
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

  const result = setRegisterEnabled(
    record.practice.id,
    conditionCode as ConditionCode,
    formData.get("enable") === "1",
  );
  // Only ever redirect with an error KEY, never a message built from input (W41).
  if (!result.ok) redirect(`/console/registers?error=${result.reason}`);

  redirect("/console/registers");
}
