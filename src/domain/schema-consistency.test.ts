import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DOMAIN_TABLES, PRACTICE_SCOPED_TABLES, REFERENCE_TABLES } from "./types";

// W2 (extended in W18, W55): the TS registry and the FULL migration chain stay consistent.
const dir = path.resolve(__dirname, "../../supabase/migrations");
const sql = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(path.join(dir, f), "utf8"))
  .join("\n");

/** Every `create policy … on <table> …;` statement for one table. */
function policiesFor(table: string): string[] {
  const pattern = new RegExp(`create policy \\w+ on ${table}\\b[\\s\\S]*?;`, "g");
  return [...sql.matchAll(pattern)].map((m) => m[0]);
}

/** The body of `create table <table> ( … );`. */
function tableBody(table: string): string {
  const match = sql.match(new RegExp(`create table ${table} \\(([\\s\\S]*?)\\n\\);`));
  if (!match?.[1]) throw new Error(`no create table for ${table}`);
  return match[1];
}

const MEMBERSHIP_PREDICATE = "from memberships where email = auth.jwt()->>'email'";

describe("W2 schema consistency", () => {
  const created = [...sql.matchAll(/create table (\w+)/g)].map((m) => m[1]);

  it("every domain table exists in the migration chain", () => {
    for (const table of DOMAIN_TABLES) expect(created).toContain(table);
  });

  it("the migrations create no tables outside the domain registry", () => {
    for (const table of created) expect(DOMAIN_TABLES).toContain(table);
  });

  it("every table has RLS enabled (default deny)", () => {
    for (const table of DOMAIN_TABLES) {
      expect(sql).toContain(`alter table ${table} enable row level security`);
    }
  });

  it("W18: every practice-scoped table is restricted by membership", () => {
    // Strengthened in W55: this used to assert only that *a* policy existed, which a
    // reference table's read-all policy would have satisfied vacuously. It now checks
    // the predicate, so an unscoped policy on practice data fails here.
    for (const table of PRACTICE_SCOPED_TABLES) {
      const policies = policiesFor(table);
      expect(policies, `missing policy for ${table}`).not.toHaveLength(0);

      for (const policy of policies) {
        const scoped = table === "memberships"
          ? // A staff member sees only their own membership rows.
            policy.includes("email = auth.jwt()->>'email'")
          : policy.includes(MEMBERSHIP_PREDICATE);
        expect(scoped, `unscoped policy on ${table}: ${policy}`).toBe(true);
      }
    }
  });
});

describe("W55 register schema", () => {
  it("reference tables are readable by staff and writable by nobody", () => {
    for (const table of REFERENCE_TABLES) {
      const policies = policiesFor(table);
      expect(policies, `missing policy for ${table}`).not.toHaveLength(0);

      for (const policy of policies) {
        // `for all` would grant writes; reference rows change by migration only.
        expect(policy, `${table} must be select-only`).toContain("for select");
        expect(policy).not.toContain("for all");
        // Still gated on a staff identity — a patient/booking token has no email claim.
        expect(policy).toContain("auth.jwt()->>'email' is not null");
      }
    }
  });

  it("reference tables are not practice-scoped", () => {
    // The whole point of the exception: national guidance is not tenant data.
    for (const table of REFERENCE_TABLES) {
      expect(tableBody(table)).not.toContain("practice_id");
    }
  });

  it("every guideline interval must carry its provenance", () => {
    // The unit's requirement — "provenance of every interval (source + date)" — is
    // held by NOT NULL columns, so an unsourced interval cannot be stored at all.
    const body = tableBody("guideline_intervals");
    for (const column of [
      "source_citation",
      "source_url",
      "source_published_on",
      "source_retrieved_on",
    ]) {
      expect(body, `${column} must exist`).toContain(column);
      const declaration = body.split("\n").find((line) => line.trim().startsWith(column));
      expect(declaration, `${column} must be NOT NULL`).toContain("not null");
    }
  });

  it("guideline sources must be https and cannot predate their retrieval", () => {
    const body = tableBody("guideline_intervals");
    expect(body).toContain("source_url like 'https://%'");
    expect(body).toContain("source_retrieved_on >= source_published_on");
  });

  it("register membership cannot record an inferred origin", () => {
    // G7/TGA boundary: symptom-based membership is not representable in storage.
    // W57 enforces the same rule in the engine; this is the floor beneath it.
    const body = tableBody("register_membership");
    const check = body.split("\n").find((line) => line.includes("source text not null"));
    expect(check).toBeDefined();
    expect(check).toContain("'pms_condition_flag'");
    expect(check).toContain("'practice_confirmed'");

    for (const forbidden of ["inferred", "symptom", "predicted", "suspected"]) {
      expect(body.toLowerCase(), `register source must not admit "${forbidden}"`).not.toContain(
        `'${forbidden}`,
      );
    }
  });

  it("ships no clinical content — the intervals themselves are W56 behind G5", () => {
    // W55 is the container. A seeded interval here would be an unsigned-off clinical
    // assertion, so the migration must insert nothing into the guideline tables.
    expect(sql).not.toMatch(/insert into guideline_intervals/i);
    expect(sql).not.toMatch(/insert into conditions/i);
  });
});

describe("W79 capability graph", () => {
  const CAPABILITY_TABLES = [
    "clinician_interest",
    "clinician_experience",
    "clinician_competence",
  ] as const;

  it("interest, experience and competence are three tables, not one with a type column", () => {
    // A single table with a `kind` column is exactly how the three get conflated: one
    // write path, one shape, and nothing stopping a self-report being relabelled.
    for (const table of CAPABILITY_TABLES) {
      expect(tableBody(table)).toBeTruthy();
    }
  });

  it("each table admits exactly one provenance, and the three are disjoint", () => {
    const sources = CAPABILITY_TABLES.map((table) => {
      const line = tableBody(table)
        .split("\n")
        .find((l) => l.includes("source text not null"));
      expect(line, `${table} must pin its source`).toBeDefined();
      const match = line!.match(/source = '([a-z_]+)'/);
      expect(match, `${table} must admit exactly one source value`).not.toBeNull();
      return match![1];
    });

    expect(new Set(sources).size).toBe(3);
    expect(sources.sort()).toEqual([
      "clinician_self_reported",
      "derived_case_mix",
      "external_verification",
    ]);
  });

  it("experience has no free-text column a self-report could hide in", () => {
    // Experience is derived (W80). Any prose field here would be a self-report wearing a
    // derived label, so the table carries counts, a window and a timestamp and nothing else.
    const body = tableBody("clinician_experience");
    const textColumns = body
      .split("\n")
      .filter((l) => /^\s+\w+ text\b/.test(l))
      .map((l) => l.trim().split(" ")[0]);

    expect(textColumns).toEqual(["condition_code", "source"]);
  });

  it("a count cannot float free of the window it was measured over", () => {
    const body = tableBody("clinician_experience");
    for (const column of ["window_from date not null", "window_to date not null"]) {
      expect(body).toContain(column);
    }
    expect(body).toContain("window_to >= window_from");
  });

  it("competence cannot exist without naming who verified it", () => {
    // The whole control: no anonymous verification, so nothing can be self-asserted as
    // "verified" without a verifier on the record.
    const body = tableBody("clinician_competence");
    expect(body).toMatch(/attested_by text not null/);
    expect(body).toMatch(/verified_on date not null/);
    expect(body).toContain("length(trim(attested_by)) > 0");
  });

  it("interest is a bounded preference, not an unbounded score", () => {
    expect(tableBody("clinician_interest")).toContain("strength between 1 and 5");
  });

  it("every capability table is practice-scoped", () => {
    for (const table of CAPABILITY_TABLES) {
      expect(tableBody(table)).toContain("practice_id");
      expect(PRACTICE_SCOPED_TABLES).toContain(table);
    }
  });

  it("ships no capability data — the graph is populated by W80/W81, not by migration", () => {
    for (const table of CAPABILITY_TABLES) {
      expect(sql).not.toMatch(new RegExp(`insert into ${table}`, "i"));
    }
  });
});
