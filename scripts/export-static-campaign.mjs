import {chromium} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const root=path.resolve('design/marketing/static-2026');const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));const browser=await chromium.launch();const page=await browser.newPage();
for(const a of manifest.assets){await page.setViewportSize({width:a.width,height:a.height});await page.goto(pathToFileURL(path.join(root,a.source)).href);await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});await page.screenshot({path:path.join(root,a.export),omitBackground:a.layout==='name'});console.log(a.id);}
await browser.close();
