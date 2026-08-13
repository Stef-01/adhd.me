"use server";

// W43: complaint actions. Intake is open to any signed-in staff member (front desk
// must never be blocked from recording a complaint); triage and resolution are the
// pause_sending grant (owner/manager) — the same stewardship tier that can halt
// sending, because complaints are the signal that halts it.

import { redirect } from "next/navigation";
import { resolveInStore, submitComplaint, triageInStore } from "@/complaints/store";
import type { ComplaintChannel, ComplaintSeverity } from "@/complaints/workflow";
import { getConsole } from "@/console/store";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "../guard";

const CHANNELS: ComplaintChannel[] = ["phone", "email", "front_desk", "sms_reply"];
const SEVERITIES: ComplaintSeverity[] = ["low", "serious", "urgent"];

/**
 * W206: returns the practice as well as the email.
 *
 * The intake action had the practice in hand all along and dropped it, so every complaint was
 * filed under a literal belonging to nobody. Returning both makes the practice available at the
 * one place it has to be recorded.
 */
async function requireGrant(
  action: "view_dashboard" | "pause_sending",
): Promise<{ email: string; practiceId: string }> {
  const { email, record } = await requirePractice();
  const state = getConsole();
  const decision = authorize(state.memberships, email, record.practice.id, action);
  if (!decision.allowed) redirect("/console/complaints?error=denied");
  return { email, practiceId: record.practice.id as string };
}

export async function intake(formData: FormData): Promise<void> {
  // W51: intake stays open to every role — front desk must never be blocked from
  // recording a complaint — but not to every session. It writes a terminal opt-out
  // into the rail, so it takes the lowest grant every member holds, not none at all.
  const { practiceId } = await requireGrant("view_dashboard");
  const channel = String(formData.get("channel") ?? "");
  const errors = submitComplaint(
    {
      channel: (CHANNELS.includes(channel as ComplaintChannel) ? channel : "phone") as ComplaintChannel,
      summary: String(formData.get("summary") ?? ""),
      patientId: String(formData.get("patientId") ?? "") || undefined,
      wantsOptOut: formData.get("wantsOptOut") === "on",
    },
    new Date().toISOString(),
    practiceId,
  );
  if (Object.keys(errors).length > 0) redirect("/console/complaints?error=intake");
  redirect("/console/complaints?received=1");
}

export async function triage(formData: FormData): Promise<void> {
  const { email } = await requireGrant("pause_sending");
  const severity = String(formData.get("severity") ?? "");
  if (!SEVERITIES.includes(severity as ComplaintSeverity)) redirect("/console/complaints?error=triage");
  triageInStore(String(formData.get("id") ?? ""), severity as ComplaintSeverity, new Date().toISOString(), email);
  redirect("/console/complaints");
}

export async function resolve(formData: FormData): Promise<void> {
  const { email } = await requireGrant("pause_sending");
  const errors = resolveInStore(
    String(formData.get("id") ?? ""),
    String(formData.get("resolution") ?? ""),
    new Date().toISOString(),
    email,
  );
  if (Object.keys(errors).length > 0) redirect("/console/complaints?error=resolve");
  redirect("/console/complaints");
}
