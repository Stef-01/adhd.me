// The text budget, measured honestly: EVERY page the app serves, the WHOLE screen's words, against
// the gold-standard apps. Read from the screens themselves (App Store listings, 2026-09-10):
//
//   Headspace Today (home)      38 words on the screen: a greeting, "Start your day", four cards
//                                  of title + kind + minutes, three tab names.
//   Headspace course detail     26 words: a title, kind and minutes, one 13-word sentence, four
//                                  names, one button.
//   Headspace Sleep (a list)    60 words: six cards of a 2-word title and one line under 12 words.
//   Finch home (built for ADHD) 19 words: a status row, "3 goals left today!", three 2-to-4-word rows.
//
// So a SCREEN is 20 to 60 words in total, with 40 as the middle. Not above the fold: in total.
// A screen that scrolls to 300 words is not a Headspace screen with more below; it is a
// different, heavier thing, and a person with ADHD pays for every word whether or not they
// reach it. The budget is therefore on the whole screen: 60 is the ceiling, 40 the target.
//
//   node scripts/text-budget.mjs                 # against http://localhost:3100 (this file is the library;
//                                                  # the CLI is scripts/text-budget.mjs, the gate e2e/text-budget.spec.ts)
//   BASE=http://localhost:3620 node scripts/text-budget.mjs
//
// Counts VISIBLE words (closed folds excluded, sr-only excluded, chrome counted separately).
// Routes come off the filesystem, so a new page is measured by existing. Writes
// qa/text-budget.json and prints every screen with its verdict.

import { existsSync, readdirSync, statSync } from "node:fs";

/**
 * The browser the CLIs launch. Playwright's own discovery first; when the pinned revision is
 * absent and the machine pre-provisions Chromium (CI, the remote harness), that binary. The
 * config for the e2e suite carries the same fallback; without it the scripts fail at launch with
 * "Executable doesn't exist", which reads as a broken script rather than a missing download.
 */
export function launchOptions(chromium) {
  if (process.env.PW_CHROMIUM_PATH) return { executablePath: process.env.PW_CHROMIUM_PATH };
  let pinned;
  try { pinned = chromium.executablePath(); } catch { pinned = undefined; }
  if (pinned && existsSync(pinned)) return {};
  return existsSync(PREINSTALLED_CHROMIUM) ? { executablePath: PREINSTALLED_CHROMIUM } : {};
}
const PREINSTALLED_CHROMIUM = "/opt/pw-browsers/chromium";

import { join } from "node:path";

export const BENCHMARK = { headspaceHome: 38, headspaceDetail: 26, headspaceList: 60, finchHome: 19 };
export const BUDGET = { screen: 60, target: 40, card: 8 };

/** Every static page route under app/, route groups stripped, console and api left out. */
export function discoverRoutes() {
  const found = [];
  const walk = (dir, segments) => {
    for (const entry of readdirSync(dir).sort()) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry.startsWith("_") || entry === "api" || entry === "console") continue;
        if (entry.startsWith("(") && entry.endsWith(")")) walk(full, segments);
        else if (entry.startsWith("[")) continue;
        else walk(full, [...segments, entry]);
      } else if (entry === "page.tsx") {
        found.push(`/${segments.join("/")}`);
      }
    }
  };
  walk("app", []);
  return [...new Set(found)].sort();
}

/** Dynamic and stateful screens the walk cannot reach on its own. */
export const EXTRA = [
  ...["decided", "setup", "revisit", "complete"].map(state => ({ path: "/lives/play/arjun-hold-the-thread", state: `arjun-${state}`, name: `Arjun, ${state}` })),
  ...["till", "setup", "revisit", "complete"].map(state => ({ path: "/lives/play/jax-just-the-list", state: `jax-${state}`, name: `Jax, ${state}` })),
  ...["line-done", "setup", "revisit", "complete"].map(state => ({ path: "/lives/play/nina-the-first-line", state: `nina-${state}`, name: `Nina, ${state}` })),
  ...["arrived", "setup", "revisit", "complete"].map(state => ({ path: "/lives/play/maya-one-thing-at-a-time", state: `maya-${state}`, name: `Maya, ${state}` })),
  ...["interruption", "setup", "cue", "revisit", "complete"].map(state => ({ path: "/lives/play/mia-remember-why", state: `mia-${state}`, name: `Mia, ${state}` })),
  ...["repair", "reply", "setup", "revisit", "complete"].map(state => ({ path: "/lives/play/zoe-before-you-send", state: `zoe-${state}`, name: `Zoe, ${state}` })),
  { path: "/lives/play/theo-out-the-door", state: "theo-busy", name: "Theo, competing demands" },
  { path: "/lives/play/theo-out-the-door", state: "theo-pause", name: "Theo, pause" },
  { path: "/lives/play/theo-out-the-door", state: "theo-departure", name: "Theo, departure" },
  { path: "/lives/play/theo-out-the-door", state: "theo-evening", name: "Theo, evening arrangement" },
  { path: "/lives/play/theo-out-the-door", state: "theo-revisit", name: "Theo, rainy revisit" },
  { path: "/lives/play/theo-out-the-door", state: "theo-complete", name: "Theo, complete" },
  { path: "/lives/play/leo-mosquito", state: "bedroom-pause", name: "Leo, pause" },
  { path: "/lives/play/leo-mosquito", state: "bedroom-wind-down", name: "Leo, reading" },
  { path: "/lives/play/leo-mosquito", state: "bedroom-rest", name: "Leo, rest" },
  { path: "/lives/play/leo-mosquito", state: "bedroom-revisit", name: "Leo, next evening" },
  { path: "/lives/play/leo-mosquito", state: "bedroom-complete", name: "Leo, complete" },

  { path: "/lives/play/nina-the-first-line", name: "Nina: the first line" },
  { path: "/lives/play/jax-just-the-list", name: "Jax: just the list" },
  { path: "/lives/play/mia-remember-why", name: "Mia: remember why" },
  { path: "/lives/play/zoe-before-you-send", name: "Zoe: before send" },
  { path: "/lives/play/arjun-hold-the-thread", name: "Arjun: the meeting" },
  { path: "/lives/play/maya-one-thing-at-a-time", name: "Maya: the crossing" },
  { path: "/gp/example-mei-chao", name: "GP profile" },
  // `discoverRoutes` skips `[id]`, so a dynamic screen is only measured if it is listed here. This
  // one is patient-facing and reached from the skill-match dialog's "View full profile", and it
  // arrived without an entry — so it had no word budget and no capture.
  { path: "/practitioner/example-mei-chao", name: "Practitioner profile" },
  { path: "/go/anubhav-saxena", skip: "a redirect" },
  { path: "/", state: "finder-results", name: "Finder results (after a search)" },
  { path: "/", state: "finder-profile", name: "Finder profile (a GP opened)" },
  // The profile with its reasons open: the bio folds while they show (2026-09-28, was 75 words).
  { path: "/", state: "finder-profile-why", name: "Finder profile, why matched open" },
  // The settings sheet, from the header on every app screen: it was never measured, and read 99.
  { path: "/", state: "finder-settings", name: "Settings, open (on the finder, where it holds the most)" },
  { path: "/", state: "finder-voice", name: "Finder voice (the orb, one question)" },
  { path: "/", state: "finder-rate", name: "Finder home, a visit to rate" },
  { path: "/approach?module=everyday", name: "A read module, first card" },
  { path: "/approach?module=adhd", name: "A read module, the ADHD card" },
  { path: "/approach?module=starting", name: "A game run, title card" },
  { path: "/approach?module=starting", state: "run-last", name: "A game run, last card" },
  { path: "/approach?pane=modules", name: "Learn, the modules pane" },
  // The modules pane with three goals chosen (PLAN.md W8): "For you" and its longest reason line.
  // And with every shelf one tap away, opened.
  { path: "/approach?pane=modules", state: "modules-goals", name: "Learn, modules with goals" },
  { path: "/approach?pane=modules", state: "modules-explore", name: "Learn, all modules" },
  // The games pane with "All games" open (PLAN.md W7): on the eight lives, where it opens, and on
  // the largest group. One game of each kind is played, so the ticks and the page foot show.
  { path: "/approach?pane=games", state: "games-all", name: "Learn, all games" },
  { path: "/approach?pane=games", state: "games-all-open", name: "Learn, all games, the largest group" },
  { path: "/approach/map", state: "care-map-tap", name: "The care map, a part of life open" },
  { path: "/lives/play", state: "lives-run", name: "The Chaos Run, first round" },
  { path: "/match/results", state: "intake", name: "Match results" },
  // The two questions (app/first-step.tsx). The walk reaches the first one on its own; the second
  // and the answer are taps, and a screen the instrument cannot reach is a screen nobody measured.
  // Your map, in the state that matters: one a person has actually lived in, where every axis
  // carries a word. The empty route is walked too and is the cheaper of the two.
  { path: "/my-map", state: "map-lived", name: "Your map, lived in" },
  { path: "/first-step", state: "first-step-stage", name: "First step, the second question" },
  { path: "/first-step", state: "first-step-answer", name: "First step, the answer" },
  { path: "/match/prep", state: "intake", name: "Match prep" },

  // THE LIVED-IN STATES. Every screen that reads the personal model, measured as somebody who has
  // actually used the app sees it. Without these the budget is measuring an empty database.
  { path: "/my-adhd", state: "model-lived", name: "My ADHD, lived in" },
  { path: "/my-adhd", state: "model-learning", name: "My ADHD, a step proposed" },
  { path: "/my-adhd", state: "sheet-open", name: "My ADHD, an axis open" },
  // The map then and now (PLAN.md W3): day one and a snapshot about six weeks old both on file.
  { path: "/my-adhd", state: "model-compare", name: "My ADHD, then and now" },
  { path: "/my-adhd", state: "fills-open", name: "My ADHD, how it fills in" },
  // The hub's lead sentence differs by axis (7 to 10 words), so each axis that can lead is measured
  // leading. Relationships cannot lead from a run alone; its sentence is shorter than the longest.
  { path: "/my-adhd", state: "lead-focus", name: "My ADHD, focus leads" },
  { path: "/my-adhd", state: "lead-organisation", name: "My ADHD, organisation leads" },
  { path: "/my-adhd", state: "lead-emotional-regulation", name: "My ADHD, feelings lead" },
  { path: "/my-adhd", state: "lead-sleep-energy", name: "My ADHD, sleep leads" },
  { path: "/my-adhd", state: "share-open", name: "My ADHD, the summary open" },
  { path: "/my-adhd/history", state: "model-lived", name: "History, lived in" },
  { path: "/today", state: "model-lived", name: "Today, lived in" },
  // The care-plan card has two shapes and both are on Today, so both are measured. The one
  // without a plan is what everybody meets first and would otherwise never be counted.
  { path: "/today", state: "model-no-plan", name: "Today, before a care plan" },
  { path: "/today", state: "plan-open", name: "Today, the care plan open" },
  // Each step of the helper is its own screen: the shell behind an open sheet is inert, so the
  // instrument measures the step alone, and each has to hold the ceiling on its own.
  { path: "/today", state: "plan-duration", name: "Today, the care plan: six months" },
  { path: "/today", state: "plan-goals", name: "Today, the care plan: goals" },
  { path: "/today", state: "plan-providers", name: "Today, the care plan: who I see" },
  { path: "/today", state: "plan-team", name: "Today, the care plan: my team" },
  { path: "/today", state: "plan-services", name: "Today, the care plan: services" },
  { path: "/support", state: "model-lived", name: "Support, lived in" },
  { path: "/manual", state: "model-lived", name: "My manual, lived in" },
  { path: "/adjustments", state: "model-lived", name: "Adjustments, lived in" },
];

export const LONG_FORM = new Set(["/story", "/faq", "/privacy", "/privacy/automated-decisions", "/privacy/counsel-review", "/terms", "/practices", "/clinicians", "/clinicians/join", "/examples", "/about", "/approach/map", "/lives/lab", "/demo"]);

/**
 * RESULT SCREENS CARRY THEIR RESULTS (2026-09-11, founder-decided).
 *
 * The 60-word ceiling is Headspace's Sleep list: six cards of a two-word title and one short line.
 * The finder's results screen is that shape plus one thing Headspace's list does not have — the
 * navigation between kinds of professional, which is the product's whole argument. Measured on the
 * day this was raised, its 63 words were 35 of RESULT (five rows of a name, a reason and a place —
 * the answer the person asked for) and 28 of screen: the search they typed read back, four filter
 * chips, three kinds of care, the count, and two controls.
 *
 * Charmaine Bernie's finding is why the three cost what they cost: people land on the wrong
 * waitlist for years because nothing showed them which kind of professional they needed. Deleting
 * the kinds to hold a number derived from a meditation app's list would be holding the letter of
 * the budget against the thing the budget exists to protect.
 *
 * So this ONE screen gets 72, and the raise is bounded and reasoned rather than a waiver: 60 for
 * the screen, plus the twelve words three kinds of care can cost at their longest ("occupational
 * therapists" is two). Every other screen, this file and the gate beside it are unchanged, and a
 * fourth kind or a new paragraph here still fails.
 */
export const CEILING = new Map([["Finder results (after a search)", 72]]);

export const NARRATIVE = "I think I have had ADHD my whole life. I want an adult assessment with someone who will not rush me. I have anxiety too, and telehealth would be easier.";

export function words(text) {
  return text.trim().split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

export async function measure(page) {
  return page.evaluate(() => {
    const vh = window.innerHeight;
    const rows = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.replace(/\s+/g, " ").trim();
      if (!text) continue;
      const el = node.parentElement;
      if (!el) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") continue;
      if (el.closest("[aria-hidden='true'], .sr-only, script, style, noscript, template")) continue;
      // A closed fold shows its own summary and nothing else, however deep: a summary inside a
      // fold that is itself folded away is not on the screen.
      let folded = false;
      for (let fold = el.closest("details:not([open])"); fold && !folded; fold = fold.parentElement?.closest("details:not([open])") ?? null) {
        if (!fold.querySelector(":scope > summary")?.contains(el)) folded = true;
      }
      if (folded) continue;
      const rect = el.getBoundingClientRect();
      if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= window.innerWidth) continue;
      if (rect.width === 0 || rect.height === 0) continue;
      // Chrome is the site's own furniture, named one by one: the header, the tab bar, the public
      // header's links and the story page's, the site footer and the story page's copy of it (the
      // same doors), the consent bar. A page's own <footer> and <nav> are its words: Leo's game
      // ends inside a <footer>, and the games, the toolkit, the clinician steps and the breadcrumbs
      // each carry a <nav>, so neither is on this list bare.
      const chrome = !!el.closest("header.platform-header, .app-tabs, .site-nav-links, .story-nav, .site-footer, .story-footer, .consent-bar, .privacy-consent");
      const aboveFold = rect.top < vh && rect.bottom > 0;
      rows.push({ text, chrome, aboveFold, tag: el.tagName.toLowerCase() });
    }
    return rows;
  });
}

/**
 * ONE lived-in record, shared by this instrument and the e2e suite.
 *
 * The postmortem's fourth finding was "I measured 17 routes and called it every screen". This is
 * its sibling: for a long time the instrument walked every personal screen in its EMPTY state,
 * which is the one state a returning person never sees, so a gate stayed green over a My ADHD tab
 * that rendered 336 words. Anything reading the model is measured against this.
 */
export const LIVED_RECORD = {
  v: 1,
  onboarding: {
    improveFirst: "start-earlier",
    impact: 8,
    lookingFor: "professional",
    medication: "no",
    affects: "work",
    easier: ["urgent", "alongside"],
    completedAt: "2026-09-01T00:00:00.000Z",
  },
  resonance: {
    starting: { frequency: "often", cost: 8, priority: "yes", at: "2026-09-01T00:00:00.000Z" },
    ambiguity: { frequency: "often", cost: 7, priority: "yes", at: "2026-09-02T00:00:00.000Z" },
    "working-memory": { frequency: "sometimes", cost: 5, priority: "maybe", at: "2026-09-03T00:00:00.000Z" },
    sleep: { frequency: "often", cost: 7, priority: "yes", at: "2026-09-04T00:00:00.000Z" },
  },
  answers: {
    "starting.hardest-to-start": ["vague"],
    "starting.what-helps-start": ["person"],
    "ambiguity.source": ["manager"],
    "working-memory.capture": "no",
  },
  insights: { "starting-threshold": "yes", "ambiguity-threshold": "partly" },
  experiments: [
    { strategyId: "first-physical-action", moduleId: "starting", acceptedAt: "2026-09-01T00:00:00Z", outcome: "a-lot", outcomeAt: "2026-09-02T00:00:00Z" },
    { strategyId: "define-done", moduleId: "ambiguity", acceptedAt: "2026-09-04T00:00:00Z", outcome: "a-little", outcomeAt: "2026-09-06T00:00:00Z" },
    // "wind-down" was not a strategy. The sleep module's one strategy is `fixed-wake`, so the
    // history screen fell through to printing the raw id at a person — and because this record is
    // the seed the budget AND e2e/my-adhd.spec.ts both run on, every measurement of that screen
    // was of a screen no user can reach. `src/model/seed.test.ts` now pins every id here.
    { strategyId: "fixed-wake", moduleId: "sleep", acceptedAt: "2026-09-05T00:00:00Z", outcome: "a-lot", outcomeAt: "2026-09-07T00:00:00Z" },
    { strategyId: "one-capture-place", moduleId: "working-memory", acceptedAt: "2026-09-07T00:00:00Z" },
  ],
  reflections: [],
  relates: {},
  interpretations: [],
  safety: [],
  completed: ["starting", "ambiguity", "sleep"],
  survey: { day: "", answeredToday: 0, abandons: [], lastLongAt: null },
  surveys: {},
  manual: { helps: "One clear first step and I will run with it.", harder: "", "work-with-me": "", updatedAt: "2026-09-05T00:00:00.000Z" },
  medication: { changes: "", untouched: "", unwanted: "", updatedAt: null },
  checkpoints: [],
  // A care plan with services left, because the hub's card has two shapes and the instrument had
  // only ever measured the one without a plan — the same hole §13.1 found for the lived-in hub.
  // Five allowed, two spent, so the dot row is mixed and three suggestions render.
  carePlan: {
    allows: 5, used: 2, year: 2026, confirmedOn: "2026-09-05T00:00:00Z",
    // The helper, part way through: two goals and one provider named, the team not yet chosen.
    sixMonths: true, goals: ["starting", "sleep-energy"], goalNote: "", providers: ["psychologist"], providerNote: "", team: null,
  },
};

const SNAP_ASPECTS = ["starting", "focus", "organisation", "emotional-regulation", "relationships", "sleep-energy"];
const snapshot = (on, statuses, rungs) => ({
  on,
  statuses: Object.fromEntries(SNAP_ASPECTS.map((a) => [a, statuses[a] ?? "unexplored"])),
  rungs: Object.fromEntries(SNAP_ASPECTS.map((a) => [a, rungs[a] ?? "unmapped"])),
});

const daysAgo = (n) => {
  const d = new Date(Date.now() - n * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * The lived-in person with a day one about three months ago and a snapshot about six weeks ago, for
 * the compare pill. Dated from today rather than on a fixed clock, so no later screen in the walk
 * inherits a frozen clock. The month is one word for most of the year, but from 1 January to about
 * 9 February six weeks back is last year, and the month reads "December last year" (or "November
 * last year"), two words more.
 */
export function compareRecord() {
  return {
    ...LIVED_RECORD,
    snapshots: [
      snapshot(daysAgo(100), { starting: "still-learning" }, { starting: "named" }),
      snapshot(daysAgo(40), { starting: "needs-support", "sleep-energy": "worth-improving" }, { starting: "explored", "sleep-energy": "named" }),
    ],
  };
}

/** The lived-in person with one axis leading: its run costs the most, the others little. */
const LEAD_RUN = { focus: "context", organisation: "deadlines", "emotional-regulation": "conflict", "sleep-energy": "sleep" };
export function leadRecord(aspect) {
  const calm = { frequency: "sometimes", cost: 3, priority: "maybe", at: "2026-09-01T00:00:00.000Z" };
  return {
    ...LIVED_RECORD,
    resonance: {
      ...LIVED_RECORD.resonance,
      starting: calm, ambiguity: calm, "working-memory": calm, sleep: calm,
      [LEAD_RUN[aspect]]: { frequency: "often", cost: 10, priority: "yes", at: "2026-09-08T00:00:00.000Z" },
    },
  };
}

/**
 * THE SAME PERSON, ONE STEP EARLIER — the hub's action card in its OTHER shape (O253).
 *
 * `LIVED_RECORD` holds an accepted experiment, so the card is always the follow-up question
 * ("Did 'One capture place' help?") and the walk never measured the card that PROPOSES
 * something. That is the shape the founder read and could not understand, and the shape the
 * "what to do" line was added for — so the gate has to see it, or the fix is unmeasured exactly
 * the way the whole screen was unmeasured before the map work.
 *
 * Nothing is completed and nothing is accepted, and "practical things to try" rather than
 * "professional support" so the escalation rule does not fire first. Everything else is the
 * same person.
 */
export const LEARNING_RECORD = {
  ...LIVED_RECORD,
  onboarding: { ...LIVED_RECORD.onboarding, lookingFor: "try" },
  completed: [],
  experiments: [],
};

export async function reach(page, route, base) {
  if (route.state === "intake") {
    await page.goto(`${base}/match`);
    await page.locator("#match-narrative").fill(NARRATIVE);
    await page.locator("#match-suburb").fill("Epping");
    await page.getByRole("button", { name: "Find my three" }).click();
    await page.waitForURL(/\/match\/results$/);
    await page.waitForTimeout(600);
    await page.goto(`${base}${route.path}`, { waitUntil: "networkidle" });
    return;
  }
  if (route.state === "finder-voice") await page.addInitScript(() => { window.__adhdmeVoiceFake = true; });
  if (route.state === "finder-rate") {
    await page.addInitScript(() => {
      const at = Date.now() - 2 * 24 * 60 * 60 * 1000;
      localStorage.setItem("adhdme.visits", JSON.stringify([{ handoffId: "11111111-1111-4111-8111-111111111111", clinicianId: "anubhav-saxena", name: "Dr Anubhav Saxena", at, asked: [], met: [], asks: 0, nextAt: at }]));
    });
  }
  await page.goto(`${base}${route.path}`, { waitUntil: "networkidle" });
  if (route.state === "finder-voice") {
    await page.getByRole("button", { name: "Talk instead of typing" }).click();
    await page.locator(".voice-orb").waitFor({ timeout: 10000 });
  }
  if (route.state === "finder-results" || route.state === "finder-profile" || route.state === "finder-profile-why") {
    await page.getByRole("textbox").fill("an adult ADHD assessment, telehealth, not rushed");
    await page.keyboard.press("Enter");
    await page.locator(".clinician-list").waitFor({ timeout: 20000 });
    if (route.state !== "finder-results") {
      await page.locator(".clinician-row").first().click();
      await page.getByRole("heading", { level: 1 }).waitFor();
    }
    if (route.state === "finder-profile-why") {
      await page.locator(".profile-disclosure", { hasText: "Why matched" }).locator("summary").click();
      await page.locator(".profile-disclosure[open] .profile-disclosure-body").waitFor({ timeout: 8000 });
    }
  }
  if (route.state === "finder-settings") {
    await page.getByRole("button", { name: "Settings" }).first().click();
    await page.locator(".settings-list").waitFor({ timeout: 8000 });
  }
  if (route.state === "care-map-tap") {
    await page.evaluate((rec) => localStorage.setItem("adhdme.model.v1", rec), JSON.stringify(LIVED_RECORD));
    await page.reload({ waitUntil: "networkidle" });
    // On a phone the wheel is four quarters: the part is one tap further in (N8).
    const quarter = page.locator(".care-map-quarter[aria-label='Brain']");
    if (await quarter.isVisible()) await quarter.click();
    await page.getByRole("button", { name: /^Starting \(Brain\)/ }).click();
    await page.locator("#care-map-title", { hasText: "Starting" }).waitFor({ timeout: 8000 });
  }
  if (route.state === "model-compare") {
    await page.evaluate((rec) => localStorage.setItem("adhdme.model.v1", rec), JSON.stringify(compareRecord()));
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".map-then-pill").waitFor({ timeout: 8000 });
  }
  if (route.state === "fills-open") {
    await page.evaluate((rec) => localStorage.setItem("adhdme.model.v1", rec), JSON.stringify(LIVED_RECORD));
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: "How it fills in" }).click({ timeout: 8000 });
    await page.locator(".map-fills-list").waitFor({ timeout: 8000 });
  }
  if (route.state === "modules-goals" || route.state === "modules-explore") {
    await page.evaluate(() => localStorage.setItem("adhdme.lives.v1", JSON.stringify({ v: 1, selectedGoals: ["task_initiation", "working_memory", "sleep"] })));
    await page.reload({ waitUntil: "networkidle" });
    await page.getByTestId("learn-for-you").waitFor({ timeout: 8000 });
    if (route.state === "modules-explore") {
      await page.getByTestId("learn-explore").click({ timeout: 8000 });
      await page.getByTestId("learn-reads").waitFor({ state: "attached", timeout: 8000 });
    }
  }
  if (route.state === "games-all" || route.state === "games-all-open") {
    await page.evaluate(() => {
      localStorage.setItem("adhdme.learn.v1", JSON.stringify({ v: 1, done: ["context"], at: { context: "2026-09-01" } }));
      localStorage.setItem("adhdme.played.v1", JSON.stringify({ v: 1, at: { maya: "2026-09-01" } }));
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.getByTestId("learn-show-all").click({ timeout: 8000 });
    if (route.state === "games-all-open") await page.getByRole("button", { name: "Understand ADHD" }).click({ timeout: 8000 });
    await page.locator(".learn-game-names").waitFor({ timeout: 8000 });
  }
  const lead = /^lead-(.+)$/.exec(route.state ?? "")?.[1];
  if (lead) {
    await page.evaluate((rec) => localStorage.setItem("adhdme.model.v1", rec), JSON.stringify(leadRecord(lead)));
    await page.reload({ waitUntil: "networkidle" });
  }
  if (route.state === "map-lived" || route.state === "model-lived") {
    await page.evaluate((rec) => localStorage.setItem("adhdme.model.v1", rec), JSON.stringify(LIVED_RECORD));
    await page.reload({ waitUntil: "networkidle" });
  }
  if (route.state === "model-learning") {
    await page.evaluate((rec) => localStorage.setItem("adhdme.model.v1", rec), JSON.stringify(LEARNING_RECORD));
    await page.reload({ waitUntil: "networkidle" });
  }
  if (route.state === "model-no-plan") {
    const { carePlan, ...withoutPlan } = LIVED_RECORD;
    await page.evaluate((rec) => localStorage.setItem("adhdme.model.v1", rec), JSON.stringify(withoutPlan));
    await page.reload({ waitUntil: "networkidle" });
  }
  if (route.state === "plan-open") {
    await page.evaluate((rec) => localStorage.setItem("adhdme.model.v1", rec), JSON.stringify(LIVED_RECORD));
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".plan-card").click();
    await page.locator(".plan-sheet").waitFor({ timeout: 8000 });
  }
  const step = /^plan-(duration|goals|providers|team|services)$/.exec(route.state ?? "")?.[1];
  if (step) {
    await page.evaluate((rec) => localStorage.setItem("adhdme.model.v1", rec), JSON.stringify(LIVED_RECORD));
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".plan-card").click();
    await page.locator(`.plan-step[data-step="${step}"]`).click();
    await page.locator(`.plan-sheet[data-view="${step}"]`).waitFor({ timeout: 8000 });
  }
  if (route.state === "sheet-open") {
    await page.evaluate((rec) => localStorage.setItem("adhdme.model.v1", rec), JSON.stringify(LIVED_RECORD));
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".map-axis").first().click();
    await page.locator(".map-sheet").waitFor({ timeout: 8000 });
  }
  if (route.state === "share-open") {
    await page.evaluate((rec) => localStorage.setItem("adhdme.model.v1", rec), JSON.stringify(LIVED_RECORD));
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Share" }).click();
    await page.locator(".map-sheet").waitFor({ timeout: 8000 });
  }
  if (route.state === "first-step-stage" || route.state === "first-step-answer") {
    await page.getByRole("button", { name: "Me", exact: true }).click();
    // The longest card in the table, so the number this reports is the worst case rather than a
    // sample of it.
    if (route.state === "first-step-answer") await page.getByRole("button", { name: "Still finding out" }).click();
  }
  if (route.state?.startsWith("bedroom-")) {
    await page.locator('[data-ready="true"]').waitFor();
    if (route.state === "bedroom-pause") await page.getByRole("button", { name: "Pause game" }).click();
    else {
      for (let roundTap = 0; roundTap < 12 && await page.locator('.bedroom-game[data-mode="challenge"]').count(); roundTap++) await page.locator(".bedroom-insect:enabled").first().click();
      await page.getByRole("button", { name: "Close the window", exact: true }).click();
      await page.getByRole("button", { name: "Put phone away", exact: true }).click();
      for (let i = 0; i < 12 && await page.locator(".bedroom-insect:enabled").count(); i++) await page.locator(".bedroom-insect:enabled").first().click();
      await page.getByRole("button", { name: "Read a little", exact: true }).click();
      if (route.state !== "bedroom-wind-down") {
        await page.getByRole("button", { name: "Turn the page", exact: true }).click();
        await page.getByRole("button", { name: "Turn the page", exact: true }).click();
        await page.getByRole("button", { name: "Dim the light", exact: true }).click();
        await page.getByRole("button", { name: "Light off", exact: true }).click();
      }
      if (route.state === "bedroom-revisit" || route.state === "bedroom-complete") {
        await page.getByRole("button", { name: "Tomorrow evening" }).click();
        if (route.state === "bedroom-complete") {
          await page.locator(".bedroom-insect:enabled").click();
          await page.getByRole("button", { name: "Find your place" }).click();
          await page.getByRole("button", { name: "Turn the page", exact: true }).click();
          await page.getByRole("button", { name: "Dim the light", exact: true }).click();
          await page.getByRole("button", { name: "Light off", exact: true }).click();
        }
      }
    }
  }

  if (route.state?.startsWith("arjun-")) {
    // Reduced motion plays at the player's pace: catch what answers, park ideas, let the rest pass.
    await page.goto(base + route.path);
    await page.locator('.aw-game[data-still="true"]').waitFor();
    const phase = () => page.locator(".aw-game").getAttribute("data-phase");
    const meet = async until => {
      for (let guard = 0; guard < 160 && await phase() !== until; guard++) {
        const p = await phase();
        if (p === "decided") { if (until === "decided") return; await page.locator(".aw-overlay .kit-primary").click(); continue; }
        if (p === "setup") return;
        const stray = page.locator('.aw-card[data-off="true"]').first();
        if (await stray.count()) { await stray.click(); continue; }
        const retrieve = page.getByRole("button", { name: "Use the saved idea" });
        if (await retrieve.count()) { await retrieve.click(); continue; }
        const keep = page.locator('.aw-bubble[data-relevant="true"]').first();
        if (await keep.count()) { await keep.click(); continue; }
        await page.getByRole("button", { name: "Let one pass" }).click();
      }
    };
    if (route.state === "arjun-decided") return meet("decided");
    await meet("setup"); if (route.state === "arjun-setup") return;
    for (const name of ["Pin the next question", "Hand the follow-up to Rae", "Tomorrow", "Next meeting"]) await page.getByRole("button", { name, exact: true }).click();
    if (route.state === "arjun-revisit") return;
    await meet("complete"); return;
  }
  if (route.state?.startsWith("jax-")) {
    // Reduced motion steps the aisle: tap what the list needs, knock the nearest lure away, roll on.
    await page.goto(base + route.path);
    await page.locator('.jw-game[data-still="true"]').waitFor();
    const phase = () => page.locator(".jw-game").getAttribute("data-phase");
    const nearest = sel => page.locator(sel).evaluateAll(els => els.map((e, i) => ({ i, y: Number(getComputedStyle(e).getPropertyValue("--y")), lane: e.getAttribute("data-lane") })).sort((a, b) => b.y - a.y)[0]);
    const shop = async until => {
      for (let guard = 0; guard < 200; guard++) {
        const p = await phase();
        if (p === until || p === "setup" || p === "complete") return;
        if (p === "till" || p === "revisit-till") { while (await page.locator('.jw-total[data-over="true"]').count()) await page.locator(".jw-back").last().click(); await page.getByRole("button", { name: "Pay" }).click(); continue; }
        const need = await nearest('.jw-item[data-need="true"]');
        if (need && need.lane !== await page.locator(".jw-game").getAttribute("data-lane")) { await page.locator('.jw-item[data-need="true"]').nth(need.i).click(); continue; }
        const lure = await nearest('.jw-item[data-need="false"]');
        if (lure) { await page.locator('.jw-item[data-need="false"]').nth(lure.i).click(); continue; }
        await page.getByRole("button", { name: "Roll on" }).click();
      }
    };
    if (route.state === "jax-till") return shop("till");
    await shop("setup"); if (route.state === "jax-setup") return;
    for (const name of ["Stick the list up", "Put food away"]) await page.getByRole("button", { name }).click();
    await page.locator(".jw-wish-board").click(); await page.getByRole("button", { name: "Next shop" }).click();
    if (route.state === "jax-revisit") return;
    await shop("complete"); return;
  }
  if (route.state?.startsWith("nina-")) {
    // Reduced motion moves the pen one cell per arrow: head for the nearest needed phrase, round blots.
    await page.goto(base + route.path);
    await page.locator('.nw-game[data-still="true"]').waitFor();
    const phase = () => page.locator(".nw-game").getAttribute("data-phase");
    const key = () => page.evaluate(() => {
      const c = el => ({ x: Math.round(+getComputedStyle(el).getPropertyValue("--cx") * 5 - .5), y: Math.round(+getComputedStyle(el).getPropertyValue("--cy") * 7 - .5) });
      const pen = c(document.querySelector(".nw-pen")), goal = new Set([...document.querySelectorAll('.nw-chunk[data-needed="true"]')].map(c).map(p => `${p.x},${p.y}`));
      const blocked = new Set([...document.querySelectorAll('.nw-blot, .nw-chunk:not([data-needed="true"])')].map(c).map(p => `${p.x},${p.y}`));
      const seen = new Map([[`${pen.x},${pen.y}`, null]]), queue = [[pen.x, pen.y]];
      while (queue.length) { const [x, y] = queue.shift(); const k = `${x},${y}`; if (goal.has(k)) return seen.get(k);
        for (const [d, dx, dy] of [["ArrowUp", 0, -1], ["ArrowDown", 0, 1], ["ArrowLeft", -1, 0], ["ArrowRight", 1, 0]]) { const nx = x + dx, ny = y + dy, nk = `${nx},${ny}`; if (nx < 0 || ny < 0 || nx > 4 || ny > 6 || seen.has(nk) || blocked.has(nk)) continue; seen.set(nk, seen.get(k) ?? d); queue.push([nx, ny]); } }
      return "ArrowUp";
    });
    const write = async until => {
      for (let guard = 0; guard < 300; guard++) {
        const p = await phase();
        if (p === until || p === "setup" || p === "complete") return;
        if (p === "line-done") { await page.locator(".nw-done .kit-primary").click(); continue; }
        const k = await key(); if (k) await page.keyboard.press(k);
      }
    };
    if (route.state === "nina-line-done") return write("line-done");
    await write("setup"); if (route.state === "nina-setup") return;
    await page.getByRole("button", { name: "Save the draft" }).click(); await page.getByRole("button", { name: "Leave a marker" }).click();
    await page.locator(".nw-steps button").first().click(); await page.getByRole("button", { name: "Tomorrow" }).click();
    if (route.state === "nina-revisit") return;
    await write("complete"); return;
  }
  if (route.state?.startsWith("maya-")) {
    // Reduced motion moves the crowds one step per step; the dashed outlines show where they will be.
    await page.goto(base + route.path);
    await page.locator('.mw-game[data-still="true"]').waitFor();
    const phase = () => page.locator(".mw-game").getAttribute("data-phase");
    const choose = () => page.evaluate(() => {
      const board = document.querySelector(".mw-board").getBoundingClientRect();
      const cell = el => ({ x: Math.round(+getComputedStyle(el).getPropertyValue("--cx") * 5), y: Math.round(+getComputedStyle(el).getPropertyValue("--cy") * 7) });
      const ghosts = [...document.querySelectorAll(".mw-ghost")].map(g => { const r = g.getBoundingClientRect(); return { row: +g.getAttribute("data-row"), l: (r.left - board.left) / board.width * 5, r: (r.right - board.left) / board.width * 5 }; });
      const m = cell(document.querySelector(".mw-maya")), gate = cell(document.querySelector(".mw-gate")).x;
      const q = document.querySelector('.mw-piece:has(rect[fill="#c8513f"])'), queue = q ? cell(q) : null;
      const over = document.querySelector(".mw-game").getAttribute("data-overwhelmed") === "true";
      const free = (x, y) => x >= 0 && x < 5 && y >= 0 && y < 7 && !(y === 0 && x !== gate) && !(queue && queue.x === x && queue.y === y) && !ghosts.some(g => g.row === y && x + .5 > g.l - .1 && x + .5 < g.r + .1);
      const toward = gate > m.x ? "ArrowRight" : "ArrowLeft", away = toward === "ArrowRight" ? "ArrowLeft" : "ArrowRight";
      const order = over ? [away, toward, "ArrowDown"] : m.y === 1 && m.x !== gate ? [toward, "ArrowDown"] : ["ArrowUp", toward, away, "ArrowDown"];
      const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      return order.find(k => free(m.x + d[k][0], m.y + d[k][1])) ?? "ArrowDown";
    });
    const cross = async until => {
      for (let guard = 0; guard < 400; guard++) {
        const p = await phase();
        if (p === until || p === "setup" || p === "complete") return;
        if (p === "arrived") { await page.locator(".mw-done .kit-primary").click(); continue; }
        if (await page.locator(".mw-ping").count()) { await page.locator(".mw-ping").first().click(); continue; }
        await page.keyboard.press(await choose());
      }
    };
    if (route.state === "maya-arrived") return cross("arrived");
    await cross("setup"); if (route.state === "maya-setup") return;
    for (const name of ["Quiet the phone", "Headphones", "Meet Ari by the clock", "Next week"]) await page.getByRole("button", { name }).click();
    if (route.state === "maya-revisit") return;
    await cross("complete"); return;
  }
  if (route.state?.startsWith("mia-")) {
    await page.goto(base + route.path);
    const paths = [[4,0,1,5,9,10,6,7],[4,8,12,13,9,5,6,10,11,7],[4,5,1,2,6,10,9,13,14,15,11,7]];
    const button = name => page.getByRole('button',{name,exact:true});
    for(let n=0;n<5;n++) await page.locator('.mt-tile').last().click();
    if(route.state==='mia-interruption') return;
    await button('Park for later').click();
    const solve = async round => {
      const path=paths[round];
      const dir=(a,b)=>b===a-4?0:b===a+1?1:b===a+4?2:3;
      for(let pass=0;pass<3;pass++) for(let p=0;p<path.length;p++) {
        const index=path[p], expected=[p===0?3:dir(index,path[p-1]),p===path.length-1?1:dir(index,path[p+1])].sort().join();
        const tile=page.locator(`.mt-tile[data-index="${index}"]`);
        for(let n=0;n<4;n++) {
          if((await tile.getAttribute('data-ports')).split(',').sort().join()===expected) break;
          await tile.click(); if(await button('Park for later').count()) await button('Park for later').click();
        }
      }
      await button('Send thought').click();
    };
    for(let n=0;n<3;n++) { await solve(n); await button(n===2?'Give it a cue':'Next thread').click(); }
    if(route.state==='mia-setup') return;
    await button('Write it down').click();
    if(route.state==='mia-cue') return;
    await button('Anchor connection 7').click(); await button('Try with my cue').click();
    if(route.state==='mia-revisit') return;
    await solve(2); return;
  }
  if (route.state?.startsWith("zoe-")) {
    // Reduced motion shows the whole reply at once and never sends by itself.
    await page.goto(base + route.path);
    await page.locator('.zw-game[data-still="true"]').waitFor();
    const phase = () => page.locator(".zw-game").getAttribute("data-phase");
    const reply = async (cool = true) => { if (cool) while (await page.locator(".zw-word.is-hot").count()) await page.locator(".zw-word.is-hot").first().click(); await page.getByRole("button", { name: "Send", exact: true }).click(); };
    if (route.state === "zoe-repair") { await reply(false); return; }
    await reply();
    if (route.state === "zoe-reply") return;
    for (let beat = 1; beat < 3; beat++) { await page.locator(".zw-actions .kit-primary").click(); await reply(); }
    await page.locator(".zw-actions .kit-primary").click();
    if (route.state === "zoe-setup") return;
    for (const name of ["Rae", "Saturday", "Put it in the calendar", "Keep the jar", "Saturday comes"]) await page.getByRole("button", { name, exact: true }).click();
    if (route.state === "zoe-revisit") return;
    await reply(); void phase; return;
  }
  if (route.state?.startsWith("theo-")) {
    await page.locator('.tm-game[data-ready="true"][data-still="true"]').waitFor();
    const act = async (command) => command === "door"
      ? page.getByRole("button", { name: "Leave", exact: true }).click()
      : page.locator(`[data-command="${command}"]`).click();
    if (route.state === "theo-pause") await page.getByRole("button", { name: "Pause game" }).click();
    else {
      for (const command of ["phone", "bottle", "keys", "bag", "phone", "bag", "shoes"]) await act(command);
      if (route.state !== "theo-busy") {
        await act("door");
        if (route.state !== "theo-departure") {
          await page.getByRole("button", { name: "Later that evening" }).click();
          for (const name of ["Keys", "Phone", "Water"]) await page.getByRole("button", { name: `Place ${name} in Hall`, exact: true }).click();
          if (route.state !== "theo-evening") {
            await page.getByRole("button", { name: "Tomorrow", exact: true }).click();
            if (route.state === "theo-complete") for (const command of ["keys", "phone", "bag", "bottle", "bag", "shoes", "umbrella", "door"]) await act(command);
          }
        }
      }
    }
  }
  if (route.state === "run-last") {
    // The run's last card, resumed through the device's cursor: the dots count the run's cards.
    await page.locator(".play-dots li").first().waitFor({ state: "attached", timeout: 8000 });
    const last = (await page.locator(".play-dots li").count()) - 1;
    const id = new URL(route.path, base).searchParams.get("module");
    await page.evaluate(([moduleId, step]) => localStorage.setItem("adhdme.learn.cursor.v1", JSON.stringify({ v: 1, moduleId, step })), [id, last]);
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('.play-run[data-phase="next"]').waitFor({ timeout: 8000 });
  }
  if (route.state === "lives-run") {
    await page.waitForTimeout(1200);
  }
  await page.waitForTimeout(600);
}

export function routes() {
  return [...discoverRoutes().map((path) => ({ path, name: path })), ...EXTRA.filter((r) => !r.skip)];
}

/** The browser context every measurement uses: a phone, reduced motion, the first-visit bars agreed. */
export function contextFor(base) {
  return {
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
    storageState: {
      cookies: [],
      origins: [{ origin: base, localStorage: [{ name: "adhdme-privacy-ack", value: "1" }, { name: "adhdme.play.tutored", value: "1" }, { name: "adhdme.lives.tutored", value: "1" }] }],
    },
  };
}

/** One screen's numbers from its rows. */
export function summarise(route, rows) {
  const total = rows.filter((r) => !r.chrome).reduce((n, r) => n + words(r.text), 0);
  const fold = rows.filter((r) => r.aboveFold && !r.chrome).reduce((n, r) => n + words(r.text), 0);
  const chrome = rows.filter((r) => r.chrome).reduce((n, r) => n + words(r.text), 0);
  const longest = rows.filter((r) => !r.chrome).map((r) => ({ w: words(r.text), text: r.text.slice(0, 80), tag: r.tag })).sort((a, b) => b.w - a.w).slice(0, 3);
  const longForm = LONG_FORM.has(route.path);
  const ceiling = CEILING.get(route.name ?? "") ?? BUDGET.screen;
  const verdict = total <= BUDGET.target ? "target" : total <= ceiling ? "ceiling" : longForm ? "long-form" : "OVER";
  return { path: route.path, name: route.name, state: route.state ?? null, total, fold, chrome, ratio: Math.round((total / BUDGET.target) * 10) / 10, verdict, longest };
}
