// Behaviour flags and Discord, 2026-11-10 (after v0.2.28):
// - 8632cc82: the CPU used The Reliable Guardian with only a Set defender, so the core offered the attacker as the
//   target and the 700 DEF went to the player's monster.
// - d03c8435: Dark Spirit of the Silent stopped Nightmare Penguin (1700) and sent Abyss Soldier in for 2600.
// - dae92092 (Tag): Enemy Controller went first and Sakuretsu Armor was chained on top on the same attacker.
// - Thronior / user: against Ordeal of a Traveler the CPU remembers the hand cards it has seen, calls only types in a
//   fully seen 1-2 card hand, and sends its weakest planned direct attack first to see a card.
import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,R,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url))),id=n=>meta.cards.find(c=>c.name===n).id;
const card=(name,location,controller,sequence,position=1)=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,position,controller,location,sequence,type:data[id(name)]?.type,owner:controller});
const mon=(name,controller,sequence,position=1)=>card(name,L.MZONE,controller,sequence,position);
const back=(name,controller,sequence,position=1)=>card(name,L.SZONE,controller,sequence,position);
// The CPU is seat 1. theirs: the player's monsters; ours: the CPU's.
function duel({theirs=[],ours=[],theirBack=[],ourBack=[],theirHand=1,state={}}={}){
 const e=new MobileDuel(meta.cards);
 Object.assign(e,{data,lp:[8000,8000],turn:6,player:0,phase:8,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{},cancelledAttacks:new Map()},state);
 const slots=(list,n=5)=>{const out=Array(n).fill(null);for(const c of list)out[c.sequence]=c;return out};
 const filler=side=>Array.from({length:20},(_,i)=>card('Battle Ox',L.DECK,side,i,10));
 const hand=(Array.isArray(theirHand)?theirHand:Array(theirHand).fill('Battle Ox')).map((n,i)=>card(n,L.HAND,0,i,0));
 const zones={1:{[L.MZONE]:slots(ours),[L.SZONE]:slots(ourBack,6),[L.HAND]:[],[L.DECK]:filler(1)},0:{[L.MZONE]:slots(theirs),[L.SZONE]:slots(theirBack,6),[L.HAND]:hand,[L.DECK]:filler(0)}};
 e.query=(side,loc)=>zones[side]?.[loc]||[];e.core={duelQueryCount:(_,side,loc)=>(zones[side]?.[loc]||[]).length};e.zones=zones;
 return e;
}
const chainPrompt=selects=>({type:M.SELECT_CHAIN,player:1,selects,spe_count:selects.length,forced:false});

// 1. The Reliable Guardian targets a face-up monster: a Set defender can't take the 700 DEF.
{
 const attacker=mon('Tribe-Infecting Virus',0,3),guardian=back('The Reliable Guardian',1,3,10);
 const score=defender=>{const e=duel({theirs:[attacker],ours:[defender],ourBack:[guardian],state:{attackCard:attacker,attackTarget:defender,inDamageStep:true}});return smartContext(e,1,L,chainPrompt([guardian])).activation(guardian,true)};
 assert.equal(score(mon('Swordsman of Landstar',1,0,8)),-1,'flag 8632cc82: no activation for a Set defender');
 assert.equal(score(mon('Swordsman of Landstar',1,0,4)),90,'a face-up Defense Position defender it saves still gets it');
 console.log('PASS The Reliable Guardian needs a face-up defender');
}

// 2. Dark Spirit of the Silent: the forced monster attacks anyway, so stop the biggest attack.
{
 const spirit=back('Dark Spirit of the Silent',1,1,10);
 const score=(attackerName,lp=8000,attacked=false)=>{
  const penguin=mon('Nightmare Penguin',0,2),abyss=mon('Abyss Soldier',0,3);
  if(attacked)penguin.attack_count=1;
  const attacker=attackerName==='Abyss Soldier'?abyss:penguin;
  const e=duel({theirs:[penguin,abyss],ourBack:[spirit],state:{attackCard:attacker,attackTarget:null,lp:[8000,lp]}});
  return smartContext(e,1,L,chainPrompt([spirit])).activation(spirit,true);
 };
 assert.equal(score('Nightmare Penguin'),-1,'flag d03c8435: not on 1700 while 2600 is still to attack');
 assert.equal(score('Abyss Soldier',8000,true),95,'used on the biggest attack');
 assert.equal(score('Nightmare Penguin',800),95,'used on a smaller attack that is lethal now');
 console.log('PASS Dark Spirit of the Silent waits for the biggest attack');
}

// 3. Sakuretsu Armor and Enemy Controller both answer the attack: destroy it and keep Enemy Controller.
{
 const sprite=mon('Vorse Raider',0,2),saku=back('Sakuretsu Armor',1,2,10),ec=back('Enemy Controller',1,3,10);
 const e=duel({theirs:[sprite],ours:[mon('Grand Tiki Elder',1,0,8)],ourBack:[saku,ec],state:{attackCard:sprite,attackTarget:null,lp:[8000,1500]}});
 const m=chainPrompt([saku,ec]),smart=smartContext(e,1,L,m);
 assert.equal(smart.activation(ec,true),-1,'flag dae92092: Enemy Controller is kept while Sakuretsu Armor destroys the attacker');
 assert(smart.activation(saku,true)>=0,'Sakuretsu Armor is used');
 const r=e.auto(m);assert.equal(r.type,R.SELECT_CHAIN);assert.equal(r.index,0,'the CPU chains Sakuretsu Armor');
 // Alone, Enemy Controller still stops a lethal attack.
 const alone=duel({theirs:[sprite],ourBack:[ec],state:{attackCard:sprite,attackTarget:null,lp:[8000,1500]}});
 assert(smartContext(alone,1,L,chainPrompt([ec])).activation(ec,true)>=0,'without Sakuretsu Armor, Enemy Controller still answers');
 console.log('PASS Sakuretsu Armor goes before Enemy Controller');
}

// 4. Ordeal of a Traveler: what the CPU has seen of the player's hand.
{
 const ORDEAL=id('Ordeal of a Traveler'),ordeal=()=>back('Ordeal of a Traveler',0,1,1);
 const reveal=(e,name)=>{e.effect={code:ORDEAL,player:0};e.ordealMemory({type:M.CONFIRM_CARDS,player:1,cards:[{code:id(name),controller:0,location:L.HAND,sequence:0}]})};
 // Every call over many seeds and turns, with the Ordeal effect resolving against seat 1's attack.
 const calls=(e,runs=60)=>{const seen=new Set();for(let i=0;i<runs;i++){Object.assign(e,{player:1,turn:2+i%9,reasoningSeed:(i*7919+13)>>>0,effect:{code:ORDEAL,player:0},aiModifiers:{activeRelics:[[],[]],statRelics:[[],[]],spellTrapZones:5}});e.handRevealed=()=>false;seen.add(e.auto({type:M.SELECT_OPTION,player:1,options:[1050,1051,1052]}).index)}return [...seen].sort()};
 const base=()=>duel({theirBack:[ordeal()],theirHand:1});
 assert.deepEqual(calls(base()),[0,1,2],'with nothing seen the call stays random');
 let e=duel({theirBack:[ordeal()],theirHand:['Battle Ox']});reveal(e,'Battle Ox');
 assert.deepEqual(calls(e),[0],'one card in hand, seen as a Monster: always Monster');
 e=duel({theirBack:[ordeal()],theirHand:['Battle Ox','Pot of Greed']});reveal(e,'Battle Ox');
 assert.deepEqual(calls(e),[0,1,2],'one of two cards seen: still random');
 reveal(e,'Pot of Greed');
 assert.deepEqual(calls(e),[0,1],'two cards seen, a Monster and a Spell: only those two calls');
 e=duel({theirBack:[ordeal()],theirHand:['Battle Ox','Vorse Raider']});reveal(e,'Battle Ox');reveal(e,'Vorse Raider');
 assert.deepEqual(calls(e),[0],'two Monsters seen: always Monster');
 e=duel({theirBack:[ordeal()],theirHand:['Battle Ox','Battle Ox']});reveal(e,'Battle Ox');reveal(e,'Battle Ox');
 assert.equal(e.ordealHand(0),null,'the same code twice may be the same card, so the hand is not fully known');
 // A draw adds an unknown card; a Set card leaves unseen; a card sent to the Graveyard is seen leaving.
 e=duel({theirBack:[ordeal()],theirHand:['Battle Ox']});reveal(e,'Battle Ox');
 e.zones[0][L.HAND].push(card('Pot of Greed',L.HAND,0,1,0));
 assert.equal(e.ordealHand(0),null,'after a draw the hand is not fully known');
 assert.deepEqual(calls(e),[0,1,2],'so the call is random again');
 e=duel({theirBack:[ordeal()],theirHand:['Battle Ox','Pot of Greed']});reveal(e,'Battle Ox');reveal(e,'Pot of Greed');
 e.ordealMemory({type:M.MOVE,card:id('Pot of Greed'),from:{controller:0,location:L.HAND,sequence:1},to:{controller:0,location:L.SZONE,sequence:0,position:8}});
 e.zones[0][L.HAND].pop();
 assert.equal(e.ordealHand(0),null,'a Set card leaves unseen and clears what was known');
 e=duel({theirBack:[ordeal()],theirHand:['Battle Ox','Pot of Greed']});reveal(e,'Battle Ox');reveal(e,'Pot of Greed');
 e.ordealMemory({type:M.MOVE,card:id('Pot of Greed'),from:{controller:0,location:L.HAND,sequence:1},to:{controller:0,location:L.GRAVE,sequence:0,position:1}});
 e.zones[0][L.HAND].pop();
 assert.deepEqual(e.ordealHand(0),[id('Battle Ox')],'a card seen leaving is dropped and the rest stays known');
 assert.deepEqual(calls(e),[0]);
 e=duel({theirBack:[ordeal()],theirHand:['Battle Ox']});reveal(e,'Battle Ox');e.ordealMemory({type:M.TAG_SWAP,player:0});
 assert.equal(e.ordealHand(0),null,'a Tag hand swap clears it');
 console.log('PASS Ordeal of a Traveler calls use the cards the CPU has seen');

 // Attack order: the weakest planned direct attack goes first while the hand has 1-2 unseen cards.
 const pick=({hand=1,seen=[],withOrdeal=true,theirs=[]}={})=>{
  const ours=[mon('Blue-Eyes White Dragon',1,0),mon('Battle Ox',1,1)];
  const e=duel({ours,theirs,theirBack:withOrdeal?[ordeal()]:[],theirHand:hand,state:{player:1,phase:8}});
  for(const n of seen)reveal(e,n);e.effect=null;
  const r=e.auto({type:M.SELECT_BATTLECMD,player:1,chains:[],attacks:ours,to_m2:true,to_ep:true});
  return r.action===1?e.name(ours[r.index].code):'no attack';
 };
 assert.equal(pick({withOrdeal:false}),'Blue-Eyes White Dragon','without Ordeal the strongest attack goes first');
 assert.equal(pick(),'Battle Ox','one unseen card: Battle Ox probes first');
 assert.equal(pick({hand:2}),'Battle Ox','two unseen cards: Battle Ox probes first');
 assert.equal(pick({hand:['Battle Ox'],seen:['Battle Ox']}),'Blue-Eyes White Dragon','the whole hand is seen: no probe needed');
 assert.equal(pick({hand:3}),'Blue-Eyes White Dragon','three cards in hand: order unchanged');
 assert.equal(pick({theirs:[mon('Celtic Guardian',0,0)]}),'Blue-Eyes White Dragon','with a blocker the battle plan stays as it is');
 console.log('PASS Ordeal of a Traveler weak attack first');
}
console.log('PASS cpu flags Nov 10');
