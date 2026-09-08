// Medication experience (PRD §47): three things a person can describe about medication — what it
// seems to change, what it leaves untouched, anything unwanted — to take to whoever manages it.
// The app describes; it never advises: no dose, no timing, no "try", no verdict. The note lives on
// the device and leaves it only as text the person copies.

import type { MedicationField, ModelRecord } from "./store";

export interface MedicationFieldSpec {
  readonly id: MedicationField;
  readonly title: string;
  readonly prompt: string;
  readonly placeholder: string;
}

export const MEDICATION_FIELDS: readonly MedicationFieldSpec[] = [
  { id: "changes", title: "What it seems to change", prompt: "What is different on the days it is working — in your words, with an example if you have one.", placeholder: "Starting the first task is easier before lunch. The 3pm slump is smaller." },
  { id: "untouched", title: "What it leaves untouched", prompt: "The difficulties that are the same with or without it.", placeholder: "Remembering things people say. Evenings. Getting out the door." },
  { id: "unwanted", title: "Anything unwanted", prompt: "What you would rather it did not do, and when.", placeholder: "Not hungry until 4pm. Hard to fall asleep on the days it is taken late." },
];

/** The note as plain text for whoever manages the medication. Only the person's own words. */
export function medicationText(record: ModelRecord): string {
  const parts: string[] = [];
  for (const f of MEDICATION_FIELDS) {
    const text = record.medication[f.id].trim();
    if (text) parts.push(`${f.title}\n${text}`);
  }
  return parts.join("\n\n");
}
