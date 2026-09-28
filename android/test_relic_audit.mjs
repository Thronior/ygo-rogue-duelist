import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,R,I,L} from './web/duel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),id=n=>meta.cards.find(c=>c.name===n).id;
const fixtures=JSON.parse(fs.readFileSync(new URL('../temp/relic-fixtures.json',import.meta.url)));
const e=await new MobileDuel(meta.cards).init([read('engine-data'),read('scripts')]);let checks=0;
for(const [name,lua] of Object.entries(fixtures)){
 try{let s=e.start(Array(40).fill(id('Battle Ox')),Array(40).fill(id('Petit Dragon')),8000,8000,5,17,[],[],lua+(name==='faulty_pair'?` local a=Duel.GetFieldCard(0,LOCATION_DECK,0) local b=Duel.GetFieldCard(0,LOCATION_DECK,1) local f=Effect.GlobalEffect() f:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) f:SetCode(EVENT_PREDRAW) f:SetCountLimit(1) f:SetOperation(function() Duel.SpecialSummon(a,0,0,0,false,false,POS_FACEUP_ATTACK) Duel.SpecialSummon(b,0,0,0,false,false,POS_FACEUP_ATTACK) end) Duel.RegisterEffect(f,0)`:''));
 if(name==='faulty_pair'){for(let j=0;j<12&&e.query(0,L.MZONE).filter(Boolean).length<2;j++)s=e.respond(e.auto());const cards=e.query(0,L.MZONE).filter(Boolean);assert.equal(cards.filter(c=>c.attack===2200).length,1,'Only one copy is misprinted');assert.equal(cards.filter(c=>c.attack===1700).length,1);}
 for(let i=0;i<50&&!s.finished;i++)s=e.respond(e.auto());assert.deepEqual(e.errors,[],name);checks++;}
 finally{e.destroy()}
}
// Lethal battle damage must retain the actual attacking card and amount.
try{let s=e.start(Array(40).fill(id('Petit Dragon')),Array(40).fill(id('Battle Ox')),500,8000,5,17,[],[],fixtures.urn);
 for(let i=0;i<160&&!s.finished;i++){const m=e.pending;let r=m.player===0&&m.type===M.SELECT_IDLECMD?{type:R.SELECT_IDLECMD,action:I.TO_EP,index:null}:m.type===M.SELECT_CHAIN?{type:R.SELECT_CHAIN,index:null}:e.auto();s=e.respond(r)}
 assert.equal(s.finished?.reason,1);assert(e.events.some(x=>x.kind==='loss_source'&&x.battle&&x.card===id('Battle Ox')));assert(e.events.some(x=>x.kind==='loss_damage'&&x.amount===1700));assert.deepEqual(e.errors,[]);
}finally{e.destroy()}
console.log('PASS',checks,'relic scripts, per-copy printer stats and real lethal battle attribution');
