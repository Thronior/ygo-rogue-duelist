import assert from 'node:assert/strict';
import fs from 'node:fs';
import {L} from '../../android/web/engine.js';
import {smartContext} from '../../android/web/smart_policy.js';

const content=JSON.parse(fs.readFileSync(new URL('../../android/web/content.json',import.meta.url),'utf8'));
const byName=n=>content.cards.find(c=>c.name===n);
const cards=new Map(content.cards.map(c=>[c.id,c]));
const locations=[L.HAND,L.MZONE,L.SZONE,L.GRAVE,L.DECK,L.REMOVED,L.EXTRA];
const zones=[Object.fromEntries(locations.map(x=>[x,[]])),Object.fromEntries(locations.map(x=>[x,[]]))];
const card=(n,controller,location,sequence=0,position=1)=>{
 const c=byName(n);assert.ok(c,`missing card data: ${n}`);
 return {code:c.id,controller,location,sequence,position,attack:c.atk,defense:c.defense,level:c.level,type:c.data.type};
};
const engine={cards:new Map(content.cards.map(c=>[c.id,c])),data:Object.fromEntries(content.cards.map(c=>[c.id,{...c.data,attack:c.atk,defense:c.defense}])),turn:3,player:0,phase:4,lp:[8000,8000],aiModifiers:{},activeChain:[],name:id=>cards.get(id)?.name,query:(p,l)=>zones[p][l]||[],unknownDefense:()=>1000};
const policy=(p=0,prompt={to_bp:true})=>smartContext(engine,p,L,prompt);
const clear=()=>{for(const side of zones)for(const loc of locations)side[loc]=[];engine.aiModifiers={};engine.lp=[8000,8000];engine.player=0;engine.phase=4;engine.turn=3;engine.attackCard=null;};

// Mars' printed ATK is 0; its live Sanctuary bonus must be forecast before summoning.
clear();engine.lp=[8000,2900];const mars=card('The Agent of Force - Mars',0,L.HAND),sanctuary=card('The Sanctuary in the Sky',0,L.SZONE,5);
zones[0][L.HAND]=[mars];zones[0][L.SZONE]=[sanctuary];
assert.equal(policy().projectedAttack(mars),5100,'forecast Mars ATK from the LP difference while its controller has Sanctuary');
assert.equal(policy().summonUtility(mars),true,'treat Sanctuary-powered Mars as a worthwhile summon');
zones[0][L.SZONE]=[];assert.equal(policy().projectedAttack(mars),0,'do not grant Mars its LP-difference boost without Sanctuary');

// Venus, Mokey Mokey and its continuous Spell all get positive use scores.
clear();const venus=card('The Agent of Creation - Venus',0,L.MZONE),ball=card('Mystical Shine Ball',0,L.DECK);
zones[0][L.MZONE]=[venus];zones[0][L.DECK]=[ball];
let smart=policy();assert.equal(smart.activation(venus),100,'use Venus when a Shine Ball and a free zone are available');
assert.ok(smart.targetScore('The Agent of Creation - Venus',ball,{})>0,'select the Shine Ball for Venus');
clear();const mokey=card('Mokey Mokey',0,L.HAND),smackdown=card('Mokey Mokey Smackdown',0,L.HAND,1);
zones[0][L.HAND]=[mokey,smackdown];smart=policy();
assert.equal(smart.summonUtility(mokey),true,'normal summon Mokey Mokey when Smackdown is available');
assert.equal(smart.activation(smackdown),95,'activate Smackdown for a Mokey Mokey strategy');
zones[0][L.HAND]=[mokey];zones[0][L.SZONE]=[card('Mokey Mokey Smackdown',0,L.SZONE)];
assert.equal(policy().summonUtility(mokey),true,'still summon Mokey after Smackdown has resolved');

// Ojama support: Rescue Cat's two targets, Human-Wave Tactics and Fitting Room.
clear();const cat=card('Rescue Cat',0,L.MZONE),momonga1=card('Nimble Momonga',0,L.DECK),momonga2=card('Nimble Momonga',0,L.DECK,1);
zones[0][L.MZONE]=[cat];zones[0][L.DECK]=[momonga1,momonga2];smart=policy();
assert.equal(smart.activation(cat),100,'use Rescue Cat when two legal Beasts can be summoned');
assert.ok(smart.targetScore('Rescue Cat',momonga1,{cands:[momonga1,momonga2]})>0,'select Rescue Cat targets');
clear();engine.phase=512;const tactics=card('Human-Wave Tactics',0,L.SZONE,0,8),mokeyDeck=card('Mokey Mokey',0,L.DECK);
zones[0][L.SZONE]=[tactics];zones[0][L.DECK]=[mokeyDeck];smart=policy(0,{to_bp:false});
assert.ok(smart.activation(tactics,true)>=90,'resolve Human-Wave Tactics at End Phase when a legal target remains');
assert.ok(smart.targetScore('Human-Wave Tactics',mokeyDeck,{})>0,'select a low-level Normal Monster for Human-Wave Tactics');
clear();engine.lp=[5000,8000];const fitting=card('Enchanting Fitting Room',0,L.HAND),topNormal=card('Mokey Mokey',0,L.DECK,2);
zones[0][L.HAND]=[fitting];zones[0][L.DECK]=[card('Vorse Raider',0,L.DECK),card('The Agent of Creation - Venus',0,L.DECK,1),topNormal,card('Vorse Raider',0,L.DECK,3)];smart=policy();
assert.equal(smart.activation(fitting),100,'use Fitting Room when its excavate contains a summonable Normal Monster');
assert.ok(smart.targetScore('Enchanting Fitting Room',topNormal,{})>0,'prefer eligible excavated Normal Monsters');
engine.deckReversed=true;zones[0][L.DECK]=[card('Vorse Raider',0,L.DECK),card('Vorse Raider',0,L.DECK,1),card('Vorse Raider',0,L.DECK,2),topNormal];
assert.equal(policy().activation(fitting),100,'inspect the opposite sequence end when the deck is reversed');
engine.deckReversed=false;

// Archfiend field spell search, Pandemonium setup and its graveyard search.
clear();const terra=card('Terraforming',0,L.HAND),archfiend=card('Archfiend Soldier',0,L.HAND,1),pandemonium=card('Pandemonium',0,L.DECK);
zones[0][L.HAND]=[terra,archfiend];zones[0][L.DECK]=[pandemonium];smart=policy();
assert.ok(smart.activation(terra)>=90,'search Pandemonium for an Archfiend deck');
assert.ok(smart.targetScore('Terraforming',pandemonium,{})>0,'select Pandemonium for Terraforming');
clear();zones[0][L.HAND]=[card('Pandemonium',0,L.HAND),card('Archfiend Soldier',0,L.HAND,1)];smart=policy();
assert.ok(smart.activation(zones[0][L.HAND][0])>=90,'activate Pandemonium with Archfiends available');

// Ninja and LV lines need to recognize their eligible hand/deck targets.
clear();const ninja=card('Ninja Grandmaster Sasuke',0,L.MZONE),transformation=card('Ninjitsu Art of Transformation',0,L.SZONE),insect=card('Basic Insect',0,L.DECK);
zones[0][L.MZONE]=[ninja];zones[0][L.SZONE]=[transformation];zones[0][L.DECK]=[insect];smart=policy();
assert.ok(smart.activation(transformation)>=100,'activate Transformation with a legal Ninja and target');
zones[0][L.MZONE]=[];zones[0][L.GRAVE]=[ninja];smart=policy();
assert.ok(smart.targetScore('Ninjitsu Art of Transformation',insect,{})>0,'select an eligible Transformation target');
clear();const armed3=card('Armed Dragon LV3',0,L.MZONE),levelUp=card('Level Up!',0,L.HAND),armed5=card('Armed Dragon LV5',0,L.DECK);
zones[0][L.MZONE]=[armed3];zones[0][L.HAND]=[levelUp];zones[0][L.DECK]=[armed5];smart=policy();
assert.ok(smart.activation(levelUp)>=100,'activate Level Up with a listed LV monster available');
zones[0][L.MZONE]=[];zones[0][L.GRAVE]=[armed3];smart=policy();
assert.ok(smart.targetScore('Level Up!',armed5,{})>0,'select the monster listed by the LV source');

// Blue-Eyes lines: use Kaibaman and recognize The Dark as a Fusion substitute.
clear();const kaibaman=card('Kaibaman',0,L.MZONE),blueEyes=card('Blue-Eyes White Dragon',0,L.HAND);
zones[0][L.MZONE]=[kaibaman];zones[0][L.HAND]=[blueEyes];smart=policy();
assert.equal(smart.activation(kaibaman),100,'use Kaibaman when Blue-Eyes is in hand');
assert.equal(smart.summonUtility(kaibaman),true,'treat Kaibaman as a useful summon when its effect is live');
assert.ok(smart.targetScore('Kaibaman',blueEyes,{})>0,'choose Blue-Eyes for Kaibaman');
clear();const poly=card('Polymerization',0,L.HAND),hex=card('The Dark - Hex-Sealed Fusion',0,L.HAND,1),darkMagician=card('Dark Magician',0,L.HAND,2),darkPaladin=card('Dark Paladin',0,L.EXTRA);
zones[0][L.HAND]=[poly,hex,darkMagician];zones[0][L.EXTRA]=[darkPaladin];smart=policy();
assert.equal(smart.fusionReady(),true,'recognize The Dark as one Fusion material substitute');
assert.ok(smart.activation(poly)>=95,'activate Polymerization when the substitute completes a legal Fusion');

// Riryoku, A Hero Emerges and Command Knight are no longer ignored.
clear();const riryoku=card('Riryoku',0,L.HAND),vorse=card('Vorse Raider',0,L.MZONE),blue=card('Blue-Eyes White Dragon',1,L.MZONE),enemyVorse=card('Vorse Raider',1,L.MZONE,1);
zones[0][L.HAND]=[riryoku];zones[0][L.MZONE]=[vorse];zones[1][L.MZONE]=[blue,enemyVorse];smart=policy();
assert.ok(smart.activation(riryoku)>=90,'use Riryoku with face-up monsters on both sides');
assert.ok(smart.targetScore('Riryoku',vorse,{cands:[vorse,blue,enemyVorse]})>0&&smart.targetScore('Riryoku',blue,{cands:[vorse,blue,enemyVorse]})>0,'select one monster from each side for Riryoku');
assert.ok(smart.targetScore('Riryoku',enemyVorse,{cands:[vorse,blue,enemyVorse]})<0,'do not select two monsters from the same side for Riryoku');
clear();engine.player=1;engine.phase=8;engine.attackCard=card('Vorse Raider',1,L.MZONE);const hero=card('A Hero Emerges',0,L.SZONE,0,8),body=card('Blue-Eyes White Dragon',0,L.HAND);
zones[0][L.SZONE]=[hero];zones[0][L.HAND]=[body];smart=policy(0,{to_bp:false});
assert.ok(smart.activation(hero,true)>=90,'accept A Hero Emerges when an opponent attacks and a summonable monster is in hand');
clear();const command=card('Command Knight',0,L.MZONE),warrior=card('Buster Blader',0,L.HAND);
zones[0][L.MZONE]=[command];zones[0][L.HAND]=[warrior];smart=policy();
assert.equal(smart.projectedAttack(warrior),3000,'include Command Knight’s 400 ATK aura when forecasting a Warrior');

// Reversed Might applies to the player alone when amplified; the ordinary
// version and Sword and Shield relic swap both sides' original stats.
clear();engine.aiModifiers={challengeLevel:3,activeCurses:['mirror_stats']};
const humanVorse=card('Vorse Raider',0,L.HAND),cpuVorse=card('Vorse Raider',1,L.HAND);
zones[0][L.HAND]=[humanVorse];zones[1][L.HAND]=[cpuVorse];smart=policy(1,{to_bp:true});
assert.equal(smart.projectedAttack(humanVorse),1200,'amplified swap curse applies to player monsters');
assert.equal(smart.projectedAttack(cpuVorse),1900,'amplified swap curse leaves CPU monster stats alone');
engine.aiModifiers.challengeLevel=1;smart=policy(1,{to_bp:true});
assert.equal(smart.projectedAttack(cpuVorse),1200,'standard swap curse affects both sides');
engine.aiModifiers={activeRelics:{1:['sword_and_shield']}};smart=policy(1,{to_bp:true});
assert.equal(smart.projectedAttack(humanVorse),1200,'Sword and Shield relic applies its global swap');

console.log('PASS CPU policies for Sanctuary/Mars, Mokey, Ojama, Archfiend, Ninja, LV, Blue-Eyes, Riryoku, Command Knight and stat swap');
