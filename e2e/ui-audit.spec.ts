// O24 audit sweep: mobile captures of every prose surface, for the design record.
import { test } from "@playwright/test";

const PAGES = ["/", "/approach", "/practices", "/clinicians", "/faq", "/examples", "/privacy"];

test("capture public surfaces at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForTimeout(500);
    const slug = path === "/" ? "home" : path.slice(1).replace(/\//g, "-");
    await page.screenshot({ path: `qa/_runs/ui-o24/${slug}-mobile.png`, fullPage: true });
  }
});
