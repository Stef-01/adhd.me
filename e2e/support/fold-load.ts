// AR28: the fold detector, in one place, so the mutation probe drives the REAL one — AR13's
// fold entry promoted from enforced-without-probe to the AR9–AR12 architecture, exactly as its
// whatAProbeWouldMutate specified.
//
// Evaluate-only, deliberately (the AR10 shape): the probe injects a straddling band and forces
// an h1 below the fold, then must re-measure WITHOUT a navigation — a reload would clear its
// mutation — so page setup (viewport, goto, fonts) stays with the caller. The sweep does the
// route loop; the probe does one route and measures twice.

import type { Page } from "@playwright/test";
import { bandCut, TIED_BANDS, type TiedBand } from "../../src/design/fold-bands";

/** The register rule this family enforces (`src/design/taste-register.ts`). */
export const FOLD_RULE_ID = "layout.fold-governed";

export type FoldFinding = { readonly route: string; readonly detail: string };

/**
 * Both halves of the visual fold law, judged on the CURRENT page at the CURRENT viewport:
 * the first h1 fully inside it (the idea above the fold), and every tied band for `route` —
 * from the register plus any `extraBands` a probe plants — uncut by it. Findings name the
 * rule id, so a red run tells the reader which register rule broke (AR9's message law).
 */
export async function foldFindings(
  page: Page,
  route: string,
  viewportHeight: number,
  extraBands: readonly TiedBand[] = [],
): Promise<FoldFinding[]> {
  const findings: FoldFinding[] = [];

  const h1 = page.locator("h1").first();
  const box = await h1.boundingBox();
  if (!box) {
    findings.push({ route, detail: `no h1 rendered — breaks ${FOLD_RULE_ID}` });
  } else if (box.y < 0 || box.y + box.height > viewportHeight) {
    findings.push({
      route,
      detail: `the idea is not above the fold — h1 spans ${Math.round(box.y)}..${Math.round(box.y + box.height)} in a ${viewportHeight}px viewport — breaks ${FOLD_RULE_ID}`,
    });
  }

  for (const band of [...TIED_BANDS, ...extraBands].filter((candidate) => candidate.route === route)) {
    const boxes = [];
    for (const selector of band.selectors) boxes.push(await page.locator(selector).first().boundingBox());
    if (boxes.some((candidate) => !candidate)) {
      findings.push({ route, detail: `tied band "${band.name}" — a selector resolved nothing (vacuous register entry) — breaks ${FOLD_RULE_ID}` });
      continue;
    }
    const top = Math.min(...boxes.map((candidate) => candidate!.y));
    const bottom = Math.max(...boxes.map((candidate) => candidate!.y + candidate!.height));
    if (bandCut(top, bottom, viewportHeight)) {
      findings.push({
        route,
        detail: `the fold cuts "${band.name}" (${Math.round(top)}..${Math.round(bottom)} across the ${viewportHeight}px fold) — breaks ${FOLD_RULE_ID} — ${band.why}`,
      });
    }
  }

  return findings;
}
