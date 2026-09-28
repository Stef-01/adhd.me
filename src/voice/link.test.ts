// A call started by the tap (startLink) keeps everything it says until the voice screen claims it,
// and a call nobody claims closes itself. Driven by the scripted call, so no microphone.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerEvent } from "./conversation";
import { claimLink, startLink } from "./link";
// Loaded up front, so the call's own dynamic import settles inside the fake clock.
import "./fake-link";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("window", { __adhdmeVoiceFake: true });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function handlers() {
  const heard: string[] = [];
  return {
    heard,
    onOpen: () => heard.push("open"),
    onEvent: (event: ServerEvent) => heard.push(event.type),
    onFail: () => heard.push("fail"),
  };
}

describe("a call started in the tap", () => {
  it("hands the screen everything it said before the screen was there, in order", async () => {
    startLink();
    await vi.advanceTimersByTimeAsync(500);
    const screen = handlers();
    const link = await claimLink(screen);
    expect(screen.heard).toEqual(["open"]);
    link.emit({ type: "response.create" });
    await vi.advanceTimersByTimeAsync(1000);
    expect(screen.heard.slice(1, 3)).toEqual(["response.created", "output_audio_buffer.started"]);
    link.close();
  });

  it("is claimed once; the next screen starts its own", async () => {
    startLink();
    const first = claimLink(handlers());
    const second = claimLink(handlers());
    expect(second).not.toBe(first);
    (await first).close();
    (await second).close();
  });

  it("closes itself when no screen claims it", async () => {
    startLink();
    await vi.advanceTimersByTimeAsync(10_500);
    // Claimed too late: a fresh call, not the dropped one.
    const late = handlers();
    const link = await claimLink(late);
    await vi.advanceTimersByTimeAsync(200);
    expect(late.heard).toEqual(["open"]);
    link.close();
  });
});
