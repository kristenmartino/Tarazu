// Frame the verified app captures for Product Hunt. Never crop source labels.
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
const root=path.resolve(import.meta.dirname,'..');
const publicDir=path.join(root,'public/launch');
const gallery=JSON.parse(await fs.readFile(path.join(root,'docs/launch/product-hunt-gallery.json'),'utf8'));
const escape=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:gallery.width,height:gallery.height},deviceScaleFactor:1});
  for(const item of gallery.images){
    const source=await fs.readFile(path.join(publicDir,item.source));
    await page.setContent(`<html><head><style>*{box-sizing:border-box}body{margin:0;background:#0e0f12;color:#eceae4;font-family:Arial,sans-serif}.eyebrow{position:absolute;top:20px;left:32px;color:#e2ac4d;font-size:13px;letter-spacing:2px}h1{position:absolute;left:32px;right:32px;top:42px;margin:0;font-size:30px;line-height:38px}figure{position:absolute;margin:0;left:32px;right:32px;top:96px;height:610px;display:flex;justify-content:center;align-items:center;background:#101114;border:1px solid #303237;border-radius:8px;overflow:hidden}img{display:block;width:100%;height:100%;object-fit:contain}.caption{position:absolute;left:32px;right:32px;top:724px;font-size:16px;line-height:20px;margin:0}</style></head><body><div class="eyebrow">TARAZU · FICTIONAL RELAY EXAMPLE</div><h1>${escape(item.title)}</h1><figure><img src="data:image/png;base64,${source.toString('base64')}" alt="${escape(item.source)}"/></figure><p class="caption">${escape(item.caption)}</p></body></html>`);
    await page.evaluate(()=>document.fonts.ready);
    for(const selector of ['h1','.caption']){
      const fits=await page.locator(selector).evaluate(el=>el.scrollWidth<=el.clientWidth&&el.getBoundingClientRect().bottom<=760);
      if(!fits)throw Error(`Text does not fit: ${item.file} ${selector}`);
    }
    await page.screenshot({path:path.join(publicDir,item.file)});
  }
  console.log(`Rendered ${gallery.images.length} uncropped Product Hunt gallery images at ${gallery.width}x${gallery.height}.`);
} finally { await browser.close(); }
