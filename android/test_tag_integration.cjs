const {chromium}=require('C:/Users/Win/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path');process.env.TEMP=process.env.TMP=path.resolve('temp');
async function enterCode(page,code){if(await page.locator('.tag-code-keyboard').count()){await page.locator('[data-tag=code-clear]').click();for(const key of code)await page.locator(`[data-key="${key}"]`).click()}else await page.locator('#tag-code').fill(code)}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});let errors=[],phoneBrowser;
 try{
 let desktop=await browser.newPage({viewport:{width:1280,height:720}});phoneBrowser=process.argv.includes('--phone')?await chromium.connectOverCDP('http://127.0.0.1:9223'):null;let mobile=phoneBrowser?phoneBrowser.contexts()[0].pages()[0]:await browser.newPage({viewport:{width:924,height:416},hasTouch:true,isMobile:true});
 for(const page of [desktop,mobile])await page.addInitScript(relay=>{if(relay){const RTC=RTCPeerConnection;window.RTCPeerConnection=class extends RTC{constructor(config){super({...config,iceTransportPolicy:'relay'})}}}const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.muted=true;return play.call(this)}},process.argv.includes('--relay'));
 for(const page of [desktop,mobile]){page.on('console',m=>{if(m.type()==='error')console.error('BROWSER',m.text().slice(0,200))});page.on('response',async r=>{if(r.status()>=400)console.error('HTTP',r.url(),(await r.text()).slice(0,300))});page.on('requestfailed',r=>{if(!(r.failure()?.errorText==='net::ERR_ABORTED'&&/\.(wav|mp3)$/.test(r.url())))console.error('FETCH',r.url(),r.failure())});}
 for(const page of [desktop,mobile])page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message)});
 await Promise.all([desktop.goto('http://127.0.0.1:4197/?desktop='+process.argv[2]+'&tagtest=1'),phoneBrowser?mobile.reload():mobile.goto('http://127.0.0.1:4197/?tagtest=1')]);
 await desktop.locator('[data-tag="host"]').waitFor({timeout:120000});await mobile.locator('[data-menu]:has-text("Tag duels")').waitFor({timeout:120000});await mobile.locator('[data-menu]:has-text("Tag duels")').dispatchEvent('click');await mobile.locator('[data-menu]:has-text("Tag duels")').dispatchEvent('click');await mobile.locator('[data-tag="host"]').waitFor();
 await mobile.locator('[data-tag="character"][data-id="1"]').click();
 if(process.argv.includes('--mobile-host'))[desktop,mobile]=[mobile,desktop];
 await desktop.locator('[data-tag="host"]').click();await desktop.waitForFunction(()=>window.tagTest?.ui?.session?.code);const code=await desktop.evaluate(()=>tagTest.ui.session.code);console.log('ROOM',code);
 await mobile.locator('[data-tag="join"]').click();await enterCode(mobile,code);await mobile.locator('[data-tag="join-room"]').click();
 for(const page of [desktop,mobile])await page.waitForFunction(()=>window.tagTest?.ui?.view?.phase==='lobby');
 await desktop.waitForFunction(()=>!tagTest.ui.working);await desktop.locator('[data-tag="start"]').click();
 for(const page of [desktop,mobile])await page.waitForFunction(()=>window.tagTest?.ui?.view?.phase==='draft',null,{timeout:30000});
 for(const page of [desktop,mobile])await page.evaluate(()=>{window.tagTrace=[];const p=tagTest.ui.session.peer;for(const key of ['onState','onMessage','send']){const original=p[key];p[key]=function(...args){tagTrace.push({event:key,value:key==='onState'?args[0]:args[0]?.kind,epoch:p.epoch,ready:p.channel?.readyState,time:Date.now()});if(tagTrace.length>100)tagTrace.shift();return original.apply(this,args)}}});
 const route=await desktop.evaluate(()=>tagTest.ui.session.peer.route());console.log('CONNECTED',route);if(process.argv.includes('--relay'))assert.equal(route,'relay');
 for(const page of [desktop,mobile]){assert.equal(await page.locator('[data-tag=ready]').count(),0);await page.locator('[data-tag="auto"]').click();await page.waitForFunction(()=>tagTest.ui.view.run.selected.length>=20);await page.locator('[data-tag="opponents"]').click()}
 await desktop.screenshot({path:path.resolve('temp/tag-opponent-desktop.png')});await mobile.screenshot({path:path.resolve('temp/tag-opponent-mobile.png')});
 // Editing a draft stays local, including through a connection loss.
 for(const page of [desktop,mobile]){
  assert(await page.evaluate(()=>tagTest.ui.view.run.selected.length>=20));
  assert(await page.evaluate(()=>tagTest.ui.session.view.run.selected.length<20));
  await page.locator('[data-tag=deck]').click();
  await page.evaluate(()=>{const list=document.querySelector('.tag-deck-scroll');list.scrollTop=150;window.savedDraftScroll=list.scrollTop;window.savedDraftSelection=JSON.stringify(tagTest.ui.view.run.selected)});
 }
 const draftGeneration=await mobile.evaluate(()=>tagTest.ui.session.peer.generation);
 await mobile.evaluate(()=>{const p=tagTest.ui.session.peer;if(p.socket)p.socket.close();else p.pc.close()});
 for(const page of [desktop,mobile]){
  await page.waitForFunction(g=>tagTest.ui.session.connected&&tagTest.ui.session.peer.generation>g,draftGeneration,{timeout:70000});
  assert(await page.evaluate(()=>JSON.stringify(tagTest.ui.view.run.selected)===savedDraftSelection));
  assert(await page.evaluate(()=>document.querySelector('.tag-deck-scroll').scrollTop===savedDraftScroll));
  await page.locator('[data-tag=opponents]').click();
 }
 console.log('LOCAL DRAFT and scroll survive background reconnection; no intermediate deck sent');
 const options=await desktop.evaluate(()=>tagTest.ui.view.run.routes);const other=await mobile.evaluate(first=>tagTest.ui.view.run.routes.find(x=>x!==first),options[0]);
 await desktop.locator(`[data-tag="choose"][data-id="${options[0]}"]`).click();await mobile.locator(`[data-tag="choose"][data-id="${other}"]`).click();
 for(const page of [desktop,mobile]){await page.waitForFunction(()=>!tagTest.ui.working);await page.locator('[data-tag="ready"]').click()}
 for(const page of [desktop,mobile])await page.waitForFunction(()=>window.tagTest?.snapshot?.turn>0,null,{timeout:60000});
 for(const page of [desktop,mobile]){await page.locator('.duel').waitFor();assert(await page.locator('.zone').count()>=20)}
 console.log('DUEL',await desktop.evaluate(()=>({phase:tagTest.ui.view.phase,turn:tagTest.snapshot.turn,native:tagTest.snapshot.native.locations.length})));
 await mobile.screenshot({path:path.resolve('temp/tag-mobile-duel.png')});await desktop.screenshot({path:path.resolve('temp/tag-desktop-shell.png')});

 // Verify an actual rendered control advances the shared game, not just RPCs.
 for(const page of [desktop,mobile]){
  if(await page.locator('[data-phase="512"]:enabled').count()){
   const before=await page.evaluate(()=>tagTest.snapshot.tag.responseNumber);
   await page.locator('[data-phase="512"]').click();
   await page.waitForFunction(n=>tagTest.snapshot.tag.responseNumber>n,before);
   console.log('VISIBLE PHASE CONTROL accepted');break;
  }
 }
 // Play one complete shared duel using legal choices from the host engine.
 let responses=0,nativeChecked=false,restoreChecked=false,autoRecoveryChecked=false;
 while(responses++<1500&&await desktop.evaluate(()=>tagTest.ui.view.phase==='duel')){
  const next=await desktop.evaluate(()=>{const e=tagTest.ui.session.engine;return e?.respondingSeat!==null&&e?.pending?JSON.parse(JSON.stringify({seat:e.respondingSeat,number:e.responseNumber,response:e.auto()},(_,v)=>typeof v==='bigint'?{__bigint:String(v)}:v)):null});
  if(!next){await desktop.waitForTimeout(100);continue}
  if(process.argv.includes('--inspect-native')&&!nativeChecked&&next.seat===0){console.log('WAIT NATIVE INPUT',next.number);await desktop.waitForFunction(n=>tagTest.ui.session.engine.responseNumber>n,next.number,{timeout:300000});nativeChecked=true;console.log('NATIVE INPUT ACCEPTED');continue}
  if(process.argv.includes('--reload-host')&&!restoreChecked&&responses>12){
   const saved=await desktop.evaluate(()=>({code:tagTest.ui.session.code,snapshot:JSON.stringify(tagTest.ui.session.engine.snapshot(),(_,v)=>typeof v==='bigint'?String(v):v)}));
   await desktop.evaluate(()=>tagTest.ui.session.pause());await mobile.waitForFunction(()=>!tagTest.ui.session.connected);
   await desktop.reload();
   if(process.argv.includes('--mobile-host')){await desktop.locator('[data-menu]:has-text("Tag duels")').waitFor({timeout:120000});await desktop.locator('[data-menu]:has-text("Tag duels")').dispatchEvent('click')}
   await desktop.locator('[data-tag="host"]').waitFor({timeout:120000});await desktop.locator('[data-tag="join"]').click();await enterCode(desktop,saved.code);await desktop.locator('[data-tag="join-room"]').click();
   await desktop.waitForFunction(()=>window.tagTest?.ui?.session?.engine&&tagTest.ui.session.connected,null,{timeout:60000});
   assert.equal(await desktop.evaluate(()=>JSON.stringify(tagTest.ui.session.engine.snapshot(),(_,v)=>typeof v==='bigint'?String(v):v)),saved.snapshot);
   restoreChecked=true;console.log('HOST RELOAD: exact active duel restored');continue;
  }
  if(!autoRecoveryChecked&&responses>12){
   const generation=await mobile.evaluate(()=>tagTest.ui.session.peer.generation);
   await mobile.evaluate(()=>{const p=tagTest.ui.session.peer;if(p.socket)p.socket.close();else p.pc.close()});
   for(const p of [desktop,mobile])await p.waitForFunction(g=>tagTest.ui.session.connected&&tagTest.ui.session.peer.generation>g,generation,{timeout:70000});
   assert.equal(await mobile.locator('.tag-duel-paused').count(),0);
   autoRecoveryChecked=true;console.log('AUTOMATIC background duel recovery; field remains visible');continue;
  }
  const page=next.seat===0?desktop:mobile;await page.evaluate(async n=>{const {decode}=await import('./tag-session.js');await tagTest.ui.session.request('duel-response',{number:n.number,response:decode(n.response)})},next);
 }
 console.log('END',responses,await desktop.evaluate(()=>tagTest.ui.view.phase));assert(responses<1500);assert.equal(await desktop.evaluate(()=>tagTest.ui.view.phase),'shop');
 for(const page of [desktop,mobile])await page.waitForFunction(()=>tagTest.ui.view.phase==='shop');
 // Reward modal and nested card inspection must return to the original reward dialog.
 for(const page of [desktop,mobile])while(await page.locator('#modal').evaluate(m=>m.open))await page.locator('#modal [data-do="close"]').click();
 await desktop.screenshot({path:path.resolve('temp/tag-offline-shop-host.png')});await mobile.screenshot({path:path.resolve('temp/tag-offline-shop-guest.png')});
 const before=await desktop.evaluate(()=>({gold:tagTest.ui.view.run.gold,count:tagTest.ui.view.run.pool.length,item:tagTest.ui.view.run.shop.findIndex(x=>x.kind==='single'&&!x.sold)}));
 const guestCount=await mobile.evaluate(()=>tagTest.ui.view.run.pool.length);
 await desktop.locator(`[data-tag="select"][data-index="${before.item}"]`).click();await desktop.locator('[data-tag="buy"]').click();
 await mobile.waitForFunction(()=>tagTest.ui.view.shopSeat===1);await mobile.screenshot({path:path.resolve('temp/tag-offline-shop-your-turn.png')});
 assert.equal(await desktop.evaluate(()=>tagTest.ui.view.run.pool.length),before.count+1);assert.equal(await mobile.evaluate(()=>tagTest.ui.view.run.pool.length),guestCount);
 const gold=await desktop.evaluate(()=>tagTest.ui.view.run.gold);await mobile.waitForFunction(g=>tagTest.ui.view.run.gold===g,gold);
 // Disconnect and resume in the middle of guest shopping; inventories and coins stay fixed.
 for(let attempt=0;attempt<(process.argv.includes('--repeat-reconnect')?5:1);attempt++){
 const gen=await mobile.evaluate(()=>tagTest.ui.session.peer.generation);await mobile.evaluate(()=>{const p=tagTest.ui.session.peer;if(p.socket)p.socket.close();else p.pc.close()});
 for(const page of [desktop,mobile])await page.waitForFunction(g=>tagTest.ui.session.connected&&tagTest.ui.session.peer.generation>g,gen,{timeout:70000});
 console.log('RECONNECTED',attempt+1);}
 assert.equal(await mobile.evaluate(()=>tagTest.ui.view.run.gold),gold);assert.equal(await mobile.evaluate(()=>tagTest.ui.view.shopSeat),1);
 // Drop a receipt after the host commits; retry must acknowledge the saved
 // result instead of applying a second shop/phase transition.
 await mobile.evaluate(()=>{const peer=tagTest.ui.session.peer,original=peer.onMessage;let dropped=false;peer.onMessage=m=>{if(!dropped&&m.kind==='receipt'){dropped=true;if(peer.socket)peer.socket.close();else peer.pc.close();return}original(m)}});
 await mobile.locator('[data-tag="buy"]').click();for(const page of [desktop,mobile])await page.waitForFunction(()=>tagTest.ui.view.phase==='draft'&&tagTest.ui.session.connected&&!tagTest.ui.working,null,{timeout:70000});
 assert.equal(await mobile.evaluate(()=>tagTest.ui.session.pending.size),0);console.log('LOST RECEIPT reconciled without duplicating the shop action');
 console.log('PASS full crossplay: character selection, concurrent drafting, separate opponents, four-seat duel, host-first shop, inventory ownership, shared coins, reconnect during shopping and next deck editor');
 assert.deepEqual(errors,[]);
 }catch(error){console.error(error);for(const p of [...browser.contexts().flatMap(c=>c.pages()),...(phoneBrowser?phoneBrowser.contexts()[0].pages():[])])console.log('STATE',await p.evaluate(()=>({text:document.body.innerText.slice(-900),session:window.tagTest?.ui?.session&&{seat:tagTest.ui.session.seat,connected:tagTest.ui.session.connected,peer:tagTest.ui.session.peer.pc?.connectionState,ice:tagTest.ui.session.peer.pc?.iceConnectionState,signal:tagTest.ui.session.peer.pc?.signalingState,channel:tagTest.ui.session.peer.channel?.readyState,trace:window.tagTrace?.slice(-35)}})));for(const [i,page]of browser.contexts().flatMap(c=>c.pages()).entries())await page.screenshot({path:path.resolve('temp/tag-failure-'+i+'.png')}).catch(()=>{});throw error}
 finally{await browser.close();if(phoneBrowser)await phoneBrowser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
