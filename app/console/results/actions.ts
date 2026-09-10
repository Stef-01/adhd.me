"use server";

import { redirect } from "next/navigation";
import { getConsole, updateBillingPerVisit } from "@/console/store";
import { numberField } from "@/lib/form-numbers";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "../guard";

/**
 * Change what a visit bills, behind the results page's estimate.
 *
 * Re-authorised here and not only on the page that renders the form, the referrals action's
 * rule: a server action is a POST endpoint of its own. Errors travel as keys the page maps to
 * copy, never as text.
 */
export async function saveBillingAssumption(formData: FormData): Promise<void> {
  const { email, record } = await requirePractice();
  const practiceId = record.practice.id;
  if (!authorize(getConsole().memberships, email, practiceId, "edit_rules").allowed) {
    redirect("/console/results?error=denied");
  }
  const errors = updateBillingPerVisit(
    practiceId,
    numberField(formData, "billingPerVisitAud"),
    new Date().toISOString(),
    email,
  );
  if ("form" in errors) redirect("/console/results?error=denied");
  if (Object.keys(errors).length > 0) redirect("/console/results?error=billing");
  redirect("/console/results?saved=billing");
}
