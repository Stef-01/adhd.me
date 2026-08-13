"use server";

import { redirect } from "next/navigation";
import { clinicianForEmail } from "@/console/clinician-identity";
import { getConsole } from "@/console/store";
import { ownCredentials, recordEvent } from "@/credentials/ledger";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "../guard";

/**
 * Withdraw one of your own credentials.
 *
 * The only mutation a clinician has on their own record, and it can only ever REDUCE what the
 * system claims about them. There is deliberately no counterpart that adds a claim.
 *
 * Three checks, in this order, because a server action is an independently-invocable endpoint
 * (W13) and a session alone is not authorization (W51):
 *
 *   1. Signed in, and a member of this practice with `view_dashboard`.
 *   2. Linked to a clinician on the roster — unlinked refuses rather than guesses (W81).
 *   3. The credential is one of THEIRS, established by looking only inside `ownCredentials`.
 *      Ownership is not read off the form and it is not checked against a practice-wide
 *      fetch: if the id is not in the caller's own set, it does not exist as far as this
 *      action is concerned.
 */
export async function withdrawOwnCredential(formData: FormData): Promise<void> {
  const { email, record } = await requirePractice();
  const console_ = getConsole();
  if (!authorize(console_.memberships, email, record.practice.id, "view_dashboard").allowed) {
    redirect("/console/credentials?error=denied");
  }

  const identity = clinicianForEmail(record.clinicians, email);
  if (!identity.linked) redirect("/console/credentials?error=not_linked");

  const credentialId = formData.get("credentialId");
  const reason = formData.get("reason");
  if (typeof credentialId !== "string" || credentialId.trim() === "") {
    redirect("/console/credentials?error=failed");
  }
  if (typeof reason !== "string" || reason.trim() === "") {
    redirect("/console/credentials?error=reason_missing");
  }

  const today = new Date().toISOString().slice(0, 10);
  const mine = ownCredentials(record.practice.id, identity.clinician.id, today);
  const target = mine.find((c) => c.credentialId === credentialId);
  // Same answer for "belongs to a colleague" and "does not exist" — a distinct message would
  // confirm that another clinician holds a credential by that id (W109's rule).
  if (!target) redirect("/console/credentials?error=not_yours");

  const result = recordEvent(record.practice.id, {
    kind: "withdrawn",
    at: today,
    credentialId,
    withdrawnBy: identity.clinician.id,
    reason: reason.trim(),
  });
  redirect(
    result.ok
      ? "/console/credentials?saved=1"
      : `/console/credentials?error=${result.reason === "terminal" ? "terminal" : "failed"}`,
  );
}
