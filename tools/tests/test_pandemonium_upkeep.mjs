import fs from 'node:fs';
import assert from 'node:assert/strict';
import {MobileDuel,M,R} from '../../android/web/duel.js';
// Pandemonium waives Archfiend Standby costs; only a non-battle destruction may offer its search.
const read=n=>JSON.parse(fs.readFileSync(new URL('../../android/web/'+n+'.json',import.meta.url),'utf8'));
const cards=read('content'),id=n=>cards.cards.find(c=>c.name===n).id;
const pandemonium=id('Pandemonium'),desrook=id('Desrook Archfiend'),vilepawn=id('Vilepawn Archfiend'),terrorking=id('Terrorking Archfiend'),filler=id('Giant Soldier of Stone');
const source=fs.readFileSync(new URL('../../runtime/script/official/c94585852.lua',import.meta.url),'utf8');
assert.equal(read('scripts')['c94585852.lua'].trimEnd(),source.trimEnd(),'the runtime Pandemonium script must match its source');
// A second Standby effect makes the player order Desrook's upkeep, as in the player report.
// With destroy, that effect destroys Desrook instead of doing nothing.
function setup(destroy){
 return `local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START+PHASE_DRAW) e:SetOperation(function(e) e:Reset()
 Duel.MoveToField(Duel.CreateToken(0,${pandemonium}),0,0,LOCATION_FZONE,POS_FACEUP,true)
 Duel.MoveToField(Duel.CreateToken(0,${desrook}),0,0,LOCATION_MZONE,POS_FACEUP_ATTACK,true)
 local f=Duel.CreateToken(0,${filler}) Duel.MoveToField(f,0,0,LOCATION_MZONE,POS_FACEUP_ATTACK,true)
 local t=Effect.CreateEffect(f) t:SetDescription(1160) t:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_TRIGGER_O) t:SetCode(EVENT_PHASE+PHASE_STANDBY) t:SetRange(LOCATION_MZONE) t:SetCountLimit(1)
 t:SetCondition(function(e,tp) return Duel.IsTurnPlayer(tp) end)
 t:SetOperation(function() ${destroy?`Duel.Destroy(Duel.GetFirstMatchingCard(Card.IsCode,0,LOCATION_MZONE,0,nil,${desrook}),REASON_EFFECT)`:''} end) f:RegisterEffect(t) end) Duel.RegisterEffect(e,0)`;
}
function run(destroy){
 const engine=new MobileDuel(cards.cards);
 return engine.init([read('engine-data'),read('scripts')]).then(()=>{
  try{
   // The deck's last cards are drawn first, so the Archfiends stay in the Deck.
   engine.start([vilepawn,vilepawn,terrorking,terrorking,...Array(36).fill(filler)],Array(40).fill(filler),10000,10000,5,185,[],[],setup(destroy),5);
   const searches=[],choices=[];
   for(let i=0;i<300;i++){
    const m=engine.pending;if(m?.type===M.SELECT_IDLECMD&&m.player===0)break;
    let response=engine.auto();
    if(m.player===0&&m.type===M.SELECT_CHAIN&&m.forced){const first=destroy?filler:desrook;response={type:R.SELECT_CHAIN,index:Math.max(0,m.selects.findIndex(s=>s.code===first))}}
    else if(m.player===0&&m.type===M.SELECT_EFFECTYN){if(m.code===pandemonium&&Number(m.description)!==218)searches.push(m);response={type:R.SELECT_EFFECTYN,yes:true}}
    else if(m.player===0&&m.type===M.SELECT_CHAIN&&m.selects.some(s=>s.code===pandemonium)){searches.push(m);response={type:R.SELECT_CHAIN,index:m.selects.findIndex(s=>s.code===pandemonium)}}
    else if(m.player===0&&m.type===M.SELECT_CARD)choices.push(m.selects.map(s=>s.code));
    else if(m.type===M.SELECT_CHAIN&&!m.forced)response={type:R.SELECT_CHAIN,index:null};
    engine.respond(response);
   }
   assert.deepEqual(engine.errors,[]);
   return {lp:engine.lp[0],searches:searches.length,choices};
  }finally{engine.destroy()}
 });
}
const waived=await run(false);
assert.equal(waived.lp,10000,'Pandemonium waives Desrook Archfiend’s 500 LP Standby cost');
assert.equal(waived.searches,0,'waiving an upkeep cost destroys nothing, so Pandemonium must not offer its search');
assert.deepEqual(waived.choices,[],'no Archfiend is searched after a waived cost');
console.log('PASS Pandemonium waives Desrook’s upkeep without offering a search');
const destroyed=await run(true);
assert.equal(destroyed.searches,1,'a non-battle destruction of an Archfiend offers Pandemonium’s search');
assert.deepEqual(destroyed.choices,[[vilepawn,vilepawn]],'the search only offers Archfiends with a lower Level than the destroyed Level 3 Desrook');
console.log('PASS destroying Desrook by effect offers only lower-Level Archfiends');
