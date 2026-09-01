import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { Analytics } from "./analytics";
import { PrivacyConsent } from "./privacy-consent";
import { AcknowledgementOfCountry } from "./acknowledgement-of-country";
import { SITE_URL } from "./site";

/**
 * Launch items 11–13 + 17. The template gives every page a UNIQUE title while keeping the site
 * name (pages set their own first half); the OpenGraph/Twitter defaults make a shared link
 * unfurl with the generated card in app/opengraph-image.tsx; metadataBase makes every relative
 * URL absolute from the one place the site's address is decided.
 */
/**
 * O167: the browser chrome matches the paper.
 *
 * Without this the address bar and the pull-to-refresh gutter render in the browser's own default
 * — white on iOS, grey on Android — against a page whose background is a warm off-white. On a phone
 * that is a visible seam at the top of every screen, and it is invisible in every desktop capture,
 * which is why a checklist found it and looking did not.
 *
 * The value is `--paper` from `globals.css`, and a test asserts the two still agree by resolving
 * both through a canvas: a palette change that left this stale would put the seam back silently.
 */
export const viewport: Viewport = {
  themeColor: "#f7f8fc",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ADHD.ME: assessment you can actually reach",
    template: "%s · ADHD.ME",
  },
  description:
    "Find a listed Sydney GP who does ADHD assessment, in your language, with the access details you asked for.",
  openGraph: {
    siteName: "ADHD.ME",
    type: "website",
    locale: "en_AU",
  },
  twitter: {
    card: "summary_large_image",
  },
};

/**
 * Organization + WebSite structured data (launch item 17), the compliant subset: name, the
 * areas served, and the contact route. Deliberately absent: aggregateRating and review markup
 * (prohibited for regulated health services and banned by this tree's own laws), and any
 * Physician markup (public directory copy sits behind founder gate G6).
 */
const ORGANIZATION_JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}#org`,
      name: "ADHD.ME",
      url: SITE_URL,
      email: "stefan.thottunkal@gmail.com",
      areaServed: [{ "@type": "Place", name: "Sydney, NSW, Australia" }],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}#site`,
      url: SITE_URL,
      name: "ADHD.ME",
      publisher: { "@id": `${SITE_URL}#org` },
    },
  ],
};

/**
 * The replacement-world contract, emitted into the document so a production artifact carries
 * the same direction its source was built against. React does not preserve JSX comments, so an
 * inert JSON script is the closest auditable HTML primitive: it has no runtime behavior and the
 * seed can be grepped from the built output.
 */
const DESIGN_DIRECTION = {
  thesis:
    "A daylight wayfinding instrument that turns a person's words into an inspectable route; it refuses the cream editorial health-page and generic card-dashboard defaults.",
  world:
    "Cool porcelain, navigation ink and periwinkle route fields, with orange reserved for the next consequential action; route lines, stops and open bands replace ornamental cards.",
  story:
    "A visitor understands the GP finder, sees how their words affect the order, and can move from search to a booking handoff without losing context.",
  firstViewport:
    "A crisp navigation bar opens into a cobalt route field: the claim and primary action lead on the left, while a live coverage instrument and three finder stops prove the mechanism.",
  form: "Daylight departures board / route-finding system; grounded candidate 4; seed f009e50c.",
  finish:
    "unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance",
} as const;

/**
 * ONE COLOUR STRATEGY, NOT TWO.
 *
 * The body carried `bg-stone-50 text-stone-900` — Tailwind's own palette, hardcoded — while every
 * surface inside it takes colour from the CSS variables in globals.css. That is two strategies for
 * one job, and it was invisible until dark mode arrived: the tokens inverted, the Tailwind
 * utilities did not, and the margin around the clinician shell stayed cream on a dark page.
 *
 * The body now reads the same tokens as everything else, so there is exactly one place a theme is
 * decided. `min-h-screen` and `antialiased` stay: neither is a colour.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased app-body">
        <script
          id="adhdme-design-direction"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(DESIGN_DIRECTION) }}
        />
        {/* O190: the skip link the guidelines require ("include skip link for main content").
            First tabbable thing on every page; visually hidden until focused. Every page's
            <main> carries id="main-content" for it. */}
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSONLD) }}
        />
        {children}
        <AcknowledgementOfCountry />
        <PrivacyConsent />
        <Analytics />
        {/* O31: Vercel's cookieless pageview analytics — hash-based visitor identity, data
            discarded after 24 hours, nothing shared beyond the host already serving the page.
            ON by the founder's explicit 2026-08-18 instruction to advance attribution (the
            deliberate decision app/analytics.tsx's gate exists to require); GA stays dark
            behind its env switch. The privacy page states this layer unconditionally. */}
        <VercelAnalytics />
      </body>
    </html>
  );
}
