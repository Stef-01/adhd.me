// O220 (Phase 1a): the app icon — generated at build like the OG image, never a binary in the
// repo, so the mark stays editable like any other artifact. The redesign turns the initial into a
// compact route tile: navigation ink outside, a periwinkle field, and one orange departure point.
// Hex literals mirror tokens under the same census law as opengraph-image.tsx (Satori renders
// server-side with no stylesheet, so var() is not expressible).
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
          background: "#172033",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            width: "82%",
            height: "82%",
            padding: "42px 48px",
            borderRadius: 112,
            background: "#5065a6",
            color: "#ffffff",
            fontFamily: "Georgia, serif",
            fontSize: 248,
            fontWeight: 500,
            lineHeight: 0.9,
          }}
        >
          A
          <div
            style={{
              position: "absolute",
              left: 76,
              right: 76,
              bottom: 82,
              height: 12,
              borderRadius: 12,
              background: "#f7f8fc",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 64,
              bottom: 68,
              width: 40,
              height: 40,
              borderRadius: 40,
              background: "#d47839",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 64,
              bottom: 68,
              width: 40,
              height: 40,
              borderRadius: 40,
              background: "#f7f8fc",
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
