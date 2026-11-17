// Rock / Normal Monster deck rules (deck trace, 2026-11-17): Order to Charge, Silent Doom, Heart of the Underdog,
// Dust Barrier, Gigantes as an empty-field blocker, and no attack stopper stacked on an Order to Charge.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {MobileDuel,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const ok=(v,m)=>{assert(v,m);checks++};
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,race:data[id(name)]?.race,level:data[id(name)]?.level,owner:controller,position,controller,location,sequence,type:data[id(name)]?.type,...extra});
function duel(p,mine,theirs,state={}){
 const e=new MobileDuel(meta.cards),zones={[p]:mine,[1-p]:theirs};
 Object.assign(e,{data,lp:[8000,8000],turn:6,player:p,phase:4,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},state);
 const fill=(loc,list)=>{const out=Array(loc===L.SZONE?6:5).fill(null);for(const c of list||[])out[c.sequence]=c;return out};
 const z={};for(const side of [0,1]){const deck=zones[side].deck||Array.from({length:20},(_,i)=>card('Battle Ox',L.DECK,side,i,10));
  z[side]={[L.MZONE]:fill(L.MZONE,zones[side].mzone),[L.SZONE]:fill(L.SZONE,zones[side].szone),[L.HAND]:zones[side].hand||[],[L.DECK]:deck,[L.GRAVE]:zones[side].grave||[],[L.EXTRA]:zones[side].extra||[]}}
 e.query=(side,loc)=>z[side]?.[loc]||[];e.core={duelQueryCount:(_,side,loc)=>(z[side]?.[loc]||[]).filter(Boolean).length};
 return e;
}
for(const p of [0,1]){
 const o=1-p,mon=(name,side,seq,pos=1,extra)=>card(name,L.MZONE,side,seq,pos,extra),inHand=(name,seq)=>card(name,L.HAND,p,seq,10),gy=(name,seq)=>card(name,L.GRAVE,p,seq,5);
 const set=(name,seq)=>card(name,L.SZONE,p,seq,10),up=(name,seq)=>card(name,L.SZONE,p,seq,1);
 const at=(side,seq)=>({controller:side,location:L.MZONE,sequence:seq});
 const battle=(attacker,target)=>({player:o,phase:8,attackCard:at(o,attacker),attackTarget:target===null?null:at(p,target)});
 // 1. Order to Charge on their attacker when the attack costs us; not without a Normal Monster or when the attack fails.
 {
  const order=set('Order to Charge',0),sdm=mon('Skilled Dark Magician',o,0);
  ok(smartContext(duel(p,{mzone:[mon('Giant Soldier of Stone',p,0)],szone:[order]},{mzone:[sdm]},battle(0,0)),p,L).activation(order,true)>=90,'Order to Charge kills the attacker of our Giant Soldier');
  ok(smartContext(duel(p,{mzone:[mon('Emissary of the Afterlife',p,0)],szone:[order]},{mzone:[sdm]},battle(0,0)),p,L).activation(order,true)<0,'not without a Normal Monster to Tribute');
  ok(smartContext(duel(p,{mzone:[mon('Millennium Shield',p,0,4)],szone:[order]},{mzone:[sdm]},battle(0,0)),p,L).activation(order,true)<0,'not when a 3000 DEF Millennium Shield holds the attack');
 }
 // 2. Order to Charge on our turn trades a cheap Normal Monster for a much stronger one, never for a weak one.
 {
  const order=set('Order to Charge',0),beta=mon('Beta The Magnet Warrior',p,0);
  ok(smartContext(duel(p,{mzone:[beta],szone:[order]},{mzone:[mon('Blue-Eyes White Dragon',o,0)]}),p,L,{to_bp:true}).activation(order,true)>=80,'Beta for Blue-Eyes White Dragon');
  ok(smartContext(duel(p,{mzone:[beta],szone:[order]},{mzone:[mon('Battle Ox',o,0)]}),p,L,{to_bp:true}).activation(order,true)<0,'not Beta for a Battle Ox');
 }
 // 3. Order to Charge answers removal aimed at our Normal Monster, not removal aimed at another monster.
 {
  const order=set('Order to Charge',0),beta=mon('Beta The Magnet Warrior',p,0),emissary=mon('Emissary of the Afterlife',p,1),enemy={mzone:[mon('Battle Ox',o,0)]};
  const steal=t=>({player:o,phase:4,activeChain:[{player:o,code:id('Snatch Steal'),targets:[at(p,t)]}]});
  ok(smartContext(duel(p,{mzone:[beta,emissary],szone:[order]},enemy,steal(0)),p,L).activation(order,true)>=95,'Snatch Steal on Beta: Tribute it in answer');
  ok(smartContext(duel(p,{mzone:[beta,emissary],szone:[order]},enemy,steal(1)),p,L).activation(order,true)<0,'Snatch Steal on Emissary: hold it');
 }
 // 4. Order to Charge Tributes the cheapest Normal Monster, and kills the bigger monster behind a weak attacker
 //    when the attacked Normal Monster is the Tribute; otherwise the attacker.
 {
  const order=set('Order to Charge',0),soldier=mon('Giant Soldier of Stone',p,0),golem=mon('Millennium Golem',p,1);
  const fx={effect:{code:id('Order to Charge'),player:p}};
  let t=smartContext(duel(p,{mzone:[soldier,golem],szone:[order]},{mzone:[mon('Battle Ox',o,0)]},fx),p,L);
  ok(t.targetScore('Order to Charge',soldier,{})>t.targetScore('Order to Charge',golem,{}),'Tributes Giant Soldier, not Millennium Golem');
  const overdrive=mon('Overdrive',o,0),pendulum=mon('Blue-Eyes White Dragon',o,1);
  t=smartContext(duel(p,{mzone:[soldier],szone:[order]},{mzone:[overdrive,pendulum]},{...battle(0,0),...fx}),p,L);
  ok(t.targetScore('Order to Charge',pendulum,{})>t.targetScore('Order to Charge',overdrive,{}),'Blue-Eyes White Dragon behind the attacking Overdrive');
  ok(t.activation(order,true)>=90,'and it is worth it while Giant Soldier is attacked');
  t=smartContext(duel(p,{mzone:[soldier],szone:[order]},{mzone:[overdrive,mon('Battle Ox',o,1)]},{...battle(0,0),...fx}),p,L);
  ok(t.targetScore('Order to Charge',overdrive,{})>t.targetScore('Order to Charge',mon('Battle Ox',o,1),{}),'no bigger monster behind it: the attacker');
 }
 // 5. No attack stopper on top of our Order to Charge, which already destroys the attacker.
 {
  const negate=card('Negate Attack',L.SZONE,p,1,10),mine={mzone:[mon('Giant Soldier of Stone',p,0)],szone:[set('Order to Charge',0),negate]},enemy={mzone:[mon('Skilled Dark Magician',o,0)]};
  ok(smartContext(duel(p,mine,enemy,{...battle(0,0),activeChain:[{player:p,code:id('Order to Charge'),targets:[at(p,0)]}]}),p,L).activation(negate,true)<0,'Negate Attack waits after Order to Charge');
  ok(smartContext(duel(p,mine,enemy,battle(0,0)),p,L).activation(negate,true)>=0,'Negate Attack on its own still stops the attack');
 }
 // 6. Silent Doom: a wall on an empty field, the Tribute a Monarch needs, and the best DEF; never an Effect Monster.
 {
  const doom=inHand('Silent Doom',0),enemy={mzone:[mon('Gemini Elf',o,0)]};
  ok(smartContext(duel(p,{hand:[doom],grave:[gy('Millennium Shield',0)]},enemy),p,L,{to_bp:true}).activation(doom,false)>=78,'a Millennium Shield wall against Gemini Elf');
  ok(smartContext(duel(p,{hand:[doom],grave:[gy('Emissary of the Afterlife',0)]},enemy),p,L,{to_bp:true}).activation(doom,false)<0,'Emissary is no Normal Monster');
  ok(smartContext(duel(p,{mzone:[mon('Millennium Golem',p,0,4)],hand:[doom],grave:[gy('Giant Soldier of Stone',0)]},{mzone:[],szone:[]}),p,L,{to_bp:true}).activation(doom,false)<0,'not with a wall up and nothing to block');
  const granmarg=inHand('Granmarg the Rock Monarch',1),setCard=card('Mirror Force',L.SZONE,o,0,10);
  ok(smartContext(duel(p,{hand:[doom,granmarg],grave:[gy('Giant Soldier of Stone',0)]},{mzone:[],szone:[setCard]}),p,L,{to_bp:true}).activation(doom,false)>=80,'the Tribute for Granmarg with a Set card to hit');
  const t=smartContext(duel(p,{hand:[doom],grave:[gy('Beta The Magnet Warrior',0),gy('Millennium Shield',1)]},enemy,{effect:{code:id('Silent Doom'),player:p}}),p,L);
  ok(t.targetScore('Silent Doom',gy('Millennium Shield',1),{})>t.targetScore('Silent Doom',gy('Beta The Magnet Warrior',0),{}),'revives Millennium Shield over Beta');
 }
 // 7. Heart of the Underdog: one copy, for a Deck with Normal Monsters, and its Draw Phase draw.
 {
  const heart=inHand('Heart of the Underdog',0);
  ok(smartContext(duel(p,{hand:[heart]},{mzone:[]}),p,L).activation(heart,false)>=0,'set up with a Deck of Normal Monsters');
  ok(smartContext(duel(p,{hand:[heart],szone:[up('Heart of the Underdog',0)]},{mzone:[]}),p,L).activation(heart,false)<0,'not a second copy');
  const effects=Array.from({length:20},(_,i)=>card('Spirit Caller',L.DECK,p,i,10));
  ok(smartContext(duel(p,{hand:[heart],deck:effects},{mzone:[]}),p,L).activation(heart,false)<0,'not with no Normal Monster in the Deck');
  const live=up('Heart of the Underdog',0);
  ok(smartContext(duel(p,{szone:[live]},{mzone:[]},{phase:1}),p,L).activation(live,true)>=0,'draws in the Draw Phase');
 }
 // 8. Dust Barrier: after battle, guarding a Normal Monster, when they show no Normal Monster of their own.
 {
  const barrier=inHand('Dust Barrier',0),golem=mon('Millennium Golem',p,0);
  ok(smartContext(duel(p,{mzone:[golem],hand:[barrier]},{mzone:[mon('Skilled Dark Magician',o,0)]},{phase:256}),p,L).activation(barrier,false)>=0,'guards Millennium Golem in Main Phase 2');
  ok(smartContext(duel(p,{mzone:[golem],hand:[barrier]},{mzone:[mon('Battle Ox',o,0)]},{phase:256}),p,L).activation(barrier,false)<0,'not while their Battle Ox would ignore our Spells');
  ok(smartContext(duel(p,{mzone:[golem],hand:[barrier]},{mzone:[mon('Skilled Dark Magician',o,0)]}),p,L,{to_bp:true}).activation(barrier,false)<0,'not before battle');
 }
 // 9. Gigantes blocks on an empty field; with a monster out it must still be worth attacking with.
 {
  const gigantes=inHand('Gigantes',0),dm=mon('Dark Magician',o,0);
  ok(smartContext(duel(p,{hand:[gigantes],grave:[gy('Giant Soldier of Stone',0)]},{mzone:[dm]}),p,L).summonUtility(gigantes)===true,'Gigantes blocks Dark Magician on an empty field');
  ok(smartContext(duel(p,{mzone:[mon('Millennium Shield',p,0,4)],hand:[gigantes],grave:[gy('Giant Soldier of Stone',0)]},{mzone:[dm]}),p,L).summonUtility(gigantes)!==true,'not as a blocker behind Millennium Shield');
 }
}
console.log(`PASS ${checks} Rock deck rule cases for both sides`);
