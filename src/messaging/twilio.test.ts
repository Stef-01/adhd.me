// W31 verify gate: sandbox integration tests — the adapter drives a real in-process
// HTTP fake of the Twilio API (no live endpoints, no real credentials; G3 enforced).

import { createHmac } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ClinicianId, Invitation, InvitationId, Patient, PatientId, PracticeId } from "@/domain/types";
import {
  applyInboundStop,
  isStopMessage,
  TwilioSmsAdapter,
  validateTwilioSignature,
  type TwilioConfig,
} from "./twilio";

// ---- fake Twilio sandbox -----------------------------------------------------------
interface RecordedRequest {
  auth: string | undefined;
  form: URLSearchParams;
}
let server: Server;
let baseUrl: string;
let recorded: RecordedRequest[] = [];
/** Each entry is the HTTP status for the next request; empty → 201 success. */
let script: number[] = [];
let nextSid = 0;

function handler(req: IncomingMessage, res: ServerResponse) {
  let raw = "";
  req.on("data", (c: Buffer) => (raw += c.toString()));
  req.on("end", () => {
    recorded.push({ auth: req.headers.authorization, form: new URLSearchParams(raw) });
    const status = script.shift() ?? 201;
    if (status !== 201) {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ code: status, message: "scripted failure" }));
      return;
    }
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ sid: `SM${String(nextSid++).padStart(4, "0")}`, status: "queued" }));
  });
}

beforeAll(async () => {
  server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("no server port");
  baseUrl = `http://127.0.0.1:${address.port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
beforeEach(() => {
  recorded = [];
  script = [];
});

const config = (): TwilioConfig => ({
  accountSid: "AC_sandbox_test",
  authToken: "sandbox-auth-token",
  fromNumber: "+15005550006", // Twilio's magic test number
  baseUrl,
  maxAttempts: 3,
  retryDelaysMs: [10, 20],
});

const sms = { to: "synthetic:+61400000001", body: "test body", invitationId: "inv-1" };

// ---- tests --------------------------------------------------------------------------
describe("W31 Twilio adapter — sandbox integration", () => {
  it("G3 guard: any twilio.com endpoint is refused at construction", () => {
    expect(() => new TwilioSmsAdapter({ ...config(), baseUrl: "https://api.twilio.com" })).toThrow(
      "founder gate G3",
    );
    expect(() => new TwilioSmsAdapter({ ...config(), baseUrl: "https://sub.twilio.com" })).toThrow();
    expect(() => new TwilioSmsAdapter(config())).not.toThrow();
  });

  it("sends the correct form with basic auth and records the message sid", async () => {
    const adapter = new TwilioSmsAdapter(config());
    const result = await adapter.send(sms);
    expect(result.delivered).toBe(true);
    expect(recorded).toHaveLength(1);
    const req = recorded[0]!;
    const expectedAuth = Buffer.from("AC_sandbox_test:sandbox-auth-token").toString("base64");
    expect(req.auth).toBe(`Basic ${expectedAuth}`);
    expect(req.form.get("To")).toBe(sms.to);
    expect(req.form.get("From")).toBe("+15005550006");
    expect(req.form.get("Body")).toBe(sms.body);
    const [message] = [...adapter.messages.values()];
    expect(message).toMatchObject({ invitationId: "inv-1", status: "queued" });
  });

  it("retry policy: 5xx and 429 retry with configured backoff; success on third attempt", async () => {
    const slept: number[] = [];
    const adapter = new TwilioSmsAdapter(config(), async (ms) => {
      slept.push(ms);
    });
    script = [500, 429];
    const result = await adapter.send(sms);
    expect(result.delivered).toBe(true);
    expect(recorded).toHaveLength(3);
    expect(slept).toEqual([10, 20]);
  });

  it("a 400 is permanent: one attempt, no retries, not delivered", async () => {
    const adapter = new TwilioSmsAdapter(config(), async () => {});
    script = [400];
    const result = await adapter.send(sms);
    expect(result.delivered).toBe(false);
    expect(recorded).toHaveLength(1);
  });

  it("exhausted retries give up honestly", async () => {
    const slept: number[] = [];
    const adapter = new TwilioSmsAdapter(config(), async (ms) => {
      slept.push(ms);
    });
    script = [500, 500, 503];
    const result = await adapter.send(sms);
    expect(result.delivered).toBe(false);
    expect(recorded).toHaveLength(3); // maxAttempts
    expect(slept).toEqual([10, 20]); // no sleep after the final attempt
  });

  it("delivery receipts update the message record; unknown sids are ignored", async () => {
    const adapter = new TwilioSmsAdapter(config());
    await adapter.send(sms);
    const sid = [...adapter.messages.keys()][0]!;
    const updated = adapter.applyReceipt({ MessageSid: sid, MessageStatus: "delivered" });
    expect(updated?.status).toBe("delivered");
    expect(adapter.messages.get(sid)?.status).toBe("delivered");
    expect(adapter.applyReceipt({ MessageSid: "SM-ghost", MessageStatus: "delivered" })).toBeNull();
    expect(adapter.applyReceipt({ MessageSid: sid, MessageStatus: "exploded" })).toBeNull();
  });
});

describe("W31 STOP webhook", () => {
  const authToken = "sandbox-auth-token";
  const webhookUrl = "https://hooks.careyield.test/sms/inbound";
  const patient: Patient = {
    id: "pat-1" as PatientId,
    practiceId: "prac-1" as PracticeId,
    usualClinicianId: "cli-1" as ClinicianId,
    smsConsent: true,
    optedOut: false,
    lastAttendedAt: "2025-01-01",
    futureBookingAt: null,
    activeRecall: false,
    chronicCare: false,
    holdout: false,
  };
  const invitation: Invitation = {
    id: "inv-9" as InvitationId,
    practiceId: "prac-1" as PracticeId,
    patientId: patient.id,
    clinicianId: "cli-1" as ClinicianId,
    sessionDate: "2026-08-15",
    status: "sent",
    sentAt: "2026-08-09T02:00:00Z",
  };
  const phones = new Map([["+61400000001", patient]]);

  function sign(params: Record<string, string>): string {
    const data = webhookUrl + Object.keys(params).sort().map((k) => k + params[k]).join("");
    return createHmac("sha1", authToken).update(data).digest("base64");
  }

  it("signature validation follows Twilio's algorithm and rejects tampering", () => {
    const params = { From: "+61400000001", Body: "STOP" };
    const signature = sign(params);
    expect(validateTwilioSignature(authToken, webhookUrl, params, signature)).toBe(true);
    expect(validateTwilioSignature(authToken, webhookUrl, { ...params, Body: "HI" }, signature)).toBe(false);
    expect(validateTwilioSignature("wrong-token", webhookUrl, params, signature)).toBe(false);
  });

  it("a signed STOP opts the patient out terminally through handleStop", () => {
    const params = { From: "+61400000001", Body: "  Stop " };
    const result = applyInboundStop(authToken, webhookUrl, params, sign(params), phones, [invitation]);
    expect(result?.patient.optedOut).toBe(true);
    expect(result?.invitations[0]?.status).toBe("opted_out");
  });

  it("keyword variants match; ordinary replies do not", () => {
    for (const word of ["STOP", "unsubscribe", "Cancel", "QUIT", "end", "stopall"]) {
      expect(isStopMessage(word)).toBe(true);
    }
    expect(isStopMessage("please stop sending me these")).toBe(false); // full-sentence ≠ keyword (Twilio semantics)
    expect(isStopMessage("thanks")).toBe(false);
  });

  it("refuses unsigned/tampered webhooks and unknown senders without throwing", () => {
    const params = { From: "+61400000001", Body: "STOP" };
    expect(applyInboundStop(authToken, webhookUrl, params, "bad-signature", phones, [invitation])).toBeNull();
    const stranger = { From: "+61499999999", Body: "STOP" };
    expect(applyInboundStop(authToken, webhookUrl, stranger, sign(stranger), phones, [invitation])).toBeNull();
    const reply = { From: "+61400000001", Body: "see you then" };
    expect(applyInboundStop(authToken, webhookUrl, reply, sign(reply), phones, [invitation])).toBeNull();
  });
});
