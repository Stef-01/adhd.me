import {test,expect} from './support/test';
import {installFakeClock} from './support/fake-clock';
import {RUNS} from '../src/learn/runs';
for(const run of RUNS)test(`${run.id}: timed rounds still reach a strategy and next step`,async({page})=>{
 test.setTimeout(90000);await page.addInitScript(()=>localStorage.setItem('adhdme.play.tutored','1'));
 await installFakeClock(page);await page.goto('/approach?module='+run.id);await page.getByRole('button',{name:'Tap to play',exact:true}).click();
 const player=page.locator('.play-run');let strategy=false;
 for(let step=0;step<75;step++){
  const phase=await player.getAttribute('data-phase');if(phase==='next'){expect(strategy).toBe(true);await expect(player.locator('a,button').filter({hasText:/Finish|Explore support|Play the next one/}).first()).toBeVisible();return;}
  if(phase==='round'){
   if(await page.locator('.play-card[data-beat="play"]').count())await page.clock.fastForward(30000);
   const next=player.getByRole('button',{name:'Next',exact:true});if(await next.isVisible())await next.click();
  }else{
   if(phase==='try')strategy=true;
   const next=player.getByRole('button',{name:/^(Next|Skip|Not quite)$/}).first();
   if(await next.isVisible())await next.click();else await player.locator('.play-choices button').first().click();
  }
  await page.waitForTimeout(160);
 }
 throw Error('Did not reach the next step: '+await player.getAttribute('data-phase'));
});
