// W102 verify gate: every surface mapped — checked against the real tree, not asserted.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { diffCensus, discoverSurfaces, parseCensus } from "./surfaces";

const DOSSIER = "docs/COMPLIANCE-DOSSIER.md";

const surfaces = () => discoverSurfaces("app");
const census = () => parseCensus(readFileSync(DOSSIER, "utf8"));

describe("W102 the surface census is complete", () => {
  it("finds the routes the application actually serves", () => {
    const found = surfaces();
    // Guard against a vacuous pass: a discovery bug returning nothing would make every
    // assertion below trivially true, which is how a census control dies quietly.
    expect(found.length).toBeGreaterThan(20);
    expect(found.map((s) => s.path)).toContain("/console/outreach");
    expect(found.find((s) => s.path === "/api/interest/export")?.kind).toBe("route");
    expect(found.map((s) => s.path)).toContain("/book/[token]");
  });

  it("maps every served route", () => {
    const diff = diffCensus(surfaces(), census());
    expect(
      diff.unmapped,
      `add a row to ${DOSSIER} and a census line for: ${diff.unmapped.join(", ")}`,
    ).toEqual([]);
  });

  it("lists no route that has moved or gone", () => {
    // The failure the document keeps making. A stale row is worse than a missing one: it
    // describes controls over something that is not there, and reads as coverage.
    const diff = diffCensus(surfaces(), census());
    expect(
      diff.stale,
      `these census lines name routes that no longer exist: ${diff.stale.join(", ")}`,
    ).toEqual([]);
  });

  it("attributes every route to a governing row", () => {
    expect(diffCensus(surfaces(), census()).unattributed).toEqual([]);
  });

  it("names a row that exists in the surface map", () => {
    const dossier = readFileSync(DOSSIER, "utf8");
    for (const entry of census()) {
      for (const row of entry.row.split(";").map((r) => r.trim())) {
        // Each governing row must be findable as a table row heading, so a census line
        // cannot point at a row that was renamed or deleted.
        expect(dossier, `census line ${entry.path} names an unknown row "${row}"`).toContain(
          `| ${row}`,
        );
      }
    }
  });
});

describe("W102 the census cannot pass vacuously", () => {
  it("an empty dossier maps nothing", () => {
    // Deleting the block must fail the gate, not satisfy it.
    expect(parseCensus("# nothing here")).toEqual([]);
    const diff = diffCensus(surfaces(), []);
    expect(diff.unmapped.length).toBe(surfaces().length);
  });

  it("a route with no census line is reported", () => {
    const diff = diffCensus(
      [{ path: "/new-thing", kind: "page" }],
      [{ path: "/console", row: "Practice console" }],
    );
    expect(diff.unmapped).toEqual(["/new-thing"]);
    expect(diff.stale).toEqual(["/console"]);
  });

  it("a census line with no governing row is reported", () => {
    const diff = diffCensus(
      [{ path: "/a", kind: "page" }],
      [{ path: "/a", row: "" }],
    );
    expect(diff.unattributed).toEqual(["/a"]);
  });
});
