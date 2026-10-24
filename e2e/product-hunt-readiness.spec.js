import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const nav=(page,name)=>page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name,exact:true});

test('browser privacy signals keep measurement off while saved permission remains revocable',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'doNotTrack',{value:'1',configurable:true}));
 const requests=[];page.on('request',r=>{if(r.url().endsWith('/api/usage'))requests.push(r.url());});
 await page.goto('/privacy');await page.getByRole('button',{name:'Allow anonymous usage counts',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('browser privacy signal keeps measurement off');
 await page.getByRole('button',{name:'Revoke saved usage permission',exact:true}).click();
 expect(await page.evaluate(()=>localStorage.getItem('tarazu-usage-measurement'))).toBe('no');
 await page.goto('/demo');await expect(nav(page,'Home')).toBeVisible();expect(requests).toEqual([]);
});

test('privacy is available before sign-in, and measurement is off until chosen and can be revoked',async({page})=>{
 const bodies=[];await page.route('**/api/usage',async route=>{bodies.push(route.request().postDataJSON());await route.fulfill({status:204});});
 await page.goto('/demo');await expect(nav(page,'Home')).toBeVisible({timeout:45000});expect(bodies).toEqual([]);
 await page.goto('/privacy');await expect(page.getByRole('button',{name:'Allow anonymous usage counts',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Allow anonymous usage counts',exact:true}).click();
 await page.goto('/demo');await expect.poll(()=>bodies).toContainEqual({event:'demo_opened',mode:'demo'});
 await page.getByRole('button',{name:'Start the decision walkthrough',exact:true}).click();
 await expect.poll(()=>bodies).toContainEqual({event:'walkthrough_started',mode:'demo'});
 await page.getByRole('button',{name:'Back to overview',exact:true}).click();await nav(page,'Validate').click();
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
 await page.emulateMedia({reducedMotion:'reduce'});
 const capture=Boolean(process.env.CAPTURE_LAUNCH_ASSETS);
 const writes=[];page.on('request',request=>{if(request.method()!=='GET'&&/\/api\/(?:workspaces|analyze|suggest-scores)/.test(request.url()))writes.push(request.url());});
 const align=async locator=>{const top=await locator.evaluate(element=>{element.scrollIntoView({block:'start',behavior:'instant'});for(let parent=element.parentElement;parent;parent=parent.parentElement){const gap=56-element.getBoundingClientRect().top;if(gap<=0)break;parent.scrollTop=Math.max(0,parent.scrollTop-gap);}const gap=56-element.getBoundingClientRect().top;if(gap>0)window.scrollBy({top:-gap,behavior:'instant'});return element.getBoundingClientRect().top;});expect(top).toBeGreaterThanOrEqual(48);};
 const dir=capture?path.join(process.cwd(),'public/launch'):testInfo.outputPath('gallery');await fs.mkdir(dir,{recursive:true});
 const shot=async name=>{await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(dir,name+'.png'),animations:'disabled'});};
 let sourceHealth;
 if(capture){const health=await page.request.get('/api/health');sourceHealth=await health.json();const local=['localhost','127.0.0.1','[::1]'].includes(new URL(testInfo.project.use.baseURL).hostname);if(!local){expect(health.ok()).toBe(true);expect(sourceHealth.status).toBe('ok');}else expect(sourceHealth.release).toMatch(/^[a-f0-9]{40}$/);}
 await page.goto('/');await expect(page.getByRole('heading',{level:1})).toContainText('Make a decision');await shot('01-home');
 await page.goto('/demo');await expect(page.getByRole('button',{name:'Start the decision walkthrough',exact:true})).toBeVisible({timeout:45000});
 await page.getByRole('button',{name:'Start the decision walkthrough',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Problem',exact:true})).toBeVisible();await shot('video-story-problem');
 for(const [heading,file] of [['Evidence','evidence'],['Decision','decision'],['Next test','next-test']]){
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();await shot(`video-story-${file}`);
 }
 await nav(page,'Priorities').click();await expect(page.getByRole('region',{name:'Guest demo',exact:true})).toBeVisible();await expect(page.getByText('Request readiness checklist — synthetic',{exact:true}).first()).toBeVisible();await shot('02-priorities');
 await nav(page,'Signals').click();await expect(page.getByText('SYNTHETIC • Round B: four of five cases were incomplete',{exact:true}).first()).toBeVisible();await shot('03-signals');
 await nav(page,'Validate').click();await page.getByRole('button',{name:'Continue latest saved brief',exact:true}).click();await expect(page.getByText('Revision 5 · Saved',{exact:true})).toBeVisible();await shot('04-brief');
 await nav(page,'Decisions').click();await page.getByRole('button',{name:'Decision: SYNTHETIC • Round B: test readiness before building reminders',exact:true}).click();
 const record=page.getByRole('region',{name:'Decision: SYNTHETIC • Round B: test readiness before building reminders',exact:true});
 const toggle=page.getByRole('button',{name:'Decision: SYNTHETIC • Round B: test readiness before building reminders',exact:true});
 await expect(record.getByText(/Source brief:.*Revision 5\./)).toBeVisible();await align(toggle);await shot('05-decisions');
 const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('prioritize-ws-relay-demo-v1-decisions'))[1]);
 const digest=record.getByRole('region',{name:'Evidence',exact:true});
 await expect(digest.getByRole('heading',{name:'Supports',exact:false})).toBeVisible();await expect(digest.getByRole('heading',{name:'Challenges',exact:false})).toBeVisible();await expect(digest.getByRole('heading',{name:'Unknowns',exact:true})).toBeVisible();
 await align(digest);await shot('06-evidence-digest');
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);
 await record.getByRole('button',{name:'Copy decision brief',exact:true}).click();
 await expect(record.getByText('Decision brief copied. Review it before sharing.',{exact:true})).toBeVisible();
 const copied=await page.evaluate(()=>navigator.clipboard.readText());expect(copied).toContain('SYNTHETIC');expect(copied).toContain('revision 5');
 await fs.writeFile(path.join(dir,'decision-brief.md'),copied);await align(toggle);await shot('07-copyable-brief');
 await record.getByRole('button',{name:'Review decision',exact:true}).click();
 await record.getByLabel(/What happened/).fill('Fictional example: not tested yet.');
 await record.getByRole('radio',{name:'Revise',exact:true}).check();
 await record.getByLabel('Revised direction and next action',{exact:true}).fill('Try a smaller paper checklist before committing engineering.');
 await record.getByText('Add new evidence (optional)',{exact:true}).click();
 await record.getByLabel(/What did you learn/).fill('No new results. The attached case review is part of the fictional example.');
 await record.getByRole('checkbox').first().check();
 await record.getByText('Add new evidence (optional)',{exact:true}).click();
 await align(record.getByRole('heading',{name:'Revisit this decision',exact:true}));await shot('08-decision-review');
 await record.getByRole('button',{name:'Save review',exact:true}).click();await expect(record.getByText('Review saved. The original decision and its evidence are preserved.',{exact:true})).toBeVisible();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('prioritize-ws-relay-demo-v1-decisions'))[1]);
 const {reviews,...unchanged}=stored;expect(unchanged).toEqual(original);expect(reviews).toHaveLength(1);expect(reviews[0].evidence_snapshots).toHaveLength(1);
 await record.getByText('Review history (1)',{exact:true}).click();await align(record.getByRole('heading',{name:'Revisit this decision',exact:true}));await shot('09-review-history');
 await record.getByRole('button',{name:'Copy decision brief',exact:true}).click();await expect(record.getByText('Decision brief copied. Review it before sharing.',{exact:true})).toBeVisible();
 const reviewedCopy=await page.evaluate(()=>navigator.clipboard.readText());expect(reviewedCopy).toContain('## Dated reviews');await fs.writeFile(path.join(dir,'decision-brief.md'),reviewedCopy);
 await page.setViewportSize({width:390,height:844});await align(record.getByRole('heading',{name:'Revisit this decision',exact:true}));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await shot('10-mobile-review');
 expect(writes).toEqual([]);
 if(capture){
  const end=await(await page.request.get('/api/health')).json();expect(end.release).toBe(sourceHealth.release);
  await fs.writeFile(path.join(dir,'capture.json'),JSON.stringify({origin:new URL(page.url()).origin,release:sourceHealth.release,capturedAt:new Date().toISOString(),scenario:'Fictional Relay example; synthetic review exercise; no customer results',storage:'Isolated guest browser',aiUsed:false},null,2)+'\n');
  const manifest=JSON.parse(await fs.readFile('docs/launch/walkthrough.json','utf8'));
  const art=await page.context().newPage();await art.setViewportSize({width:1920,height:1080});
  const escape=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  for(let i=0;i<manifest.chapters.length;i++){
   const {image:file,title,captions}=manifest.chapters[i];const image=(await fs.readFile(path.join(dir,file+'.png'))).toString('base64');
   await art.setContent(`<html><body style="margin:0;background:#0e0f12;color:#eceae4;font-family:Arial,sans-serif"><div style="height:1080px;position:relative;box-sizing:border-box;padding:24px 60px"><div style="color:#e2ac4d;font-size:18px;letter-spacing:3px">TARAZU · FICTIONAL RELAY EXAMPLE · ${i+1}/${manifest.chapters.length}</div><h1 style="font-size:38px;margin:10px 0 0">${escape(title)}</h1><img src="data:image/png;base64,${image}" style="position:absolute;top:125px;left:320px;width:1280px;height:854px;object-fit:contain;border:1px solid #303237;border-radius:10px"/><div style="position:absolute;bottom:18px;left:60px;right:60px;font-size:23px;line-height:1.4;color:#eceae4">${captions.map(escape).join('<br>')}</div></div></body></html>`);
   await art.screenshot({path:path.join(dir,`video-${i+1}.png`)});
  }
  await art.setViewportSize({width:240,height:240});
  await art.setContent('<html><body style="margin:0;background:#0e0f12;display:grid;place-items:center;height:240px"><svg width="180" height="180" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#e2ac4d"/><path d="M50 18v64M34 82h32M18 31h64M18 31 8 51h20L18 31M82 31 72 51h20L82 31" fill="none" stroke="#0e0f12" stroke-width="4" stroke-linejoin="round"/><circle cx="50" cy="31" r="4" fill="#0e0f12"/></svg></body></html>');
  await art.screenshot({path:path.join(dir,'thumbnail.png')});await art.close();
 }
});
