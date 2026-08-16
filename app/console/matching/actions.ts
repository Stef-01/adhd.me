"use server";

// W227: saving a review from the console.
//
// A SERVER ACTION RATHER THAN A ROUTE, for the same reason the clinician application uses one: the
// write happens on the server, the client never holds a file path, and the validation that refuses
// an accepted facet naming nobody runs in `saveBackground` where every caller meets it — not here,
// where only this caller would.
//
// STAFF-ONLY IS NOT ENFORCED HERE YET AND THAT IS STATED RATHER THAN ASSUMED. Every /console route
// is staff-facing by classification, and W105's lesson from the interest register is that a
// conditional render satisfies the eye and not the wire. This action writes to a drafts file that
// no public surface reads and that cannot publish anything, so the exposure is bounded — but when
// the console gets a real session gate, this action needs the same one, and it will not get it by
// being inside a page that has it.

import { revalidatePath } from "next/cache";
import { saveBackground } from "@/onboarding/background-store";
import type { ClinicianBackground } from "@/onboarding/background";

export type SaveState = { status: "idle" | "saved" | "error"; message: string };

export async function saveReview(
  background: ClinicianBackground,
  reviewer: string,
): Promise<SaveState> {
  try {
    const row = saveBackground(background, reviewer);
    revalidatePath("/console/matching");
    const accepted = row.facets.filter((facet) => facet.status === "accepted").length;
    return {
      status: "saved",
      message: row.readBackConfirmed
        ? `Saved. ${accepted} accepted and read back — ready for the gate.`
        : `Saved as a draft. ${accepted} accepted, not yet read back to the clinician.`,
    };
  } catch (error) {
    // The refusal from the writer is worth showing verbatim: it names which facets have nobody
    // against them, which is exactly what the reviewer has to go and fix.
    return { status: "error", message: error instanceof Error ? error.message : "Could not save." };
  }
}
