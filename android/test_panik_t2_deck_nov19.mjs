// PaniK Tier 2 deck review (Deds' list, 2026-11-19): Reverse Trap springs at an attack only when the reversed ATK/DEF
// turns that battle our way, and Reaper of the Cards' FLIP picks the opponent's Trap, never our own Set Trap.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {MobileDuel,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const ok=(v,m)=>{assert(v,m);checks++};
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,race:data[id(name)]?.race,level:data[id(name)]?.level,owner:controller,position,controller,location,sequence,type:data[id(name)]?.type,...extra});
function duel(p,mine,theirs,state={}){
 const e=new MobileDuel([...meta.cards,...meta.tokenCards]),zones={[p]:mine,[1-p]:theirs};
 Object.assign(e,{data,lp:[8000,8000],turn:6,player:p,phase:4,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},state);
 const fill=(loc,list)=>{const out=Array(loc===L.SZONE?6:5).fill(null);for(const c of list||[])out[c.sequence]=c;return out};
 const z={};for(const side of [0,1]){const deck=zones[side].deck||Array.from({length:20},(_,i)=>card('Battle Ox',L.DECK,side,i,10));
  z[side]={[L.MZONE]:fill(L.MZONE,zones[side].mzone),[L.SZONE]:fill(L.SZONE,zones[side].szone),[L.HAND]:zones[side].hand||[],[L.DECK]:deck,[L.GRAVE]:zones[side].grave||[],[L.EXTRA]:zones[side].extra||[]}}
 e.query=(side,loc)=>z[side]?.[loc]||[];e.core={duelQueryCount:(_,side,loc)=>(z[side]?.[loc]||[]).filter(Boolean).length};
 return e;
}
const ref=c=>({controller:c.controller,location:c.location,sequence:c.sequence,code:c.code});
for(const p of [0,1]){
 const o=1-p,mon=(name,side,seq,pos=1,extra)=>card(name,L.MZONE,side,seq,pos,extra),set=(name,side,seq,pos=10)=>card(name,L.SZONE,side,seq,pos);
 // 1. Reverse Trap: their Battle Ox with +1000 ATK (Axe of Despair) attacks our Archfiend Soldier.
 {
  const trap=set('Reverse Trap',p,0),soldier=mon('Archfiend Soldier',p,0),attack=(attacker,target,mine=[soldier])=>{
   const e=duel(p,{mzone:mine,szone:[trap]},{mzone:[attacker]},{player:o,phase:8,attackCard:ref(attacker),attackTarget:target&&ref(target)});
   return smartContext(e,p,L).activation(trap,true);};
  ok(attack(mon('Battle Ox',o,0,1,{attack:2700}),soldier)>=80,'reversed Axe of Despair loses their attack');
  ok(attack(mon('Battle Ox',o,0),soldier)<0,'no modifiers: nothing to reverse');
  // Our Archfiend Soldier carries Dark Energy (+300): reversing only weakens it.
  const boosted=mon('Archfiend Soldier',p,0,1,{attack:2200,defense:1800});
  ok(attack(mon('Gemini Elf',o,0),boosted,[boosted])<0,'never reverses our own boost');
  // A face-down defender: its stats are hidden, so the trap waits.
  const hidden=mon('Archfiend Soldier',p,0,8);
  ok(attack(mon('Battle Ox',o,0,1,{attack:2700}),hidden,[hidden])<0,'not for a face-down defender');
  // Our attack: their Gemini Elf with +1000 DEF in Defense Position stops our King of Yamimakai.
  const king=mon('King of Yamimakai',p,0),wall=mon('Gemini Elf',o,0,4,{defense:2900});
  const e=duel(p,{mzone:[king],szone:[trap]},{mzone:[wall]},{player:p,phase:8,attackCard:ref(king),attackTarget:ref(wall)});
  ok(smartContext(e,p,L).activation(trap,true)>=80,'reversed DEF boost lets our attack through');
  ok(smartContext(duel(p,{mzone:[king],szone:[trap]},{mzone:[mon('Battle Ox',o,0,1,{attack:2700})]}),p,L).activation(trap,false)<0,'never outside a battle');
 }
 // 2. Reaper of the Cards destroys a Trap: theirs, never ours.
 {
  const state={effect:{code:id('Reaper of the Cards'),player:p},selectionHint:502};
  const offering=set('Ultimate Offering',o,0,5),theirSet=set('Mystical Space Typhoon',o,1),ownTrap=set('Waboku',p,0),ownSpell=set('Stop Defense',p,1);
  const t=smartContext(duel(p,{mzone:[],szone:[ownTrap,ownSpell]},{mzone:[],szone:[offering,theirSet]},state),p,L);
  ok(t.targetScore('Reaper of the Cards',offering,{})>t.targetScore('Reaper of the Cards',theirSet,{}),'their face-up Trap first');
  ok(t.targetScore('Reaper of the Cards',theirSet,{})>t.targetScore('Reaper of the Cards',ownSpell,{}),'their Set card over ours');
  ok(t.targetScore('Reaper of the Cards',ownSpell,{})>t.targetScore('Reaper of the Cards',ownTrap,{}),'our Spell survives, our Trap would not');
  ok(t.targetScore('Reaper of the Cards',ownTrap,{})<0,'never wants our own Trap');
 }
 // 3. Equips wait in Main Phase 1 for a monster that attacks with them, and go on the attacker over a defending wall.
 {
  const energy=card('Dark Energy',L.HAND,p,0,10),castle=mon('Castle of Dark Illusions',p,0,4),soldier=card('Archfiend Soldier',L.HAND,p,1,10);
  const idle=(mine,extra={})=>smartContext(duel(p,{mzone:mine,hand:[energy,soldier]},{mzone:[mon('Vorse Raider',o,0)]}),p,L,{to_bp:true,summons:[soldier],...extra});
  ok(idle([castle]).activation(energy,false)<0,'Dark Energy waits for the summon, not the defending Castle');
  const king=mon('King of Yamimakai',p,1);
  ok(idle([castle,king]).activation(energy,false)>=0,'control: an attacker is already on the field');
  const e=duel(p,{mzone:[castle,king],hand:[energy]},{mzone:[mon('Vorse Raider',o,0)]},{effect:{code:id('Dark Energy'),player:p}});
  const t=smartContext(e,p,L,{to_bp:true});
  ok(t.targetScore('Dark Energy',king,{})>t.targetScore('Dark Energy',castle,{}),'the attacking King takes it over the defending Castle');
 }
 // 4. Waboku is not spent to save a battle floater from an attack that deals no damage.
 {
  const waboku=set('Waboku',p,0),roc=mon('Roc from the Valley of Haze',o,0);
  const use=defender=>smartContext(duel(p,{mzone:[defender],szone:[waboku]},{mzone:[roc]},{player:o,phase:8,attackCard:ref(roc),attackTarget:ref(defender)}),p,L).activation(waboku,true);
  ok(use(mon('Mystic Tomato',p,0,4))<0,'a defending Mystic Tomato floats');
  ok(use(mon('Archfiend Soldier',p,0,4))>=80,'control: a defending Archfiend Soldier is saved');
 }
}
console.log(`PASS ${checks} PaniK Tier 2 deck rule cases for both sides`);
