import { describe, expect, it } from "vitest";
import { reelOf, reelsOf } from "./reels";

describe("a clinician's reels", () => {
  it("reads a reel, a reels and a post link, with or without a handle or query", () => {
    expect(reelOf("https://www.instagram.com/reel/C8abcDEF123/")).toEqual({ id: "C8abcDEF123", embed: "https://www.instagram.com/reel/C8abcDEF123/embed", url: "https://www.instagram.com/reel/C8abcDEF123/" });
    expect(reelOf("instagram.com/reels/C8abcDEF123")).toBeNull();
    expect(reelOf("https://instagram.com/reels/C8abcDEF123?igsh=xyz")?.id).toBe("C8abcDEF123");
    expect(reelOf("https://www.instagram.com/some.clinic/reel/C8abcDEF123/")?.embed).toBe("https://www.instagram.com/reel/C8abcDEF123/embed");
    expect(reelOf("https://www.instagram.com/p/C8abcDEF123/")?.embed).toBe("https://www.instagram.com/p/C8abcDEF123/embed");
  });

  it("embeds nothing that is not an Instagram reel or post", () => {
    for (const link of ["https://evil.example/reel/C8abcDEF123/", "https://www.instagram.com/some.clinic/", "javascript:alert(1)", "https://www.instagram.com.evil.com/reel/C8abcDEF123/"]) expect(reelOf(link), link).toBeNull();
  });

  it("keeps each reel once and at most six", () => {
    const links = ["https://www.instagram.com/reel/AAAAA1/", "https://www.instagram.com/reel/AAAAA1/?x=1", ...Array.from({ length: 8 }, (_, i) => `https://www.instagram.com/reel/BBBBB${i}/`)];
    expect(reelsOf(links).map((r) => r.id)).toEqual(["AAAAA1", "BBBBB0", "BBBBB1", "BBBBB2", "BBBBB3", "BBBBB4"]);
  });
});
