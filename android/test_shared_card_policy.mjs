import assert from 'node:assert/strict';
import fs from 'node:fs';
import {L} from './web/engine.js';
import {smartContext} from './web/smart_policy.js';

const content=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url),'utf8'));
const cards=new Map(content.cards.map(c=>[c.id,c]));
const byName=n=>content.cards.find(c=>c.name===n);
const id=n=>{const c=byName(n);assert.ok(c,`missing card ${n}`);return c.id;};
const locations=[L.HAND,L.MZONE,L.SZONE,L.GRAVE,L.DECK,L.REMOVED,L.EXTRA];
const zones=[0,1].map(()=>Object.fromEntries(locations.map(loc=>[loc,[]])));
const engine={
 cards,
 data:Object.fromEntries(content.cards.map(c=>[c.id,{...c.data,attack:c.atk,defense:c.defense}])),
 turn:3,player:0,phase:4,lp:[8000,8000],aiModifiers:{},activeChain:[],
 name:code=>cards.get(code)?.name,
 description:value=>{const n=BigInt(value??0),legacy=Number(n>>4n),index=Number(n&15n);return cards.get(legacy)?.strings?.[index]||'';},
 query:(p,loc)=>zones[p][loc]||[],
 unknownDefense:()=>1000,
};
const card=(n,controller=0,location=L.HAND,sequence=0,position=1)=>{
 const c=byName(n);assert.ok(c,`missing card data: ${n}`);
 return {code:c.id,controller,location,sequence,position,attack:c.atk,defense:c.defense,level:c.level,type:c.data.type};
};
const put=(side,loc,...items)=>{zones[side][loc]=items;};
const policy=()=>smartContext(engine,0,L);
const clear=()=>{
 for(const side of zones)for(const loc of locations)side[loc]=[];
 engine.turn=3;engine.player=0;engine.phase=4;engine.lp=[8000,8000];engine.activeChain=[];engine.effect=null;
};

// Reincarnation retrieves the God card that advances this deck's summon plan,
// and doesn't throw another God away as its discard cost.
clear();
const reincarnation=card('Monster Reincarnation');
const discard=card('Red Medicine',0,L.HAND,1);
const obelisk=card('Obelisk the Tormentor',0,L.GRAVE);
const cyberJar=card('Cyber Jar',0,L.GRAVE,1);
put(0,L.HAND,reincarnation,discard);
put(0,L.GRAVE,obelisk,cyberJar);
let smart=policy();
assert.ok(smart.activation(reincarnation)>0,'activate Monster Reincarnation for a useful graveyard target');
assert.ok(smart.targetScore('Monster Reincarnation',obelisk,{})>smart.targetScore('Monster Reincarnation',cyberJar,{}),'prefer a God card over a low-stat recovery');
engine.effect={code:id('Monster Reincarnation')};
assert.ok(smart.handLoss(card('Obelisk the Tormentor',0,L.HAND,2))>smart.handLoss(discard),'keep God cards as Reincarnation discard fodder');

clear();put(0,L.HAND,reincarnation,discard);assert.equal(policy().activation(reincarnation),-1,'do not spend Reincarnation with an empty Graveyard');
put(0,L.GRAVE,obelisk);put(0,L.HAND,reincarnation);assert.equal(policy().activation(reincarnation),-1,'do not spend Reincarnation without a discard');

// Infinite Cards is useful with Slifer already face-up, including before a
// Pot of Greed pushes the prospective hand beyond the normal limit.
clear();
const infinite=card('Infinite Cards',0,L.SZONE);
const slifer=card('Slifer the Sky Dragon',0,L.MZONE);
put(0,L.SZONE,infinite);put(0,L.MZONE,slifer);
put(0,L.HAND,card('Pot of Greed'),card('Red Medicine',0,L.HAND,1),card('Red Medicine',0,L.HAND,2),card('Red Medicine',0,L.HAND,3),card('Red Medicine',0,L.HAND,4),card('Red Medicine',0,L.HAND,5));
assert.equal(policy().activation(infinite),112,'protect Slifer’s hand-size ATK before expected overflow');
put(0,L.HAND,card('Pot of Greed'),card('Red Medicine',0,L.HAND,1),card('Red Medicine',0,L.HAND,2),card('Red Medicine',0,L.HAND,3));
assert.equal(policy().activation(infinite),-1,'do not activate Infinite Cards when Slifer has no hand-size benefit');

// Fitting Room already has a generic rule; verify that it only commits when
// one of its legal low-Level Normal Monster hits is actually in the top four.
clear();
const fitting=card('Enchanting Fitting Room');
const lowNormal=content.cards.find(c=>(c.data.type&1)&&(c.data.type&16)&&c.level<=3);
assert.ok(lowNormal,'test data includes a low-Level Normal Monster');
put(0,L.HAND,fitting);put(0,L.DECK,card(lowNormal.name,0,L.DECK));
assert.equal(policy().activation(fitting),100,'use Fitting Room when its top four contain a summonable Normal Monster');
put(0,L.DECK,card('Cyber Jar',0,L.DECK));
assert.equal(policy().activation(fitting),-1,'hold Fitting Room when its top four contain no eligible Normal Monster');

// The supplied custom deck has no Normal Monsters at all, so its three
// Enchanting Fitting Rooms must stay inactive even when they are in hand.
clear();
const suppliedDeckMonsters=['Bubonic Vermin','Cyber Jar','Obelisk the Tormentor','Spirit Reaper','Nimble Momonga','Hyena','Rescue Cat','Gilasaurus','Twin-Headed Behemoth','Apprentice Magician'];
const suppliedDeck=suppliedDeckMonsters.map((n,i)=>card(n,0,L.DECK,i));
assert.equal(suppliedDeck.some(x=>(x.type&1)&&(x.type&16)&&x.level<=3),false,'the supplied deck has no Normal Monsters for Fitting Room');
put(0,L.HAND,fitting);put(0,L.DECK,...suppliedDeck);
assert.equal(policy().activation(fitting),-1,'do not activate Fitting Room for the supplied deck');

// Rescue Cat is a useful Normal Summon only when its full two-card effect is
// legal. It must be face-up, have two open zones, and select legal Beasts.
clear();
const rescue=card('Rescue Cat');
put(0,L.DECK,card('Hyena',0,L.DECK),card('Nimble Momonga',0,L.DECK,1),card('Bubonic Vermin',0,L.DECK,2),card('Cyber Jar',0,L.DECK,3));
put(0,L.HAND,rescue);
smart=policy();
assert.equal(smart.summonUtility(rescue),true,'summon Rescue Cat when its effect has targets and enough zones');
assert.ok(smart.summonScore(rescue)>0,'prioritize summoning Rescue Cat over setting its low-ATK body');
assert.equal(smart.preferSet(rescue),false,'keep a live Rescue Cat face-up');
const hyena=card('Hyena',0,L.DECK),momonga=card('Nimble Momonga',0,L.DECK,1),vermin=card('Bubonic Vermin',0,L.DECK,2),cyber=card('Cyber Jar',0,L.DECK,3);
assert.ok(smart.targetScore('Rescue Cat',hyena,{cands:[hyena,momonga,vermin,cyber]})>smart.targetScore('Rescue Cat',vermin,{cands:[hyena,momonga,vermin,cyber]}),'choose the strongest legal Rescue Cat targets');
const fieldCat=card('Rescue Cat',0,L.MZONE);
put(0,L.MZONE,fieldCat,card('Apprentice Magician',0,L.MZONE,1),card('Apprentice Magician',0,L.MZONE,2),card('Apprentice Magician',0,L.MZONE,3));
assert.equal(policy().activation(fieldCat),-1,'do not activate Rescue Cat when fewer than two monster zones are open');
put(0,L.MZONE,fieldCat);
assert.equal(policy().activation(fieldCat),110,'activate Rescue Cat when two spaces and legal targets are available');

// Juragedo's free Battle Step summon is useful in either player's Battle
// Phase; its tribute effect is reserved for an ATK change that turns a loss
// into a win for the monster under attack.
clear();engine.phase=8;engine.player=1;
const juragedo=card('Juragedo');put(0,L.HAND,juragedo);
assert.equal(policy().activation(juragedo,true),105,'special summon Juragedo from hand during a Battle Step');
engine.phase=4;assert.equal(policy().activation(juragedo,true),-1,'do not use Juragedo hand summon outside the Battle Step');
clear();engine.phase=8;engine.player=1;
const juragedoField=card('Juragedo',0,L.MZONE),ally=card('Summoned Skull',0,L.MZONE,1),attacker=card('Blue-Eyes White Dragon',1,L.MZONE,0);
put(0,L.MZONE,juragedoField,ally);put(1,L.MZONE,attacker);engine.attackCard=attacker;engine.attackTarget=ally;
smart=policy();assert.ok(smart.activation(juragedoField,true)>0,'use Juragedo to save a face-up attacker from a stronger attack');
assert.ok(smart.activation(juragedoField,false)>0,'allow Juragedo’s face-up Battle Step effect from the normal activation prompt');
assert.ok(smart.targetScore('Juragedo',ally,{})>0,'target the monster whose ATK boost changes the battle result');

// Ra has two distinct effect paths: take the LP-to-ATK payment for lethal or
// a valuable safe battle, avoid it when an active burn source can finish the
// CPU at 100 LP, and use destruction against a major threat.
clear();engine.player=0;engine.phase=4;engine.lp[1]=7000;
const ra=card('The Winged Dragon of Ra',0,L.MZONE,0,1);ra.attack=0;put(0,L.MZONE,ra);
const raBoost={code:id('The Winged Dragon of Ra'),description:String((BigInt(id('The Winged Dragon of Ra'))<<4n)+0n)};
assert.equal(policy().activation(raBoost,true),130,'pay LP for Ra when its boost enables direct lethal');
clear();engine.player=0;engine.phase=4;engine.lp=[8000,8000];
const safeRa=card('The Winged Dragon of Ra',0,L.MZONE,0,1);safeRa.attack=0;
const battleTarget=card('Blue-Eyes White Dragon',1,L.MZONE,0,1);
put(0,L.MZONE,safeRa);put(1,L.MZONE,battleTarget);
assert.ok(policy().activation(raBoost,true)>0,'use Ra’s boost for a nonlethal battle improvement when the field is safe');
clear();engine.player=0;engine.phase=4;engine.lp=[8000,8000];
const directRa=card('The Winged Dragon of Ra',0,L.MZONE,0,1);directRa.attack=0;put(0,L.MZONE,directRa);
assert.ok(policy().activation(raBoost,true)>0,'use Ra’s boost for a large nonlethal direct attack when no burn threat is active');
clear();engine.player=0;engine.phase=4;engine.lp=[8000,8000];
const riskyRa=card('The Winged Dragon of Ra',0,L.MZONE,0,1);riskyRa.attack=0;
const targetWithBurn=card('Blue-Eyes White Dragon',1,L.MZONE,0,1),burn=card('Bowganian',1,L.MZONE,1,1);
put(0,L.MZONE,riskyRa);put(1,L.MZONE,targetWithBurn,burn);
assert.equal(policy().activation(raBoost,true),-1,'do not pay down to 100 LP while an active burn effect is on the field');
clear();engine.player=0;engine.phase=4;engine.lp=[8000,8000];
const unsafeRa=card('The Winged Dragon of Ra',0,L.MZONE,0,1);unsafeRa.attack=0;
const overwhelming=card('Blue-Eyes White Dragon',1,L.MZONE,0,1);overwhelming.attack=8000;
put(0,L.MZONE,unsafeRa);put(1,L.MZONE,overwhelming);
assert.equal(policy().activation(raBoost,true),-1,'do not pay down to 100 LP if a visible attacker can immediately defeat boosted Ra');
clear();engine.player=0;engine.phase=4;engine.lp=[5000,5000];
const raDestroy={code:id('The Winged Dragon of Ra'),description:String((BigInt(id('The Winged Dragon of Ra'))<<4n)+1n)};
const weakRa=card('The Winged Dragon of Ra',0,L.MZONE,0,1);weakRa.attack=1000;
const threat=card('Blue-Eyes White Dragon',1,L.MZONE,0,1);
put(0,L.MZONE,weakRa);put(1,L.MZONE,threat);
assert.ok(policy().activation(raDestroy)>0,'activate Ra destruction against a threat it cannot safely beat');

console.log('PASS shared card policy: Monster Reincarnation, Infinite Cards, Fitting Room, Rescue Cat, Juragedo, and Ra');
