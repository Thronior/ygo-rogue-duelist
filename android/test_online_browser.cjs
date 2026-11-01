// Two real Chrome clients of the real game against a local Worker: Draft Duels and Tag over the room hub.
// Start the services first (state stays outside the repo):
//   runtime/ai/node.exe multiplayer/cloudflare/node_modules/wrangler/bin/wrangler.js dev --local --port 8799 --persist-to <scratch>   (from multiplayer/cloudflare)
//   PORT=4297 python -B tools/serve_qa.py
//   node android/test_online_browser.cjs [--mode=draft|tag|collector] [--latency=250]
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('../tools/require-module.cjs').requireModule('playwright');
const arg=(name,fallback)=>process.argv.find(a=>a.startsWith(`--${name}=`))?.split('=')[1]??fallback;
const endpoint=arg('endpoint','http://127.0.0.1:8799'),web=arg('web','http://127.0.0.1:4297'),mode=arg('mode','draft'),latency=+arg('latency','250');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function open(browser,search=''){
 const context=await browser.newContext({viewport:{width:924,height:430},bypassCSP:true}),page=await context.newPage();page.requests={http:0,ws:0};
 page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
 page.on('request',r=>{if(r.url().startsWith(endpoint)&&r.method()!=='OPTIONS')page.requests.http++});page.on('websocket',()=>page.requests.ws++);
 await page.addInitScript(()=>{localStorage.setItem('ygo-preload-visuals','sounds');HTMLMediaElement.prototype.play=function(){this.muted=true;return Promise.resolve()}});
 await page.route('**/multiplayer-config.json',r=>r.fulfill({json:{signalingUrl:endpoint}}));
 await page.route('**/card-assets.js',r=>r.fulfill({contentType:'text/javascript',body:'export const cardImages=new Map();export async function preloadCards(){}'}));
 await page.goto(web+'/'+search);await page.waitForFunction(()=>window.shadowTest,null,{timeout:120000});
 // The first-visit cloud save offer arrives a moment after loading and would cover the room.
 await page.waitForTimeout(2500);await page.evaluate(()=>{const dialog=document.querySelector('#modal');if(dialog?.open)dialog.close()});
 const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');
 page.shape=(ms=latency)=>cdp.send('Network.emulateNetworkConditions',{offline:false,latency:ms,downloadThroughput:-1,uploadThroughput:-1});
 return page;
}
// Answers through the same call the duel UI makes. Automatic chain passes also fire from the real UI.
const startBot=page=>page.evaluate(async()=>{
 const {flipPerspective}=await import('./tag-duel.js');window.u=shadowTest.collector();window.u.seenApplied=0;
 clearInterval(window.bot);window.bot=setInterval(()=>{const u=window.u,g=u?.game,r=u?.room;if(!g||r?.phase!=='duel'||window.botBusy||g.finished||window.botOff)return;const seat=u.seat^r.first;if(g.respondingSeat!==seat)return;const raw=g.auto(g.pending);window.botBusy=true;u.session.request('duel-response',{number:u.applied,response:seat===1?flipPerspective(raw):raw}).finally(()=>{window.botBusy=false})},120);
});
const state=page=>page.evaluate(()=>{const u=shadowTest.collector();return {mode:u?.mode,phase:u?.room?.phase,game:u?.room?.game,applied:u?.applied,confirmed:u?.duelLog?.confirmed,check:u?.game?.lp?u.game.checksum():null,hub:!!u?.hub?.isOpen,code:u?.room?.code,status:u?.status,score:u?.room?.score,net:u?.netStatus?.()}});
async function until(check,ms,label){const end=Date.now()+ms;let last;while(Date.now()<end){last=await check();if(last)return last;await wait(200)}assert.fail('Timed out: '+label)}
async function draft(browser){
 const pages=[await open(browser),await open(browser)],[a,b]=pages;
 for(const p of pages){await p.evaluate(()=>{const b=document.createElement('button');b.dataset.do='draft-pvp';document.body.append(b);b.click();b.remove()});await until(()=>p.evaluate(()=>!!shadowTest.collector()),20000,'draft screen')}
 await a.evaluate(()=>shadowTest.collector().action('draft-host'));await until(()=>a.evaluate(()=>shadowTest.collector().room?.code),10000,'room created');
 const code=(await state(a)).code;
 await b.evaluate(()=>shadowTest.collector().action('draft-join'));await b.waitForSelector('#collector-code');await b.evaluate(code=>{document.getElementById('collector-code').value=code;return shadowTest.collector().action('join-room')},code);
 await until(async()=>(await state(a)).hub&&(await state(b)).hub,10000,'both hubs open');
 await until(()=>a.evaluate(()=>shadowTest.collector().room?.players.length===2),8000,'host told of the guest without polling');
 for(const p of pages)await until(()=>p.evaluate(()=>shadowTest.collector().paired()),8000,'paired');
 for(const p of pages)await p.evaluate(()=>shadowTest.collector().action('open-ready'));
 await until(async()=>(await state(a)).phase==='drafting'&&(await state(b)).phase==='drafting',10000,'draft begins on both');
 for(const p of pages)await p.evaluate(async()=>{const u=shadowTest.collector();u.closePacks?.();const counts=new Map(),main=[];for(const id of u.duelist.pool){const c=u.content.cards.find(x=>x.id===id);if(!c||c.data.type&64)continue;const n=counts.get(c.name)||0;if(n<3&&main.length<40){counts.set(c.name,n+1);main.push(id)}}u.duelist.draftDeck={main,side:[],extra:[]};u.save();await u.action('ready-draft')});
 await until(async()=>(await state(a)).phase==='duel'&&(await state(b)).phase==='duel',15000,'duel begins');
 for(const p of pages){await startBot(p);await p.shape()}
 const before=pages.map(p=>p.requests.http);
 await until(async()=>(await state(a)).applied>=40,180000,'duel progressed at '+latency+' ms');
 const played=(await state(a)).applied;
 // Half a minute of normal play used to cost dozens of polls and three POSTs per answer.
 const used=pages.map((p,i)=>p.requests.http-before[i]);console.log(`  ${played} responses, HTTP requests since duel start: ${used.join(' + ')}`);assert(used.every(n=>n<=3),'duels run on the hub, not HTTP');
 // Hard drop on the guest. Play pauses, the hub reconnects by itself and nothing is lost.
 await b.context().setOffline(true);await b.evaluate(()=>shadowTest.collector().hub.lost());await until(async()=>(await state(a)).net.partnerOnline===false,15000,'opponent told of the drop');await a.screenshot({path:path.resolve(process.env.SHOT_DIR||'temp','online-partner-lost.png')});await b.context().setOffline(false);
 await until(async()=>(await state(b)).hub,40000,'guest hub returned');
 const resume=(await state(a)).applied;await until(async()=>(await state(a)).applied>resume+5,90000,'play resumed after the drop');
 for(const p of pages)await p.evaluate(()=>{window.botOff=true});await wait(2500);
 const [x,y]=[await state(a),await state(b)];assert.equal(x.applied,y.applied,'both applied the same log');assert.equal(x.check,y.check,'engines agree');assert.equal(x.confirmed,x.applied);
 const screen=await a.evaluate(()=>document.querySelector('#net-status')?.dataset.quality);assert(screen,'connection readout is on screen');await a.screenshot({path:path.resolve(process.env.SHOT_DIR||'temp','online-draft-duel.png')});
 // A surrender ends game one; the second game starts from the hub nudge.
 await a.evaluate(()=>shadowTest.collector().session.request('surrender'));await until(async()=>(await state(a)).phase==='siding'&&(await state(b)).phase==='siding',15000,'siding reached on both');
 for(const p of pages)await p.evaluate(()=>shadowTest.collector().action('next'));await until(async()=>(await state(a)).game===2&&(await state(b)).game===2&&(await state(a)).phase==='duel',20000,'second game');
 for(const p of pages)await p.evaluate(()=>{window.botOff=false});await until(async()=>(await state(b)).applied>=10,120000,'second game progressed');
 await a.evaluate(()=>shadowTest.collector().session.request('surrender'));await until(async()=>(await state(a)).mode==='result'&&(await state(b)).mode==='result',20000,'match result on both');
 console.log(`PASS Draft Duels: hub lobby, ${played}+ responses at ${latency} ms, drop recovery, matching engines, surrender, second game, match result; total HTTP ${pages.map(p=>p.requests.http).join(' + ')}, sockets ${pages.map(p=>p.requests.ws).join(' + ')}`);
}
async function tag(browser){
 const pages=[await open(browser,'?tagtest=1'),await open(browser,'?tagtest=1')],[host,guest]=pages;
 for(const p of pages){await p.evaluate(()=>{const b=document.createElement('button');b.dataset.do='tag';document.body.append(b);b.click();b.remove()});await p.waitForFunction(()=>window.tagTest?.ui,null,{timeout:20000})}
 await host.locator('[data-tag="host"]').click();await until(()=>host.evaluate(()=>tagTest.ui.session?.code),10000,'tag room');const code=await host.evaluate(()=>tagTest.ui.session.code);
 await guest.locator('[data-tag="join"]').click();await guest.locator('#tag-code').fill(code);await guest.locator('[data-tag="join-room"]').click();
 await until(()=>host.evaluate(()=>tagTest.ui.session.connected),15000,'partners linked');await host.locator('[data-tag="start"]').click();
 for(const p of pages)await p.waitForFunction(()=>tagTest.ui.view?.phase==='draft',null,{timeout:20000});
 console.log('  route:',await host.evaluate(()=>tagTest.ui.session.peer.route));
 for(const p of pages){await p.evaluate(()=>tagTest.ui.session.request('auto'));await wait(1500);await p.evaluate(async()=>{const ui=tagTest.ui,run=ui.view.run;await ui.session.request('ready',{selected:run.selected,opponent:run.routes.find(i=>i!==ui.view.opponents[1-ui.view.seat])})})}
 await until(()=>host.evaluate(()=>!!tagTest.ui.session.engine),30000,'host duel');await until(()=>guest.evaluate(()=>!!tagTest.ui.session.engine),60000,'guest engine started');
 console.log('  duel running on both; route:',await host.evaluate(()=>tagTest.ui.session.peer.route));
 for(const p of pages)await p.evaluate(()=>{window.bot=setInterval(()=>{const s=tagTest.ui.session,e=s?.engine;if(!e||e.finished||e.respondingSeat!==s.seat)return;s.request('duel-response',{number:e.responseNumber,response:e.auto(e.pending)}).catch(()=>{})},150)});
 const running=p=>p.evaluate(()=>tagTest.ui.view?.phase==='duel'&&!!tagTest.ui.session.engine);
 const logLength=p=>p.evaluate(()=>tagTest.ui.session.log.length);
 // Practice duels can end quickly, which proves the finish path instead of the drop path.
 await until(async()=>!await running(host)||await logLength(host)>=30,120000,'tag duel progressed');
 if(await running(host)){
  await guest.evaluate(()=>tagTest.ui.session.peer.closeDirect());await wait(3000);
  const mark=await logLength(host);await until(async()=>!await running(host)||await logLength(host)>mark+3,60000,'tag kept playing on the hub after losing the direct route');
 }
 for(const p of pages)await p.evaluate(()=>clearInterval(window.bot));await wait(3000);
 if(await running(host)){const sums=await Promise.all(pages.map(p=>p.evaluate(()=>[tagTest.ui.session.log.length,tagTest.ui.session.engine.checksum()])));assert.deepEqual(sums[0],sums[1],'host and guest engines agree');console.log(`  ${sums[0][0]} steps, engines agree`)}
 else{await until(()=>guest.evaluate(()=>tagTest.ui.view?.phase!=='duel'),20000,'guest left the finished duel');assert.deepEqual(...await Promise.all(pages.map(p=>p.evaluate(()=>tagTest.ui.view.phase))));console.log('  duel finished on both clients')}
 console.log(`PASS Tag: real game on the replicated log; HTTP ${pages.map(p=>p.requests.http).join(' + ')}, sockets ${pages.map(p=>p.requests.ws).join(' + ')}`);
}
async function collector(browser){
 const pages=[await open(browser),await open(browser)],[a,b]=pages;
 for(const [index,p] of pages.entries()){
  await p.evaluate(()=>{const b=document.createElement('button');b.dataset.do='collector';document.body.append(b);b.click();b.remove()});await until(()=>p.evaluate(()=>!!shadowTest.collector()?.connectionReady),20000,'collector screen');
  await p.evaluate(async index=>{
   const u=shadowTest.collector();await u.connectionReady;const counts=new Map(),main=[];
   for(const c of u.content.cards){if(c.data.type&64||!(c.data.type&1)||main.length>=40)continue;if(u.validateDeck===undefined)break;for(let n=0;n<1&&main.length<40;n++)main.push(c.id)}
   const id=crypto.randomUUID().replaceAll('-',''),duelist={id,token:id+id,slot:index,name:'Test '+index,character:0,pool:[...main],status:'alive',wins:0,history:[],deck:{main,side:[],extra:[]}};
   u.duelist=duelist;u.data={duelists:[duelist]};u.backend=async action=>{if(action==='collector-sync')return u.data;return u.data};
   await u.sync(await u.api('register',{duelist}));await u.sync(await u.api('deck',{deck:duelist.deck}));
  },index);
 }
 await a.evaluate(async()=>{const u=shadowTest.collector();await u.accept(await u.api('host'));u.schedule()});
 const code=(await state(a)).code;await b.evaluate(async code=>{const u=shadowTest.collector();await u.accept(await u.api('join',{code}));u.schedule()},code);
 await until(async()=>(await state(a)).phase==='duel'&&(await state(b)).phase==='duel',20000,'host told of the match by the hub');
 for(const p of pages){await startBot(p);await p.shape()}
 const before=pages.map(p=>p.requests.http);await until(async()=>(await state(a)).applied>=30,180000,'collector duel progressed');
 const used=pages.map((p,i)=>p.requests.http-before[i]);assert(used.every(n=>n<=3),'duels run on the hub');
 for(const p of pages)await p.evaluate(()=>{window.botOff=true});await wait(2500);const [x,y]=[await state(a),await state(b)];assert.equal(x.applied,y.applied);assert.equal(x.check,y.check,'engines agree');
 console.log(`PASS Ultimate Collector: ${x.applied} responses at ${latency} ms with ${used.join(' + ')} HTTP requests in play; engines agree`);
}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio','--disable-features=LocalNetworkAccessChecks']});try{await ({draft,tag,collector})[mode](browser)}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
