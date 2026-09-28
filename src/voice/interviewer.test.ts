// What the voice finder's model is told, the tools it may call, the session a call starts with, and
// the daily cap on calls.

import { afterEach, describe, expect, it } from "vitest";
import { said } from "@/model/crisis-contacts";
import {
  DEFAULT_VOICE_MODEL,
  interviewerInstructions,
  MAX_FOLLOW_UPS,
  OPENING_QUESTION,
  SHOW_MATCHES,
  sessionFor,
  URGENT_HELP,
  VOICE_TOOLS,
  voiceOn,
} from "./interviewer";
import { DEFAULT_DAILY_SESSIONS, dailyCap, resetVoiceSessions, takeVoiceSession } from "./sessions";

afterEach(() => resetVoiceSessions());

describe("the interviewer", () => {
  it("tells the model the founder's cap of 8 follow-ups, one question at a time, and the opening question", () => {
    expect(MAX_FOLLOW_UPS).toBe(8);
    const text = interviewerInstructions();
    expect(text).toContain("at most 8 more questions");
    expect(text).toContain(OPENING_QUESTION);
    expect(text).toContain("One short question per turn");
    expect(text).toContain(SHOW_MATCHES);
  });

  it("quotes the crisis numbers from the registry, and says 000 the Australian way", () => {
    const text = interviewerInstructions();
    for (const id of ["emergency", "lifeline", "lifeline-text"] as const) expect(text).toContain(said(id));
    expect(text).toContain('"triple zero"');
    expect(text).toContain(URGENT_HELP);
  });

  it("forbids advice, diagnosis, ratings and identifying questions", () => {
    const text = interviewerInstructions();
    for (const rule of ["Never diagnose", "Never advise on medication", "Never recommend, rate or compare clinicians", "Medicare number"]) {
      expect(text).toContain(rule);
    }
  });

  it("offers exactly two tools, each with a strict schema", () => {
    expect(VOICE_TOOLS.map((t) => t.name)).toEqual([SHOW_MATCHES, URGENT_HELP]);
    for (const tool of VOICE_TOOLS) expect(tool.parameters.additionalProperties).toBe(false);
    expect(VOICE_TOOLS[0].parameters.required).toEqual(["request", "place"]);
  });

  it("starts a call on the mini model with patient turn-taking, unless the env names another", () => {
    const session = sessionFor({});
    expect(session.model).toBe(DEFAULT_VOICE_MODEL);
    expect(session.output_modalities).toEqual(["audio"]);
    expect(session.audio.input.turn_detection).toEqual({ type: "semantic_vad", eagerness: "low", create_response: true, interrupt_response: true });
    expect(session.audio.input.transcription.model).toBe("gpt-4o-mini-transcribe");
    expect(session.instructions).toBe(interviewerInstructions());
    const full = sessionFor({ ADHDME_VOICE_MODEL: "gpt-realtime-2.1", ADHDME_VOICE_NAME: "cedar" });
    expect(full.model).toBe("gpt-realtime-2.1");
    expect(full.audio.output.voice).toBe("cedar");
  });

  it("sets a reasoning effort only when the env names a real one", () => {
    expect(sessionFor({})).not.toHaveProperty("reasoning");
    expect(sessionFor({ ADHDME_VOICE_EFFORT: "low" }).reasoning).toEqual({ effort: "low" });
    expect(sessionFor({ ADHDME_VOICE_EFFORT: "extreme" })).not.toHaveProperty("reasoning");
  });

  it("is on wherever there is a key, unless ADHDME_VOICE=0 turns it off", () => {
    expect(voiceOn({})).toBe(false);
    expect(voiceOn({ ADHDME_VOICE: "1" })).toBe(false);
    expect(voiceOn({ OPENAI_API_KEY: "k" })).toBe(true);
    expect(voiceOn({ ADHDME_VOICE: "1", OPENAI_API_KEY: "k" })).toBe(true);
    expect(voiceOn({ ADHDME_VOICE: "0", OPENAI_API_KEY: "k" })).toBe(false);
  });
});

describe("the daily cap on calls", () => {
  it("defaults to 40 a day and takes a whole number from the env", () => {
    expect(dailyCap({})).toBe(DEFAULT_DAILY_SESSIONS);
    expect(dailyCap({ ADHDME_VOICE_DAILY_SESSIONS: "3" })).toBe(3);
    expect(dailyCap({ ADHDME_VOICE_DAILY_SESSIONS: "0" })).toBe(0);
    for (const bad of ["", " ", "-1", "2.5", "lots"]) expect(dailyCap({ ADHDME_VOICE_DAILY_SESSIONS: bad })).toBe(DEFAULT_DAILY_SESSIONS);
  });

  it("stops at the cap and starts again on a new UTC day", () => {
    const env = { ADHDME_VOICE_DAILY_SESSIONS: "2" };
    const day = new Date("2026-09-28T10:00:00Z");
    expect([takeVoiceSession(env, day), takeVoiceSession(env, day), takeVoiceSession(env, day)]).toEqual([true, true, false]);
    expect(takeVoiceSession(env, new Date("2026-09-29T00:00:01Z"))).toBe(true);
  });
});
