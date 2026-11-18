// Dreamsprite (Discord, 2026-11-18): "When attacked by your opponent's monster, select another 1 of your Monster Cards and
// designate it as the attack's target". The CPU attacked a 300 ATK Dreamsprite with 4 monsters and was sent into the best
// defender every time. It now attacks Dreamsprite only with a monster that safely beats every other monster there.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,B,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const ok=(value,why)=>{assert(value,why);checks++};

// Stubbed boards: the CPU is seat 1 in its Battle Phase.
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,position,controller,location,sequence,type:data[id(name)]?.type||0,...extra});
const filler=p=>Array.from({length:20},(_,i)=>card('Battle Ox',L.DECK,p,i,10));
const slots=list=>{const out=Array(5).fill(null);for(const c of list)out[c.sequence]=c;return out};
function duel(zones){
 const e=new MobileDuel(meta.cards);
 Object.assign(e,{data,lp:[8000,8000],turn:4,player:1,phase:8,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}});
 for(const p of [0,1]){zones[p]={[L.DECK]:filler(p),...zones[p]};for(const loc of [L.MZONE,L.SZONE])zones[p][loc]=slots(zones[p][loc]||[]);}
 e.query=(side,loc)=>zones[side]?.[loc]||[];e.core={duelQueryCount:(_,side,loc)=>(zones[side]?.[loc]||[]).length};
 return e;
}
const sprite=card('Dreamsprite',L.MZONE,0,1,1);
const ox=card('Battle Ox',L.MZONE,1,2,1),tank=card('Blue-Eyes White Dragon',L.MZONE,1,3,1);
const score=(attacker,theirs)=>{const e=duel({1:{[L.MZONE]:[ox,tank]},0:{[L.MZONE]:[sprite,...theirs]}});return smartContext(e,1,L,{type:M.SELECT_BATTLECMD,player:1,attacks:[ox,tank]}).attackScore(attacker,sprite,{dmg:0})};

// A 2000 DEF wall next to Dreamsprite: Battle Ox (1700) would be bounced into it.
const wall=card('Giant Soldier of Stone',L.MZONE,0,2,4);
ok(score(ox,[wall])<=-99999,'Battle Ox does not attack Dreamsprite beside a 2000 DEF wall');
ok(score(tank,[wall])>-99999,'Blue-Eyes (3000) beats the wall, so it may attack Dreamsprite');
// A face-down monster next to it: the redirect target is unknown, judged by its guessed DEF.
const setCard=card('Giant Soldier of Stone',L.MZONE,0,3,8);
{
 const e=duel({1:{[L.MZONE]:[ox,tank]},0:{[L.MZONE]:[sprite,setCard]}}),s=smartContext(e,1,L,{type:M.SELECT_BATTLECMD,player:1,attacks:[ox,tank]});
 ok((s.attackScore(ox,sprite,{dmg:0})<=-99999)===(s.attackScore(ox,setCard,{dmg:0})<=-99999||1700<=s.hiddenDefense(setCard)),'beside an unknown Set monster, Dreamsprite is judged like attacking that Set card');
}
// Alone, Dreamsprite has nowhere to send the attack: an ordinary target.
ok(score(ox,[])>-99999,'a lone Dreamsprite is attacked normally');
// Negated (face-down effects off, or is_disabled): no redirect.
const quiet=duel({1:{[L.MZONE]:[ox,tank]},0:{[L.MZONE]:[{...sprite,is_disabled:true},wall]}});
ok(smartContext(quiet,1,L,{type:M.SELECT_BATTLECMD,player:1,attacks:[ox,tank]}).attackScore(ox,{...sprite,is_disabled:true},{dmg:0})>-99999,'a negated Dreamsprite does not redirect');

// The battle command itself: with a wall beside Dreamsprite, Battle Ox alone does not go in.
{
 const e=duel({1:{[L.MZONE]:[ox]},0:{[L.MZONE]:[sprite,wall]}});
 const r=e.auto({type:M.SELECT_BATTLECMD,player:1,attacks:[{...ox,can_direct:false}],activates:[],to_m2:true,to_ep:true});
 ok(r.action!==B.SELECT_BATTLE,'Battle Ox ends the Battle Phase instead of attacking into the redirect');
}
console.log(`PASS Dreamsprite: the CPU reads its attack redirect (${checks} checks)`);
