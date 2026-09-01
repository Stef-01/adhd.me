// O220 (Phase 1a): the app icon — generated at build like the OG image, never a binary in the
// repo, so the mark stays editable like any other artifact. The band carries the wordmark's
// initial: the brand's strongest signal (the O216 gradient), with the serif "A" on its scrim-dark
// warm end where white type clears the large-text floor. Hex literals mirror the --hero-* and
// --on-ground tokens under the same census law as opengraph-image.tsx (Satori renders server-side
// with no stylesheet, so var() is not expressible; COMPONENT_HEX_EXCEPTIONS carries the count).
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
            fontSize: 340,
            fontWeight: 500,
          }}
        >
          A
        </div>
      </div>
    ),
    size,
  );
}
