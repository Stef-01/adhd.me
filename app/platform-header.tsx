import Link from "next/link";
import { AppTabs } from "./app-tabs";

/**
 * The same navigation stays mounted across the three patient destinations.
 *
 * URGENT HELP IS IN THE HEADER, NOT BEHIND ANYTHING (Charmaine Bernie, occupational therapist and
 * service-access researcher, 2026-09-11). The app already had a crisis pathway, but it could only
 * be reached by writing something that tripped a safety rule — which is the wrong way round for a
 * product whose cohort is 16–25, where comorbidity is common and the risk she named is highest.
 * Her word for always-visible signposting was non-negotiable. So it sits beside the two utilities
 * on every patient screen, at the same size as them: findable without being alarming, because a
 * red banner over somebody's whole app is its own harm.
 */
export function PlatformHeader() {
  return <header className="platform-header">
    <Link className="platform-brand" href="/" aria-label="ADHD.ME, home" translate="no">
      <span>ADHD.ME</span>
    </Link>
    <AppTabs />
    <div className="platform-utilities">
      <Link className="platform-urgent" href="/urgent">Urgent help</Link>
      <Link className="platform-help" href="/faq">Help &amp; answers <span aria-hidden="true">↗</span></Link>
      <div id="platform-settings" />
    </div>
  </header>;
}
