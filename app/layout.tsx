import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "./analytics";
import { PrivacyConsent } from "./privacy-consent";
import { SITE_URL } from "./site";

/**
 * Launch items 11–13 + 17. The template gives every page a UNIQUE title while keeping the site
 * name (pages set their own first half); the OpenGraph/Twitter defaults make a shared link
 * unfurl with the generated card in app/opengraph-image.tsx; metadataBase makes every relative
 * URL absolute from the one place the site's address is decided.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ADHD.ME: assessment you can actually reach",
    template: "%s · ADHD.ME",
  },
  description:
    "Find a GP in Beecroft or on the Gold Coast who does ADHD assessment, in your language, at a practice you can get to.",
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
      areaServed: [
        { "@type": "Place", name: "Beecroft, NSW, Australia" },
        { "@type": "Place", name: "Gold Coast, QLD, Australia" },
      ],
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
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSONLD) }}
        />
        {children}
        <PrivacyConsent />
        <Analytics />
      </body>
    </html>
  );
}
