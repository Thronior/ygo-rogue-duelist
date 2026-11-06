// Water deck rules (deck trace, 2026-11-06): Orca Mega-Fortress of Darkness (activation, Fish Tribute, target, summoned
// face-up when ready), Mother Grizzly (chain trigger, Fish for Orca), Tribe-Infecting Virus summoned face-up for a sweep,
// Abyss Soldier bouncing only costly cards or the lone blocker, and Jirai Gumo rated low as a revival target.
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
 const o=1-p,mon=(name,side,seq,pos=1,extra)=>card(name,L.MZONE,side,seq,pos,extra),inHand=(name,seq)=>card(name,L.HAND,p,seq,10),gy=(name,seq,side=p)=>card(name,L.GRAVE,side,seq,5),dk=(name,seq)=>card(name,L.DECK,p,seq,10);
 // 1. Orca Mega-Fortress of Darkness uses its effect (a null score refused anything that says "destroy").
 {
  const orca=mon('Orca Mega-Fortress of Darkness',p,0),fish=mon('Torpedo Fish',p,1),shell=mon('Cannonball Spear Shellfish',p,2),set=card('Mirror Force',L.SZONE,o,0,10);
  ok(smartContext(duel(p,{mzone:[orca,fish]},{mzone:[mon('Gemini Elf',o,0)]}),p,L,{to_bp:true}).activation(orca,false)>=80,'Torpedo Fish for their Gemini Elf');
  ok(smartContext(duel(p,{mzone:[orca]},{mzone:[mon('Gemini Elf',o,0)]}),p,L,{to_bp:true}).activation(orca,false)<0,'nothing to Tribute');
  ok(smartContext(duel(p,{mzone:[orca,shell]},{mzone:[],szone:[set]}),p,L,{to_bp:true}).activation(orca,false)>=80,'Cannonball Spear Shellfish for a set card');
  ok(smartContext(duel(p,{mzone:[orca,shell]},{mzone:[mon('Gemini Elf',o,0)]}),p,L,{to_bp:true}).activation(orca,false)<0,'no Spell/Trap for the Shellfish');
  const t=smartContext(duel(p,{mzone:[orca,fish,shell]},{mzone:[mon('Gemini Elf',o,0)]},{effect:{code:id('Orca Mega-Fortress of Darkness'),player:p},selectionHint:500}),p,L);
  ok(t.targetScore('Orca Mega-Fortress of Darkness',fish,{})>t.targetScore('Orca Mega-Fortress of Darkness',shell,{}),'Tributes the Torpedo Fish when only a monster is there');
  const d=smartContext(duel(p,{mzone:[orca,shell]},{mzone:[mon('Gemini Elf',o,0)]},{effect:{code:id('Orca Mega-Fortress of Darkness'),player:p},selectionHint:502}),p,L);
  ok(d.targetScore('Orca Mega-Fortress of Darkness',mon('Gemini Elf',o,0),{})>d.targetScore('Orca Mega-Fortress of Darkness',orca,{}),'destroys theirs, not ours');
 }
 // 2. Orca is summoned face-up when a Fish with a target is out and another monster can pay its Tribute.
 {
  const orca=inHand('Orca Mega-Fortress of Darkness',0),enemy={mzone:[mon('Gemini Elf',o,0)]};
  ok(smartContext(duel(p,{mzone:[mon('Torpedo Fish',p,0),mon('Humanoid Slime',p,1)],hand:[orca]},enemy),p,L,{to_bp:true}).summonUtility(orca)===true,'Humanoid Slime pays, Torpedo Fish fuels');
  ok(smartContext(duel(p,{mzone:[mon('Torpedo Fish',p,0)],hand:[orca]},enemy),p,L,{to_bp:true}).summonUtility(orca)!==true,'not when the Fish itself would be the Tribute');
 }
 // 3. Mother Grizzly floats in a chain too, and beside a face-up Orca it floats the Fish Orca can use.
 {
  const grizzly=gy('Mother Grizzly',0);
  ok(smartContext(duel(p,{mzone:[],grave:[grizzly]},{mzone:[]}),p,L).activation(grizzly,true)>=80,'Mother Grizzly floats when another card triggers too');
  const fish=dk('Torpedo Fish',0),bear=dk('Mother Grizzly',1);
  let t=smartContext(duel(p,{mzone:[mon('Orca Mega-Fortress of Darkness',p,0)],deck:[fish,bear]},{mzone:[mon('Gemini Elf',o,0)]},{effect:{code:id('Mother Grizzly'),player:p}}),p,L);
  ok(t.targetScore('Mother Grizzly',fish,{})>t.targetScore('Mother Grizzly',bear,{}),'Torpedo Fish beside Orca');
  t=smartContext(duel(p,{mzone:[],deck:[fish,bear]},{mzone:[mon('Gemini Elf',o,0)]},{effect:{code:id('Mother Grizzly'),player:p}}),p,L);
  ok(!(t.targetScore('Mother Grizzly',fish,{})>t.targetScore('Mother Grizzly',bear,{})),'no Fish bonus without Orca');
 }
 // 4. Tribe-Infecting Virus is summoned face-up when its sweep takes two or more of theirs.
 {
  const tiv=inHand('Tribe-Infecting Virus',0),hand=[tiv,inHand('Humanoid Slime',1),inHand('Mother Grizzly',2)];
  const harpies={mzone:[mon('Harpie Lady',o,0),mon('Birdface',o,1),mon('Harpie Lady 2',o,2)]};
  let x=smartContext(duel(p,{mzone:[],hand},harpies),p,L,{to_bp:true});
  ok(x.preferSet(tiv)===false&&x.summonUtility(tiv)===true,'face-up against three Winged Beasts');
  x=smartContext(duel(p,{mzone:[],hand},{mzone:[mon('Harpie Lady',o,0)]}),p,L,{to_bp:true});
  ok(x.summonUtility(tiv)!==true,'not for a single monster');
 }
 // 5. Abyss Soldier bounces only a costly card or the lone blocker before our attacks.
 {
  const abyss=mon('Abyss Soldier',p,0),hand=[inHand('Humanoid Slime',0)];
  ok(smartContext(duel(p,{mzone:[abyss],hand},{mzone:[mon('Apprentice Magician',o,0,10)]},{phase:256}),p,L).activation(abyss,false)<0,'not a set Apprentice Magician in Main Phase 2');
  ok(smartContext(duel(p,{mzone:[abyss],hand},{mzone:[mon('Summoned Skull',o,0)]},{phase:256}),p,L).activation(abyss,false)>=80,'a Tribute-Summoned Summoned Skull');
  ok(smartContext(duel(p,{mzone:[abyss],hand},{mzone:[mon('Apprentice Magician',o,0,10)]}),p,L,{to_bp:true}).activation(abyss,false)<0,'not a lone set monster it can attack instead');
  ok(smartContext(duel(p,{mzone:[abyss],hand},{mzone:[mon('Gemini Elf',o,0)]}),p,L,{to_bp:true}).activation(abyss,false)>=80,'their lone Gemini Elf that out-fights it, before our attacks');
  ok(smartContext(duel(p,{mzone:[abyss],hand:[inHand('Raigeki',0)]},{mzone:[mon('Summoned Skull',o,0)]}),p,L,{to_bp:true}).activation(abyss,false)<0,'no WATER monster to discard');
  const t=smartContext(duel(p,{mzone:[abyss],hand},{mzone:[mon('Summoned Skull',o,0),mon('Fire Princess',o,1)]},{phase:256,effect:{code:id('Abyss Soldier'),player:p}}),p,L);
  ok(t.targetScore('Abyss Soldier',mon('Summoned Skull',o,0),{})>t.targetScore('Abyss Soldier',mon('Fire Princess',o,1),{}),'Summoned Skull over a Fire Princess they would summon again');
 }
 // 6. Jirai Gumo is a poor revival target while half our LP is a lot.
 {
  const t=smartContext(duel(p,{mzone:[],grave:[gy('Jirai Gumo',0)]},{mzone:[]},{effect:{code:id('Monster Reborn'),player:p}}),p,L);
  ok(t.targetScore('Monster Reborn',gy('Jirai Gumo',0),{})<2200,'rated below an equal 2200 monster');
 }
}
console.log(`PASS ${checks} Water deck rule cases for both sides`);
