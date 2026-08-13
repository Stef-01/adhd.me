import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  eraseInterestSignups,
  interestSignupsCsv,
  interestSignupsFor,
  listInterestSignups,
  pruneInterestSignups,
  saveInterestSignup,
} from "./store";
import type { InterestSignup } from "./types";

const dirs: string[] = [];

function tempFile(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "careyield-interest-"));
  dirs.push(dir);
  return path.join(dir, "signups.jsonl");
}

afterEach(() => {
  while (dirs.length > 0) rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe("community interest store", () => {
  it("stores a consented signup as retrievable JSONL", () => {
    const filePath = tempFile();
    const result = saveInterestSignup({
      name: "  Asha Rao  ",
      email: " ASHA@example.com ",
      interests: ["I want to learn more about PMOS"],
    }, { filePath, now: new Date("2026-08-10T00:00:00.000Z") });

    expect(result.created).toBe(true);
    expect(result.signup).toMatchObject({ name: "Asha Rao", email: "asha@example.com" });
    expect(JSON.parse(readFileSync(filePath, "utf8"))).toMatchObject({ consentedAt: "2026-08-10T00:00:00.000Z" });
    expect(listInterestSignups({ filePath })).toHaveLength(1);
  });

  it("does not inflate demand with duplicate emails", () => {
    const filePath = tempFile();
    const input = { name: "Asha Rao", email: "asha@example.com", interests: ["I’m a clinician" as const] };
    expect(saveInterestSignup(input, { filePath }).created).toBe(true);
    expect(saveInterestSignup({ ...input, email: "ASHA@example.com" }, { filePath }).created).toBe(false);
    expect(listInterestSignups({ filePath })).toHaveLength(1);
  });

  it("exports a spreadsheet-ready CSV", () => {
    const filePath = tempFile();
    saveInterestSignup({
      name: "Narayani",
      email: "narayani@example.com",
      interests: ["I want to learn more about PMOS", "I want to bring a session to my community"],
    }, { filePath, now: new Date("2026-08-10T01:00:00.000Z") });
    const csv = interestSignupsCsv({ filePath });
    expect(csv).toContain('"created_at","name","email","interests","source"');
    expect(csv).toContain("I want to learn more about PMOS | I want to bring a session to my community");
  });

  it("W153: a signup name cannot become a formula in the operator's spreadsheet", () => {
    // The export is served to Meherr staff and the text in it was typed by anyone on the
    // internet. Quoting made the file safe to PARSE; it was still executable on open.
    const filePath = tempFile();
    saveInterestSignup({
      name: '=HYPERLINK("http://evil.invalid","Payroll")',
      email: "formula@example.com",
      interests: ["I want to learn more about PMOS"],
    }, { filePath, now: new Date("2026-08-10T01:00:00.000Z") });
    const csv = interestSignupsCsv({ filePath });
    expect(csv).toContain(`"'=HYPERLINK(""http://evil.invalid"",""Payroll"")"`);
    // No cell begins a formula. Checked over EVERY cell rather than the one this test seeded,
    // because a guard that covers the field somebody remembered is the bug being fixed.
    for (const cell of csv.split("\n").flatMap((line) => line.split('","'))) {
      expect(cell.replace(/^"/, "")[0] ?? "", cell).not.toMatch(/[=+\-@]/);
    }
  });
});

describe("W106 access and retention for the interest register", () => {
  // This register holds contact details for people who are NOT patients of a subscribing
  // practice. Different collection to everything else in the tree, same rights.
  const tmp = tempFile;

  const REASON: InterestSignup["interests"][number] = "I want to learn more about PMOS";
  const save = (filePath: string, email: string, now: string) =>
    saveInterestSignup({ name: "Test Person", email, interests: [REASON] }, { filePath, now: new Date(now) });

  it("an access request returns exactly that person's rows", () => {
    const filePath = tmp();
    save(filePath, "a@example.test", "2026-01-01T00:00:00Z");
    save(filePath, "b@example.test", "2026-01-02T00:00:00Z");
    expect(interestSignupsFor("a@example.test", { filePath }).map((r) => r.email)).toEqual(["a@example.test"]);
    // Case and whitespace must not become a way to miss someone's record.
    expect(interestSignupsFor("  A@Example.Test ", { filePath })).toHaveLength(1);
    expect(interestSignupsFor("nobody@example.test", { filePath })).toEqual([]);
  });

  it("erasure removes that person and leaves everyone else", () => {
    const filePath = tmp();
    save(filePath, "a@example.test", "2026-01-01T00:00:00Z");
    save(filePath, "b@example.test", "2026-01-02T00:00:00Z");
    expect(eraseInterestSignups("a@example.test", { filePath })).toBe(1);
    expect(listInterestSignups({ filePath }).map((r) => r.email)).toEqual(["b@example.test"]);
    // The identifier must be gone from the file, not merely filtered on read.
    expect(readFileSync(filePath, "utf8")).not.toContain("a@example.test");
    expect(eraseInterestSignups("a@example.test", { filePath })).toBe(0);
  });

  it("an empty identifier erases nothing", () => {
    const filePath = tmp();
    save(filePath, "a@example.test", "2026-01-01T00:00:00Z");
    expect(eraseInterestSignups("   ", { filePath })).toBe(0);
    expect(listInterestSignups({ filePath })).toHaveLength(1);
  });

  it("retention prunes signups past the window and keeps the rest", () => {
    const filePath = tmp();
    save(filePath, "old@example.test", "2025-01-01T00:00:00Z");
    save(filePath, "new@example.test", "2026-08-01T00:00:00Z");
    expect(pruneInterestSignups(365, "2026-08-10", { filePath })).toBe(1);
    expect(listInterestSignups({ filePath }).map((r) => r.email)).toEqual(["new@example.test"]);
  });

  it("keeps a row whose date is unreadable rather than losing data to a parsing bug", () => {
    const filePath = tmp();
    save(filePath, "x@example.test", "2026-01-01T00:00:00Z");
    // Corrupt the stored date to simulate a malformed row.
    writeFileSync(filePath, readFileSync(filePath, "utf8").replace(/"createdAt":"[^"]*"/, '"createdAt":"whenever"'));
    expect(pruneInterestSignups(1, "2026-08-10", { filePath })).toBe(0);
    expect(listInterestSignups({ filePath })).toHaveLength(1);
  });
});
