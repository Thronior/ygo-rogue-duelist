// T4 and Ultimate Collector deck review (2026-11-24): rules for cards that had none and were never (or almost never)
// played across the 55 Tier 4 pool decks. Each rule for both seats, with a case that says no.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {MobileDuel,L,M,R} from './web/duel.js';
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
const act=(e,p,c,chain=false,prompt={to_bp:true})=>smartContext(e,p,L,prompt).activation(c,chain);
for(const p of [0,1]){
 const o=1-p,mon=(name,side,seq,pos=1,extra)=>card(name,L.MZONE,side,seq,pos,extra),set=(name,side,seq)=>card(name,L.SZONE,side,seq,10),inHand=(name,seq)=>card(name,L.HAND,p,seq,10);
 const theirTurn=(phase,extra={})=>({player:o,phase,...extra});
 // Skill Drain: their Jinzo is worth negating; their vanilla monsters are not; never at 2000 LP or less.
 {
  const drain=set('Skill Drain',p,0);
  ok(act(duel(p,{mzone:[mon('Battle Ox',p,0)],szone:[drain]},{mzone:[mon('Jinzo',o,0)]},theirTurn(4)),p,drain,true)>=0,'Skill Drain negates their Jinzo');
  ok(act(duel(p,{mzone:[mon('Battle Ox',p,0)],szone:[drain]},{mzone:[mon('Summoned Skull',o,0)]},theirTurn(4)),p,drain,true)<0,'not against a Normal Monster');
  ok(act(duel(p,{mzone:[mon('Battle Ox',p,0)],szone:[drain]},{mzone:[mon('Jinzo',o,0)]},theirTurn(4,{lp:p?[8000,1800]:[1800,8000]})),p,drain,true)<0,'not with 1800 LP');
  // The per-seat switch card_trace --opp-off uses: off for this seat only.
  ok(act(duel(p,{mzone:[mon('Battle Ox',p,0)],szone:[drain]},{mzone:[mon('Jinzo',o,0)]},theirTurn(4,{cpuReviewRules:{t4Review:{[p]:false}}})),p,drain,true)!==88,'switched off for this seat');
  ok(act(duel(p,{mzone:[mon('Battle Ox',p,0)],szone:[drain]},{mzone:[mon('Jinzo',o,0)]},theirTurn(4,{cpuReviewRules:{t4Review:{[o]:false}}})),p,drain,true)===88,'still on when only the other seat is off');
 }
 // Wall of Revealing Light: their turn before battle, against attackers stronger than ours; pays enough to stop them.
 {
  const wall=set('Wall of Revealing Light',p,0);
  let e=duel(p,{mzone:[mon('Battle Ox',p,0)],szone:[wall]},{mzone:[mon('Summoned Skull',o,0)]},theirTurn(2));
  ok(act(e,p,wall,true)>=0,'Wall against Summoned Skull');
  ok(smartContext(e,p,L).wallPayment([1000,2000,3000,4000,5000,6000,7000])===2,'pays 3000 to stop 2500 ATK');
  // duel.js answers the cost's number prompt with that amount.
  e.effect={code:id('Wall of Revealing Light'),player:p};
  ok(e.auto({type:M.ANNOUNCE_NUMBER,player:p,options:[1000,2000,3000,4000]})?.value===2,'the CPU announces 3000');
  ok(act(duel(p,{mzone:[mon('Battle Ox',p,0)],szone:[wall]},{mzone:[mon('Summoned Skull',o,0)]},{phase:4}),p,wall,true)<0,'not on our own turn');
  ok(act(duel(p,{mzone:[mon('Summoned Skull',p,0)],szone:[wall]},{mzone:[mon('Battle Ox',o,0)]},theirTurn(2)),p,wall,true)<0,'not when our monster is the bigger one');
  e=duel(p,{mzone:[],szone:[wall]},{mzone:[mon('Summoned Skull',o,0)]},theirTurn(2,{lp:p?[8000,2500]:[2500,8000]}));
  ok(act(e,p,wall,true)<0,'not when 3000 would leave less than 1000 LP');
  ok(smartContext(e,p,L).wallPayment([1000,2000])===0,'never pays below 1000 LP left');
 }
 // Shield Crush: a Defense Position monster of theirs, never ours.
 {
  const crush=inHand('Shield Crush',0),wall=mon('Giant Soldier of Stone',o,0,4);
  let e=duel(p,{mzone:[mon('Battle Ox',p,0)],hand:[crush]},{mzone:[wall]});
  ok(act(e,p,crush)>=0,'Shield Crush on a 2000 DEF wall');
  ok(act(duel(p,{mzone:[],hand:[crush]},{mzone:[mon('Summoned Skull',o,0)]}),p,crush)<0,'not on an Attack Position monster');
  e=duel(p,{mzone:[mon('Mystical Elf',p,0,4)],hand:[crush]},{mzone:[wall]},{effect:{code:id('Shield Crush'),player:p}});
  const t=smartContext(e,p,L);ok(t.targetScore('Shield Crush',wall,{})>t.targetScore('Shield Crush',mon('Mystical Elf',p,0,4),{}),'theirs, not our Mystical Elf');
 }
 // Chaos Sorcerer: banish their best face-up monster; not a small one it could attack instead; free in Main Phase 2.
 {
  const sorcerer=mon('Chaos Sorcerer',p,0);
  ok(act(duel(p,{mzone:[sorcerer]},{mzone:[mon('Blue-Eyes White Dragon',o,0)]}),p,sorcerer)>=0,'banish Blue-Eyes');
  ok(act(duel(p,{mzone:[sorcerer]},{mzone:[mon('Mokey Mokey',o,0)]}),p,sorcerer)<0,'attack Mokey Mokey instead');
  ok(act(duel(p,{mzone:[sorcerer]},{mzone:[mon('Mokey Mokey',o,0)]},{phase:256}),p,sorcerer,false,{to_bp:false})>=0,'Main Phase 2: the banish costs nothing');
  const e=duel(p,{mzone:[sorcerer,mon('Battle Ox',p,1)]},{mzone:[mon('Blue-Eyes White Dragon',o,0)]},{effect:{code:id('Chaos Sorcerer'),player:p}});
  const t=smartContext(e,p,L);ok(t.targetScore('Chaos Sorcerer',mon('Blue-Eyes White Dragon',o,0),{})>t.targetScore('Chaos Sorcerer',mon('Battle Ox',p,1),{}),'never our own monster');
 }
 // Gear Golem: 800 LP for a direct attack only with a boost (or for game).
 {
  ok(act(duel(p,{mzone:[mon('Gear Golem the Moving Fortress',p,0,1,{attack:2300})]},{mzone:[mon('Summoned Skull',o,0)]}),p,mon('Gear Golem the Moving Fortress',p,0,1,{attack:2300}))>=0,'2300 ATK Gear Golem goes direct');
  ok(act(duel(p,{mzone:[mon('Gear Golem the Moving Fortress',p,0)]},{mzone:[mon('Summoned Skull',o,0)]}),p,mon('Gear Golem the Moving Fortress',p,0))<0,'not 800 LP for 800 damage');
  ok(act(duel(p,{mzone:[mon('Gear Golem the Moving Fortress',p,0,4)]},{mzone:[mon('Summoned Skull',o,0)]}),p,mon('Gear Golem the Moving Fortress',p,0,4))<0,'not in Defense Position');
 }
 // Rivalry of Warlords and Needle Ceiling: only when they lose more.
 {
  const rivalry=set('Rivalry of Warlords',p,0);
  ok(act(duel(p,{mzone:[mon('Battle Ox',p,0)],szone:[rivalry]},{mzone:[mon('Summoned Skull',o,0),mon('Blue-Eyes White Dragon',o,1),mon('Celtic Guardian',o,2)]},theirTurn(4)),p,rivalry,true)>=0,'Rivalry splits their three Types');
  ok(act(duel(p,{mzone:[mon('Summoned Skull',p,0),mon('Blue-Eyes White Dragon',p,1)],szone:[rivalry]},{mzone:[mon('Battle Ox',o,0)]},theirTurn(4)),p,rivalry,true)<0,'not when we lose more');
  const needle=set('Needle Ceiling',p,0);
  ok(act(duel(p,{mzone:[mon('Mokey Mokey',p,0)],szone:[needle]},{mzone:[mon('Summoned Skull',o,0),mon('Blue-Eyes White Dragon',o,1),mon('Celtic Guardian',o,2)]},theirTurn(4)),p,needle,true)>=0,'Needle Ceiling clears their board');
  ok(act(duel(p,{mzone:[mon('Summoned Skull',p,0),mon('Blue-Eyes White Dragon',p,1)],szone:[needle]},{mzone:[mon('Battle Ox',o,0),mon('Mokey Mokey',o,1)]},theirTurn(4)),p,needle,true)<0,'not over our bigger monsters');
 }
 // Bottomless Shifting Sand: during their turn, when the highest ATK is theirs alone.
 {
  const sand=set('Bottomless Shifting Sand',p,0);
  ok(act(duel(p,{mzone:[mon('Battle Ox',p,0)],szone:[sand]},{mzone:[mon('Summoned Skull',o,0)]},theirTurn(8)),p,sand,true)>=0,'Sand takes Summoned Skull');
  ok(act(duel(p,{mzone:[mon('Blue-Eyes White Dragon',p,0)],szone:[sand]},{mzone:[mon('Summoned Skull',o,0)]},theirTurn(8)),p,sand,true)<0,'not when ours is the highest');
  ok(act(duel(p,{mzone:[mon('Battle Ox',p,0)],szone:[sand]},{mzone:[mon('Summoned Skull',o,0)]},{phase:4}),p,sand,true)<0,'not on our turn');
 }
 // Magic Drain: against their Spell Card, not their Trap.
 {
  const drain=set('Magic Drain',p,0),link=code=>({code:id(code),player:o,link:1,targets:[]});
  ok(act(duel(p,{szone:[drain]},{mzone:[]},theirTurn(4,{activeChain:[link('Pot of Greed')],effect:{code:id('Pot of Greed'),player:o}})),p,drain,true)>=0,'Magic Drain on Pot of Greed');
  ok(act(duel(p,{szone:[drain]},{mzone:[]},theirTurn(4,{activeChain:[link('Skill Drain')],effect:{code:id('Skill Drain'),player:o}})),p,drain,true)<0,'not on a Trap');
 }
 // Thunder of Ruler: their Standby Phase, when their monsters outclass ours.
 {
  const thunder=set('Thunder of Ruler',p,0);
  ok(act(duel(p,{mzone:[mon('Battle Ox',p,0)],szone:[thunder]},{mzone:[mon('Summoned Skull',o,0)]},theirTurn(2)),p,thunder,true)>=0,'skip their Battle Phase');
  ok(act(duel(p,{mzone:[mon('Blue-Eyes White Dragon',p,0)],szone:[thunder]},{mzone:[mon('Battle Ox',o,0)]},theirTurn(2)),p,thunder,true)<0,'not when we are stronger');
 }
 // Cloning copies a summoned 1500+ ATK monster of theirs; Nutrient Z always heals.
 {
  const cloning=set('Cloning',p,0),skull=mon('Summoned Skull',o,0),mokey=mon('Mokey Mokey',o,0);
  ok(act(duel(p,{szone:[cloning]},{mzone:[skull]},theirTurn(4,{lastSummoned:[skull]})),p,cloning,true)>=0,'Clone Token of Summoned Skull');
  ok(act(duel(p,{szone:[cloning]},{mzone:[mokey]},theirTurn(4,{lastSummoned:[mokey]})),p,cloning,true)<0,'not of Mokey Mokey');
  ok(act(duel(p,{szone:[set('Nutrient Z',p,0)]},{mzone:[skull]},theirTurn(8)),p,set('Nutrient Z',p,0),true)>=0,'Nutrient Z heals');
 }
 // Horn of Heaven: Tribute a cheap monster to negate a Summon worth it, not a small one.
 {
  const horn=set('Horn of Heaven',p,0),bewd=mon('Blue-Eyes White Dragon',o,0),mokey=mon('Mokey Mokey',o,0);
  ok(act(duel(p,{mzone:[mon('Mokey Mokey',p,0)],szone:[horn]},{mzone:[bewd]},theirTurn(4,{summoningPlayer:o,lastSummoned:[bewd]})),p,horn,true)>=0,'Horn of Heaven on Blue-Eyes');
  ok(act(duel(p,{mzone:[mon('Mokey Mokey',p,0)],szone:[horn]},{mzone:[mokey]},theirTurn(4,{summoningPlayer:o,lastSummoned:[mokey]})),p,horn,true)<0,'not on Mokey Mokey');
  ok(act(duel(p,{mzone:[],szone:[horn]},{mzone:[bewd]},theirTurn(4,{summoningPlayer:o,lastSummoned:[bewd]})),p,horn,true)<0,'not with nothing to Tribute');
 }
 // My Body as a Shield: 1500 LP to save a board worth it from Dark Hole.
 {
  const shield=set('My Body as a Shield',p,0),hole={code:id('Dark Hole'),player:o,link:1,targets:[]};
  ok(act(duel(p,{mzone:[mon('Blue-Eyes White Dragon',p,0)],szone:[shield]},{mzone:[]},theirTurn(4,{activeChain:[hole]})),p,shield,true)>=0,'negate Dark Hole over Blue-Eyes');
  ok(act(duel(p,{mzone:[mon('Mokey Mokey',p,0)],szone:[shield]},{mzone:[]},theirTurn(4,{activeChain:[hole]})),p,shield,true)<0,'not for Mokey Mokey');
 }
 // Exarion Universe pierces only when 400 less ATK still wins; Injection Fairy Lily pays only to win the battle.
 {
  const exarion=mon('Exarion Universe',p,0),low=mon('Mokey Mokey',o,0,4),high=mon('Giant Soldier of Stone',o,0,4);
  ok(act(duel(p,{mzone:[exarion]},{mzone:[low]},{phase:8,attackCard:exarion,attackTarget:low}),p,exarion,true)>=0,'Exarion pierces Mokey Mokey');
  ok(act(duel(p,{mzone:[exarion]},{mzone:[high]},{phase:8,attackCard:exarion,attackTarget:high}),p,exarion,true)<0,'not into 2000 DEF');
  const lily=mon('Injection Fairy Lily',p,0),skull=mon('Summoned Skull',o,0);
  ok(act(duel(p,{mzone:[lily]},{mzone:[skull]},theirTurn(8,{attackCard:skull,attackTarget:lily})),p,lily,true)>=0,'Lily beats Summoned Skull');
  ok(act(duel(p,{mzone:[lily]},{mzone:[skull]},theirTurn(8,{attackCard:skull,attackTarget:lily,lp:p?[8000,2500]:[2500,8000]})),p,lily,true)<0,'not at 2500 LP');
 }
 // Order to Smash, Anti-Spell Fragrance, Marshmallon Glasses, A Feint Plan, Goblin Thief, Terraforming, Heart of the Underdog.
 {
  const smash=set('Order to Smash',p,0);
  ok(act(duel(p,{mzone:[mon('Mokey Mokey',p,0)],szone:[smash]},{szone:[set('Dark Hole',o,0),set('Mystical Space Typhoon',o,1)]},theirTurn(4)),p,smash,true)>=0,'Order to Smash for 2 Spells/Traps');
  ok(act(duel(p,{mzone:[mon('Mokey Mokey',p,0)],szone:[smash]},{szone:[]},theirTurn(4)),p,smash,true)<0,'not with nothing to destroy');
  const fragrance=set('Anti-Spell Fragrance',p,0);
  ok(act(duel(p,{szone:[fragrance],hand:[inHand('Battle Ox',0)]},{mzone:[]},theirTurn(2)),p,fragrance,true)>=0,'Fragrance on their turn');
  ok(act(duel(p,{szone:[fragrance],hand:[inHand('Pot of Greed',0),inHand('Dark Hole',1)]},{mzone:[]},theirTurn(2)),p,fragrance,true)<0,'not while we hold Spells');
  const glasses=inHand('Marshmallon Glasses',0);
  ok(act(duel(p,{mzone:[mon('Marshmallon',p,0,4)],hand:[glasses]},{mzone:[mon('Summoned Skull',o,0)]}),p,glasses)>=0,'Glasses with Marshmallon');
  ok(act(duel(p,{mzone:[mon('Battle Ox',p,0)],hand:[glasses]},{mzone:[mon('Summoned Skull',o,0)]}),p,glasses)<0,'not without Marshmallon');
  const feint=set('A Feint Plan',p,0);
  ok(act(duel(p,{mzone:[mon('Mystical Elf',p,0,8)],szone:[feint]},{mzone:[mon('Summoned Skull',o,0)]},theirTurn(8)),p,feint,true)>=0,'Feint Plan shields our Set monster');
  ok(act(duel(p,{mzone:[mon('Mystical Elf',p,0,4)],szone:[feint]},{mzone:[mon('Summoned Skull',o,0)]},theirTurn(8)),p,feint,true)<0,'not with a face-up monster');
  ok(act(duel(p,{hand:[inHand('Goblin Thief',0)]},{mzone:[]}),p,inHand('Goblin Thief',0))>=0,'Goblin Thief burns');
  const terra=inHand('Terraforming',0);
  ok(act(duel(p,{hand:[terra],deck:[card('Yami',L.DECK,p,0,10),...Array.from({length:15},(_,i)=>card('Battle Ox',L.DECK,p,i+1,10))]},{mzone:[]}),p,terra)>=0,'Terraforming finds Yami');
  ok(act(duel(p,{hand:[terra]},{mzone:[]}),p,terra)<0,'not with no Field Spell in the Deck');
  const heart=inHand('Heart of the Underdog',0),limbs=['Left Arm','Right Arm','Left Leg','Right Leg'].map((x,i)=>card(`${x} of the Forbidden One`,L.DECK,p,i,10));
  ok(act(duel(p,{hand:[heart],deck:[...limbs,...Array.from({length:28},(_,i)=>card('Sangan',L.DECK,p,i+4,10))]},{mzone:[]}),p,heart)>=0,'Heart of the Underdog in an Exodia deck');
  ok(act(duel(p,{hand:[heart],deck:Array.from({length:30},(_,i)=>card('Sangan',L.DECK,p,i,10))},{mzone:[]}),p,heart)<0,'not with no Normal Monsters');
 }
}
console.log(`PASS ${checks} T4/UC deck rule cases for both sides`);
