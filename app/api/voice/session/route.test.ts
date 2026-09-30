// The voice finder's call route with no paid call: the network is a stub that records what the
// route sends to OpenAI's realtime calls endpoint and answers as it would.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { keyPaused, resetKeyPause } from "@/lib/llm/key-pause";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetVoiceSessions } from "@/voice/sessions";
import { POST } from "./route";

const OFFER = "v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\n";
const ANSWER = "v=0\r\no=- 9 2 IN IP4 0.0.0.0\r\ns=-\r\n";
const call = (body: string = OFFER, caller = "203.0.113.7") =>
  POST(new Request("http://local/api/voice/session", {
    method: "POST",
    headers: { "content-type": "application/sdp", "x-forwarded-for": caller },
    body,
  }));

let network: ReturnType<typeof vi.fn>;
beforeEach(() => {
  resetRateLimits();
  resetKeyPause();
  resetVoiceSessions();
  vi.stubEnv("ADHDME_VOICE", "1");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("ADHDME_VOICE_DAILY_SESSIONS", "");
  vi.stubEnv("ADHDME_VOICE_MODEL", "");
  network = vi.fn(async () => new Response(ANSWER, { status: 201, headers: { location: "/v1/realtime/calls/rtc_test" } }));
  vi.stubGlobal("fetch", network);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/voice/session", () => {
  it("is off when turned off or without a key, and never calls out", async () => {
    vi.stubEnv("ADHDME_VOICE", "0");
    expect((await call()).status).toBe(404);
    vi.stubEnv("ADHDME_VOICE", "1");
    vi.stubEnv("OPENAI_API_KEY", "");
    expect((await call()).status).toBe(404);
    expect(network).not.toHaveBeenCalled();
  });

  it("refuses a body that is not an offer", async () => {
    expect((await call("hello")).status).toBe(400);
    expect((await call(`v=0${"a".repeat(20_001)}`)).status).toBe(400);
    expect(network).not.toHaveBeenCalled();
  });

  it("sends the offer and the model's session with the key, and answers with the SDP", async () => {
    const reply = await call();
    expect(reply.status).toBe(201);
    expect(reply.headers.get("content-type")).toBe("application/sdp");
    expect(reply.headers.get("cache-control")).toBe("no-store");
    expect(await reply.text()).toBe(ANSWER);

    const [url, init] = network.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/realtime/calls");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer test-key");
    const form = init.body as FormData;
    expect(form.get("sdp")).toBe(OFFER);
    const session = JSON.parse(String(form.get("session")));
    expect(session).toMatchObject({ type: "realtime", model: "gpt-realtime-2.1-mini" });
    // The app asks the questions: the model is told so, never answers a turn on its own, and has one tool.
    expect(session.instructions).toContain("The app asks the person its questions");
    expect(session.audio.input.turn_detection.create_response).toBe(false);
    expect(session.audio.input.transcription).toEqual({ model: "gpt-4o-transcribe", language: "en" });
    expect(session.tools.map((t: { name: string }) => t.name)).toEqual(["urgent_help"]);
  });

  it("never returns the key or OpenAI's error to the browser, and pauses on a key that fails", async () => {
    network.mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Incorrect API key provided: test-key" } }), { status: 401 }));
    const reply = await call();
    expect(reply.status).toBe(502);
    expect(await reply.text()).not.toContain("test-key");
    expect(keyPaused()).toBe(true);
    expect((await call()).status).toBe(429);
    expect(network).toHaveBeenCalledTimes(1);
  });

  it("answers a network failure with 502", async () => {
    network.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect((await call()).status).toBe(502);
    expect(keyPaused()).toBe(false);
  });

  it("stops one caller at 8 calls in ten minutes", async () => {
    for (let i = 0; i < 8; i++) expect((await call()).status).toBe(201);
    expect((await call()).status).toBe(429);
    expect((await call(OFFER, "198.51.100.2")).status).toBe(201);
  });

  it("stops everybody at the day's cap", async () => {
    vi.stubEnv("ADHDME_VOICE_DAILY_SESSIONS", "2");
    expect((await call(OFFER, "a")).status).toBe(201);
    expect((await call(OFFER, "b")).status).toBe(201);
    expect((await call(OFFER, "c")).status).toBe(429);
    expect(network).toHaveBeenCalledTimes(2);
  });
});
