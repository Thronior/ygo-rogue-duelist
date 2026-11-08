// Tag's shared flow with two real Chrome clients of the real game over a local rooms Worker (2026-11-08): one opponent
// screen with swords lock-in, the shared shop (carts, Buy, Reroll, Next duel lock-ins), the deck editor from both screens,
// and the boss screen with both bosses spinning and one rerolled.
// Start the services first (state stays outside the repo):
//   runtime/ai/node.exe multiplayer/cloudflare/node_modules/wrangler/bin/wrangler.js dev --local --port 8798 --persist-to <scratch>   (from multiplayer/cloudflare)
//   PORT=4298 python -B tools/serve_qa.py
//   node android/test_tag_flow_browser.cjs [--endpoint=http://127.0.0.1:8798] [--web=http://127.0.0.1:4298] [--shots=<folder>]
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require('../tools/require-module.cjs').requireModule('playwright');
const arg=(name,fallback)=>process.argv.find(a=>a.startsWith(`--${name}=`))?.split('=')[1]??fallback;
const endpoint=arg('endpoint','http://127.0.0.1:8798'),web=arg('web','http://127.0.0.1:4298'),shots=arg('shots','');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(check,ms,label){const end=Date.now()+ms;let last;while(Date.now()<end){last=await check();if(last)return last;await wait(150)}assert.fail('Timed out: '+label)}
async function open(browser){
 const context=await browser.newContext({viewport:{width:1280,height:720},bypassCSP:true}),page=await context.newPage();page.errors=[];
 page.on('pageerror',e=>{page.errors.push(e.message);console.log('PAGE ERROR',e.message)});
 await page.addInitScript(()=>{localStorage.setItem('ygo-preload-visuals','sounds');HTMLMediaElement.prototype.play=function(){this.muted=true;return Promise.resolve()}});
 await page.route('**/multiplayer-config.json',r=>r.fulfill({json:{signalingUrl:endpoint}}));
 await page.route('**/card-assets.js',r=>r.fulfill({contentType:'text/javascript',body:'export const cardImages=new Map();export async function preloadCards(){}'}));
 // A boot can stall while another tool rewrites game files in this folder; a reload gets past it.
 for(let attempt=0;;attempt++){await page.goto(web+'/?tagtest=1');try{await page.waitForFunction(()=>window.shadowTest,null,{timeout:90000});break}catch(error){if(attempt>=3)throw error;console.log('  boot stalled, reloading')}}
 await page.waitForTimeout(2500);await page.evaluate(()=>{const dialog=document.querySelector('#modal');if(dialog?.open)dialog.close()});
 return page;
}
const view=p=>p.evaluate(()=>{const u=tagTest.ui,v=u?.view;return v&&{phase:v.phase,seat:v.seat,round:v.run.round,routes:v.run.routes,ready:v.ready,opponents:v.opponents,gold:v.run.gold,shop:v.run.shop.map(x=>({kind:x.kind,id:x.id,price:x.price,sold:x.sold})),pool:v.run.pool.length,selected:v.run.selected,shopping:v.shopping,tab:u.tab,status:u.status,boss_rerolls:v.run.boss_rerolls||0}});
// Taps go through the page's own click path, so pack-opening overlays and the shopkeeper never swallow them.
const tap=(p,selector)=>p.evaluate(selector=>{const el=document.querySelector(selector);if(!el)throw Error('Missing '+selector);if(el.disabled)throw Error('Disabled '+selector);el.click()},selector);
const has=(p,selector)=>p.evaluate(selector=>!!document.querySelector(selector),selector);
const disabled=(p,selector)=>p.evaluate(selector=>document.querySelector(selector)?.disabled,selector);
const settle=p=>p.evaluate(async()=>{for(let i=0;i<40&&tagTest.ui.closeStartingPacks;i++){tagTest.ui.closeStartingPacks();await new Promise(r=>setTimeout(r,100))}const d=document.querySelector('#modal');if(d?.open&&!d.dataset.goldenRequired)d.close()});
const shot=async(p,name)=>{if(shots){fs.mkdirSync(shots,{recursive:true});await p.screenshot({path:path.join(shots,name+'.png')})}};
// The host ends the running duel as a win through the backend, as the engine's finish does.
const winDuel=async pages=>{
 for(const p of pages)await p.waitForFunction(()=>tagTest.ui.view?.phase==='duel'&&!!tagTest.ui.session.engine,null,{timeout:60000});
 await pages[0].evaluate(()=>tagTest.ui.session.enqueue(async()=>{const s=tagTest.ui.session,e=s.engine;await s.backend('tag-finish',{winner:0,lp:Number(e.lp[0]),events:[],reason:0});e.destroy();s.engine=null;s.log=[];await s.broadcast()}));
 for(const p of pages)await p.waitForFunction(()=>tagTest.ui.view?.phase==='shop',null,{timeout:30000});
 for(const p of pages){await wait(500);await settle(p);await p.evaluate(()=>{for(const b of document.querySelectorAll('#modal [data-do="reward-accept"]'))b.click()})}
};
const lockIn=async(p,opponent)=>{if(await has(p,'[data-tag="opponents"].deck-count-arrow'))await tap(p,'[data-tag="opponents"].deck-count-arrow');await tap(p,`[data-tag="lock-opponent"][data-id="${opponent}"]`)};

async function main(browser){
 const pages=[await open(browser),await open(browser)],[host,guest]=pages;
 for(const p of pages){await p.evaluate(()=>{const b=document.createElement('button');b.dataset.do='tag';document.body.append(b);b.click();b.remove()});await p.waitForFunction(()=>window.tagTest?.ui,null,{timeout:20000})}
 await host.locator('[data-tag="host"]').click();await until(()=>host.evaluate(()=>tagTest.ui.session?.code),15000,'tag room');const code=await host.evaluate(()=>tagTest.ui.session.code);
 await guest.locator('[data-tag="join"]').click();await guest.locator('#tag-code').fill(code);await guest.locator('[data-tag="join-room"]').click();
 await until(()=>host.evaluate(()=>tagTest.ui.session.connected),20000,'partners linked');await host.locator('[data-tag="start"]').click();
 for(const p of pages)await p.waitForFunction(()=>tagTest.ui.view?.phase==='draft',null,{timeout:30000});
 for(const p of pages){await settle(p);await p.evaluate(()=>tagTest.ui.session.request('auto'))}await wait(800);
 for(const p of pages)await p.evaluate(()=>{const u=tagTest.ui;u.localDraft=null;localStorage.removeItem(u.draftKey)});

 // 1. One opponent screen, swords lock-in, teammate's pick visible and closed.
 let [h,g]=await Promise.all(pages.map(view));
 assert.deepEqual(h.routes,g.routes,'both players see the same opponents');assert.equal(h.routes.length,5);
 const [a,b]=h.routes;
 await lockIn(host,a);
 await until(async()=>(await view(guest)).ready[0],10000,'guest sees the host lock');
 await guest.evaluate(()=>{tagTest.ui.tab='opponents';tagTest.ui.render()});
 assert(await has(guest,`[data-encounter="${a}"].teammate-pick .tag-pick.partner`),'the host pick is marked on the guest screen');
 assert(await disabled(guest,`[data-tag="lock-opponent"][data-id="${a}"]`),'the teammate pick is closed');
 assert(await has(host,`[data-encounter="${a}"] .tag-swords.locked`),'the host sees its own lock');
 await shot(guest,'1-opponents-teammate-locked');
 // Edit deck from opponent select and come back.
 await tap(guest,'[data-tag="deck"].tag-edit-deck');assert.equal((await view(guest)).tab,'deck');
 await tap(guest,'[data-tag="opponents"].deck-count-arrow');assert.equal((await view(guest)).tab,'opponents');assert(await has(guest,'.tag-routes'),'back on opponent select');
 await lockIn(guest,b);
 await winDuel(pages);
 console.log('PASS opponent select: one list for both, swords lock-in, teammate pick shown and closed, deck editor round trip');

 // 2. Shared shop.
 [h,g]=await Promise.all(pages.map(view));
 assert.equal(h.tab,'opponents');assert(await has(host,'.tag-shop'),'the shop shows after the duel');
 const free=h.shop.map((x,i)=>({...x,i})).filter(x=>!x.sold&&['single','pack'].includes(x.kind)).sort((x,y)=>x.price-y.price);
 const rerollPrice=await host.evaluate(()=>Number(document.querySelector('.shop-reroll-counter strong')?.textContent));
 // Reroll first: one lock waits, the second rerolls once.
 if(h.gold>=rerollPrice+free[0].price+free[1].price){
  const before=JSON.stringify(h.shop);await tap(host,'.shop-reroll-counter[data-tag="shop-lock"]');
  await until(async()=>(await view(guest)).shopping.locks[0]==='reroll',10000,'guest sees the reroll lock');
  assert(await has(host,'.shop-reroll-counter.tag-locked .tag-lock-note'),'the waiting reroll says so');assert(await has(guest,'.shop-reroll-counter.tag-partner-locked'));
  assert.equal(JSON.stringify((await view(host)).shop),before,'one reroll lock changes nothing');
  await shot(host,'2-shop-reroll-waiting');
  await tap(guest,'.shop-reroll-counter[data-tag="shop-lock"]');
  await until(async()=>JSON.stringify((await view(host)).shop)!==before,10000,'shop rerolled');
  await until(async()=>{[h,g]=await Promise.all(pages.map(view));return JSON.stringify(h.shop)===JSON.stringify(g.shop)&&JSON.stringify(g.shop)!==before},10000,'both screens show the new stock');assert.deepEqual(h.shopping.locks,[null,null]);
  console.log('PASS shop reroll waits for both players and rerolls once');
 }else console.log('  (skipped the reroll: not enough coins)',h.gold);
 const cheap=(await view(host)).shop.map((x,i)=>({...x,i})).filter(x=>!x.sold&&x.kind==='single').sort((x,y)=>x.price-y.price);
 const [x,y]=cheap;const gold=(await view(host)).gold;assert(x.price+y.price<=gold,'two cheap cards fit the team coins');
 await tap(guest,`[data-tag="select"][data-index="${x.i}"]`);
 await until(async()=>(await view(host)).shopping.carts[1].includes(x.i),10000,'host sees the guest cart');
 assert(await has(host,`.shop-product.teammate-pick [data-shop-item="${x.i}"] .tag-cart-badge`),'the guest pick carries the guest portrait');
 assert(await disabled(host,`[data-tag="select"][data-index="${x.i}"]`),'the guest pick cannot be taken');
 await tap(host,`[data-tag="select"][data-index="${y.i}"]`);await until(async()=>(await view(guest)).shopping.carts[0].includes(y.i),10000,'guest sees the host cart');
 await tap(host,'.shop-buy[data-tag="shop-lock"]');await until(async()=>(await view(guest)).shopping.locks[0]==='buy',10000,'guest sees the Buy lock');
 assert(await has(host,'.shop-buy.tag-locked .tag-lock-note'),'host Buy waits');assert.match(await host.locator('.tag-shop-turn .tag-turn-long').textContent(),/Waiting for .* to press Buy/);
 assert.equal((await view(host)).gold,gold,'nothing is bought on one lock');
 await shot(host,'3-shop-buy-waiting');await shot(guest,'3-shop-buy-partner-ready');
 const pools=[(await view(host)).pool,(await view(guest)).pool];
 await tap(guest,'.shop-buy[data-tag="shop-lock"]');
 await until(async()=>(await view(host)).gold===gold-x.price-y.price,10000,'both carts bought');
 [h,g]=await Promise.all(pages.map(view));
 assert(h.shop[x.i].sold&&h.shop[y.i].sold);assert.equal(h.pool,pools[0]+1);assert.equal(g.pool,pools[1]+1);assert.equal(h.phase,'shop');assert.deepEqual(h.shopping.carts,[[],[]]);
 console.log('PASS shared shop: both carts visible with portraits, a pick cannot be taken twice, Buy waits for both, each buyer gets their card');

 // 3. Deck editor from the shop, and back.
 await settle(guest);await tap(guest,'.shop-edit-deck[data-tag="deck"]');assert.equal((await view(guest)).tab,'deck');assert(await has(guest,'.tag-back-shop'));
 const before=(await view(guest)).selected,card=await guest.evaluate(()=>[...document.querySelectorAll('[data-tag="card"]')].find(b=>!b.classList.contains('selected'))?.dataset.index);
 await tap(guest,`[data-tag="card"][data-index="${card}"]`);
 const edited=(await view(guest)).selected;assert.notDeepEqual(edited,before);
 await tap(guest,'[data-tag="shop-back"]');assert(await has(guest,'.tag-shop'),'back in the shop');
 await until(async()=>JSON.stringify((await host.evaluate(()=>tagTest.ui.backend('tag-view',1))).run.selected)!==JSON.stringify(before),10000,'the shop deck edit reached the host');
 console.log('PASS deck editor from the shop: edits travel to the host when the player goes back to the shop');

 // 4. Next duel: both must press it.
 await tap(host,'.shop-next[data-tag="shop-lock"]');await until(async()=>(await view(guest)).shopping.locks[0]==='next',10000,'guest sees Next');
 assert(await has(guest,'.shop-next.tag-partner-locked'));assert.equal((await view(host)).phase,'shop');
 await tap(guest,'.shop-next[data-tag="shop-lock"]');
 for(const p of pages)await p.waitForFunction(()=>tagTest.ui.view?.phase==='draft',null,{timeout:20000});
 [h,g]=await Promise.all(pages.map(view));
 assert.equal(h.tab,'opponents');assert.equal(g.tab,'opponents');assert.deepEqual(h.routes,g.routes);assert(await has(host,'.tag-routes'));
 assert.deepEqual(g.selected,edited,'the deck edited in the shop is the deck on opponent select');
 console.log('PASS Next duel: one press waits, both presses open the next opponent select on both screens');

 // 5. Round 2, then the boss screen.
 await lockIn(host,h.routes[0]);await until(async()=>(await view(guest)).ready[0],10000,'host locked');await lockIn(guest,h.routes[1]);
 await winDuel(pages);
 for(const p of pages)await tap(p,'.shop-next[data-tag="shop-lock"]');
 for(const p of pages)await p.waitForFunction(()=>tagTest.ui.view?.phase==='draft'&&tagTest.ui.view.run.round===2,null,{timeout:20000});
 const reels=await Promise.all(pages.map(p=>p.waitForFunction(()=>document.querySelectorAll('.boss-reel .slot-window').length,null,{timeout:10000}).then(r=>r.jsonValue())));
 assert.deepEqual(reels,[2,2],'both bosses spin together on both screens');
 await shot(host,'4-boss-reel');
 for(const p of pages)await p.waitForFunction(()=>!document.querySelector('.encounter-cinematic'),null,{timeout:15000});
 [h,g]=await Promise.all(pages.map(view));
 assert.equal(h.routes.length,2);assert.deepEqual(h.routes,g.routes);assert.notEqual(h.routes[0],h.routes[1]);
 await shot(guest,'5-boss-screen');
 if(h.gold>=30){
  await tap(guest,`[data-tag="boss-reroll"][data-id="${h.routes[0]}"]`);
  await until(async()=>(await view(host)).routes[0]!==h.routes[0],10000,'boss rerolled');
  const after=await view(host);assert.equal(after.routes[1],h.routes[1],'the other boss stays');assert.equal(after.gold,h.gold-30);
  const single=await host.waitForFunction(()=>document.querySelectorAll('.boss-reel .slot-window').length,null,{timeout:10000}).then(r=>r.jsonValue());
  assert.equal(single,1,'only the new boss spins');
  console.log('PASS boss screen: two shared bosses spin together, one rerolled on its own and spun alone');
 }else console.log('  (skipped the boss reroll: not enough coins)',h.gold);
 for(const p of pages)assert.deepEqual(p.errors,[],'no page errors');
 console.log('PASS Tag shared flow with two real clients');
}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio','--disable-features=LocalNetworkAccessChecks']});try{await main(browser)}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
