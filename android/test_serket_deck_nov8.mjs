// Serket / Temple of the Kings / Tiki deck rule (deck trace, 2026-11-08): without a Temple of the Kings, Mystical Beast of
// Serket is only Tribute-Set over spent fodder (it destroys itself once flipped), never over a real wall like Embodiment of Apophis.
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
for(const p of [0,1]){
 const o=1-p,mon=(name,side,seq,pos=1,extra)=>card(name,L.MZONE,side,seq,pos,extra),inHand=(name,seq)=>card(name,L.HAND,p,seq,10);
 const serket=inHand('Mystical Beast of Serket',0),prompt={summons:[],monster_sets:[serket],to_bp:true};
 const apophis=mon('Embodiment of Apophis',p,0,1,{attack:1300,defense:1500}),mask=mon('Mask of Darkness',p,0,4),enemy={mzone:[mon('Gemini Elf',o,0)]};
 ok(smartContext(duel(p,{mzone:[apophis],hand:[serket]},{mzone:[mon('Desrook Archfiend',o,0,4)]},{phase:256}),p,L,{...prompt,to_bp:false}).tributeWorth(serket,true)===false,'no Serket Set over a 1300/1500 Embodiment of Apophis without a Temple (game 21)');
 ok(smartContext(duel(p,{mzone:[mask],hand:[serket]},enemy),p,L,prompt).tributeWorth(serket,true)!==false,'a spent Mask of Darkness can pay for a Set Serket');
 const temple=card('Temple of the Kings',L.SZONE,p,0,1);
 ok(smartContext(duel(p,{mzone:[apophis],szone:[temple],hand:[serket]},enemy),p,L,{...prompt,summons:[serket]}).tributeWorth(serket,false)!==false,'with a face-up Temple, Serket may be summoned over the Apophis');
}
console.log(`PASS ${checks} Serket deck rule cases for both sides`);
