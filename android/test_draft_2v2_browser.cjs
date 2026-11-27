// 2v2 Draft Duels (2026-11-26): four real Chrome clients of the real game against a local Worker. Host with the
// 2v2 option, three joins, the host drags players between team slots, draft, a tag duel over the room hub, a surrender, then the four-player Draft
// Screen. Start the same services as test_online_browser.cjs, then:
//   node android/test_draft_2v2_browser.cjs [--shots=<folder>] [--chrome=<chrome.exe when Playwright has no browser>]
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('../tools/require-module.cjs').requireModule('playwright');
const arg=(name,fallback)=>process.argv.find(a=>a.startsWith(`--${name}=`))?.split('=')[1]??fallback;
const endpoint=arg('endpoint','http://127.0.0.1:8799'),web=arg('web','http://127.0.0.1:4297'),shots=arg('shots','');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function open(browser,i){
 const context=await browser.newContext({viewport:{width:924,height:430},bypassCSP:true}),page=await context.newPage();page.errors=[];
 page.on('pageerror',e=>{page.errors.push(e.message);console.log(`PAGE ERROR [${i}]`,e.message)});
 await page.addInitScript(()=>{localStorage.setItem('ygo-preload-visuals','sounds');HTMLMediaElement.prototype.play=function(){this.muted=true;return Promise.resolve()}});
 await page.route('**/multiplayer-config.json',r=>r.fulfill({json:{signalingUrl:endpoint}}));
 await page.route('**/card-assets.js',r=>r.fulfill({contentType:'text/javascript',body:'export const cardImages=new Map();export async function preloadCards(){}'}));
 await page.goto(web+'/');await page.waitForFunction(()=>window.shadowTest,null,{timeout:180000});
 await page.waitForTimeout(2500);await page.evaluate(()=>{const dialog=document.querySelector('#modal');if(dialog?.open)dialog.close()});
 return page;
}
// Each client answers its own duelist's prompts through the same call the duel UI makes.
const startBot=page=>page.evaluate(async()=>{
 const {flipPerspective}=await import('./tag-duel.js'),{duelMap}=await import('./collector-rules.js');window.u=shadowTest.collector();
 clearInterval(window.bot);window.bot=setInterval(()=>{const u=window.u,g=u?.game,r=u?.room;if(!g||r?.phase!=='duel'||window.botBusy||g.finished||window.botOff)return;const slot=duelMap(r).slot(u.seat);if(g.respondingSeat!==slot)return;const raw=g.auto(g.pending);window.botBusy=true;u.session.request('duel-response',{number:u.applied,response:slot>>1===1?flipPerspective(raw):raw}).finally(()=>{window.botBusy=false})},120);
});
const state=page=>page.evaluate(()=>{const u=shadowTest.collector();return {mode:u?.mode,phase:u?.room?.phase,game:u?.room?.game,seat:u?.seat,applied:u?.applied,check:u?.game?.lp?u.game.checksum():null,hub:!!u?.hub?.isOpen,code:u?.room?.code,status:u?.status,score:u?.room?.score,teams:u?.room?.teams,players:u?.room?.players?.length,round:u?.room?.round}});
let pagesForDump=[];
async function until(check,ms,label){const end=Date.now()+ms;let last;while(Date.now()<end){last=await check();if(last)return last;await wait(250)}for(const p of pagesForDump)console.log('  state',JSON.stringify(await state(p).catch(e=>e.message)),await p.evaluate(()=>window.surrendered&&String(window.surrendered)).catch(()=>''));assert.fail('Timed out: '+label)}
const shot=async(page,name)=>{if(shots)await page.screenshot({path:path.join(shots,name+'.png')})};
(async()=>{
 const browser=await chromium.launch({args:['--disable-gpu'],...(arg('chrome','')?{executablePath:arg('chrome','')}:{})});
 try{
  const pages=pagesForDump;for(let i=0;i<4;i++)pages.push(await open(browser,i));const [host]=pages;
  for(const p of pages){await p.evaluate(()=>{const b=document.createElement('button');b.dataset.do='draft-pvp';document.body.append(b);b.click();b.remove()});await until(()=>p.evaluate(()=>!!shadowTest.collector()),30000,'draft screen')}
  assert(await host.evaluate(()=>!!document.querySelector('[data-collector="team-room"]')),'the 2v2 option shows for everyone');
  await shot(host,'1-host-option');
  await host.evaluate(()=>{const u=shadowTest.collector();u.teamRoom=true;return u.action('draft-host')});
  await until(()=>host.evaluate(()=>shadowTest.collector().room?.code),15000,'room created');
  const code=(await state(host)).code;assert.equal((await host.evaluate(()=>shadowTest.collector().room.size)),4,'a 2v2 room');
  for(const p of pages.slice(1)){await p.evaluate(()=>shadowTest.collector().action('draft-join'));await p.waitForSelector('#collector-code');await p.evaluate(code=>{document.getElementById('collector-code').value=code;return shadowTest.collector().action('join-room')},code);}
  await until(async()=>(await Promise.all(pages.map(state))).every(s=>s.hub&&s.players===4),20000,'four players, four hubs');
  for(const p of pages)await until(()=>p.evaluate(()=>shadowTest.collector().paired()),15000,'paired');
  assert.deepEqual((await Promise.all(pages.map(state))).map(s=>s.seat),[0,1,2,3]);
  assert.equal(await host.evaluate(()=>document.querySelectorAll('button[data-collector="slot"]').length),4,'the host sees four movable slots');
  assert.equal(await pages[1].evaluate(()=>document.querySelectorAll('button[data-collector="slot"]').length),0,'only the host moves players');
  // A real mouse drag: the player in slot 4 (seat 3) onto slot 2 (seat 1), who goes to slot 4. Teams: seats 0+3 vs 1+2.
  const box=k=>host.evaluate(k=>{const b=document.querySelector(`button[data-slot="${k}"]`).getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2}},k);
  {const a=await box(3),b=await box(1);await host.mouse.move(a.x,a.y);await host.mouse.down();await host.mouse.move(a.x+20,a.y,{steps:4});await host.mouse.move(b.x,b.y,{steps:12});await host.mouse.up();}
  await until(async()=>(await Promise.all(pages.map(state))).every(s=>JSON.stringify(s.teams)==='[0,1,1,0]'),15000,'new teams reach everyone');
  // Tap one slot, then another: slots 3 and 4 swap inside Team B, so the teams stay the same.
  // (A tap within 400 ms of a drop counts as the drop's own click and is ignored.)
  await wait(600);
  await host.evaluate(()=>document.querySelector('button[data-slot="2"]').click());await host.evaluate(()=>document.querySelector('button[data-slot="3"]').click());
  await until(()=>host.evaluate(()=>JSON.stringify(shadowTest.collector().room.slots)==='[0,3,1,2]'),15000,'tap-tap move');
  assert.equal((await state(host)).teams.join(),'0,1,1,0');
  await shot(host,'2-lobby');await shot(pages[1],'2-lobby-guest');
  for(const p of pages)await p.evaluate(()=>shadowTest.collector().action('open-ready'));
  await until(async()=>(await Promise.all(pages.map(state))).every(s=>s.phase==='drafting'),20000,'draft begins for all four');
  for(const p of pages)await p.evaluate(async()=>{const u=shadowTest.collector();u.closePacks?.();const counts=new Map(),main=[];for(const id of u.duelist.pool){const c=u.content.cards.find(x=>x.id===id);if(!c||c.data.type&64)continue;const n=counts.get(c.name)||0;if(n<3&&main.length<u.minDeck()){counts.set(c.name,n+1);main.push(id)}}u.duelist.draftDeck={main,side:[],extra:[]};u.save();await u.action('ready-draft')});
  await until(async()=>(await Promise.all(pages.map(state))).every(s=>s.phase==='duel'),30000,'duel begins for all four');
  for(const p of pages)await startBot(p);
  await until(async()=>(await Promise.all(pages.map(state))).every(s=>s.applied>=60),240000,'duel progressed');
  for(const p of pages)await p.evaluate(()=>{window.botOff=true});await wait(2500);
  const mid=await Promise.all(pages.map(state));console.log('  after',mid.map(s=>s.applied).join('/'),'answers, checksums',mid.map(s=>s.check).join('/'));
  assert(mid.every(s=>s.applied===mid[0].applied&&s.check===mid[0].check),'all four engines agree');
  // Everyone sees the duel from their own side: their own team's names come first.
  const sides=await Promise.all(pages.map(p=>p.evaluate(async()=>{const u=shadowTest.collector(),{duelMap}=await import('./collector-rules.js'),slot=duelMap(u.room).slot(u.seat),v=u.game.snapshotFor(slot);return {mine:v.tag.names[0],me:u.content.characters[u.duelist.character].name}})));
  for(const s of sides)assert(s.mine.includes(s.me),'own team shown first: '+JSON.stringify(s));
  await shot(host,'3-duel-host');await shot(pages[1],'3-duel-opponent');
  const answeredBy=await host.evaluate(()=>[...new Set(shadowTest.collector().duelLog.events.map(e=>e.seat))].sort());
  console.log('  answers came from seats',answeredBy.join(','));assert.deepEqual(answeredBy,[0,1,2,3],'all four players answered');
  // A surrender ends the duel for the team; everyone moves to the four-player Draft Screen.
  await pages[1].evaluate(()=>{window.surrendered=shadowTest.collector().session.request('surrender').then(()=>'done',e=>'error: '+e.message)});
  await until(async()=>(await Promise.all(pages.map(state))).every(s=>s.phase==='picking'),30000,'Draft Screen for all four');
  const picking=await Promise.all(pages.map(state));console.log('  score',JSON.stringify(picking[0].score));
  assert.deepEqual(picking[0].score,[1,0],'seat 1 surrendered: team 0 (seats 0 and 3) wins the duel');
  const order=await host.evaluate(()=>shadowTest.collector().room.pickOrder);console.log('  pick order',order.join(','));
  await shot(pages[order[0]],'4-draft-screen');
  for(const [k,seat] of order.entries()){const p=pages[seat];await until(()=>p.evaluate(s=>shadowTest.collector().room?.pickOrder&&shadowTest.collector().room.picks.filter(Boolean).length===s,k),15000,'pick '+k);await p.evaluate(k=>{const u=shadowTest.collector();u.choice={relic:k,pack:k};return u.action('confirm-pick')},k);}
  await until(async()=>(await Promise.all(pages.map(state))).every(s=>s.phase==='drafting'),20000,'second draft for all four');
  const relics=await host.evaluate(()=>shadowTest.collector().room.relics.map(r=>r.length));assert.deepEqual(relics,[1,1,1,1]);
  const errors=pages.flatMap(p=>p.errors);assert.deepEqual(errors,[],'no page errors');
  console.log('PASS test_draft_2v2_browser');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
