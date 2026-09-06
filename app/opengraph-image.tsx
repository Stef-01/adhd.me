// Launch item 13: the image a shared link unfurls to. Generated, not a binary in the repo, so
// the wordmark and the sentence stay editable like any other copy.
import { ImageResponse } from "next/og";
import { SHARE_IMAGE } from "@/seo/pages";

export const runtime = "edge";
// From the register, so the tag a page emits and the pixels this route draws are one fact.
export const alt = SHARE_IMAGE.alt;
export const size = { width: SHARE_IMAGE.width, height: SHARE_IMAGE.height };
export const contentType = SHARE_IMAGE.type;

/** The three moments the card names, in the order the finder walks them. */
const STEPS = ["Your words", "Declared fit", "Booking handoff"] as const;
/** Row height per step; the connecting line runs from the first row's centre to the last's. */
const ROW = 64;

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
          background: "#fff8f6",
          color: "#221a16",
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
          {/*
            Each step is a ROW that owns its marker, and the line is the only thing positioned by
            hand. The first cut placed all three markers absolutely, tuned against label heights
            that later changed, and the card shipped with the third ring a whole row below
            "Booking handoff" — on the image every shared link unfurls to. A marker that lives in
            the same flex row as its label cannot drift from it.
          */}
          <div style={{ position: "relative", display: "flex", flexDirection: "column" }}>
            <div style={{ position: "absolute", left: 12, top: ROW / 2, bottom: ROW / 2, width: 4, borderRadius: 4, background: "currentColor", opacity: 0.7 }} />
            {STEPS.map((step, i) => (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: 16, height: ROW }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28 }}>
                  {i === 0 ? (
                    <div style={{ width: 28, height: 28, borderRadius: 28, background: "#d47839" }} />
                  ) : (
                    // Filled with the card's own colour so the line does not run through the ring.
                    <div style={{ width: 22, height: 22, borderRadius: 22, border: "4px solid currentColor", background: "#5065a6" }} />
                  )}
                </div>
                <div style={{ fontSize: 24, fontWeight: 650 }}>{step}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
