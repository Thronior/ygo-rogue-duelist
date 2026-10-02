import fs from 'node:fs';
import assert from 'node:assert/strict';
import {MobileDuel,L,M} from '../android/web/duel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../android/web/'+n+'.json',import.meta.url),'utf8'));
const content=read('content'),candidate=JSON.parse(fs.readFileSync(new URL('./fixtures/wct2004-regressions.json',import.meta.url),'utf8')).find(x=>x.candidate===19&&x.seed===20271211&&x.seat===1),enemy={main:candidate.enemyMain,extra:candidate.enemyExtra},seed=20271211;
function shuffle(cards,seed){let s=seed>>>0,a=[...cards];for(let i=a.length-1;i>0;i--){s=(Math.imul(s,1664525)+1013904223)>>>0;let j=Math.floor(s/4294967296*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const e=await new MobileDuel(content.cards).init([read('engine-data'),read('scripts')]);
const observed=[];const original=e.onMessage.bind(e);e.onMessage=m=>{observed.push(m);original(m);};
e.start(shuffle(enemy.main,seed+731),shuffle(candidate.main,seed),8000,8000,5,seed,enemy.extra,candidate.extra);
let injected=false,reborn=[];for(let steps=0;steps<200&&!e.finished;steps++){
 reborn.push(...[0,1].flatMap(p=>e.query(p,L.MZONE).filter(c=>c&&e.wasReborn(c)).map(c=>c.code)));
 e.respond(e.auto());
 if(!injected&&e.query(1,L.SZONE).some(c=>c?.code===53119267&&(c.position&5))){
  assert.equal([0,1].flatMap(p=>e.query(p,L.MZONE)).filter(c=>c&&e.wasReborn(c)).length,0,'Call of Darkness sends the revived monster to the GY');
  e.core.loadScript(e.h,'test-thorn-discard.lua',`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START+PHASE_MAIN1) e:SetOperation(function(e) e:Reset() Duel.Draw(0,2,REASON_EFFECT) local hand=Duel.GetFieldGroup(0,LOCATION_HAND,0) local group=Group.CreateGroup() local c=hand:GetFirst() for i=1,2 do if c then group:AddCard(c) c=hand:GetNext() end end Duel.SendtoGrave(group,REASON_EFFECT+REASON_DISCARD) end) Duel.RegisterEffect(e,0)`);
  injected=true;
 }
 if(injected&&observed.some(m=>m.type===M.DAMAGE&&m.player===0&&m.amount===1000))break;
}
assert.ok(reborn.length,'fixture actually revived a monster');
assert.ok(injected);assert.ok(observed.some(m=>m.type===M.DAMAGE&&m.player===0&&m.amount===1000),'Magical Thorn still deals 500 per discarded card');assert.deepEqual(e.errors,[]);e.destroy();
console.log('PASS: Call of Darkness removes the revived monster; Magical Thorn deals 1000 for two discards; no engine warnings.');
