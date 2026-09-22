import { test, expect } from './support/test';
import { expectNoViolations } from './support/a11y';
import type { Page } from '@playwright/test';
import { solution, ports, PATHS } from '../src/lives/mia-world';
test.setTimeout(90000);
const URL = '/lives/play/mia-remember-why';
async function solve(page: Page, tap = false) {
  const round = Number(await page.locator('.mt-game').getAttribute('data-round'));
  for (let pass = 0; pass < 3; pass++) {
    for (const index of PATHS[round]!) {
      const tile = page.locator(`.mt-tile[data-index="${index}"]`);
      const expected = ports(solution(round)[index]!).sort().join();
      for (let n = 0; n < 4; n++) {
        const actual = (await tile.getAttribute('data-ports'))!.split(',').sort().join();
        if (actual === expected) break;
        if (tap) await tile.tap(); else await tile.click();
        const park = page.getByRole('button', { name: 'Park for later' });
        if (await park.count()) { if (tap) await park.tap(); else await park.click(); }
      }
    }
  }
  const send = page.getByRole('button', { name: 'Send thought', exact: true });
  if (tap) await send.tap(); else await send.click();
}
async function toSetup(page: Page) {
  for (let n = 0; n < 3; n++) { await solve(page); await page.getByRole('button', {name:n===2?'Give it a cue':'Next thread',exact:true}).click(); }
  await expect(page.locator('.mt-game')).toHaveAttribute('data-phase','setup');
}
async function cue(page: Page) {
  await page.getByRole('button',{name:'Write it down',exact:true}).click();
  await page.getByRole('button',{name:'Anchor connection 7',exact:true}).click();
  await page.getByRole('button',{name:'Try with my cue',exact:true}).click();
}
test('three distinct networks, cue practice and a changed revisit complete from the library', async ({page}) => {
  await page.goto('/lives/characters');
  await page.getByRole('link',{name:'Play Mia’s moment →',exact:true}).click();
  await expect(page).toHaveURL(new RegExp(URL));
  await expect(page.locator('.mw-house,.mw-pocket,.tm-game')).toHaveCount(0);
  await expect(page.getByRole('slider')).toHaveCount(0);
  await toSetup(page); await cue(page);
  await expect(page.locator('.mt-tile[data-index="6"]')).toBeDisabled();
  await solve(page); await expect(page.locator('.mt-game')).toHaveAttribute('data-phase','complete');
  await expect(page.getByRole('link',{name:'Try a cue in my day'})).toHaveAttribute('href','/lives/learn?module=external_cue_v1');
  await page.getByRole('button',{name:'Another thread'}).click();
  await expect(page.locator('.mt-game')).toHaveAttribute('data-round','0');
});
test('loose ends, interruption, parking and pause are recoverable', async ({page}) => {
  await page.goto(URL); await page.getByRole('button',{name:'Send thought',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('loose end');
  for(let n=0;n<5;n++) await page.locator('.mt-tile').last().click();
  await expect(page.getByText('Weekend plans',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Park for later'}).click();
  const turns = await page.locator('.mt-tile').evaluateAll(es=>es.map(e=>e.getAttribute('data-turn')));
  await page.getByRole('button',{name:'Pause game'}).click();
  await expect(page.getByRole('group',{name:'Thought connections'})).toHaveCount(0);
  await page.getByRole('button',{name:'Resume',exact:true}).click();
  expect(await page.locator('.mt-tile').evaluateAll(es=>es.map(e=>e.getAttribute('data-turn')))).toEqual(turns);
  await solve(page); await expect(page.getByRole('button',{name:'Next thread'})).toBeVisible();
});
test('phone, landscape and desktop controls stay accessible and exit remains reachable', async ({page}, info) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const [width,height] of [[320,568],[390,844],[844,390],[1440,900]] as const) {
    await page.setViewportSize({width,height}); await page.goto(URL);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const tile = await page.locator('.mt-tile').first().boundingBox(); expect(tile!.width).toBeGreaterThanOrEqual(48);
    await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
    expect(await page.getByRole('link',{name:'Back to games'}).evaluate(el=>{const r=el.getBoundingClientRect(); return r.top>=0&&r.bottom<=innerHeight&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  }
  await page.setViewportSize({width:390,height:844}); await page.goto(URL);
  await expectNoViolations(page,'Mia thought puzzle');
  if(info.project.name==='chromium') await page.screenshot({path:'qa/_runs/mia-thread-phone.png',fullPage:true});
  await toSetup(page); await expectNoViolations(page,'Mia cue setup'); await cue(page);
  await expectNoViolations(page,'Mia cue revisit'); await solve(page); await expectNoViolations(page,'Mia completion');
});
test('touch and keyboard rotate the same stable targets without saving health inferences', async ({browser,baseURL}) => {
  const context = await browser.newContext({baseURL,viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('adhdme-privacy-ack','1'));
  const page=await context.newPage(); await page.goto(URL);
  const before=await page.evaluate(()=>JSON.stringify(localStorage));
  const first=page.locator('.mt-tile').first(); const turn=Number(await first.getAttribute('data-turn'));
  await first.focus(); await page.keyboard.press('Enter');
  expect(Number(await first.getAttribute('data-turn'))).toBe(turn+1);
  await solve(page,true); await expect(page.getByRole('button',{name:'Next thread'})).toBeVisible();
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(before); await context.close();
});
