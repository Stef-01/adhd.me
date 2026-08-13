"use server";

// W22: demo environment — one action resets every mock store to the scripted world
// and seats the presenter as the demo practice owner. Idempotent: launching again
// mid-demo returns everything to the start of the script.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, signSession } from "@/console/session";
import { onboardPractice } from "@/console/store";
import { resetAllStores } from "@/lib/stores";
import { assertDemoEnabled } from "@/lib/demo-guard";

const DEMO_EMAIL = "presenter@demo.practice.example";

export async function launchDemo(): Promise<void> {
  assertDemoEnabled(); // W37: fails closed in production unless explicitly opted in
  // Every store, from the registry — not a hand-maintained list that drifts (W51 audit).
  resetAllStores();
  const errors = onboardPractice(
    { name: "Demo Family Practice", timezone: "Australia/Sydney", holdoutPercent: 20 },
    new Date().toISOString(),
    DEMO_EMAIL,
  );
  if (Object.keys(errors).length > 0) throw new Error("demo seed failed onboarding validation");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signSession(DEMO_EMAIL), { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/console");
}
