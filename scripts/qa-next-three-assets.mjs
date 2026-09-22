import { chromium } from '@playwright/test';
import { mkdirSync,writeFileSync } from 'node:fs';
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:3151/games/next-three/review.html');await page.locator('.piece').first().waitFor();mkdirSync('qa/_runs/next-three',{recursive:true});const results=[];
for(const game of ['zoe','mia','arjun'])for(const orientation of ['desktop','phone']){
 await page.setViewportSize({width:orientation==='phone'?430:1440,height:1100});await page.locator(`[data-game=${game}]`).click();await page.locator('#orientation').selectOption(orientation);
 for(const phase of ['encounter','complication','strategy-setup','revisit']){
  await page.locator('#phase').selectOption(phase);await page.locator('#stage img').evaluateAll(async images=>await Promise.all(images.map(i=>i.decode())));
  const bad=await page.locator('img').evaluateAll(images=>images.filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src));if(bad.length)throw new Error('Broken images '+bad);
  const cast=await page.locator('.cast').evaluateAll(images=>images.every(i=>{const r=i.getBoundingClientRect(),s=i.parentElement.getBoundingClientRect();return r.width>40&&r.height>40&&r.left>=s.left&&r.right<=s.right&&r.top>=s.top&&r.bottom<=s.bottom}));if(!cast)throw new Error('Character outside scene');
  const over=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(over)throw new Error('Horizontal overflow');
  await page.locator('.piece').first().click();if(!(await page.locator('#status').textContent()).includes('updated'))throw new Error('Preview action failed');await page.locator('#reset').click();
  results.push({game,orientation,phase,images:'decoded',placement:'passed',overflow:false});
  if(phase==='strategy-setup')await page.locator('#stage').screenshot({path:`qa/_runs/next-three/${game}-${orientation}.png`});
 }
}
const decoded=await page.evaluate(async()=>{const m=await(await fetch('./manifest.json')).json();await Promise.all(m.assets.map(a=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>i.naturalWidth===a.viewBox[2]&&i.naturalHeight===a.viewBox[3]?resolve(true):reject(new Error(a.id+' dimensions'));i.onerror=()=>reject(new Error(a.id+' decoding'));i.src=a.src})));return m.assets.length});if(decoded!==75)throw new Error('Incomplete asset decode');
if(errors.length)throw new Error(errors.join('\n'));writeFileSync('qa/_runs/next-three/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify({assetsDecoded:decoded,states:results.length,pageErrors:errors.length,allPassed:true}));await browser.close();
