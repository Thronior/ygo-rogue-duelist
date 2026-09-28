import fs from 'node:fs';import assert from 'node:assert/strict';
import {MobileDuel,M,R,I} from './web/duel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url)));
const meta=read('content'),f=read('test-fixture');const e=await new MobileDuel(meta.cards).init([read('engine-data'),read('scripts')]);
try{
 for(const [label,deck] of [['normal',f.strong],['copycat',f.copy]]){
  let s=e.start(deck,f.enemy,8000,2000,5,13,[],[],f.passives);let log=[],checkpoint;
  for(let i=0;i<2500&&!s.finished;i++){const r=e.auto();log.push(r);s=e.respond(r);if(i===10)checkpoint=JSON.stringify(s,(k,v)=>typeof v==='bigint'?String(v):v)}
  assert(s.finished,label+' duel stalled');assert.equal(s.finished.player,0);assert.equal(e.errors.length,0,e.errors.join('\n'));assert(e.summary().some(x=>x.kind==='damage')||s.finished.reason===2,'Victory must damage the enemy or deck them out');e.destroy();
  e.start(deck,f.enemy,8000,2000,5,13,[],[],f.passives);for(const r of log.slice(0,11))s=e.respond(r);assert.equal(JSON.stringify(s,(k,v)=>typeof v==='bigint'?String(v):v),checkpoint);e.destroy();console.log('PASS',label,'full duel and exact response replay',log.length);
 }
 const c=meta.cards.find(c=>c.name==='Battle Ox'),bonus='do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD) e:SetCode(EFFECT_UPDATE_ATTACK) e:SetTargetRange(LOCATION_MZONE,0) e:SetValue(300) Duel.RegisterEffect(e,0) end';
 let s=e.start(Array(20).fill(c.id),f.enemy,8000,2000,5,18,[],[],bonus);
 for(let i=0;i<30&&!s.players[0].monsters.some(Boolean);i++)s=e.respond(e.auto());assert.equal(s.players[0].monsters.find(Boolean).attack,c.atk+300);assert.equal(e.errors.length,0);console.log('PASS persistent relic effect executes inside the real core');
}catch(err){console.error(err);console.error('Pending',e.pending);process.exitCode=1}finally{e.destroy()}
