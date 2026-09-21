// One Theo, one Maya, one Leo — whatever screen you meet them on.
//
// The cast's colours live in `app/lives/bean.tsx`, and the library thumbnail for every character
// is a bean drawn from that palette. Their GAMES draw them again, bigger and with parts a bean has
// not got (hair, arms, a face with brows), and those drawings picked their own hex: Theo was drawn
// fern in both of his games while the cast has defined him as cyan since the beans were drawn, so
// the thumbnail and the game it opened showed two different people. Nothing caught it, because a
// colour is not a behaviour and no test renders the art.
//
// The v2 production plan names that conflict, resolves it in favour of the canonical identity, and
// warns against "silently introducing a third Theo" — which is what fixing one of his two drawings
// and not the other would have done. So the rule is pinned rather than the fix: a character's own
// drawing wears that character's own colour.

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TheoAvatar } from "../../app/lives/theo-morning/art";
import { TheoHallway } from "../../app/lives/theo-art";
import { beanColour, beanInk } from "../../app/lives/bean";

/** Every colour an SVG string paints with, lower-cased for comparison. */
function coloursIn(markup: string): Set<string> {
  return new Set([...markup.matchAll(/#[0-9a-fA-F]{6}/g)].map((m) => m[0]!.toLowerCase()));
}

/** The fern the two Theo drawings used to wear, and its family. None may come back. */
const RETIRED_FERN = ["#80b6a0", "#37564b", "#284b40", "#30483e", "#619881", "#3e5950"];

describe("a character's own game draws that character", () => {
  const theoBody = beanColour("theo").toLowerCase();
  const theoInk = beanInk("theo").toLowerCase();

  it("has a canonical Theo to be wrong about", () => {
    expect(theoBody).toMatch(/^#[0-9a-f]{6}$/);
    expect(theoInk).toMatch(/^#[0-9a-f]{6}$/);
    expect(theoBody).not.toBe(theoInk);
  });

  it("paints the morning avatar in Theo's own body colour and face ink", () => {
    const colours = coloursIn(renderToStaticMarkup(createElement(TheoAvatar, { load: 20, walking: false, shoes: true, carrying: 0 })));
    expect(colours, "the morning Theo is not wearing Theo's colour").toContain(theoBody);
    expect(colours).toContain(theoInk);
  });

  it("paints the hallway figure in the same colours", () => {
    const colours = coloursIn(renderToStaticMarkup(createElement(TheoHallway, { mood: "ready", packed: 0 })));
    expect(colours, "the out-the-door Theo is not wearing Theo's colour").toContain(theoBody);
    expect(colours).toContain(theoInk);
  });

  it("has retired the fern from both drawings, so there is no second Theo left", () => {
    const both = [
      renderToStaticMarkup(createElement(TheoAvatar, { load: 80, walking: true, shoes: true, carrying: 2 })),
      renderToStaticMarkup(createElement(TheoHallway, { mood: "worried", packed: 1 })),
    ].join(" ");
    const survivors = RETIRED_FERN.filter((c) => coloursIn(both).has(c));
    expect(survivors, "a drawing still wears the colour of the Theo the cast does not have").toEqual([]);
  });
});
