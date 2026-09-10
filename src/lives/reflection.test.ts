// §37: one question after a run, never about severity, answered as a resonance signal.

import { describe, expect, it } from "vitest";
import { GAMES } from "./games";
import { REFLECTION_BANNED, REFLECTION_LIMIT, REFLECTION_NONE, REFLECTION_QUESTION, reflectionOptions } from "./reflection";

describe("§37 the post-run reflection", () => {
  it("asks one question and it is not about how bad anything is", () => {
    const text = [REFLECTION_QUESTION, REFLECTION_NONE, ...GAMES.map((g) => g.title)].join(" ").toLowerCase();
    for (const word of REFLECTION_BANNED) expect(text, word).not.toContain(word);
    expect(REFLECTION_QUESTION.endsWith("?")).toBe(true);
  });

  it("offers the moments met, most recent first, each once, capped", () => {
    const ids = GAMES.slice(0, 9).map((g) => g.id);
    const options = reflectionOptions({ encounteredGameIds: [...ids, ids[0]!] });
    expect(options).toHaveLength(REFLECTION_LIMIT);
    expect(options[0]!.gameId).toBe(ids[0]);
    expect(new Set(options.map((o) => o.gameId)).size).toBe(options.length);
    expect(options.every((o) => o.label.length > 0)).toBe(true);
  });

  it("offers nothing when nothing was met", () => {
    expect(reflectionOptions({ encounteredGameIds: [] })).toEqual([]);
  });
});
