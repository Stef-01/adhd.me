import { describe, expect, it } from "vitest";
import { backgroundFromProposals, clinicianTags, matchAudit, professionalBio } from "./background";
import { readTranscript } from "./transcript";
import { clinicians, needsFor, rankClinicians, scoreAgainst } from "@/demo/clinicians";


const bg = (statuses: Array<"proposed" | "accepted" | "rejected">) => {
  const b = backgroundFromProposals("x", "Dr Example", readTranscript([
    { speaker: "clinician", text: "I do titration and I book a longer first appointment." },
  ]).proposed, []);
  b.facets.forEach((f, i) => { f.status = statuses[i] ?? "proposed"; });
  return b;
};

describe("W221 the bio is assembled, never typed", () => {
  it("says nothing at all until a human has accepted something", () => {
    // A proposal is a machine reading a sentence. An empty profile is honest; a padded one is a
    // claim, and the review step is the only thing standing between the two.
    expect(professionalBio(bg(["proposed", "proposed"]))).toBe("");
  });

  it("includes only accepted facets, never proposed or rejected ones", () => {
    const b = bg(["accepted", "rejected"]);
    const bio = professionalBio(b);
    expect(bio).toContain(b.facets[0]!.label.toLowerCase());
    expect(bio).not.toContain(b.facets[1]!.label.toLowerCase());
  });

  /**
   * W193: a declaration must be RENDERED as one. "Dr X sees adults" is this product vouching for a
   * clinician it has never checked; "Dr X says they often see adults" is reporting them.
   */
  it("renders every claim as the clinician's own", () => {
    const bio = professionalBio(bg(["accepted", "accepted"]));
    // Attribution, not a fixed wording: "says they see often" and "describe themselves as" both
    // put the claim in the clinician's mouth, which is the property. The exact phrasing changed
    // once already, when "says they often see baseline physical screening" turned out not to be a
    // sentence — half the vocabulary names a procedure rather than a group of people.
    expect(bio).toMatch(/say(s)? they|describe themselves/i);
    expect(bio).not.toMatch(/\bis an? (?:expert|specialist)\b/i);
  });

  it("carries no rating, score, comparison or specialty claim", () => {
    const bio = professionalBio(bg(["accepted", "accepted"]));
    expect(bio).not.toMatch(/specialist|best|leading|top|rated|score|\d\s*\/\s*5|years of experience/i);
  });
});

describe("W221 the audit reports the match, it does not recompute it", () => {
  /**
   * THE PROPERTY THAT MAKES A METRICS PANEL WORTH HAVING. If this file did its own arithmetic it
   * would eventually disagree with the ranking, and a panel that disagrees with the product is
   * worse than no panel — somebody would trust it while debugging.
   */
  it.each([
    "my dose wears off and I want a longer first appointment",
    "I think I might have ADHD",
    "she rushes me and my family think it is an excuse",
    "help",
  ])("totals agree with the ranker for: %s", (query) => {
    const audit = matchAudit(query, clinicians);
    // The needs the ranker actually scores - discounted, language-inclusive (O1+O2).
    const needs = needsFor(query);
    for (const row of audit.rows) {
      const clinician = clinicians.find((c) => c.id === row.clinicianId)!;
      expect(row.total).toBe(scoreAgainst(clinician, needs));
    }
  });

  it("orders the same way the finder does", () => {
    const query = "a structured assessment with the heart checked first";
    const audit = matchAudit(query, clinicians);
    const byAudit = [...audit.rows].sort((a, b) => b.total - a.total).map((r) => r.clinicianId);
    expect(byAudit[0]).toBe(rankClinicians(query)[0]!.id);
  });

  it("shows what a clinician was NOT asked for as well as what they were", () => {
    // "Why was he not first" is the question a metrics panel exists to answer, and it is answered
    // by the misses rather than by the hits.
    const audit = matchAudit("titration and children and autism", clinicians);
    const someoneMissed = audit.rows.some((row) => row.missed.length > 0);
    expect(someoneMissed).toBe(true);
    for (const row of audit.rows) {
      expect(row.matched.length + row.missed.length).toBe(audit.asked.length);
    }
  });

  it("reports nothing asked when nothing was understood", () => {
    const audit = matchAudit("help", clinicians);
    expect(audit.asked).toEqual([]);
    expect(audit.rows.every((row) => row.total === 0)).toBe(true);
  });
});

describe("W221 tags are declared, never inferred", () => {
  it("shows exactly the facets on the record and no others", () => {
    for (const clinician of clinicians) {
      const tags = clinicianTags(clinician);
      expect(tags.filter((t) => t.kind === "care")).toHaveLength(clinician.careAreas.length);
      expect(tags.filter((t) => t.kind === "manner")).toHaveLength(clinician.manner.length);
    }
  });
});

describe("W224 the assembled sentence has to read like a sentence", () => {
  const one = () => {
    const b = backgroundFromProposals("x", "Dr Example", readTranscript([
      { speaker: "clinician", text: "I do titration myself." },
    ]).proposed, []);
    b.facets.forEach((f) => { f.status = "accepted"; });
    return professionalBio(b);
  };

  it("says 'an area' for one and 'areas' for several", () => {
    expect(one()).toMatch(/as an area they say they see often/);
    const many = backgroundFromProposals("x", "Dr Example", readTranscript([
      { speaker: "clinician", text: "I do titration, I take a substance history, and I do a lot of coaching." },
    ]).proposed, []);
    many.facets.forEach((f) => { f.status = "accepted"; });
    expect(professionalBio(many)).toMatch(/as areas they say they see often/);
  });

  it("joins a list with commas and a final 'and'", () => {
    const b = backgroundFromProposals("x", "Dr Example", readTranscript([
      { speaker: "clinician", text: "I do titration, I take a substance history, and I do a lot of coaching." },
    ]).proposed, []);
    b.facets.forEach((f) => { f.status = "accepted"; });
    expect(professionalBio(b)).toMatch(/, .+ and /);
  });
});
