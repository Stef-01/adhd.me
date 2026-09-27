import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { lintLandingCopy } from "@/compliance/landing";
import { CRISIS_CONTACTS, SCHEME_FOR, URGENT_ROWS, contact } from "./crisis-contacts";
import { SAFETY_RULES, URGENT_SERVICES } from "./safety";

const ROOT = path.resolve(__dirname, "..", "..");

function pageSources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return pageSources(full);
    return /\.tsx?$/.test(full) ? [full] : [];
  });
}

/**
 * A registry number written out, with or without its spaces: "13 11 14", "131114", "tel:000".
 * Not "#000", "1,000" or "30_000", which are a colour and figures, not a number to call.
 */
function written(said: string): RegExp {
  const digits = said.split(/\s+/).join("\\s?");
  return new RegExp(`(?<![\\w#.,])${digits}(?!\\w)`);
}

describe("crisis contacts", () => {
  it("each link opens the way its row says: a call dials, a text opens messages, a chat opens a page", () => {
    for (const c of eachOf(CRISIS_CONTACTS, "the contacts")) {
      expect(c.href.startsWith(SCHEME_FOR[c.method]), c.id).toBe(true);
      if (c.method === "call") expect(c.href, c.id).toBe(`tel:${c.said.replace(/\s/g, "")}`);
      if (c.method === "text") expect(c.href, c.id).toBe(`sms:${c.said.replace(/\s/g, "")}`);
    }
  });

  it("each one names the official page it was checked against, and the day", () => {
    for (const c of eachOf(CRISIS_CONTACTS, "the contacts")) {
      expect(c.source, c.id).toMatch(/^https:\/\//);
      expect(c.verifiedOn, c.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(c.verifiedOn)), c.id).toBe(false);
    }
  });

  it("the ids are unique and the when line is three words at most", () => {
    expect(new Set(CRISIS_CONTACTS.map((c) => c.id)).size).toBe(CRISIS_CONTACTS.length);
    for (const c of eachOf(CRISIS_CONTACTS, "the contacts")) {
      expect(c.when.split(/\s+/).length, c.id).toBeLessThanOrEqual(3);
    }
  });

  it("a person who cannot speak has a way in, to 000 and to a crisis line", () => {
    const rows = URGENT_ROWS.map(contact);
    expect(rows.some((c) => c.method === "relay" && c.when.includes("000"))).toBe(true);
    expect(rows.some((c) => c.method === "text")).toBe(true);
    expect(rows.some((c) => c.method === "chat")).toBe(true);
    expect(URGENT_SERVICES.map((s) => s.id)).toEqual([...URGENT_ROWS]);
  });

  it("every word on the Urgent rows answers to the patient rules", () => {
    for (const c of eachOf(URGENT_SERVICES, "the urgent rows")) {
      expect(lintLandingCopy(`${c.service}. ${c.when}.`), c.id).toEqual([]);
    }
  });

  it("every number a safety message quotes comes from the registry", () => {
    const numbers = [...new Set(CRISIS_CONTACTS.map((c) => c.said).filter((s) => /\d/.test(s)))].sort((a, b) => b.length - a.length);
    for (const rule of eachOf(SAFETY_RULES, "the safety rules")) {
      let rest = rule.recommendedAction.replace(/1800RESPECT/g, "");
      for (const n of numbers) rest = rest.split(n).join("");
      expect(rest, rule.id).not.toMatch(/\d/);
    }
  });

  it("no page writes a crisis number itself; each one comes from the registry", () => {
    const files = pageSources(path.join(ROOT, "app"));
    const rel = files.map((f) => path.relative(ROOT, f).split(path.sep).join("/"));
    // The scan reaches the pages that quote a number, so it cannot pass by finding nothing.
    expect(rel).toContain("app/terms/page.tsx");
    expect(rel).toContain("app/(app)/urgent/page.tsx");
    const numbers = CRISIS_CONTACTS.filter((c) => /\d/.test(c.said));
    expect(written("000").test("If you are in danger, call 000.")).toBe(true);
    expect(written("13 11 14").test('href="tel:131114"')).toBe(true);
    expect(written("000").test('fill="#000"')).toBe(false);
    for (const [i, file] of files.entries()) {
      const text = readFileSync(file, "utf8");
      for (const c of numbers) expect(written(c.said).test(text), `${rel[i]} writes ${c.said}`).toBe(false);
    }
  });

  it("a safety message that names Lifeline also gives its text line", () => {
    const lifeline = SAFETY_RULES.filter((r) => r.recommendedAction.includes(contact("lifeline").said));
    expect(lifeline.length).toBeGreaterThan(0);
    for (const rule of eachOf(lifeline, "the rules naming Lifeline")) {
      expect(rule.recommendedAction, rule.id).toContain(`text ${contact("lifeline-text").said}`);
    }
  });
});
