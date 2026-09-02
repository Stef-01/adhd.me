// U3 (O228): what the finder shows while it streams in — one line on paper, announced once,
// instead of a blank frame. The finder's own screens take over the moment they arrive.
//
// O230: this was `app/finder/loading.tsx`. The finder is the root route now, so the boundary
// moved with it — left where it was, it would have guarded a route that no longer exists while
// the app's own front door streamed into a blank frame.
import { BOUNDARY_COPY } from "@/compliance/boundary-copy";

export default function AppLoading() {
  return (
    <main id="main-content" className="loading-screen" aria-busy="true">
      <p role="status">{BOUNDARY_COPY.loading.finder}</p>
    </main>
  );
}
