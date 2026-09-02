// O220/O222: the ONE copy of the app-icon art. Next.js needs separate icon and apple-icon route
// files, but both call this size-relative route tile. Keeping the six Satori-only colour literals
// here prevents the installed icon and Apple icon from drifting while preserving the component
// raw-hex census's 12 → 6 reduction.
import { ImageResponse } from "next/og";

/** Navigation ink surrounds a periwinkle field; the initial, line and two route stops remain
 * optically identical at every metadata size. */
export function brandMark(edge: number) {
  const px = (ratio: number) => Math.round(edge * ratio);
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
            padding: `${px(0.082)}px ${px(0.094)}px`,
            borderRadius: px(0.219),
            background: "#5065a6",
            color: "#ffffff",
            fontFamily: "Georgia, serif",
            fontSize: px(0.484),
            fontWeight: 500,
            lineHeight: 0.9,
          }}
        >
          A
          <div
            style={{
              position: "absolute",
              left: px(0.148),
              right: px(0.148),
              bottom: px(0.16),
              height: px(0.023),
              borderRadius: px(0.023),
              background: "#f7f8fc",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: px(0.125),
              bottom: px(0.133),
              width: px(0.078),
              height: px(0.078),
              borderRadius: px(0.078),
              background: "#d47839",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: px(0.125),
              bottom: px(0.133),
              width: px(0.078),
              height: px(0.078),
              borderRadius: px(0.078),
              background: "#f7f8fc",
            }}
          />
        </div>
      </div>
    ),
    { width: edge, height: edge },
  );
}
