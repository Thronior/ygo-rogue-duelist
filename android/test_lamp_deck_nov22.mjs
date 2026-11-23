// Lamp/Jar deck rules (deck trace, 2026-11-22): Ancient Lamp's Special Summon of La Jinn (rule and combo line), its
// attack redirect and the monster it picks, and Dice Jar's Flip Summon and Set odds.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {MobileDuel,L} from './web/duel.js';
import {smartContext,diceJarOdds} from './web/smart_policy.js';
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
// Dice Jar odds: a side takes 1000/1500/2000/2500/6000 in 1/2/3/4/5 of the 30 unequal rolls.
ok(diceJarOdds(8000,8000).kill===0&&diceJarOdds(8000,8000).death===0,'no Dice Jar roll finishes 8000 LP');
ok(Math.abs(diceJarOdds(8000,2500).kill-9/30)<1e-9,'2500 LP falls to a 5 or a 6');
ok(Math.abs(diceJarOdds(1000,8000).death-15/30)<1e-9,'1000 LP falls to any lost roll');
const LAMP='Ancient Lamp',JINN='La Jinn the Mystical Genie of the Lamp';
for(const p of [0,1]){
 const o=1-p,mon=(name,side,seq,pos=1,extra)=>card(name,L.MZONE,side,seq,pos,extra),inHand=(name,seq)=>card(name,L.HAND,p,seq,10);
 const lp=(mine,theirs)=>{const v=[0,0];v[p]=mine;v[o]=theirs;return v};
 // 1. Ancient Lamp's Main Phase effect: La Jinn in hand and a free zone.
 {
  const lamp=mon(LAMP,p,0),jinn=inHand(JINN,0);
  ok(smartContext(duel(p,{mzone:[lamp],hand:[jinn]},{mzone:[]}),p,L,{to_bp:true}).activation(lamp,false)>=0,'Ancient Lamp Special Summons La Jinn');
  ok(smartContext(duel(p,{mzone:[lamp],hand:[inHand('Lord of the Lamp',0)]},{mzone:[]}),p,L,{to_bp:true}).activation(lamp,false)<0,'not without La Jinn in hand');
  const full=[lamp,...[1,2,3,4].map(i=>mon('Battle Ox',p,i))];
  ok(smartContext(duel(p,{mzone:full,hand:[jinn]},{mzone:[]}),p,L,{to_bp:true}).activation(lamp,false)<0,'not with no free Monster Zone');
 }
 // 2. Its battle trigger redirects their attack while another of their monsters stands.
 {
  const lamp=mon(LAMP,p,0,8),elf=mon('Gemini Elf',o,0),skull=mon('Summoned Skull',o,1),ox=mon('Battle Ox',o,2);
  const yn=theirs=>smartContext(duel(p,{mzone:[lamp]},{mzone:theirs},{player:o,phase:8,attackCard:elf,attackTarget:lamp}),p,L).activation({code:lamp.code,controller:p,location:L.MZONE,sequence:0},true);
  ok(yn([elf,skull])>=0,'redirects Gemini Elf into their Summoned Skull');
  ok(yn([elf])<0,'not with only the attacker on their field');
  // The pick: the fight that costs them most.
  const t=smartContext(duel(p,{mzone:[lamp]},{mzone:[elf,skull,ox]},{player:o,phase:8,attackCard:elf,attackTarget:lamp,effect:{code:lamp.code,player:p}}),p,L);
  ok(t.targetScore(LAMP,skull,{})>t.targetScore(LAMP,ox,{}),'Gemini Elf dies to Summoned Skull rather than killing a Battle Ox');
  const wall=mon('Giant Soldier of Stone',o,1,8),weak=mon('Battle Ox',o,2);
  const u=smartContext(duel(p,{mzone:[lamp]},{mzone:[mon('Summoned Skull',o,0),wall,weak]},{player:o,phase:8,attackCard:mon('Summoned Skull',o,0),attackTarget:lamp,effect:{code:lamp.code,player:p}}),p,L);
  ok(u.targetScore(LAMP,weak,{})>u.targetScore(LAMP,wall,{}),'their Summoned Skull destroys their Battle Ox rather than bouncing off a wall');
  ok(u.targetScore(LAMP,{...lamp},{})<0,'never one of ours');
 }
 // 3. Combo line: a face-up Lamp Special Summons La Jinn before the Normal Summon; the Lamp is never summoned or
 // flipped for it (it stays Set for its redirect).
 {
  const lamp=inHand(LAMP,0),jinn=inHand(JINN,1);
  const line=(mine,prompt)=>smartContext(duel(p,mine,{mzone:[]}),p,L,{to_bp:true,activates:[],summons:[],monster_sets:[],special_summons:[],pos_changes:[],...prompt}).comboChoice(()=>true);
  const up=mon(LAMP,p,0),follow=line({mzone:[up],hand:[jinn]},{activates:[up],summons:[jinn],monster_sets:[jinn]});
  ok(follow?.id==='ancient-lamp'&&follow.start.kind==='activate','a face-up Lamp Special Summons La Jinn');
  ok(line({mzone:[up],hand:[inHand('Lord of the Lamp',1)]},{activates:[up],summons:[],monster_sets:[]})?.id!=='ancient-lamp','no Lamp line without La Jinn');
  ok(line({hand:[lamp,jinn]},{summons:[lamp,jinn],monster_sets:[lamp,jinn]})?.id!=='ancient-lamp','the Lamp is not Normal Summoned for La Jinn');
  const down=mon(LAMP,p,0,8);
  ok(line({mzone:[down],hand:[jinn]},{summons:[jinn],monster_sets:[jinn],pos_changes:[down]})?.id!=='ancient-lamp','a Set Lamp is not flipped for La Jinn');
  const full=[up,...[1,2,3,4].map(i=>mon('Battle Ox',p,i))];
  ok(line({mzone:full,hand:[jinn]},{activates:[up],summons:[],monster_sets:[]})?.id!=='ancient-lamp','no Lamp line with no free zone');
 }
 // 4. Dice Jar: Flip Summoned only when likelier to finish them than us; kept in hand while it would risk us more.
 {
  const set=mon('Dice Jar',p,0,8);
  ok(smartContext(duel(p,{mzone:[set]},{mzone:[]},{lp:lp(8000,5000)}),p,L,{to_bp:true}).flipUseful('Dice Jar',set)===true,'flips at 8000 against 5000');
  ok(smartContext(duel(p,{mzone:[set]},{mzone:[]},{lp:lp(5000,8000)}),p,L,{to_bp:true}).flipUseful('Dice Jar',set)===false,'not at 5000 against 8000');
  ok(smartContext(duel(p,{mzone:[set]},{mzone:[]}),p,L,{to_bp:true}).flipUseful('Dice Jar',set)===false,'not at 8000 against 8000');
  const jar=inHand('Dice Jar',0),guard=mon('Ancient Lamp',p,1,8);
  ok(duel(p,{mzone:[guard],hand:[jar]},{mzone:[]},{lp:lp(2800,7200)}).keptInHand(jar,p),'kept at 2800 against 7200 beside a monster');
  ok(!duel(p,{mzone:[guard],hand:[jar]},{mzone:[]},{lp:lp(8000,8000)}).keptInHand(jar,p),'Set at 8000 against 8000');
  ok(!duel(p,{hand:[jar]},{mzone:[mon('Battle Ox',o,0)]},{lp:lp(2800,7200)}).keptInHand(jar,p),'an empty field at 2800 still Sets it (only a 6 finishes us)');
  ok(duel(p,{hand:[jar]},{mzone:[mon('Ancient Lamp',o,0)]},{lp:lp(1400,7200)}).keptInHand(jar,p),'kept at 1400 when a 900 ATK attack does not finish us');
  ok(!duel(p,{hand:[jar]},{mzone:[mon('Summoned Skull',o,0)]},{lp:lp(1400,7200)}).keptInHand(jar,p),'Set at 1400 when their attack would finish us');
 }
}
console.log(`PASS ${checks} Lamp deck rule cases for both sides`);
