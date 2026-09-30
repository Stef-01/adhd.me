import { existsSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CLIPS, clipUrl } from "./clips";
import { SAY_IDS, SENTENCES } from "./plan";

describe("the recordings of what the finder says", () => {
  it("hold every sentence, as it is written now: a sentence changed is recorded again (scripts/voice-clips.mjs)", () => {
    expect(Object.keys(CLIPS)).toEqual([...SAY_IDS]);
    for (const id of SAY_IDS) {
      expect(CLIPS[id].text, id).toBe(SENTENCES[id].text);
      expect(CLIPS[id].spoken, id).toBe(SENTENCES[id].spoken);
    }
  });

  it("are the files the list says they are", () => {
    for (const id of SAY_IDS) {
      const file = `public/voice/${id}.mp3`;
      expect(existsSync(file), file).toBe(true);
      expect(statSync(file).size, file).toBe(CLIPS[id].bytes);
      expect(createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 12), file).toBe(CLIPS[id].sha);
      expect(clipUrl(id)).toBe(`/voice/${id}.mp3?v=${CLIPS[id].sha}`);
    }
  });

  it("are short: a question is said in under three seconds, and all of them weigh less than half a megabyte", () => {
    for (const id of SAY_IDS) if (id !== "urgent") expect(CLIPS[id].seconds, id).toBeLessThan(3);
    expect(SAY_IDS.reduce((sum, id) => sum + CLIPS[id].bytes, 0)).toBeLessThan(500_000);
  });
});
