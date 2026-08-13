"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { rateLimit } from "@/lib/rate-limit";
import { saveInterestSignup } from "@/interest/store";
import { INTEREST_REASONS, type InterestReason, type InterestFormState } from "@/interest/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerInterest(
  _previous: InterestFormState,
  formData: FormData,
): Promise<InterestFormState> {
  const honeypot = String(formData.get("company") ?? "").trim();
  if (honeypot) return { status: "success", message: "Thanks — you’re on the list." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const consent = formData.get("consent") === "yes";
  const interests = formData.getAll("interest")
    .map(String)
    .filter((value): value is InterestReason => INTEREST_REASONS.includes(value as InterestReason));
  const fieldErrors: NonNullable<InterestFormState["fieldErrors"]> = {};

  if (name.length < 2 || name.length > 80) fieldErrors.name = "Please enter your name.";
  if (!EMAIL_PATTERN.test(email) || email.length > 254) fieldErrors.email = "Please enter a valid email address.";
  if (interests.length === 0) fieldErrors.interests = "Choose at least one option.";
  if (!consent) fieldErrors.consent = "Please confirm that we may store these details and contact you.";

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Please check the highlighted details.", fieldErrors };
  }

  const requestHeaders = await headers();
  const requester = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    || requestHeaders.get("x-real-ip")
    || "local";
  if (!rateLimit("community-interest", requester, { limit: 8, windowMs: 60 * 60 * 1000 })) {
    return { status: "error", message: "Too many attempts. Please try again later." };
  }

  try {
    saveInterestSignup({ name, email, interests });
    revalidatePath("/console/interest");
    return { status: "success", message: "Thanks — you’re on the list. We’ll be in touch as the Western Sydney sessions take shape." };
  } catch {
    return { status: "error", message: "We couldn’t save that just now. Please email us instead." };
  }
}
