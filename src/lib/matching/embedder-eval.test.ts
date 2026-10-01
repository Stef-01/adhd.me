// M5 verify gate: the lexical embedder on the finder's reach corpus, the bench a dense model has to
// beat. Fitted on the roster's GP bios, as the service fits it.

import { describe, expect, it } from "vitest";
import { rosterGPs } from "./adapters";
import { gpBioText } from "./candidates";
import { evaluateOnCorpus, formatCorpusReport } from "./embedder-eval";
import { LexicalEmbedder } from "./embedding";

describe("M5 the corpus bench", () => {
  it("pins the lexical embedder on the reach corpus: paraphrases of one ask sit nearer than different asks", () => {
    const lexical = new LexicalEmbedder().fit(rosterGPs(new Date("2026-09-10")).map((gp) => gpBioText(gp)));
    const report = evaluateOnCorpus(lexical, "lexical");
    console.log(formatCorpusReport(report));
    expect(report.entries).toBeGreaterThan(400);
    // Measured 2026-09-29: 462 entries, agreement 71%, same-facet 0.137 against other-facet 0.025.
    // 2026-10-01: 0.571 on the 53-profile roster; the embedder's vocabulary is fitted on the bios, and sixteen more shift it.
    expect(report.neighbourAgreement).toBeGreaterThanOrEqual(0.55);
    expect(report.meanSameFacet).toBeGreaterThan(report.meanOtherFacet);
  });
});
