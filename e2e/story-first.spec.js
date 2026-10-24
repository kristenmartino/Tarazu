import {test,expect} from '@playwright/test';
const nav=(page,name)=>page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name,exact:true});
const demoSnapshot=page=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>/^prioritize-ws-relay-demo-v1(?:$|-briefs$|-decisions$|-signals$)/.test(k)).sort().map(k=>[k,localStorage.getItem(k)])));

test('the primary walkthrough tells a short read-only story before offering deeper work',async({page},testInfo)=>{
 await page.goto('/demo');await expect(nav(page,'Home')).toBeVisible({timeout:45000});
 const before=await demoSnapshot(page);
 await page.getByRole('button',{name:'Start the decision walkthrough',exact:true}).click();
 await expect(page.getByRole('region',{name:'Guest demo',exact:true})).toBeHidden();
 await expect(page.getByRole('complementary',{name:'Detail panel',exact:true})).toBeHidden();
 for(const heading of ['Problem','Evidence','Decision','Next test']){
  await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();
  await expect(page.getByRole('textbox',{name:'Candidate name',exact:true})).toHaveCount(0);
  if(heading!=='Next test')await page.getByRole('button',{name:'Next',exact:true}).click();
 }
 await page.getByRole('button',{name:'Back',exact:true}).click();await expect(page.getByRole('heading',{name:'Decision',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Next',exact:true}).click();
 expect(await demoSnapshot(page)).toEqual(before);
 await page.screenshot({path:testInfo.outputPath('story-desktop.png')});
 await page.getByRole('button',{name:'Open the saved decision',exact:true}).click();
 const record=page.getByRole('region',{name:'Decision: SYNTHETIC • Round B: test readiness before building reminders',exact:true});
 await expect(record).toBeVisible();
 await expect(page.getByRole('button',{name:'Decision: SYNTHETIC • Round B: test readiness before building reminders',exact:true})).toBeFocused();
 for(const heading of ['Problem','Evidence','Decision','Next test'])await expect(record.getByRole('heading',{name:heading,exact:true})).toBeVisible();
 await expect(record.getByText(/Source brief:.*Revision 5\./)).toBeVisible();
 await expect(record.getByText(/Fictional case-review exercise B/).first()).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('decision-desktop.png')});
 expect(await demoSnapshot(page)).toEqual(before);
});

test('the story remains keyboard-accessible and readable at 320px',async({page},testInfo)=>{
 await page.setViewportSize({width:320,height:780});await page.goto('/demo');
 const start=page.getByRole('button',{name:'Start the decision walkthrough',exact:true});await start.focus({timeout:45000});await page.keyboard.press('Enter');
 for(const heading of ['Problem','Evidence','Decision','Next test']){
  const target=page.getByRole('heading',{name:heading,exact:true});await expect(target).toBeVisible();
  await expect(target).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(heading!=='Next test'){await page.getByRole('button',{name:'Next',exact:true}).focus();await page.keyboard.press('Enter');}
 }
 await page.screenshot({path:testInfo.outputPath('story-mobile.png')});
 await page.getByRole('button',{name:'Open the saved decision',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Next test',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:testInfo.outputPath('decision-mobile.png')});
});

test('the quick story keeps its next action above the mobile navigation at 390px',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/demo');
 await page.getByRole('button',{name:'Start the decision walkthrough',exact:true}).click({timeout:45000});
 await expect(page.getByRole('region',{name:'Guest demo',exact:true})).toBeHidden();
 for(let step=0;step<4;step++){
  const action=page.getByRole('button',{name:step===3?'Open the saved decision':'Next',exact:true});
  const box=await action.boundingBox();const navigation=await page.getByRole('navigation',{name:'Main navigation'}).boundingBox();
  expect(box.y+box.height).toBeLessThanOrEqual(navigation.y);
  if(step<3)await action.click();
 }
 await page.getByRole('button',{name:'Back to overview',exact:true}).click();
 await expect(page.getByRole('region',{name:'Guest demo',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Start the decision walkthrough',exact:true})).toBeFocused();
});
