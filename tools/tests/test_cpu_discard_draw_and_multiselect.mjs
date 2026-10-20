import assert from 'node:assert/strict';
import fs from 'node:fs';
import {L} from '../../android/web/engine.js';
import {preferredSelectionCount,smartContext} from '../../android/web/smart_policy.js';

const content=JSON.parse(fs.readFileSync(new URL('../../android/web/content.json',import.meta.url),'utf8'));
const cards=new Map(content.cards.map(c=>[c.id,c]));
const byName=n=>content.cards.find(c=>c.name===n);
const card=(n,controller,location,sequence=0,position=1)=>{const c=byName(n);return {code:c.id,controller,location,sequence,position,attack:c.atk,defense:c.defense,level:c.level,type:c.data.type};};
const zones=[Object.fromEntries([L.HAND,L.MZONE,L.SZONE,L.GRAVE,L.DECK,L.REMOVED,L.EXTRA].map(x=>[x,[]])),Object.fromEntries([L.HAND,L.MZONE,L.SZONE,L.GRAVE,L.DECK,L.REMOVED,L.EXTRA].map(x=>[x,[]]))];
const engine={cards,data:Object.fromEntries(content.cards.map(c=>[c.id,{...c.data,attack:c.atk,defense:c.defense}])),turn:3,player:0,phase:4,lp:[8000,8000],aiModifiers:{},activeChain:[],name:id=>cards.get(id)?.name,query:(p,l)=>zones[p][l]||[],unknownDefense:()=>1000};
const policy=()=>smartContext(engine,0,L,{to_bp:true});

const bounce=card('Back to Square One',0,L.HAND,0),deadTribute=card('Granmarg the Rock Monarch',0,L.HAND,1),enemy=card('Blue-Eyes White Dragon',1,L.MZONE);
zones[0][L.HAND]=[bounce,deadTribute];zones[1][L.MZONE]=[enemy];
let smart=policy();
assert.ok(smart.activation(bounce)>=80,'Back to Square One should be used on a valuable opposing monster');
assert.ok(smart.handLoss(deadTribute)<=250,'a currently unplayable tribute monster should be treated as a cheap discard');
assert.ok(smart.handLoss(deadTribute)<smart.handLoss(card('Pot of Greed',0,L.HAND,2)),'keep a live draw spell over a stranded tribute monster as discard');
assert.ok(smart.targetScore('Back to Square One',enemy,{})>smart.targetScore('Back to Square One',deadTribute,{}),'prefer the opponent monster over our own');
zones[1][L.MZONE]=[];assert.equal(policy().activation(bounce),-1,'do not spend a discard without an opposing monster target');

const sanctuary=card('The Sanctuary in the Sky',0,L.HAND,0),backrow=card('Mirror Force',0,L.SZONE,0),occupiedField=card('Umi',0,L.SZONE,5);
zones[0][L.HAND]=[sanctuary];zones[0][L.SZONE]=[backrow];
assert.equal(policy().activation(sanctuary),1000000,'prioritize Sanctuary in the Sky above other activations when the Field Zone is empty, even with ordinary back row cards');
zones[0][L.SZONE]=[occupiedField];
assert.notEqual(policy().activation(sanctuary),1000000,'do not force Sanctuary in the Sky when the Field Zone is occupied');

const housekeeping=card('Good Goblin Housekeeping',0,L.SZONE,0);zones[0][L.HAND]=[card('Granmarg the Rock Monarch',0,L.HAND,0)];zones[0][L.SZONE]=[housekeeping];zones[0][L.DECK]=Array.from({length:12},(_,i)=>card('Giant Soldier of Stone',0,L.DECK,i));zones[1][L.DECK]=Array.from({length:12},(_,i)=>card('Vorse Raider',1,L.DECK,i));
smart=policy();const oneCopyScore=smart.activation(housekeeping,true);assert.ok(oneCopyScore>=80,'cycle Good Goblin Housekeeping when it can safely draw');
zones[0][L.GRAVE]=[card('Good Goblin Housekeeping',0,L.GRAVE,0)];assert.ok(policy().activation(housekeeping,true)>oneCopyScore,'value the extra card gained from an earlier copy');
zones[0][L.DECK]=[card('Giant Soldier of Stone',0,L.DECK,0)];assert.equal(policy().activation(housekeeping,true),-1,'avoid activating if the draw would empty the deck before the requested draw completes');

const mega=card('Megarock Dragon',0,L.HAND,0),alpha=card('Alpha The Magnet Warrior',0,L.GRAVE,0),soldier=card('Giant Soldier of Stone',0,L.GRAVE,1);
zones[0][L.GRAVE]=[alpha,soldier];zones[0][L.HAND]=[mega];zones[0][L.DECK]=[];zones[0][L.SZONE]=[];
smart=policy();assert.equal(smart.projectedAttack(mega),1400,'project Megarock Dragon from the Rock monsters available to banish');
assert.equal(smart.summonUtility(mega),true,'treat a useful Megarock Dragon as a summon priority');
assert.ok(smart.targetScore('Megarock Dragon',alpha,{})>smart.targetScore('Megarock Dragon',soldier,{}),'banish the less valuable Rock first');

assert.equal(preferredSelectionCount(1,3,[100,90,-1]),2,'choose additional beneficial targets but stop before a disadvantageous one');
assert.equal(preferredSelectionCount(1,3,[100,90,10]),3,'choose the highest available target count when all are beneficial');
assert.equal(preferredSelectionCount(1,3,[100,0,-1]),2,'keep neutral extra targets and stop before one that is harmful');
assert.equal(preferredSelectionCount(1,3,[-10,-20]),1,'do not pay for extra harmful selections');
assert.equal(preferredSelectionCount(1,3,[-10,-20],true),3,'Megarock prefers the higher material count because it increases its stats');
console.log('PASS CPU Sanctuary in the Sky priority, Back to Square One, discard values, Good Goblin Housekeeping, Megarock Dragon and multi-selection policy');
