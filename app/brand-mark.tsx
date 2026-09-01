// O222: the ONE copy of the app-icon art. icon.tsx and apple-icon.tsx were 38 identical lines
// twice — including all six token-mirroring hex literals, which is exactly the per-surface
// restatement the --band-gradient token exists to prevent, reintroduced in TSX (and it had
// already drifted: 340/512 vs 120/180 glyph ratios). Next.js needs the two route FILES, so they
// stay — as thin size declarations calling in here. NOT a metadata route itself (the filename is
// not reserved), and deliberately under app/ so the six literals stay inside the component
// raw-hex census's walk; COMPONENT_HEX_EXCEPTIONS carries this file's entry, and the census's
// declared sites fell 12 → 6 with the dedup.
import { ImageResponse } from "next/og";

/** The band carries the wordmark's initial; the scrim's warm-dark end keeps the white glyph
 * clear of the large-text floor. Glyph at 2/3 of the edge, so every size keeps one ratio. */
export function brandMark(edge: number) {
  const fontSize = Math.round(edge * (2 / 3));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #d07a35 0%, #e08c42 34%, #f4a862 52%, #6f89c3 86%, #5c78b6 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, rgba(16, 12, 9, 0.30) 0%, rgba(16, 12, 9, 0.10) 60%, rgba(16, 12, 9, 0) 100%)",
            color: "#ffffff",
            fontFamily: "Georgia, serif",
            fontSize,
            fontWeight: 500,
          }}
        >
          A
        </div>
      </div>
    ),
    { width: edge, height: edge },
  );
}
