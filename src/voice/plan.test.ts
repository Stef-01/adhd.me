import { describe, expect, it } from "vitest";
import { facetKey, readNeeds } from "@/matching/needs";
import { said } from "@/model/crisis-contacts";
import { CULTURE_ASK, LIVED_ASK, SAY_IDS, SENTENCES, TELEHEALTH_ASK, compose, detailFor, echoes, formFor, formFrom, formOf, nextQuestion, placeOf, plainAnswer, withoutQuestions, type Answer, type Form, type QuestionId, type SayId } from "./plan";

const keys = (text: string) => readNeeds(text).map((need) => facetKey(need.facet)).sort();
const SAID: Partial<Record<QuestionId, SayId>> = { detail: "detail-work" };
/** One answer as the call holds it: the words, and what the model heard in them. */
const answer = (question: QuestionId, text: string, form: Partial<Form> = {}, say: SayId = SAID[question] ?? (question as SayId)): Answer => ({ question, say, text, form: { ...formFrom(text), ...form } });

/** A call run through the plan: each answer is given to the question the plan asks next. */
function call(answers: Partial<Record<QuestionId, readonly [string, Partial<Form>?]>>): { asked: SayId[]; request: string; place: string } {
  const heard: Answer[] = [];
  const done: QuestionId[] = [];
  const asked: SayId[] = [];
  for (let turn = 0; turn < 10; turn++) {
    const next = nextQuestion(heard, done);
    if (!next) break;
    asked.push(next.say);
    const given = answers[next.question!];
    if (given) heard.push(answer(next.question!, given[0], given[1], next.say));
    done.push(next.question!);
  }
  return { asked, ...compose(heard) };
}

describe("the sentences the finder says", () => {
  it("are short, one question each, with no option or example in them", () => {
    for (const id of SAY_IDS) {
      const { text } = SENTENCES[id];
      if (id === "urgent") continue;
      expect(text.split(/\s+/).length, text).toBeLessThanOrEqual(10);
      expect((text.match(/\?/g) ?? []).length, text).toBeLessThanOrEqual(1);
      expect(text, text).not.toMatch(/(, like\b|\bsuch as\b|\bfor example\b|\be\.g\.)/i);
      expect(text, text).not.toMatch(/speciali[sz]/i);
    }
  });

  it("say the crisis numbers the app holds, and say 000 as triple zero", () => {
    expect(SENTENCES.urgent.text).toContain(said("emergency"));
    expect(SENTENCES.urgent.text).toContain(said("lifeline"));
    expect(SENTENCES.urgent.text).toContain(said("lifeline-text"));
    expect(SENTENCES.urgent.spoken).toContain("triple zero");
  });
});

describe("the form the model fills", () => {
  it("is held to its fields: only what the answer said, and nothing the code does not know", () => {
    expect(formOf({ understood: true, yes_no: "yes", culture: "Indian", language: "Hindi", place: "near Sydney", telehealth: true, again: false, danger: true, part_of_life: "work", mood: "fine" })).toEqual({
      understood: true,
      yes_no: "yes",
      culture: "Indian",
      language: "Hindi",
      place: "Sydney",
      telehealth: true,
    });
    expect(formOf({ understood: false })).toEqual({ understood: false });
    expect(formOf({ yes_no: "maybe", part_of_life: "money", place: "", culture: null })).toEqual({ understood: true });
    expect(formOf(null)).toBeNull();
    expect(formOf("yes")).toBeNull();
  });

  it("takes a culture asked for and not named as no name (the founder, 2026-09-30: 'yes, I want someone from my culture')", () => {
    for (const unnamed of ["my culture", "their own culture", "own", "my own background", "your own culture"]) expect(formOf({ understood: true, yes_no: "yes", culture: unnamed })).toEqual({ understood: true, yes_no: "yes" });
  });

  it("takes the culture most of the roster shares as nothing to ask for, and the first peoples' by name", () => {
    for (const plain of ["Australian", "Aussie", "Anglo", "English", "Australian culture"]) expect(formOf({ understood: true, culture: plain }), plain).toEqual({ understood: true, plain: true });
    expect(formOf({ understood: true, language: "English" })).toEqual({ understood: true, plain: true });
    expect(formOf({ understood: true, culture: "Aboriginal Australian" })).toEqual({ understood: true, culture: "Aboriginal Australian" });
    expect(formOf({ understood: true, culture: "Greek Australian", language: "Greek if possible" })).toEqual({ understood: true, culture: "Greek Australian", language: "Greek" });
  });

  it("keeps a language written down as a culture too as the language alone", () => {
    expect(formOf({ understood: true, culture: "Arabic", language: "Arabic" })).toEqual({ understood: true, language: "Arabic" });
    expect(formOf({ understood: true, culture: "Indian", language: "Hindi" })).toEqual({ understood: true, language: "Hindi", culture: "Indian" });
    expect(formOf({ understood: true, culture: "Lebanese" })).toEqual({ understood: true, culture: "Lebanese" });
  });

  it("takes a place meant and not named as no place", () => {
    for (const unnamed of ["city", "the city", "here", "my area", "home"]) expect(formOf({ understood: true, place: unnamed }), unnamed).toEqual({ understood: true });
  });

  it("reads a yes to 'where are you, or would telehealth suit you?' as telehealth", () => {
    expect(formFor("place", { understood: true, yes_no: "yes" })).toEqual({ understood: true, yes_no: "yes", telehealth: true });
    expect(formFor("place", { understood: true, yes_no: "yes", place: "Sydney" })).toEqual({ understood: true, yes_no: "yes", place: "Sydney" });
    expect(formFor("lived", { understood: true, yes_no: "yes" })).toEqual({ understood: true, yes_no: "yes" });
    // A no the model wrote against "what's hardest at work?" is nothing; a no the person said is a no.
    expect(formFor("detail", { understood: true, yes_no: "no" }, "deadlines")).toEqual({ understood: true });
    expect(formFor("detail", { understood: true, yes_no: "no" }, "No, nothing in particular")).toEqual({ understood: true, yes_no: "no" });
  });

  it("knows a plain yes or no, which needs no form", () => {
    for (const plain of ["Yes.", "yeah", "No thanks.", "Yeah, that'd be great.", "Yes please", "Nope", "Sure, that would be good."]) expect(plainAnswer("lived", plain), plain).not.toBeNull();
    for (const more of ["Yes, Indian.", "Yes, I want someone from my culture.", "No, but I'd like a woman", "ja ta pi grejda", "Hindi would help"]) expect(plainAnswer("culture", more), more).toBeNull();
    // Only of a question that asks for a yes or a no.
    expect(plainAnswer("place", "Yes.")).toBeNull();
    expect(plainAnswer("opening", "Yes.")).toBeNull();
  });

  it("falls back, when no form comes, to the little the words alone say", () => {
    expect(formFrom("Yeah, that would be great.")).toEqual({ understood: true, yes_no: "yes" });
    expect(formFrom("No thanks.")).toEqual({ understood: true, yes_no: "no" });
    expect(formFrom("Parramatta, but telehealth is fine.")).toEqual({ understood: true });
    expect(formFrom("什么?")).toEqual({ understood: false });
    expect(formFrom("")).toEqual({ understood: false });
  });
});

describe("the follow-up to the first answer", () => {
  it("asks it of a part of life named in passing, which the finder's lexicon rightly does not rank on", () => {
    expect(detailFor([answer("opening", "An ADHD coach to help me with focus and getting things done at work, telehealth is fine.")])).toBe("detail-work");
    expect(detailFor([answer("opening", "I keep falling behind at uni")])).toBe("detail-study");
    // And never of an answer that names none (the form, asked for a part of life, gave one for this sentence one time in three).
    expect(detailFor([answer("opening", "I think I might have ADHD and I'd like to get assessed.")])).toBeNull();
  });

  it("hears study in going back to uni (the founder's call of 02:34)", () => {
    expect(detailFor([answer("opening", "Someone to help me with my challenges as a new mother and also someone who is going back to uni.")])).toBe("detail-home");
    expect(detailFor([answer("opening", "I am going back to uni next year and I am worried")])).toBe("detail-study");
  });

  it("asks what is hardest in the part of life they named (the founder, 2026-09-30: 'should have asked for more detail about what the struggle at work is')", () => {
    expect(detailFor([answer("opening", "With someone that would help me at work.")])).toBe("detail-work");
    expect(detailFor([answer("opening", "I'm looking for help with staying more focused at my job at work.")])).toBe("detail-work");
    expect(detailFor([answer("opening", "help with uni, I keep failing my exams")])).toBe("detail-study");
    expect(detailFor([answer("opening", "things are hard with my partner")])).toBe("detail-relationship");
    expect(detailFor([answer("opening", "help making friends")])).toBe("detail-social");
    expect(detailFor([answer("opening", "help as a parent")])).toBe("detail-home");
    expect(detailFor([answer("opening", "help with parenting my two boys")])).toBe("detail-home");
  });

  it("asks what help, of an answer that names none", () => {
    expect(detailFor([answer("opening", "I want a psychologist")])).toBe("help");
    expect(detailFor([answer("opening", "someone near Hornsby who bulk bills", { place: "Hornsby" })])).toBe("help");
    expect(detailFor([])).toBe("help");
  });

  it("asks nothing of an answer that says what it wants", () => {
    expect(detailFor([answer("opening", "I think I might have ADHD and I'd like to get assessed.")])).toBeNull();
    expect(detailFor([answer("opening", "someone to keep prescribing my ADHD medication")])).toBeNull();
    expect(detailFor([answer("opening", "help with my anxiety")])).toBeNull();
  });
});

describe("what is not an answer", () => {
  it("is the finder's own voice come back through the microphone", () => {
    const PLACE = SENTENCES.place.text;
    expect(echoes("Where are you, or would telehealth suit you?", PLACE)).toBe(true);
    expect(echoes("would telehealth suit you", PLACE)).toBe(true);
    expect(echoes("telehealth would suit me", PLACE)).toBe(false);
    expect(echoes("yes", SENTENCES.lived.text)).toBe(false);
    // A word or two, of the sentence the same sound cut short.
    expect(echoes("Where are", PLACE, 1)).toBe(true);
    expect(echoes("for my daughter", PLACE, 1)).toBe(false);
  });

  it("is a question asked of the assistant: it asks for nothing", () => {
    expect(withoutQuestions("What does bulk billing mean? I'm in Penrith.")).toBe("I'm in Penrith");
    expect(withoutQuestions("What does bulk billing mean?")).toBe("");
    expect(withoutQuestions("You didn't ask what my culture was when I said yes. How were you meant to know?")).toBe("You didn't ask what my culture was when I said yes");
  });
});

describe("a place, as it is said", () => {
  it("is the suburb or postcode alone", () => {
    expect(placeOf("Parramatta, but telehealth is fine.")).toBe("Parramatta");
    expect(placeOf("near Sydney")).toBe("Sydney");
    expect(placeOf("Hornsby, NSW, or telehealth")).toBe("Hornsby");
    expect(placeOf("Surry Hills NSW")).toBe("Surry Hills");
    expect(placeOf("2077")).toBe("2077");
    expect(placeOf("")).toBe("");
    expect(placeOf(undefined)).toBe("");
    expect(placeOf("none")).toBe("");
  });
});

describe("the questions, in order", () => {
  it("are the opening, what is hard, where, lived experience, culture, anything else", () => {
    const run = call({ opening: ["With someone that would help me at work."], detail: ["Deadlines and getting started."], place: ["In Sydney.", { place: "Sydney" }], lived: ["No thanks."], culture: ["No."], extra: ["No, that's all."] });
    expect(run.asked).toEqual(["opening", "detail-work", "place", "lived", "culture", "extra"]);
  });

  it("skip what has already been said", () => {
    const run = call({ opening: ["An ADHD assessment near Hornsby with someone who has ADHD themselves, and who speaks Hindi", { place: "Hornsby", language: "Hindi" }] });
    expect(run.asked).toEqual(["opening", "extra"]);
    expect(call({ opening: ["I'd like an assessment by telehealth", { telehealth: true }] }).asked).toEqual(["opening", "lived", "culture", "extra"]);
  });

  it("ask which culture of every yes that named none, however it was said (the founder, 2026-09-30)", () => {
    const before = { opening: ["an ADHD assessment"], place: ["Hornsby", { place: "Hornsby" }], lived: ["no"] } as const;
    for (const yes of ["Yes please.", "Yeah, that'd be great.", "Yes, I want someone from my culture.", "That would be good, yes", "ja ta pi grejda"]) {
      expect(call({ ...before, culture: [yes, { understood: true, yes_no: "yes" }] }).asked, yes).toEqual(["opening", "place", "lived", "culture", "which-culture", "extra"]);
    }
    expect(call({ ...before, culture: ["Yes, Indian.", { yes_no: "yes", culture: "Indian" }] }).asked).toEqual(["opening", "place", "lived", "culture", "extra"]);
    expect(call({ ...before, culture: ["No.", { yes_no: "no" }] }).asked).toEqual(["opening", "place", "lived", "culture", "extra"]);
  });

  it("never pass eight questions after the first", () => {
    expect(call({ opening: ["help at work"], detail: ["my boss"], place: ["Sydney", { place: "Sydney" }], lived: ["yes"], culture: ["yes"], "which-culture": ["Indian", { culture: "Indian" }], extra: ["no"] }).asked.length - 1).toBeLessThanOrEqual(8);
  });
});

describe("the request the answers make", () => {
  it("is the founder's call of 07:49, read as he meant it: work and focus, and nothing about medication", () => {
    const { request, place } = compose([
      answer("opening", "With someone that would help me at work."),
      answer("opening", "with my needs with focusing."),
      answer("detail", "Deadlines, and I can't get started on anything."),
      answer("place", "In Sydney.", { place: "Sydney" }),
      answer("lived", "Yeah, that's fine."),
      answer("culture", "No."),
    ]);
    expect(request).toBe(`With someone that would help me at work. with my needs with focusing. Hardest at work: Deadlines, and I can't get started on anything. ${LIVED_ASK}`);
    expect(place).toBe("Sydney");
    expect(keys(request)).toEqual(["care:executive-function", "care:work-career", "pref:lived-experience"]);
  });

  it("is his call of 10:53 without the words nobody understood, and with his culture asked for", () => {
    const { request, place } = compose([
      answer("opening", "I'm looking for help with staying more focused at my job at work."),
      answer("detail", "You really want to meet deadlines and then also be consistent and productive."),
      answer("place", "Hello, Sydney.", { place: "Sydney" }),
      answer("lived", "No preferences. No preference.", { yes_no: "no" }),
      answer("culture", "ja ta pi grejda.", { understood: false }),
      answer("culture", "Yeah, that'd be great.", { yes_no: "yes" }),
      answer("which-culture", "Indian.", { culture: "Indian" }),
    ]);
    expect(request).toBe(`I'm looking for help with staying more focused at my job at work. Hardest at work: You really want to meet deadlines and then also be consistent and productive. ${CULTURE_ASK}, Indian`);
    expect(place).toBe("Sydney");
    expect(request).not.toMatch(/grejda|Hello|No preference/);
  });

  it("reads a yes to telehealth, and keeps a place out of the sentence", () => {
    expect(compose([answer("opening", "an assessment"), answer("place", "Yeah, that's fine.", { yes_no: "yes", telehealth: true })])).toEqual({ request: `an assessment. ${TELEHEALTH_ASK}`, place: "" });
    expect(compose([answer("opening", "an assessment"), answer("place", "Parramatta, but telehealth is fine.", { place: "Parramatta", telehealth: true })])).toEqual({ request: `an assessment. ${TELEHEALTH_ASK}`, place: "Parramatta" });
    expect(compose([answer("opening", "an assessment"), answer("place", "No.")])).toEqual({ request: "an assessment", place: "" });
    // A place said in passing is the place.
    expect(compose([answer("opening", "a GP near Hornsby for my scripts", { place: "Hornsby" })]).place).toBe("Hornsby");
  });

  it("reads a yes to lived experience as that ask, a no as nothing, and what else they said as theirs", () => {
    expect(compose([answer("lived", "Yes, please.")]).request).toBe(LIVED_ASK);
    expect(compose([answer("lived", "You there, that's fine.", { yes_no: "yes" })]).request).toBe(LIVED_ASK);
    expect(compose([answer("lived", "No thanks.")]).request).toBe("");
    expect(compose([answer("lived", "No, but a woman would be good if there is one")]).request).toBe("No, but a woman would be good if there is one");
    // Said in their own words, the ask is not said twice.
    expect(compose([answer("lived", "Yes, I'd prefer someone who has ADHD themselves.")]).request).toBe("Yes, I'd prefer someone who has ADHD themselves");
  });

  it("takes a yes back when the next answer to the same question is a no (the founder's call of 02:34: 'Yeah, that'd be great. Actually no, it doesn't matter')", () => {
    const changed = [answer("opening", "help as a new mother"), answer("lived", "Yeah, that'd be great.", { yes_no: "yes" }), answer("lived", "Actually no, it doesn't matter.", { yes_no: "no" })];
    expect(compose(changed).request).toBe("help as a new mother");
    expect(compose(changed.slice(0, 2)).request).toBe(`help as a new mother. ${LIVED_ASK}`);
    // The same for culture: a yes taken back is not asked which.
    const heard = [answer("opening", "an ADHD assessment"), answer("culture", "Yes.", { yes_no: "yes" }), answer("culture", "No, actually.", { yes_no: "no" })];
    expect(nextQuestion(heard, ["opening", "place", "lived", "culture"])?.say).toBe("extra");
    expect(compose(heard).request).toBe("an ADHD assessment");
  });

  it("asks for a culture or a language in the finder's words", () => {
    expect(compose([answer("culture", "Yes, Indian.", { yes_no: "yes", culture: "Indian" })]).request).toBe(`${CULTURE_ASK}, Indian`);
    expect(compose([answer("culture", "Yes please.", { yes_no: "yes" }), answer("which-culture", "Indian, and Hindi", { culture: "Indian", language: "Hindi" })]).request).toBe(`${CULTURE_ASK}, Indian. someone who speaks Hindi`);
    expect(compose([answer("culture", "Hindi would help", { language: "Hindi" })]).request).toBe("someone who speaks Hindi");
    expect(compose([answer("culture", "Yes.", { yes_no: "yes" })]).request).toBe(CULTURE_ASK);
    expect(compose([answer("culture", "No, English is fine.", { yes_no: "no" })]).request).toBe("");
    expect(compose([answer("culture", "Yes.", { yes_no: "yes" }), answer("which-culture", "Australian", { plain: true })]).request).toBe("");
    expect(call({ opening: ["an ADHD assessment"], place: ["Hornsby", { place: "Hornsby" }], lived: ["no"], culture: ["Yes, Australian.", { yes_no: "yes", plain: true }] }).asked).toEqual(["opening", "place", "lived", "culture", "extra"]);
    for (const request of [`${CULTURE_ASK}, Indian`, CULTURE_ASK]) expect(keys(request)).toEqual(["care:cultural-background"]);
  });

  it("keeps what else a clinician should know as they said it, and adds nothing to it", () => {
    expect(compose([answer("opening", "an assessment"), answer("extra", "I also have bipolar.")]).request).toBe("an assessment. I also have bipolar");
    expect(compose([answer("opening", "an assessment for my son"), answer("extra", "He gets overwhelmed easily and needs someone very patient")]).request).toBe("an assessment for my son. He gets overwhelmed easily and needs someone very patient");
    expect(compose([answer("opening", "an assessment"), answer("extra", "No.")]).request).toBe("an assessment");
    expect(compose([answer("opening", "an assessment"), answer("extra", "No, nothing else.")]).request).toBe("an assessment");
  });

  it("leaves out what nobody understood, and a question asked of the assistant", () => {
    expect(compose([answer("opening", "an assessment"), answer("place", "什么?")]).request).toBe("an assessment");
    expect(compose([answer("opening", "What does bulk billing mean? I want an assessment.")]).request).toBe("I want an assessment");
    expect(compose([answer("opening", "an assessment"), answer("extra", "You didn't ask what my culture was. How were you meant to know?")]).request).toBe("an assessment. You didn't ask what my culture was");
  });
});
