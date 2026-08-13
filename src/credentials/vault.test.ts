// W109 verify gate: "isolation tests; no route serves an evidence document without
// authorization; nothing public (G6)."
//
// The first assertions here are compile-time ones, and that is deliberate. "No route serves
// an evidence document without authorization" is a claim about every route that will ever be
// written, and no runtime test can make a claim about code that does not exist yet. What CAN
// be pinned is that the bytes are unreachable without a `VaultGrant` and a grant is
// unreachable without `authorize()` — so a route that skips the check fails to compile, and
// the property holds for future diffs rather than being re-checked by hand on each one.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { Membership } from "@/tenancy/tenancy";
import {
  ALLOWED_CONTENT_TYPES,
  explainEvidenceRejection,
  listEvidence,
  listEvidenceForClinician,
  evidenceByteLength,
  MAX_EVIDENCE_BYTES,
  openVault,
  readEvidence,
  resetVault,
  storeEvidence,
  type EvidenceInput,
  type EvidenceRejection,
  type VaultGrant,
} from "./vault";

const MEMBERS: Membership[] = [
  { practiceId: "prac-a", email: "owner@a.example", role: "owner" },
  { practiceId: "prac-a", email: "manager@a.example", role: "manager" },
  { practiceId: "prac-a", email: "clinician@a.example", role: "clinician" },
  { practiceId: "prac-b", email: "owner@b.example", role: "owner" },
];

/** Opens the vault the only way it can be opened, and fails loudly if authorization refused. */
function grantFor(email: string, practiceId: string): VaultGrant {
  const opened = openVault(MEMBERS, email, practiceId);
  if (!opened.ok) throw new Error(`expected a grant, got ${opened.reason}`);
  return opened.grant;
}

const doc = (over: Partial<EvidenceInput> = {}): EvidenceInput => ({
  credentialId: "cred-1",
  subjectClinicianId: "clin-1",
  filename: "fellowship.pdf",
  contentType: "application/pdf",
  content: "%PDF-1.4 synthetic",
  uploadedOn: "2026-08-10",
  ...over,
});

beforeEach(resetVault);

describe("W109 the bytes are unreachable without authorization", () => {
  it("does not typecheck without a grant", () => {
    // @ts-expect-error — readEvidence has no overload that takes a ref alone.
    void (() => readEvidence("ev_deadbeefdeadbeef"));
    // @ts-expect-error — nor can a caller stand in something grant-SHAPED. The brand is a
    // unique symbol this module never exports, so there is no literal that satisfies it.
    void (() => readEvidence({ practiceId: "prac-a", email: "owner@a.example" }, "ev_1"));
    // @ts-expect-error — and casting through the public type does not help either.
    void (() => listEvidence({ practiceId: "prac-a" }, "cred-1"));
    expect(true).toBe(true);
  });

  it("refuses a non-member and a member of another practice alike", () => {
    expect(openVault(MEMBERS, "stranger@x.example", "prac-a")).toEqual({
      ok: false,
      reason: "no_membership",
    });
    // The W18 boundary: belonging to practice B grants exactly nothing at practice A.
    expect(openVault(MEMBERS, "owner@b.example", "prac-a")).toEqual({
      ok: false,
      reason: "no_membership",
    });
  });

  it("opens for the credentialing roles", () => {
    expect(openVault(MEMBERS, "owner@a.example", "prac-a").ok).toBe(true);
    expect(openVault(MEMBERS, "manager@a.example", "prac-a").ok).toBe(true);
  });

  it("refuses a clinician — and W113 must not fix that by granting the role", () => {
    // "clinician" is the role every clinical user holds. Granting evidence reads there grants
    // every clinician every colleague's credentialing file. A clinician's right to their OWN
    // file is real and is W113's; it has to be scoped to the subject, not to the role.
    expect(openVault(MEMBERS, "clinician@a.example", "prac-a")).toEqual({
      ok: false,
      reason: "role_denied",
    });
  });
});

describe("W109 isolation", () => {
  it("a grant cannot read another practice's document, and is not told it exists", () => {
    const a = grantFor("owner@a.example", "prac-a");
    const stored = storeEvidence(a, doc());
    expect(stored.ok).toBe(true);
    const ref = stored.ok ? stored.summary.ref : "";

    const b = grantFor("owner@b.example", "prac-b");
    // `not_found`, NOT `forbidden`. W105 chose 403-over-404 because the register's existence
    // was already public and only its contents were withheld. Here the existence of a
    // credentialing document for a named clinician at another practice IS the disclosure.
    expect(readEvidence(b, ref)).toEqual({ found: false, reason: "not_found" });
    // Identical answer for a ref that never existed — the two cases are indistinguishable.
    expect(readEvidence(b, "ev_0000000000000000")).toEqual({ found: false, reason: "not_found" });
  });

  it("listings are scoped to the grant's practice, by both entry point", () => {
    const a = grantFor("owner@a.example", "prac-a");
    const b = grantFor("owner@b.example", "prac-b");
    storeEvidence(a, doc());
    storeEvidence(b, doc({ filename: "b-side.pdf" }));

    expect(listEvidence(a, "cred-1").map((s) => s.filename)).toEqual(["fellowship.pdf"]);
    expect(listEvidence(b, "cred-1").map((s) => s.filename)).toEqual(["b-side.pdf"]);
    expect(listEvidenceForClinician(a, "clin-1").map((s) => s.filename)).toEqual([
      "fellowship.pdf",
    ]);
    expect(listEvidenceForClinician(b, "clin-1").map((s) => s.filename)).toEqual(["b-side.pdf"]);
  });

  it("writes land in the grant's practice — the input has no practiceId to get wrong", () => {
    const a = grantFor("manager@a.example", "prac-a");
    const stored = storeEvidence(a, doc());
    expect(stored.ok && stored.summary.practiceId).toBe("prac-a");
    // Uploader comes from the grant, not the caller (W111: we stamp what only we can know).
    expect(stored.ok && stored.summary.uploadedBy).toBe("manager@a.example");
  });

  it("the same ref in two practices is two documents, each visible only to its own", () => {
    // Refs are content-derived and the derivation includes the practice, so this is really a
    // check that nothing collapses them into one row.
    const a = grantFor("owner@a.example", "prac-a");
    const b = grantFor("owner@b.example", "prac-b");
    const inA = storeEvidence(a, doc());
    const inB = storeEvidence(b, doc());
    expect(inA.ok && inB.ok).toBe(true);
    const refA = inA.ok ? inA.summary.ref : "";
    const refB = inB.ok ? inB.summary.ref : "";
    expect(refA).not.toBe(refB);
    expect(readEvidence(a, refB).found).toBe(false);
    expect(readEvidence(b, refA).found).toBe(false);
    expect(readEvidence(a, refA).found).toBe(true);
  });
});

describe("W109 a summary is not a document", () => {
  it("no listing carries content, asserted on the serialised payload", () => {
    // W83's move: check what actually crosses the wire, not what the type says. A field
    // dropped in the type but re-added by a spread would pass a type check and fail this.
    const a = grantFor("owner@a.example", "prac-a");
    const secret = "%PDF-1.4 THIS-IS-THE-DOCUMENT-BODY";
    storeEvidence(a, doc({ content: secret }));

    const serialised = JSON.stringify([
      listEvidence(a, "cred-1"),
      listEvidenceForClinician(a, "clin-1"),
    ]);
    expect(serialised).not.toContain(secret);
    // The key itself, not the substring — `contentType` legitimately contains "content", and
    // an assertion that cannot tell them apart would have to be loosened later to stay green.
    expect(serialised).not.toContain('"content":');
    // But it does carry what a listing is for.
    expect(serialised).toContain("fellowship.pdf");
    expect(JSON.parse(serialised)[0][0].byteLength).toBe(secret.length);
  });

  it("reading by ref is the only way to the bytes", () => {
    const a = grantFor("owner@a.example", "prac-a");
    const stored = storeEvidence(a, doc({ content: "%PDF-1.4 body" }));
    const ref = stored.ok ? stored.summary.ref : "";
    const read = readEvidence(a, ref);
    expect(read.found && read.document.content).toBe("%PDF-1.4 body");
  });
});

describe("W109 what the vault refuses", () => {
  it.each<[Partial<EvidenceInput>, EvidenceRejection]>([
    [{ credentialId: "  " }, "credential_missing"],
    [{ subjectClinicianId: "" }, "subject_missing"],
    [{ filename: " " }, "filename_missing"],
    [{ content: "" }, "empty_content"],
    [{ contentType: "text/html" }, "unsupported_content_type"],
    [{ content: "x".repeat(MAX_EVIDENCE_BYTES + 1) }, "too_large"],
  ])("refuses %o with %s", (over, expected) => {
    const a = grantFor("owner@a.example", "prac-a");
    const result = storeEvidence(a, doc(over));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors).toContain(expected);
  });

  it("refuses text/html specifically — a vault that stores it is a stored-XSS surface", () => {
    const a = grantFor("owner@a.example", "prac-a");
    for (const bad of ["text/html", "image/svg+xml", "application/javascript"]) {
      expect(storeEvidence(a, doc({ contentType: bad })).ok).toBe(false);
    }
    for (const good of ALLOWED_CONTENT_TYPES) {
      expect(storeEvidence(a, doc({ contentType: good, filename: `${good}.bin` })).ok).toBe(true);
    }
  });

  it("reports every problem at once, not the first", () => {
    const a = grantFor("owner@a.example", "prac-a");
    const result = storeEvidence(
      a,
      doc({ credentialId: "", filename: "", content: "", contentType: "text/html" }),
    );
    expect(!result.ok && result.errors.sort()).toEqual([
      "credential_missing",
      "empty_content",
      "filename_missing",
      "unsupported_content_type",
    ]);
  });

  it("writes nothing when it refuses", () => {
    const a = grantFor("owner@a.example", "prac-a");
    expect(storeEvidence(a, doc({ contentType: "text/html" })).ok).toBe(false);
    expect(listEvidence(a, "cred-1")).toEqual([]);
  });

  it("explains every refusal it can produce", () => {
    const reasons: EvidenceRejection[] = [
      "credential_missing",
      "subject_missing",
      "filename_missing",
      "empty_content",
      "unsupported_content_type",
      "too_large",
      "duplicate_ref",
    ];
    for (const reason of reasons) {
      expect(explainEvidenceRejection(reason).length, reason).toBeGreaterThan(10);
    }
  });
});

describe("W116 the size limit measures bytes, as its name promises", () => {
  it("counts UTF-8 bytes, not UTF-16 code units", () => {
    // The finding: `content.length` counts code units. For anything but ASCII that is not the
    // byte count, so a constant called MAX_EVIDENCE_*BYTES* was admitting multiples of its
    // stated limit and `byteLength` was recording a number that was not bytes.
    expect(evidenceByteLength("x".repeat(10))).toBe(10);
    expect(evidenceByteLength("é".repeat(10))).toBe(20);
    expect(evidenceByteLength("🩺".repeat(10))).toBe(40);
  });

  it("refuses a document that is under the limit in characters but over it in bytes", () => {
    // Half the character count of the limit, twice the bytes per character: previously
    // accepted at ~2x the stated maximum.
    const a = grantFor("owner@a.example", "prac-a");
    const oversize = "é".repeat(MAX_EVIDENCE_BYTES / 2 + 1);
    expect(oversize.length).toBeLessThan(MAX_EVIDENCE_BYTES);
    expect(evidenceByteLength(oversize)).toBeGreaterThan(MAX_EVIDENCE_BYTES);
    const result = storeEvidence(a, doc({ content: oversize }));
    expect(!result.ok && result.errors).toContain("too_large");
  });

  it("records the stored size in bytes", () => {
    const a = grantFor("owner@a.example", "prac-a");
    const stored = storeEvidence(a, doc({ content: "%PDF-é" }));
    expect(stored.ok && stored.summary.byteLength).toBe(7);
  });
});

describe("W109 refs", () => {
  it("carries no practice, clinician or credential identifier", () => {
    // A ref may end up in a URL. It must not say whose document it is or where it lives.
    const a = grantFor("owner@a.example", "prac-a");
    const stored = storeEvidence(
      a,
      doc({ credentialId: "CREDMARKER", subjectClinicianId: "CLINMARKER" }),
    );
    const ref = stored.ok ? stored.summary.ref : "";
    expect(ref).toMatch(/^ev_[0-9a-f]{16}$/);
    for (const marker of ["prac-a", "CREDMARKER", "CLINMARKER", "fellowship"]) {
      expect(ref).not.toContain(marker);
    }
  });

  it("is content-derived: the same file twice is the same document, not two", () => {
    const a = grantFor("owner@a.example", "prac-a");
    expect(storeEvidence(a, doc()).ok).toBe(true);
    const again = storeEvidence(a, doc());
    expect(!again.ok && again.errors).toEqual(["duplicate_ref"]);
    expect(listEvidence(a, "cred-1")).toHaveLength(1);
  });

  it("differs when the content differs, even under the same filename", () => {
    const a = grantFor("owner@a.example", "prac-a");
    const first = storeEvidence(a, doc({ content: "%PDF one" }));
    const second = storeEvidence(a, doc({ content: "%PDF two" }));
    expect(first.ok && second.ok).toBe(true);
    expect(first.ok && second.ok && first.summary.ref !== second.summary.ref).toBe(true);
    expect(listEvidence(a, "cred-1")).toHaveLength(2);
  });
});

describe("W109 nothing public (G6)", () => {
  // A tripwire, and worth naming as one: today NOTHING under app/ imports the vault, so this
  // assertion is trivially true. Its value is not evidence that the gate holds — the
  // compile-time grant is that — it is that the first surface to reach for evidence documents
  // has to come through here and say where it is putting them. W113 adds a console; a public
  // route or an unauthenticated API route reaching the vault breaks this test.
  const APP = path.resolve(__dirname, "../../app");

  function appFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) return appFiles(full);
      return /\.tsx?$/.test(full) ? [full] : [];
    });
  }

  it("no surface reaches the vault outside an authenticated console path", () => {
    const importers = appFiles(APP)
      .filter((f) => /from "@\/credentials\/vault"/.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(path.resolve(__dirname, "../.."), f).split(path.sep).join("/"));
    const misplaced = importers.filter((f) => !f.startsWith("app/console/"));
    expect(misplaced, `evidence documents reachable outside the console: ${misplaced.join(", ")}`).toEqual([]);
  });

  it("the vault module opens no network client and reads no environment", () => {
    // The G6 posture W111 used for the register: a document store that can phone out is a
    // document store that can be made to exfiltrate.
    const source = readFileSync(path.join(__dirname, "vault.ts"), "utf8");
    expect(source).not.toMatch(/\bfetch\(|process\.env|require\(/);
  });
});
