// Launch item 4: the page after the form.
//
// A thank-you PAGE rather than an inline message, for two reasons the inline version cannot
// serve: the person gets a real place they can screenshot or return to, and a conversion has a
// URL — which is the only way item 19's analytics can ever count one without watching anybody.
import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "../breadcrumbs";
import { SiteFooter } from "../site-footer";
import { PublicHeader } from "../public-header";

export const metadata: Metadata = {
  alternates: { canonical: "/thanks" },
  title: "You're registered",
  description: "Your registration reached us. What happens next, in plain terms.",
  robots: { index: false },
};

export default function ThanksPage() {
  return (
    <>
    <PublicHeader />
    <main id="main-content" className="prose-screen">
      <div className="prose-wrap">
        <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Registered", href: "/thanks" }]} />
        <h1>You’re registered.</h1>
        <p>
          Your details reached us, and a person reads every registration — nothing here is
          automated. We reply within two business days.
        </p>
        <p>
          Until then, the finder works without an account, and the worked examples show what it
          does with a request like yours.
        </p>
        <div className="prose-doors">
          <Link className="notfound-primary" href="/finder">Find a GP</Link>
          <Link className="notfound-secondary" href="/examples">See a worked example</Link>
        </div>
      </div>
      <SiteFooter />
    </main>
    </>
  );
}
