// Launch item 19: analytics, behind an explicit switch.
//
// GATED ON PURPOSE, and dark by default. This is a site people reach while looking for ADHD
// care, so measurement is a decision the founder makes deliberately, not a default this tree
// ships silently — the same posture as founder gate 4's "no production credentials": no
// measurement ID lives in this repository. Setting NEXT_PUBLIC_GA_ID at deploy time turns it
// on; the privacy notice's analytics section renders under the same switch, so the notice and
// the behaviour cannot disagree. GA4 as configured here does not use advertising signals, and
// Google discards instrument IPs on receipt.
import Script from "next/script";

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export function Analytics() {
  if (!GA_ID) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}', { allow_google_signals: false });`}
      </Script>
    </>
  );
}
