// Every care area on a real profile rests on the clinician's own words (2026-10-01): each careEvidence
// quote must be found in what they say about themselves, the visible profile or their page's sections.
import { describe, expect, it } from "vitest";
import { clinicians } from "./clinicians";

const norm = (t: string) => t.toLowerCase().replace(/[‘’']/g, "'").replace(/[‐-―-]/g, "-").replace(/[^a-z0-9'%$&+-]+/g, " ").trim();

describe("care evidence is the clinician's own words", () => {
  it("finds every evidence quote in their own profile text", () => {
    const ungrounded: string[] = [];
    for (const c of clinicians.filter((x) => x.realPerson)) {
      const own = norm([c.focus, c.matchLine, c.summary, c.about, ...c.experience, ...c.fitSignals, ...c.practicalSignals, c.reach, c.title, ...Object.values(c.profileDetail?.sections ?? {}).flat()].join(" \n "));
      for (const [area, quote] of Object.entries(c.careEvidence ?? {})) {
        if (!quote) continue;
        // A quote may join fragments from two sentences with "; ": each fragment must be theirs.
        for (const fragment of quote.split(/\s*;\s*/).filter(Boolean)) if (!own.includes(norm(fragment).slice(0, 60))) ungrounded.push(`${c.id} ${area}: "${fragment.slice(0, 80)}"`);
      }
    }
    expect(ungrounded).toEqual([]);
  });
  it("declares no care area without a quote behind it, on profiles brought over with their own words", () => {
    const unquoted: string[] = [];
    for (const c of clinicians.filter((x) => x.profileDetail)) {
      for (const area of [...c.careAreas, ...(c.careAreasSometimes ?? [])]) if (!c.careEvidence?.[area]) unquoted.push(`${c.id} ${area}`);
    }
    expect(unquoted).toEqual([]);
  });
});
