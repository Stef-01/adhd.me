// The voice plan, fuzzed (2026-10-01): thousands of answer sequences, each answer drawn from the kinds
// people give, run through nextQuestion and compose. What must hold whatever they say.
import { describe, expect, it } from "vitest";
import { compose, formFrom, nextQuestion, SENTENCES, type Answer, type Form, type QuestionId, type SayId } from "./plan";

const OPENINGS = ["I think I might have ADHD", "my son is 9 and his teacher thinks it might be ADHD", "since menopause I can't focus", "help at work with deadlines", "I'm autistic and wonder about ADHD", "Hi", "", "asdf", "I need my scripts continued", "a GP near Hornsby", "my daughter cries over homework", "I'm 52 and my meds stopped working"];
const ANSWERS: Array<[string, Partial<Form>]> = [
  ["Yes", { yes_no: "yes" }], ["No", { yes_no: "no" }], ["Sure.", { yes_no: "yes" }], ["Nope", { yes_no: "no" }],
  ["Parramatta", { place: "Parramatta" }], ["Telehealth is fine", { telehealth: true }], ["Yes, Indian", { yes_no: "yes", culture: "Indian" }], ["Hindi", { language: "Hindi" }],
  ["She's nine", {}], ["year 3", {}], ["A first look, never assessed", {}], ["Deadlines and forgetting meetings", {}],
  ["Say that again please", { again: true }], ["Just show me who fits", { show_matches: true }], ["Um, let me think", {}], ["Nothing else, thanks", {}],
  ["It's a wrap-up, legit", { offTopic: true }], ["Can you give me a recipe?", { offTopic: true }], ["zzz qqq", { understood: false }], ["", { understood: false }],
];
const SAYS: Record<QuestionId, SayId> = { opening: "opening", detail: "help", age: "age", raised: "raised", "first-look": "first-look", woman: "woman", place: "place", lived: "lived", culture: "culture", "which-culture": "which-culture", extra: "extra", "carry-on": "carry-on" };

function rng(seed: number) { return () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648); }

describe("the voice plan, fuzzed", () => {
  it("asks each question once, ends, and writes no bare yes, label or chatter into the request, over 5,000 calls", () => {
    const random = rng(42);
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(random() * xs.length)]!;
    for (let call = 0; call < 5000; call++) {
      const heard: Answer[] = [];
      const done: QuestionId[] = [];
      const asked: SayId[] = [];
      const opening = pick(OPENINGS);
      heard.push({ question: "opening", say: "opening", text: opening, form: formFrom(opening) });
      done.push("opening");
      let turns = 0;
      for (;;) {
        const next = nextQuestion(heard, done);
        if (!next) break;
        expect(++turns, `call ${call} never ended`).toBeLessThan(15);
        expect(SENTENCES[next.say], next.say).toBeDefined();
        expect(asked, `${next.say} asked twice in call ${call} (${opening})`).not.toContain(next.say);
        asked.push(next.say);
        const [text, form] = pick(ANSWERS);
        heard.push({ question: next.question!, say: next.say, text, form: { ...formFrom(text), ...form } as Form });
        done.push(next.question!);
      }
      const { request } = compose(heard);
      const parts = request.split(". ").map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        expect(part, `${request}`).not.toMatch(/^(yes|no|sure|nope)\.?$/i);
        expect(part, `${request}`).not.toMatch(/:\s*(yes|no|sure|nope)?\.?$/i);
        expect(part, `${request}`).not.toMatch(/wrap-up|recipe|say that again|show me who fits|let me think|nothing else/i);
      }
      expect(request.length).toBeLessThanOrEqual(2000);
    }
  });
});
