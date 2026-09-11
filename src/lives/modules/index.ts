import type { EvidenceReference } from "../types";
// §24–§26, §70–§71: modules as data. recognise → understand → try → personalise → leave with one
// action. All nineteen are full (L5, PRD §104): the vertical slice's four first, then the rest
// behind the other strategies. The validator holds every one to the same shape, so a broken
// reference fails CI before a person meets it.
import type { LearningModule } from "../types";

// §76: the documents the modules rest on. Cited at document level; a section is named only where
// the module quotes it. The guideline links were opened and confirmed on 2026-09-10 (ROADMAP).
const AADPA: EvidenceReference = { type: "guideline", citation: "AADPA, Australian Evidence-Based Clinical Practice Guideline for ADHD (2022): non-pharmacological supports and environmental adjustments", url: "https://adhdguideline.aadpa.com.au/" };
const NICE: EvidenceReference = { type: "guideline", citation: "NICE NG87, Attention deficit hyperactivity disorder: diagnosis and management (2018, updated 2019): environmental modifications and psychological support", url: "https://www.nice.org.uk/guidance/ng87" };
const PRACTICE: EvidenceReference = { type: "clinical_practice", citation: "Common practice in ADHD coaching and occupational therapy: externalising memory, shrinking the first step, and structuring transitions; not a treatment claim" };
const SLEEP: EvidenceReference = { type: "expert_consensus", citation: "Sleep hygiene advice as given in Australian general practice for delayed sleep in adults; a persistent problem is for a GP or a sleep clinician" };
const MINDFUL: EvidenceReference = { type: "systematic_review", citation: "Mindfulness-based interventions for adult ADHD: small trials, modest effects on attention and mood, not a substitute for assessment or treatment" };

const meetingAnchor: LearningModule = {
  id: "meeting_anchor_v1", version: 1, sources: [AADPA, PRACTICE], title: "The Meeting Anchor", description: "A tiny way to give drifting attention somewhere to return.", estimatedMinutes: 2, domains: ["attention", "working_memory"], safetyCategory: "general",
  blocks: [
    { type: "illustration", characterId: "arjun", caption: "Arjun had a rough meeting. His attention went to a cow." },
    { type: "text", body: "Before the meeting begins, write the one thing this meeting is about at the top of a page. Keep the pen touching the page. When attention drifts, make one tiny mark and look back at the line." },
    { type: "interactive_practice", activityId: "meeting_anchor_simulation", instruction: "A thought will arrive. Put it in LATER, then tap the current discussion." },
    { type: "action_plan", prompt: "What will you anchor to?", options: ["Notebook", "Meeting agenda", "Sticky note", "Digital note"] },
  ],
};

const externalCue: LearningModule = {
  id: "external_cue_v1", version: 1, sources: [NICE, PRACTICE], title: "Why Am I Here?", description: "Carry the errand out of your head so the doorway cannot take it.", estimatedMinutes: 3, domains: ["working_memory", "environment"], safetyCategory: "general",
  blocks: [
    { type: "illustration", characterId: "mia", caption: "Mia went for the charger and came back with a banana." },
    { type: "text", body: "Doorways are where intentions fall out. Say the errand out loud as you stand up, or carry the thing the errand is for." },
    { type: "choice", prompt: "Take lunch tomorrow. Which cue would you notice?", options: ["Remember harder", "A note in the notes app", "The lunch bag beside the keys"] },
    { type: "text", body: "A note inside a phone is invisible until you open the phone. A bag beside the keys is in the way of leaving. Cues that sit where the moment happens get noticed." },
    { type: "action_plan", prompt: "Your next errand. What will carry it?", options: ["Say it out loud", "Carry the object", "A note where I will be", "A cue by the door"] },
  ],
};

const pauseBeforeSend: LearningModule = {
  id: "pause_before_send_v1", version: 1, sources: [NICE, PRACTICE], title: "Pause Before Send", description: "Give an emotionally loaded reply time to settle before it goes.", estimatedMinutes: 3, domains: ["impulsivity", "communication", "emotional_regulation"], safetyCategory: "general",
  blocks: [
    { type: "illustration", characterId: "zoe", caption: "Zoe sent fourteen messages. She meant one." },
    { type: "text", body: "The first reply is the feeling. Draft it, then wait. Most of the time the second reply says the same thing shorter, or does not need sending." },
    { type: "timer", durationSeconds: 60, label: "Sit with the draft", allowSkip: true },
    { type: "scenario", characterId: "zoe", prompt: "A friend writes: ‘You never reply when it matters.’ Your draft says everything you have ever felt about that. What now?", choices: [
      { id: "send", text: "Send it as it is.", feedback: "That is the feeling, delivered whole. It may be true and still land as an attack." },
      { id: "wait", text: "Leave it in drafts for an hour.", feedback: "Nothing is lost. The words are still there if they are still right." },
      { id: "short", text: "Reply with one line: ‘That stings. Can we talk later today?’", feedback: "This names the feeling and keeps the conversation open without the fourteen messages." },
    ] },
    { type: "action_plan", prompt: "How long is your pause?", options: ["Ten minutes", "An hour", "Overnight", "Until I have said it out loud to someone"] },
  ],
};

const lowerSensoryFloor: LearningModule = {
  id: "lower_sensory_floor_v1", version: 1, sources: [AADPA, PRACTICE], title: "Lower the Sensory Floor", description: "When a tiny sound is the loudest thing in the room, raise the background instead.", estimatedMinutes: 3, domains: ["sensory_management", "sleep"], safetyCategory: "wellbeing",
  blocks: [
    { type: "illustration", characterId: "leo", caption: "One mosquito. Leo’s whole night." },
    { type: "text", body: "When one small sound becomes the most noticeable thing in the room, adding a predictable background sound may make individual noises less salient for some people. It is not for everyone; try it once and keep it only if it helps." },
    { type: "checklist", items: [{ id: "fan", label: "A fan" }, { id: "noise", label: "White or pink noise" }, { id: "audio", label: "Quiet audio" }, { id: "earplugs", label: "Earplugs, where appropriate" }, { id: "notifications", label: "Notification sounds off" }], allowCustomItems: true },
    { type: "timer", durationSeconds: 120, label: "Two-minute wind-down", allowSkip: true },
    { type: "action_plan", prompt: "Tonight’s floor.", options: ["Fan on", "Noise on the phone", "Earplugs by the bed", "Do not disturb from 10pm"] },
  ],
};

const parkingLotNote: LearningModule = {
  id: "parking_lot_note_v1", version: 1, sources: [PRACTICE], title: "Parking Lot Note", description: "One note labelled LATER, for every thought that is not this meeting.", estimatedMinutes: 2, domains: ["attention", "working_memory"], safetyCategory: "general",
  blocks: [
    { type: "illustration", characterId: "arjun", caption: "Arjun’s flights, parked. The meeting got him back." },
    { type: "text", body: "A thought that arrives mid-meeting wants to be dealt with now. Writing it on a note labelled LATER can let it wait without being lost, and attention can go back to the room." },
    { type: "choice", prompt: "‘Book the flights’ arrives during the revenue question. What is the smallest move?", options: ["Book them now, quickly", "Write ‘flights’ on the LATER note", "Try harder to ignore it"] },
    { type: "text", body: "Ignoring a thought costs attention every time it comes back. Doing it now costs the meeting. Two words on a note cost almost nothing, and the thought stops knocking." },
    { type: "interactive_practice", activityId: "meeting_anchor_simulation", instruction: "Three thoughts will arrive. Park each one, then tap the current discussion." },
    { type: "action_plan", prompt: "Where does LATER live?", options: ["Top of the page", "A sticky note", "A phone note", "The agenda margin"] },
  ],
};

const putItWhere: LearningModule = {
  id: "put_it_where_v1", version: 1, sources: [NICE, PRACTICE], title: "Put It Where You’ll Need It", description: "Do not remember it. Place it where the moment happens.", estimatedMinutes: 2, domains: ["working_memory", "environment", "organisation"], safetyCategory: "general",
  blocks: [
    { type: "illustration", characterId: "mia", caption: "The parcel, by the door, cannot be forgotten." },
    { type: "text", body: "An intention kept in the head has to be re-found every time. An object in the place where it is needed does the remembering: the parcel by the door, the question written on the agenda, the form on the chair you sit in first." },
    { type: "choice", prompt: "The library book is due tomorrow. Where does it go tonight?", options: ["On the shelf, remembered", "On top of the keys", "In a reminder for 8am"] },
    { type: "text", body: "A reminder fires once and can be swiped away. A shelf hides the book. The keys are the one thing that leaves the house every day, and whatever sits on them leaves too." },
    { type: "checklist", items: [{ id: "door", label: "By the door" }, { id: "keys", label: "On the keys" }, { id: "chair", label: "On the chair" }, { id: "screen", label: "Stuck to the screen" }, { id: "bag", label: "In the bag, tonight" }], allowCustomItems: true },
    { type: "action_plan", prompt: "The next thing to remember. Where does it go?", options: ["By the door", "On the keys", "In the bag", "On the agenda"] },
  ],
};

const reversePlanning: LearningModule = {
  id: "reverse_planning_v1", version: 1, sources: [AADPA, PRACTICE], title: "Reverse Planning", description: "Plan from the arrival time backwards, one step at a time.", estimatedMinutes: 4, domains: ["time_management", "planning", "transitions"], safetyCategory: "general",
  blocks: [
    { type: "illustration", characterId: "theo", caption: "Theo, working backwards from nine." },
    { type: "text", body: "Estimating forwards asks how long everything will take, and the answer is usually optimistic. Working backwards from the arrival time asks a simpler question at each step: what has to be true just before this?" },
    { type: "scenario", characterId: "theo", prompt: "Arrive 9:00. Walk in from the car takes five minutes. Parking takes five. The drive takes twenty-five. Shoes and keys take five. When does Theo leave the shower?", choices: [
      { id: "eight-thirty", text: "8:30", feedback: "Walk 8:55, park 8:50, drive 8:25, shoes 8:20. Leaving the shower at 8:30 is already ten minutes late, before anything goes wrong." },
      { id: "eight-ten", text: "8:10", feedback: "Walk 8:55, park 8:50, drive 8:25, shoes 8:20. Out of the shower by 8:10 leaves ten minutes to dry off and dress. That is the number." },
      { id: "eight-forty", text: "8:40", feedback: "That would need the drive, the parking and the walk to take twenty minutes together. They take thirty-five." },
    ] },
    { type: "text", body: "The last step backwards is the one that matters: the moment to stop what you are doing. Write that time somewhere it will be seen, not the arrival time." },
    { type: "reflection", prompt: "Your next arrival time. Work it back, step by step, and write the moment you have to stop." },
    { type: "action_plan", prompt: "How many steps back do you plan?", options: ["Five steps back", "Three steps back", "The stop time only"] },
  ],
};

const launchPad: LearningModule = {
  id: "launch_pad_v1", version: 1, sources: [PRACTICE], title: "Launch Pad", description: "One place by the door for everything that leaves with you.", estimatedMinutes: 3, domains: ["environment", "transitions", "organisation"], safetyCategory: "general",
  blocks: [
    { type: "illustration", characterId: "theo", caption: "A bowl by the door. Everything that leaves lives there." },
    { type: "text", body: "Every departure that starts with a search for keys starts late. A launch pad is one fixed spot by the door where the leaving things live: keys, wallet, badge, medication, headphones, charger. Build it once; fill it every time you come in." },
    { type: "checklist", items: [{ id: "keys", label: "Keys" }, { id: "wallet", label: "Wallet or cards" }, { id: "badge", label: "Work badge" }, { id: "meds", label: "Medication" }, { id: "phone", label: "Phone and charger" }, { id: "headphones", label: "Headphones" }, { id: "glasses", label: "Glasses" }], allowCustomItems: true },
    { type: "text", body: "The pad works because it is where things land on the way in, not where they are gathered on the way out. Coming home, hands go to the bowl before anything else." },
    { type: "action_plan", prompt: "Where is your launch pad?", options: ["Bowl by the door", "Hook and shelf", "The bag itself", "Top of the fridge"] },
  ],
};

const sixtySecondStart: LearningModule = {
  id: "sixty_second_start_v1", version: 1, sources: [NICE, PRACTICE], title: "60-Second Start", description: "Find the first physical action, and do sixty seconds of it.", estimatedMinutes: 2, domains: ["task_initiation"], safetyCategory: "general",
  blocks: [
    { type: "illustration", characterId: "nina", caption: "Nina typed ‘Hi’. The mountain shrank." },
    { type: "text", body: "A task that will not start is usually a task that has no first physical action. ‘Write the report’ is a mountain. ‘Open the file and type the title’ is a hand movement. Sixty seconds of the hand movement is often enough for the rest to follow, and if it is not, sixty seconds is all that was promised." },
    { type: "choice", prompt: "The email has been waiting since Tuesday. Which is a first physical action?", options: ["Write a good email", "Type ‘Hi Sam,’ and nothing else", "Think about what to say"] },
    { type: "text", body: "‘Hi Sam,’ is two words and the email exists. What comes after it is a different, smaller problem than the one that waited since Tuesday." },
    { type: "timer", durationSeconds: 60, label: "Sixty seconds of the first action", allowSkip: true },
    { type: "action_plan", prompt: "Your first physical action.", options: ["Open the file", "Write the title", "Paste the notes", "Type one sentence"] },
  ],
};

const imperfectFirstDraft: LearningModule = {
  id: "imperfect_first_draft_v1", version: 1, sources: [PRACTICE], title: "Imperfect First Draft", description: "Write it badly on purpose. A rough draft exists; a perfect one is still waiting.", estimatedMinutes: 3, domains: ["task_initiation", "emotional_regulation"], safetyCategory: "general",
  blocks: [
    { type: "illustration", characterId: "nina", caption: "Nina’s bad first sentence was a door." },
    { type: "text", body: "Perfectionism does not stop the work at the end; it stops it at the beginning, because the first line has to be the final line. Giving yourself permission to write a bad version removes the standard the first line had to meet." },
    { type: "scenario", characterId: "nina", prompt: "The report is due Friday. It is Wednesday. The document is blank. Nina opens it and…", choices: [
      { id: "outline", text: "Writes the whole thing as bullet points, badly, in ten minutes.", feedback: "A bad version exists on Wednesday. Thursday is for making it good, which is a different and easier job." },
      { id: "research", text: "Reads three more sources so the first paragraph will be right.", feedback: "The paragraph still does not exist, and now there is more to fit into it. Research after the rough draft tends to find what the draft is missing." },
      { id: "perfect", text: "Writes the first sentence eleven times.", feedback: "Eleven sentences, one paragraph, no report. The first sentence can be fixed last." },
    ] },
    { type: "reflection", prompt: "Something you have been about to start. What would a deliberately rough version of it look like?" },
    { type: "action_plan", prompt: "Permission to be rough. Where?", options: ["The email", "The report", "The message", "The plan"] },
  ],
};

const holdTheKeyword: LearningModule = {
  id: "hold_the_keyword_v1", version: 1, sources: [PRACTICE], title: "Hold the Keyword", description: "Keep one word, not the whole sentence, and go back to listening.", estimatedMinutes: 4, domains: ["communication", "relationships", "working_memory"], safetyCategory: "general",
  blocks: [
    { type: "illustration", characterId: "zoe", caption: "AIRPORT. Zoe held the word, and listened." },
    { type: "text", body: "Holding a whole reply in your head while someone else is talking takes the attention that listening needs, so the reply gets said too early or the listening gets lost. One word can hold the whole thought: ‘airport’ is enough to bring back ‘I can drive you on Sunday’." },
    { type: "choice", prompt: "A friend is telling a long story. Halfway through, you think of the perfect thing to say. What do you keep?", options: ["The whole sentence, rehearsed", "One word for it", "Nothing; say it now"] },
    { type: "text", body: "Said now, it cuts the story. Rehearsed, it deafens you to the end of it. One word sits quietly until the turn arrives." },
    { type: "interactive_practice", activityId: "keyword_hold", instruction: "Pick one word for the thought you would want to say next, and say it silently three times while you keep listening." },
    { type: "action_plan", prompt: "Where does the word go?", options: ["In my head, one word", "On my hand", "A note on the table", "The phone"] },
  ],
};

const overwhelmReset: LearningModule = {
  id: "overwhelm_reset_v1", version: 1, sources: [AADPA, MINDFUL], title: "Overwhelm Reset", description: "Remove one layer instead of concentrating harder against all of them.", estimatedMinutes: 3, domains: ["sensory_management", "emotional_regulation", "mindfulness"], safetyCategory: "wellbeing",
  blocks: [
    { type: "illustration", characterId: "maya", caption: "Maya turned one layer off. The crossing got quieter." },
    { type: "text", body: "When everything is loud at once, the instinct is to concentrate harder. For some people, reducing the total input works better than pushing against it: headphones, a step to the side, a quieter route, the directions written down before going in." },
    { type: "checklist", items: [{ id: "sound", label: "Sound: headphones, or a quieter spot" }, { id: "notifications", label: "Notifications off for the next hour" }, { id: "visual", label: "Visual noise: one tab, one window" }, { id: "people", label: "Step out of the conversation for a minute" }, { id: "written", label: "The next steps written before starting" }], allowCustomItems: true },
    { type: "timer", durationSeconds: 60, label: "One minute with one layer off", allowSkip: true },
    { type: "action_plan", prompt: "Which layer goes first?", options: ["Sound", "Notifications", "Visual noise", "People talking"] },
  ],
};

const sleepWindDown: LearningModule = {
  id: "sleep_wind_down_v1", version: 1, sources: [SLEEP, AADPA], title: "Sleep Wind-Down", description: "A five-minute settle for a brain that is still going.", estimatedMinutes: 5, domains: ["sleep", "mindfulness"], safetyCategory: "wellbeing",
  blocks: [
    { type: "illustration", characterId: "leo", caption: "Leo, five minutes before the lights." },
    { type: "text", body: "A body clock that runs late does not stop on command. What some people find useful is a short, repeatable settle before the lights go: the same few minutes, the same order, so the settle itself becomes the signal." },
    { type: "checklist", items: [{ id: "lights", label: "Lights down" }, { id: "phone", label: "Phone out of reach" }, { id: "breath", label: "Slow breaths, counted" }, { id: "tomorrow", label: "Tomorrow’s one thing, written" }, { id: "warm", label: "Something warm to hold" }], allowCustomItems: true },
    { type: "timer", durationSeconds: 300, label: "Five minutes, no requirement to finish", allowSkip: true },
    { type: "text", body: "If a month of settles has not moved your sleep, or somebody tells you that you snore or stop breathing at night, that is worth taking to a GP or a sleep clinician. The settle is for the ordinary late nights, not the ones that need a look." },
    { type: "action_plan", prompt: "Save for tonight?", options: ["Tonight", "Tomorrow", "Weeknights", "Not now"] },
  ],
};

const brainDumpBed: LearningModule = {
  id: "brain_dump_bed_v1", version: 1, sources: [SLEEP, PRACTICE], title: "Brain Dump Before Bed", description: "Write down what your brain is trying not to forget, so it can stop rehearsing.", estimatedMinutes: 3, domains: ["sleep", "working_memory"], safetyCategory: "wellbeing",
  blocks: [
    { type: "illustration", characterId: "leo", caption: "Leo’s list, on paper instead of in the dark." },
    { type: "text", body: "A brain that keeps repeating tomorrow’s list in the dark is not being difficult; it is trying not to lose the list. Writing the list down can give it permission to stop." },
    { type: "reflection", prompt: "What is your brain holding onto tonight? Everything, in any order. It stays on this device." },
    { type: "text", body: "Nothing on the list has to be solved now. It only has to be somewhere other than your head." },
    { type: "action_plan", prompt: "Where does the list live?", options: ["Notebook by the bed", "A note on the phone", "The launch pad", "The fridge"] },
  ],
};

const parkTheIdea: LearningModule = {
  id: "park_the_idea_v1", version: 1, sources: [NICE, PRACTICE], title: "Park the New Idea", description: "Capture it, date it, come back in a day.", estimatedMinutes: 2, domains: ["impulsivity", "prioritisation", "planning"], safetyCategory: "general",
  blocks: [
    { type: "illustration", characterId: "jax", caption: "Jax parked the kayak. For a day." },
    { type: "text", body: "A new idea arrives with its own urgency. The urgency is real; the idea may or may not be. A day between wanting and buying keeps the good ideas, because they are still good tomorrow, and loses most of the rest." },
    { type: "scenario", characterId: "jax", prompt: "Jax went out for milk. There is a kayak on sale, today only, forty per cent off.", choices: [
      { id: "buy", text: "Buy the kayak. It is forty per cent off.", feedback: "Perhaps a fine kayak. Also the fourth today-only purchase this month, and the milk is still on the shelf." },
      { id: "park", text: "Write ‘kayak, sale, 9 Sept’ in the parked list and buy the milk.", feedback: "If it is a good idea tomorrow, the kayak is one search away. If it is not, nothing was lost." },
      { id: "photo", text: "Take a photo of it and decide in the car park.", feedback: "The car park is still today. The point of the day is that it is not today." },
    ] },
    { type: "action_plan", prompt: "How long is the park?", options: ["A day", "A week", "Until payday", "Until I tell someone"] },
  ],
};

const transitionReset: LearningModule = {
  id: "transition_reset_v1", version: 1, sources: [MINDFUL, PRACTICE], title: "3-Minute Transition Reset", description: "A short reset between one thing and the next.", estimatedMinutes: 3, domains: ["transitions", "mindfulness"], safetyCategory: "wellbeing",
  blocks: [
    { type: "illustration", characterId: "arjun", caption: "Three breaths between the meeting and the report." },
    { type: "text", body: "The hardest part of the next thing is often the seam between it and the last thing. Some people find a brief, deliberate pause useful there: stop, three slow breaths, name the next thing out loud, begin." },
    { type: "timer", durationSeconds: 180, label: "Stop. Three breaths. Name the next thing.", allowSkip: true },
    { type: "choice", prompt: "Where would the seam be, most days?", options: ["After meetings", "Before starting work", "Getting home", "Before bed"] },
    { type: "action_plan", prompt: "When would you use it?", options: ["After meetings", "Before starting", "Getting home", "Before bed"] },
  ],
};

const sixtySecondReset: LearningModule = {
  id: "sixty_second_reset_v1", version: 1, sources: [MINDFUL, PRACTICE], title: "60-Second Reset", description: "One minute to land before the next thing.", estimatedMinutes: 1, domains: ["mindfulness", "attention", "transitions"], safetyCategory: "wellbeing",
  blocks: [
    { type: "illustration", characterId: "nina", caption: "Nina, one minute before the blank page." },
    { type: "text", body: "Some people find a single minute of deliberate stillness useful for resetting attention. Not fixing anything; landing." },
    { type: "audio", audioAssetId: "planned:sixty_second_reset", durationSeconds: 60, transcriptId: "sixty_second_reset", allowBackgroundPlayback: false },
    { type: "timer", durationSeconds: 60, label: "One minute. Feet, breath, three sounds.", allowSkip: true },
    { type: "action_plan", prompt: "When would a minute help?", options: ["Before starting", "After a call", "Getting home", "Not sure yet"] },
  ],
};

const beforeAHardConversation: LearningModule = {
  id: "hard_conversation_v1", version: 1, sources: [MINDFUL, NICE, PRACTICE], title: "Before a Difficult Conversation", description: "Five minutes to hold one sentence and let the fear sit beside you.", estimatedMinutes: 5, domains: ["mindfulness", "communication", "emotional_regulation", "relationships"], safetyCategory: "wellbeing",
  blocks: [
    { type: "illustration", characterId: "zoe", caption: "Zoe, five minutes before the talk she has rehearsed forty times." },
    { type: "text", body: "Rehearsing a hard conversation forty times does not make the forty-first calmer. One sentence you want them to know, held, and a longer breath out, is what some people find steadies the start." },
    { type: "reflection", prompt: "The one thing you want them to know. One sentence. It stays on this device." },
    { type: "audio", audioAssetId: "planned:before_a_hard_conversation", durationSeconds: 300, transcriptId: "before_a_hard_conversation", allowBackgroundPlayback: false },
    { type: "timer", durationSeconds: 300, label: "Five minutes. The sentence, the breath, the fear beside you.", allowSkip: true },
    { type: "action_plan", prompt: "If it goes sideways?", options: ["Say I need a minute", "Come back to the sentence", "Ask for a pause and a time to continue", "Write it instead"] },
  ],
};

const brainEverywhere: LearningModule = {
  id: "brain_everywhere_v1", version: 1, sources: [MINDFUL, AADPA], title: "Brain Everywhere Grounding", description: "Three minutes for the moment everything is happening at once.", estimatedMinutes: 3, domains: ["mindfulness", "sensory_management", "emotional_regulation"], safetyCategory: "wellbeing",
  blocks: [
    { type: "illustration", characterId: "maya", caption: "Maya at the crossing, every sound at once." },
    { type: "text", body: "When everything is loud at once, counting what is actually there, five things seen, four felt, three heard, gives attention one job. Some people find it brings the room back to size." },
    { type: "audio", audioAssetId: "planned:brain_everywhere_grounding", durationSeconds: 180, transcriptId: "brain_everywhere_grounding", allowBackgroundPlayback: false },
    { type: "timer", durationSeconds: 180, label: "Five seen, four felt, three heard, two smelt, one next.", allowSkip: true },
    { type: "action_plan", prompt: "Where does everything happen at once?", options: ["Shops and stations", "Open-plan work", "Home at 6pm", "Online"] },
  ],
};

export const MODULES: readonly LearningModule[] = [
  meetingAnchor, externalCue, pauseBeforeSend, lowerSensoryFloor,
  parkingLotNote, putItWhere, reversePlanning, launchPad, sixtySecondStart, imperfectFirstDraft, holdTheKeyword, overwhelmReset, sleepWindDown, brainDumpBed, parkTheIdea, transitionReset,
  sixtySecondReset, beforeAHardConversation, brainEverywhere,
];


export function learningModule(id: string): LearningModule {
  const m = MODULES.find((x) => x.id === id);
  if (!m) throw new Error(`lives: unknown module ${id}`);
  return m;
}
