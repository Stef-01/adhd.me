// U3 (O228): the console shell's loading state — every screen under /console shows this one
// line while its data arrives, so a slow store reads as a page on its way rather than a dead one.
import { BOUNDARY_COPY } from "@/compliance/boundary-copy";

export default function ConsoleLoading() {
  return (
    <main id="main-content" className="loading-screen" aria-busy="true">
      <p role="status">{BOUNDARY_COPY.loading.console}</p>
    </main>
  );
}
