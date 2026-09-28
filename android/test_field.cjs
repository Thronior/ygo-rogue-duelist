const {chromium}=require('C:/Users/Win/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});const p=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});try{await p.goto('http://127.0.0.1:4181');await p.waitForFunction(()=>window.shadowTest,{timeout:90000});
await p.evaluate(async()=>{const mod=await import('./duel.js');window.rules=mod;const meta=await fetch('content.json').then(r=>r.json());const id=n=>meta.cards.find(c=>c.name===n).id;const original=mod.MobileDuel.prototype.start;mod.MobileDuel.prototype.start=function(...a){a[0]=Array(25).fill(id('Servant of Catabolism'));a[1]=Array(25).fill(id('Skull Servant'));a[2]=8000;a[3]=8000;a[5]=42;a[8]='';return original.apply(this,a)};await shadowTest.command('new',0);await shadowTest.startDuel(false,shadowTest.state().run.routes[0])});
let direct=false,target=false,attack=false,turn=false;
// Observe actual core events while real DOM choices respond to real prompts.
await p.evaluate(()=>{const e=shadowTest.engine(),old=e.onMessage;e.onMessage=function(m){(window.seen ||= []).push(m.type);old.call(this,m)}});
for(let i=0;i<180&&!target;i++){
 await p.waitForTimeout(400);const info=await p.evaluate(()=>{const e=shadowTest.engine(),m=e.pending;return {player:m?.player,type:m?.type,direct:Number(m?.description)===31,field:!!document.querySelector('[data-field-target]'),stage:shadowTest.state().run.stage}});
 if(info.stage!=='duel')throw Error('Duel ended before targeting');
 if(info.player===1){await p.waitForTimeout(250);continue}
 if(info.direct){assert.match(await p.locator('.prompt').innerText(),/Attack directly/);await p.locator('[data-do="response"][data-response="1"]').tap();await p.waitForTimeout(1200);direct=true;continue}
 if(info.field){assert.equal(await p.locator('.prompt').count(),0);const zone=p.locator('[data-field-target]').first();await zone.tap();await p.waitForTimeout(2400);target=true;console.log('PASS attack target selected directly on real field');break}
 await p.evaluate(async()=>{const e=shadowTest.engine(),{M,R,B}=rules,m=e.pending;if(m.player!==0)return;let response=e.auto();if(m.type===M.SELECT_BATTLECMD&&m.attacks.length)response={type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index:0};await shadowTest.respond(response)});
}
assert(direct,'No direct-or-monster choice tested');assert(target,'No field attack target tested');const seen=await p.evaluate(()=>({attack:seen.includes(rules.M.ATTACK),turn:seen.includes(rules.M.NEW_TURN),errors:shadowTest.engine().errors}));assert(seen.attack);assert(seen.turn);assert.deepEqual(seen.errors,[]);console.log('PASS optional direct attack -> No -> field target; real turn/attack animation events');
await p.screenshot({path:'android/build/field-targeting.png'});
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
