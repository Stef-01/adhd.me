# How the leading US mental-health apps ask, learn and stay minimal

A comparative study of Headspace, Calm, BetterHelp, Talkspace and Finch, with Inflow and Done as the
two ADHD-specific references, read against what ADHD.ME is trying to do: match a person to a GP
from their own words, and learn what works for them with as few words on a screen as possible.

Date: 2026-09-21.

## How to read this

- **What is verbatim.** Text in quotation marks is the app's own copy as it appears in the cited
  source. Everything else is paraphrase. "Inferred" marks a judgement of ours.
- **How it was gathered.** Three researchers worked from the apps' own sites and help centres,
  App Store and Google Play listing text and screenshot captions, published UX teardowns (Mobbin,
  Pageflows, Screensdesign, UI Sources, GoodUX, Growth.Design, Medium), Reddit threads, press
  reviews, peer-reviewed outcome papers, and regulator documents (the FTC's 2023 BetterHelp order,
  the DOJ's 2024 to 2025 Done case). The research sandbox could not open pages directly, so every
  finding comes from search-engine snippets of those pages, and per-screen word counts are
  estimates from described screenshots rather than measurements. Each claim carries its URL so a
  reader with a browser can check the screenshot behind it. The screenshot galleries to open first
  are listed at the end.
- **The benchmark ADHD.ME already uses** (`scripts/text-budget-lib.mjs`): Headspace's home is 38
  words, its course detail 26, its Sleep list 60; Finch's home is 19. A screen is 20 to 60 words.

## The one-page answer

| | Headspace | Calm | BetterHelp | Talkspace | Finch | Inflow | Done |
|---|---|---|---|---|---|---|---|
| Job | Meditation, now stepped care | Meditation, sleep, plan-sponsored screening | Therapist matching | Therapist and psychiatry matching | Self-care habits via a pet | ADHD CBT programme | ADHD medication telehealth |
| Intake screens | 3 to 4 questions, "9-10 taps" to first session | About 10 screens, quiz then sign-up then paywall | About 30 questions, one per screen, no skip, no back | 8-tile reason screen then 6 to 7 preference screens; screeners after matching | 8 to 12 screens, one question and one green button each | About 3 minutes, age to diagnosis status to symptoms to goal | 1-minute six-item screener, then forms and ID before a visit |
| The intent question | "What brings you to Headspace?" 6 chips incl. "Just checking it out" | "What brings you to Calm?" 8 chips, multi-select | Fork: "Individual / Couples / Teen", then a 30-question funnel | 8 first-person tiles, "I'm feeling anxious or panicky" … "Something else" | Choose a self-care area; goals pre-filled | "I'm diagnosed by a doctor" and alternatives | ASRS v1.1 Part A, six items |
| Clinical screener | None at intake | PHQ-8 + GAD-7 in Calm Health, retaken every 4 weeks | PHQ-9 items inside the sign-up funnel | PHQ-9 / GAD-7 after matching, every 3 weeks | None | ASRS-style frequency items, "not a diagnostic tool" | ASRS, GAD-7, PHQ-9, medical history, photo ID |
| Daily check-in | Mood after a session, stressor tags | "How are you feeling?" a dozen moods; sleep, gratitude, reflection | Journal prompts, worksheets, a pre-session goal | PHQ re-assessment, "client journey" milestones | 1 to 5 faces, three times a day, optional "Reflect" tags | Daily focus, coach check-in, "wins" | Refill reminders, "how you're feeling about any medication" |
| Micro-insight surface | Mood trend, "My Progress", run streak "it's not about the number" | Mood history; Calm Health returns "3 pieces of content" after a check-in | None structured | PHQ score line "from 15 to below 10 by week 6" | "Mood Breakdown" by week or month; tags show what helped | Progress per module | None |
| How it presents a clinician | Care tab: coach or therapist by "specialty, modality, race, and gender" | Referral out to LifeStance | One assigned therapist; "change my therapist" button, 24 to 48 h wait | Three matches to choose from: photo, years, licence, expertise, approach, video | n/a | n/a | Not shown before the visit; "$20 down" first |
| Words per screen (est.) | 8 to 20 per question; home about 38 | About 22 on the goal screen; home 25 to 35 | 20 to 40 per question, plus "random facts" | 15 to 30 per screen | 10 to 20; home 15 to 25 | 15 to 30 | About 20 per screener item |
| The lesson for us | Escape-hatch chip, time-of-day anchors, precommitment card | Reminder set inside onboarding (40% set one), two-level emotion pick | What not to do: 30 questions before any value, reassurance the pixels contradicted | Choose-from-three, reason paired with the ask, screeners after matching, stimulant rule stated before input | One face, one tap, no shame on a missed day, goals seeded from answers | Diagnosis-status chip, "not a diagnostic tool" wording | Say what the visit cannot promise, collect ID after trust |

## Headspace

**Intake, in order** (GoodUX, https://goodux.appcues.com/blog/headspaces-mindful-onboarding-sequence; designpractice.io, https://medium.com/designpractice-io/onboarding-journey-of-headspace-ios-app-8867420accf):

1. Experience with meditation, then a session length of 3, 5 or 10 minutes.
2. "What brings you to Headspace?" with "Sleeping better, Being less stressed, Finding calm, Being more focused, Managing anxiety, or Just checking it out".
3. When to meditate, "with suggested times based on existing routines rather than choosing a specific time of day".
4. A recap "with a clear call to action to begin using the app straightaway".

"The onboarding asks just two or three questions, each with a small set of options" (GoodUX). A teardown counted "9-10 taps" to the first session (https://tearthemdown.medium.com/product-teardown-headspace-user-onboarding-personalisation-b6effd0df1d7). The history matters: a "38% drop-off rate between the start of the onboarding process and the end" is why the intro screens became "easily exitable" (https://raw.studio/blog/how-headspace-designs-for-mindfulness/). A Purchasely-reported experiment fed the answers into "branching logic in real time so users were routed to the right course recommendation", and a "precommitment" screen where people "make concrete plans for when and how often they'd meditate" lifted course starts by more than 100% (https://www.purchasely.com/blog/headspace-behavioral-science-onboarding-experiment).

**Check-ins and insight.** Mood is logged after a session with stressor tags "like work, school, or finances" (https://www.themindfulnessapp.com/articles/best-meditation-apps-features-comparison-2025). The streak is framed softly: "Your Headspace run streak — it's not about the number" (https://www.headspace.com/articles/building-a-meditation-practice). Ebb, the AI companion, opens with "jumpstart prompts like 'Help me fall asleep' or 'I need a pep talk'" to "reduce the pressure of figuring out what to say" (https://www.businesswire.com/news/home/20251208896917/en/).

**Home.** Apple's design note: "User research convinced the team to strip away complexity and focus on the app's Today tab, which facilitates one-tap access to activities" (https://developer.apple.com/news/?id=fkfnhq8u). The Today tab is keyed to time of day: "Morning: A breathing exercise, the Wake Up … Afternoon: Usually a workout video. Evening: Usually a Sleepcast" (https://www.androidauthority.com/headspace-app-2746501/).

**Care navigation.** Headspace Care's intake asks "how you're feeling, what you want to work on the most (such as reducing stress, managing anxiety or processing grief), how your issues affect your life in terms of physical health and relationships" (https://www.forbes.com/health/mind/headspace-care-review/), then routes "to the most appropriate level of care—whether that's self-guided tools, coaching, therapy, psychiatry" (https://organizations.headspace.com/care-model). Therapist matching is by "specialty, modality, race, and gender" and a reviewer notes it "asks for fewer thorough intake questions" than rivals (https://www.choosingtherapy.com/headspace-therapy-review/).

**Price.** $12.99 a month or $69.99 a year; coaching add-on $99.99 a month (https://www.choosingtherapy.com/headspace-review/).

## Calm

**Intake, in order** (Screensdesign, https://screensdesign.com/articles/calm-onboarding-design/; UI Sources, https://uisources.com/explainer/calm-onboarding):

1. "What brings you to Calm?" multi-select: "Reduce anxiety", "Build self esteem", "Learn to meditate", "Increase happiness", "Better sleep", "Develop gratitude", "Improve focus", "Reduce stress".
2. Habits and "what's kept you from sticking with meditation before" (https://inthemoment.app/articles/calm-vs-headspace).
3. Pick a scene and ambient sound.
4. A first short practice before the home screen.
5. A reminder. "When Calm made reminder setup part of the onboarding process, 40% of new users set a reminder" (https://www.trypropel.ai/resources/how-does-calm-retain-users).
6. Sign-up, then the $69.99 a year paywall with a 7-day trial (https://screensdesign.com/apps/calm/).

A 2026 critique says Calm "flattens reasons into a dropdown (such as 'Stress,' 'Sleep,' or 'Focus') rather than capturing deeper context" (https://getperspective.ai/blog/calm-ai-strategy-mental-health-app-conversational-onboarding-2026). That is the gap ADHD.ME's free-text finder already fills.

**Check-ins.** The help centre: "Check-ins are a great way to bring more awareness to how you're feeling … record your mood, sleep quality, gratitude, and Daily Calm reflection." Mood asks "How are you feeling?" from "a dozen different moods"; gratitude prompts run "from 'What are you grateful for today?' to 'What inspired you today?'" (https://support.calm.com/hc/en-us/articles/9699990936731-How-to-Use-Check-Ins). Sleep factors include "exercise, stress, anxiety, caffeine, screen time, and medication" (https://www.sleepfoundation.org/best-sleep-apps/calm-app-review).

**The two-level emotion pick** (Calm Health, https://support.calm.com/hc/en-us/articles/43355620083739-How-to-Use-Emotions-Check-In-on-the-Calm-Health-App): "You will select from 1 of 5 primary emotions … you will select a sub-emotion, ranging in intensity level … you will tag the reasons that may contribute … you will see the completion screen with 3 pieces of content recommendations." This is the least-words shape for a mood capture that still yields structure.

**Screening and referral.** Calm Health "uses industry-standard screenings of the Generalized Anxiety Disorder Scale-7 (GAD-7) and Patient Health Questionnaire-9 (PHQ-9)" (https://www.uhc.com/news-articles/healthy-living/calm-health). The framing sentence: "this screening is not a substitute for care by a physician or other health care provider, but can be a great first step" (https://www.calm.com/blog/mental-health-screening). "The recommendation is to retake the screening every four weeks to track your progress" (https://support.calm.com/hc/en-us/articles/27054399791643-Calm-Health-FAQs). Results route to "referrals to virtual behavioral coaching or licensed mental health therapists" (https://www.uhc.com/agents-brokers/employer-sponsored-plans/news-strategies/supporting-employees-with-calm-health).

**Price.** $14.99 a month or $69.99 a year; Calm Health is employer-sponsored (https://carepaths.com/calm-app-pricing/).

## BetterHelp

**Intake, in order.** A fork, "Individual," "Couples," or "Teen" (FTC complaint, https://www.ftc.gov/system/files/ftc_gov/pdf/2023169betterhelpcomplaintfinal.pdf), then about 30 questions one per screen (a third-party PDF lists them: https://bcms.org/lifebridge/faq/PreviewofBetterHelp30ScreeningQuestions.pdf). The sequence:

1. "What is your gender?" 2. "How old are you?" 3. "Do you consider yourself to be spiritual or religious?" 4. "What is your relationship status?" 5. "Have you ever been in counseling or therapy before?"
6. "How would you rate your current physical health?" 7. "… sleeping habits?" 8. "… eating habits?" 9. "… financial status?" on "excellent / good / fair / poor"; fair or poor plus being out of work unlocks financial aid (https://www.choosingtherapy.com/betterhelp-financial-aid/).
10. "Are you currently experiencing overwhelming sadness, grief or depression?"
11 to 15. PHQ-9 items: "Little interest or pleasure in doing things?", "Trouble falling asleep, staying asleep, or sleeping too much?", "Feeling tired or having little energy?", the psychomotor item, and the self-harm item.
16 to 19. Medication, alcohol, anxiety, intimacy, sexual orientation, employment and income.
20. What you want from a therapist: "somebody who simply listens to you, teaches you new skills, proactively checks in with you, gives you homework" (https://www.find-a-therapist.com/betterhelp-canada-review/).
21. Therapist preferences: "gender, religion, race, age, and if they're part of the LGBT community" (https://www.choosingtherapy.com/how-to-find-good-betterhelp-therapist/).
22. Specialisation checklist. 23. Free text on why you are seeking therapy. 24. State, timezone, account, payment.

**What went wrong, and why it is the most useful case here.** A 2022 teardown found "the progress bar doesn't help users anticipate the end," "no back button, requiring users to restart," and "random facts about depression" interleaved with questions (https://www.angelovanikoletadesign.com/post/how-easy-betterhelp-and-its-onboarding-process-desktop). A designer "had to bail around question 9 when it turned into an intake form at a doctor's office" (https://medium.com/@bethaniecolwell/better-onboarding-for-betterhelp-a-personal-ux-redesign-concept-6e84e88aa9b4). Above every question sat "Rest assured – any information provided in this questionnaire will stay private between you and your counselor" (https://www.hipaajournal.com/betterhelp-settlement-ftc-health-data-privacy/); the FTC found the answers went "to Facebook, Snapchat, Criteo, and Pinterest" through "unavoidable prompts, with privacy policies only offered after consumers had completed them", and BetterHelp paid $7.8M (https://www.ftc.gov/news-events/news/press-releases/2023/07/ftc-gives-final-approval-order-banning-betterhelp-sharing-sensitive-health-data-advertising). Reassurance copy is a liability unless the analytics layer honours it. ADHD.ME's consent reservation and no-tracking-before-consent stance is the right side of this.

**Matching.** One therapist is assigned "within a few hours or days" (https://therapyhelpers.com/blog/how-long-does-betterhelp-take-to-match/); the profile shows "licensure information, specialties, other areas of experience, services offered … and a descriptive blurb they craft about themselves" (https://www.thehealthy.com/mental-health/betterhelp-review/). A "change my therapist" button leads to "a new screen notifying you that matching with a new provider can take 24 to 48 hours" (https://www.choosingtherapy.com/how-to-find-good-betterhelp-therapist/). Assign-one is the most-complained pattern.

**Between sessions.** Before the first session people are "prompted to get started with their first goal … break this goal down into actionable steps, which were automatically sent to their therapist" (https://www.choosingtherapy.com/betterhelp-review/). Journal prompts: "What is something I need to let go of? Why am I holding on to it?" (https://www.helpguide.org/mental-health/treatment/betterhelp-review). No structured outcome re-assessment surfaced.

**Price.** "$70 to $100 weekly … billing every 4 weeks" (https://www.healthline.com/health/mental-health/betterhelp-review).

## Talkspace

**Intake, in order** (help centre, https://help.talkspace.com/hc/en-us/articles/360000287023; HelpGuide, https://www.helpguide.org/mental-health/treatment/talkspace-review):

1. Service: Individual, Couples, Teen, Psychiatry.
2. Insurance or self-pay first. Insured members can "choose a provider and book a session directly" from a directory (https://help.talkspace.com/hc/en-us/articles/36261654030363).
3. Why you are here: eight tiles "ranging from 'I'm feeling anxious or panicky' to 'I'm dealing with stress at work or school,' with a 'Something else' option".
4. One screen each: "sleeping habits, physical health, gender identity, provider gender preference, birthday, state of residence and preferred language".
5. Previous therapy, main problems. 6. Nickname, email, password.
7. After matching, the clinical intake "draws on validated instruments, including the PHQ-9 for depression and the GAD-7 for anxiety" (https://healthrx.com/brands-talkspace/prescription-process), editable later (https://help.talkspace.com/hc/en-us/articles/24467181588251).

The framing line pairs the ask with its reason: "Answer a few questions about what brings you to Talkspace so we can match you with the right provider." Even so, "33 percent of survey respondents felt the intake questionnaire was too long and 34 percent found some of the questions unclear" (HelpGuide).

**Choose from three.** "Our matching algorithm will suggest three potential providers. Choose the one that is the best fit for you" (https://help.talkspace.com/hc/en-us/articles/360000287406). Cards carry "photo, years of experience, state/license, areas of expertise, description of therapist's clinical approach, and user reviews if available" (https://www.wittenberg.edu/sites/default/files/media/human_resources/COMM_Talkspace_FAQ%202021.pdf) and "video introductions" (HelpGuide). Switching "took less than a minute" (https://www.choosingtherapy.com/talkspace-review/).

**Outcome tracking as the insight surface.** Clients "completed the Patient Health Questionnaire-8 item (PHQ-8) at intake and every 3 weeks via an in-app survey" (https://pubmed.ncbi.nlm.nih.gov/42493329/), and the number becomes the story: "The average client improved from a PHQ-8 score of 15 to below the clinical cutoff of 10 by week 6". The "client journey" view promises "milestones, checkpoints, progress reports, and opportunities to adjust your growth plan before you start" (https://www.talkspace.com/blog/talkspace-coolest-features-brief-walkthrough/).

**The medication rule, stated before input.** "For safety and legal reasons, Talkspace does not prescribe controlled substances" (https://help.talkspace.com/hc/en-us/articles/45996987833115); on the ADHD page, "Any prescribed medication from a Talkspace provider will be a non-stimulant" (https://www.talkspace.com/treatment/attention-deficit-hyperactivity-disorder). Assessment tools are "not diagnostic instruments. You are encouraged to share your results with a physician" (https://www.talkspace.com/assessments).

**Price.** $69 to $109 a week self-pay; psychiatry "$299 for an initial appointment and $175 per follow-up"; in-network with major insurers (https://www.choosingtherapy.com/how-much-does-talkspace-cost/).

## Finch

**Intake, in order** (Pratt IxD critique, https://ixd.prattsi.org/2026/02/design-critique-finch-self-care-pet-ios-app/; Android Authority, https://www.androidauthority.com/finch-habit-tracker-app-hands-on-3537434/; help centre, https://help.finchcare.com/hc/en-us/articles/42149821015693-New-User-Guide):

1. Choose an egg colour to hatch. 2. Name and pronouns for the bird. 3. A personality trait, "curiosity, compassion, logic, etc."
4. Life context: "how long you usually sleep and whether you have difficulty waking up in the morning, with questions about areas you want support with and what areas of life you struggle with — with follow-up questions/prompts based on their answers".
5. A self-care area from "Productivity, Gratitude, Self-kindness, Calm, Sleep, Hygiene, Movement, Nutrition, and Connection" (https://help.finchcare.com/hc/en-us/articles/37780731973133-Self-Care-Areas).
6. Goals pre-filled: "When you first join Finch, you will automatically start with a few goals" (https://help.finchcare.com/hc/en-us/articles/37779940291213); a typical set is "flossing teeth each day, drinking water, having a daily stretch break, and doing one thing that makes you happy".

The consistency device: "users click the green button at the bottom of each screen, and while the text within the button may change, the size and color stay largely the same" (Pratt). Its one flaw, also from Pratt: "the app presents numerous customization options: colors, traits, and naming, all at once".

**Check-in.** "How are you feeling right now?" on "a 1-5 scale using facial expressions" (https://www.cltcounseling.com/all-resources/finch-habit-tracker-app-review), asked for "your outlook for the day ahead, how you feel in the afternoon, and your overall satisfaction at the end of the day" (https://www.makeuseof.com/finch-self-care-widget-pet-app/). Then an optional layer: "choose 'Reflect' and log what made you feel this way … 'Other' includes suggestions in multiple categories: people and pets, activities, body and health, and environment" (https://finch.fandom.com/wiki/Mood_logger). "The app asks how you're feeling rather than what you accomplished" (https://www.whistleout.com/CellPhones/Apps/finch-self-care-app-review).

**Insight.** "Insights on your mental health from combined analytics on your mood journaling, tags, goal tracker, and quizzes"; a "Mood Breakdown chart with options to view past month, last week, or this week" (https://revyl.com/atlas/finch/flows/view-mood-trend/). "If you mention certain topics or people, Finch saves those so you can see how they positively (or negatively) impacted you" (https://calmevo.com/finch-app-review/).

**No shame.** "It's completely okay if you miss a day!" with a streak repair "as long as the gap is 3 days or less" (https://befinch.notion.site/Finch-FAQ-474652d0123d4883ac7a0cd6c8f5aa70). "Your bird never dies, streaks never punish you, and missing a day costs you nothing" (https://habitbox.app/blog/finch-app-review).

**Why ADHD users stay.** "Neurodivergent users (ADHD, anxiety, PTSD) report sticking with it when other apps didn't take because you're doing it partly for the bird, which feels lighter than traditional journaling" (https://habi.app/insights/finch-alternatives/). "The bird doesn't punish you for missed days … which is specifically why ADHD women gravitate toward it" (https://mutra.app/compare/pricing/finch/).

**Price.** Finch Plus "$69.99 USD" a year or "$9.99 USD" a month (https://help.finchcare.com/hc/en-us/articles/38755205001869-Finch-Plus-Pricing).

## Inflow (ADHD-specific)

The web quiz "takes about 3 minutes" (https://try.getinflow.io/quiz-homepage/), stepping age, diagnosis status ("I'm diagnosed by a doctor" is one chip; the site says "No doctor's note required" and "everyone is welcome, diagnosis or not", https://www.getinflow.io/), ASRS-style frequency items, then a "pick journey" goal screen and a result page. "The intake quiz … identifies ADHD symptoms, emotional aspects of ADHD, and your goals for the program" (https://www.getinflow.io/how-it-works); a reviewer calls it "remarkably thorough, going beyond symptoms to ask about support systems and life goals" (https://www.choosingtherapy.com/inflow-adhd-app-review/).

Daily surfaces: "add your daily focus", "focus rooms, as body doubling is the #1 way to crush procrastination for ADHDers", "share wins and struggles" (https://apps.apple.com/us/app/inflow-manage-your-adhd/id1528183849); a coach "checks in on your progress daily" (https://www.androidauthority.com/app-of-the-week-inflow-3449192/). Modules are "bite-sized lessons, which you are encouraged to only study one at a time to avoid overwhelm" (Choosing Therapy).

Honesty copy worth copying verbatim: "Inflow is not a diagnostic tool and does not offer clinical services or medical treatment." and "Inflow isn't meant to replace medication or in-person therapy" (https://www.getinflow.io/faqs). Since March 2026 Inflow is owned by Cerebral and routes members to its psychiatrists (https://www.businesswire.com/news/home/20260324103905/en/). Price: "$47.99 monthly or $199.99 yearly" with financial aid (Choosing Therapy).

## Done (the cautionary case)

Done sold "a one-minute assessment" then "a 30-minute appointment available the same day" (https://www.donefirst.com/adhd/diagnosis). The screener is the six-item ASRS v1.1 Part A, for example "How often do you have difficulty getting things in order when you have to do a task that requires organization?" on never to very often (https://scholarshipinstitute.org/reviews/done-adhd/). Before any human contact: "$20 down" (https://www.zenmasterwellness.com/done-adhd-reviews/), then ASRS, GAD-7, PHQ-9, a medical history form and a photo-ID upload (https://donefirst.com/blog/get-diagnosed-adhd).

The DOJ found Done was "mandating that initial encounters would be under 30 minutes" and "instructing Done prescribers to prescribe Adderall and other stimulants even if the Done member did not qualify" (https://www.justice.gov/usao-ndca/pr/digital-health-company-and-medical-practice-indicted-100m-adderall-distribution-scheme); its founder was sentenced in November 2025 (https://www.justice.gov/opa/pr/founderceo-and-clinical-president-digital-health-company-sentenced-8-years-90-million-scheme). CVS and Walmart stopped filling its scripts. No "we do not guarantee a prescription" copy was found on any Done page; that absence is the finding. Every one of ADHD.ME's honesty gates (`honesty.claim-earned`, no urgency, no diagnosis, clinician declarations only) is the opposite of this design.

## The feature table: how each app minimises friction while maximising what it learns

| Mechanism | Who does it best | Verbatim or concrete form | Cost to the person | What it yields | ADHD.ME today | Recommendation |
|---|---|---|---|---|---|---|
| One intent question with an escape hatch | Headspace | "What brings you to Headspace?" … "Just checking it out" | One tap | Routes the course | The free-text finder asks "What kind of support are you looking for?" | Keep free text as the primary; add one row of intent chips under it including "Just looking", so an undecided person is not stopped by a blank box |
| First-person reason tiles | Talkspace | "I'm feeling anxious or panicky" … "Something else" | One or two taps | The primary need in the person's own frame | Example searches ("Try an example search") | Reword the example searches as first-person tiles: "I think I might have ADHD", "I have a diagnosis and need a new GP", "My script needs renewing", "I need a referral letter" |
| Reason paired with the ask in one sentence | Talkspace | "Answer a few questions about what brings you to Talkspace so we can match you with the right provider" | Zero | Trust without a paragraph | The screens carry no "why we ask" copy | Where a question is asked at all, the one line under the heading is the reason, never a separate note |
| Ask "when", not a time picker | Headspace | Times "based on existing routines rather than choosing a specific time of day" | One tap | A bookable window | Filters ask for distance and telehealth, not time | Add one chip row on the filters screen: "Mornings", "Lunchtime", "After work", "Weekends" |
| Precommitment card | Headspace | "make concrete plans for when and how often" (course starts up more than 100%) | One tap | A booking, not a browse | The profile ends in "See available times" | After a result, one card: "Book Dr X, Tuesday 8:10am?" with one Yes |
| Reminder set inside the flow | Calm | "40% of new users set a reminder" when it was part of onboarding | One tap | Return visits while on a waitlist | No reminder anywhere | On the prep screen, one line: "Remind me the day before" |
| Choose from three, never assign one | Talkspace | "suggest three potential providers. Choose the one that is the best fit for you" | One tap | Consent and fit, fewer switches | Results show five, then "146 more" | Keep five on the finder; on `/match/results` the three cards already exist, so this is done |
| Provider card fields | Talkspace, BetterHelp | Photo, years, licence, expertise, approach, video intro | Zero | Trust in one glance | Name, declared reason, place, badges | Add the two fields our people ask first: "Bulk-bills / gap fee" and "Next available", both from declarations |
| A visible "change my GP" | BetterHelp (badly), Talkspace (well) | "change my therapist" then a 24 to 48 h wait vs "less than a minute" | One tap | Retention through a bad match | "Start again" | Under a chosen GP: "Choose another", straight back to the three, no wait screen |
| Screeners after matching, not before | Talkspace | PHQ-9 / GAD-7 "at intake and every 3 weeks via an in-app survey" | Six items | A baseline and a trend line | The survey and My ADHD resonance questions | Offer the six ASRS Part A items as an optional post-match baseline, re-asked at a fixed cadence, shown as one line: "since you started" |
| Say what a screener is | Calm, Inflow, Talkspace | "not a substitute for care by a physician … but can be a great first step"; "not a diagnostic tool" | Zero | Honesty that survives regulators | Compliance lints already forbid diagnosis claims | Put Inflow's sentence, adapted, under the survey heading once |
| One face, one tap, three times a day | Finch | "How are you feeling right now?" 1 to 5 faces | One tap | A mood series a GP can read | Today's "Did X help?" with four chips | Keep the four chips; do not add a face scale as well. One check-in per day is the ADHD ceiling |
| Two-level emotion pick with intensity | Calm Health | "1 of 5 primary emotions … then a sub-emotion, ranging in intensity" | Two taps | Structure without a 12-mood grid | My ADHD's six axes with "Needs support / Worth improving / Still learning" | Already the right shape; resist adding sub-labels |
| Return exactly three things after a check-in | Calm Health | "3 pieces of content recommendations" | Zero | The next step without a menu | Today shows one card then "View my map" | After "Did X help?", show one next step, not three; three is Calm's content library, ours is one act |
| Tags that later explain a mood | Finch | "people and pets, activities, body and health, and environment"; "Finch saves those so you can see how they positively (or negatively) impacted you" | Optional taps | Insight: what helped | History's "Helped a lot / a little / Still testing" | The history screen already does this per strategy; add the same three verdict chips to the map's "What works here" line |
| Goals seeded from answers, tiny | Finch | "drinking water, having a daily stretch break" | Zero | A first win on day one | The Lives "Your goals" fold, the manual | Seed three one-tap steps after a match: "Save the GP", "Print the timeline", "Book" |
| No shame on a missed day | Finch | "It's completely okay if you miss a day!" | Zero | Retention for ADHD users | No streaks anywhere (good) | If a reminder is added, its missed state says "It's okay. Want one for tomorrow?" |
| Soft streak framing | Headspace | "it's not about the number" | Zero | Retention without pressure | None | Do not add streaks; the founder's calm rule already forbids jumping text |
| Financial access question | BetterHelp | "How would you rate your current financial status?" unlocks aid | One tap | Access | "Bulk billing" filter | Keep the filter; never ask income |
| State the medication rule before input | Talkspace | "For safety and legal reasons, Talkspace does not prescribe controlled substances" | Zero | No false hope, no Done | `/medication` explains the GP-led model | One line on the finder's first screen when the words include "stimulant" or "script": "GPs here can renew or refer; assessment for stimulants is by declaration" (wording to pass the compliance lint) |
| Deposit and ID after trust | Done (negative) | "$20 down", photo ID before any human | High | Scam reviews | Booking holds no payment | Keep it that way; collect nothing until a booking exists |
| Words per screen | Finch, Headspace | Home 19 and 38 | Zero | Completion under cognitive load | Median app screen 29 words, all 69 under 60 | Hold the line; the two remaining heavy patient screens are the care map (82, of which 25 are node labels) and the finder results (56) |

## Verbatim questions worth copying, adapted

These are the exact questions from the platforms, with the adaptation that passes ADHD.ME's compliance rules (no urgency, no diagnosis, no platform characterisation of a clinician).

| Source | Verbatim | ADHD.ME adaptation |
|---|---|---|
| Headspace | "What brings you to Headspace?" | Chip row under the free text: "Assessment", "A new GP", "Renew a script", "A referral", "Just looking" |
| Talkspace | "I'm feeling anxious or panicky" (tile) | "I think I might have ADHD", "I have a diagnosis and no GP", "My script needs renewing" |
| Talkspace | "Answer a few questions about what brings you to Talkspace so we can match you with the right provider" | "Say what you need, in your words, and the list orders itself around them" (already the finder's promise; keep it to one line) |
| Headspace | When to meditate, by routine | "When could you see a GP?" "Mornings", "Lunchtime", "After work", "Weekends" |
| Finch | "How are you feeling right now?" | Not adopted; Today's "Did X help?" is the one daily question |
| Finch | "What made you feel this way?" with people, activities, body, environment | The map's "Who helps here" already names the people; add "What made it easier?" as the second line of the history verdict, three chips |
| Calm | "What's kept you from sticking with meditation before?" | On the prep screen: "What got in the way last time?" "Cost", "Waitlist", "Nobody near me", "Didn't feel heard" (feeds the filters, not a report) |
| Calm Health | "1 of 5 primary emotions … sub-emotion … intensity" | My ADHD's axes and the survey's 0 to 10 cost line already do this |
| BetterHelp | "What do you want from a therapist?" listens, teaches skills, checks in, gives homework | On the profile: "What matters in a GP?" "Time", "Plain language", "Telehealth", "Same GP each time" — and show only the declared fields that answer it |
| BetterHelp | The pre-session goal, "broken down into actionable steps, sent to the therapist" | Prep's "What to bring" list, plus one line the person writes: "What I want from this appointment", carried into the booking note |
| Talkspace, Calm | "not diagnostic instruments"; "not a substitute for care by a physician" | Under the survey heading, once: "Not a diagnosis. A first step." |
| Inflow | "I'm diagnosed by a doctor" | Add a diagnosis-status chip to the intent row; branch the filters on it (assessment vs continuing care) |
| Done | ASRS v1.1 Part A six items, never to very often | Offer post-match as an optional baseline, labelled as a screener, shown as one number |

## Where ADHD.ME already leads

- **Free text first.** None of the seven lets a person say what they need in their own words before a chip. Calm's own critics call its dropdown a flattening. Keep this.
- **Reasons on the card.** Talkspace explains a match in a profile; ADHD.ME prints the reason in the result row ("Unhurried first appointment") and refuses to rank when the words do not separate the list. Nobody else does the second half.
- **Words.** The app median is 29 words a screen against Headspace's 38 and Finch's 19. The finder's results at 56 and the care map at 82 are the two to watch.
- **No streaks, no shame, no deposit, no tracking before consent.** These are the four places the leaders were either fined, indicted, or praised, and the tree is on the right side of each.

## What to build next, in order

1. **Intent chips under the finder's free text**, including "Just looking" and a diagnosis-status chip. One tap, no new screen.
2. **Time-of-day chips on the filters screen** ("Mornings" … "Weekends") drawn from declarations.
3. **A precommitment card after a result**: "Book Dr X, Tuesday 8:10am?" with one Yes and one "Remind me".
4. **"Choose another" under a chosen GP**, straight back to the three.
5. **The optional six-item baseline after a match**, re-asked at a fixed cadence, one line on My ADHD: "since you started".
6. **The medication rule as one line** when the words call for it, worded to pass the lint.
7. **Three seeded one-tap steps** after a match, Finch-style, with no streak and a no-shame missed state.

## Screenshot galleries to open with a browser

The research sandbox could not open these; each hosts the recorded screens the findings above describe.

- Headspace iOS onboarding, Mobbin: https://mobbin.com/explore/flows/31b21791-dec6-448a-8253-648f5ebbba3e
- Headspace screen recordings, Screensdesign: https://screensdesign.com/showcase/headspace-meditation-sleep
- Calm onboarding, UI Sources: https://uisources.com/explainer/calm-onboarding and Mobbin: https://mobbin.com/explore/flows/8a4c56bd-bdc9-4886-b0a8-39e7f35b72b5
- Calm, 120 screens, Screensdesign: https://screensdesign.com/apps/calm/
- BetterHelp intake screens reproduced in the FTC complaint: https://www.ftc.gov/system/files/ftc_gov/pdf/2023169betterhelpcomplaintfinal.pdf and the 30-question list: https://bcms.org/lifebridge/faq/PreviewofBetterHelp30ScreeningQuestions.pdf
- BetterHelp redesign mock-ups with the original screens: https://medium.com/@bethaniecolwell/better-onboarding-for-betterhelp-a-personal-ux-redesign-concept-6e84e88aa9b4
- Finch onboarding, Pageflows: https://pageflows.com/post/ios/onboarding/finch/ and flows: https://revyl.com/atlas/finch/
- Inflow, Screensdesign: https://screensdesign.com/showcase/inflow-adhd-cbt-based-program
