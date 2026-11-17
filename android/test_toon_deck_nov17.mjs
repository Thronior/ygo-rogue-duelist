// Toon deck rules (deck trace, 2026-11-17): Toon Summoned Skull, Toon Dark Magician Girl and Blue-Eyes Toon Dragon only
// Tribute for an upgrade (and wait for Main Phase 2 while the Tribute can still attack), the summoning procedure Tributes the
// cheapest monster, and Toon Defense is flipped before attacks and redirects an attack only when the Toon would lose.
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
const SUMMON_TURN=0x40000000;
for(const p of [0,1]){
 const o=1-p,mon=(name,side,seq,pos=1,extra)=>card(name,L.MZONE,side,seq,pos,extra),inHand=(name,seq)=>card(name,L.HAND,p,seq,10);
 const world=card('Toon World',L.SZONE,p,0,1);
 // 1. Tribute summons from the hand only for an upgrade.
 {
  const skull=inHand('Toon Summoned Skull',0),girl=inHand('Toon Dark Magician Girl',1),blue=inHand('Blue-Eyes Toon Dragon',2);
  const firstTurn=(mzone,hand)=>smartContext(duel(p,{mzone,szone:[world],hand},{mzone:[]},{turn:1}),p,L,{to_bp:false});
  ok(firstTurn([mon('Toon Mermaid',p,0)],[skull]).specialOk(skull)===true,'control: Skull for a Toon Mermaid');
  ok(firstTurn([mon('Toon Summoned Skull',p,0,1,{status:SUMMON_TURN})],[skull]).specialOk(skull)===false,'never a Skull for another Skull');
  ok(firstTurn([mon('Toon Summoned Skull',p,0,1,{status:SUMMON_TURN})],[girl]).specialOk(girl)===false,'no Skull into Dark Magician Girl without a Battle Phase');
  ok(firstTurn([mon('Toon Goblin Attack Force',p,0)],[girl]).specialOk(girl)===false,'never a 2300 ATK Goblin Attack Force for Dark Magician Girl');
  ok(firstTurn([mon('Toon Mermaid',p,0),mon('Toon Goblin Attack Force',p,1)],[blue]).specialOk(blue)===true,'Blue-Eyes for a Mermaid and a Goblin Attack Force');
  ok(firstTurn([mon('Toon Mermaid',p,0),mon('Toon Summoned Skull',p,1),mon('Toon Dark Magician Girl',p,2)],[blue]).specialOk(blue)===true,'control: Blue-Eyes takes the two cheapest');
  ok(smartContext(duel(p,{mzone:[mon('Toon Mermaid',p,0)],szone:[],hand:[skull]},{mzone:[]},{turn:1}),p,L,{to_bp:false}).specialOk(skull)===false,'not without Toon World');
  // Revival is untouched: Monster Reborn may still take a Skull from the GY.
  ok(firstTurn([mon('Toon Summoned Skull',p,0)],[]).specialOk(card('Toon Summoned Skull',L.GRAVE,p,0,5))===true,'control: revival is not judged as a Tribute');
 }
 // 2. Main Phase 1 with a Battle Phase ahead: a Skull waits while its Tribute can still attack.
 {
  const skull=inHand('Toon Summoned Skull',0),girl=inHand('Toon Dark Magician Girl',1);
  const mainOne=(mzone,hand,theirs=[])=>smartContext(duel(p,{mzone,szone:[world],hand},{mzone:theirs}),p,L,{to_bp:true});
  ok(mainOne([mon('Toon Gemini Elf',p,0)],[skull]).specialOk(skull)===false,'Toon Gemini Elf attacks directly first');
  ok(mainOne([mon('Toon Gemini Elf',p,0,1,{status:SUMMON_TURN})],[skull]).specialOk(skull)===true,'control: a Gemini Elf summoned this turn cannot attack');
  ok(mainOne([mon('Toon Gemini Elf',p,0)],[skull],[mon('Toon Summoned Skull',o,0)]).specialOk(skull)===true,'control: their bigger Toon blocks it, no attack to lose');
  ok(mainOne([mon('Toon Summoned Skull',p,0,1,{status:SUMMON_TURN})],[girl]).specialOk(girl)===true,'a fresh Skull becomes Dark Magician Girl, who attacks now');
  ok(mainOne([mon('Toon Summoned Skull',p,0,1,{status:SUMMON_TURN})],[girl],[mon('Toon Mermaid',o,0)]).specialOk(girl)===false,'not when their Toon blocks her');
  const after=smartContext(duel(p,{mzone:[mon('Toon Gemini Elf',p,0,1,{attack_count:1})],szone:[world],hand:[skull]},{mzone:[]},{phase:256}),p,L,{to_bp:false});
  ok(after.specialOk(skull)===true,'control: Main Phase 2 after the attack');
 }
 // 3. The summoning procedure's Release selection takes the cheapest monster, not the strongest.
 {
  const cannon=mon('Toon Cannon Soldier',p,0),elf=mon('Toon Gemini Elf',p,1);
  const t=smartContext(duel(p,{mzone:[cannon,elf],szone:[world],hand:[inHand('Toon Summoned Skull',0)]},{mzone:[]},{selectionHint:500,materialSubject:id('Toon Summoned Skull')}),p,L,{});
  // With no effect resolving, duel.js passes the name of an undefined code.
  const none=new MobileDuel(meta.cards).name(undefined);
  ok(t.targetScore(none,cannon,{})>t.targetScore(none,elf,{}),'Tributes Toon Cannon Soldier over Toon Gemini Elf');
  const big=mon('Toon Summoned Skull',p,2),girl=smartContext(duel(p,{mzone:[mon('Toon Mermaid',p,0),big]},{mzone:[]},{selectionHint:500,materialSubject:id('Toon Dark Magician Girl')}),p,L,{});
  ok(girl.targetScore(none,mon('Toon Mermaid',p,0),{})>girl.targetScore(none,big,{}),'Toon Mermaid goes before a Toon Summoned Skull');
  const other=smartContext(duel(p,{mzone:[cannon,elf],szone:[world]},{mzone:[]},{selectionHint:502}),p,L,{});
  ok(other.targetScore(none,cannon,{})===null,'control: other hints keep the generic choice');
 }
 // 5. Toon Mermaid comes out for free beside Toon World while they have no Toon.
 {
  const mermaid=inHand('Toon Mermaid',0),goblin=mon('Goblin Attack Force',o,0);
  ok(smartContext(duel(p,{mzone:[],szone:[world],hand:[mermaid]},{mzone:[goblin]}),p,L,{to_bp:true}).summonUtility(mermaid)===true,'Toon Mermaid onto an empty field');
  ok(smartContext(duel(p,{mzone:[],szone:[],hand:[mermaid]},{mzone:[goblin]}),p,L,{to_bp:true}).summonUtility(mermaid)===false,'not without Toon World');
  ok(smartContext(duel(p,{mzone:[],szone:[world],hand:[mermaid]},{mzone:[mon('Toon Summoned Skull',o,0)]}),p,L,{to_bp:true}).summonUtility(mermaid)===false,'not into their Toon');
  ok(smartContext(duel(p,{mzone:[],szone:[world],hand:[mermaid]},{mzone:[goblin],szone:[card('Swords of Revealing Light',L.SZONE,o,0,1)]}),p,L,{to_bp:true}).summonUtility(mermaid)===false,'not under their Swords of Revealing Light');
 }
 // 4. Toon Defense: flipped before attacks, redirects only an attack the Toon would lose.
 {
  const setTd=card('Toon Defense',L.SZONE,p,1,10),upTd=card('Toon Defense',L.SZONE,p,1,1),mermaid=mon('Toon Mermaid',p,0),bug=mon('Neo Bug',o,0);
  ok(smartContext(duel(p,{mzone:[mermaid],szone:[world,setTd]},{mzone:[bug]},{player:o,phase:1}),p,L,{}).activation(setTd,true)>=0,'flip in their Draw Phase');
  ok(smartContext(duel(p,{mzone:[mon('Toon Summoned Skull',p,0)],szone:[world,setTd]},{mzone:[bug]},{player:o,phase:1}),p,L,{}).activation(setTd,true)<0,'not with only a Level 6 Toon');
  ok(smartContext(duel(p,{mzone:[mermaid],szone:[world,setTd]},{mzone:[bug]},{player:p,phase:4}),p,L,{}).activation(setTd,true)<0,'not in our own turn');
  const attack=(lp,szone,attacker=bug,target=mermaid)=>smartContext(duel(p,{mzone:[target],szone},{mzone:[attacker]},{player:o,phase:8,lp:p?[8000,lp]:[lp,8000],attackCard:attacker,attackTarget:target}),p,L,{});
  // The trigger's yes/no prompt names the card's zone but not its position.
  const prompt={code:id('Toon Defense'),controller:p,location:L.SZONE,sequence:1};
  ok(attack(4200,[world,upTd]).activation(prompt,true)>=0,'Neo Bug would destroy Toon Mermaid: make it direct');
  ok(attack(4200,[world,upTd]).activation(upTd,true)>=0,'same with the live card');
  ok(attack(3500,[world,upTd]).activation(prompt,true)<0,'not when the hit leaves under 2000 LP');
  ok(attack(4200,[world,upTd],mon('Basic Insect',o,0)).activation(prompt,true)<0,'not when the Toon wins the battle');
  ok(attack(4200,[world,upTd,card('Mirror Force',L.SZONE,p,2,10)]).activation(prompt,true)<0,'a Set Mirror Force answers it first');
  ok(attack(4200,[world,setTd]).activation(setTd,true)<0,'a Set Toon Defense cannot answer this attack');
 }
}
console.log(`PASS ${checks} Toon deck rule cases for both sides`);
