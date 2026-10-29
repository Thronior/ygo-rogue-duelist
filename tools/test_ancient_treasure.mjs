import fs from 'node:fs';import assert from 'node:assert/strict';
import {CARD,COIN_HINT,coinSpellValue} from '../android/web/custom-card-policy.js';
const root=new URL('../',import.meta.url),web=new URL('android/web/',root);
const read=name=>JSON.parse(fs.readFileSync(new URL(name+'.json',web),'utf8'));
const {MobileDuel,M,R,I,L}=await import('../android/web/duel.js');
const content=read('content'),data=read('engine-data'),scripts=read('scripts');
assert.equal(data[CARD].type,2);
const card=content.cards.find(c=>c.id===CARD);assert.equal(card.name,'Ancient Treasure');
data[CARD]=card.data;assert.ok(scripts[`c${CARD}.lua`]);
const byName=n=>content.cards.find(c=>c.name===n).id;
const e=await new MobileDuel(content.cards).init([data,scripts]);
let totals=[0,0],observed=[];const base=e.onMessage.bind(e);
e.onMessage=m=>{observed.push(m);if(m.type===M.HINT&&m.hint_type===2&&Number(m.hint)===COIN_HINT)totals[m.player]+=50;base(m)};
const normal=byName('Giant Soldier of Stone');
function begin({support=null,position=1,negated=false,jammer=false,side=0,copies=1}={}){
 e.destroy();totals=[0,0];observed=[];
 const setup=`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START+PHASE_DRAW) e:SetOperation(function(e) e:Reset()
 for i=1,${copies} do Duel.SendtoHand(Duel.CreateToken(${side},${CARD}),${side},REASON_RULE) end
 ${support?`Duel.MoveToField(Duel.CreateToken(${side},${byName(support)}),${side},${side},${support==='Spell Absorption'?'LOCATION_SZONE':'LOCATION_MZONE'},${position},true)`:''}
 ${negated?`Duel.MoveToField(Duel.CreateToken(1,61740673),1,1,LOCATION_SZONE,POS_FACEUP_ATTACK,true)`:''}
 ${jammer?`Duel.MoveToField(Duel.CreateToken(1,${byName('Magic Jammer')}),1,1,LOCATION_SZONE,POS_FACEDOWN_DEFENSE,true)`:''}
 end) Duel.RegisterEffect(e,0)`;
 e.start(Array(40).fill(normal),Array(40).fill(normal),8000,8000,5,185,[],[],setup);
 for(let i=0;i<150;i++){if(e.pending?.type===M.SELECT_IDLECMD&&e.pending.player===side)return;e.respond(e.auto())}
 throw Error('Failed to reach actor Main Phase');
}
function activate({jammer=false}={}){
 const i=e.pending.activates.findIndex(c=>c.code===CARD);assert.ok(i>=0,'Card legal to activate');
 e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:i});
 for(let steps=0;steps<100;steps++){
  if(e.pending?.type===M.SELECT_IDLECMD)return;
  const m=e.pending;
  if(m.type===M.SELECT_CHAIN){const j=jammer?m.selects.findIndex(c=>c.code===byName('Magic Jammer')):-1;e.respond({type:R.SELECT_CHAIN,index:j>=0?j:null});}
  else e.respond(e.auto());
 }throw Error('Activation did not finish');
}
const results=[];
try{
 begin({copies:2});const a=e.auto();assert.ok(!(a.action===I.SELECT_ACTIVATE&&e.pending.activates[a.index]?.code===CARD));activate();assert.deepEqual(totals,[50,0]);activate();assert.deepEqual(totals,[100,0]);assert.equal(e.summary().filter(x=>x.kind==='ancient_treasure').length,2);assert.equal(e.query(0,L.GRAVE).filter(c=>c?.code===CARD).length,2);results.push('Normal resolution gives exactly 50 coins; two resolutions give 100; card goes to Graveyard.');
 begin({negated:true});activate();assert.deepEqual(totals,[0,0]);results.push('Imperial Order negation gives no coins.');
 begin({jammer:true});activate({jammer:true});assert.deepEqual(totals,[0,0]);assert.ok(observed.some(m=>m.type===M.CHAIN_NEGATED));results.push('Magic Jammer activation negation gives no coins.');
 begin({support:'Royal Magical Library'});let r=e.auto();assert.equal(r.action,I.SELECT_ACTIVATE);assert.equal(e.pending.activates[r.index].code,CARD);activate();const lib=e.query(0,L.MZONE).find(c=>c?.code===byName('Royal Magical Library'));assert.equal(lib.counters[1],1);assert.deepEqual(totals,[50,0]);results.push('CPU activates for Royal Magical Library and the real engine adds a Spell Counter.');
 begin({support:'Breaker the Magical Warrior'});assert.equal(coinSpellValue(e,0,L),-1);results.push('CPU does not treat Breaker as a Spell-activation payoff.');
 begin({support:'Royal Magical Library',position:8});assert.equal(coinSpellValue(e,0,L),-1);results.push('Face-down payoff does not justify CPU activation.');
 begin({support:'Spell Absorption'});assert.ok(coinSpellValue(e,0,L)>0);activate();assert.equal(e.lp[0],8500);assert.deepEqual(totals,[50,0]);results.push('Spell Absorption heals 500 LP alongside the 50 coins.');
 begin({side:1,support:'Royal Magical Library'});r=e.auto();assert.equal(r.action,I.SELECT_ACTIVATE);assert.equal(e.pending.activates[r.index].code,CARD);activate();assert.deepEqual(totals,[0,50]);results.push('CPU-owned activation is attributed to the CPU, not the human wallet.');
 assert.deepEqual(e.errors,[]);for(const result of results)console.log('PASS '+result);
}finally{e.destroy()}
