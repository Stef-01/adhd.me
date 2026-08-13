// W69 verify gate: unapproved content is unusable.
//
// "Unusable" is asserted at every stage of the workflow, not just at draft, because the
// dangerous states are the intermediate ones — content that has been reviewed and looks
// finished, but which the founder has not accepted liability for.

import { describe, expect, it } from "vitest";
import type { ConditionCode } from "@/domain/types";
import {
  amend,
  contentHash,
  draft,
  reject,
  review,
  signOff,
  SHIPPED_WORKSPACE,
  submitForReview,
  usableContent,
  usableFrom,
  type ContentRecord,
} from "./authoring";

const COND = "placeholder_register_a" as ConditionCode;
const AUTHOR = "author@practice.example";
const REVIEWER = "specialist@example.org";
const FOUNDER = "stefan@careyield.example";
const T = "2026-08-10T10:00:00Z";

// Deliberately non-clinical: this file must not become a back door for real content.
const BODY = "Placeholder body for workspace tests — not clinical guidance.";

const drafted = () => draft({ id: "c-1", conditionCode: COND, kind: "guideline_interval", body: BODY }, AUTHOR, T);

function unwrap(r: ReturnType<typeof review>): ContentRecord {
  if (!r.ok) throw new Error(`expected transition to succeed, got ${r.error}`);
  return r.record;
}

/** Drives a record to the given state through the real workflow. */
function at(state: "draft" | "in_review" | "reviewed" | "signed_off" | "rejected"): ContentRecord {
  const d = drafted();
  if (state === "draft") return d;
  const submitted = unwrap(submitForReview(d, AUTHOR, T));
  if (state === "in_review") return submitted;
  if (state === "rejected") return unwrap(reject(submitted, "not accurate enough", REVIEWER, T));
  const reviewed = unwrap(review(submitted, REVIEWER, T));
  if (state === "reviewed") return reviewed;
  return unwrap(signOff(reviewed, FOUNDER, T));
}

describe("W69 the shipped workspace holds no clinical content", () => {
  it("is empty, so nothing is signed off and nothing is usable", () => {
    expect(SHIPPED_WORKSPACE).toEqual([]);
    expect(usableFrom(SHIPPED_WORKSPACE)).toEqual([]);
  });
});

describe("W69 unapproved content is unusable at every stage", () => {
  it.each(["draft", "in_review", "reviewed", "rejected"] as const)("%s content is unusable", (state) => {
    expect(usableContent(at(state))).toBeNull();
  });

  it("REVIEWED content is still unusable — a specialist review is not the gate", () => {
    // The state most likely to be mistaken for done: clinically checked, not yet accepted.
    const reviewed = at("reviewed");
    expect(reviewed.reviewedBy).toBe(REVIEWER);
    expect(reviewed.signedOffBy).toBeNull();
    expect(usableContent(reviewed)).toBeNull();
  });

  it("only founder sign-off makes content usable", () => {
    const usable = usableContent(at("signed_off"));
    expect(usable).not.toBeNull();
    expect(usable?.body).toBe(BODY);
    expect(usable?.record.signedOffBy).toBe(FOUNDER);
  });

  it("usableFrom returns only the signed-off records", () => {
    const records = [at("draft"), at("reviewed"), at("signed_off"), at("rejected")];
    expect(usableFrom(records)).toHaveLength(1);
  });
});

describe("W69 sign-off cannot be reached by shortcut", () => {
  it("a draft cannot be signed off without review", () => {
    const r = signOff(drafted(), FOUNDER, T);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("founder_signoff_requires_review");
  });

  it("content in review cannot be signed off", () => {
    const r = signOff(at("in_review"), FOUNDER, T);
    expect(r.ok).toBe(false);
  });

  it("the author cannot review their own content", () => {
    // A workflow that permits self-review produces the paper trail of a check that never
    // happened, which is worse than having no review step.
    const r = review(at("in_review"), AUTHOR, T);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("reviewer_cannot_be_author");
  });

  it("content edited after review cannot be signed off on the old review", () => {
    const tampered = { ...at("reviewed"), body: "Something else entirely." };
    const r = signOff(tampered, FOUNDER, T);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("content_changed_since_review");
  });

  it("content tampered with AFTER sign-off stops being usable", () => {
    const tampered = { ...at("signed_off"), body: "Swapped after approval." };
    expect(usableContent(tampered)).toBeNull();
  });
});

describe("W69 amending clears both attestations", () => {
  it("an edit resets signed-off content to draft and makes it unusable again", () => {
    const signed = at("signed_off");
    expect(usableContent(signed)).not.toBeNull();

    const amended = amend(signed, "Revised placeholder body — still not clinical guidance.", AUTHOR, T);
    expect(amended.state).toBe("draft");
    expect(amended.reviewedBy).toBeNull();
    expect(amended.signedOffBy).toBeNull();
    expect(usableContent(amended)).toBeNull();
    // Otherwise the founder's approval would silently transfer to text they never saw.
    expect(amended.contentHash).toBe(contentHash(amended.body));
  });

  it("the history keeps every step, including the reset", () => {
    const amended = amend(at("signed_off"), "Revised.", AUTHOR, T);
    const events = amended.history.map((h) => h.event);
    expect(events[0]).toBe("drafted");
    expect(events).toContain("reviewed by specialist");
    expect(events).toContain("founder sign-off (G5)");
    expect(events.at(-1)).toMatch(/amended/);
  });
});

describe("W69 rejection", () => {
  it("rejected content records why and can be resubmitted", () => {
    const rejected = at("rejected");
    expect(rejected.rejectedReason).toBe("not accurate enough");
    expect(usableContent(rejected)).toBeNull();
    const resubmitted = unwrap(submitForReview(rejected, AUTHOR, T));
    expect(resubmitted.state).toBe("in_review");
    expect(resubmitted.rejectedReason).toBeNull();
  });

  it("signed-off content cannot be rejected — amend it instead", () => {
    expect(reject(at("signed_off"), "changed my mind", FOUNDER, T).ok).toBe(false);
  });
});
