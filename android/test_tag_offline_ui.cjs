// Tag screens at phone, desktop and portrait sizes, drawn by the real game from real TagCampaign views (2026-11-08):
// the shared opponent screen, the two-boss screen, the shared shop's lock-ins and the deck editor opened from the shop.
// Since 2026-11-20 also Tag's 5-pack shop row and Tag pages and a card window at UI Scale 75-200%.
// Start the web server first: PORT=4298 python -B tools/serve_qa.py ; then node android/test_tag_offline_ui.cjs [--web=...]
const {chromium}=require('../tools/require-module.cjs').requireModule('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const web=process.argv.find(a=>a.startsWith('--web='))?.slice(6)||'http://127.0.0.1:4298';
const sizes={phone:{width:924,height:416},desktop:{width:1280,height:720},portrait:{width:412,height:860}};
const fixtures=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'tag-ui-')),'views.json');
execFileSync(path.resolve('python/python.exe'),['tools/tag_ui_fixtures.py',fixtures],{stdio:'inherit'});
const views=JSON.parse(fs.readFileSync(fixtures,'utf8'));
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 const page=await browser.newPage({viewport:sizes.desktop});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('ygo-preload-visuals','sounds');HTMLMediaElement.prototype.play=function(){this.muted=true;return Promise.resolve()}});
 for(let attempt=0;;attempt++){await page.goto(web+'/?tagtest=1');try{await page.waitForFunction(()=>window.shadowTest,null,{timeout:90000});break}catch(error){if(attempt>=3)throw error}}
 await page.evaluate(()=>{document.querySelector('#modal')?.close();const b=document.createElement('button');b.dataset.do='tag';document.body.append(b);b.click();b.remove()});await page.waitForFunction(()=>window.tagTest?.ui);
 const show=(view,tab='opponents')=>page.evaluate(({view,tab})=>{const ui=tagTest.ui;localStorage.setItem('tag-starting-packs:TEST2:'+view.seat+':'+view.run.started_at,'1');ui.session={code:'TEST2',seat:view.seat,peer:{seat:view.seat},connected:true,request:async()=>{throw Error('Should not submit')},stats:()=>null};ui.tab=tab;ui.bossRevealKey=JSON.stringify([view.run.round,view.run.routes]);ui.localDraft=null;ui.draftKey=null;ui.update(structuredClone(view));const m=document.querySelector('#modal');if(m?.open)m.close();document.querySelectorAll('.encounter-cinematic').forEach(e=>e.remove())},{view,tab});
 const inside=async(selector,size)=>{for(const b of await page.locator(selector).evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})))assert(b.x>=-1&&b.x+b.w<=size.width+1,`${selector} leaves the screen sideways`)};
 const apart=async selector=>{const boxes=await page.locator(selector).evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]}));for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const [a,b]=[boxes[i],boxes[j]];assert(a[2]<=b[0]+1||b[2]<=a[0]+1||a[3]<=b[1]+1||b[3]<=a[1]+1,`${selector} ${i} and ${j} overlap`)}};
 const hidden=views.draft.run.routes.filter(i=>!(views.draft.run.revealed_opponents||[]).includes(i));
 // A new window size reaches --tag-visible-height through visualViewport's resize event, which can land after the resize.
 const settle=size=>page.waitForFunction(h=>Math.abs(parseFloat(tagTest.ui.root.style.getPropertyValue('--tag-visible-height'))*(parseFloat(document.documentElement.style.getPropertyValue('--ui-scale'))||1)-h)<=1,size.height);
 for(const [name,size] of Object.entries(sizes)){await page.setViewportSize(size);await settle(size);
  // One opponent list, the teammate's lock marked and closed, and no unrevealed name anywhere on the screen.
  await show(views.draft);const theirs=views.draft.opponents[1];
  assert(await page.locator(`[data-encounter="${theirs}"].teammate-pick .tag-pick.partner`).isVisible(),name+': teammate pick badge');
  assert(await page.locator(`[data-tag="lock-opponent"][data-id="${theirs}"]`).isDisabled(),name+': teammate pick closed');
  assert.equal(await page.locator('[data-tag="lock-opponent"]').count(),5);await apart('.tag-routes .tag-opponent');await inside('.tag-routes .tag-opponent',size);
  const names=await page.evaluate(ids=>ids.map(i=>tagTest.ui.content.characters[i].name),hidden);
  const shown=await page.evaluate(()=>{const p=document.querySelector('.tag-page');return p.innerText+' '+[...p.querySelectorAll('[aria-label],[title],[alt]')].map(e=>['aria-label','title','alt'].map(k=>e.getAttribute(k)||'').join(' ')).join(' ')});
  for(const n of names)assert(!shown.includes(n),name+': unrevealed opponent named: '+n);
  // Both bosses, side by side or stacked, never overlapping, each with its own reroll.
  await show(views['boss-guest']);assert.equal(await page.locator('.tag-routes .tag-opponent').count(),2);assert.equal(await page.locator('[data-tag="boss-reroll"]').count(),2);
  await apart('.tag-routes .tag-opponent');await apart('.tag-routes .tag-opponent>button');await inside('.tag-routes .tag-opponent',size);
  // Shop: the host's Buy waits for the guest, the guest sees the host ready, both carts carry their owner.
  await show(views['shop-host-waiting']);
  assert(await page.locator('.shop-buy.tag-locked').isVisible(),name+': waiting Buy');assert.equal(await page.locator('.shop-buy.tag-locked').getAttribute('aria-pressed'),'true');
  assert(await page.locator('.tag-shop-turn').isVisible());assert(await page.locator('.shop-product.teammate-pick .tag-cart-badge').count()>=1,name+': teammate cart badge');
  // Tag's larger shop (Nemu, 2026-11-20): the usual 10 singles and 3 relics, and 5 booster packs on one row under the
  // two 5-card shelves. Booster Shelf and a starter deck make 7 offers on that row.
  assert.equal(await page.locator('.shop-stock .shelf .shop-product').count(),10,name+': ten singles');assert.equal(await page.locator('.relics .shop-product').count(),3,name+': relic count unchanged');
  for(const extra of [0,2]){
   if(extra){const view=structuredClone(views['shop-host-waiting']),pack=view.run.shop.find(x=>x.kind==='pack');view.run.shop.push({...pack,id:'EN-LOB',opponent_pack:false},{kind:'deck',id:'SDK',name:'Starter Deck: Kaiba',art:'EN-SD1',cards:[],price:100,sold:false});await show(view)}
   assert.equal(await page.locator('.packs .shop-product').count(),5+extra,name+': Tag packs');await apart('.packs .shop-product');await inside('.packs .shop-product',size);
   const row=await page.locator('.packs .shop-product').evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return [r.top,r.width,r.bottom]}));
   assert(row.every(([top])=>Math.abs(top-row[0][0])<=1),name+': packs share one row');assert(row.every(([,w])=>w>=48),name+': packs wide enough to tap '+row.map(x=>Math.round(x[1])));
   if(size.width>size.height)assert(row.every(([,,bottom])=>bottom<=size.height+1),name+': packs on screen '+extra+' '+JSON.stringify(row));
  }
  await show(views['shop-host-waiting']);
  // Favourite packs (2026-11-10): every pack offer has a star outside its tap area; starring moves it first and counts it in the heading.
  {const packs=await page.locator('.packs .shop-product').evaluateAll(p=>p.filter(x=>x.querySelector('.shop-pack-fav')).length);assert(packs>=1,name+': pack star');const chosen=await page.locator('.shop-product.chosen').count(),last=page.locator('.packs .shop-pack-fav').last(),id=await last.getAttribute('data-pack');await last.click();await page.waitForFunction(id=>document.querySelector('.packs .shop-pack-fav')?.dataset.pack===id&&/Favourites in stock: 1/.test(document.querySelector('.fav-instock')?.textContent||''),id);assert.equal(await page.locator('.shop-product.chosen').count(),chosen,name+': starring never selects');await page.locator('.packs .shop-pack-fav').first().click();await page.waitForFunction(()=>!document.querySelector('.fav-instock'))}
  for(const selector of ['.shop-stock','.relics','.shop-buy','.shop-next','.shop-edit-deck','.tag-shop-turn'])await inside(selector,size);
  await show(views['shop-guest-partner-ready']);assert(await page.locator('.shop-buy.tag-partner-locked').isVisible(),name+': teammate ready on Buy');assert(await page.locator('.shop-next').isEnabled());
  // The deck editor over the shop leads back to it.
  await show(views['shop-host-waiting'],'deck');assert(await page.locator('[data-tag="card"]').count()>0);assert(await page.locator('.tag-back-shop').isVisible(),name+': Back to shop');
  await page.locator('.tag-back-shop').click();assert(await page.locator('.tag-shop').isVisible(),name+': back in the shop');
 }
 // UI Scale (magna98, 2026-11-20): Settings zooms the page, so tag-ui.js divides --tag-visible-height by --ui-scale, as
 // sizeModalViewport in mobile.js does for windows (the 'ygo-ui-scale' event updates it). Tag pages and a card window fit
 // the screen at 75-200%.
 const uiScale=s=>page.evaluate(async s=>{const {applyDisplayOptions}=await import('./display-options.js');applyDisplayOptions({uiScale:s})},s);
 const fits=async label=>{const r=await page.evaluate(()=>{const box=e=>e.getBoundingClientRect(),p=box(document.querySelector('.tag-page')),m=document.querySelector('#modal'),bottoms=[...document.querySelectorAll('.tag-page button')].filter(b=>b.offsetParent&&getComputedStyle(b).position==='fixed').map(b=>box(b).bottom);return {bottom:p.bottom,right:p.right,innerH:innerHeight,innerW:innerWidth,fixed:Math.max(0,...bottoms),modal:m?.open?box(m).bottom:null}});
  assert(r.bottom<=r.innerH+1,`${label}: Tag page ends on screen (${r.bottom} > ${r.innerH})`);assert(r.right<=r.innerW+1,`${label}: Tag page fits sideways`);assert(r.fixed<=r.innerH+1,`${label}: fixed shop buttons on screen`);
  if(r.modal!==null)assert(r.modal<=r.innerH+1,`${label}: window fits the screen (${r.modal} > ${r.innerH})`);return r};
 const card=views['shop-host-waiting'].run.shop.find(x=>x.kind==='single').id;
 for(const [name,size] of Object.entries(sizes))for(const scale of [75,125,150,200]){await page.setViewportSize(size);await uiScale(scale);await settle(size);const label=`${name} UI ${scale}%`;
  for(const [view,tab] of [[views['shop-host-waiting'],'opponents'],[views.draft,'opponents'],[views['boss-guest'],'opponents'],[views['shop-host-waiting'],'deck']]){await show(view,tab);await fits(label+' '+(view.run.stage||tab)+' '+tab)}
  await show(views['shop-host-waiting']);await page.evaluate(id=>tagTest.ui.inspect(id),card);await page.waitForFunction(()=>document.querySelector('#modal')?.open);await page.waitForTimeout(50);await fits(label+' card window');await page.evaluate(()=>document.querySelector('#modal').close());
  // The page height variable is the visible height in zoomed pixels: times the scale it is the window again.
  const h=await page.evaluate(()=>parseFloat(tagTest.ui.root.style.getPropertyValue('--tag-visible-height'))*parseFloat(document.documentElement.style.getPropertyValue('--ui-scale')||1));assert(Math.abs(h-size.height)<=1,`${label}: --tag-visible-height follows UI Scale (${h})`);
 }
 await uiScale(100);
 // Fixed decks keep their hidden deck and still reach opponent select.
 await page.setViewportSize(sizes.phone);
 for(const character of [37,38]){const view=structuredClone(views.draft);view.run.character=character;view.ready=[false,false];await show(view,'deck');assert.equal(await page.locator('[data-tag=card]').count(),0);
  // Copycat has no deck to show, so Tag keeps it on opponent select; the Dueling Engine shows its hidden deck.
  if(character===38){assert(await page.locator('.tag-hidden-deck').isVisible());await page.locator('[data-tag=opponents]').first().click()}
  assert(await page.locator('.tag-routes').isVisible())}
 await page.evaluate(()=>tagTest.ui.error(Error('Traceback (most recent call last):\nValueError: Your main deck needs 20 to 60 cards.')));assert.equal(await page.locator('.tag-status').innerText(),'Your main deck needs 20 to 60 cards.');
 assert.deepEqual(errors,[]);
 console.log('PASS Tag screens at phone, desktop and portrait: shared opponent list with hidden names kept hidden, two-boss layout, shop lock-in states and cart owners, 5 Tag packs on one row (7 offers too), pages and card window at UI Scale 75-200%, deck editor from the shop, fixed decks, concise errors');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
