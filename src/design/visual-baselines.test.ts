// AR15: the capture harness's pure half — the matrix, the ids, the diff — in the hard gate
// (the AR6-AR14 split). The browser half runs in visual-stability.spec.ts.
import { describe, expect, it } from "vitest";
import { CONSOLE_ROUTES, PUBLIC_ROUTES } from "../../e2e/site-routes";
import { MOTION, THEMES, WIDTHS, captureId, captureMatrix, manifestDiff } from "../../e2e/support/visual";

describe("AR15 the matrix is derived, and its size is the lists' product", () => {
  it("covers every static route at every width, motion setting and theme", () => {
    const keys = captureMatrix();
    expect(keys.length).toBe(
      (PUBLIC_ROUTES.length + CONSOLE_ROUTES.length) * WIDTHS.length * MOTION.length * THEMES.length,
    );
    const routes = new Set(keys.map((k) => k.route));
    for (const route of [...PUBLIC_ROUTES, ...CONSOLE_ROUTES]) expect(routes.has(route)).toBe(true);
  });

  it("one theme today, recorded as a list so the second is an append", () => {
    // The plan wrote "2 themes"; the tree has one (globals.css: "One theme, one accent").
    // When a dark theme ships, THEMES gains an entry and this pin moves DELIBERATELY.
    expect(THEMES).toEqual(["light"]);
  });

  it("capture ids are unique and stable across the whole matrix", () => {
    const ids = captureMatrix().map(captureId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("home@390·light·no-preference");
    expect(ids).toContain("console__dashboard@1280·light·reduce");
  });
});

describe("AR15 the manifest diff names every disagreement, both directions", () => {
  it("empty on identical manifests", () => {
    expect(manifestDiff({ a: "1", b: "2" }, { a: "1", b: "2" })).toEqual([]);
  });

  it("names a changed capture, a vanished one, and a new one — each as itself", () => {
    const diff = manifestDiff({ a: "1", b: "2", gone: "3" }, { a: "1", b: "9", fresh: "4" });
    expect(diff).toEqual([
      "b: pixels changed between runs",
      "fresh: only in the second run",
      "gone: only in the first run",
    ]);
  });
});
