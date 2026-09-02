import { chromium } from "@playwright/test";
const out = "/tmp/claude-0/-home-user/23aa3ddd-7d45-5c1a-8714-af3febc47ba9/scratchpad/shots";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const shot = async (name: string) => { await p.waitForTimeout(600); await p.screenshot({ path: `${out}/${name}.png` }); console.log("shot", name); };

await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
// Dismiss the consent bar the way a visitor would, so every later shot is the real thing.
await p.getByRole("button", { name: "Agree" }).click().catch(() => {});
await shot("01-home");

await p.getByLabel(/Describe the GP you are looking for/i).fill("I need a woman GP near Chatswood who speaks Mandarin and can do the whole assessment");
await shot("02-typed");
await p.keyboard.press("Enter");
await p.waitForTimeout(2500);
await shot("03-results");
await p.mouse.wheel(0, 700); await shot("04-results-scrolled");
await p.mouse.wheel(0, 900); await shot("05-results-lower");

// First clinician card -> profile
await p.mouse.wheel(0, -1600);
await p.locator(".clinician-list a, .clinician-list button").first().click().catch(async () => {
  await p.locator("[data-portrait-of]").first().click();
});
await p.waitForTimeout(1500);
await shot("06-profile");
await p.mouse.wheel(0, 800); await shot("07-profile-lower");
await b.close();
console.log("done");
