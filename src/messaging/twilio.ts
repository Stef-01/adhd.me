// W31: Twilio adapter — sandbox only. Founder gate G3 (live SMS) is enforced IN CODE:
// the constructor refuses any twilio.com endpoint, so this adapter can only ever talk
// to a sandbox/fake base URL until the gate opens (removing that guard is the gate).
// Credentials are injected, never defaulted, never committed.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { Invitation, Patient } from "@/domain/types";
import { handleStop, type OutboundSms, type SmsAdapter } from "./adapter";

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  /** Sandbox/fake API origin. Anything at twilio.com is refused (G3). */
  baseUrl: string;
  /** Total attempts per message (first try + retries). */
  maxAttempts: number;
  /** Backoff between attempts, ms; last entry repeats if attempts exceed it. */
  retryDelaysMs: number[];
}

export type Sleep = (ms: number) => Promise<void>;

export type TwilioMessageStatus = "queued" | "sent" | "delivered" | "undelivered" | "failed";

export interface SentMessage {
  messageSid: string;
  invitationId: string;
  status: TwilioMessageStatus;
}

/** Statuses a Twilio status callback may carry (delivery receipts). */
const RECEIPT_STATUSES: readonly TwilioMessageStatus[] = [
  "queued",
  "sent",
  "delivered",
  "undelivered",
  "failed",
];

export class TwilioSmsAdapter implements SmsAdapter {
  /** Message records by sid — delivery receipts update these. */
  readonly messages = new Map<string, SentMessage>();

  constructor(
    private readonly config: TwilioConfig,
    private readonly sleep: Sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {
    if (/(^|\.)twilio\.com/i.test(new URL(config.baseUrl).hostname)) {
      throw new Error("founder gate G3: live Twilio endpoints are not permitted in this phase");
    }
  }

  async send(message: OutboundSms): Promise<{ delivered: boolean }> {
    const url = `${this.config.baseUrl}/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;
    const auth = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString("base64");
    const body = new URLSearchParams({
      To: message.to,
      From: this.config.fromNumber,
      Body: message.body,
    });

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      let response: Response | null = null;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        });
      } catch {
        response = null; // network failure — retryable
      }

      if (response?.ok) {
        const payload = (await response.json()) as { sid?: string; status?: string };
        const sid = payload.sid ?? `unknown-${message.invitationId}`;
        this.messages.set(sid, {
          messageSid: sid,
          invitationId: message.invitationId,
          status: (payload.status as TwilioMessageStatus) ?? "queued",
        });
        return { delivered: true };
      }

      // 4xx (other than 429) is a permanent refusal — retrying cannot fix the request.
      if (response !== null && response.status < 500 && response.status !== 429) {
        return { delivered: false };
      }
      if (attempt < this.config.maxAttempts) {
        const delays = this.config.retryDelaysMs;
        await this.sleep(delays[Math.min(attempt - 1, delays.length - 1)] ?? 0);
      }
    }
    return { delivered: false };
  }

  /** Apply a delivery receipt (status callback). Unknown sids are ignored, not invented. */
  applyReceipt(form: Record<string, string>): SentMessage | null {
    const sid = form.MessageSid;
    const status = form.MessageStatus as TwilioMessageStatus;
    if (!sid || !RECEIPT_STATUSES.includes(status)) return null;
    const record = this.messages.get(sid);
    if (!record) return null;
    const updated = { ...record, status };
    this.messages.set(sid, updated);
    return updated;
  }
}

/**
 * Twilio webhook signature (X-Twilio-Signature): base64(HMAC-SHA1(authToken,
 * url + concat(sorted param key+value))). Reject anything that fails — a STOP
 * webhook mutates consent state, so it must be provably from the provider.
 */
export function validateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const expected = createHmac("sha1", authToken).update(data).digest("base64");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Twilio-normalised opt-out keywords (advanced opt-out defaults). */
const STOP_WORDS = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit"]);

export function isStopMessage(body: string): boolean {
  return STOP_WORDS.has(body.trim().toLowerCase());
}

export interface InboundStopResult {
  patient: Patient;
  invitations: Invitation[];
}

/**
 * Handle an inbound-SMS webhook. Signature is validated FIRST; then a STOP body is
 * applied through the one true opt-out path (W6 handleStop — terminal). Returns null
 * when the webhook is not a valid STOP for a known sender: invalid signature, unknown
 * number, or an ordinary reply. Never throws on hostile input.
 */
export function applyInboundStop(
  authToken: string,
  webhookUrl: string,
  form: Record<string, string>,
  signature: string,
  patientsByPhone: ReadonlyMap<string, Patient>,
  invitations: Invitation[],
): InboundStopResult | null {
  if (!validateTwilioSignature(authToken, webhookUrl, form, signature)) return null;
  const from = form.From;
  const body = form.Body;
  if (!from || body === undefined || !isStopMessage(body)) return null;
  const patient = patientsByPhone.get(from);
  if (!patient) return null;
  return handleStop(patient, invitations);
}
