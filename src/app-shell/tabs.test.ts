// O230: the tab bar held to the routes that exist and to the researched shape.

import { describe, expect, it } from "vitest";
import { discoverSurfaces } from "../compliance/surfaces";
import { lintMessageText } from "../messaging/templates";
import { eachOf } from "../quality/non-vacuous";
import { activeTab, APP_TABS, TAB_COUNT_RANGE } from "./tabs";

const pageRoutes = new Set(discoverSurfaces("app").filter((s) => s.kind === "page").map((s) => s.path));

describe("O230 the app's tabs", () => {
  it("has between three and five, the range the surveyed health apps occupy", () => {
    expect(APP_TABS.length).toBeGreaterThanOrEqual(TAB_COUNT_RANGE.min);
    expect(APP_TABS.length).toBeLessThanOrEqual(TAB_COUNT_RANGE.max);
  });

  it("opens on the product: tab one is the finder, and the finder is the root route", () => {
    // The Zocdoc finding, made a law: a finder-shaped app opens on search, not on a story. If
    // this ever fails it means the front door became something other than the thing the app does.
    expect(APP_TABS[0]?.href).toBe("/");
    expect(APP_TABS[0]?.label).toBe("Find");
  });

  it("names a real page route, once each, and never a console or dynamic one", () => {
    for (const tab of eachOf(APP_TABS, "the tab bar")) {
      expect(pageRoutes.has(tab.href), `${tab.href} is not a page route`).toBe(true);
      expect(tab.href.startsWith("/console")).toBe(false);
      expect(tab.href).not.toContain("[");
    }
    expect(new Set(APP_TABS.map((t) => t.href)).size).toBe(APP_TABS.length);
    expect(new Set(APP_TABS.map((t) => t.label)).size).toBe(APP_TABS.length);
  });

  it("carries a word and an icon for every tab, and a stated purpose for the place it takes", () => {
    for (const tab of eachOf(APP_TABS, "the tab bar")) {
      // Icon-only navigation is the pattern the health-app corpus warns against; the label is
      // not optional and not hidden at any width, so it may not be empty here either.
      expect(tab.label.length).toBeGreaterThan(0);
      expect(tab.label.length).toBeLessThanOrEqual(12);
      expect(tab.icon.length).toBeGreaterThan(0);
      expect(tab.purpose.split(" ").length).toBeGreaterThan(8);
    }
  });

  it("says nothing the copy laws forbid — chrome is copy too", () => {
    for (const tab of eachOf(APP_TABS, "the tab bar")) {
      expect(lintMessageText(`${tab.label}. ${tab.purpose}`), tab.href).toEqual([]);
    }
  });
});

describe("O230 which tab a path belongs to", () => {
  it("matches the root only to itself, and a section to its own tab", () => {
    expect(activeTab("/")?.href).toBe("/");
    expect(activeTab("/profile")?.href).toBe("/profile");
    expect(activeTab("/approach")?.href).toBe("/approach");
  });

  it("claims nothing outside the bar — a route with no tab highlights none", () => {
    // O233: /faq, /story and /examples left the bar for the settings sheet, so they are now
    // exactly the case this asserts — real routes the bar does not claim.
    for (const path of ["/privacy", "/privacy/counsel-review", "/console", "/practices", "/terms", "/faq", "/story", "/examples"]) {
      expect(activeTab(path), path).toBeUndefined();
    }
  });
});
