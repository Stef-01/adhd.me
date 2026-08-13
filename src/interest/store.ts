import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { neutraliseSpreadsheetFormula } from "@/security/untrusted";
import type { InterestReason, InterestSignup } from "./types";

function defaultStorePath(): string {
  const configured = process.env.CAREYIELD_INTEREST_PATH?.trim();
  return configured || path.join(process.cwd(), ".data", "interest-signups.jsonl");
}

function readRows(filePath: string): InterestSignup[] {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, "utf8")
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as InterestSignup];
      } catch {
        return [];
      }
    });
}

export function saveInterestSignup(
  input: { name: string; email: string; interests: InterestReason[] },
  options: { filePath?: string; now?: Date } = {},
): { created: boolean; signup: InterestSignup } {
  const filePath = options.filePath ?? defaultStorePath();
  const email = input.email.trim().toLowerCase();
  const existing = readRows(filePath).find((signup) => signup.email === email);
  if (existing) return { created: false, signup: existing };

  const createdAt = (options.now ?? new Date()).toISOString();
  const signup: InterestSignup = {
    id: randomUUID(),
    name: input.name.trim(),
    email,
    interests: [...new Set(input.interests)],
    consentedAt: createdAt,
    createdAt,
    source: "western-sydney-community-landing",
  };

  mkdirSync(path.dirname(filePath), { recursive: true });
  appendFileSync(filePath, `${JSON.stringify(signup)}\n`, { encoding: "utf8", mode: 0o600 });
  return { created: true, signup };
}

export function listInterestSignups(options: { filePath?: string } = {}): InterestSignup[] {
  return readRows(options.filePath ?? defaultStorePath())
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

/**
 * One CSV cell.
 *
 * W153 finding: quoting alone made this file safe to PARSE and left it unsafe to OPEN. A signup
 * name of `=HYPERLINK("http://evil.invalid","Payroll")` is a valid quoted cell and an executable
 * formula the moment an operator double-clicks the download — the export is served to Meherr
 * staff from `/api/interest/export`, and the text in it was typed by anyone on the internet.
 *
 * Neutralising happens HERE, to every cell, rather than to the fields somebody judged risky. The
 * name is the obvious one today; the next column added would not be, and a guard that covers what
 * was remembered is the failure this tree keeps finding.
 */
function csvCell(value: string): string {
  return `"${neutraliseSpreadsheetFormula(value).replaceAll('"', '""')}"`;
}

export function interestSignupsCsv(options: { filePath?: string } = {}): string {
  const rows = listInterestSignups(options);
  const header = ["created_at", "name", "email", "interests", "source"];
  return [
    header.map(csvCell).join(","),
    ...rows.map((signup) => [
      signup.createdAt,
      signup.name,
      signup.email,
      signup.interests.join(" | "),
      signup.source,
    ].map(csvCell).join(",")),
  ].join("\n");
}

/** Rewrite the whole file. Used only by the erasure/retention paths below. */
function writeAll(rows: readonly InterestSignup[], options: { filePath?: string }): void {
  const filePath = options.filePath ?? defaultStorePath();
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, rows.map((r) => `${JSON.stringify(r)}\n`).join(""), {
    encoding: "utf8",
    mode: 0o600,
  });
}

/**
 * W106: the community interest register under APP 12 and APP 11.
 *
 * This register holds contact details for people who are NOT patients of a subscribing
 * practice, which the Y2 gate dossier flagged as a different collection to everything else in
 * the tree. Different collection, same rights: someone who signed up can ask what is held
 * and can ask for it to be removed, and neither is served by the rail-based flows because
 * this store is file-backed and keyed by email rather than patient id.
 */
export function interestSignupsFor(email: string, options: { filePath?: string } = {}): InterestSignup[] {
  const wanted = email.trim().toLowerCase();
  if (wanted === "") return [];
  return listInterestSignups(options).filter((row) => row.email.trim().toLowerCase() === wanted);
}

/** Remove every signup for an email. Returns how many rows went. */
export function eraseInterestSignups(email: string, options: { filePath?: string } = {}): number {
  const wanted = email.trim().toLowerCase();
  if (wanted === "") return 0;
  const rows = listInterestSignups(options);
  const kept = rows.filter((row) => row.email.trim().toLowerCase() !== wanted);
  if (kept.length === rows.length) return 0;
  writeAll(kept, options);
  return rows.length - kept.length;
}

/**
 * Prune signups older than `retentionDays` (APP 11).
 *
 * Consent to be contacted about a service is not consent to be held indefinitely, and this
 * register has no practice relationship to justify a long tail.
 */
export function pruneInterestSignups(
  retentionDays: number,
  nowIso: string,
  options: { filePath?: string } = {},
): number {
  const rows = listInterestSignups(options);
  const cutoff = new Date(`${nowIso.slice(0, 10)}T00:00:00Z`).getTime() - retentionDays * 86_400_000;
  const kept = rows.filter((row) => {
    const at = Date.parse(row.createdAt);
    // An unreadable date is KEPT, not pruned: deleting a record because its timestamp is
    // malformed would be losing data to a parsing bug.
    return Number.isNaN(at) || at >= cutoff;
  });
  if (kept.length === rows.length) return 0;
  writeAll(kept, options);
  return rows.length - kept.length;
}
