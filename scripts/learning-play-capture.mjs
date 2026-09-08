import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const base=process.env.BRAND_URL??'http://localhost:3116';
const out='docs/design/warm-brand';
const browser=await chromium.launch({channel:'chrome'});
const evidence=[];
for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
 const page=await context.newPage();
 await page.goto(base);
 await page.evaluate(()=>localStorage.setItem('adhdme-privacy-ack','1'));
 for(const module of ['adhd','everyday','finding','cost','changed','myth-or-fact','words']){
  await page.goto(`${base}/approach?module=${module}`);
  await page.locator('.learn-lesson.is-current').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  if(module==='everyday')await page.getByRole('button',{name:'Next',exact:true}).click();
  if(module==='finding'){await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByRole('button',{name:'Next',exact:true}).click();}
  await page.screenshot({path:`${out}/play-${module}-${width}.png`,fullPage:true});
  evidence.push(await page.evaluate(module=>({module,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,lessonWidth:document.querySelector('.learn-lesson.is-current').clientWidth,lessonScroll:document.querySelector('.learn-lesson.is-current').scrollWidth}),module));
 }
 for(const module of ['starting','working-memory','sleep']){
  await page.goto(`${base}/approach?module=${module}`);
  await page.getByRole('button',{name:'Tap to play'}).click();
  await page.locator('.play-card.is-round').waitFor();
  await page.screenshot({path:`${out}/game-${module}-${width}.png`,fullPage:true});
  evidence.push(await page.evaluate(module=>({module:`game-${module}`,width:innerWidth,scrollWidth:document.documentElement.scrollWidth}),module));
 }
 await page.goto(`${base}/approach/meditate`);
 await page.getByRole('button',{name:'Start my moment'}).waitFor();
 await page.screenshot({path:`${out}/meditation-lobby-${width}.png`,fullPage:true});
 await page.getByRole('button',{name:'Start my moment'}).click();
 await page.getByRole('heading',{name:'Nothing else to do.'}).waitFor();
 await page.screenshot({path:`${out}/meditation-player-${width}.png`,fullPage:true});
 evidence.push(await page.evaluate(()=>({module:'meditation',width:innerWidth,scrollWidth:document.documentElement.scrollWidth})));
 await context.close();
}
await browser.close();
await writeFile(`${out}/play-geometry.json`,JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence));
if(evidence.some(item=>item.scrollWidth>item.width+1 || item.lessonScroll>item.lessonWidth+1))process.exitCode=1;
const pairs=[['reference-meditation.png','meditation-player-390.png','A moment of stillness','A dedicated orange session composition, central timer, optional chimes and written guidance. A separate shared mode follows a synchronised schedule without invented participants or a human host.'],['reference-learning.png','play-adhd-1440.png','Learning through discovery','Colourful lesson interiors, revealable ideas and response animation.'],['reference-learning.png','play-everyday-1440.png','Build the next small step','A sequence activity with feedback, ordered slots and reset.'],['reference-learning.png','game-working-memory-390.png','The latest game modules, preserved','Fifteen game-based modules from the latest main remain integrated alongside the new reading activities.'],['reference-learning.png','meditation-lobby-1440.png','A different composition for a different moment','A scenic meditation lobby, personal duration controls and a scheduled session invitation.']];
await writeFile(`${out}/comparison.html`,`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ADHD.ME · Learning and motion review</title><style>body{margin:0;background:#fbfaf7;color:#191a17;font:16px/1.6 system-ui}main{max-width:1440px;margin:auto;padding:40px 24px}h1{font-size:40px;line-height:1.1}section{margin:48px 0;border-top:1px solid #dfddd6;padding-top:24px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:24px}img{width:100%;height:540px;object-fit:contain;background:#eeece5;border-radius:16px}a{color:#6c4300}p{max-width:80ch}@media(max-width:700px){.pair{grid-template-columns:1fr}}</style><main><h1>A warmer platform. More ways to learn.</h1><p>The supplied brand board shapes the platform shell. The newer request explicitly adds colour and more Motion inside learning and meditation. These are actual production-build screenshots compared with the supplied visual references.</p><p><a href="USER-BRAND-BOARD.txt">Brand board</a> · <a href="REVIEW.md">Implementation and verification</a> · <a href="play-geometry.json">Responsive evidence</a></p>${pairs.map(([reference,actual,title,description])=>`<section><h2>${title}</h2><p>${description}</p><div class="pair"><a href="${reference}"><img src="${reference}" alt="User reference"></a><a href="${actual}"><img src="${actual}" alt="Implemented ${title}"></a></div></section>`).join('')}</main></html>`);
