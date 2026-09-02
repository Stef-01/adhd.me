// Launch item 1: the page for a link that goes nowhere.
//
// A default 404 strands the one visitor who arrived most confused — often from a stale link in
// a message someone forwarded them. The custom page does what every dead end in this product
// does: says plainly what happened, and offers the two doors that answer why anybody is here.
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  description: "That page does not exist. Find a GP who does ADHD assessment, or start from the beginning.",
};

export default function NotFound() {
  return (
    <main id="main-content" className="notfound-screen">
      <p className="notfound-code" aria-hidden="true">404</p>
      <h1>That page does not exist.</h1>
      <p className="notfound-copy">
        The link may be old, or mistyped. Nothing you did was wrong, and nothing was lost.
      </p>
      <div className="notfound-doors">
        <Link className="notfound-primary" href="/">Find a GP</Link>
        <Link className="notfound-secondary" href="/">Start from the beginning</Link>
      </div>
    </main>
  );
}
