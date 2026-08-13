"use server";

import { redirect } from "next/navigation";
import { getConsole } from "@/console/store";
import { acceptanceStatus } from "@/referrals/acceptance";
import { actsFor, addAcceptanceActs, sentTo } from "@/referrals/store";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "../guard";

/**
 * Answer a referral addressed to this practice.
 *
 * Both answers are explicit acts (W134), and the action refuses to answer a referral this
 * practice was not sent — established by looking only inside `sentTo`, so a referral belonging
 * to somebody else does not exist as far as this endpoint is concerned. Same rule as W113's
 * withdrawal: ownership is not read off the form, and "not yours" and "does not exist" get the
 * same answer so the error cannot confirm another practice holds a referral by that id.
 */
export async function answerReferral(formData: FormData): Promise<void> {
  const { email, record } = await requirePractice();
  const console_ = getConsole();
  const practiceId = record.practice.id;
  if (!authorize(console_.memberships, email, practiceId, "view_dashboard").allowed) {
    redirect("/console/referrals?error=denied");
  }

  const referralId = formData.get("referralId");
  const answer = formData.get("answer");
  const reason = formData.get("reason");
  if (typeof referralId !== "string" || (answer !== "accept" && answer !== "decline")) {
    redirect("/console/referrals?error=failed");
  }

  const mine = sentTo(practiceId).some((d) => d.referralId === referralId);
  if (!mine) redirect("/console/referrals?error=not_yours");

  // Silence is not acceptance and neither is a second answer: a referral already answered is
  // not re-answered from a stale page.
  if (acceptanceStatus(actsFor(practiceId), referralId as string).state !== "awaiting_acceptance") {
    redirect("/console/referrals?error=already_answered");
  }

  const at = new Date().toISOString().slice(0, 10);
  if (answer === "decline") {
    if (typeof reason !== "string" || reason.trim() === "") {
      redirect("/console/referrals?error=reason_missing");
    }
    addAcceptanceActs([
      {
        kind: "declined",
        referralId: referralId as string,
        at,
        by: email,
        byPracticeId: practiceId,
        reason: (reason as string).trim(),
      },
    ]);
  } else {
    addAcceptanceActs([
      { kind: "accepted", referralId: referralId as string, at, by: email, byPracticeId: practiceId },
    ]);
  }
  redirect("/console/referrals?saved=1");
}
