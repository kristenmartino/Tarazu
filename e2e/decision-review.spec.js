import { test, expect } from '@playwright/test';
const prefix='prioritize-ws-relay-demo-v1';
const nav=(page,name)=>page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name,exact:true});
const decisionTitle='SYNTHETIC • Round B: test readiness before building reminders';
const openDecision=async page=>{await nav(page,'Decisions').click();await page.getByRole('button',{name:'Decision: '+decisionTitle,exact:true}).click();};

test('a guest can copy the decision, preserve a dated review, and reopen it without rewriting its evidence',async({page},testInfo)=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new Error('Clipboard intentionally denied');}},configurable:true});});
 await page.goto('/demo');await expect(nav(page,'Home')).toBeVisible({timeout:45000});
 const original=await page.evaluate(p=>JSON.parse(localStorage.getItem(p+'-decisions'))[1],prefix);
 await openDecision(page);
 const record=page.getByRole('region',{name:'Decision: '+decisionTitle,exact:true});
 await expect(record.getByRole('heading',{name:'Supports',exact:false})).toBeVisible();
 await expect(record.getByRole('heading',{name:'Challenges',exact:false})).toBeVisible();
 await expect(record.getByRole('heading',{name:'Unknowns',exact:true})).toBeVisible();
 await record.getByRole('button',{name:'Copy decision brief',exact:true}).click();
 const copy=record.getByLabel('Decision brief to copy');await expect(copy).toBeFocused();await expect(copy).toHaveValue(/SYNTHETIC/);await expect(copy).toHaveValue(/revision 5/);
 await record.getByRole('button',{name:'Close copy text',exact:true}).click();
 await record.getByRole('button',{name:'Review decision',exact:true}).click();
 await expect(record.getByLabel(/What happened/)).toBeFocused();
 await record.getByLabel(/What happened/).fill('SYNTHETIC visitor exercise: the outcome remains unknown.');
 await record.getByRole('radio',{name:'Revise',exact:true}).check();
 await record.getByLabel('Revised direction and next action',{exact:true}).fill('SYNTHETIC proposal: test a narrower checklist before engineering.');
 await record.getByText('Add new evidence (optional)',{exact:true}).click();
 await record.getByLabel(/What did you learn/).fill('SYNTHETIC review, not real customer research.');
 await record.getByRole('checkbox').first().check();
 await record.getByRole('button',{name:'Save review',exact:true}).click();
 await expect(record.getByText('Review saved. The original decision and its evidence are preserved.',{exact:true})).toBeVisible();
 await expect(record.getByRole('button',{name:'Review decision',exact:true})).toBeFocused();
 const saved=await page.evaluate(p=>JSON.parse(localStorage.getItem(p+'-decisions'))[1],prefix);
 const {reviews,...unchanged}=saved;expect(unchanged).toEqual(original);expect(reviews).toHaveLength(1);expect(reviews[0].action).toBe('revise');expect(reviews[0].evidence_snapshots).toHaveLength(1);expect(reviews[0].decision_snapshot).toEqual(original);
 await page.reload();await openDecision(page);await expect(record.getByText('Latest review · Revise',{exact:true})).toBeVisible();
 await record.getByText('Review history (1)',{exact:true}).click();await expect(record.getByText('SYNTHETIC review, not real customer research.',{exact:true})).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('decision-review-desktop.png')});
});

test('the review remains keyboard usable at 320px and its due reminder clears after retirement',async({page},testInfo)=>{
 await page.setViewportSize({width:320,height:780});await page.goto('/demo');await expect(nav(page,'Home')).toBeVisible({timeout:45000});
 await page.evaluate(p=>{const d=JSON.parse(localStorage.getItem(p+'-decisions'));d[1].review_date='2020-01-01T00:00:00.000Z';localStorage.setItem(p+'-decisions',JSON.stringify(d));},prefix);
 await page.reload();const due=page.getByRole('region',{name:'Decisions due for review'});await expect(due).toBeVisible();
 await due.getByRole('button',{name:new RegExp(decisionTitle)}).focus();await page.keyboard.press('Enter');
 const record=page.getByRole('region',{name:'Decision: '+decisionTitle,exact:true});await expect(record).toBeVisible();await record.getByRole('button',{name:'Review decision',exact:true}).focus();await page.keyboard.press('Enter');
 await expect(record.getByLabel(/What happened/)).toBeFocused();await record.getByLabel(/What happened/).fill('SYNTHETIC: no observed outcome.');await record.getByRole('radio',{name:'Retire',exact:true}).check();await record.getByLabel('Reason and next action',{exact:true}).fill('SYNTHETIC: stop pursuing this exercise.');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:testInfo.outputPath('decision-review-mobile.png')});
 await record.getByRole('button',{name:'Save review',exact:true}).focus();await page.keyboard.press('Enter');await expect(record.getByText('Latest review · Retire',{exact:true})).toBeVisible();
 await nav(page,'Home').click();await expect(page.getByRole('region',{name:'Decisions due for review'})).toBeHidden();
});
