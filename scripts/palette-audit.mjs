import { readFile, mkdir, writeFile } from 'node:fs/promises';
import postcss from 'postcss';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const root=postcss.parse(await readFile('app/globals.css','utf8')).nodes.find(n=>n.type==='rule'&&n.selector===':root');
const tokens=Object.fromEntries(root.nodes.filter(n=>n.type==='decl').map(n=>[n.prop,n.value]));
const resolve=name=>tokens[name].startsWith('var(')?resolve(tokens[name].slice(4,-1)):tokens[name];
const luminance=hex=>hex.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(resolve(a)),y=luminance(resolve(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const pairs=[['--ink','--paper'],['--muted','--paper'],['--faint','--paper'],['--faint','--stone'],['--accent','--paper'],['--on-band','--ink'],['--line','--ink'],['--hero-blue-night','--paper'],['--chart-tick','--paper']];
const ratios=pairs.map(([foreground,background])=>({foreground,background,ratio:Number(contrast(foreground,background).toFixed(2))}));
if(ratios.some(r=>r.ratio<4.5))throw new Error(JSON.stringify(ratios));
const output='docs/design/warm-brand';
await mkdir(output,{recursive:true});
await writeFile(`${output}/contrast.json`,JSON.stringify(ratios,null,2));
console.log(JSON.stringify(ratios));
if(!process.env.BRAND_URL)process.exit(0);
const browser=await chromium.launch({channel:'chrome'});
const results=[];
for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
 const page=await context.newPage();
 for(const [name,path] of [['find','/'],['learn','/approach'],['lesson','/approach?module=everyday'],['public','/faq'],['console','/console/signin'],['today','/today'],['my-adhd','/my-adhd'],['care-map','/approach/map'],['onboarding','/start']]){
  await page.goto(process.env.BRAND_URL+path);
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForLoadState('networkidle');
  const agree=page.getByRole('button',{name:'Agree',exact:true});if(await agree.isVisible())await agree.click();
  if(name==='lesson')await page.locator('.learn-lesson.is-current').waitFor();
  const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  const geometry=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,paper:getComputedStyle(document.body).getPropertyValue('--paper').trim(),font:getComputedStyle(document.body).fontFamily}));
  results.push({name,...geometry,violations:audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});
  await page.screenshot({path:`${output}/${name}-${width}.png`,fullPage:true});
 }
 await context.close();
}
await browser.close();
await writeFile(`${output}/rendered-audit.json`,JSON.stringify(results,null,2));
console.log(JSON.stringify(results));
if(results.some(r=>r.violations.length||r.scrollWidth>r.width+1))process.exitCode=1;
