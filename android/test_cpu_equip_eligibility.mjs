import fs from 'node:fs';import assert from 'node:assert/strict';
import {MobileDuel,M,I,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[4000,5300],player:p,turn:3,phase:4,activeChain:[],battleProtected:[false,false]});let zones={};e.query=(s,l)=>zones[s+':'+l]||[];
 const c=(n,l=L.MZONE,side=p)=>({code:id(n),controller:side,location:l,sequence:0,position:1,attack:data[id(n)].attack,defense:data[id(n)].defense});
 const put=(s,l,...cards)=>zones[s+':'+l]=cards;
 for(const [spell,valid,invalid] of [['Dark Energy','Summoned Skull','Blue-Eyes White Dragon'],['Dragon Treasure','Blue-Eyes White Dragon','Summoned Skull'],['Invigoration','Battle Ox','Blue-Eyes White Dragon'],['Salamandra','Flame Swordsman','Blue-Eyes White Dragon'],['Machine Conversion Factory','Jinzo','Blue-Eyes White Dragon'],['Book of Secret Arts','Dark Magician','Blue-Eyes White Dragon']]){
  zones={};const source=c(spell,L.HAND);put(p,L.HAND,source);put(p,L.MZONE,c(invalid));put(1-p,L.MZONE,c(valid,L.MZONE,1-p));
  assert(smartContext(e,p,L).activation(source)<0,spell+' must not activate just to buff enemy');checks++;
  const own=c(valid),enemy=c(valid,L.MZONE,1-p);enemy.attack=9000;put(p,L.MZONE,own);put(1-p,L.MZONE,enemy);
  assert(smartContext(e,p,L).activation(source)>=0,spell+' usable on eligible own monster');checks++;
  e.effect={code:source.code,player:p};e.selectionHint=518;
  assert.deepEqual(e.auto({type:M.SELECT_CARD,player:p,min:1,max:1,selects:[enemy,own],can_cancel:false}).indicies,[1]);checks++;
  own.position=8;assert(smartContext(e,p,L).activation(source)<0,spell+' cannot use facedown monster');checks++;
 }
 zones={};put(p,L.MZONE,c('Blue-Eyes White Dragon'));put(1-p,L.MZONE,c('Summoned Skull',L.MZONE,1-p));e.effect={code:id('Snatch Steal'),player:p};e.selectionHint=518;
 assert.deepEqual(e.auto({type:M.SELECT_CARD,player:p,min:1,max:1,selects:[...e.query(p,L.MZONE),...e.query(1-p,L.MZONE)],can_cancel:false}).indicies,[1]);checks++;
 // Use the current race, not the printed race, when a field effect changes it.
 const changed=c('Blue-Eyes White Dragon');changed.race=8;put(p,L.MZONE,changed);assert(smartContext(e,p,L).activation(c('Dark Energy',L.HAND))>=0);checks++;
 changed.race=8192;assert(smartContext(e,p,L).activation(c('Dark Energy',L.HAND))<0);checks++;
}
const engine=await new MobileDuel(meta.cards).init([data,read('scripts')]);
try{for(const p of [0,1]){
 const setup=`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) e:Reset()
 Duel.MoveToField(Duel.CreateToken(${p},${id('Blue-Eyes White Dragon')}),${p},${p},LOCATION_MZONE,POS_FACEUP_ATTACK,true)
 Duel.MoveToField(Duel.CreateToken(${1-p},${id('Summoned Skull')}),${1-p},${1-p},LOCATION_MZONE,POS_FACEUP_ATTACK,true)
 Duel.SendtoHand(Duel.CreateToken(${p},${id('Dark Energy')}),${p},REASON_RULE)
 end) Duel.RegisterEffect(e,0)`;
 engine.start(Array(40).fill(id('Blue-Eyes White Dragon')),Array(40).fill(id('Blue-Eyes White Dragon')),8000,8000,5,123,[],[],setup);
 let reached=false;
 for(let n=0;n<300&&!engine.finished;n++){
  const m=engine.pending;
  if(m?.type===M.SELECT_IDLECMD&&m.player===p){
   const index=m.activates.findIndex(c=>c.code===id('Dark Energy'));assert(index>=0,'Core legally offers equip because enemy is eligible');
   const choice=engine.auto();assert(!(choice.action===I.SELECT_ACTIVATE&&choice.index===index),'CPU must decline enemy-only equip');
   reached=true;checks++;break;
  }
  engine.respond(engine.auto());
 }
 assert(reached);assert.deepEqual(engine.errors,[]);engine.destroy();
}}finally{engine.destroy()}
console.log('PASS',checks,'equip activation/targets: both seats, restricted types/attributes, changed race, facedown targets, hostile equip and real core enemy-only activation');
