"use server";

import { redirect } from "next/navigation";
import type { ClinicianId, ConditionCode } from "@/domain/types";
import { clinicianForEmail } from "@/console/clinician-identity";
import { getConsole } from "@/console/store";
import { authorize } from "@/tenancy/tenancy";
import { getInterestState } from "@/capability/store";
import { clearInterest, saveInterest } from "@/capability/interest";
import { getRegisters } from "@/registers/store";
import { requirePractice } from "../guard";

// Server actions are independently-invocable endpoints, so the identity check lives HERE
// (W13), not only in the page. The acting clinician is resolved from the SESSION, never
// from the form — a posted clinicianId cannot make you someone else.
export async function stateInterest(formData: FormData): Promise<void> {
  const { email, record } = await requirePractice();
  const console_ = getConsole();
  // W116 finding: this was the only console action with no membership check. Being on the
  // clinician ROSTER is not the same as being a member of the practice — the roster is a list
  // of names a practice types during setup, and an email can sit on it without any membership
  // row existing. Resolving the actor from the session already stopped anyone acting AS
  // someone else, so nothing was exploitable; what was missing is the decision itself, and
  // "authorized because the roster happens to contain your address" is not one anybody made.
  if (!authorize(console_.memberships, email, record.practice.id, "view_dashboard").allowed) {
    redirect("/console/case-mix?error=denied");
  }

  const identity = clinicianForEmail(record.clinicians, email);
  if (!identity.linked) redirect("/console/case-mix?error=not_linked");

  const conditionCode = formData.get("conditionCode");
  if (typeof conditionCode !== "string" || conditionCode === "") {
    redirect("/console/case-mix?error=unknown_condition");
  }

  const raw = formData.get("strength");
  const known = getRegisters().conditions.map((c) => c.code);

  if (raw === "none") {
    clearInterest(
      getInterestState(),
      record.practice.id,
      identity.clinician.id,
      conditionCode as ConditionCode,
    );
    redirect("/console/case-mix?saved=1");
  }

  const result = saveInterest({
    state: getInterestState(),
    practiceId: record.practice.id,
    // Subject IS the actor: the page cannot state an interest for anyone else.
    actingClinicianId: identity.clinician.id as ClinicianId,
    subjectClinicianId: identity.clinician.id as ClinicianId,
    conditionCode: conditionCode as ConditionCode,
    strength: Number(raw),
    knownConditions: known,
    atIso: new Date().toISOString(),
  });

  // Error KEYS only, never a message built from input (W41).
  redirect(result.ok ? "/console/case-mix?saved=1" : `/console/case-mix?error=${result.reason}`);
}
