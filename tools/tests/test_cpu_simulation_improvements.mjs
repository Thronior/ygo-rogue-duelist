import assert from 'node:assert/strict';
import fs from 'node:fs';
import {L} from '../../android/web/engine.js';
import {smartContext} from '../../android/web/smart_policy.js';

const content=JSON.parse(fs.readFileSync(new URL('../../android/web/content.json',import.meta.url),'utf8'));
const byName=n=>content.cards.find(c=>c.name===n);
const cards=new Map(content.cards.map(c=>[c.id,c]));
const locations=[L.HAND,L.MZONE,L.SZONE,L.GRAVE,L.DECK,L.REMOVED,L.EXTRA];
const zones=[0,1].map(()=>Object.fromEntries(locations.map(loc=>[loc,[]])));
const card=(n,controller,location,sequence=0,position=1)=>{const c=byName(n);assert.ok(c,`missing card data: ${n}`);return {code:c.id,controller,location,sequence,position,attack:c.atk,defense:c.defense,level:c.level,type:c.data.type};};
const engine={cards,data:Object.fromEntries(content.cards.map(c=>[c.id,{...c.data,attack:c.atk,defense:c.defense}])),turn:3,player:0,phase:4,lp:[8000,8000],aiModifiers:{},activeChain:[],attackCard:null,attackTarget:null,effect:null,name:id=>cards.get(id)?.name,query:(p,loc)=>zones[p][loc]||[],unknownDefense:()=>1000};
const policy=()=>smartContext(engine,0,L,{to_bp:true});
const clear=()=>{for(const side of zones)for(const loc of locations)side[loc]=[];engine.aiModifiers={};engine.activeChain=[];engine.attackCard=null;engine.attackTarget=null;engine.effect=null;engine.lp=[8000,8000];engine.player=0;engine.phase=4;engine.turn=3;};

// Kaibaman's summon effect is more valuable than hiding it when Blue-Eyes is ready.
clear();const kaibaman=card('Kaibaman',0,L.HAND),blueEyes=card('Blue-Eyes White Dragon',0,L.HAND,1);zones[0][L.HAND]=[kaibaman,blueEyes];
let smart=policy();assert.equal(smart.summonScore(kaibaman),180,'prioritize Kaibaman when its Blue-Eyes effect is live');assert.equal(smart.preferSet(kaibaman),false,'do not set Kaibaman face-down when its effect can summon Blue-Eyes');

// Do not spend Exiled Force as a vanilla 1000 ATK opening summon with no target.
clear();const exiled=card('Exiled Force',0,L.HAND);zones[0][L.HAND]=[exiled];smart=policy();assert.equal(smart.summonScore(exiled),-1,'hold Exiled Force until a worthwhile opposing monster is available');
zones[1][L.MZONE]=[card('Blue-Eyes White Dragon',1,L.MZONE)];assert.ok(policy().summonScore(exiled)>=100,'allow Exiled Force when it can remove a valuable opposing monster');

// Keep one of each Ojama name through discard effects when Delta Hurricane is live.
clear();const black0=card('Ojama Black',0,L.HAND,0),black1=card('Ojama Black',0,L.HAND,1),yellow=card('Ojama Yellow',0,L.HAND,2),green=card('Ojama Green',0,L.HAND,3),delta=card('Ojama Delta Hurricane!!',0,L.HAND,4);
zones[0][L.HAND]=[black0,black1,yellow,green,delta];smart=policy();assert.equal(smart.handLoss(black0),0,'leave one duplicate Ojama Black expendable');assert.ok(smart.handLoss(black1)>=5000,'reserve one Ojama Black for the Delta Hurricane combination');

// Complete the trio face-up and use the wipe when it can remove opposing cards.
clear();const greenField=card('Ojama Green',0,L.MZONE,0,8),yellowField=card('Ojama Yellow',0,L.MZONE,1,8),blackHand=card('Ojama Black',0,L.HAND),hurricane=card('Ojama Delta Hurricane!!',0,L.HAND,1),foe=card('Vorse Raider',1,L.MZONE);
zones[0][L.MZONE]=[greenField,yellowField];zones[0][L.HAND]=[blackHand,hurricane];zones[1][L.MZONE]=[foe];smart=policy();
assert.equal(smart.summonUtility(blackHand),true,'treat the missing third Ojama as a combo summon');assert.equal(smart.summonScore(blackHand),170,'prioritize completing Delta Hurricane');assert.equal(smart.preferSet(blackHand),false,'summon the third Ojama face-up to complete the combo');
clear();const blackField=card('Ojama Black',0,L.MZONE,2,1);zones[0][L.HAND]=[hurricane];zones[0][L.MZONE]=[{...greenField,position:1},{...yellowField,position:1},blackField];zones[1][L.MZONE]=[foe];smart=policy();
assert.equal(smart.flipUseful('Ojama Green',greenField),true,'flip a set Ojama when doing so completes the Delta Hurricane line');assert.equal(smart.flipUseful('Ojama Yellow',yellowField),true,'flip each remaining set Ojama for the combo');
assert.equal(smart.activation(hurricane),150,'activate Delta Hurricane after all three Ojamas are face-up');
zones[0][L.MZONE][1]={...yellowField,position:8};smart=policy();assert.equal(smart.activation(hurricane),-1,'do not activate Delta Hurricane until the full face-up trio is present');

// Resource and engine cards are used when the replayed state makes their effect worthwhile.
clear();const dangerous=card('Dangerous Machine Type-6',0,L.HAND),discard=card('Vorse Raider',0,L.HAND,1),target=card('Blue-Eyes White Dragon',1,L.MZONE);zones[0][L.HAND]=[dangerous,discard];zones[1][L.MZONE]=[target];smart=policy();assert.ok(smart.activation(dangerous)>=80,'activate Dangerous Machine when its expected roll value is positive');
clear();const darkCore=card('Dark Core',0,L.HAND),fodder=card('Vorse Raider',0,L.HAND,1),threat=card('Blue-Eyes White Dragon',1,L.MZONE);zones[0][L.HAND]=[darkCore,fodder];zones[1][L.MZONE]=[threat];smart=policy();assert.ok(smart.activation(darkCore)>=80,'use Dark Core for a strong opposing monster when its discard cost is available');
clear();const absorption=card('Spell Absorption',0,L.HAND),drawSpell=card('Pot of Greed',0,L.HAND,1);zones[0][L.HAND]=[absorption,drawSpell];smart=policy();assert.ok(smart.activation(absorption)>=80,'activate Spell Absorption before another spell can resolve');
clear();const bead=card("The Dragon's Bead",0,L.SZONE,0,8),dragon=card('Blue-Eyes White Dragon',0,L.MZONE),beadCost=card('Vorse Raider',0,L.HAND);zones[0][L.SZONE]=[bead];zones[0][L.MZONE]=[dragon];zones[0][L.HAND]=[beadCost];engine.activeChain=[{code:byName('Ring of Destruction').id,player:1,inactive:false,targets:[dragon]}];smart=policy();assert.ok(smart.activation(bead,true)>=80,'spend a discard to protect a targeted face-up Dragon from an opponent Trap, even on our turn');
clear();const swamp=card('King of the Swamp',0,L.HAND),lord=card('Lord of D.',0,L.HAND,1),poly=card('Polymerization',0,L.DECK),dragun=card('King Dragun',0,L.EXTRA);zones[0][L.HAND]=[swamp,lord];zones[0][L.DECK]=[poly];zones[0][L.EXTRA]=[dragun];smart=policy();assert.ok(smart.activation(swamp)>=80,'search Polymerization when King of the Swamp completes a legal fusion line');
clear();engine.phase=8;const kunai=card('Kunai with Chain',0,L.SZONE,0,8),attacker=card('Spear Dragon',0,L.MZONE),enemyAttacker=card('Vorse Raider',1,L.MZONE);zones[0][L.SZONE]=[kunai];zones[0][L.MZONE]=[attacker];zones[1][L.MZONE]=[enemyAttacker];engine.attackCard=attacker;engine.attackTarget=enemyAttacker;engine.effect={code:kunai.code};smart=policy();assert.ok(smart.activation(kunai,true)>=80,'use Kunai with Chain when its 500 ATK changes the battle result');assert.equal(smart.targetScore('Kunai with Chain',attacker,{}),100000+attacker.attack,'equip Kunai to the attacker that needs the boost');assert.equal(smart.resourceOption([(BigInt(kunai.code)<<20n)+2n]),0,'choose the equip mode for the own attack');
clear();const canyon=card('Canyon',0,L.HAND),canyonAttacker=card('Blue-Eyes White Dragon',0,L.MZONE),rockWall=card('Giant Soldier of Stone',1,L.MZONE,0,4);zones[0][L.HAND]=[canyon];zones[0][L.MZONE]=[canyonAttacker];zones[1][L.MZONE]=[rockWall];smart=policy();assert.ok(smart.activation(canyon)>=80,'activate Canyon when its doubled battle damage rewards attacking a Defense Position Rock');
clear();const canyonRisk=card('Canyon',0,L.HAND),ourRock=card('Giant Soldier of Stone',0,L.MZONE,0,4),foeAttacker=card('Blue-Eyes White Dragon',1,L.MZONE);zones[0][L.HAND]=[canyonRisk];zones[0][L.MZONE]=[ourRock];zones[1][L.MZONE]=[foeAttacker];smart=policy();assert.equal(smart.activation(canyonRisk),-1,'do not activate Canyon when it would double damage to us and has no offensive payoff');
// Random traps are evaluated by their actual odds and target rules, not just by the presence of monsters.
clear();engine.phase=1;const blind=card('Blind Destruction',0,L.SZONE,0,8),highLevelEnemy=card('Blue-Eyes White Dragon',1,L.MZONE,0,1),secondHighLevelEnemy=card('Blue-Eyes Ultimate Dragon',1,L.MZONE,1,1);zones[0][L.SZONE]=[blind];zones[1][L.MZONE]=[highLevelEnemy,secondHighLevelEnemy];smart=policy();assert.ok(smart.activation(blind)>=75,'use Blind Destruction when the expected level-based wipe favors us');
clear();engine.phase=1;const needle=card('Needle Wall',0,L.SZONE,0,8),needleTarget=card('Blue-Eyes White Dragon',1,L.MZONE,4,1);zones[0][L.SZONE]=[needle];zones[1][L.MZONE]=[needleTarget];smart=policy();assert.ok(smart.activation(needle)>=75,'use Needle Wall when its five-zone odds make destroying the occupied zone worthwhile');assert.ok(smart.setScore(needle)>=75,'set Needle Wall for a valuable opposing monster');
clear();engine.player=1;engine.phase=8;const counterblow=card('Des Counterblow',0,L.SZONE,0,8),directAttacker=card('Blue-Eyes White Dragon',1,L.MZONE);zones[0][L.SZONE]=[counterblow];zones[1][L.MZONE]=[directAttacker];engine.attackCard=directAttacker;engine.attackTarget=null;smart=policy();assert.ok(smart.activation(counterblow,true)>=130,'destroy a monster when it is about to inflict direct battle damage');
// Sasuke Samurai #2's lock is only worth the LP when an attacker can exploit it against set back row.
clear();const sasukeLock=card('Sasuke Samurai #2',0,L.MZONE),followupAttacker=card('Spear Dragon',0,L.MZONE,1),setBackrow=card('Mirror Force',1,L.SZONE,0,8);zones[0][L.MZONE]=[sasukeLock,followupAttacker];zones[1][L.SZONE]=[setBackrow];smart=policy();assert.equal(smart.activation(sasukeLock),76,'pay for Sasuke Samurai #2 only when an attacker can press through opposing back row');
clear();const deFusion=card('De-Fusion',0,L.HAND),enemyFusion=card('Blue-Eyes Ultimate Dragon',1,L.MZONE);zones[0][L.HAND]=[deFusion];zones[1][L.MZONE]=[enemyFusion];smart=policy();assert.ok(smart.activation(deFusion)>=80,'use De-Fusion as removal against a valuable opposing Fusion monster');assert.ok(smart.targetScore('De-Fusion',enemyFusion,{})>30000,'select the opposing Fusion monster');
clear();const deFusionTrap=card('De-Fusion',0,L.SZONE,0,8),ourFusion=card('Blue-Eyes Ultimate Dragon',0,L.MZONE);zones[0][L.SZONE]=[deFusionTrap];zones[0][L.MZONE]=[ourFusion];engine.activeChain=[{code:byName('Ring of Destruction').id,player:1,inactive:false,targets:[ourFusion]}];smart=policy();assert.equal(smart.activation(deFusionTrap,true),135,'chain De-Fusion to save our Fusion monster targeted by an opposing effect');

const sandMothScript=fs.readFileSync(new URL('../../runtime/script/official/c73648243.lua',import.meta.url),'utf8');
assert.match(sandMothScript,/REASON_DESTROY/,'Sand Moth script must check that it was destroyed');
assert.doesNotMatch(sandMothScript,/REASON_EFFECT/,'Sand Moth must also revive after battle destruction, not only effect destruction');
for(const filename of ['../../android/web/scripts.json','../../sim-balance/engine/scripts.json']){
 const scripts=JSON.parse(fs.readFileSync(new URL(filename,import.meta.url),'utf8'));
 assert.equal(scripts['c73648243.lua']?.trimEnd(),sandMothScript.trimEnd(),`Sand Moth fix must be present in ${filename}`);
}

console.log('PASS summon/target policies, Ojama combo, Dangerous Machine, Dark Core, Spell Absorption, Dragon\'s Bead, De-Fusion, King of the Swamp, Kunai with Chain, Canyon, random-trap odds, Des Counterblow, Sasuke Samurai #2 and Sand Moth battle revival');
