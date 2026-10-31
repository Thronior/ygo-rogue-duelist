// CPU misplays confirmed in the 2026-10-26 replay review (players' replays, v0.2.1 builds).
import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,R,I,B,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url))),id=n=>meta.cards.find(c=>c.name===n).id;
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,position,controller,location,sequence,type:data[id(name)]?.type||0,...extra});
const mon=(name,controller,sequence,position=1,extra)=>card(name,L.MZONE,controller,sequence,position,extra);
const back=(name,controller,sequence,position=1,extra)=>card(name,L.SZONE,controller,sequence,position,extra);
const filler=(controller,n=20)=>Array.from({length:n},(_,i)=>card('Battle Ox',L.DECK,controller,i,10));
// A CPU (seat 1) duel whose zones are given as {[player]:{[location]:cards}}.
function duel(zones,state={}){
 const e=new MobileDuel(meta.cards);
 Object.assign(e,{data,lp:[8000,8000],turn:5,player:1,phase:4,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},state);
 // The core returns field zones indexed by sequence, with empty slots.
 const slots=list=>{const out=Array(5).fill(null);for(const c of list)out[c.sequence]=c;return out};
 for(const p of [0,1]){zones[p]={[L.DECK]:filler(p),...zones[p]};for(const loc of [L.MZONE,L.SZONE])zones[p][loc]=slots(zones[p][loc]||[]);}
 e.query=(side,loc)=>zones[side]?.[loc]||[];
 e.core={duelQueryCount:(_,side,loc)=>(zones[side]?.[loc]||[]).length};
 return e;
}
const idle=(o={})=>({type:M.SELECT_IDLECMD,player:1,summons:[],special_summons:[],monster_sets:[],spell_sets:[],activates:[],pos_changes:[],to_bp:true,to_ep:true,...o});

// 1. A face-up Kelbek returns its attacker to the hand: attack a 1600-ATK monster instead.
{
 const kamakiri=mon('Flying Kamakiri #2',1,2,1,{attack:2200}),kelbek=mon('Kelbek',0,1,4),zera=mon('Warrior of Zera',0,2,1);
 const e=duel({1:{[L.MZONE]:[kamakiri]},0:{[L.MZONE]:[kelbek,zera]}},{phase:8});
 e.attacker={...kamakiri,player:1};e.selectionHint=549;
 assert.deepEqual(e.auto({type:M.SELECT_CARD,player:1,min:1,max:1,selects:[kelbek,zera]}).indicies,[1],'a known face-up Kelbek is not attacked while a profitable target exists');
}

// 2. Enemy Controller on the opponent's turn only stops an attack in progress, and targets the attacker.
{
 const ec=back('Enemy Controller',1,2,10),option={...ec,description:BigInt(id('Enemy Controller'))<<20n};
 const ogre=mon('Battle Ox',0,1),skilled=mon('Skilled Dark Magician',0,2,1,{attack:1900});
 const zones={1:{[L.SZONE]:[ec],[L.MZONE]:[mon('7 Colored Fish',1,2,4)]},0:{[L.MZONE]:[ogre,skilled]}};
 const e=duel(zones,{player:0,phase:8});
 assert.equal(e.auto({type:M.SELECT_CHAIN,player:1,forced:false,selects:[option]}).index,null,'no position change after the opponent declined to attack');
 e.attackCard={controller:0,location:L.MZONE,sequence:1};
 e.effect={code:id('Enemy Controller'),player:1};
 assert.deepEqual(e.auto({type:M.SELECT_CARD,player:1,min:1,max:1,selects:[skilled,ogre]}).indicies,[1],'switch the attacking monster, not the strongest one');
}

// 3. Hane-Hane's forced bounce with only our own monsters: keep the strongest, prefer a flip monster.
{
 const hane=mon('Hane-Hane',1,1,4),mask=mon('Mask of Darkness',1,2,4),skilled=mon('Skilled Dark Magician',1,3,1,{attack:2100});
 // Equal scores are broken by a seeded shuffle, so check many duel seeds.
 for(let seed=0;seed<24;seed++){
  const e=duel({1:{[L.MZONE]:[hane,mask,skilled]},0:{}},{player:0,phase:4,reasoningSeed:seed});
  e.effect={code:id('Hane-Hane'),player:1};
  const pick=e.auto({type:M.SELECT_CARD,player:1,min:1,max:1,selects:[hane,mask,skilled]}).indicies[0];
  assert.ok([0,1].includes(pick),`seed ${seed}: return a flip monster that can be set again, not Skilled Dark Magician`);
 }
}

// 4. ATK equal to a face-up DEF achieves nothing; the opponent's Dragon's Rage never affects your Dragons (it pierces only for its owner).
{
 const apophis=mon('Embodiment of Apophis',1,3,1,{attack:1600}),lady=mon('D.D. Warrior Lady',0,3,4,{defense:1600});
 let e=duel({1:{[L.MZONE]:[apophis]},0:{[L.MZONE]:[lady]}},{phase:8});
 assert.notEqual(e.auto({type:M.SELECT_BATTLECMD,player:1,chains:[],attacks:[apophis],to_m2:true,to_ep:true}).action,B.SELECT_BATTLE,'1600 ATK into 1600 DEF is not an attack');
 const spear=mon('Spear Dragon',1,4,1),hidden=mon('D.D. Warrior Lady',0,3,8),rage=back("Dragon's Rage",0,0,1),eyes=mon('Blue-Eyes White Dragon',1,0,1);
 e=duel({1:{[L.MZONE]:[spear,eyes]},0:{[L.MZONE]:[hidden],[L.SZONE]:[rage]}},{phase:8});
 const smart=smartContext(e,1,L,{type:M.SELECT_BATTLECMD,player:1,attacks:[spear,eyes]});
 assert.equal(smart.attackBackfires(spear,hidden),false,"Spear Dragon's own piercing damages the defender");
 assert.equal(smart.attackBackfires(eyes,hidden),false,"the opponent's Dragon's Rage does not touch a non-piercing Dragon either");
}

// 5. Temple of the Kings on the field: do not trade Serket and the Temple for a vanilla monster.
{
 const temple=back('Temple of the Kings',1,1,1),serket=mon('Mystical Beast of Serket',1,2,1);
 const deck=[card('Summoned Skull',L.DECK,1,0,10),...filler(1)];
 const e=duel({1:{[L.MZONE]:[serket],[L.SZONE]:[temple],[L.DECK]:deck},0:{}});
 const r=e.auto(idle({activates:[{...temple,position:undefined}]}));
 assert.ok(!(r.action===I.SELECT_ACTIVATE&&r.index===0),'face-up Temple is not used for a weaker summon');
}

// 6. Removal during the opponent's Battle Phase targets the monster with attacks left (Gray Wing), not the one already attacking.
{
 const masked=mon('Masked Dragon',0,2),gray=mon('Gray Wing',0,3);
 const e=duel({0:{[L.MZONE]:[masked,gray]},1:{[L.MZONE]:[mon('Man-Eater Bug',1,2,4)]}},{player:0,phase:8,lp:[7000,4500]});
 e.attackCard={controller:0,location:L.MZONE,sequence:2};
 e.attacksThisTurn=new Map([['0:2',1]]);e.extraAttacks=new Map([['0:3',id('Gray Wing')]]);
 e.effect={code:id('Man-Eater Bug'),player:1};
 assert.deepEqual(e.auto({type:M.SELECT_CARD,player:1,min:1,max:1,selects:[masked,gray]}).indicies,[1],'destroy the double attacker');
}

// 7. Lethal Normal Summons: equip locks are respected, flip monsters count, and spare attackers cover set traps.
{
 const feeds=mon('That Which Feeds on Life',1,1,1),mask=back('Mask of the Accursed',0,0,1,{equip_card:{controller:1,location:L.MZONE,sequence:1}});
 const terra=card('Terra the Terrible',L.HAND,1,0);
 let e=duel({1:{[L.MZONE]:[feeds],[L.HAND]:[terra]},0:{[L.SZONE]:[mask]}},{lp:[600,3500]});
 assert.equal(smartContext(e,1,L,idle()).attackBlocked(feeds,1),true,'Mask of the Accursed stops the equipped monster attacking');
 assert.deepEqual(e.auto(idle({summons:[terra],monster_sets:[terra]})),{type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:0},'summon for lethal instead of relying on the locked monster');
 const penguin=card('Penguin Soldier',L.HAND,1,0);
 e=duel({1:{[L.HAND]:[penguin]},0:{}},{lp:[300,3500]});
 assert.equal(e.auto(idle({summons:[penguin],monster_sets:[penguin]})).action,I.SELECT_SUMMON,'a flip monster is summoned face-up when that wins');
 const swords=back('Swords of Revealing Light',0,0,1);
 e=duel({1:{[L.HAND]:[penguin]},0:{[L.SZONE]:[swords]}},{lp:[300,3500]});
 assert.equal(smartContext(e,1,L,idle()).attackBlocked(penguin,1,true),true,'Swords of Revealing Light still stops a lethal summon');
 const gator=mon('Cyber-Tech Alligator',1,2,1),soldier=card('Archfiend Soldier',L.HAND,1,0);
 e=duel({1:{[L.MZONE]:[gator],[L.HAND]:[soldier]},0:{[L.SZONE]:[back('Mirror Force',0,1,10)]}},{lp:[1500,2000]});
 assert.equal(e.auto(idle({summons:[soldier],monster_sets:[soldier]})).action,I.SELECT_SUMMON,'add a spare attacker before attacking into set cards');
 e=duel({1:{[L.MZONE]:[gator],[L.HAND]:[soldier]},0:{}},{lp:[1500,2000]});
 assert.equal(e.auto(idle({summons:[soldier],monster_sets:[soldier]})).action,I.TO_BP,'with no set cards, attack straight away');
}

// 8. An ATK-only equip is not wasted on a Defense Position monster that will not attack this turn.
{
 const reaper=mon('Dokuroizo the Grim Reaper',1,2,4),pendant=card('Black Pendant',L.HAND,1,0);
 const e=duel({1:{[L.MZONE]:[reaper],[L.HAND]:[pendant]},0:{[L.MZONE]:[mon('Bazoo the Soul-Eater',0,2,1)]}});
 const r=e.auto(idle({spell_sets:[pendant],activates:[pendant]}));
 assert.ok(!(r.action===I.SELECT_ACTIVATE&&r.index===0),'Black Pendant is not equipped to a defending monster');
}

// 9. Flip Cyber Jar before Normal Summoning or Setting a monster it would destroy.
{
 const jar=mon('Cyber Jar',1,1,8),soldier=mon('Giant Soldier of Stone',1,2,8);
 const hand=['Morphing Jar','Rock Ogre Grotto #1','Stone Armadiller','Trap Hole'].map((n,i)=>card(n,L.HAND,1,i));
 const e=duel({1:{[L.MZONE]:[jar,soldier],[L.HAND]:hand},0:{}},{lp:[7900,5550]});
 const monsters=hand.slice(0,3);
 assert.deepEqual(e.auto(idle({summons:monsters,monster_sets:monsters,spell_sets:[hand[3]],pos_changes:[soldier,jar]})),{type:R.SELECT_IDLECMD,action:I.SELECT_POS_CHANGE,index:1},'flip Cyber Jar first');
}

// 10. Dragon Capture Jar is not activated when only our own Dragons would be locked.
{
 const jar=back('Dragon Capture Jar',1,3,10),curse=mon('Curse of Dragon',1,2,1);
 const enemy=[mon("King's Knight",0,1,1,{attack:2600}),mon('Harpie Lady',0,3,1,{attack:2600})];
 let e=duel({1:{[L.MZONE]:[curse],[L.SZONE]:[jar]},0:{[L.MZONE]:enemy}},{player:0,phase:1,lp:[3300,1800]});
 assert.equal(e.auto({type:M.SELECT_CHAIN,player:1,forced:false,selects:[jar]}).index,null,'no Dragon Capture Jar against non-Dragons');
 e=duel({1:{[L.MZONE]:[curse],[L.SZONE]:[jar]},0:{[L.MZONE]:[mon('Blue-Eyes White Dragon',0,1,1),mon('Blue-Eyes White Dragon',0,2,1)]}},{player:0,phase:1,lp:[3300,1800]});
 assert.equal(e.auto({type:M.SELECT_CHAIN,player:1,forced:false,selects:[jar]}).index,0,'Dragon Capture Jar still stops the opponent\'s Dragons');
}
// 11. Patrician of Darkness: its controller chooses attack targets. Checked from both seats.
for(const p of [0,1]){
 const seat=(zones,state)=>duel(zones,{player:p,phase:8,...state});
 const vorse=mon('Vorse Raider',p,2,1),patrician=mon('Patrician of Darkness',1-p,1,1),kuriboh=mon('Kuriboh',1-p,3,1);
 const battle={type:M.SELECT_BATTLECMD,player:p,chains:[],attacks:[vorse],to_m2:true,to_ep:true};
 assert.notEqual(seat({[p]:{[L.MZONE]:[vorse]},[1-p]:{[L.MZONE]:[patrician,kuriboh]}}).auto(battle).action,B.SELECT_BATTLE,`seat ${p}: do not attack when the Patrician owner can send the attack into Patrician`);
 assert.equal(seat({[p]:{[L.MZONE]:[vorse]},[1-p]:{[L.MZONE]:[kuriboh]}}).auto(battle).action,B.SELECT_BATTLE,`seat ${p}: control, attack Kuriboh without Patrician`);
 // Our Patrician: send the opponent's attack where it hurts them most.
 const attacker=mon('Vorse Raider',1-p,2,1),ours=mon('Patrician of Darkness',p,1,1),small=mon('Kuriboh',p,3,1),wall=mon('Giant Soldier of Stone',p,4,4);
 let e=seat({[p]:{[L.MZONE]:[ours,small]},[1-p]:{[L.MZONE]:[attacker]}},{player:1-p});
 e.attacker={...attacker,player:1-p};e.selectionHint=549;
 assert.deepEqual(e.auto({type:M.SELECT_CARD,player:p,min:1,max:1,selects:[small,ours]}).indicies,[1],`seat ${p}: Patrician meets the attack and destroys the attacker`);
 e=seat({[p]:{[L.MZONE]:[small,wall]},[1-p]:{[L.MZONE]:[attacker]}},{player:1-p});
 e.attacker={...attacker,player:1-p};e.selectionHint=549;
 assert.deepEqual(e.auto({type:M.SELECT_CARD,player:p,min:1,max:1,selects:[small,wall]}).indicies,[1],`seat ${p}: a 2000-DEF wall blocks the attack instead of losing Kuriboh`);
}
console.log('PASS replay review Oct 26: Patrician of Darkness targets, Kelbek, Enemy Controller timing, forced self-bounce, equal-DEF and self-piercing attacks, Temple of the Kings, Battle Phase removal, lethal summons, ATK equips, Cyber Jar order, Dragon Capture Jar');
