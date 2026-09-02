// U3 (O228): each boundary rendered with a thrown error, and held to its copy and its action.
//
// A boundary is a screen that only appears when something else has already failed, so nothing in
// the ordinary suite ever draws it. These renders are the only place its sentence and its two
// doors are looked at before a reader is; the e2e half (`e2e/error-boundary.spec.ts`) then proves
// a real browser reaches the route boundary and not a blank frame.
// taste-rule: interaction.errors-plain

import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import RouteError from "../../app/error";
import ConsoleError from "../../app/console/error";
import GlobalError from "../../app/global-error";
import AppLoading from "../../app/loading";
import ConsoleLoading from "../../app/console/loading";
import { BOUNDARY_COPY, boundarySentences } from "./boundary-copy";
import { eachOf } from "@/quality/non-vacuous";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const THROWN = Object.assign(new Error("synthetic: a component threw while rendering"), { digest: "abc123" });

/** A file of the tree, read as text — the source checks below pin choices markup cannot show. */
function html(file: string): string {
  return readFileSync(resolve(process.cwd(), file), "utf8");
}

/** What React writes for a sentence: the console copy carries an apostrophe, which it escapes. */
function escaped(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

function render(Component: (props: { error: Error & { digest?: string }; reset: () => void }) => unknown) {
  return renderToStaticMarkup(createElement(Component as never, { error: THROWN, reset: () => undefined }));
}

const BOUNDARIES = [
  { name: "app/error.tsx", component: RouteError, copy: BOUNDARY_COPY.route, action: BOUNDARY_COPY.route.retry, home: "/" },
  { name: "app/console/error.tsx", component: ConsoleError, copy: BOUNDARY_COPY.console, action: BOUNDARY_COPY.console.retry, home: "/console" },
  { name: "app/global-error.tsx", component: GlobalError, copy: BOUNDARY_COPY.global, action: BOUNDARY_COPY.global.reload, home: "/" },
];

describe("U3 every boundary says what happened and offers a way out", () => {
  it("renders the heading, the sentence and both doors, and never the thrown message", () => {
    for (const boundary of eachOf(BOUNDARIES, "the error boundaries")) {
      const html = render(boundary.component);
      expect(html, boundary.name).toContain(`<h1>${escaped(boundary.copy.heading)}</h1>`);
      expect(html, boundary.name).toContain(escaped(boundary.copy.body));
      expect(html, boundary.name).toContain(`<button type="button" class="notfound-primary">${escaped(boundary.action)}</button>`);
      expect(html, boundary.name).toContain(`<a class="notfound-secondary" href="${boundary.home}">${escaped(boundary.copy.home)}</a>`);
      // The thrown error's text, digest and any stack stay out of the document — the reader gets
      // the sentence, the log gets the error.
      expect(html, boundary.name).not.toContain(THROWN.message);
      expect(html, boundary.name).not.toContain(THROWN.digest);
      expect(html, boundary.name).not.toMatch(/at \w+ \(/);
    }
  });

  it("puts the second door on a plain anchor, so leaving a broken client tree is a full navigation", () => {
    for (const boundary of eachOf(BOUNDARIES, "the error boundaries")) {
      // next/link would render the same markup; the source check is what pins the choice.
      expect(html(boundary.name), boundary.name).not.toMatch(/from "next\/link"/);
      expect(render(boundary.component)).toContain(`href="${boundary.home}"`);
    }
  });

  it("draws its own document only at the top, where there is no layout left to draw into", () => {
    // React 19 writes an empty <head> of its own before the body; the document is still ours.
    expect(render(GlobalError)).toMatch(/^<html lang="en">(?:<head><\/head>)?<body class="min-h-screen antialiased app-body">/);
    expect(render(RouteError)).not.toContain("<html");
    expect(render(ConsoleError)).not.toContain("<html");
    // The root layout's own body class, read from the file, so the two cannot drift apart.
    expect(html("app/layout.tsx")).toContain('className="min-h-screen antialiased app-body"');
  });

  it("wears the 404's register: no eyebrow, no code, the same doors", () => {
    for (const boundary of eachOf(BOUNDARIES, "the error boundaries")) {
      const markup = render(boundary.component);
      expect(markup, boundary.name).not.toContain("notfound-code");
      expect(markup, boundary.name).toContain('class="notfound-screen"');
      expect(markup, boundary.name).toContain('id="main-content"');
    }
  });
});

describe("U3 the loading states are one announced line, not a blank frame", () => {
  it("renders a busy main with a status line from the copy constants", () => {
    const finder = renderToStaticMarkup(createElement(AppLoading));
    const console_ = renderToStaticMarkup(createElement(ConsoleLoading));
    expect(finder).toContain(`<p role="status">${BOUNDARY_COPY.loading.finder}</p>`);
    expect(console_).toContain(`<p role="status">${BOUNDARY_COPY.loading.console}</p>`);
    for (const markup of [finder, console_]) {
      expect(markup).toContain('aria-busy="true"');
      expect(markup).toContain('id="main-content"');
    }
  });
});

describe("U3 the copy is data the linter can reach", () => {
  it("flattens every leaf, so a new sentence joins the sweep by existing", () => {
    const sentences = boundarySentences();
    expect(sentences.map((s) => s.key).sort()).toEqual(
      ["console.body", "console.heading", "console.home", "console.retry", "global.body", "global.heading", "global.home",
        "global.reload", "loading.console", "loading.finder", "route.body", "route.heading", "route.home", "route.retry"],
    );
    for (const s of eachOf(sentences, "the boundary sentences")) expect(s.text.trim().length).toBeGreaterThan(5);
  });

  it("is what the five app files actually render — each imports the constants, none carries a string of its own", () => {
    for (const file of eachOf(
      ["app/error.tsx", "app/console/error.tsx", "app/global-error.tsx", "app/loading.tsx", "app/console/loading.tsx"],
      "the boundary and loading files",
    )) {
      const source = html(file);
      expect(source, file).toMatch(/from "@\/compliance\/boundary-copy"/);
      // No JSX text nodes of its own: every visible string comes through `COPY`/`BOUNDARY_COPY`.
      const jsx = source.slice(source.indexOf("return ("));
      expect(jsx.match(/>[^<{]*[A-Za-z][^<{]*</g), `${file} renders a literal string`).toBeNull();
    }
  });
});
