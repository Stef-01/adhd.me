import { test, expect, type Page } from "@playwright/test";
const PUBLIC = ["/", "/about", "/approach", "/clinicians", "/clinicians/join", "/demo", "/examples",
  "/faq", "/finder", "/practices", "/privacy", "/terms", "/thanks",
  "/privacy/automated-decisions", "/privacy/counsel-review"];
const CONSOLE = ["/console", "/console/dashboard", "/console/matching", "/console/interview",
  "/console/applications", "/console/allocation", "/console/rules", "/console/registers",
  "/console/privacy", "/console/ops", "/console/outcomes", "/console/referrals",
  "/console/complaints", "/console/reporting", "/console/usefulness", "/console/case-mix",
  "/console/pathways", "/console/education", "/console/verticals"];
async function signIn(page: Page) {
  await page.goto("/console/signin");
  await page.getByLabel("Work email").fill("owner@demo.practice.example");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console(\/onboarding)?$/);
  await page.goto("/console/onboarding");
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(/\/console$/);
}
test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/console");
  // O167: SEEDED, BECAUSE THIS SWEEP WAS ORDER-DEPENDENT AND ONLY SOMETIMES SAW WHAT IT AUDITS.
  // The vertical specs live in a process-global store that `/api/mock/console` does not touch, so
  // whether `/console/verticals` rendered its populated branch or its "nothing declared" zero state
  // depended on whether `verticals.spec.ts` had already run in the same worker. Run alone, this
  // test passed over a page reading "the founder to sign it off"; run after that spec, it failed.
  // A sweep whose coverage is decided by test ordering is not a sweep. `a11y.spec.ts` had already
  // drawn this exact line for the same route ("scanned POPULATED, not on its zero state"); this
  // inherits it.
  await request.post("/api/mock/verticals");
});
/**
 * O156 (founder-directed): "remove all mentions of founder on entire site do throough code audit".
 *
 * TWO ASSERTIONS THAT ONLY MEAN SOMETHING TOGETHER. The word must be gone from every rendered
 * surface — and the DISCLOSURE it used to sit inside must still be there, in its new words.
 *
 * Removing the word alone would have been easy and wrong: `disclosedInterest` exists to tell a
 * patient that the GP in front of them owns the directory recommending him, and a conflict notice
 * that stops naming the conflict has stopped working. So the sweep proves the absence and the
 * profile check proves the presence, in one test, because a later unit deleting the disclosure to
 * satisfy the first assertion is exactly the failure this pairing prevents.
 *
 * The source grep that preceded this missed four rendered sentences — in /privacy, two console
 * screens and a pathways note — because they were prose rather than labels. Reading the rendered
 * text is what "thorough" had to mean.
 */
test("the word is gone from every surface, and the ownership disclosure is not", async ({ page }) => {
  const hits: string[] = [];
  const scan = async (route: string) => {
    const res = await page.goto(route);
    if (res && res.status() === 404) return;
    const t = await page.evaluate(() => document.body.innerText);
    for (const line of t.split("\n")) if (/founder/i.test(line)) hits.push(`${route}: ${line.trim().slice(0, 90)}`);
  };
  for (const r of PUBLIC) await scan(r);
  // The finder's profile, where the ownership disclosure actually renders.
  await page.goto("/finder");
  await page.getByRole("button", { name: "Try a demo scenario" }).click();
  await page.getByRole("button", { name: "Try this scenario" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  await page.locator(".clinician-row").filter({ hasText: "Dr Anubhav" }).first().click();
  await expect(page.locator(".profile-content")).toBeVisible();
  const prof = await page.evaluate(() => document.body.innerText);
  for (const line of prof.split("\n")) if (/founder/i.test(line)) hits.push(`profile: ${line.trim().slice(0, 90)}`);
  // And the disclosure is genuinely THERE, not merely wordless.
  // O158: the disclosure must be PRESENT and must not claim ownership of the entity. Asserting a
  // fixed string here is what carried a false one — "Owner of ADHD.ME" — through a green suite.
  const line = await page.locator(".disclosure-line").innerText();
  expect(line.trim().length, "the disclosure vanished from the profile").toBeGreaterThan(0);
  expect(line, "the disclosure claims ownership of ADHD.ME; he owns his clinic (O158)")
    .not.toMatch(/(owns|owner of|ownership (interest )?(in|of)) ADHD\.ME/i);
  await signIn(page);
  for (const r of CONSOLE) await scan(r);
  console.log(`FOUNDER_HITS ${hits.length}`);
  for (const h of hits.slice(0, 10)) console.log("   " + h);
  expect(hits, `"founder" still rendered:\n${hits.join("\n")}`).toEqual([]);
});
