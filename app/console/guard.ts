import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/console/session";
import { activePracticeFor, type PracticeRecord } from "@/console/store";

/** Which practice the session picked. A preference, never a grant — see `requirePractice`. */
export const PRACTICE_COOKIE = "meherr_practice";

/**
 * Authorization primitive for the console — returns the signed-in email or
 * redirects to sign-in. Used by both server components and mutating server
 * actions (in an action the redirect throws NEXT_REDIRECT, which Next handles).
 */
export async function requireSession(): Promise<string> {
  const jar = await cookies();
  const email = verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!email) redirect("/console/signin");
  return email;
}

/**
 * The signed-in email plus the practice this session is acting for.
 *
 * W166: every console surface used to read `getConsole().practice`, the one practice that could
 * exist. Now a session resolves to one of the practices its email belongs to, and the selection
 * rides in a cookie that CANNOT WIDEN ACCESS — `activePracticeFor` honours it only when the email
 * is already a member, so a tampered cookie picks among practices the user already has and
 * nothing else. Membership remains the grant; the cookie is only a preference.
 *
 * Redirects to onboarding when the email belongs to no practice, which is what every caller did
 * by hand before.
 */
export async function requirePractice(): Promise<{ email: string; record: PracticeRecord }> {
  const email = await requireSession();
  const jar = await cookies();
  const record = activePracticeFor(email, jar.get(PRACTICE_COOKIE)?.value ?? null);
  if (!record) redirect("/console/onboarding");
  return { email, record };
}

/**
 * Like `requirePractice`, but tolerates having none yet.
 *
 * The setup wizard's first step is where a practice comes into existence, so it is the one
 * surface that must render before one exists. Everything after that step redirects itself.
 */
export async function requirePracticeOptional(): Promise<{ email: string; record: PracticeRecord | null }> {
  const email = await requireSession();
  const jar = await cookies();
  return { email, record: activePracticeFor(email, jar.get(PRACTICE_COOKIE)?.value ?? null) };
}
