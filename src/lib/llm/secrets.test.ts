// No OpenAI secret key in the tree. The key lives in .env.local (ignored by .gitignore's `.env*`) on
// the machine that runs live evals; a key pasted into any tracked file fails this test and CI.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Project, service-account and admin keys, and the older 48-character form; not "task-based". */
export const OPENAI_KEY = /(?<![A-Za-z0-9_-])sk-(?:(?:proj|svcacct|admin)-[A-Za-z0-9_-]{20,}|[A-Za-z0-9]{40,})/;

/** Tracked text files with anything key-shaped, from git's own index (binaries skipped); null outside git. */
function candidates(): string[] | null {
  try {
    return execFileSync("git", ["grep", "-IlE", "sk-[A-Za-z0-9_-]{20,}"], { encoding: "utf8" }).split("\n").filter(Boolean);
  } catch (error) {
    return (error as { status?: number }).status === 1 ? [] : null; // 1: nothing matched
  }
}

describe("secrets", () => {
  it("knows a key when it sees one, and a word that only contains sk- is not one", () => {
    expect(OPENAI_KEY.test(`sk-proj-${"A1b2_C3d4-".repeat(8)}`)).toBe(true);
    expect(OPENAI_KEY.test(`OPENAI_API_KEY=sk-${"a1B2c3D4".repeat(6)}`)).toBe(true);
    expect(OPENAI_KEY.test("a task-based-approach-for-every-screen-and-form")).toBe(false);
    expect(OPENAI_KEY.test("multiple-ask-languages-in-one-request-and-more")).toBe(false);
  });

  it("finds no OpenAI secret key in any tracked file", () => {
    const files = candidates();
    if (!files) return;
    expect(files.filter((file) => OPENAI_KEY.test(readFileSync(file, "utf8")))).toEqual([]);
  });
});
