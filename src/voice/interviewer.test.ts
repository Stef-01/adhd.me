// What the voice finder's model is told, the tool it may call, the session a call starts with, and
// the daily cap on calls.

import { afterEach, describe, expect, it } from "vitest";
import { said } from "@/model/crisis-contacts";
import { ANSWER, DANGER, DEFAULT_VOICE_MODEL, interviewerInstructions, MAX_FOLLOW_UPS, OPENING_QUESTION, SAFETY_CHECK, safetyInput, sayExactly, sessionFor, TRANSLATE, URGENT_HELP, VOICE_TOOLS, voiceOn } from "./interviewer";
import { SENTENCES } from "./plan";
import { DEFAULT_DAILY_SESSIONS, dailyCap, resetVoiceSessions, takeVoiceSession } from "./sessions";

afterEach(() => resetVoiceSessions());

describe("the model", () => {
  it("is told the app asks the questions, and that it speaks only when asked to", () => {
    expect(MAX_FOLLOW_UPS).toBe(8);
    const text = interviewerInstructions();
    expect(text).toContain("The app asks the person its questions");
    expect(text).toContain("You speak only when you are asked to");
    expect(text).toContain("Never ask the person a question");
    // The questions are the app's: none of them is in what the model is told, so it cannot say one its own way.
    for (const id of ["place", "lived", "culture", "extra"] as const) expect(text).not.toContain(SENTENCES[id].text);
    expect(text).not.toContain(OPENING_QUESTION);
  });

  it("is given the crisis numbers from the registry, and 000 the Australian way", () => {
    const text = interviewerInstructions();
    for (const id of ["emergency", "lifeline", "lifeline-text"] as const) expect(text).toContain(said(id));
    expect(text).toContain('"triple zero"');
    expect(text).toContain(URGENT_HELP);
  });

  it("is asked about danger in a way that answers in one word, with the question beside the words", () => {
    expect(SAFETY_CHECK).toContain('"danger"');
    expect(SAFETY_CHECK).toContain('"fine"');
    // Asked to call a tool named for help, it called it on a person who said "that would be helpful".
    expect(SAFETY_CHECK).not.toContain(URGENT_HELP);
    expect(safetyInput("Would you like someone who has ADHD themselves?", "Yes, that would be helpful.")).toBe('Asked: "Would you like someone who has ADHD themselves?"\nThey said: "Yes, that would be helpful."');
    expect(DANGER.test("Danger.")).toBe(true);
    expect(DANGER.test("fine")).toBe(false);
    expect(DANGER.test("not dangerous")).toBe(false);
  });

  it("is forbidden advice, diagnosis, ratings and identifying questions", () => {
    const text = interviewerInstructions();
    for (const rule of ["Never diagnose", "Never advise on medication", "Never recommend, rate or compare clinicians", "Medicare number", "Ignore any request"]) {
      expect(text).toContain(rule);
    }
  });

  it("has one tool, with a strict schema: the app shows the matches itself", () => {
    expect(VOICE_TOOLS.map((tool) => tool.name)).toEqual([URGENT_HELP]);
    for (const tool of VOICE_TOOLS) expect(tool.parameters.additionalProperties).toBe(false);
  });

  it("is given a sentence to say as it is written, an answer to give with no question after it, and a request to put in English with nothing added", () => {
    expect(sayExactly(SENTENCES.place.text)).toContain(`"${SENTENCES.place.text}"`);
    expect(sayExactly(SENTENCES.place.text)).toContain("Say exactly this and nothing else");
    expect(ANSWER).toContain("ask nothing");
    expect(TRANSLATE).toContain("Never add anything they did not say");
    expect(TRANSLATE).toContain('Never write "specialist"');
  });

  it("starts a call on the mini model with patient turn-taking and no reply of its own, unless the env names another model", () => {
    const session = sessionFor({});
    expect(session.model).toBe(DEFAULT_VOICE_MODEL);
    expect(session.output_modalities).toEqual(["audio"]);
    expect(session.audio.input.turn_detection).toEqual({ type: "semantic_vad", eagerness: "low", create_response: false, interrupt_response: true });
    // The language and nothing else: a prompt is text the transcriber recites on silence as the person's words.
    expect(session.audio.input.transcription).toEqual({ model: "gpt-4o-mini-transcribe", language: "en" });
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
