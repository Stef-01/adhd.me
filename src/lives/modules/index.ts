// §24–§26, §70–§71: modules as data. recognise → understand → try → personalise → leave with one
// action. The vertical slice's four are full; the rest are stubs the validator holds to the same
// shape so a broken reference fails CI before a person meets it.
import type { CharacterId, LearningModule } from "../types";

const meetingAnchor: LearningModule = {
  id: "meeting_anchor_v1", version: 1, title: "The Meeting Anchor", description: "A tiny way to give drifting attention somewhere to return.", estimatedMinutes: 2, domains: ["attention", "working_memory"], safetyCategory: "general",
  blocks: [
    { type: "illustration", characterId: "arjun", caption: "Arjun had a rough meeting. His attention went to a cow." },
    { type: "text", body: "Before the meeting begins, write the one thing this meeting is about at the top of a page. Keep the pen touching the page. When attention drifts, make one tiny mark and look back at the line." },
    { type: "interactive_practice", activityId: "meeting_anchor_simulation", instruction: "A thought will arrive. Put it in LATER, then tap the current discussion." },
    { type: "action_plan", prompt: "What will you anchor to?", options: ["Notebook", "Meeting agenda", "Sticky note", "Digital note"] },
  ],
};

const externalCue: LearningModule = {
  id: "external_cue_v1", version: 1, title: "Why Am I Here?", description: "Carry the errand out of your head so the doorway cannot take it.", estimatedMinutes: 3, domains: ["working_memory", "environment"], safetyCategory: "general",
  blocks: [
    { type: "illustration", characterId: "mia", caption: "Mia went for the charger and came back with a banana." },
    { type: "text", body: "Doorways are where intentions fall out. Say the errand out loud as you stand up, or carry the thing the errand is for." },
    { type: "choice", prompt: "Take lunch tomorrow. Which cue would you notice?", options: ["Remember harder", "A note in the notes app", "The lunch bag beside the keys"] },
    { type: "text", body: "A note inside a phone is invisible until you open the phone. A bag beside the keys is in the way of leaving. Cues that sit where the moment happens get noticed." },
    { type: "action_plan", prompt: "Your next errand. What will carry it?", options: ["Say it out loud", "Carry the object", "A note where I will be", "A cue by the door"] },
  ],
};

const pauseBeforeSend: LearningModule = {
  id: "pause_before_send_v1", version: 1, title: "Pause Before Send", description: "Give an emotionally loaded reply time to settle before it goes.", estimatedMinutes: 3, domains: ["impulsivity", "communication", "emotional_regulation"], safetyCategory: "general",
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
  id: "lower_sensory_floor_v1", version: 1, title: "Lower the Sensory Floor", description: "When a tiny sound is the loudest thing in the room, raise the background instead.", estimatedMinutes: 3, domains: ["sensory_management", "sleep"], safetyCategory: "wellbeing",
  blocks: [
    { type: "illustration", characterId: "leo", caption: "One mosquito. Leo’s whole night." },
    { type: "text", body: "When one small sound becomes the most noticeable thing in the room, adding a predictable background sound may make individual noises less salient for some people. It is not for everyone; try it once and keep it only if it helps." },
    { type: "checklist", items: [{ id: "fan", label: "A fan" }, { id: "noise", label: "White or pink noise" }, { id: "audio", label: "Quiet audio" }, { id: "earplugs", label: "Earplugs, where appropriate" }, { id: "notifications", label: "Notification sounds off" }], allowCustomItems: true },
    { type: "timer", durationSeconds: 120, label: "Two-minute wind-down", allowSkip: true },
    { type: "action_plan", prompt: "Tonight’s floor.", options: ["Fan on", "Noise on the phone", "Earplugs by the bed", "Do not disturb from 10pm"] },
  ],
};

const stub = (id: string, title: string, description: string, minutes: number, domains: LearningModule["domains"], characterId: CharacterId, caption: string, action: { prompt: string; options: string[] }): LearningModule => ({
  id, version: 1, title, description, estimatedMinutes: minutes, domains, safetyCategory: "general",
  blocks: [
    { type: "illustration", characterId, caption },
    { type: "text", body: description },
    { type: "action_plan", prompt: action.prompt, options: action.options },
  ],
});

export const MODULES: readonly LearningModule[] = [
  meetingAnchor, externalCue, pauseBeforeSend, lowerSensoryFloor,
  stub("parking_lot_note_v1", "Parking Lot Note", "Keep one note labelled LATER. Put every unrelated thought there and return to the meeting at once. Review it afterwards, if it still matters.", 2, ["attention", "working_memory"], "arjun", "Arjun’s flights, parked.", { prompt: "Where does LATER live?", options: ["Top of the page", "A sticky note", "A phone note", "The agenda margin"] }),
  stub("put_it_where_v1", "Put It Where You’ll Need It", "Do not remember it. Place it. The package by the door; the question on the agenda; the document on the chair.", 2, ["working_memory", "environment", "organisation"], "mia", "The parcel, by the door, cannot be forgotten.", { prompt: "The next thing to remember. Where does it go?", options: ["By the door", "On the desk", "In the bag", "On the agenda"] }),
  stub("reverse_planning_v1", "Reverse Planning", "Arrive 9:00. Walk in 8:55. Park 8:50. Drive 8:25. Leave home 8:20. Shoes and keys 8:15. Plan from arrival backwards.", 4, ["time_management", "planning", "transitions"], "theo", "Theo, working backwards from nine.", { prompt: "Your next arrival time. Work it back.", options: ["Five steps back", "Three steps back", "Leave-home time only"] }),
  stub("launch_pad_v1", "Launch Pad", "One place by the door for the things you leave with: keys, wallet, badge, medication, headphones, charger. Build it once.", 3, ["environment", "transitions", "organisation"], "theo", "A bowl by the door. Everything that leaves lives there.", { prompt: "Where is your launch pad?", options: ["Bowl by the door", "Backpack", "Desk", "Shelf"] }),
  stub("sixty_second_start_v1", "60-Second Start", "What is the first physical action? Open the file. Write the title. Paste the notes. Do sixty seconds of it, then keep going or stop.", 2, ["task_initiation"], "nina", "Nina typed ‘Hi’. The mountain shrank.", { prompt: "Your first physical action.", options: ["Open the file", "Write the title", "Paste the notes", "Type one sentence"] }),
  stub("imperfect_first_draft_v1", "Imperfect First Draft", "Write it badly on purpose. A rough draft exists; a perfect one is still waiting to start.", 3, ["task_initiation", "emotional_regulation"], "nina", "Nina’s bad first sentence was a door.", { prompt: "Permission to be rough. Where?", options: ["The email", "The report", "The message", "The plan"] }),
  stub("hold_the_keyword_v1", "Hold the Keyword", "Do not store the whole sentence. Pick one word, hold it, and go back to listening. Use the word when your turn arrives.", 4, ["communication", "relationships", "working_memory"], "zoe", "AIRPORT. Zoe held the word, and listened.", { prompt: "Where does the word go?", options: ["In my head, one word", "On my hand", "A note on the table", "The phone"] }),
  stub("overwhelm_reset_v1", "Overwhelm Reset", "Remove one layer. Headphones, a quieter spot, a step aside, directions written before you go in. Less input is easier than more concentration.", 3, ["sensory_management", "emotional_regulation", "mindfulness"], "maya", "Maya turned one layer off. The crossing got quieter.", { prompt: "Which layer goes first?", options: ["Sound", "Notifications", "Visual noise", "People talking"] }),
  stub("sleep_wind_down_v1", "Sleep Wind-Down", "A short settle before sleep: lights down, phone away, one slow breath at a time. Five minutes, no requirement to finish.", 5, ["sleep", "mindfulness"], "leo", "Leo, five minutes before the lights.", { prompt: "Save for tonight?", options: ["Tonight", "Tomorrow", "Weeknights", "Not now"] }),
  stub("brain_dump_bed_v1", "Brain Dump Before Bed", "What is your brain trying not to forget? Write it down. It can stop rehearsing.", 3, ["sleep", "working_memory"], "leo", "Leo’s list, on paper instead of in the dark.", { prompt: "Where does the list live?", options: ["Notebook by the bed", "A note on the phone", "The launch pad", "The fridge"] }),
  stub("park_the_idea_v1", "Park the New Idea", "Capture it, date it, come back in a day. The kayak will still be there tomorrow, if it is still a good idea.", 2, ["impulsivity", "prioritisation", "planning"], "jax", "Jax parked the kayak. For a day.", { prompt: "How long is the park?", options: ["A day", "A week", "Until payday", "Until I tell someone"] }),
  stub("transition_reset_v1", "3-Minute Transition Reset", "Between one thing and the next: stop, three slow breaths, name the next thing, begin. Some people find this useful for resetting attention.", 3, ["transitions", "mindfulness"], "arjun", "Three breaths between the meeting and the report.", { prompt: "When would you use it?", options: ["After meetings", "Before starting", "Getting home", "Before bed"] }),
];

export function learningModule(id: string): LearningModule {
  const m = MODULES.find((x) => x.id === id);
  if (!m) throw new Error(`lives: unknown module ${id}`);
  return m;
}
