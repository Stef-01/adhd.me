// O220/O222: the ONE copy of the app-icon art. Next.js needs separate icon and apple-icon route
// files, but both call this size-relative route tile. Keeping the colour literals here prevents
// the installed icon and Apple icon from drifting.
import { ImageResponse } from "next/og";

/** The reference's own icon: the yellow field edge to edge, "me" in ink, the warm-red point. */
export async function brandMark(edge: number) {
  const px = (ratio: number) => Math.round(edge * ratio);
  // Fetched inside the handler, where the request gives the relative URL its base: at module
  // level the same fetch rejects while the build collects page data, as an unhandled rejection.
  // The face is instanced from the variable font the pages use (fontTools, wght 800).
  const data = await fetch(new URL("./plus-jakarta-sans-800.ttf", import.meta.url)).then((res) => res.arrayBuffer());
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f1bc31",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            marginLeft: px(-0.04),
            color: "#1a1c1c",
            fontFamily: "Plus Jakarta Sans",
            fontSize: px(0.62),
            fontWeight: 800,
            letterSpacing: px(-0.035),
            lineHeight: 0.78,
          }}
        >
          me
          <div
            style={{
              width: px(0.09),
              height: px(0.09),
              marginLeft: px(0.03),
              marginBottom: px(0.05),
              borderRadius: px(0.09),
              background: "#ff4d2e",
            }}
          />
        </div>
      </div>
    ),
    { width: edge, height: edge, fonts: [{ name: "Plus Jakarta Sans", data, weight: 800, style: "normal" }] },
  );
}
