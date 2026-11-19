// All-decks CPU review (2026-11-19): rules for cards the sweep found the CPU never played — Deal of Phantom, Windstorm
// of Etaqua, Dark Mirror Force, Amazoness Archers, Dramatic Rescue, Soul Rope, Birdface, Amazoness Chain Master,
// Amazoness Archer, Karate Man, Triangle Ecstasy Spark, Amazoness Spellcaster and Reload. Each for both seats, with a
// negative or control case.
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
 const inHand=(name,side,seq)=>card(name,L.HAND,side,seq,10),gy=(name,seq)=>card(name,L.GRAVE,p,seq,5);
 const theirAttack=(trap,mine,theirs,attacker,target,state={},extra={})=>smartContext(duel(p,{mzone:mine,szone:[trap],...extra},{mzone:theirs},{player:o,phase:8,attackCard:ref(attacker),attackTarget:target&&ref(target),...state}),p,L).activation(trap,true);
 // 1. Deal of Phantom: +100 per monster in our GY, in their Damage Step.
 {
  const trap=set('Deal of Phantom',p,0),soldier=mon('Archfiend Soldier',p,0),skull=mon('Summoned Skull',o,0);
  const grave=n=>Array.from({length:n},(_,i)=>gy('Battle Ox',i));
  ok(theirAttack(trap,[soldier],[skull],skull,soldier,{inDamageStep:true},{grave:grave(7)})>=90,'seven monsters lift Archfiend Soldier past Summoned Skull');
  ok(theirAttack(trap,[soldier],[skull],skull,soldier,{inDamageStep:true},{grave:grave(3)})<0,'three are not enough');
  ok(theirAttack(trap,[soldier],[skull],skull,soldier,{},{grave:grave(7)})<0,'waits for the Damage Step on their turn');
  const e=duel(p,{mzone:[soldier],szone:[trap],grave:grave(7)},{mzone:[skull]},{player:o,phase:8,attackCard:ref(skull),attackTarget:ref(soldier),effect:{code:id('Deal of Phantom'),player:p}});
  const t=smartContext(e,p,L);ok(t.targetScore('Deal of Phantom',soldier,{})>t.targetScore('Deal of Phantom',skull,{}),'targets our monster in the battle');
 }
 // 2. Windstorm of Etaqua stops a damaging attack; 3. Dark Mirror Force banishes their walls.
 {
  const storm=set('Windstorm of Etaqua',p,0),soldier=mon('Archfiend Soldier',p,0),skull=mon('Summoned Skull',o,0),kuriboh=mon('Kuriboh',o,0);
  ok(theirAttack(storm,[soldier],[skull],skull,soldier)>=85,'switches Summoned Skull to Defense Position');
  ok(theirAttack(storm,[soldier],[kuriboh],kuriboh,soldier)<0,'not against a harmless attack');
  const mirror=set('Dark Mirror Force',p,0),walls=[mon('Battle Ox',o,1,8),mon('Gemini Elf',o,2,4)];
  ok(theirAttack(mirror,[soldier],[skull,...walls],skull,soldier)>=80,'two Defense Position monsters banished');
  ok(theirAttack(mirror,[soldier],[skull],skull,soldier)<0,'nothing in Defense Position');
 }
 // 4. Amazoness Archers: -500 ATK turns the attack; needs an Amazoness of ours.
 {
  const archers=set('Amazoness Archers',p,0),fighter=mon('Amazoness Fighter',p,0),ox=mon('Battle Ox',o,0),skull=mon('Summoned Skull',o,0);
  ok(theirAttack(archers,[fighter],[ox],ox,fighter)>=80,'Battle Ox at 1200 loses to Amazoness Fighter');
  ok(theirAttack(archers,[fighter],[skull],skull,fighter)<0,'Summoned Skull still wins at 2000');
  const soldier=mon('Archfiend Soldier',p,0);
  ok(theirAttack(archers,[soldier],[ox],ox,soldier)<0,'no Amazoness, no activation');
 }
 // 5. Dramatic Rescue saves an Amazoness their card targets.
 {
  const rescue=set('Dramatic Rescue',p,0),fighter=mon('Amazoness Fighter',p,0),chain=[{player:o,code:id('Fissure'),targets:[ref(fighter)]}];
  const use=hand=>smartContext(duel(p,{mzone:[fighter],szone:[rescue],hand},{mzone:[]},{player:o,activeChain:chain}),p,L).activation(rescue,true);
  ok(use([inHand('Battle Ox',p,0)])>=80,'returns the Amazoness and summons Battle Ox');
  ok(use([inHand('Fissure',p,0)])<0,'no monster in hand to summon');
 }
 // 6. Soul Rope, Birdface, Amazoness Chain Master, Amazoness Archer.
 {
  const rope=set('Soul Rope',p,0),deck=[card('Archfiend Soldier',L.DECK,p,0,10)];
  ok(smartContext(duel(p,{mzone:[],szone:[rope],deck},{mzone:[]},{player:o}),p,L).activation(rope,true)>=80,'Soul Rope summons a Level 4');
  ok(smartContext(duel(p,{mzone:[],szone:[rope],deck},{mzone:[]},{player:o,lp:p===0?[2000,8000]:[8000,2000]}),p,L).activation(rope,true)<0,'not at 2000 LP');
  const bird=gy('Birdface',0);ok(smartContext(duel(p,{mzone:[],grave:[bird]},{mzone:[]},{player:o}),p,L).activation(bird,true)>=80,'Birdface searches');
  const master=gy('Amazoness Chain Master',0);
  ok(smartContext(duel(p,{mzone:[],grave:[master]},{mzone:[],hand:[inHand('Battle Ox',o,0)]},{player:o}),p,L).activation(master,true)>=80,'Chain Master takes a monster');
  ok(smartContext(duel(p,{mzone:[],grave:[master]},{mzone:[],hand:[]},{player:o}),p,L).activation(master,true)<0,'not into an empty hand');
  const archer=mon('Amazoness Archer',p,0),fodder=mon('Battle Ox',p,1);
  ok(smartContext(duel(p,{mzone:[archer,fodder]},{mzone:[]},{lp:p===0?[8000,1000]:[1000,8000]}),p,L).activation(archer,false)>=90,'Archer finishes at 1000 LP');
  ok(smartContext(duel(p,{mzone:[archer,fodder]},{mzone:[]}),p,L).activation(archer,false)<0,'Archer keeps its Tributes at 8000 LP');
 }
 // 7. Karate Man doubles for a kill worth it, in Main Phase 1 of our turn.
 {
  const karate=mon('Karate Man',p,0);
  ok(smartContext(duel(p,{mzone:[karate]},{mzone:[mon('Gemini Elf',o,0)]}),p,L,{to_bp:true}).activation(karate,false)>=70,'2000 ATK beats Gemini Elf');
  ok(smartContext(duel(p,{mzone:[karate]},{mzone:[mon('Summoned Skull',o,0)]}),p,L,{to_bp:true}).activation(karate,false)<0,'still loses to Summoned Skull');
  ok(smartContext(duel(p,{mzone:[karate]},{mzone:[mon('Gemini Elf',o,0)]},{player:o}),p,L).activation(karate,false)<0,'never on their turn');
  const entry={code:karate.code,controller:p,location:L.MZONE,sequence:0};
  ok(smartContext(duel(p,{mzone:[karate]},{mzone:[mon('Gemini Elf',o,0)]}),p,L,{to_bp:true}).activation(entry,false)>=70,'the positionless idle entry reads the live card');
 }
 // 8. Triangle Ecstasy Spark: 2700 ATK Sisters for a kill.
 {
  const spark=inHand('Triangle Ecstasy Spark',p,0),sisters=mon('Harpie Lady Sisters',p,0);
  ok(smartContext(duel(p,{mzone:[sisters],hand:[spark]},{mzone:[mon('Summoned Skull',o,0)]}),p,L,{to_bp:true}).activation(spark,false)>=75,'Sisters at 2700 beat Summoned Skull');
  ok(smartContext(duel(p,{mzone:[sisters],hand:[spark]},{mzone:[mon('Kuriboh',o,0)]}),p,L,{to_bp:true}).activation(spark,false)<0,'no use against Kuriboh with no Set cards');
  ok(smartContext(duel(p,{mzone:[],hand:[spark]},{mzone:[mon('Summoned Skull',o,0)]}),p,L,{to_bp:true}).activation(spark,false)<0,'no Sisters');
 }
 // 9. Amazoness Spellcaster swaps Fighter's 1500 for Summoned Skull's 2500.
 {
  const spell=inHand('Amazoness Spellcaster',p,0),fighter=mon('Amazoness Fighter',p,0),skull=mon('Summoned Skull',o,0),kuriboh=mon('Kuriboh',o,1);
  ok(smartContext(duel(p,{mzone:[fighter],hand:[spell]},{mzone:[skull,kuriboh]}),p,L,{to_bp:true}).activation(spell,false)>=75,'swap to beat Summoned Skull');
  ok(smartContext(duel(p,{mzone:[fighter],hand:[spell]},{mzone:[kuriboh]}),p,L,{to_bp:true}).activation(spell,false)<0,'nothing worth swapping with');
  const t=smartContext(duel(p,{mzone:[fighter],hand:[spell]},{mzone:[skull,kuriboh]},{effect:{code:id('Amazoness Spellcaster'),player:p}}),p,L);
  ok(t.targetScore('Amazoness Spellcaster',skull,{})>t.targetScore('Amazoness Spellcaster',kuriboh,{}),'targets Summoned Skull, not Kuriboh');
 }
 // 11. Fusilier Dragon is summoned without Tributes when we have no Tributes, unlike a real Level 7.
 {
  const fusilier=inHand('Fusilier Dragon, the Dual-Mode Beast',p,0),blue=inHand('Blue-Eyes White Dragon',p,1);
  const t=smartContext(duel(p,{mzone:[],hand:[fusilier,blue]},{mzone:[mon('Battle Ox',o,0)]}),p,L,{summons:[fusilier],monster_sets:[fusilier]});
  ok(t.tributeWorth(fusilier,true)===true&&t.tributeWorth(fusilier,false)===true,'Fusilier Dragon: no-Tribute body');
  ok(t.tributeWorth(blue,false)===false,'control: Blue-Eyes still needs two Tributes');
 }
 // 12. Backup Soldier, Archfiend's Roar, Lady Ninja Yae, Miracle Restoring, Catapult Turtle.
 {
  const backup=set('Backup Soldier',p,0),normals=['Battle Ox','Mystic Horseman','Kagemusha of the Blue Flame','Ancient Elf','Celtic Guardian'].map((n,i)=>gy(n,i));
  ok(smartContext(duel(p,{mzone:[],szone:[backup],grave:normals,hand:[inHand('Fissure',p,0),inHand('Pot of Greed',p,1)]},{mzone:[]}),p,L).activation(backup,false)>=70,'Backup Soldier recovers Normal monsters');
  const effects=['Sangan','Witch of the Black Forest','Mystic Tomato','Giant Rat','Summoned Skull'].map((n,i)=>gy(n,i));
  ok(smartContext(duel(p,{mzone:[],szone:[backup],grave:effects,hand:[inHand('Fissure',p,0),inHand('Pot of Greed',p,1)]},{mzone:[]}),p,L).activation(backup,false)<0,'nothing it can return');
  const roar=set("Archfiend's Roar",p,0),fiend=gy('Archfiend Soldier',0);
  ok(smartContext(duel(p,{mzone:[],szone:[roar],grave:[fiend]},{mzone:[mon('Kuriboh',o,0)]}),p,L,{to_bp:true}).activation(roar,false)>=70,"Archfiend's Roar brings back an attacker");
  ok(smartContext(duel(p,{mzone:[],szone:[roar],grave:[fiend]},{mzone:[mon('Summoned Skull',o,0)]}),p,L,{to_bp:true}).activation(roar,false)<0,'not into a stronger monster');
  ok(smartContext(duel(p,{mzone:[],szone:[roar],grave:[fiend]},{mzone:[]},{player:o}),p,L).activation(roar,true)<0,'not on their turn');
  const yae=mon('Lady Ninja Yae',p,0),wind=inHand('Harpie Lady',p,0),two=[set('Mirror Force',o,0),set('Trap Hole',o,1)];
  ok(smartContext(duel(p,{mzone:[yae],hand:[wind]},{mzone:[],szone:two}),p,L,{to_bp:true}).activation(yae,false)>=75,'Yae clears two Set cards');
  ok(smartContext(duel(p,{mzone:[yae],hand:[wind]},{mzone:[],szone:[two[0]]}),p,L,{to_bp:true}).activation(yae,false)<0,'one Set card is not worth a WIND discard');
  ok(smartContext(duel(p,{mzone:[yae],hand:[inHand('Battle Ox',p,0)]},{mzone:[],szone:two}),p,L,{to_bp:true}).activation(yae,false)<0,'no WIND monster to discard');
  const miracle=set('Miracle Restoring',p,0);
  ok(smartContext(duel(p,{mzone:[],szone:[miracle],grave:[gy('Dark Magician',0)]},{mzone:[]}),p,L).activation(miracle,false)>=80,'Miracle Restoring revives Dark Magician');
  ok(smartContext(duel(p,{mzone:[],szone:[miracle],grave:[gy('Battle Ox',0)]},{mzone:[]}),p,L).activation(miracle,false)<0,'nothing to revive');
  const turtle=mon('Catapult Turtle',p,0),skull=mon('Summoned Skull',p,1),ox=mon('Battle Ox',p,2);
  ok(smartContext(duel(p,{mzone:[turtle,skull,ox]},{mzone:[]},{lp:p===0?[8000,1200]:[1200,8000]}),p,L).activation(turtle,false)>=90,'Catapult Turtle finishes with Summoned Skull');
  ok(smartContext(duel(p,{mzone:[turtle,skull,ox]},{mzone:[]}),p,L).activation(turtle,false)<0,'no lethal, no Tribute');
  const t=smartContext(duel(p,{mzone:[turtle,skull,ox]},{mzone:[]},{effect:{code:id('Catapult Turtle'),player:p}}),p,L);
  ok(t.targetScore('Catapult Turtle',skull,{})>t.targetScore('Catapult Turtle',ox,{}),'Tributes Summoned Skull for the damage');
 }
 // 13. Canyon goes down with a Rock wall of ours.
 {
  const canyon=inHand('Canyon',p,0);
  ok(smartContext(duel(p,{mzone:[mon('Giant Soldier of Stone',p,0,4)],hand:[canyon]},{mzone:[mon('Battle Ox',o,0)]}),p,L,{to_bp:true}).activation(canyon,false)>=60,'Canyon behind Giant Soldier of Stone');
  ok(smartContext(duel(p,{mzone:[mon('Battle Ox',p,0)],hand:[canyon]},{mzone:[mon('Giant Soldier of Stone',o,0,4)]}),p,L,{to_bp:true}).activation(canyon,false)<0,'not for their Rock wall');
 }
 // 14. Spirit deck: Tsukuyomi needs a face-up target, Yata-Garasu goes on an empty field; Heavy Storm counts the Toons
 // that die with Toon World.
 {
  const tsuku=inHand('Tsukuyomi',p,0),yata=inHand('Yata-Garasu',p,1),susa=inHand('Susa Soldier',p,2);
  let t=smartContext(duel(p,{mzone:[],hand:[tsuku,yata,susa]},{mzone:[]}),p,L,{to_bp:true,summons:[tsuku,yata,susa]});
  ok(t.summonScore(tsuku)<0,'no Tsukuyomi with nothing to turn face-down');
  ok(t.summonScore(yata)>t.summonScore(susa),'Yata-Garasu over Susa Soldier against an empty field');
  t=smartContext(duel(p,{mzone:[],hand:[tsuku,yata,susa]},{mzone:[mon('Summoned Skull',o,0)]}),p,L,{to_bp:true,summons:[tsuku,yata,susa]});
  ok(t.summonScore(tsuku)>=0,'control: Tsukuyomi with a face-up target');
  ok(t.summonScore(yata)<150,'control: Yata-Garasu is not forced into a monster');
  const storm=inHand('Heavy Storm',p,0),invitation=set("Spirit's Invitation",p,0,5);
  const theirs=[set('Toon World',o,0,5),set('Mirror Wall',o,1),set('Mirror Force',o,2)];
  ok(smartContext(duel(p,{mzone:[],hand:[storm],szone:[invitation]},{mzone:[mon('Blue-Eyes Toon Dragon',o,0)],szone:theirs}),p,L,{to_bp:true}).activation(storm,false)>=100,'Heavy Storm takes Toon World and its Blue-Eyes Toon Dragon');
 }
 // 15. A face-up Frontline Base summons a Union (the idle entry has no position); Dark Magic Curtain with a weak field.
 {
  const base=set('Frontline Base',p,0,5),union=inHand('Heavy Mech Support Platform',p,0);
  const entry={code:base.code,controller:p,location:L.SZONE,sequence:0};
  ok(smartContext(duel(p,{mzone:[],szone:[base],hand:[union]},{mzone:[]}),p,L,{to_bp:true}).activation(entry,false)>=100,'face-up Frontline Base summons Heavy Mech');
  ok(smartContext(duel(p,{mzone:[],szone:[base],hand:[inHand('Battle Ox',p,0)]},{mzone:[]}),p,L,{to_bp:true}).activation(entry,false)<0,'no Union in hand');
  const curtain=inHand('Dark Magic Curtain',p,0),deck=[card('Dark Magician',L.DECK,p,0,10)],weak=mon('Skilled Dark Magician',p,0,8);
  ok(smartContext(duel(p,{mzone:[weak],hand:[curtain],deck},{mzone:[mon('Gemini Elf',o,0)]}),p,L,{to_bp:true}).activation(curtain,false)>=90,'Curtain at 8000 LP behind a weak Set monster');
  ok(smartContext(duel(p,{mzone:[weak],hand:[curtain],deck},{mzone:[mon('Gemini Elf',o,0)]},{lp:p===0?[3000,8000]:[8000,3000]}),p,L,{to_bp:true}).activation(curtain,false)<0,'not at 3000 LP with a monster out');
  ok(smartContext(duel(p,{mzone:[weak],hand:[curtain],deck},{mzone:[mon('Blue-Eyes White Dragon',o,0)]}),p,L,{to_bp:true}).activation(curtain,false)<0,'not when Dark Magician beats nothing');
 }
 // 10. Reload only redraws a dead hand.
 {
  const reload=inHand('Reload',p,0);
  const dead=[inHand('Blue-Eyes White Dragon',p,1),inHand('Summoned Skull',p,2)],live=[inHand('Fissure',p,1),inHand('Pot of Greed',p,2)];
  ok(smartContext(duel(p,{mzone:[],hand:[reload,...dead]},{mzone:[]}),p,L).activation(reload,false)>=60,'stranded Tribute monsters: redraw');
  ok(smartContext(duel(p,{mzone:[],hand:[reload,...live]},{mzone:[]}),p,L).activation(reload,false)<0,'a playable hand stays');
 }
}
console.log(`PASS ${checks} all-decks review rule cases for both sides`);
