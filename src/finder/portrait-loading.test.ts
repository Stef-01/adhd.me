// The results list's first rows are above the fold on the screen a presenter shows a room. A lazy
// thumbnail there is a blank slot for as long as the image optimiser takes on a cold hit — which
// the 2026-09-05 cold-look capture showed at 390px: five rows, five empty squares, the faces only
// arriving after the shot. Eager for the first viewport, lazy below it.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ClinicianPortrait } from "../../app/finder-stages/shared";
import { SYNTHETIC_CLINICIANS } from "../demo/synthetic-roster";

const withImage = SYNTHETIC_CLINICIANS.find((c) => c.image)!;

describe("ClinicianPortrait thumb loading", () => {
  it("loads eagerly when told the row is in the first viewport", () => {
    const html = renderToStaticMarkup(createElement(ClinicianPortrait, { clinician: withImage, variant: "thumb", eager: true }));
    expect(html).toContain('loading="eager"');
  });
  it("stays lazy by default, below the fold", () => {
    const html = renderToStaticMarkup(createElement(ClinicianPortrait, { clinician: withImage, variant: "thumb" }));
    expect(html).toContain('loading="lazy"');
  });
});
