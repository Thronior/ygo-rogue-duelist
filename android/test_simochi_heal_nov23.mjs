// CPU heal cards under Bad Reaction to Simochi and Nurse Reficule the Fallen One (2026-11-23).
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
 e.query=(side,loc)=>z[side]?.[loc]||[];e.core={duelQueryCount:(_,side,loc)=>(z[side]?.[loc]||[]).filter(Boolean).length}; return e;
}

// Bad Reaction to Simochi / Nurse Reficule (user, 2026-11-23, Twist on Discord: the CPU healed itself to death under
// Simochi). With either face-up on the other side, healing hurts, so the CPU holds its heal cards; without them it heals.
for(const p of [0,1]){
 const o=1-p,inHand=(name,seq)=>card(name,L.HAND,p,seq,10),simochi=card('Bad Reaction to Simochi',L.SZONE,o,0,1);
 // Nurse Reficule is outside the game's card pool today; checked only if it is ever added.
 const nurse=meta.cards.some(c=>c.name==='Nurse Reficule the Fallen One')?card('Nurse Reficule the Fallen One',L.MZONE,o,0,1):null;
 const low={lp:p?[8000,3000]:[3000,8000]};
 for(const name of ['Dian Keto the Cure Master','Red Medicine',"Goblin's Secret Remedy",'Solemn Wishes']){
  const c=inHand(name,0);
  const value=theirs=>smartContext(duel(p,{hand:[c]},theirs,low),p,L).activation(c,false);
  ok(value({})>0,`${name}: heals at 3000 LP with nothing in the way (seat ${p})`);
  ok(value({szone:[simochi]})<0,`${name}: held under the opponent's Bad Reaction to Simochi (seat ${p})`);
  if(nurse)ok(value({mzone:[nurse]})<0,`${name}: held under the opponent's Nurse Reficule (seat ${p})`);
  ok(value({szone:[{...simochi,position:10}]})>0,`${name}: a face-down Simochi doesn't stop it (seat ${p})`);
 }
 const ctx=smartContext(duel(p,{szone:[{...simochi,controller:p}]},{},low),p,L);
 ok(ctx.healingAllowed(p),`our own Simochi only reverses the opponent's healing (seat ${p})`);
 ok(!ctx.healingAllowed(o),`and the opponent may not heal (seat ${p})`);
}
console.log(`PASS Simochi heal guard (${checks} checks)`);
