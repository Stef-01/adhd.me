import type {Page} from '@playwright/test';
import {test,expect} from './support/test';
import {GAME_ENTRY} from '../src/lives/entry-points';
import {GAME_GROUPS} from '../src/learn/games';
import {expectNoViolations} from './support/a11y';
// "All games" (PLAN.md W7) opens on the eight lives; the runs sit in the Learn shelves' groups.
const allGames=async(page:Page)=>{await page.goto('/approach?pane=games');await page.getByTestId('learn-show-all').click();return page.locator('.learn-game-names');};
test('all eight games are directly visible and playable from Learn',async({page})=>{
 test.setTimeout(120000);await page.emulateMedia({reducedMotion:'reduce'});
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 for(const [id,entry] of Object.entries(GAME_ENTRY)){
  const roster=await allGames(page);
  await expect(roster.getByRole('link')).toHaveCount(8);
  const name=id.charAt(0).toUpperCase()+id.slice(1);
  const link=roster.getByRole('link',{name:new RegExp(`^${name}(, played)?$`)});
  await expect(link).toBeVisible();await expect(link).toHaveAttribute('href',entry.href);await link.click();
  await expect(page).toHaveURL(new RegExp(entry.href));await expect(page.locator('.lives-run')).toBeVisible();
  await expect(page.getByRole('slider')).toHaveCount(0);
  await page.getByRole('button',{name:'Pause game',exact:true}).click();
  await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Resume',exact:true}).click();
  await page.getByRole('link',{name:/^Back to /}).first().click();
 }
 expect(errors).toEqual([]);
});
test('all game cards fit, remain separate and are keyboard accessible',async({page},info)=>{
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});
  const cards=(await allGames(page)).locator('a');await expect(cards).toHaveCount(8);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const rects=await cards.evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
  for(let a=0;a<rects.length;a++)for(let b=a+1;b<rects.length;b++)expect(rects[a]!.right<=rects[b]!.left||rects[b]!.right<=rects[a]!.left||rects[a]!.bottom<=rects[b]!.top||rects[b]!.bottom<=rects[a]!.top).toBe(true);
 }
 await expectNoViolations(page,'All games discovery');
 if(info.project.name==='chromium')await page.screenshot({path:'qa/_runs/all-games-desktop.png',fullPage:true});
 const arjun=page.locator('.learn-game-names').getByRole('link',{name:'Arjun',exact:true});await arjun.focus();await page.keyboard.press('Enter');await expect(page.locator('.aw-game')).toBeVisible();
});

test('all twenty quick games can be opened and started from All games',async({page})=>{
 test.setTimeout(120000);await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(()=>localStorage.setItem('adhdme.play.tutored','1'));
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const runs=GAME_GROUPS.slice(1).flatMap(g=>g.games.map(game=>({group:g.title,title:game.title})));
 expect(runs).toHaveLength(20);
 for(const run of runs){
  await allGames(page);await page.getByRole('button',{name:run.group,exact:true}).click();
  await page.locator('.learn-game-names').getByRole('button',{name:run.title,exact:true}).click();await expect(page.locator('.play-run')).toBeVisible();
  for(let n=0;n<4&&await page.getByRole('group',{name:'How to play'}).count();n++)await page.getByRole('group',{name:'How to play'}).getByRole('button').click();
  await page.getByRole('button',{name:'Tap to play',exact:true}).click();
  await expect(page.locator('.play-run')).toHaveAttribute('data-phase','round');
  await page.getByRole('button',{name:'All modules',exact:true}).click();
 }
 expect(errors).toEqual([]);
});


test('first visits keep the game controls above the privacy bar', async ({ page }) => {
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>localStorage.removeItem('adhdme-privacy-ack'));
 for(const id of ['maya','jax','nina','arjun','zoe'] as const){
  await page.goto(GAME_ENTRY[id].href);
  const bar=page.getByRole('region',{name:'Privacy'});await expect(bar).toBeVisible();
  await expect.poll(async()=>{
   const b=(await bar.boundingBox())!;const stage=(await page.locator('.kit-game').boundingBox())!;
   return Math.round(stage.y+stage.height)<=Math.round(b.y);
  }).toBe(true);
 }
 await page.setViewportSize({width:320,height:568});
 await page.goto(GAME_ENTRY.maya.href);
 await page.getByRole('button',{name:'Wait here'}).click();
 await page.getByRole('button',{name:'Step forward'}).click();
 await page.goto(GAME_ENTRY.theo.href);
 await expect(page.getByRole('region',{name:'Privacy'})).toBeVisible();
 await expect.poll(async()=>{
  const bar=(await page.getByRole('region',{name:'Privacy'}).boundingBox())!;
  const actions=(await page.locator('.tm-actions').boundingBox())!;
  return Math.round(actions.y+actions.height)<=Math.round(bar.y);
 }).toBe(true);
});
