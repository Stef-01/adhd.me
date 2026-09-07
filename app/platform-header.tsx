import Link from "next/link";
import { AppTabs } from "./app-tabs";

/** The same navigation stays mounted across the three patient destinations. */
export function PlatformHeader() {
  return <header className="platform-header">
    <Link className="platform-brand" href="/" aria-label="ADHD.ME, home" translate="no">
      <svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="12" fill="currentColor"/><path d="M11 21c0-5 7-9 10-4s8 1 8-3M11 26c0-5 7-9 10-4s8 1 8-3" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round"/></svg>
      <span>ADHD.ME</span>
    </Link>
    <AppTabs />
    <div className="platform-utilities"><Link className="platform-help" href="/faq">Help & answers <span aria-hidden="true">↗</span></Link><div id="platform-settings" /></div>
  </header>;
}
