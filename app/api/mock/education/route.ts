// W151: education seed + introspection for the Playwright e2e (synthetic only, same posture as
// the other /api/mock routes — removed when real persistence lands).
//
// The seed deliberately contains three things the page must handle rather than one: an item for
// a register the practice runs, an item for one it does NOT (which must appear as named
// out-of-scope rather than vanish), and a CPD entry belonging to a COLLEAGUE, which must not
// reach the signed-in clinician's record.

import { NextResponse, type NextRequest } from "next/server";
import { getConsole } from "@/console/store";
import { recordCpdEntry, type CpdEntry } from "@/education/cpd";
import type { EducationItem } from "@/education/curation";
import {
  addCpdEntries,
  addLibraryItems,
  addSignedOffContent,
  getLibrary,
  resetEducation,
} from "@/education/store";
import { draft, review, signOff, submitForReview, usableContent } from "@/registers/authoring";
import { assertMockRoutesEnabled } from "@/lib/mock-guard";
import { setRegisterEnabled } from "@/registers/store";
import type { ClinicianId, ConditionCode } from "@/domain/types";

export const dynamic = "force-dynamic";

const ITEMS: EducationItem[] = [
  {
    itemId: "item-a1",
    conditionCode: "placeholder_register_a",
    title: "Placeholder material A1 — fixture only.",
    sourceRef: "signed-off-source-a1",
    relevantFactCodes: [],
  },
  {
    itemId: "item-a2",
    conditionCode: "placeholder_register_a",
    title: "Placeholder material A2 — fixture only.",
    sourceRef: "signed-off-source-a2",
    relevantFactCodes: [],
  },
  {
    itemId: "item-b1",
    conditionCode: "placeholder_register_b",
    title: "Placeholder material B1 — fixture only.",
    // W154: deliberately cites content that was never signed off, so the page is exercised on
    // the case that matters — material which LOOKS sourced. The seed would otherwise only ever
    // show the happy path.
    sourceRef: "never-signed-off",
    relevantFactCodes: [],
  },
];

function cpd(entryId: string, practiceId: string, clinicianId: string, at: string, itemId: string): CpdEntry {
  const result = recordCpdEntry(
    {
      entryId, practiceId, clinicianId, kind: "opened", itemId,
      sourceRef: `signed-off-source-${itemId.replace("item-", "")}`,
      itemTitle: `Placeholder material ${itemId.replace("item-", "").toUpperCase()} — fixture only.`,
      at,
    },
    [],
  );
  if (!result.ok) throw new Error(result.errors.join(", "));
  return result.entry;
}

/**
 * W154: synthetic content driven through W69's REAL sign-off workflow.
 *
 * The seed used to give items refs like "signed-off-source-a1" — strings pointing at nothing,
 * which the console then rendered as though they were provenance. That is the exact failure
 * W152 exists to prevent, so the mock now has to actually sign something off: `usableContent`
 * is the only way to obtain the branded value `addSignedOffContent` requires, and it returns
 * null for anything unsigned.
 */
function seedSignedOffSources(ids: readonly string[]): void {
  const approved = ids.map((id) => {
    let record = draft(
      {
        id,
        conditionCode: "placeholder_register_a" as ConditionCode,
        kind: "condition_description",
        body: `Placeholder signed-off body for ${id} — fixture only.`,
      },
      "author@demo.practice.example",
      "2026-03-01T00:00:00Z",
    );
    for (const step of [
      () => submitForReview(record, "author@demo.practice.example", "2026-03-02T00:00:00Z"),
      () => review(record, "specialist@demo.practice.example", "2026-03-03T00:00:00Z"),
      () => signOff(record, "founder@demo.practice.example", "2026-03-04T00:00:00Z"),
    ]) {
      const result = step();
      if (!result.ok) throw new Error(`education seed could not sign off ${id}: ${result.error}`);
      record = result.record;
    }
    const usable = usableContent(record);
    if (!usable) throw new Error(`education seed produced no usable content for ${id}`);
    return usable;
  });
  addSignedOffContent(approved);
}

export async function GET() {
  assertMockRoutesEnabled();
  return NextResponse.json({ library: getLibrary() });
}

export async function POST(request: NextRequest) {
  assertMockRoutesEnabled();
  resetEducation();
  const console_ = getConsole();
  // W166: a mock route acts for the seeded practice — the first one, deterministically.
  const record = console_.practices[0];
  const email = request.nextUrl.searchParams.get("linkEmail");

  if (record!.clinicians.length < 2) {
    record!.clinicians.length = 0;
    record!.clinicians.push(
      { id: "clin-1" as ClinicianId, displayName: "Dr Demo One", participating: true, email: null },
      { id: "clin-2" as ClinicianId, displayName: "Dr Demo Two", participating: true, email: null },
    );
  }
  const mine = record!.clinicians[0];
  if (mine && email) mine.email = email;

  if (request.nextUrl.searchParams.get("empty") === "1") {
    return NextResponse.json({ library: getLibrary() });
  }

  // Register B is switched off for this practice, so its material is out of scope — a statement
  // about the PRACTICE, which the page names rather than hides (W145).
  const practiceId = record!.practice.id;
  if (practiceId) setRegisterEnabled(practiceId, "placeholder_register_b" as ConditionCode, false);

  // Sign off the sources a1/a2 cite, before the items that cite them. item-b1's ref is
  // deliberately left unbacked.
  seedSignedOffSources(["signed-off-source-a1", "signed-off-source-a2"]);
  addLibraryItems(ITEMS);

  // W154: an IN-SCOPE item whose source was never signed off, so the console's provenance
  // withholding is exercised. Opt-in, so the existing seed keeps its happy-path shape.
  if (request.nextUrl.searchParams.get("unbacked") === "1") {
    addLibraryItems([
      {
        itemId: "item-a3",
        conditionCode: "placeholder_register_a",
        title: "Placeholder material A3 — cites content that is not signed off.",
        sourceRef: "withdrawn-or-wrong",
        relevantFactCodes: [],
      },
    ]);
  }

  if (mine) {
    const own = cpd("cpd-1", record!.practice.id, mine.id, "2026-03-01", "item-a1");
    const correctable = cpd("cpd-2", record!.practice.id, mine.id, "2026-03-02", "item-a2");
    const correction = recordCpdEntry(
      {
        entryId: "cpd-3", practiceId: record!.practice.id, clinicianId: mine.id, kind: "corrected", itemId: "item-a2",
        sourceRef: "signed-off-source-a2", itemTitle: correctable.itemTitle, at: "2026-03-04",
        correctsEntryId: "cpd-2", note: "Opened by accident on a shared screen.",
      },
      [correctable],
    );
    const entries = [own, correctable];
    if (correction.ok) entries.push(correction.entry);
    // A colleague's entry, which must never reach the signed-in clinician's record.
    const other = record!.clinicians[1];
    if (other) entries.push(cpd("cpd-colleague", record!.practice.id, other.id, "2026-03-03", "item-a1"));
    addCpdEntries(entries);
  }

  return NextResponse.json({ library: getLibrary(), clinicians: record!.clinicians });
}
