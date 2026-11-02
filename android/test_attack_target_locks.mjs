// Behaviour flag (2026-11-02): the CPU stopped setting weak monsters. It counted a 0 DEF Relinquished as a free
// kill, but Magician's Valkyria keeps face-up Spellcasters out of attack range, so it summoned into Attack Position,
// declared an attack and cancelled it at the target prompt. A monster that can't be targeted proves nothing.
import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,I,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url))),id=n=>meta.cards.find(c=>c.name===n).id;
const card=(name,location,controller,sequence,position=1)=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,position,controller,location,sequence,type:data[id(name)]?.type});
const mon=(name,controller,sequence,position=1)=>card(name,L.MZONE,controller,sequence,position);
const back=(name,controller,sequence,position=1)=>card(name,L.SZONE,controller,sequence,position);
function duel(mine,theirs,{hand=[],ownBoard=[],theirBack=[],state={}}={}){
 const e=new MobileDuel(meta.cards);
 Object.assign(e,{data,lp:[8000,8000],turn:6,player:1,phase:4,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{},cancelledAttacks:new Map()},state);
 const slots=(list,n=5)=>{const out=Array(n).fill(null);for(const c of list)out[c.sequence]=c;return out};
 const filler=side=>Array.from({length:20},(_,i)=>card('Battle Ox',L.DECK,side,i,10));
 const zones={1:{[L.MZONE]:slots(ownBoard),[L.SZONE]:slots([],6),[L.HAND]:hand,[L.DECK]:filler(1)},0:{[L.MZONE]:slots(mine),[L.SZONE]:slots(theirBack,6),[L.DECK]:filler(0)}};
 e.query=(side,loc)=>zones[side]?.[loc]||[];e.core={duelQueryCount:(_,side,loc)=>(zones[side]?.[loc]||[]).length};
 return e;
}
const idle=(hand)=>({type:M.SELECT_IDLECMD,player:1,summons:hand,monster_sets:hand,special_summons:[],spell_sets:[],activates:[],pos_changes:[],to_bp:true,to_ep:true});
const decide=(mine,handNames,options={})=>{const hand=handNames.map((n,i)=>card(n,L.HAND,1,i,0));const e=duel(mine,[],{hand,...options}),a=e.auto(idle(hand));return {action:a.action,name:a.action===I.SELECT_SUMMON||a.action===I.SELECT_MONSTER_SET?e.name(hand[a.index].code):null}};
const relinquished=()=>mon('Relinquished',0,0,4),valkyria=()=>mon("Magician's Valkyria",0,1,1),guardian=()=>mon('Guardian of the Throne Room',0,2,1);

// The flagged board, Turn 6: every monster it can legally attack beats Vishwar Randi and Science Soldier.
let d=decide([relinquished(),guardian(),valkyria()],['Vishwar Randi','Science Soldier']);
assert.equal(d.action,I.SELECT_MONSTER_SET,'it sets instead of summoning into 1650 and 1600 ATK attackers');
assert.equal(d.name,'Science Soldier','it sets the monster with the higher DEF');
// Without Valkyria, Relinquished really is a free kill, so attacking stays right.
d=decide([relinquished(),guardian()],['Vishwar Randi']);
assert.deepEqual(d,{action:I.SELECT_SUMMON,name:'Vishwar Randi'},'a reachable 0 DEF monster still justifies the summon');
// A monster that beats a legal target still summons, lock or not: Valkyria herself is attackable.
d=decide([relinquished(),valkyria()],['Vorse Raider']);
assert.deepEqual(d,{action:I.SELECT_SUMMON,name:'Vorse Raider'},'1900 ATK can attack Valkyria');

// Each lock, on both sides of its condition.
const locked=(board,target,theirBack=[])=>{const e=duel(board,[],{theirBack});return smartContext(e,1,L,null).attackLocked(e.query(0,L.MZONE).find(c=>c?.code===id(target)))};
const on=(...names)=>names.map((n,i)=>mon(n,0,i,1));
assert.equal(locked(on("Magician's Valkyria",'Dark Magician'),'Dark Magician'),true,'Valkyria covers other Spellcasters');
assert.equal(locked(on("Magician's Valkyria",'Dark Magician'),"Magician's Valkyria"),false,'but not herself');
assert.equal(locked(on("Magician's Valkyria","Magician's Valkyria"),"Magician's Valkyria"),true,'two Valkyria cover each other');
assert.equal(locked(on("Magician's Valkyria",'Battle Ox'),'Battle Ox'),false,'only Spellcasters');
assert.equal(locked(on('Marauding Captain','Command Knight','Battle Ox'),'Command Knight'),true,'Marauding Captain covers Warriors');
assert.equal(locked(on('Marauding Captain','Battle Ox'),'Marauding Captain'),false,'but not himself');
assert.equal(locked(on('Command Knight','Battle Ox'),'Command Knight'),true,'Command Knight hides behind another monster');
assert.equal(locked(on('Command Knight'),'Command Knight'),false,'and not when alone');
assert.equal(locked(on('Amazoness Tiger','Amazoness Paladin'),'Amazoness Paladin'),true,'Amazoness Tiger covers Amazoness');
assert.equal(locked(on('Vilepawn Archfiend','Desrook Archfiend'),'Desrook Archfiend'),true,'Vilepawn covers Archfiends');
assert.equal(locked(on('Vilepawn Archfiend','Vilepawn Archfiend'),'Vilepawn Archfiend'),false,'except Vilepawn itself');
assert.equal(locked(on("Guardian Kay'est"),"Guardian Kay'est"),true,"Guardian Kay'est can't be targeted");
assert.equal(locked(on('The Legendary Fisherman'),'The Legendary Fisherman',[back('Umi',0,5)]),true,'Fisherman with Umi');
assert.equal(locked(on('The Legendary Fisherman'),'The Legendary Fisherman'),false,'Fisherman without Umi');
// A negated guard protects nothing.
{const valk={...mon("Magician's Valkyria",0,0,1),is_disabled:true},e=duel([valk,mon('Dark Magician',0,1,1)],[]);assert.equal(smartContext(e,1,L,null).attackLocked(e.query(0,L.MZONE)[1]),false,'a negated Valkyria locks nothing')}

// In the Battle Phase it no longer sets out to attack something it can't reach.
{const attacker=mon('Vishwar Randi',1,2,1),e=duel([relinquished(),guardian(),valkyria()],[],{ownBoard:[attacker]});
 const a=e.auto({type:M.SELECT_BATTLECMD,player:1,attacks:[{...attacker}],chains:[],to_m2:true,to_ep:true});
 assert.notEqual(a.action,1,'no attack is declared at a locked target');}
console.log('PASS the CPU sets weak monsters when the only thing they beat is out of attack range; every lock card and its condition');
