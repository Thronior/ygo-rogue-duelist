// Snipe Hunter, Juragedo and Destiny Board discards in a Destiny Board deck (deck trace, 2026-11-06).
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {MobileDuel,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const ok=(v,m)=>{assert(v,m);checks++};
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,position,controller,location,sequence,type:data[id(name)]?.type,...extra});
// p is the CPU under test; `mine`/`theirs` hold {mzone,szone,hand,deck,grave} card lists.
function duel(p,mine,theirs,state={}){
 const e=new MobileDuel(meta.cards),zones={[p]:mine,[1-p]:theirs};
 Object.assign(e,{data,lp:[8000,8000],turn:6,player:p,phase:4,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},state);
 const fill=(loc,list)=>{const out=Array(loc===L.SZONE?6:5).fill(null);for(const c of list||[])out[c.sequence]=c;return out};
 const z={};for(const side of [0,1]){const deck=zones[side].deck||Array.from({length:20},(_,i)=>card('Battle Ox',L.DECK,side,i,10));
  z[side]={[L.MZONE]:fill(L.MZONE,zones[side].mzone),[L.SZONE]:fill(L.SZONE,zones[side].szone),[L.HAND]:zones[side].hand||[],[L.DECK]:deck,[L.GRAVE]:zones[side].grave||[]}}
 e.query=(side,loc)=>z[side]?.[loc]||[];e.core={duelQueryCount:(_,side,loc)=>(z[side]?.[loc]||[]).filter(Boolean).length};
 return e;
}
const at=c=>({controller:c.controller,location:c.location,sequence:c.sequence});
for(const p of [0,1]){
 const o=1-p,mon=(name,side,seq,pos=1,extra)=>card(name,L.MZONE,side,seq,pos,extra),inHand=(name,seq)=>card(name,L.HAND,p,seq,10);
 const snipe=mon('Snipe Hunter',p,0);
 // 1. Snipe Hunter fires on a threat it cannot beat in battle, with a cheap discard, and targets their card.
 {
  const neo=mon('Neo the Magic Swordsman',o,0);
  let e=duel(p,{mzone:[snipe],hand:[inHand('Kuriboh',0)]},{mzone:[neo]});
  const ctx=smartContext(e,p,L,{to_bp:true});
  ok(ctx.activation(snipe,false)>=80,'Snipe Hunter discards Kuriboh to shoot Neo');
  e=duel(p,{mzone:[snipe],hand:[inHand('Kuriboh',0)]},{mzone:[neo]},{effect:{code:id('Snipe Hunter'),player:p}});
  const t=smartContext(e,p,L,{to_bp:true});
  ok(t.targetScore('Snipe Hunter',neo,{})>t.targetScore('Snipe Hunter',snipe,{}),'it shoots their monster, never itself');
  e=duel(p,{mzone:[snipe],hand:[inHand('Kuriboh',0)]},{mzone:[mon('Goblin Attack Force',o,0,4)]});
  ok(smartContext(e,p,L,{to_bp:true}).activation(snipe,false)<0,'not on a 0 DEF monster it destroys in battle anyway');
  e=duel(p,{mzone:[snipe],hand:[inHand('Kuriboh',0)]},{mzone:[]});
  ok(smartContext(e,p,L,{to_bp:true}).activation(snipe,false)<0,'nothing to shoot');
  ok(smartContext(duel(p,{mzone:[snipe],hand:[]},{mzone:[neo]}),p,L,{to_bp:true}).activation(snipe,false)<0,'nothing to discard');
  // Targeting follows the same pool: the Set card, not the Harpie Lady it beats in battle.
  const harpie=mon('Harpie Lady',o,0),ring=card('Ring of Destruction',L.SZONE,o,0,10);
  e=duel(p,{mzone:[snipe],hand:[inHand('Kuriboh',0)]},{mzone:[harpie],szone:[ring]},{effect:{code:id('Snipe Hunter'),player:p}});
  const pick=smartContext(e,p,L,{to_bp:true});
  ok(pick.targetScore('Snipe Hunter',ring,{})>pick.targetScore('Snipe Hunter',harpie,{}),'shoots the Set card, not a monster it beats in battle');
 }
 // 2. Juragedo and Dark Necrofear are not discard fodder.
 {
  const neo=mon('Neo the Magic Swordsman',o,0),jura=inHand('Juragedo',0),kuri=inHand('Kuriboh',1),necro=inHand('Dark Necrofear',2);
  const ctx=smartContext(duel(p,{mzone:[snipe],hand:[jura,kuri,necro]},{mzone:[neo]}),p,L,{to_bp:true});
  ok(ctx.handLoss(jura)>ctx.handLoss(kuri),'Kuriboh goes before Juragedo');
  ok(ctx.handLoss(necro)>ctx.handLoss(kuri),'Kuriboh goes before Dark Necrofear');
  ok(smartContext(duel(p,{mzone:[snipe],hand:[jura]},{mzone:[neo]}),p,L,{to_bp:true}).activation(snipe,false)<0,'Juragedo alone is not spent on a 1700 ATK monster');
  ok(smartContext(duel(p,{mzone:[snipe],hand:[jura]},{mzone:[mon('Blue-Eyes White Dragon',o,0)]}),p,L,{to_bp:true}).activation(snipe,false)>=80,'but it is spent on a real threat');
 }
 // 3. Spirit Messages matter only while a Destiny Board can still place them.
 {
  const msg=inHand('Spirit Message "A"',0),kuri=inHand('Kuriboh',1);
  const boardDeck=[card('Destiny Board',L.DECK,p,0,10),...Array.from({length:19},(_,i)=>card('Battle Ox',L.DECK,p,i+1,10))];
  let ctx=smartContext(duel(p,{mzone:[snipe],hand:[msg,kuri],deck:boardDeck},{mzone:[]}),p,L);
  ok(ctx.handLoss(msg)>=4000,'the only "A" is kept while Destiny Board is in the Deck');
  ctx=smartContext(duel(p,{mzone:[snipe],hand:[msg,kuri],grave:[card('Destiny Board',L.GRAVE,p,0,10)]},{mzone:[]}),p,L);
  ok(ctx.handLoss(msg)===0&&ctx.handLoss(msg)<ctx.handLoss(kuri),'with Destiny Board in the GY it is discarded first');
 }
 // 4. Juragedo stays in hand for its Battle Step Special Summon.
 {
  const jura=inHand('Juragedo',0);
  let ctx=smartContext(duel(p,{mzone:[],hand:[jura,inHand('Kuriboh',1)]},{mzone:[]}),p,L,{to_bp:true});
  ok(ctx.tributeWorth(jura,false)===false&&ctx.tributeWorth(jura,true)===false,'no Normal Summon or Set of a lone Juragedo');
  ctx=smartContext(duel(p,{mzone:[],hand:[jura,inHand('Juragedo',1)]},{mzone:[]}),p,L,{to_bp:true});
  ok(ctx.tributeWorth(jura,false)!==false,'with two in hand one may be summoned');
 }
 // 5. Juragedo on the field: Tribute it when it is about to die, not on top of our own attack stopper.
 {
  const jura=mon('Juragedo',p,0),tomato=mon('Mystic Tomato',p,1),tiki=mon('Grand Tiki Elder',o,0,1,{attack:2500});
  const battle={player:o,phase:8,attackCard:at(tiki),attackTarget:at(jura)};
  ok(smartContext(duel(p,{mzone:[jura,tomato]},{mzone:[tiki]},battle),p,L).activation(jura,true)>=0,'doomed Juragedo boosts Mystic Tomato instead');
  ok(smartContext(duel(p,{mzone:[jura,tomato]},{mzone:[tiki]},{...battle,activeChain:[{code:id('Sakuretsu Armor'),player:p}]}),p,L).activation(jura,true)<0,'not while our Sakuretsu Armor answers the attack');
  const doll=mon('Rogue Doll',o,0),snipeT={...snipe,sequence:2};
  const save={player:o,phase:8,attackCard:at(doll),attackTarget:at(snipeT)};
  ok(smartContext(duel(p,{mzone:[jura,snipeT]},{mzone:[doll]},save),p,L).activation(jura,true)>=0,'+1000 saves the attacked Snipe Hunter');
  ok(smartContext(duel(p,{mzone:[jura,snipeT]},{mzone:[doll]},{...save,activeChain:[{code:id('Sakuretsu Armor'),player:p}]}),p,L).activation(jura,true)<0,'no Tribute when Sakuretsu Armor already destroys the attacker');
 }
}
console.log(`PASS ${checks} Snipe Hunter, Juragedo and Spirit Message cases for both sides`);
