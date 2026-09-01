// O220 (Phase 1a): the iOS home-screen icon — the same route tile as app/icon.tsx at Apple's
// 180px, in its own route because iOS reads apple-touch-icon specifically. Hex literals mirror
// tokens under the same COMPONENT_HEX_EXCEPTIONS law as the 512px icon.
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
            padding: "15px 17px",
            borderRadius: 39,
            background: "#5065a6",
            color: "#ffffff",
            fontFamily: "Georgia, serif",
            fontSize: 87,
            fontWeight: 500,
            lineHeight: 0.9,
          }}
        >
          A
          <div
            style={{
              position: "absolute",
              left: 27,
              right: 27,
              bottom: 29,
              height: 4,
              borderRadius: 4,
              background: "#f7f8fc",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 23,
              bottom: 24,
              width: 14,
              height: 14,
              borderRadius: 14,
              background: "#d47839",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 23,
              bottom: 24,
              width: 14,
              height: 14,
              borderRadius: 14,
              background: "#f7f8fc",
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
