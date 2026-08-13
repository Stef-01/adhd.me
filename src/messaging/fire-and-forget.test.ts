import { describe, expect, it } from "vitest";
import { assertFireAndForgetSafe, MockSmsAdapter, type SmsAdapter } from "./adapter";
import { TwilioSmsAdapter } from "./twilio";

describe("W51 A1 — fire-and-forget safety guard", () => {
  it("accepts the infallible mock", () => {
    expect(() => assertFireAndForgetSafe(new MockSmsAdapter())).not.toThrow();
  });

  it("rejects any adapter that has not declared itself infallible", () => {
    const fallible: SmsAdapter = { async send() { return { delivered: false }; } };
    expect(() => assertFireAndForgetSafe(fallible)).toThrow(/not fire-and-forget safe/);
  });

  it("rejects the real Twilio adapter — a failed send must never be logged as sent", () => {
    const twilio = new TwilioSmsAdapter(
      {
        accountSid: "AC-test",
        authToken: "test",
        fromNumber: "+61400000000",
        baseUrl: "https://sandbox.invalid",
        maxAttempts: 1,
        retryDelaysMs: [0],
      },
      async () => {},
    );
    expect(() => assertFireAndForgetSafe(twilio)).toThrow(/founder gate G3/);
  });
});
