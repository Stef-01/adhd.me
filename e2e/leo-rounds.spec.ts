import { test, expect } from "./support/test";
for(const width of [390,1440]) test(`Leo rounds lead into an enacted routine at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900}); await page.emulateMedia({reducedMotion:"reduce"});
 await page.goto("/lives/play/leo-mosquito");
 const room=page.locator('.bedroom-game'); await expect(room).toHaveAttribute("data-ready","true");
 await expect(page.getByRole("button",{name:"Close the window",exact:true})).toBeDisabled();
 for(let round=1;round<=3;round++){
  await expect(room).toHaveAttribute("data-round",String(round));
  await expect(page.locator('.bedroom-insect:enabled')).toHaveCount(round+2);
  for(let i=0;i<round+2;i++) await page.locator('.bedroom-insect:enabled').first().press("Enter");
 }
 await expect(room).toHaveAttribute("data-mode","recovery");
 await expect(page.locator('.bedroom-insect:enabled')).toHaveCount(0);
 await page.screenshot({path:`qa/_runs/leo-settling-${width}.png`});
 await page.getByRole("button",{name:"Close the window",exact:true}).click();
 await page.getByRole("button",{name:"Put phone away",exact:true}).click();
 await page.getByRole("button",{name:"Headphones on",exact:true}).click();
 await page.getByRole("button",{name:"Read a little",exact:true}).click();
 await page.getByRole("button",{name:"Turn the page",exact:true}).click();
 await page.getByRole("button",{name:"Turn the page",exact:true}).click();
 await page.getByRole("button",{name:"Dim the light",exact:true}).click();
 await page.getByRole("button",{name:"Light off",exact:true}).click();
 await expect(room).toHaveAttribute("data-mode","rest");
 await page.getByRole("button",{name:"Tomorrow evening"}).click();
 await expect(room).toHaveAttribute("data-mode","revisit");
 await expect(page.getByRole("button",{name:"Window secured",exact:true})).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});


test("ending the timed challenge opens recovery rather than bypassing learning",async({page})=>{
 await page.emulateMedia({reducedMotion:"no-preference"});
 await page.goto("/lives/play/leo-mosquito");
 await expect(page.locator('.bedroom-game')).toHaveAttribute("data-ready","true");
 await page.getByRole("button",{name:"Pause game"}).click();
 await page.getByRole("button",{name:"Continue without countdown"}).click();
 await expect(page.locator('.bedroom-game')).toHaveAttribute("data-mode","recovery");
 await expect(page.getByRole("button",{name:"Close the window",exact:true})).toBeEnabled();
 await expect(page.locator('.bedroom-insect:enabled')).toHaveCount(3);
 await expect(page.getByRole("button",{name:"Tomorrow evening"})).toHaveCount(0);
});
