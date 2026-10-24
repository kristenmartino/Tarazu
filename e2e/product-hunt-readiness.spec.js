import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const nav=(page,name)=>page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name,exact:true});

test('privacy is available before sign-in, and measurement is off until chosen and can be revoked',async({page})=>{
 const bodies=[];await page.route('**/api/usage',async route=>{bodies.push(route.request().postDataJSON());await route.fulfill({status:204});});
 await page.goto('/demo');await expect(nav(page,'Home')).toBeVisible({timeout:45000});expect(bodies).toEqual([]);
 await page.goto('/privacy');await expect(page.getByRole('button',{name:'Allow anonymous usage counts',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Allow anonymous usage counts',exact:true}).click();
 await page.goto('/demo');await expect.poll(()=>bodies).toContainEqual({event:'demo_opened',mode:'demo'});
 await page.getByRole('button',{name:'Start the decision walkthrough',exact:true}).click();
 await expect.poll(()=>bodies).toContainEqual({event:'walkthrough_started',mode:'demo'});
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await nav(page,'Validate').click();
 await page.getByRole('button',{name:'Continue latest saved brief',exact:true}).click();
 await expect.poll(()=>bodies).toContainEqual({event:'brief_reopened',mode:'demo'});
 await page.getByLabel('NEXT VALIDATION ACTIONS',{exact:true}).fill('Fictional measurement verification action');
 await page.getByRole('button',{name:'Save brief',exact:true}).click();await expect.poll(()=>bodies).toContainEqual({event:'brief_saved',mode:'demo'});
 for(const b of bodies)expect(Object.keys(b).sort()).toEqual(['event','mode']);
 await page.goto('/privacy');await page.getByRole('button',{name:'Turn usage measurement off',exact:true}).click();
 const n=bodies.length;await page.goto('/demo');await expect(nav(page,'Home')).toBeVisible();expect(bodies).toHaveLength(n);
 await page.goto('/privacy');await page.setViewportSize({width:320,height:780});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('launch gallery follows the actual fictional evidence-to-decision flow',async({page},testInfo)=>{
 await page.setViewportSize({width:1440,height:960});
 const dir=process.env.CAPTURE_LAUNCH_ASSETS?path.join(process.cwd(),'public/launch'):testInfo.outputPath('gallery');await fs.mkdir(dir,{recursive:true});
 const shot=async name=>{await page.screenshot({path:path.join(dir,name+'.png'),animations:'disabled'});};
 await page.goto('/demo');await expect(page.getByRole('button',{name:'Start the decision walkthrough',exact:true})).toBeVisible({timeout:45000});
 await shot('01-home');
 await nav(page,'Priorities').click();await expect(page.getByText('Request readiness checklist — synthetic',{exact:true}).first()).toBeVisible();await shot('02-priorities');
 await nav(page,'Signals').click();await expect(page.getByText('SYNTHETIC • Round B: four of five cases were incomplete',{exact:true}).first()).toBeVisible();await shot('03-signals');
 await nav(page,'Validate').click();await page.getByRole('button',{name:'Continue latest saved brief',exact:true}).click();await expect(page.getByText('Revision 5 · Saved',{exact:true})).toBeVisible();await shot('04-brief');
 await nav(page,'Decisions').click();await page.getByRole('button',{name:'Decision: SYNTHETIC • Round B: test readiness before building reminders',exact:true}).click();await expect(page.getByText(/Source brief:.*Revision 5\./)).toBeVisible();await shot('05-decisions');
 if(process.env.CAPTURE_LAUNCH_ASSETS){
  const art=await page.context().newPage();await art.setViewportSize({width:1920,height:1080});
  const chapters=[['01-home','A decision you can revisit','Start with a fictional team’s next test-or-build decision.'],['02-priorities','Compare the next learning step','Shared 1–100 bands and recorded assumptions explain the ranking.'],['03-signals','Inspect the evidence that challenges it','Supporting and conflicting sources stay visible.'],['04-brief','Return to the saved investigation','Revision 5 keeps the open questions and proposed next test.'],['05-decisions','Keep the reasoning behind the choice','A decision draft preserves the brief revision it came from.']];
  for(let i=0;i<chapters.length;i++){
   const [file,title,caption]=chapters[i];const image=(await fs.readFile(path.join(dir,file+'.png'))).toString('base64');
   await art.setContent(`<html><body style="margin:0;background:#0e0f12;color:#eceae4;font-family:Arial,sans-serif"><div style="height:1080px;position:relative;box-sizing:border-box;padding:24px 60px"><div style="color:#e2ac4d;font-size:20px;letter-spacing:3px">TARAZU · FICTIONAL RELAY DEMO · ${i+1}/5</div><h1 style="font-size:42px;margin:10px 0 0">${title}</h1><img src="data:image/png;base64,${image}" style="position:absolute;top:128px;left:280px;width:1360px;height:907px;object-fit:contain;border:1px solid #303237;border-radius:12px"/><div style="position:absolute;bottom:12px;left:60px;font-size:22px;color:#b8b9bd">${caption} · tarazu.app/demo</div></div></body></html>`);
   await art.screenshot({path:path.join(dir,`video-${i+1}.png`)});
  }
  await art.setViewportSize({width:240,height:240});
  await art.setContent('<html><body style="margin:0;background:#0e0f12;display:grid;place-items:center;height:240px"><svg width="180" height="180" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#e2ac4d"/><path d="M50 18v64M34 82h32M18 31h64M18 31 8 51h20L18 31M82 31 72 51h20L82 31" fill="none" stroke="#0e0f12" stroke-width="4" stroke-linejoin="round"/><circle cx="50" cy="31" r="4" fill="#0e0f12"/></svg></body></html>');
  await art.screenshot({path:path.join(dir,'thumbnail.png')});await art.close();
 }
});
