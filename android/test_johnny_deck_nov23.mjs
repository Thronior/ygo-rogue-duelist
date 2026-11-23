// Johnny Steps deck review (2026-11-23, Kyky's T1 list: Musician King / Empress Judge + Fusion Weapon, Re-Fusion).
// 1. Re-Fusion revives a Fusion Monster from our GY like Premature Burial (no rule before: its "destroyed" text made the
//    generic guess refuse it), never a non-Fusion, and not at 800 LP or less.
// 2. A Fusion Weapon in hand counts +1500 for a Level 6 or lower Fusion, so Polymerization fuses Empress Judge into a board
//    it could not beat alone; without the Weapon it still waits.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {MobileDuel,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const ok=(v,m)=>{assert(v,m);checks++};
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,race:data[id(name)]?.race,level:data[id(name)]?.level,owner:controller,position,controller,location,sequence,...extra});
function duel(p,mine,theirs,state={}){
 const e=new MobileDuel([...meta.cards,...meta.tokenCards]),zones={[p]:mine,[1-p]:theirs};
 Object.assign(e,{data,lp:[8000,8000],turn:6,player:p,phase:4,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},state);
 const fill=(loc,list)=>{const out=Array(loc===L.SZONE?6:5).fill(null);for(const c of list||[])out[c.sequence]=c;return out};
 const z={};for(const side of [0,1]){const deck=zones[side].deck||Array.from({length:20},(_,i)=>card('Battle Ox',L.DECK,side,i,10));
  z[side]={[L.MZONE]:fill(L.MZONE,zones[side].mzone),[L.SZONE]:fill(L.SZONE,zones[side].szone),[L.HAND]:zones[side].hand||[],[L.DECK]:deck,[L.GRAVE]:zones[side].grave||[],[L.EXTRA]:zones[side].extra||[]}}
 e.query=(side,loc)=>z[side]?.[loc]||[];e.core={duelQueryCount:(_,side,loc)=>(z[side]?.[loc]||[]).filter(Boolean).length};
 return e;
}
for(const p of [0,1]){
 const o=1-p,mon=(name,side,seq,pos=1)=>card(name,L.MZONE,side,seq,pos),inHand=(name,seq)=>card(name,L.HAND,p,seq,10),gy=(name,seq)=>card(name,L.GRAVE,p,seq,5);
 // 1. Re-Fusion.
 {
  const refusion=inHand('Re-Fusion',0),weak=[mon('Kuriboh',o,0)];
  ok(smartContext(duel(p,{mzone:[],hand:[refusion],grave:[gy('Empress Judge',0)]},{mzone:weak}),p,L,{to_bp:true}).activation(refusion,false)>=80,'Re-Fusion brings back Empress Judge');
  ok(smartContext(duel(p,{mzone:[],hand:[refusion],grave:[gy('Gemini Elf',0)]},{mzone:weak}),p,L,{to_bp:true}).activation(refusion,false)<0,'never a non-Fusion monster');
  ok(smartContext(duel(p,{mzone:[],hand:[refusion],grave:[gy('Empress Judge',0)]},{mzone:weak},{lp:p?[8000,700]:[700,8000]}),p,L,{to_bp:true}).activation(refusion,false)<0,'not with 800 LP or less');
  // Control: Premature Burial keeps its old behaviour on the same board.
  const burial=inHand('Premature Burial',0);
  ok(smartContext(duel(p,{mzone:[],hand:[burial],grave:[gy('Empress Judge',0)]},{mzone:weak}),p,L,{to_bp:true}).activation(burial,false)>=80,'Premature Burial unchanged');
 }
 // 2. Fusion Weapon counts for Polymerization.
 {
  const poly=inHand('Polymerization',0),mats=[inHand("Queen's Double",1),inHand('Hibikime',2)],extra=[card('Empress Judge',L.EXTRA,p,0,10)];
  const wall=[mon('Summoned Skull',o,0)];// 2500 ATK: Empress Judge alone (2100) does not beat it, with Fusion Weapon (3600) it does
  ok(smartContext(duel(p,{mzone:[],hand:[poly,...mats,inHand('Fusion Weapon',3)],extra},{mzone:wall}),p,L,{to_bp:true}).activation(poly,false)>=80,'fuse with Fusion Weapon in hand');
  ok(smartContext(duel(p,{mzone:[],hand:[poly,...mats,inHand('Pot of Greed',3)],extra},{mzone:wall}),p,L,{to_bp:true}).activation(poly,false)<0,'without the Weapon it waits');
  ok(smartContext(duel(p,{mzone:[],hand:[poly,...mats],extra},{mzone:[mon('Kuriboh',o,0)]}),p,L,{to_bp:true}).activation(poly,false)>=80,'control: fuses when it beats the board alone');
 }
}
console.log(`PASS Johnny Steps deck rules: Re-Fusion, Fusion Weapon in the Polymerization plan (${checks} checks)`);
