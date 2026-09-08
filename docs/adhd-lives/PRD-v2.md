# ADHD Lives — Technical PRD v2

The founder's second PRD, kept verbatim (2026-09-08) so `src/lives/` and ADR 0006 can cite it by
section. Where the PRD names a native stack, ADR 0006 records the decision to build the engine
renderer-independent on this web app first. Where it names a "correct" answer or a score, the
repo's law still holds: nothing educational is scored, and only "this is me" personalises.

---

Technical Product Requirements Document
Version 2.0
Working codename: ADHD Lives
Product type: Native 2D mobile microgame + ADHD self-management learning platform
Primary platforms: iOS and Android
Secondary platform: Web preview for internal testing and selected learning modules
Primary implementation language: TypeScript
Recommended stack: Expo + React Native + TypeScript + React Native Skia + Reanimated + React Native Gesture Handler
Document purpose: Complete product, game, learning-system and technical specification suitable for direct handoff to an experienced AI-assisted or vibecoding engineer.
1. PRODUCT THESIS
ADHD Lives is a fast-paced cartoon microgame in which players jump between moments in the lives of eight recurring characters who experience different patterns of ADHD-related difficulties.
The player might:

* draw a safe route for Maya through an overwhelming intersection
* find the mosquito preventing Leo from sleeping
* help Arjun lock into a meeting while cows, burgers, random memories, actual research reports and PowerPoints compete for attention
* stop Zoe sending 14 impulsive messages
* help Theo leave the house without reorganising the bookshelf
* remind Mia why she walked into a room
* stop Jax buying a kayak when he went to the supermarket for milk
* help Nina start a task without turning it into a giant mental mountain
* protect chips from pigeons
* catch a flying pancake
* swat wasps

The product begins as entertainment.
Only after play does it reveal a second layer:
Some of these moments may feel familiar. Here are practical things people can try.
Players can then:

* ignore the suggestion
* save it for later
* start a 2 to 10 minute learning module
* practice a strategy
* add a strategy to their personal toolkit
* return to it later

The product principle is:
Game first. Recognition second. Useful strategy third.
2. THE TWO CORE LOOPS
The product has two interconnected loops.
Loop A: Arcade loop

```text
PLAY
 ↓
microgame
 ↓
microgame
 ↓
microgame
 ↓
FASTER
 ↓
failure / survival
 ↓
score
 ↓
play again

```

This loop must remain compelling even if the educational system is completely ignored.
Loop B: Learning loop

```text
PLAY
 ↓
recognisable character moment
 ↓
end-of-run reflection
 ↓
"this felt familiar"
 ↓
relevant strategy surfaced
 ↓
DO NOW / SAVE FOR LATER
 ↓
2-10 minute module
 ↓
practice one concrete behaviour
 ↓
add to My Toolkit
 ↓
optional later reminder / revisit

```

The learning loop should feel like discovering something useful from the game, not being diverted into a health curriculum.
3. CRITICAL PERSONALISATION RULE
Never make the inference:
Player failed working-memory game → player has impaired working memory → recommend intervention.
That would overinterpret arcade performance.
Instead recommendations should be driven by:
Strong signals

* player manually taps "This is me"
* player saves a character moment
* player selects a topic from Explore
* player chooses a personal goal during onboarding
* player explicitly rates a strategy as relevant

Weak contextual signals

* character appeared frequently during run
* player encountered a particular game
* player viewed a related character story

Weak signals can determine which cards are displayed first.
They must not be framed as clinical conclusions.
Example:
Good:
Mia's "Why am I in this room?" moment felt familiar? A tiny external-memory trick can help.
Bad:
Your gameplay indicates working-memory impairment.
4. PRODUCT EXPERIENCE
A normal session:
Game
ARJUN
LOCK IN!
Cow.
PowerPoint.
Burger.
Research report.
Sheep.
Revenue chart.
Player taps relevant work objects.
Next game.
Game
LEO
GET IT!
Mosquito moves around bedroom.
Tap.
Next game.
Game
RANDOM
PIGEONS!
Swipe pigeons away.
Next.
Game
ZOE
DON'T!
Giant SEND button.
Player resists touching.
Eventually loses run.
5. END-OF-RUN SCORE EXPERIENCE
The score page should initially remain an arcade reward screen.
Top:
8,430
NEW HIGH SCORE
Characters survived:
18
Lives:
0
Primary CTA:
AGAIN
Immediately below this, show a small contextual section:
Anything look familiar?
Example cards:
Arjun's meeting
"I was definitely the cow."
`This is me`
Leo trying to sleep
Tiny noises become impossible to ignore?
`This is me`
Zoe's message spiral
Ever wanted to respond immediately and regretted it?
`This is me`
These cards are optional.
6. STRATEGY REVEAL
If player taps:
This is me
card expands.
Example:
Staying anchored in meetings
One surprisingly effective approach is to create an external attention target before the meeting begins.
2 min
`Try it now`
`Save for later`
Not:
You have inattentive ADHD.
Not:
We detected impaired sustained attention.
7. THREE END-SCREEN ACTIONS
Every strategy card should expose:
TRY NOW
Start immediately.
SAVE
Add to My Toolkit / Learn Later.
NOT FOR ME
Dismiss and reduce future recommendation weighting.
This is essential.
The user must feel agency rather than being prescribed content.
8. WHY THIS LAYER SHOULD COME AFTER GAMEPLAY
Never place:
Here's a strategy!
immediately after every microgame.
That destroys pacing.
Microgames should transition in:
approximately 150 to 350 ms.
Education belongs primarily at:

* end of run
* character screen
* dedicated Learn tab
* My Toolkit
* optional post-character-story moments

9. LEARNING PHILOSOPHY
Modules should not resemble articles.
The player has just been trained to interact.
Continue using interaction.
A module should be:

```text
recognise
 ↓
understand
 ↓
try
 ↓
personalise
 ↓
leave with one action

```

Most modules:
2 to 6 minutes
Some guided experiences:
5 to 12 minutes
Avoid 20-minute lecture experiences.
10. MODULE TYPES
The platform should support several module families.
10.1 Quick strategy
30 seconds to 2 minutes.
Example:
PARK THE THOUGHT
During a meeting:

1. Keep one note labelled LATER
2. Put unrelated thoughts there
3. Return immediately to the meeting
4. Review later if still relevant

Interactive module lets player practise.
10.2 Skill module
3 to 7 minutes.
Example:
Getting out the door
Learn:

* departure anchor
* exit zone
* minimum viable leaving sequence
* transition alarms

10.3 Guided session
Example:

* 3-minute grounding
* 5-minute mindfulness
* body scan
* sleep wind-down
* breathing
* transition reset

10.4 Relationship module
Interactive scenarios.
Example:
Partner says:
"You never listen to me."
Player chooses possible responses.
Module teaches:

* repair
* reflecting back
* interruption management
* external reminders
* distinguishing intent from impact

10.5 Environment setup
Example:
Build your launch pad
Interactive checklist:
Choose one location near door for:

* wallet
* keys
* badge
* medication
* headphones

Player customises their own setup.
10.6 Tiny experiment
User tries something for several days.
Example:
Put keys in the same bowl for three departures.
Then optionally report:
Helped
Not sure
Didn't help
No streak punishment.
11. LEARNING DOMAIN TAXONOMY
Initial learning library should support:

```ts
export type LearningDomain =
  | "attention"
  | "working_memory"
  | "task_initiation"
  | "prioritisation"
  | "time_management"
  | "transitions"
  | "impulsivity"
  | "relationships"
  | "communication"
  | "emotional_regulation"
  | "sleep"
  | "sensory_management"
  | "environment"
  | "planning"
  | "organisation"
  | "mindfulness"
  | "self_understanding";

```

Do not expose all of these as clinical categories in gameplay.
12. CHARACTER TO LEARNING MAP
Maya
Common learning recommendations:

* managing sensory load
* reducing competing inputs
* planning routes before entering busy environments
* grounding during overwhelm
* environmental simplification
* transition planning

Leo
Possible modules:

* sleep environment
* sensory settling
* physical movement breaks
* down-regulating before bed
* restlessness strategies
* noticing stimulation needs

Arjun
Possible modules:

* meeting attention
* external working memory
* focus anchors
* notification control
* task prioritisation
* hyperfocus boundaries
* meeting preparation

Zoe
Possible modules:

* pause-before-send
* communication repair
* listening without losing your thought
* relationship check-ins
* emotional regulation
* alternative interpretations
* managing interruption

Theo
Possible modules:

* time anchors
* visual departure countdown
* reverse planning
* transition cues
* minimum viable morning routine
* preparation the night before

Mia
Possible modules:

* externalising memory
* capture systems
* remembering intentions
* visual cues
* reducing doorway forgetting
* note-taking strategies

Jax
Possible modules:

* impulse delay
* novelty parking
* shopping barriers
* one-project rule
* idea capture
* finishing before starting

Nina
Possible modules:

* task decomposition
* imperfect first drafts
* initiation rituals
* good-enough rules
* reducing overwhelm
* self-compassion
* avoiding overplanning

13. EXAMPLE: ARJUN LEARNING FLOW
During gameplay:
LOCK IN!
Player identifies work-relevant objects.
At end:
Arjun had a rough meeting.
Does your attention also disappear halfway through meetings?
`Sometimes`
If selected:
Try: The Meeting Anchor
2 min
Give your attention somewhere physical to return to.
Actions:

1. Before meeting, write the meeting's purpose at top of page.
2. Keep pen touching page.
3. When attention drifts, make one tiny mark.
4. Look back at meeting purpose.
5. Write one sentence about what is happening now.

Then interactive practice:
Fake meeting begins.
Random thought appears:
BUY FLIGHTS
Player drags it into:
LATER
and taps:
CURRENT DISCUSSION
Complete.
Final:
Your version
Choose anchor:

* paper notebook
* digital note
* meeting agenda
* one sticky note

`Add to Toolkit`
14. EXAMPLE: LEO SLEEP FLOW
Game:
Leo is trying to sleep.
Mosquito buzzing.
At score screen:
Tiny sounds keeping your brain awake?
`This is me`
Strategy:
Lower the sensory floor
4 min
Module explains briefly:
When a tiny sound becomes the most noticeable thing in the room, adding a predictable background sound may make individual noises less salient for some people.
Player selects:

* fan
* white/pink noise
* quiet audio
* earplugs where appropriate
* reducing notification sounds

Then:
2-minute wind-down
Optional short guided breathing / sensory settling session.
`Do now`
`Save for tonight`
15. SLEEP HYGIENE MODULE FAMILY
Sleep should be a substantial content cluster.
Possible modules:
Make tomorrow easier tonight
Prepare:

* clothes
* keys
* bag
* charger

Reduce stimulation ramp
Interactive evening timeline.
Notification sunset
Configure conceptually:

* silence non-essential alerts
* charge phone away from bed
* scheduled do-not-disturb

Brain dump
Write:
What is your brain trying not to forget?
User adds items.
Module teaches externalising before bed.
Guided wind-down
3, 5 or 10 minutes.
Audio.
Optional animation.
16. MEDITATION / MINDFULNESS SYSTEM
Do not position as:
Meditation fixes ADHD.
Instead:
Some people find brief grounding or mindfulness useful for resetting attention or reducing arousal.
Initial sessions:
60-second reset
3-minute transition reset
5-minute settle for sleep
5-minute before difficult conversation
3-minute "brain everywhere" grounding
Each module includes:

* audio
* visual timer
* pause
* skip
* transcript
* no streak requirement

17. RELATIONSHIP LEARNING
This should be one of the strongest areas because the characters naturally generate social situations.
Example Zoe module:
Keeping the thought without interrupting
Problem:
"If I don't say it now, I'll forget."
Module introduces:
The keyword hold
During conversation:

1. Don't store full sentence.
2. Pick one keyword.
3. Hold the keyword.
4. Return attention to speaker.
5. Use keyword when your turn arrives.

Interactive simulation:
Friend:
"Work was terrible because..."
Thought appears:
AIRPORT STORY
Player taps:
`AIRPORT`
It becomes small note.
Friend continues.
Player listens.
When friend finishes:
keyword remains available.
18. RELATIONSHIP REPAIR MODULE
Scenario:
Zoe interrupted partner repeatedly.
Instead of framing as moral failure:
ADHD can help explain behaviour. It doesn't automatically erase its impact.
Teach repair:

1. acknowledge
2. don't over-defend
3. show understanding
4. identify practical adjustment

Interactive options.
Example:
Partner:
"I feel like you're not listening."
Responses:
A.
"I can't help it, I have ADHD."
B.
"I was listening."
C.
"I can see why it felt that way. I kept interrupting. Can you finish, and I'll write my thoughts down instead?"
C demonstrates repair.
Do not make every scenario one obviously correct moral answer.
Include nuanced choices.
19. TIME BLINDNESS MODULE
Triggered by Theo-related resonance.
WORK BACKWARDS
Player chooses:
Need to arrive: 9:00
Module visually builds:

```text
ARRIVE       9:00
WALK IN      8:55
PARK         8:50
DRIVE        8:25
LEAVE HOME   8:20
SHOES/KEYS   8:15

```

Then teaches:
Plan from arrival backwards rather than estimating forwards.
User can create an example.
No calendar integration needed for MVP.
20. TASK INITIATION MODULE
Nina's task mountain.
Module:
MAKE THE FIRST STEP EMBARRASSINGLY SMALL
User enters:
Finish report.
System asks:
What's the first physical action?
Examples:

* open file
* write title
* paste notes
* type first sentence

User chooses.
Then a button:
DO 60 SECONDS
Starts 60-second timer.
At end:
Keep going
or
Done for now
No shame language.
21. WORKING MEMORY MODULE
Mia.
DON'T REMEMBER IT. PLACE IT.
Core idea:
Convert intentions into external objects.
Examples:
Need package tomorrow?
Put it by door.
Need to ask colleague something?
Put it on meeting agenda.
Need to bring document?
Put visual cue somewhere unavoidable.
Interactive game-like exercise:
User sees:
Take lunch tomorrow
Options:

* remember harder
* leave note inside notes app
* put lunch bag beside keys

Discuss differences between invisible reminders and context-linked cues.
22. SENSORY OVERWHELM MODULE
Maya.
Module begins with stylised version of intersection.
Player can toggle sensory layers:

* traffic sound
* visual advertisements
* notifications
* conversation
* background movement

Then:
REMOVE ONE LAYER
Teach reducing total input rather than forcing perfect concentration.
Examples:

* quieter location
* headphones
* visual simplification
* stepping aside briefly
* written directions before entering environment

Should not imply all people with ADHD have sensory sensitivity.
23. STRATEGY CONTENT MODEL
Every strategy should be represented independently from the game.

```ts
export type StrategyId = string;

export interface StrategyDefinition {
  id: StrategyId;

  title: string;
  shortDescription: string;

  domains: LearningDomain[];

  estimatedMinutes: number;

  characterIds: CharacterId[];
  relatedGameIds: string[];

  evidenceLevel:
    | "established"
    | "supported"
    | "practical_consensus"
    | "experiential";

  moduleId: string;

  tags: string[];

  active: boolean;
}

```

24. MODULE CONTENT MODEL
Modules should be data-driven where possible.

```ts
export type LearningBlock =
  | TextBlock
  | IllustrationBlock
  | ChoiceBlock
  | ReflectionBlock
  | InteractivePracticeBlock
  | TimerBlock
  | AudioBlock
  | ChecklistBlock
  | ScenarioBlock
  | ActionPlanBlock;

export interface LearningModule {
  id: string;
  version: number;

  title: string;
  description: string;

  estimatedMinutes: number;

  domains: LearningDomain[];

  blocks: LearningBlock[];

  sources?: EvidenceReference[];

  reviewedBy?: string[];

  safetyCategory?: "general" | "wellbeing" | "requires_disclaimer";
}

```

25. WHY DATA-DRIVEN MODULES MATTER
Do not create one React screen for every learning module.
The system should render:

```text
module JSON
 ↓
ModuleRenderer
 ↓
blocks

```

This allows content experts to create modules without writing React components.
Custom interactive practices can still use reusable activity components.
26. LEARNING BLOCK EXAMPLE

```ts
const meetingAnchorModule: LearningModule = {
  id: "meeting_anchor_v1",
  version: 1,

  title: "The Meeting Anchor",
  description: "A tiny way to give drifting attention somewhere to return.",
  estimatedMinutes: 2,

  domains: ["attention", "working_memory"],

  blocks: [
    {
      type: "text",
      body:
        "Before the meeting begins, write down the one thing this meeting is about."
    },
    {
      type: "interactive_practice",
      activityId: "meeting_anchor_simulation"
    },
    {
      type: "action_plan",
      prompt: "What will you use as your anchor?",
      options: [
        "Notebook",
        "Meeting agenda",
        "Sticky note",
        "Digital note"
      ]
    }
  ]
};

```

27. LEARNING NAVIGATION
Primary bottom-level application areas:

```text
PLAY
CHARACTERS
LEARN
TOOLKIT

```

Settings accessible separately.
Do not show bottom navigation inside active Chaos Run.
28. LEARN HOME
The Learn screen should not look like a textbook library.
Recommended sections:
For you
Based on:

* explicit resonance
* saved strategies
* selected goals

2-minute tools
Fast interventions.
Sleep
Work & study
Relationships
Getting things done
Managing overwhelm
Understanding your ADHD
29. MY TOOLKIT
This is more important than module completion percentages.
The outcome should be:
Which practical strategies have I decided are worth trying?
Toolkit cards:
Meeting Anchor
Use before meetings
Launch Pad
Keys + wallet + badge near door
Reverse Plan
Work backwards from arrival time
Pause Before Send
Wait before emotionally loaded replies
Player can:

* open
* mark tried
* edit their personal version
* remove
* save note

30. LEARN LATER QUEUE
When user selects:
Save for later
store:

```ts
interface SavedLearningItem {
  strategyId: string;

  savedAt: number;

  source:
    | "score_screen"
    | "character"
    | "learn"
    | "module";

  relatedCharacterId?: CharacterId;
  relatedGameId?: string;

  status:
    | "saved"
    | "started"
    | "completed"
    | "dismissed";
}

```

31. END-OF-RUN RECOMMENDATION ENGINE
After a run, generate up to:
3 suggestions maximum.
Never show 8.
Inputs:

```ts
interface RecommendationContext {
  encounteredGameIds: string[];

  encounteredCharacterIds: CharacterId[];

  resonanceSignals: ResonanceSignal[];

  savedStrategyIds: string[];

  completedModuleIds: string[];

  dismissedStrategyIds: string[];

  selectedGoals: LearningDomain[];
}

```

32. RECOMMENDATION LOGIC
Priority:
Tier 1
Player explicitly said:
This is me
Tier 2
Selected goal matches encountered character/game.
Tier 3
Character/game encountered and strategy not previously dismissed.
Tier 4
General high-value strategy.
Never use failure rate as primary criterion.
33. RECOMMENDATION PSEUDOCODE

```ts
function recommendStrategies(
  context: RecommendationContext,
  strategies: StrategyDefinition[]
): StrategyDefinition[] {
  return strategies
    .filter(strategy => strategy.active)
    .filter(strategy => !context.dismissedStrategyIds.includes(strategy.id))
    .map(strategy => ({
      strategy,
      score: scoreStrategy(strategy, context),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(entry => entry.strategy);
}

```

34. EXAMPLE WEIGHTS

```text
explicit "this is me" match           +10
selected goal match                    +6
encountered related game               +3
encountered related character          +2
saved previously                       -5
completed recently                     -6
dismissed                             exclude
same domain already displayed          -2

```

35. RESONANCE SIGNAL

```ts
interface ResonanceSignal {
  sourceType: "game" | "character" | "moment";

  sourceId: string;

  response:
    | "this_is_me"
    | "sometimes"
    | "not_me";

  createdAt: number;
}

```

This becomes the ethically appropriate basis for personalisation.
36. END SCREEN DETAIL
Recommended screen hierarchy:

```text
HIGH SCORE
8,430

18 moments survived
3 new games discovered

[ AGAIN ]

────────────

ANYTHING FEEL FAMILIAR?

Arjun
"Where did my attention go?"
[ This is me ]

Leo
"Why is that tiny sound SO loud?"
[ This is me ]

────────────

TRY SOMETHING USEFUL

Meeting Anchor
2 min
[ TRY NOW ] [ SAVE ]

Quiet the Sensory Floor
4 min
[ TRY NOW ] [ SAVE ]

```

Do not let education visually overpower AGAIN.
37. OPTIONAL POST-RUN REFLECTION
Maximum one question per run.
Examples:
Which moment felt most like your life?
or:
Anything worth trying later?
Never:
Rate your ADHD severity.
38. MODULE COMPLETION
Do not primarily reward:

* badges
* perfect completion
* long streaks

Reward:

* trying
* saving
* returning
* adapting strategies

Potential gentle language:
Added to your Toolkit
Worth trying this week
Make it yours
39. STRATEGY ADAPTATION
At end of a module:
MAKE IT YOURS
Example:
Launch Pad strategy.
Choose location:

* bowl by door
* backpack
* desk
* shelf
* custom

Choose items:

* keys
* wallet
* badge
* headphones
* medication
* charger

Store personal configuration.
This turns education into actual behaviour planning.
40. OPTIONAL REMINDERS
Future feature.
Example:
After sleep module:
Want to be reminded tonight?
This should use explicit user consent.
Do not automatically create notifications.
Potential options:

* tonight
* tomorrow
* weekday mornings
* never

41. CHARACTER STORIES AS EDUCATION BRIDGE
Character profiles can connect gameplay and strategies.
Example:
THEO
Can estimate the economic impact of a project.
Cannot estimate how long showering takes.
Things Theo is trying

* reverse planning
* visual timer
* launch pad
* "leave" alarm

Player can tap any strategy.
This makes learning feel like:
What is the character trying?
rather than:
Here is your treatment plan.
42. GAMEPLAY ARCHITECTURE
Recommended stack:

```text
Expo
React Native
TypeScript
React Native Skia
React Native Reanimated
React Native Gesture Handler
Expo Router
expo-audio
expo-haptics
expo-sqlite

```

React owns:

* navigation
* menus
* score screen
* Learn
* Toolkit
* modules
* durable state

Skia owns:

* active microgame
* animated sprites
* particles
* drawn paths
* collisions
* visual effects

Reanimated owns:

* frame-sensitive animation

Gesture Handler owns:

* taps
* drags
* swipes
* holds
* traces

43. CORE APPLICATION STRUCTURE

```text
adhd-lives/
│
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── play.tsx
│   ├── results.tsx
│   ├── characters.tsx
│   ├── character/[id].tsx
│   ├── learn/
│   │   ├── index.tsx
│   │   └── module/[id].tsx
│   ├── toolkit.tsx
│   └── settings.tsx
│
├── src/
│   ├── game/
│   │   ├── engine/
│   │   ├── rendering/
│   │   ├── input/
│   │   ├── minigames/
│   │   ├── session/
│   │   └── types/
│   │
│   ├── learning/
│   │   ├── engine/
│   │   │   ├── ModuleRenderer.tsx
│   │   │   ├── RecommendationEngine.ts
│   │   │   ├── LearningProgress.ts
│   │   │   └── StrategyMatcher.ts
│   │   │
│   │   ├── blocks/
│   │   │   ├── TextBlock.tsx
│   │   │   ├── ChoiceBlock.tsx
│   │   │   ├── ReflectionBlock.tsx
│   │   │   ├── TimerBlock.tsx
│   │   │   ├── AudioBlock.tsx
│   │   │   ├── ScenarioBlock.tsx
│   │   │   ├── ChecklistBlock.tsx
│   │   │   ├── PracticeBlock.tsx
│   │   │   └── ActionPlanBlock.tsx
│   │   │
│   │   ├── modules/
│   │   ├── strategies/
│   │   └── types/
│   │
│   ├── characters/
│   ├── audio/
│   ├── storage/
│   ├── analytics/
│   ├── assets/
│   └── ui/
│
└── tests/

```

44. GAME ENGINE MODEL
Every minigame uses:

```text
PRELOAD
 ↓
INTRO
 ↓
ACTIVE
 ↓
SUCCESS / FAILURE
 ↓
RESOLUTION
 ↓
TRANSITION

```

Typical:
INTRO:
350 to 800 ms
ACTIVE:
2.5 to 7 seconds
RESOLUTION:
500 to 1,500 ms
TRANSITION:
150 to 350 ms
45. COMMON GAME TYPES

```ts
export type InputMechanic =
  | "tap"
  | "tap_filter"
  | "rapid_tap"
  | "drag"
  | "swipe"
  | "trace"
  | "hold"
  | "hold_release"
  | "no_input"
  | "sequence"
  | "wipe"
  | "timing"
  | "catch";

```

46. REUSABLE MECHANIC ENGINES
Build approximately 10 engines:

1. Target Swat
2. Semantic Filter
3. Trace Path
4. Inhibition
5. Object Search
6. Goal Protection
7. Hold/Release
8. Rapid Sorting
9. Wipe/Scrub
10. Precision Timing

Aim for at least 70% of games to be configuration-driven.
47. CHARACTER SUMMARY
CharacterDominant lived patternTypical mechanicsMayadistractibility + overwhelmtrace, filter, searchLeohyperactivity + sensory intensityswat, catch, rapid tapArjunhigh achievement + distractibility/hyperfocussemantic filter, prioritisationZoeimpulsivity + social/emotional reactivityinhibition, hold, conversationTheotime blindness + transitionssequence, route, filterMiaworking memory + daydreamingmemory, search, sequenceJaxnovelty seeking + impulsivityswipe, goal protectionNinainitiation + perfectionismselection, inhibition
48. SIGNATURE GAME: MAYA CROSSING
Instruction:
DRAW A SAFE PATH!
Maya stands at busy crossing.
Competing stimuli:

* buses
* cyclists
* dogs
* pedestrians
* advertisements
* construction
* movement
* thought bubbles

Player touches Maya and traces route.
MVP:

1. draw
2. validate
3. Maya follows
4. success/failure

Do not require simultaneous character control.
49. SIGNATURE GAME: LEO MOSQUITO
Instruction:
GET IT!
Dark bedroom.
Mosquito:

* moves
* disappears
* buzzes
* gets increasingly ridiculous

Miss escalation:

1. normal mosquito
2. smug mosquito
3. megaphone
4. tiny helicopter

Failure:
mosquito orchestra.
Related learning:

* sensory floor
* bedtime stimulation
* sleep environment
* short wind-down

50. SIGNATURE GAME: ARJUN LOCK IN
Instruction:
LOCK IN!
Relevant:

* work brief
* report
* PowerPoint
* revenue chart
* roadmap
* agenda

Irrelevant:

* cow
* sheep
* burger
* dinosaur
* spaceship
* surfboard

Later difficulty:

* unrelated research article
* personal email
* news story
* interesting work-adjacent content

Player taps only relevant items.
Related learning:

* Meeting Anchor
* Parking Lot note
* notification boundaries
* external working memory

51. SIGNATURE GAME: ZOE DON'T SEND IT
Instruction:
DON'T!
Massive SEND button.
Button:

* pulses
* grows
* shakes
* gets arrows
* eventually says PRESS IT

Any prohibited tap fails.
Related learning:

* pause-before-send
* draft first
* emotion delay
* communication repair

52. SIGNATURE GAME: MIA WHY ARE YOU HERE?
Show:
GET THE CHARGER
Transition.
Instruction:
WHY ARE YOU HERE?
Objects:

* charger
* banana
* sock
* book
* rubber chicken
* tiny horse

Tap charger.
Related learning:

* external memory
* environmental cues
* object placement

53. SIGNATURE GAME: THEO GET OUT
Clock:
7:55
Instruction:
GET OUT!
Targets:

* shoes
* keys
* phone
* door

Distractors:

* crooked book
* laundry
* plant
* email
* open drawer
* vacuum

Related learning:

* departure routine
* reverse planning
* launch pad
* transition alarm

54. SIGNATURE GAME: JAX JUST MILK
Instruction:
JUST MILK!
Objects fly into cart:

* milk
* kayak
* lamp
* cactus
* drone
* waffle maker

Swipe away everything except milk.
Related learning:

* buying delay
* shopping list anchoring
* friction before purchase
* novelty parking

55. SIGNATURE GAME: NINA START SMALL
Task becomes literal mountain.
Instruction:
START SMALL!
Choices:

* write perfect email
* research everything
* reorganise notes
* type "Hi"

Tap smallest executable step.
Related learning:

* task decomposition
* 60-second start
* imperfect first draft

56. RANDOM GAMES
At least 20 to 30 percent of Chaos Run should remain mostly entertainment.
Examples:

* Wasps
* Pigeons
* Pancake
* Fish
* Toast
* Bubbles
* Spider
* Sock Monster
* Rogue Blender
* Seagull
* Frog
* Runaway Office Chair

No learning recommendation needs to follow these.
57. SESSION DIRECTOR
Do not randomise uniformly.
Hard constraints:

1. no immediate identical game
2. avoid same mechanic twice consecutively
3. never two no-input games consecutively
4. character not more than twice in last five
5. first three games mechanically obvious
6. trace games separated
7. random-fun games approximately 20 to 30%
8. respect difficulty compatibility

58. DIFFICULTY
Difficulty dimensions:

```ts
interface DifficultyParameters {
  timeMultiplier: number;
  targetSpeed: number;
  targetCount: number;
  distractorCount: number;
  distractorSimilarity: number;
  hitRadiusMultiplier: number;
  memoryLength: number;
  pathWidthMultiplier: number;
}

```

Do not only make everything faster.
59. FASTER MOMENT
Every approximately 4 successful games:
FASTER!
700 ms overlay.
Short sound.
Haptic.
Increase difficulty.
Later variants:
FASTER!!
OH NO
GOOD LUCK
Use sparingly.
60. SCORE
Simple scoring:

```ts
baseScore = 100

speedBonus =
  100 * max(0, 1 - completionTime / allowedTime)

difficultyBonus =
  difficulty * 20

```

Score exists for entertainment.
Learning participation must not increase arcade score.
Avoid turning education into point optimisation.
61. LIVES
Default:

3. 

Failure:

* comedic outcome
* life removed
* next game

No modal.
62. GAME OVER
Show:

* score
* high score
* games survived
* new game/character discoveries

Primary:
AGAIN
Secondary educational section below.
Learning must not obstruct replay.
63. LEARNING PROGRESS STORAGE

```ts
interface LearningProfile {
  savedStrategyIds: string[];

  completedModuleIds: string[];

  startedModuleIds: string[];

  dismissedStrategyIds: string[];

  resonanceSignals: ResonanceSignal[];

  selectedGoals: LearningDomain[];

  personalStrategies: PersonalStrategy[];
}

```

64. PERSONAL STRATEGY

```ts
interface PersonalStrategy {
  strategyId: string;

  addedAt: number;

  status:
    | "saved"
    | "trying"
    | "useful"
    | "not_useful";

  customNote?: string;

  personalConfig?: Record<string, string | string[] | boolean>;
}

```

65. STORAGE
MVP can remain entirely local.
Persist through Expo SQLite:

* high score
* settings
* character unlocks
* resonance
* saved strategies
* modules completed
* Toolkit

No login required.
66. OPTIONAL FUTURE ACCOUNT
Future cloud sync can support:

* cross-device Toolkit
* saved modules
* progress
* reminders

But installation-to-gameplay should never require registration.
67. ANALYTICS
Gameplay:

```text
session_started
session_completed
minigame_started
minigame_success
minigame_failure
difficulty_increased

```

Learning:

```text
resonance_selected
strategy_impression
strategy_saved
strategy_dismissed
module_started
module_completed
module_abandoned
strategy_added_to_toolkit
strategy_marked_useful
strategy_marked_not_useful

```

68. ANALYTICS GUARDRAIL
Do not create analytics labels like:

```text
high_inattention_user
working_memory_deficit
severe_adhd

```

Permitted:

```text
saved_sleep_strategy
completed_meeting_anchor
selected_relationship_goal

```

These describe product behaviour, not inferred pathology.
69. PRODUCT SUCCESS METRICS
Game

* D1 retention
* runs per session
* median run length
* minigame completion rate
* high-score replay
* quit points

Learning

* % of players opening at least one strategy
* save-for-later rate
* module start rate
* module completion rate
* Toolkit additions
* strategy usefulness rating
* repeat use

Important combined metric:
Recognition-to-action conversion

```text
users who tapped "This is me"
→
saved or tried related strategy

```

70. LEARNING MODULE DESIGN RULES
Every module must answer:
1. Why might this help?
One short explanation.
2. What exactly do I do?
Concrete behaviour.
3. Can I practise it right now?
Interactive exercise where possible.
4. How do I adapt it to my life?
Personalisation.
5. What do I leave with?
One saved strategy.
71. MODULE UX
Example:

```text
THE MEETING ANCHOR

Give drifting attention somewhere to return.

[ 1/4 ]

Before the meeting begins...

        ↓

TRY IT

Fake meeting simulation

        ↓

MAKE IT YOURS

What will you anchor to?

[ Notebook ]
[ Agenda ]
[ Sticky note ]
[ Digital note ]

        ↓

ADDED TO TOOLKIT

```

Avoid:

* endless scroll
* article walls
* ten-question quiz
* "lesson completed" school aesthetics

72. AUDIO MODULES
For meditation and sleep:

```ts
interface AudioSessionBlock {
  type: "audio";

  audioAssetId: string;

  durationSeconds: number;

  transcriptId: string;

  allowBackgroundPlayback: boolean;
}

```

Controls:

* play
* pause
* rewind 15 sec
* transcript
* end session

No requirement to finish every second.
73. RELATIONSHIP SCENARIO ENGINE
Build reusable scenario component.

```ts
interface ScenarioChoice {
  id: string;
  text: string;
  feedback: string;
}

interface ScenarioBlock {
  type: "scenario";

  characterId: CharacterId;

  prompt: string;

  choices: ScenarioChoice[];
}

```

The purpose is reflection, not moral scoring.
Avoid giant:
CORRECT!
Instead:
"This response acknowledges impact without requiring you to deny your own experience."
74. TIMER ACTIVITY
Reusable for:

* 60-second task start
* pause-before-send
* grounding
* transitions
* short breathing


```ts
interface TimerBlock {
  type: "timer";

  durationSeconds: number;

  label: string;

  allowSkip: boolean;
}

```

75. CHECKLIST BLOCK
Useful for:

* launch pad
* sleep routine
* departure preparation
* meeting setup


```ts
interface ChecklistBlock {
  type: "checklist";

  items: {
    id: string;
    label: string;
  }[];

  allowCustomItems: boolean;
}

```

76. CONTENT EVIDENCE
Every learning strategy should include internal metadata:

```ts
interface EvidenceReference {
  type:
    | "guideline"
    | "systematic_review"
    | "randomized_trial"
    | "expert_consensus"
    | "clinical_practice";

  citation: string;

  url?: string;
}

```

User-facing citations can be exposed under:
Why this?
or:
Evidence
Do not overload default module experience.
77. CLINICAL REVIEW PIPELINE
Every strategy:

```json
{
  "strategyId": "meeting_anchor",
  "domains": ["attention", "working_memory"],
  "claim": "External attention anchors may help some people return attention to task.",
  "evidenceLevel": "practical_consensus",
  "reviewStatus": "pending"
}

```

Content must distinguish:

* evidence-based clinical recommendations
* common behavioural strategies
* experiential/community strategies
* wellness practices

78. SAFETY
This is not a replacement for professional care.
Learning content should include contextual escalation where relevant.
Examples:
Sleep module should not imply simple sleep hygiene is sufficient for severe chronic insomnia.
Emotional modules should not attempt to manage crisis or suicidality as a gamified interaction.
Medication advice should not be delivered through this game layer unless developed separately with appropriate clinical governance.
79. CONTENT TONE
Avoid:
ADHD brains are broken at X.
Avoid:
Neurotypical people can just do this.
Prefer:
Some people with ADHD describe...
This can make...
One strategy worth trying is...
If it doesn't help, discard it.
Strategies should be experiments, not commandments.
80. TOOLKIT PHILOSOPHY
The product's long-term educational object is not:
course completion
It is:
MY ADHD TOOLKIT
A personalised set of:

* attention strategies
* communication tools
* environmental changes
* sleep supports
* transition systems
* planning techniques

Each strategy should be actionable in real life.
81. TOOLKIT HOME EXAMPLE
TODAY
Meeting Anchor
For your 2 pm meeting
`Open`
YOUR TOOLS
Launch Pad
Keys + wallet + badge
Reverse Plan
Work backwards from arrival
60-Second Start
Start before planning
Pause Before Send
Give emotional messages time
SAVED TO LEARN
Sleep Wind-Down
5 min
Staying With Conversations
4 min
82. HOME SCREEN
Recommended:
Large CTA
PLAY
Subtext:
Everything was under control 30 seconds ago.
Below:
Continue learning
Meeting Anchor
2 min left
Your Toolkit
4 strategies
No information-heavy dashboard.
83. OPTIONAL ONBOARDING
Keep extremely lightweight.
Screen 1:
Meet eight lives with ADHD.
Screen 2:
Play first. Learn anything useful later.
Optional:
What would you most like help with?
Select up to 3:

* sleep
* focus
* getting started
* time
* relationships
* overwhelm
* remembering things
* not sure yet

Skip always available.
These selections help recommendation ordering.
84. NO QUESTIONNAIRE BEFORE PLAY
Do not make users complete symptom screening before accessing game.
The game should start rapidly.
If formal assessment functionality is added in future, it should remain architecturally and experientially distinct.
85. GAME STATE

```ts
export interface SessionState {
  sessionId: string;

  score: number;
  lives: number;

  difficulty: number;

  currentGameId: string | null;

  completedGames: number;

  recentGameIds: string[];
  recentMechanics: InputMechanic[];
  recentCharacters: CharacterId[];

  encounteredLearningLinks: string[];

  startedAt: number;
}

```

86. GAME RESULT

```ts
export interface GameResult {
  outcome: "success" | "failure" | "timeout";

  reactionTimeMs?: number;

  scoreDelta: number;

  mistakes: number;

  metadata?: Record<string, string | number | boolean>;
}

```

Do not feed reaction time directly into learning recommendation logic.
87. RESOLUTION-INDEPENDENT CANVAS
Logical design coordinates:

```ts
const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;

```

All:

* sprites
* hitboxes
* paths
* particles

use logical coordinates.
88. FRAME PERFORMANCE
Never use React `setState()` for frame-by-frame position.
Use:

* Reanimated shared values
* Skia
* event-driven game runtime

React only receives meaningful state transitions.
89. INPUT SAFETY
Inputs from previous minigame must not leak into next minigame.
Every game gets:

```ts
gameInstanceId

```

Discard stale input after transition.
Especially critical before:

* Don't Send It
* Good Enough
* Don't Buy It

90. RANDOMNESS
Use deterministic seeded randomness.
Useful for QA.
Example:

```ts
seed = hash(sessionId + gameIndex);

```

Bug report:

```text
seed: 71834921
game: arjun_lock_in_01
difficulty: 4

```

should be reproducible.
91. ASSET STRATEGY
Use reusable:

* characters
* expressions
* props
* backgrounds
* particles
* thought bubbles

Each character needs initial states:

```text
idle
happy
panic
confused
focused
frustrated
failure
celebrate

```

92. ART DIRECTION
Use:

* clean 2D cartoon art
* highly expressive animation
* absurd escalation
* recognisable adult settings
* simple readable silhouettes

Avoid:

* children's educational app aesthetic
* clinical medical visuals
* realistic injury
* depressing pathology framing

93. ACCESSIBILITY
Settings:

* sound effects
* music
* haptics
* reduced motion
* reduced flashing
* reduced sensory effects
* larger instructions
* relaxed timing mode

The product may depict sensory overload but should not unnecessarily create actual overload.
94. MODULE ACCESSIBILITY
Learning modules additionally require:

* transcripts for audio
* captions
* pause
* skip
* no timed reading
* scalable text
* alternatives to drag-only interactions
* low-motion variant

95. FIRST PUBLIC CONTENT TARGET
Minimum:
Game
32 microgames

* 24 ADHD-life games
* 8 primarily fun games

Learning
At least:
16 strategy modules
Recommended initial distribution:

* attention: 2
* working memory: 2
* task initiation: 2
* time/transitions: 2
* relationships: 2
* sleep: 2
* emotional regulation: 1
* sensory management: 1
* environment: 1
* mindfulness: 1

96. INITIAL MODULE REGISTER
ModuleCharacter linksLengthMeeting AnchorArjun2 minParking Lot NoteArjun2 minWhy Am I Here? External CueMia3 minPut It Where You'll Need ItMia2 minReverse PlanningTheo4 minLaunch PadTheo, Mia3 min60-Second StartNina2 minImperfect First DraftNina3 minPause Before SendZoe3 minHold the KeywordZoe4 minLower the Sensory FloorMaya, Leo3 minOverwhelm ResetMaya3 minSleep Wind-DownLeo5 minBrain Dump Before BedLeo, Mia3 minPark the New IdeaJax2 min3-Minute Transition ResetAll3 min
97. VERTICAL SLICE
Do not build entire product first.
Initial six games:

1. Wasps
2. Maya Crossing
3. Arjun Lock In
4. Zoe Don't Send It
5. Mia Why Are You Here?
6. Pancake

Initial four modules:

1. Meeting Anchor
2. External Cue
3. Pause Before Send
4. Sensory/Sleep Reset

End-of-run recommendation system must work across these.
98. VERTICAL SLICE USER JOURNEY
User:

1. opens app
2. taps PLAY
3. plays 6 to 15 microgames
4. loses 3 lives
5. sees score
6. taps AGAIN or scrolls down
7. sees 1 to 3 relevant moments
8. marks one This is me
9. sees matching strategy
10. chooses Save
11. opens Toolkit
12. strategy exists there
13. opens module
14. completes activity
15. customises strategy
16. strategy becomes Trying

That entire flow must work before expanding content volume.
99. IMPLEMENTATION PHASE 0
Bootstrap:

* Expo
* TypeScript strict
* Router
* Skia
* Gesture Handler
* Reanimated
* audio
* haptics
* SQLite

Create:

```text
/play
/results
/learn
/learn/module/[id]
/toolkit
/characters
/settings

```

100. IMPLEMENTATION PHASE 1
Build:

* GameCanvas
* GameRuntime
* GameClock
* InputRouter
* GameRegistry
* SessionDirector
* Score
* Lives

Prove one game works.
101. IMPLEMENTATION PHASE 2
Build six vertical-slice games.
No educational system yet.
Validate game is genuinely fun.
102. IMPLEMENTATION PHASE 3
Build:

* Result screen
* Resonance cards
* RecommendationEngine
* Strategy registry
* Save for later
* Toolkit

At this stage strategy modules may be static.
103. IMPLEMENTATION PHASE 4
Build data-driven:
`ModuleRenderer`
Blocks:

* text
* choice
* checklist
* scenario
* timer
* reflection
* action plan
* audio
* interactive practice

Then implement four vertical-slice modules.
104. IMPLEMENTATION PHASE 5
Expand:

* 16 games
* 8 modules
* eight characters represented
* Learn home
* Toolkit refinement

Run testing.
105. IMPLEMENTATION PHASE 6
Expand:

* 24 to 32 games
* 16+ modules
* character stories
* more strategy mappings
* accessibility
* analytics
* balancing

106. INTERNAL MODULE LAB
Just as the game requires a Mini-game Lab, learning requires:
Module Lab
Development route:

```text
/dev/modules

```

Functions:

* open any module
* start at block
* mark block completed
* inspect module JSON
* simulate save
* simulate recommendation context
* reset progress

107. RECOMMENDATION DEBUGGER
Development screen:

```text
/dev/recommendations

```

Inputs:

* character encountered
* games encountered
* selected goals
* resonance signals
* completed modules
* dismissed strategies

Output:

* strategy ranking
* raw scores
* explanation of why each ranked

Essential for preventing mysterious AI-like recommendation behaviour.
The MVP recommendation engine should be deterministic, not generative AI.
108. DO NOT USE LLM PERSONALISATION FOR MVP
There is no need to send sensitive user behaviour to a language model to generate recommendations.
Use:

* deterministic metadata
* explicit resonance
* content tags
* simple weighted matching

This is:

* easier to audit
* safer
* cheaper
* deterministic
* easier to clinically review

Generative coaching can be considered separately later.
109. TESTING
Game unit tests:

* session selection
* collision
* scoring
* random seed
* timers
* path validation

Learning tests:

* module schema
* strategy linking
* recommendation ranking
* save/dismiss logic
* module progress
* Toolkit persistence

110. CONTENT VALIDATION
Build command:

```text
npm run validate:content

```

Checks:
Games

* unique ID
* valid assets
* mechanic supported
* correct character
* valid duration

Strategies

* unique ID
* valid module
* valid domains
* valid related game IDs

Modules

* valid blocks
* no missing audio/transcript
* estimated duration
* review status

CI fails for broken references.
111. PRODUCT QUALITY BAR FOR GAME
A minigame ships only if:

1. action understood in about 1 second
2. interaction itself is enjoyable
3. failure feels fair
4. outcome is memorable
5. adds mechanical variety

112. PRODUCT QUALITY BAR FOR MODULE
A module ships only if:

1. relevant issue is recognisable
2. recommendation is concrete
3. player can act on it
4. claims have appropriate evidence/review
5. experience is interactive where useful
6. module does not overclaim
7. module can be completed in intended time
8. player leaves with one clear tool

113. NORTH-STAR GAME QUESTION
If ADHD education disappeared, would this still be a fun five-second game?
If no:
redesign.
114. NORTH-STAR LEARNING QUESTION
If the game disappeared, would this still be a practical strategy worth someone's time?
If no:
remove it.
115. NORTH-STAR INTEGRATION QUESTION
Does the strategy feel like a natural response to something the player just recognised in a character's life?
If yes, the game-to-learning bridge is working.
If it feels like:
"You played a game. Now complete your educational content."
the product has failed.
116. FINAL PRODUCT MODEL

```text
                    ADHD LIVES
                        │
          ┌─────────────┴─────────────┐
          │                           │
        PLAY                        LEARN
          │                           │
      Chaos Run                Strategy Library
          │                           │
   Eight Characters              Modules
          │                           │
  Relatable Moments              Practice
          │                           │
          └─────── RECOGNITION ──────┘
                      │
                 This is me
                      │
                Recommendations
                      │
             ┌────────┴────────┐
             │                 │
          DO NOW             SAVE
             │                 │
          Module          Learn Later
             │                 │
             └────────┬────────┘
                      │
                  TOOLKIT
                      │
              real-life strategy

```

The long-term product is therefore not simply an ADHD game and not simply an ADHD education app.
It is a system in which people experience recognisable ADHD moments through highly entertaining characters, identify the experiences that resemble their own life, and progressively build a personalised practical toolkit from strategies connected to those moments.
The game creates attention and recognition.
The characters create emotional relevance.
The strategy layer turns recognition into usefulness.
The modules teach application.
The Toolkit creates continuity beyond the session.
And crucially, the player can ignore all of that and simply hit:
AGAIN
which is what preserves the game as a genuinely enjoyable product.
