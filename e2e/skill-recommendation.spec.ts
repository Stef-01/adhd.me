import { test, expect } from "./support/test";
import { emptyModel } from "../src/model/store";
import { emptyProfile } from "../src/lives/profile";
import { expectNoViolations } from "./support/a11y";

// 2026-09-29: the roster is real people only, and a card exists only where somebody declares the
// skill in their own listing. Sleep is one such need (sleep-routine); starting is not, yet.
for (const width of [390,1440]) test(`skill recommendation opens the exact profile at ${width}px`, async ({ page }) => {
  await page.setViewportSize({width,height:900});
  await page.addInitScript(record => localStorage.setItem("adhdme.model.v1",JSON.stringify(record)), {
    ...emptyModel(), resonance:{sleep:{cost:8,priority:"yes",at:"2026-09-21"}}
  });
  await page.goto("/support");
  const card=page.locator("[data-skill-match]").first();
  await expect(card).toBeVisible();
  const trigger=card.locator("button").first();
  await trigger.click();
  const dialog=page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expectNoViolations(page, `The skill-match dialog at ${width}px`);
  await page.screenshot({path:`qa/_runs/skill-match-${width}.png`,fullPage:true});
  const name=await dialog.getByRole("heading").innerText();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("link",{name:"View full profile"}).click();
  await expect(page).toHaveURL(/\/practitioner\//);
  await expect(page.getByRole("heading",{name,exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading",{name,exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("game recognition reaches support, retracts immediately and never uses a score",async({page})=>{
  await page.goto("/support");
  await expect(page.locator("[data-skill-match]")).toHaveCount(0);
  await page.evaluate(profile=>{localStorage.setItem("adhdme.lives.v1",JSON.stringify(profile));window.dispatchEvent(new Event("adhdme:personalisation"));},{...emptyProfile(),highScore:999});
  await expect(page.locator("[data-skill-match]")).toHaveCount(0);
  await page.evaluate(profile=>{localStorage.setItem("adhdme.lives.v1",JSON.stringify(profile));window.dispatchEvent(new Event("adhdme:personalisation"));},{...emptyProfile(),resonanceSignals:[{sourceType:"character",sourceId:"leo",response:"this_is_me",createdAt:1}]});
  await expect(page.locator("[data-skill-match]")).toBeVisible();
  await page.evaluate(profile=>{localStorage.setItem("adhdme.lives.v1",JSON.stringify(profile));window.dispatchEvent(new Event("adhdme:personalisation"));},{...emptyProfile(),resonanceSignals:[{sourceType:"character",sourceId:"leo",response:"not_me",createdAt:2}]});
  await expect(page.locator("[data-skill-match]")).toHaveCount(0);
});
