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
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#fbfaf7",
          color: "#191a17",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.01em", fontFamily: "Arial, sans-serif" }}>ADHD.ME</div>
        <div style={{ fontSize: 84, marginTop: 40, lineHeight: 1.1, maxWidth: 980 }}>
          Assessment you can actually reach.
        </div>
        <div style={{ fontSize: 32, marginTop: 44, color: "#6e706a", fontFamily: "Arial, sans-serif" }}>
          GPs who do ADHD assessment, in Beecroft and on the Gold Coast.
        </div>
      </div>
    ),
    size,
  );
}
