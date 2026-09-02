// U3 (O228): what the finder route shows while it streams in — one line on paper, announced
// once, instead of a blank frame. The finder's own screens take over the moment they arrive.
import { BOUNDARY_COPY } from "@/compliance/boundary-copy";

export default function FinderLoading() {
  return (
    <main id="main-content" className="loading-screen" aria-busy="true">
      <p role="status">{BOUNDARY_COPY.loading.finder}</p>
    </main>
  );
}
