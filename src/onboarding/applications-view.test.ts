// W233 (O57) verify gate: the sentences the applications console renders, pinned here because
// the staff grant list ships empty — nobody can walk the granted view end-to-end, so if these
// were not unit-pinned the page's promises would ship unverified until the first grant.
import { describe, expect, it } from "vitest";
import { applicationView, mixLine } from "./applications-view";
import type { ClinicianApplication } from "./types";

const application = (overrides: Partial<ClinicianApplication> = {}): ClinicianApplication => ({
  id: "app-1",
  fullName: "Dr Example Applicant",
  ahpraRegistrationNumber: "MED0001234567",
  email: "applicant@example.practice",
  practiceSuburb: "Beecroft",
  practiceName: "Example Family Practice",
  careAreas: ["adhd-assessment", "titration"],
  manner: ["unhurried"],
  languages: ["English", "Hindi"],
  nswAdhdTrained: true,
  acceptingNewPatients: true,
  submittedAt: "2026-08-19T12:00:00.000Z",
  status: "received",
  ...overrides,
});

describe("W233 the mix renders as stated preference, and only when it was stated", () => {
  it("says the declared mix as a preference, never a promise", () => {
    const line = mixLine(application({ desiredMixPercent: 30 }))!;
    expect(line).toContain("about 30%");
    expect(line).toContain("stated preference");
    // The two failure modes by name: a caseload promise, and a ranking commitment.
    expect(line).toContain("not a referral promise");
  });

  it("renders NOTHING for an application without a mix — absence stays absent", () => {
    // O26's law read back: a default nobody touched is not a declaration, so the store omits
    // the key and this view must not invent a sentence for it.
    expect(mixLine(application())).toBeNull();
    expect(applicationView(application()).mixLine).toBeNull();
  });
});

describe("W233 every sentence reports a declaration; none vouches", () => {
  it("says the Ahpra number is an unchecked shape, not a verified credential", () => {
    const view = applicationView(application());
    expect(view.ahpraLine).toContain("MED0001234567");
    expect(view.ahpraLine).toContain("not yet checked against the register");
    expect(view.ahpraLine).not.toMatch(/verified|confirmed|valid\b/i);
  });

  it("renders the training and books answers as the applicant's answers", () => {
    const trained = applicationView(application());
    expect(trained.trainingLine).toContain("Says they have completed");
    expect(trained.trainingLine).toContain("no public register");
    const untrained = applicationView(application({ nswAdhdTrained: false }));
    expect(untrained.trainingLine).toBe("Has not claimed the NSW ADHD training.");
    expect(applicationView(application()).booksLine).toContain("Says their books are open");
    expect(applicationView(application({ acceptingNewPatients: false })).booksLine).toContain(
      "Says their books are closed",
    );
  });

  it("maps closed-vocabulary facets to their labels and keeps free text verbatim", () => {
    const view = applicationView(application());
    // Labels come from the same vocabularies the finder matches on, so the reviewer reads
    // the words a patient would be matched by, not internal ids.
    expect(view.careAreaLabels.some((label) => /assessment/i.test(label))).toBe(true);
    expect(view.mannerLabels).toHaveLength(1);
    expect(view.mannerLabels[0]).toBe("Unhurried first appointment");
    // Verbatim fields stay verbatim — the page renders them under the W153 attribution.
    expect(view.fullName).toBe("Dr Example Applicant");
    expect(view.practiceLine).toBe("Example Family Practice, Beecroft");
    expect(view.submittedOn).toBe("2026-08-19");
  });

  it("never uses the banned register anywhere in a rendered sentence", () => {
    // Tree law 6: "specialist" never appears beside a niche scope — here, nowhere at all.
    const view = applicationView(application({ desiredMixPercent: 40 }));
    const everything = JSON.stringify(view).toLowerCase();
    expect(everything).not.toContain("specialis");
    expect(everything).not.toContain("guarantee");
  });
});
