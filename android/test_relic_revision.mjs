import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M} from './web/duel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),id=n=>meta.cards.find(c=>c.name===n).id;
const fixtures=JSON.parse(fs.readFileSync(new URL('../temp/relic-fixtures.json',import.meta.url)));
const e=await new MobileDuel(meta.cards).init([read('engine-data'),read('scripts')]);
try{
 const burn=`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PREDRAW) e:SetCountLimit(1) e:SetOperation(function() Duel.Damage(0,9000,REASON_EFFECT) end) Duel.RegisterEffect(e,0)`;
 let s=e.start(Array(40).fill(id('Battle Ox')),Array(40).fill(id('Petit Dragon')),8000,8000,5,17,[],[],fixtures.phoenix_rebirth+'\n'+burn,1);
 assert.equal(s.lp[0],1000);assert(!s.finished);assert(e.events.some(e=>e.kind==='relic_used'));assert.equal(s.players[1].hand.length,1);
 for(let i=0;i<120&&!s.finished;i++)s=e.respond(e.auto());
 assert.equal(e.errors.length,0);assert.equal(s.finished?.player,1,'Second lethal hit must end the duel');assert.equal(e.events.filter(x=>x.kind==='relic_used').length,1);console.log('PASS Phoenix revives lethal effect damage once; enemy one-card opening works');
}finally{e.destroy()}
