import Link from "next/link";
import { AppTabs } from "./app-tabs";

/** The same navigation stays mounted across the three patient destinations. */
export function PlatformHeader() {
  return <header className="platform-header">
    <Link className="platform-brand" href="/" aria-label="ADHD.ME, home" translate="no">
      <span>ADHD.ME</span>
    </Link>
    <AppTabs />
    <div className="platform-utilities"><Link className="platform-help" href="/faq">Help & answers <span aria-hidden="true">↗</span></Link><div id="platform-settings" /></div>
  </header>;
}
