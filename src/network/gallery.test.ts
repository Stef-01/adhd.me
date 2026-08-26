// O192: the gallery's own words are linted here, not only where they render.
//
// The rendered sweep (e2e/public-sweep.spec.ts) reads `/network` and would eventually catch a bad
// sentence, but it catches it in a browser after a build. These are OUR strings beside a real
// doctor's name, so they get the W23 linter at unit speed, and the neighbour arithmetic gets the
// wrap case pinned rather than discovered by a reader hitting the end of the list.

import { describe, expect, it } from "vitest";
import { lintLandingCopy } from "@/compliance/landing";
import type { Clinician } from "@/demo/clinicians";
import {
  NETWORK_CLINICIANS,
  NETWORK_COPY,
  NETWORK_SIZE,
  consultingSuburbs,
  neighbours,
  networkCopyStrings,
  networkSizeInWords,
  possessiveFor,
  seesVerb,
  subjectPronoun,
  verbFor,
} from "./gallery";

describe("O192 network gallery", () => {
  it("every framing string this page owns passes the W23 copy linter", () => {
    const strings = networkCopyStrings();
    // Non-vacuity: a refactor that stopped exporting the copy would otherwise lint nothing.
    expect(strings.length).toBeGreaterThan(6);
    for (const text of strings) {
      expect(lintLandingCopy(text), `network framing copy: "${text}"`).toEqual([]);
    }
  });

  it("hands the voice to the clinicians rather than characterising them", () => {
    // honesty.clinician-declaration made checkable: the note that tells a reader whose words the
    // bios are must actually say so. Losing this sentence turns every quoted bio into our claim.
    expect(NETWORK_COPY.declarationNote).toMatch(/their own words/i);
    // Both halves of the disclaimer, because either alone is weaker than the pair: whose words
    // these are, and whose they are not.
    expect(NETWORK_COPY.declarationNote).toMatch(/\bnone of it\b/i);
    expect(NETWORK_COPY.declarationNote).toMatch(/our description of them/i);
  });

  it("states how many GPs there are, derived from the roster", () => {
    // Round 4. The deck said "Sydney GPs" and never said how many, which let a reader assume a
    // directory and then meet two people. The count is spelled from NETWORK_SIZE, so a third GP
    // joining rewrites the sentence rather than leaving it quietly wrong.
    expect(networkSizeInWords(2)).toBe("two");
    expect(networkSizeInWords(0)).toBe("no");
    expect(networkSizeInWords(11)).toBe("11");
    expect(NETWORK_COPY.declarationNote.toLowerCase()).toContain(
      `${networkSizeInWords()} sydney gps`,
    );
  });

  it("shows the whole roster, so no named doctor is quietly dropped", () => {
    expect(NETWORK_SIZE).toBe(NETWORK_CLINICIANS.length);
    expect(NETWORK_SIZE).toBeGreaterThan(0);
  });

  it("lists every consulting suburb, primary first", () => {
    const withSecond = NETWORK_CLINICIANS.find((c) => (c.alsoConsultsAt ?? []).length > 0);
    expect(withSecond, "no clinician has a second room — the O85 case is untested").toBeDefined();
    const suburbs = consultingSuburbs(withSecond!);
    expect(suburbs[0]).toBe(withSecond!.suburb);
    expect(suburbs).toEqual([withSecond!.suburb, ...withSecond!.alsoConsultsAt!]);
  });

  it("wraps the slide controls at both ends and reports the position", () => {
    const first = NETWORK_CLINICIANS[0]!;
    const last = NETWORK_CLINICIANS[NETWORK_CLINICIANS.length - 1]!;

    const atFirst = neighbours(first.id);
    expect(atFirst).not.toBeNull();
    expect(atFirst!.previous.id).toBe(last.id);
    expect(atFirst!.position).toBe(1);
    expect(atFirst!.of).toBe(NETWORK_SIZE);

    const atLast = neighbours(last.id);
    expect(atLast!.next.id).toBe(first.id);
    expect(atLast!.position).toBe(NETWORK_SIZE);
  });

  it("uses each clinician's own pronoun in a heading that talks about them", () => {
    // Round 3's fix. The heading read "What Dr Saxena says THEY see often" for a he/him doctor —
    // grammatical, and precisely the small wrongness that undermines a page claiming these people
    // pay attention. Derived from the pronoun THEY declared, never from the gender field.
    const as = (pronouns: string) => ({ pronouns }) as Clinician;

    expect(subjectPronoun(as("he/him"))).toBe("he");
    expect(seesVerb(as("he/him"))).toBe("sees");
    expect(subjectPronoun(as("she/her"))).toBe("she");
    expect(seesVerb(as("she/her"))).toBe("sees");
    expect(subjectPronoun(as("they/them"))).toBe("they");
    expect(seesVerb(as("they/them"))).toBe("see");

    // Anything unparseable falls back to the form that is correct for anybody.
    expect(subjectPronoun(as(""))).toBe("they");
    expect(subjectPronoun(as("ze/hir"))).toBe("they");
    expect(seesVerb(as("ze/hir"))).toBe("see");
  });

  it("agrees any present-tense verb, not just the one round 3 happened to need", () => {
    // Round 7. Round 3 fixed a heading and left "How THEY consult" and "as at the date THEY told
    // us" on the same page for a he/him doctor — a helper per verb keeps inviting exactly that.
    const as = (pronouns: string) => ({ pronouns }) as Clinician;

    expect(verbFor(as("he/him"), "consult")).toBe("consults");
    expect(verbFor(as("she/her"), "consult")).toBe("consults");
    expect(verbFor(as("they/them"), "consult")).toBe("consult");
    expect(verbFor(as("ze/hir"), "work")).toBe("work");
    // And the round-3 function is now this one, so the two can never disagree.
    for (const pronouns of ["he/him", "she/her", "they/them", ""]) {
      expect(seesVerb(as(pronouns))).toBe(verbFor(as(pronouns), "see"));
    }
  });

  it("gives the possessive the page's voice label needs", () => {
    const as = (pronouns: string) => ({ pronouns }) as Clinician;
    expect(possessiveFor(as("he/him"))).toBe("his");
    expect(possessiveFor(as("she/her"))).toBe("her");
    expect(possessiveFor(as("they/them"))).toBe("their");
    expect(possessiveFor(as("ze/hir"))).toBe("their");
    // Every real roster entry yields one of the three, so no profile can render "In undefined words".
    for (const clinician of NETWORK_CLINICIANS) {
      expect(["his", "her", "their"]).toContain(possessiveFor(clinician));
    }
  });

  it("every clinician in the roster yields a usable pronoun and verb", () => {
    for (const clinician of NETWORK_CLINICIANS) {
      expect(["he", "she", "they"]).toContain(subjectPronoun(clinician));
      expect(["sees", "see"]).toContain(seesVerb(clinician));
    }
  });

  it("returns null for an id the network does not hold", () => {
    expect(neighbours("nobody-by-that-id")).toBeNull();
  });

  it("does not read the G6-gated directory register", async () => {
    // The gate line from the module header, made mechanical: if this file ever starts importing
    // the shipped-profile register, the gallery has become directory publication and needs the
    // founder's Ahpra review rather than a passing test.
    //
    // IMPORT LINES ONLY, and that is O164's lesson rather than fussiness: the first draft scanned
    // the whole file and failed on this module's own header, which NAMES the register in the
    // sentence explaining why it must never import it. A source scan measures the code; the
    // dependency is what the gate is about, so the dependency is what gets measured.
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("src/network/gallery.ts", "utf8"),
    );
    const imports = source.split("\n").filter((line) => /^\s*import\s/.test(line));
    expect(imports.length, "the module stopped importing anything — this scan went vacuous").toBeGreaterThan(0);
    for (const line of imports) {
      expect(line, "the gallery must not import the G6-gated directory register").not.toMatch(
        /@\/directory\/|SHIPPED_DIRECTORY_PROFILES/,
      );
    }
  });
});
