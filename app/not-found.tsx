// Launch item 1: the page for a link that goes nowhere.
//
// A default 404 strands the one visitor who arrived most confused — often from a stale link in
// a message someone forwarded them. The custom page does what every dead end in this product
// does: says plainly what happened, and offers the door that answers why anybody is here. It
// wears the public header and footer like every other public page, so the mark and the way out
// are where they always are; the header's own links carry the rest.
import Link from "next/link";
import type { Metadata } from "next";
import { PublicHeader } from "./public-header";
import { SiteFooter } from "./site-footer";

export const metadata: Metadata = {
  title: "Page not found",
  description: "That page does not exist. Find a GP who does ADHD assessment, or start from the beginning.",
};

export default function NotFound() {
  return (
    <>
    <PublicHeader />
    <div className="prose-screen">
      <main id="main-content" className="notfound-screen">
        <p className="notfound-code" aria-hidden="true">404</p>
        <h1>That page does not exist.</h1>
        <p className="notfound-copy">That link is old or mistyped.</p>
        <div className="notfound-doors">
          <Link className="notfound-primary" href="/">Find support</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
    </>
  );
}
