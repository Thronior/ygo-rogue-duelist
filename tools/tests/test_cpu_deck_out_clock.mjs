import assert from 'node:assert/strict';
import fs from 'node:fs';
import {L} from '../../android/web/engine.js';
import {smartContext} from '../../android/web/smart_policy.js';

const content=JSON.parse(fs.readFileSync(new URL('../../android/web/content.json',import.meta.url),'utf8'));
const cards=new Map(content.cards.map(c=>[c.id,c]));
const byName=n=>content.cards.find(c=>c.name===n);
const card=(n,controller,location,sequence=0,position=1)=>{const c=byName(n);assert.ok(c,`missing ${n}`);return {code:c.id,controller,location,sequence,position,attack:c.atk,defense:c.defense,level:c.level,type:c.data.type};};
const locations=[L.HAND,L.MZONE,L.SZONE,L.GRAVE,L.DECK,L.REMOVED,L.EXTRA];
const zones=[Object.fromEntries(locations.map(x=>[x,[]])),Object.fromEntries(locations.map(x=>[x,[]]))];
const engine={cards,data:Object.fromEntries(content.cards.map(c=>[c.id,{...c.data,attack:c.atk,defense:c.defense}])),turn:3,player:0,phase:4,lp:[8000,8000],aiModifiers:{},activeChain:[],name:id=>cards.get(id)?.name,query:(p,l)=>zones[p][l]||[],unknownDefense:()=>1000};
const policy=()=>smartContext(engine,0,L,{to_bp:true});
const fillDeck=(side,count,name='Giant Soldier of Stone')=>{zones[side][L.DECK]=Array.from({length:count},(_,i)=>card(name,side,L.DECK,i));};

// A deck-out lead never makes the CPU stall: it attacks directly and into set
// monsters at any deck size. Being behind on the clock favors damage racing.
const pot=card('Pot of Greed',0,L.HAND);
zones[0][L.HAND]=[pot];fillDeck(0,20);fillDeck(1,10,'Vorse Raider');
let smart=policy();
assert.equal(smart.deckOutClock.mode,'neutral','do not enter a defensive stall when ahead on deck-out');
assert.ok(smart.activation(pot)>=90,'allow normal draw play above the low-deck threshold');
assert.ok(smart.attackScore(card('Vorse Raider',0,L.MZONE),null,{dmg:1900})>-99999,'allow normal direct attacks above the low-deck threshold');
const drillago=card('Drillago',0,L.MZONE,0,1),setMonster=card('Goddess with the Third Eye',1,L.MZONE,0,8);
assert.ok(smart.attackScore(drillago,setMonster,{dmg:0})>-99999,'allow attacks into set monsters while above the low-deck threshold');

fillDeck(0,8);fillDeck(1,5,'Vorse Raider');
smart=policy();assert.equal(smart.deckOutClock.mode,'neutral','being ahead on deck-out never changes combat into a stall plan');
assert.ok(smart.attackScore(card('Vorse Raider',0,L.MZONE),null,{dmg:1900})>-99999,'keep direct attacks available at eight cards or fewer');
assert.ok(smart.attackScore(drillago,setMonster,{dmg:0})>-99999,'keep attacks into set monsters available at eight cards or fewer');

fillDeck(0,9);fillDeck(1,40,'Vorse Raider');
smart=policy();assert.equal(smart.deckOutClock.mode,'race');
assert.ok(smart.activation(pot)>=90,'draw while racing from a safe deck count');
fillDeck(0,8);smart=policy();assert.equal(smart.activation(pot),-1,'hold optional draw spells at eight cards');
zones[0][L.MZONE]=Array.from({length:3},(_,i)=>card('Blue-Eyes White Dragon',0,L.MZONE,i));
smart=policy();assert.ok(smart.activation(pot)>=90,'allow a low-deck draw when current attacks are lethal');
zones[0][L.MZONE]=[];

// Card of Safe Return plus a Graveyard Revival Jam raises the expected draw rate.
fillDeck(0,30);fillDeck(1,30,'Vorse Raider');
zones[0][L.HAND]=[];zones[0][L.SZONE]=[card('Card of Safe Return',0,L.SZONE,0,5)];
zones[0][L.GRAVE]=[card('Revival Jam',0,L.GRAVE)];
smart=policy();assert.equal(smart.deckOutClock.myExpectedDraws,2);
assert.equal(smart.deckOutClock.mode,'race','account for the recurring extra draw in the deck-out clock');

// Optional self-mill is gated for the two recruiters and Cyber Jar.
zones[0][L.SZONE]=[];zones[0][L.GRAVE]=[];zones[0][L.HAND]=[];
fillDeck(0,11);fillDeck(1,40,'Vorse Raider');
const momonga=card('Nimble Momonga',0,L.MZONE,0,1),momongaDeck=card('Nimble Momonga',0,L.DECK,0);
const bubonic=card('Bubonic Vermin',0,L.HAND),bubonicDeck=card('Bubonic Vermin',0,L.DECK,0);
zones[0][L.MZONE]=[momonga];zones[0][L.HAND]=[bubonic];zones[0][L.DECK][0]=momongaDeck;
smart=policy();assert.equal(smart.targetScore('Nimble Momonga',momongaDeck,{}),100000);
zones[0][L.DECK][1]=bubonicDeck;assert.equal(smart.targetScore('Bubonic Vermin',bubonicDeck,{}),100000);
assert.equal(smart.flipUseful('Bubonic Vermin',card('Bubonic Vermin',0,L.MZONE)),true);
fillDeck(0,10);smart=policy();
assert.equal(smart.targetScore('Nimble Momonga',momongaDeck,{}),-100000);
assert.equal(smart.targetScore('Bubonic Vermin',bubonicDeck,{}),-100000);
assert.equal(smart.activation(bubonic),-1);
assert.equal(smart.flipUseful('Bubonic Vermin',card('Bubonic Vermin',0,L.MZONE)),false);

zones[0][L.HAND]=[];zones[0][L.MZONE]=[];fillDeck(0,20);fillDeck(1,5,'Vorse Raider');
const cyber=card('Cyber Jar',0,L.MZONE,0,4);zones[0][L.MZONE]=[cyber];
smart=policy();assert.equal(smart.flipUseful('Cyber Jar',cyber),true,'use Cyber Jar to accelerate the opponent toward deck-out');
fillDeck(0,8);smart=policy();assert.equal(smart.flipUseful('Cyber Jar',cyber),false,'never risk Cyber Jar when our deck has eight or fewer cards');

// Dynamic Egyptian God projections, Infinite Cards, and discard preservation.
fillDeck(0,30);fillDeck(1,30,'Vorse Raider');zones[0][L.MZONE]=[];zones[0][L.SZONE]=[];
const slifer=card('Slifer the Sky Dragon',0,L.HAND,0);zones[0][L.HAND]=[slifer,...Array.from({length:5},(_,i)=>card('Vorse Raider',0,L.HAND,i+1))];
smart=policy();assert.equal(smart.projectedAttack(slifer),5000,'project Slifer from the post-summon hand size');
const ra=card('The Winged Dragon of Ra',0,L.HAND,0);zones[0][L.HAND]=[ra];smart=policy();assert.equal(smart.projectedAttack(ra),7900,'project Ra from the LP it pays to gain ATK');
const infinite=card('Infinite Cards',0,L.HAND,1);zones[0][L.HAND]=[slifer,infinite];smart=policy();assert.ok(smart.activation(infinite)>0,'activate Infinite Cards with Slifer in hand');
zones[0][L.GRAVE]=[card('Vorse Raider',0,L.GRAVE)];smart=policy();
assert.ok(smart.handLoss(card('Monster Reincarnation',0,L.HAND))>smart.handLoss(card('Pot of Greed',0,L.HAND)),'preserve Monster Reincarnation when the Graveyard has a monster');
assert.ok(smart.handLoss(card('Spirit Reaper',0,L.HAND))>smart.handLoss(card('Giant Soldier of Stone',0,L.HAND)),'preserve Spirit Reaper as a defensive wall');

// Snatch Steal skips low-value targets, and Obelisk only wipes when the exchange
// is worthwhile; its real script destroys the opponent's monsters but deals no burn damage.
zones[0][L.HAND]=[card('Snatch Steal',0,L.HAND)];
zones[1][L.MZONE]=[card('Spirit of the Harp',1,L.MZONE,0),card('Blue-Eyes White Dragon',1,L.MZONE,1)];
smart=policy();assert.equal(smart.activation(zones[0][L.HAND][0]),110);
assert.ok(smart.targetScore('Snatch Steal',zones[1][L.MZONE][1],{})>smart.targetScore('Snatch Steal',zones[1][L.MZONE][0],{}));
zones[1][L.MZONE]=[card('Spirit of the Harp',1,L.MZONE,0),card('Battle Ox',1,L.MZONE,1)];
smart=policy();assert.equal(smart.activation(zones[0][L.HAND][0]),-1,'do not take a weak target that has no relevant effect');
zones[0][L.HAND]=[];zones[0][L.MZONE]=[card('Obelisk the Tormentor',0,L.MZONE,0),card('Spirit Reaper',0,L.MZONE,1),card('Giant Soldier of Stone',0,L.MZONE,2)];
zones[1][L.MZONE]=[card('Blue-Eyes White Dragon',1,L.MZONE,0),card('Vorse Raider',1,L.MZONE,1)];
smart=policy();assert.ok(smart.activation(zones[0][L.MZONE][0])>=110,'use Obelisk to clear a valuable opposing board at an acceptable tribute cost');
assert.ok(smart.targetScore('Obelisk the Tormentor',zones[0][L.MZONE][1],{})>smart.targetScore('Obelisk the Tormentor',zones[0][L.MZONE][2],{}),'tribute the cheaper monsters for Obelisk');

console.log('PASS CPU deck-out clock, optional draw/mill gates, Egyptian God projections, Snatch Steal, and Obelisk policy');
