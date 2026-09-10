"use server";

// Phase M (ADR 0007): the GP dashboard's mutations. Every action re-authorises (a server action
// is an independently invocable endpoint), reads only the fields it names off the form, and
// redirects back with a KEY in the query string that the page maps to copy, never text.
//
// SYNTHETIC BUILD POSTURE, said out loud: any signed-in console account may manage any listed
// GP profile. The practice-to-GP membership that would scope this is the wiring unit's (Phase
// M5), and the page says so on its face.

import { redirect } from "next/navigation";
import { EI_QUALITY_KEYS, type EIQuality } from "@/demo/emotional-fit";
import { aggregateFeedback, feedbackForGP, isRating } from "@/lib/matching/feedback";
import { allFeedback, allMatches, getMatching, gpById, matchById, saveFeedback, saveGP, setMatchStatus } from "@/lib/matching/store";
import {
  AGE_GROUPS,
  COMORBIDITIES,
  type AgeGroup,
  type BillingPreference,
  type Comorbidity,
  type ConsultStyle,
  type DeclineReason,
  type Feedback,
  type GP,
  type PrescribingPhilosophy,
  type TitrationPace,
} from "@/lib/matching/types";
import { serverNow } from "@/lib/server-clock";
import { isAdhdMeStaff } from "@/tenancy/staff";
import { practiceRecord } from "@/console/store";
import type { PracticeId } from "@/domain/types";
import { claimGP, gpAccessFor, releaseGP, type Viewer } from "@/lib/matching/access";
import { requirePractice } from "../guard";

const PHILOSOPHIES: readonly PrescribingPhilosophy[] = ["stimulant-first", "non-stimulant-first", "case-by-case", "non-prescribing"];
const PACES: readonly TitrationPace[] = ["gradual", "standard", "brisk"];
const CONSULT: readonly Exclude<ConsultStyle, "either">[] = ["telehealth", "in-person"];
const BILLING: readonly Exclude<BillingPreference, "either">[] = ["bulk-billing", "medicare-gap", "private"];
const DECLINE: readonly DeclineReason[] = ["no_capacity", "outside_scope", "age_group", "needs_specialist", "other"];

function back(gpId: string, key: string, kind: "saved" | "error"): never {
  redirect(`/console/gp/${encodeURIComponent(gpId)}?${kind}=${key}`);
}

/** The session as the access rule sees it: its practice, whether it is staff. */
async function viewer(): Promise<Viewer & { practiceId: string }> {
  const { email, record } = await requirePractice();
  return { practiceId: record.practice.id as string, staff: isAdhdMeStaff(email), practiceExists: (id) => practiceRecord(id as PracticeId) !== null };
}

/** The profile named by the form, only when this practice manages it. */
async function gpFromForm(formData: FormData): Promise<GP> {
  const who = await viewer();
  const gpId = formData.get("gpId");
  if (typeof gpId !== "string") redirect("/console/gp?error=failed");
  const gp = gpById(gpId);
  if (!gp) redirect("/console/gp?error=not_found");
  if (gpAccessFor(gp, who) !== "manage") redirect("/console/gp?error=not_yours");
  return gp;
}

export async function claimProfile(formData: FormData): Promise<void> {
  const who = await viewer();
  const gpId = formData.get("gpId");
  if (typeof gpId !== "string") redirect("/console/gp?error=failed");
  const result = claimGP(gpId, who, getMatching());
  if (!result.ok) redirect(`/console/gp?error=${result.reason === "not_found" ? "not_found" : "not_yours"}`);
  saveGP(result.gp);
  redirect(`/console/gp/${encodeURIComponent(gpId)}?saved=claimed`);
}

export async function releaseProfile(formData: FormData): Promise<void> {
  const who = await viewer();
  const gpId = formData.get("gpId");
  if (typeof gpId !== "string") redirect("/console/gp?error=failed");
  const result = releaseGP(gpId, who, getMatching());
  if (!result.ok) redirect(`/console/gp?error=${result.reason === "not_found" ? "not_found" : "not_yours"}`);
  saveGP(result.gp);
  redirect("/console/gp?saved=released");
}

function text(formData: FormData, name: string, max: number): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function declared(formData: FormData, name: string): boolean | null {
  const value = formData.get(name);
  return value === "yes" ? true : value === "no" ? false : null;
}

function picked<T extends string>(formData: FormData, name: string, allowed: readonly T[]): T[] {
  return formData.getAll(name).filter((v): v is T => typeof v === "string" && (allowed as readonly string[]).includes(v));
}

function oneOf<T extends string>(value: FormDataEntryValue | null, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

export async function saveProfile(formData: FormData): Promise<void> {
  const gp = await gpFromForm(formData);
  const bio = text(formData, "bio", 3000);
  if (bio.length < 20) back(gp.id, "bio_short", "error");
  const years = formData.get("years");
  const yearsValue = typeof years === "string" && years.trim() !== "" ? Number(years) : null;
  if (yearsValue !== null && (!Number.isInteger(yearsValue) || yearsValue < 0 || yearsValue > 60)) back(gp.id, "years", "error");
  const ageGroups = picked<AgeGroup>(formData, "ageGroups", AGE_GROUPS);
  if (ageGroups.length === 0) back(gp.id, "age_groups", "error");
  const video = text(formData, "videoIntroUrl", 300);
  if (video && !/^https:\/\//.test(video)) back(gp.id, "video", "error");
  saveGP({
    ...gp,
    telehealthAvailable: formData.get("telehealth") === "on",
    acceptingNewPatients: formData.get("accepting") === "on",
    credentials: {
      ...gp.credentials,
      bioLongText: bio,
      prescribingPhilosophyText: text(formData, "philosophyText", 800),
      prescribingPhilosophy: oneOf(formData.get("philosophy"), PHILOSOPHIES),
      titrationPace: oneOf(formData.get("pace"), PACES),
      yearsTreatingAdhd: yearsValue,
      aadpaTrained: declared(formData, "aadpa"),
      racgpSpecificInterestsMember: declared(formData, "racgp"),
      stateAdhdTrained: declared(formData, "stateTrained"),
      ageGroupsTreated: ageGroups,
      caseloadMix: picked<Comorbidity>(formData, "caseloadMix", COMORBIDITIES),
      communicationStyle: picked<EIQuality>(formData, "manner", EI_QUALITY_KEYS),
      videoIntroUrl: video || null,
    },
  });
  back(gp.id, "profile", "saved");
}

export async function savePreferences(formData: FormData): Promise<void> {
  const gp = await gpFromForm(formData);
  const minimum = Number(formData.get("minimumFit"));
  if (!Number.isFinite(minimum) || minimum < 0 || minimum > 1) back(gp.id, "minimum", "error");
  const ageGroups = picked<AgeGroup>(formData, "prefAgeGroups", AGE_GROUPS);
  const consultStyles = picked(formData, "consultStyles", CONSULT);
  const billing = picked(formData, "billing", BILLING);
  if (ageGroups.length === 0 || consultStyles.length === 0 || billing.length === 0) back(gp.id, "preferences_empty", "error");
  saveGP({
    ...gp,
    preferences: {
      ageGroups,
      consultStyles,
      billingAccepted: billing,
      acceptsComplexComorbidity: formData.get("complex") === "on",
      minimumFit: Math.round(minimum * 100) / 100,
    },
  });
  back(gp.id, "preferences", "saved");
}

export async function saveCapacity(formData: FormData): Promise<void> {
  const gp = await gpFromForm(formData);
  const current = Number(formData.get("current"));
  const max = Number(formData.get("max"));
  if (!Number.isInteger(max) || max < 0 || max > 60) back(gp.id, "capacity", "error");
  if (!Number.isInteger(current) || current < 0 || current > max) back(gp.id, "capacity", "error");
  saveGP({ ...gp, credentials: { ...gp.credentials, caseloadCapacityCurrent: current, caseloadCapacityMax: max } });
  back(gp.id, "capacity", "saved");
}

/**
 * Evidence upload, name only. The file's bytes are read for their length and dropped: this
 * build stores no document contents (the credentials vault's G2/G6 posture), and a verifier
 * would receive the file through the practice's own channel in the wiring unit. What is kept is
 * that a document of that name was offered, and when.
 */
export async function uploadEvidence(formData: FormData): Promise<void> {
  const gp = await gpFromForm(formData);
  const file = formData.get("evidence");
  if (!(file instanceof File) || file.name.trim() === "") back(gp.id, "evidence_missing", "error");
  if (file.size > 8 * 1024 * 1024) back(gp.id, "evidence_size", "error");
  if (!/\.(pdf|png|jpe?g)$/i.test(file.name)) back(gp.id, "evidence_type", "error");
  const at = serverNow().toISOString();
  saveGP({
    ...gp,
    verificationStatus: gp.verificationStatus === "verified" ? "verified" : "pending",
    credentials: { ...gp.credentials, evidence: [...gp.credentials.evidence, { id: `ev-${gp.credentials.evidence.length + 1}`, name: file.name.slice(0, 120), uploadedAt: at }] },
  });
  back(gp.id, "evidence", "saved");
}

export async function answerMatch(formData: FormData): Promise<void> {
  const gp = await gpFromForm(formData);
  const matchId = formData.get("matchId");
  const answer = formData.get("answer");
  if (typeof matchId !== "string" || (answer !== "accept" && answer !== "decline")) back(gp.id, "failed", "error");
  const match = matchById(matchId);
  // "Not yours" and "does not exist" get the same answer.
  if (!match || match.gpId !== gp.id) back(gp.id, "not_yours", "error");
  const at = serverNow().toISOString();
  if (answer === "decline") {
    const reason = oneOf(formData.get("reason"), DECLINE);
    if (!reason) back(gp.id, "reason_missing", "error");
    const result = setMatchStatus(matchId, "declined", at, reason);
    if (!result.ok) back(gp.id, "already_answered", "error");
  } else {
    const result = setMatchStatus(matchId, "accepted", at);
    if (!result.ok) back(gp.id, "already_answered", "error");
  }
  back(gp.id, "answered", "saved");
}

export async function completeMatch(formData: FormData): Promise<void> {
  const gp = await gpFromForm(formData);
  const matchId = formData.get("matchId");
  if (typeof matchId !== "string") back(gp.id, "failed", "error");
  const match = matchById(matchId);
  if (!match || match.gpId !== gp.id) back(gp.id, "not_yours", "error");
  const result = setMatchStatus(matchId, "completed", serverNow().toISOString());
  if (!result.ok) back(gp.id, "already_answered", "error");
  back(gp.id, "completed", "saved");
}

export async function gpFeedback(formData: FormData): Promise<void> {
  const gp = await gpFromForm(formData);
  const matchId = formData.get("matchId");
  if (typeof matchId !== "string") back(gp.id, "failed", "error");
  const match = matchById(matchId);
  if (!match || match.gpId !== gp.id) back(gp.id, "not_yours", "error");
  if (match.matchStatus !== "accepted" && match.matchStatus !== "completed") back(gp.id, "not_consulted", "error");
  const appropriate = Number(formData.get("clinicalAppropriateness"));
  const capacity = Number(formData.get("capacityFit"));
  if (!isRating(appropriate) || !isRating(capacity)) back(gp.id, "rating", "error");
  const state = getMatching();
  const record: Feedback = {
    id: `f-${match.id}-gp`,
    matchId: match.id,
    from: "gp",
    patientRating: null,
    gpRating: { clinicalAppropriateness: appropriate, capacityFit: capacity },
    freeTextFeedback: text(formData, "text", 1000),
    createdAt: serverNow().toISOString(),
  };
  saveFeedback(record, state);
  saveGP({ ...gp, ratingAggregate: aggregateFeedback(feedbackForGP(gp.id, allMatches(state), allFeedback(state))) }, state);
  back(gp.id, "feedback", "saved");
}
