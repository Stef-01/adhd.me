// W213: storage and validation for clinician applications.
//
// Mirrors src/interest/store.ts deliberately rather than inventing a second pattern: append-only
// JSONL, one row per application, keyed on the registration number so a resubmission updates
// nothing and creates nothing. Two applications from the same GP is a person applying twice, not
// two clinicians, and silently keeping both would put a duplicate in front of whoever reviews.
//
// SPREADSHEET NEUTRALISATION IS NOT OPTIONAL HERE. W153 found that quoting every CSV cell makes a
// file safe to PARSE and leaves it unsafe to OPEN: a name of `=HYPERLINK(...)` is a valid quoted
// cell and an executable formula the moment staff double-click the export. Applications are
// exactly the kind of list somebody exports to a spreadsheet to work through, so the same
// neutralisation runs at the writer.

import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { neutraliseSpreadsheetFormula } from "@/security/untrusted";
import type { CareArea } from "@/demo/care-archetypes";
import { EI_QUALITY_KEYS, type EIQuality } from "@/demo/emotional-fit";
import { CARE_AREA_LABELS, OFFERED_LANGUAGES, type ClinicianApplication } from "./types";

function defaultStorePath(): string {
  const configured = process.env.ADHDME_CLINICIAN_PATH?.trim();
  return configured || path.join(process.cwd(), ".data", "clinician-applications.jsonl");
}

function readRows(filePath: string): ClinicianApplication[] {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, "utf8")
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as ClinicianApplication];
      } catch {
        return [];
      }
    });
}

/**
 * Ahpra registration numbers are three letters and ten digits, e.g. MED0001234567.
 *
 * Shape only. This says the field looks like a registration number, NOT that it is one or that it
 * belongs to the person submitting it, and nothing downstream may read it as more than that.
 */
export const AHPRA_SHAPE = /^[A-Z]{3}\d{10}$/;

export interface ApplicationInput {
  fullName: string;
  ahpraRegistrationNumber: string;
  email: string;
  practiceSuburb: string;
  practiceName: string;
  careAreas: string[];
  manner: string[];
  languages: string[];
  /**
   * Free-text languages the checkbox list does not offer. Declared by the clinician and checked by
   * nobody, like the listed ones — the offered set is a convenience, not the limit of who a GP can
   * speak to. Sanitised to letter-only names (see `sanitiseOtherLanguages`) rather than validated
   * against a vocabulary, because the whole point of the box is a language we did not think to list.
   */
  otherLanguages?: string;
  nswAdhdTrained: boolean;
  acceptingNewPatients: boolean;
}

/** Split the free-text "other languages" box into clean, letter-only names. Caps count and length. */
function sanitiseOtherLanguages(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((name) => name.replace(/[^\p{L}\s'-]/gu, "").replace(/\s+/g, " ").trim())
    .filter((name) => name.length >= 2 && name.length <= 30)
    .map((name) => neutraliseSpreadsheetFormula(name))
    .slice(0, 5);
}

export type ApplicationFieldError = keyof Omit<ApplicationInput, "nswAdhdTrained" | "acceptingNewPatients">;

const VALID_MANNER = new Set<string>(EI_QUALITY_KEYS);
const VALID_AREAS = new Set<string>(CARE_AREA_LABELS.map((a) => a.id));
const VALID_LANGUAGES = new Set<string>(OFFERED_LANGUAGES);

/**
 * Validate, returning every problem at once.
 *
 * All errors together rather than the first: a form that reveals one mistake per submission is a
 * form somebody abandons, and this one is long.
 */
export function validateApplication(
  input: ApplicationInput,
): Partial<Record<ApplicationFieldError, string>> {
  const errors: Partial<Record<ApplicationFieldError, string>> = {};

  if (input.fullName.trim().length < 2) errors.fullName = "Please give your full name.";
  if (!AHPRA_SHAPE.test(input.ahpraRegistrationNumber.trim().toUpperCase())) {
    errors.ahpraRegistrationNumber = "That does not look like an Ahpra number. They are three letters and ten digits, like MED0001234567.";
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email.trim())) errors.email = "Please give an email we can reply to.";
  if (input.practiceSuburb.trim().length < 2) errors.practiceSuburb = "Which suburb is the practice in?";
  if (input.practiceName.trim().length < 2) errors.practiceName = "What is the practice called?";

  // An area outside the vocabulary cannot be matched on, so accepting it would create a listing
  // that silently never appears in a result.
  const areas = input.careAreas.filter((a) => VALID_AREAS.has(a));
  if (areas.length === 0) errors.careAreas = "Choose at least one area you see often.";
  /* At least one way of working, because a clinician who declares none is invisible to every
     patient who asks about manner rather than about scope — which the finder probe found is about
     half of them. This is a floor on the GP's own findability, not a hoop. */
  if (input.manner.filter((m) => VALID_MANNER.has(m)).length === 0) {
    errors.manner = "Choose at least one that describes how you work.";
  }
  else if (!areas.includes("adhd-assessment")) {
    errors.careAreas = "Diagnostic assessment is the anchor every listing holds, so please include it.";
  }

  if (input.languages.some((l) => !VALID_LANGUAGES.has(l))) {
    errors.languages = "Choose from the languages listed.";
  }

  return errors;
}

export function saveApplication(
  input: ApplicationInput,
  options: { filePath?: string; now?: Date } = {},
): { created: boolean; application: ClinicianApplication } {
  const filePath = options.filePath ?? defaultStorePath();
  const ahpra = input.ahpraRegistrationNumber.trim().toUpperCase();

  const existing = readRows(filePath).find((a) => a.ahpraRegistrationNumber === ahpra);
  if (existing) return { created: false, application: existing };

  const application: ClinicianApplication = {
    id: randomUUID(),
    fullName: neutraliseSpreadsheetFormula(input.fullName.trim()),
    ahpraRegistrationNumber: ahpra,
    email: neutraliseSpreadsheetFormula(input.email.trim().toLowerCase()),
    practiceSuburb: neutraliseSpreadsheetFormula(input.practiceSuburb.trim()),
    practiceName: neutraliseSpreadsheetFormula(input.practiceName.trim()),
    careAreas: [...new Set(input.careAreas.filter((a) => VALID_AREAS.has(a)))] as CareArea[],
    /* Filtered against the closed vocabulary like `careAreas`, so a submission cannot declare a
       way of working the finder has no facet for — an application for a field that does not
       exist is how the field eventually gets built. */
    manner: [...new Set(input.manner.filter((m) => VALID_MANNER.has(m)))] as EIQuality[],
    languages: [...new Set([
      ...input.languages.filter((l) => VALID_LANGUAGES.has(l)),
      ...sanitiseOtherLanguages(input.otherLanguages),
    ])],
    nswAdhdTrained: input.nswAdhdTrained,
    acceptingNewPatients: input.acceptingNewPatients,
    submittedAt: (options.now ?? new Date()).toISOString(),
    // The only status there is. See the note on the type.
    status: "received",
  };

  mkdirSync(path.dirname(filePath), { recursive: true });
  appendFileSync(filePath, `${JSON.stringify(application)}\n`, "utf8");
  return { created: true, application };
}

export function listApplications(filePath = defaultStorePath()): ClinicianApplication[] {
  return readRows(filePath);
}
