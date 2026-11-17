// PaniK's Zombie decks (deck trace, 2026-11-17): Giant Axe Mummy turns itself face-down, Vampire's Curse revives in the
// Standby Phase, Vampire Lord and Vampire Lady declare Spell, and Metamorphosis Tributes a borrowed monster for free.
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
 const o=1-p,mon=(name,side,seq,pos=1,extra)=>card(name,L.MZONE,side,seq,pos,extra);
 // 1. Giant Axe Mummy: face-down in Main Phase 2, or in Main Phase 1 when it has nothing to attack.
 {
  const mummy=mon('Giant Axe Mummy',p,0),entry={code:id('Giant Axe Mummy'),controller:p,location:L.MZONE,sequence:0};
  const ctx=(mzone,theirs,state,prompt)=>smartContext(duel(p,{mzone,...(state.mine||{})},{mzone:theirs},state.duel||{}),p,L,prompt);
  ok(ctx([mummy],[mon('Gemini Elf',o,0)],{duel:{phase:256}},{to_bp:false}).activation(entry,false)>=0,'Main Phase 2: turn it face-down (idle entry without position)');
  ok(ctx([mummy],[mon('Mystic Tomato',o,0)],{duel:{phase:4}},{to_bp:true}).activation(entry,false)<0,'Main Phase 1: attack the 1400 ATK Mystic Tomato first');
  ok(ctx([mummy],[mon('Summoned Skull',o,0)],{duel:{phase:4}},{to_bp:true}).activation(entry,false)>=0,'Main Phase 1 with no target: turn it face-down now');
  ok(ctx([mon('Giant Axe Mummy',p,0,8)],[mon('Gemini Elf',o,0)],{duel:{phase:256}},{to_bp:false}).activation(entry,false)<0,'not when already face-down');
  ok(ctx([mummy],[mon('Gemini Elf',o,0)],{duel:{phase:256,player:o}},{to_bp:false}).activation(entry,false)<0,"not in the opponent's turn");
  ok(ctx([mummy],[mon('Gemini Elf',o,0)],{duel:{phase:256},mine:{szone:[card('Black Pendant',L.SZONE,p,0,1,{equipCard:{controller:p,location:L.MZONE,sequence:0}})]}},{to_bp:false}).activation(entry,false)<0,'not while it holds an Equip Card');
 }
 // 2. Vampire's Curse revives itself from the GY for 500 LP.
 {
  const curse=card("Vampire's Curse",L.GRAVE,p,0,5);
  ok(smartContext(duel(p,{mzone:[],grave:[curse]},{mzone:[]},{phase:2}),p,L,{}).activation(curse,true)>=0,'revive in the Standby Phase');
  ok(smartContext(duel(p,{mzone:[],grave:[curse]},{mzone:[]},{phase:2,lp:[1200,1200]}),p,L,{}).activation(curse,true)<0,'not at 1200 LP');
 }
 // 3. Vampire Lord and Vampire Lady declare Spell.
 {
  for(const n of ['Vampire Lady','Vampire Lord'])ok(smartContext(duel(p,{mzone:[mon(n,p,0)]},{mzone:[]},{effect:{code:id(n),player:p}}),p,L,{}).resourceOption([70,71,72])===1,`${n} declares Spell`);
  ok(smartContext(duel(p,{mzone:[]},{mzone:[]},{effect:{code:id('Dark Hole'),player:p}}),p,L,{}).resourceOption([70,71,72])!==1,'control: other cards keep their own choice');
 }
 // 4. Metamorphosis takes a borrowed monster as its Tribute.
 {
  const blade=card('Dark Blade the Dragon Knight',L.EXTRA,p,0,10),meta=card('Metamorphosis',L.HAND,p,0,10);
  const borrowed=mon('Granmarg the Rock Monarch',p,0,1,{owner:o}),pumpking=mon('Pumpking the King of Ghosts',p,1);
  let t=smartContext(duel(p,{mzone:[borrowed],hand:[meta],extra:[blade]},{mzone:[]},{effect:{code:id('Metamorphosis'),player:p}}),p,L,{});
  ok(t.targetScore('Metamorphosis',borrowed,{})>0,'a borrowed Granmarg becomes Dark Blade the Dragon Knight');
  t=smartContext(duel(p,{mzone:[pumpking],hand:[meta],extra:[blade]},{mzone:[]},{effect:{code:id('Metamorphosis'),player:p}}),p,L,{});
  ok(t.targetScore('Metamorphosis',pumpking,{})<0,'control: our own Pumpking is not worth 400 ATK');
 }
}
console.log(`PASS ${checks} PaniK deck rule cases for both sides`);
