import {test,expect} from './support/test';
import {GAME_ENTRY} from '../src/lives/entry-points';
import {expectNoViolations} from './support/a11y';
test('all eight games are directly visible and playable from Learn',async({page})=>{
 test.setTimeout(120000);await page.emulateMedia({reducedMotion:'reduce'});
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 for(const [id,entry] of Object.entries(GAME_ENTRY)){
  await page.goto('/approach?pane=games');
  const roster=page.getByRole('list',{name:'All eight character games'});
  await expect(roster.getByRole('link')).toHaveCount(8);
  const name=id.charAt(0).toUpperCase()+id.slice(1);
  const link=roster.getByRole('link',{name:`Play ${name}`,exact:true});
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
  await page.setViewportSize({width,height:900});await page.goto('/approach?pane=games');
  const cards=page.locator('.learn-game-roster a');await expect(cards).toHaveCount(8);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const rects=await cards.evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
  for(let a=0;a<rects.length;a++)for(let b=a+1;b<rects.length;b++)expect(rects[a]!.right<=rects[b]!.left||rects[b]!.right<=rects[a]!.left||rects[a]!.bottom<=rects[b]!.top||rects[b]!.bottom<=rects[a]!.top).toBe(true);
 }
 await expectNoViolations(page,'All games discovery');
 if(info.project.name==='chromium')await page.screenshot({path:'qa/_runs/all-games-desktop.png',fullPage:true});
 const arjun=page.getByRole('link',{name:'Play Arjun',exact:true});await arjun.focus();await page.keyboard.press('Enter');await expect(page.locator('.aw-game')).toBeVisible();
});

test('all twenty quick games can be opened and started from the expanded library',async({page})=>{
 test.setTimeout(120000);await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(()=>localStorage.setItem('adhdme.play.tutored','1'));
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(let index=0;index<20;index++){
  await page.goto('/approach?pane=games');await page.getByTestId('learn-show-all').click();
  const cards=page.getByTestId('learn-games').locator('.learn-card');await expect(cards).toHaveCount(20);
  await cards.nth(index).click();await expect(page.locator('.play-run')).toBeVisible();
  for(let n=0;n<4&&await page.getByRole('group',{name:'How to play'}).count();n++)await page.getByRole('group',{name:'How to play'}).getByRole('button').click();
  await page.getByRole('button',{name:'Tap to play',exact:true}).click();
  await expect(page.locator('.play-run')).toHaveAttribute('data-phase','round');
  await page.getByRole('button',{name:'All modules',exact:true}).click();
 }
 expect(errors).toEqual([]);
});
