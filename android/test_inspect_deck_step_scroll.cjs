// Card window in the deck editor (Discord, magna98, 2026-11-20, Chrome on a wide, short PC window): with the −/+ step under
// the art, long card text must scroll inside the window and the art must stay visible. Also the shop's card window (Marsh,
// Pixel 9 landscape: "can't scroll the description in the shop"), which has no step.
// Real markup: the window's structure as mobile.js draws it (tabs, art, step, details, hidden Related/Where to Find panels,
// card-nav footer), the game's own mobile.css, Text Size through display-options.js, and a real card scan, all served from
// android/web. Run from the project root: runtime/ai/node.exe android/test_inspect_deck_step_scroll.cjs
const {chromium}=require('../tools/require-module.cjs').requireModule('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
process.env.TEMP=process.env.TMP=path.resolve('temp');
const WEB=path.resolve('android/web'),ORIGIN='http://harness.test';
const content=JSON.parse(fs.readFileSync(path.join(WEB,'content.json'),'utf8'));
const longCard=content.cards.filter(c=>c.id<100000000&&fs.existsSync(path.join(WEB,'assets/cards',c.id+'.jpg'))).sort((a,b)=>b.desc.length-a.desc.length)[0];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const facts=['Card type','Attribute','Level','Monster Type','ATK','DEF'].map(k=>`<div><small>${k}</small><b>Value</b></div>`).join('');
const windowMarkup=(step,repeat)=>`<div class="modal-head"><h2>${esc(longCard.name)}</h2><button class="">Close</button></div>
<nav class="inspection-tabs" role="tablist"><button role="tab" aria-selected="true" aria-controls="collection-details-panel">Card Details</button><button role="tab" aria-selected="false" aria-controls="related-cards-panel">Related Cards<span class="related-tab-count">2</span></button>${step?'<button role="tab" aria-selected="false" aria-controls="collection-sources-panel">Where to Find</button>':''}</nav>
<div class="inspect${step?' has-deck-step':''}" id="collection-details-panel" role="tabpanel"><img class="card-art-zoom" role="button" src="assets/cards/${longCard.id}.jpg">${step?`<span class="inspect-step inspect-deck-actions" data-inspect-deck="${longCard.id}" data-pool-index="0"><span class="inspect-step-row"><button type="button">−</button><b>0/1</b><button type="button">+</button></span><button class="inspect-mark "><i>☆</i></button></span>`:''}<div><h3 class="inspect-card-name">${esc(longCard.name)}</h3><div class="inspect-facts">${facts}</div><p class="copy-count" hidden></p><h4>Effect / card text</h4><p class="inspect-effect">${esc(longCard.desc.repeat(repeat))}</p></div></div>
<section class="collection-card-sources related-cards-panel" hidden id="related-cards-panel" role="tabpanel"></section>${step?'<section class="collection-card-sources" hidden id="collection-sources-panel" role="tabpanel"></section>':''}
<nav class="card-nav"><button class="card-nav-prev"><span>‹</span><span>Previous</span></button><span class="card-nav-count">24 / 37</span><button class="card-nav-next"><span>Next</span><span>›</span></button></nav>`;
const page=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="mobile.css"></head><body><main id="app"></main><dialog id="modal"></dialog></body></html>`;
// [width, height, Text Size, UI Scale]. UI Scale zooms the page; sizeModalViewport (mobile.js) divides the window by it.
const cases=[[1867,851,130],[1867,851,150],[1867,600,150],[1280,720,100],[1280,720,140],[915,412,100],[915,412,130],[412,860,100],[412,860,130],[1867,851,140,150],[1867,851,100,125],[1280,720,100,200],[1280,720,100,75]];
const mobile=fs.readFileSync(path.join(WEB,'mobile.js'),'utf8');
assert.match(mobile,/function sizeModalViewport\(\)\{const v=window\.visualViewport,z=parseFloat\(document\.documentElement\.style\.getPropertyValue\('--ui-scale'\)\)\|\|1,px=n=>`\$\{n\/z\}px`/,'window sizes divided by UI Scale');
assert.match(mobile,/addEventListener\('ygo-ui-scale',sizeModalViewport\)/);
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});const results=[];try{
 const ctx=await browser.newContext();
 await ctx.route(ORIGIN+'/**',route=>{const p=new URL(route.request().url()).pathname.slice(1);if(p==='harness.html')return route.fulfill({contentType:'text/html',body:page});const f=path.join(WEB,p);if(!f.startsWith(WEB)||!fs.existsSync(f))return route.fulfill({status:404,body:''});route.fulfill({path:f,contentType:p.endsWith('.css')?'text/css':p.endsWith('.js')?'text/javascript':undefined})});
 const tab=await ctx.newPage();const errors=[];tab.on('pageerror',e=>errors.push(e.message));
 await tab.goto(ORIGIN+'/harness.html');
 for(const [w,h,textSize,uiScale=100] of cases)for(const step of [true,false])for(const repeat of [1,3]){
  await tab.setViewportSize({width:w,height:h});
  const r=await tab.evaluate(async({w,h,textSize,uiScale,html})=>{
   const {applyDisplayOptions}=await import('./display-options.js');applyDisplayOptions({textSize,uiScale});const z=uiScale/100;
   const m=document.querySelector('#modal');if(m.open)m.close();m.className='card-inspect-modal';m.innerHTML=html;
   for(const [k,v] of [['--modal-viewport-height',h/z+'px'],['--modal-viewport-width',w/z+'px'],['--modal-top','0px'],['--modal-left','0px']])m.style.setProperty(k,v);
   m.showModal();const img=m.querySelector('.inspect>img');if(!img.complete)await new Promise(ok=>{img.onload=img.onerror=ok});
   await new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok)));
   const box=e=>e.getBoundingClientRect(),d=m.querySelector('.inspect>div'),nav=box(m.querySelector('.card-nav')),i=box(img),head=box(m.querySelector('.inspection-tabs')),step=m.querySelector('.inspect-step');
   const overflow=d.scrollHeight>d.clientHeight+2;d.scrollTop=40;
   return {navTop:nav.top,modalBottom:box(m).bottom,innerH:innerHeight,detTop:box(d).top,detBottom:box(d).bottom,overflow,scrolled:d.scrollTop,overflowY:getComputedStyle(d).overflowY,imgTop:i.top,imgH:i.height,tabsBottom:head.bottom,stepBottom:step?box(step).bottom:null,natural:img.naturalHeight};
  },{w,h,textSize,uiScale,html:windowMarkup(step,repeat)});
  const name=`${w}x${h} text ${textSize}% UI ${uiScale}% ${step?'deck editor':'shop'} text x${repeat}`;
  assert(r.natural>0,`${name}: card scan loaded`);
  assert(r.modalBottom<=r.innerH+1,`${name}: window fits the screen (${r.modalBottom} > ${r.innerH})`);
  assert(r.detBottom<=r.navTop+1,`${name}: card text ends above the Previous/Next row (${r.detBottom} > ${r.navTop})`);
  assert(r.detTop>=r.tabsBottom-1,`${name}: card text starts under the tabs`);
  if(r.overflow)assert(r.overflowY==='auto'&&r.scrolled>0,`${name}: long text scrolls inside the window`);
  assert(repeat===1||r.overflow,`${name}: triple text overflows (so the scroll check ran)`);
  assert(r.imgH>40*Math.min(1,uiScale/100)&&r.imgTop>=r.tabsBottom-1&&r.imgTop+40<r.navTop,`${name}: card art visible (${Math.round(r.imgH)}px at ${Math.round(r.imgTop)})`);
  if(step)assert(r.stepBottom<=r.navTop+1,`${name}: −/+ step inside the window (${r.stepBottom} > ${r.navTop})`);
  results.push(`${name}: art ${Math.round(r.imgH)}px, text ${Math.round(r.detBottom-r.detTop)}px${r.overflow?' scrolls':''}`);
 }
 assert.deepEqual(errors,[],'no page errors');
 console.log(results.join('\n'));
 console.log(`PASS card window (${longCard.name}): text scrolls, art and step show, deck editor and shop, ${cases.length} sizes`);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
