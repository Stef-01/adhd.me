// Launch item 13: the image a shared link unfurls to. Generated, not a binary in the repo, so
// the wordmark and the sentence stay editable like any other copy.
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ADHD.ME — assessment you can actually reach";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "stretch",
          gap: 56,
          padding: "64px",
          background: "#f7f8fc",
          color: "#172033",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "space-between", padding: "12px 0" }}>
          <div style={{ fontSize: 40, fontWeight: 750, letterSpacing: "-0.03em" }}>ADHD.ME</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 76, lineHeight: 1.02, maxWidth: 720, letterSpacing: "-0.035em" }}>
              Assessment you can actually reach.
            </div>
            <div style={{ fontSize: 28, marginTop: 34, maxWidth: 720, color: "#565f70", lineHeight: 1.35 }}>
              Describe the GP you are looking for. See why each listed GP appears.
            </div>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            width: 330,
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "42px 38px",
            borderRadius: 44,
            background: "#5065a6",
            color: "#ffffff",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.08em" }}>YOUR ROUTE</div>
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 60, paddingLeft: 44 }}>
            <div style={{ position: "absolute", left: 12, top: 16, bottom: 16, width: 4, borderRadius: 4, background: "currentColor", opacity: 0.7 }} />
            <div style={{ position: "absolute", left: 0, top: 4, width: 28, height: 28, borderRadius: 28, background: "#d47839" }} />
            <div style={{ fontSize: 24, fontWeight: 650 }}>Your words</div>
            <div style={{ position: "absolute", left: 3, top: 96, width: 22, height: 22, borderRadius: 22, border: "4px solid currentColor" }} />
            <div style={{ fontSize: 24, fontWeight: 650 }}>Declared fit</div>
            <div style={{ position: "absolute", left: 3, bottom: 6, width: 22, height: 22, borderRadius: 22, border: "4px solid currentColor" }} />
            <div style={{ fontSize: 24, fontWeight: 650 }}>Booking handoff</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
