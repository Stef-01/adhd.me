import {test,expect} from './support/test';
const worlds=[['nina-the-first-line','.nw-game'],['jax-just-the-list','.jw-game'],['arjun-hold-the-thread','.aw-game'],['maya-one-thing-at-a-time','.mw-game'],['zoe-before-you-send','.zw-game']] as const;
for(const [slug,selector] of worlds)test(`${slug}: pause instructions fit and resume without a setup screen`,async({page})=>{
 await page.setViewportSize({width:320,height:568});await page.goto('/lives/play/'+slug);
 await page.getByRole('button',{name:'Pause game'}).click();await expect(page.locator(selector)).toHaveAttribute('data-paused','true');
 await page.getByText('How to play',{exact:true}).click();await expect(page.locator('.kit-help li')).toHaveCount(3);
 await page.getByRole('button',{name:'Play at my pace'}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();
 await expect(page.locator(selector)).toHaveAttribute('data-paused','false');await expect(page.locator(selector)).toHaveAttribute('data-still','true');
 const exit=page.getByRole('link',{name:'Back to games'});await expect(exit).toBeInViewport();await exit.click();await expect(page).toHaveURL(/approach\?pane=games/);
});
