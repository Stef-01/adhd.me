// U3 (O228): what the finder shows while it streams in — one line on paper, announced once,
// instead of a blank frame. The finder's own screens take over the moment they arrive.
//
// O230: this was `app/finder/loading.tsx`. The finder is the root route now, so the boundary moved
// with it — into the `(app)` route group, NOT to `app/`. At the root it would guard every route in
// the tree, and a root Suspense boundary makes a `notFound()` or a thrown render error stream as a
// 200 with this line instead of the 404 or 500 it is. That is what the first attempt did and what
// three e2e specs caught.
import { BOUNDARY_COPY } from "@/compliance/boundary-copy";

export default function AppLoading() {
  return (
    <main id="main-content" className="loading-screen" aria-busy="true">
      <p role="status">{BOUNDARY_COPY.loading.finder}</p>
    </main>
  );
}
