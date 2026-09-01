// O220 (Phase 1a): the iOS home-screen icon — same art as app/icon.tsx at Apple's 180px, in its
// own route because iOS reads apple-touch-icon specifically. Hex literals mirror tokens under the
// same COMPONENT_HEX_EXCEPTIONS law as the 512px icon.
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
            fontSize: 120,
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
