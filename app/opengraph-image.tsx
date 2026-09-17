// Launch item 13: the image a shared link unfurls to. Generated, not a binary in the repo, so
// the mark and the sentence stay editable like any other copy. The composition is the
// reference's own share card: the yellow field, the stacked mark, one headline in ink, one line.
import { ImageResponse } from "next/og";
import { SHARE_IMAGE } from "@/seo/pages";

export const runtime = "edge";
// From the register, so the tag a page emits and the pixels this route draws are one fact.
export const alt = SHARE_IMAGE.alt;
export const size = { width: SHARE_IMAGE.width, height: SHARE_IMAGE.height };
export const contentType = SHARE_IMAGE.type;

export default async function OpengraphImage() {
  // The two weights the card sets, instanced from the variable font the pages use. Fetched inside
  // the handler, where the request gives the relative URL its base (see brand-mark.tsx).
  const [bold, medium] = await Promise.all([
    fetch(new URL("./plus-jakarta-sans-800.ttf", import.meta.url)).then((res) => res.arrayBuffer()),
    fetch(new URL("./plus-jakarta-sans-700.ttf", import.meta.url)).then((res) => res.arrayBuffer()),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 72px 76px",
          background: "#f1bc31",
          color: "#1a1c1c",
          fontFamily: "Plus Jakarta Sans",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 13, paddingLeft: 2 }}>ADHD</div>
          <div style={{ display: "flex", alignItems: "baseline", marginTop: -2 }}>
            <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -2 }}>me</div>
            <div style={{ width: 18, height: 18, marginLeft: 4, borderRadius: 18, background: "#ff4d2e" }} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.02, maxWidth: 960, letterSpacing: "-0.04em" }}>
            Assessment you can actually reach.
          </div>
          <div style={{ fontSize: 30, marginTop: 30, maxWidth: 900, lineHeight: 1.35, fontWeight: 700 }}>
            Describe the support you are looking for. See why each listed provider appears.
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Plus Jakarta Sans", data: bold, weight: 800, style: "normal" }, { name: "Plus Jakarta Sans", data: medium, weight: 700, style: "normal" }] },
  );
}
