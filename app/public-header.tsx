// O189 (founder-directed): the public pages get one spine. The founder's verdict on the join
// page — "no logo, noone can navigate clearly" — turned out to be a census result, not a
// one-page defect: eight public surfaces (about, examples, faq, practices, terms, thanks, the
// three privacy pages) carried breadcrumbs but NO wordmark and nothing shaped like a control.
// The story landing, /approach, /finder, /demo and /clinicians each already carry a mark; this
// component is the same shape — serif wordmark home-link left, one clearly-pressable pill link
// right — in the base palette, used by every page that had none, so the answer to "where am I
// and how do I leave" is the same everywhere (Vercel web-interface-guidelines: real <a>/<Link>
// for navigation, visible hover state, no dead zones).
import Link from "next/link";

export function PublicHeader({
  rightHref = "/finder",
  rightLabel = "Find a GP",
}: {
  rightHref?: string;
  rightLabel?: string;
} = {}) {
  return (
    <header className="site-nav">
      <div className="site-nav-inner">
        <Link href="/" className="site-nav-wordmark" aria-label="ADHD.ME home" translate="no">ADHD.ME</Link>
        <Link href={rightHref} className="site-nav-link">{rightLabel}</Link>
      </div>
    </header>
  );
}
