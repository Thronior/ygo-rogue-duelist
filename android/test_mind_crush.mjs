// Pre-errata Mind Crush: a Trap that names any card, shows you the opponent's hand, and costs you a card on a miss.
import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,R,I,L} from './web/duel.js';
const json=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8').replace(/^\uFEFF/,''));
const meta=json('./web/content.json'),data=json('./web/engine-data.json');const id=n=>meta.cards.find(c=>c.name===n).id;
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('./web/scripts.json')]);
const OX=id('Battle Ox'),MC=id('Mind Crush'),POT=id('Pot of Greed'),EXTRA=id('Blue-Eyes Ultimate Dragon');
const setTurn='local e0=Effect.GlobalEffect() e0:SetType(EFFECT_TYPE_FIELD) e0:SetCode(EFFECT_TRAP_ACT_IN_SET_TURN) e0:SetProperty(EFFECT_FLAG_SET_AVAILABLE) e0:SetTargetRange(LOCATION_SZONE,LOCATION_SZONE) Duel.RegisterEffect(e0,0)';
const crush=declare=>{let s=e.start(Array(40).fill(MC),Array(40).fill(OX),8000,8000,5,3,[],[],setTurn);const idle=()=>{for(let i=0;i<40&&(e.pending?.type!==M.SELECT_IDLECMD||e.pending?.player!==0);i++)s=e.respond(e.auto())};
 idle();s=e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SPELL_SET,index:0});for(let i=0;i<4&&e.pending?.type===M.SELECT_PLACE;i++)s=e.respond(e.auto());idle();
 const k=e.pending.activates.findIndex(c=>c.code===MC);assert(k>=0,'the Set Mind Crush can activate');s=e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k});
 for(let i=0;i<8&&e.pending&&e.pending.type!==M.ANNOUNCE_CARD;i++)s=e.respond(e.auto());assert.equal(e.pending?.type,M.ANNOUNCE_CARD,'it asks for a card name');
 const choices=e.choices(e.pending),before=[e.query(0,L.HAND).filter(Boolean).length,e.query(1,L.HAND).filter(Boolean).length];e.visuals.splice(0);const pick=choices.find(x=>x.response.card===declare);assert(pick,'that name is on the list');
 s=e.respond(pick.response);for(let i=0;i<10&&e.pending&&e.pending.type!==M.SELECT_IDLECMD;i++)s=e.respond(e.auto());
 const after=[e.query(0,L.HAND).filter(Boolean).length,e.query(1,L.HAND).filter(Boolean).length],shown=e.visuals.filter(v=>v.kind==='reveal').flatMap(v=>v.cards||[]).length;assert.deepEqual(e.errors.filter(x=>x.trim()),[]);return {choices:choices.length,before,after,shown}};
const hit=crush(OX);assert.equal(hit.after[1],0,'every copy leaves their hand');assert.equal(hit.after[0],hit.before[0],'a hit costs you nothing');assert.ok(hit.shown>0,'their hand is shown');
const miss=crush(POT);assert.equal(miss.after[1],miss.before[1],'their hand stays');assert.equal(miss.after[0],miss.before[0]-1,'a miss discards 1 of yours');assert.ok(miss.shown>0,'their hand is shown on a miss too');
assert.ok(hit.choices>2000,'any card name can be declared');assert.ok(crush(EXTRA).choices>2000,'Extra Deck names can be declared too');
e.destroy();console.log(`PASS Mind Crush: ${hit.choices} names, hit and miss`);
