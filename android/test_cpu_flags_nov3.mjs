// CPU misplays from the Nov 3 behaviour flags and Discord reports.
// Juragedo on Defense Position monsters (548ed5328e, 47f89670f3), Mystic Tomato held back (7da2c1f32f),
// A Hero Emerges into Asura Priest, and Snatch Steal on Gearfried the Iron Knight.
import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url))),id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const same=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,position,controller,location,sequence,type:data[id(name)]?.type||0,...extra});
const mon=(name,controller,sequence,position=1,extra)=>card(name,L.MZONE,controller,sequence,position,extra);
const back=(name,controller,sequence,position=10,extra)=>card(name,L.SZONE,controller,sequence,position,{description:BigInt(id(name))<<20n,...extra});
const hand=(names,controller=1)=>names.map((n,i)=>card(n,L.HAND,controller,i,10));
const filler=(controller,n=20)=>Array.from({length:n},(_,i)=>card('Battle Ox',L.DECK,controller,i,10));
// A stubbed duel; zones are {[player]:{[location]:cards}}. The CPU is seat 1.
function duel(zones,state={}){
 const e=new MobileDuel(meta.cards);
 Object.assign(e,{data,lp:[8000,8000],turn:6,player:1,phase:4,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},state);
 const slots=list=>{const out=Array(5).fill(null);for(const c of list)out[c.sequence]=c;return out};
 for(const p of [0,1]){zones[p]={[L.DECK]:filler(p),...zones[p]};for(const loc of [L.MZONE,L.SZONE])zones[p][loc]=slots(zones[p][loc]||[]);}
 e.query=(side,loc)=>zones[side]?.[loc]||[];
 e.core={duelQueryCount:(_,side,loc)=>(zones[side]?.[loc]||[]).length};
 return e;
}
const at=c=>({controller:c.controller,location:c.location,sequence:c.sequence});

// 1. Juragedo: only on a monster that will battle, and not twice on the same one.
{
 const JURA=id('Juragedo');
 // 548ed5328e: our Battle Phase, two Juragedo and a Defense Position Gilasaurus against an 1800 attacker.
 const a=mon('Juragedo',1,2),b=mon('Juragedo',1,1),gila=mon('Gilasaurus',1,3,4),k2=mon('Flying Kamakiri #2',0,0,1,{attack:1800}),para=mon('Parasite Paracide',0,1),k1=mon('Flying Kamakiri #1',0,2);
 const e=duel({1:{[L.MZONE]:[a,b,gila]},0:{[L.MZONE]:[k2,para,k1]}},{phase:8});e.effect={code:JURA,player:1};
 const policy=smartContext(e,1,L,{});
 assert(policy.targetScore('Juragedo',gila,{})<0,'548ed5328e: no ATK for a Defense Position Gilasaurus');checks++;
 assert(policy.targetScore('Juragedo',b,{})>=30000,'the Attack Position Juragedo can beat the 1800 attacker with 1000 more');checks++;
 // The second copy: the first is already on the chain for the only attacker.
 const second=mon('Juragedo',1,4),g=duel({1:{[L.MZONE]:[b,gila,second]},0:{[L.MZONE]:[k2,para,k1]}},{phase:8,activeChain:[{code:JURA,player:1,targets:[at(b)],link:1}]});
 same(smartContext(g,1,L,{}).activation(second,true)<0,true,'548ed5328e: no second Juragedo on a monster that already gets 1000');
 const h=duel({1:{[L.MZONE]:[b,gila,second]},0:{[L.MZONE]:[k2,para,k1]}},{phase:8});
 same(smartContext(h,1,L,{}).activation(second,true)>=0,true,'a first Juragedo for that attacker is still used');
 // 47f89670f3: every other monster is in Defense Position.
 const jura=mon('Juragedo',1,0),jam=mon('Revival Jam',1,1,4),troop=mon('Troop Dragon',1,2,4),gil2=mon('Gilasaurus',1,4,4);
 const mermaid=mon('Cure Mermaid',0,0,1,{attack:1575}),slate=mon('Slate Warrior',0,1,1,{attack:1975});
 const d=duel({1:{[L.MZONE]:[jura,jam,troop,gil2]},0:{[L.MZONE]:[mermaid,slate]}},{phase:8});
 same(d.auto({type:M.SELECT_CHAIN,player:1,forced:false,selects:[{...jura,description:String(BigInt(JURA)<<20n)}]}).index,null,'47f89670f3: Juragedo stays when only Defense Position monsters could take the ATK');
}

// 2. Mystic Tomato attacks into a bigger monster: it floats a DARK monster from the Deck.
{
 const TOMATO=id('Mystic Tomato');
 const tomato=mon('Mystic Tomato',1,2,1,{attack:1800}),barrel=mon('Roulette Barrel',0,2,1,{attack:2400}),twin=mon('Twin-Barrel Dragon',0,1,1,{attack:600});
 const deck=[...filler(1,10),card('Witch of the Black Forest',L.DECK,1,10,10)];
 const e=duel({1:{[L.MZONE]:[tomato],[L.DECK]:deck},0:{[L.MZONE]:[twin,barrel]}},{phase:8,lp:[3400,5600],selectionHint:549,attacker:{player:1,sequence:2,attack:1800,code:TOMATO,controller:1,location:L.MZONE}});
 // 7da2c1f32f: the guarded 600-ATK monster cannot be attacked, so only Roulette Barrel is offered.
 const r=e.auto({type:M.SELECT_CARD,player:1,can_cancel:true,min:1,max:1,selects:[at(barrel)]});
 same(r.indicies,[0],'7da2c1f32f: Mystic Tomato goes through with the attack on Roulette Barrel');
 const policy=smartContext(e,1,L,{});
 assert(policy.suicideScore(tomato,barrel)>0,'Tomato floats');checks++;
 const dry=duel({1:{[L.MZONE]:[tomato]},0:{[L.MZONE]:[twin,barrel]}},{phase:8,lp:[3400,5600]});
 same(smartContext(dry,1,L,{}).suicideScore(tomato,barrel),0,'no DARK monster to float into: no suicide attack');
}

// 3. A Hero Emerges against Asura Priest (Discord): a random Lady Ninja Yae only feeds the attacker.
{
 const trap=()=>back('A Hero Emerges',1,4);
 const uses=(mine,cards,attacker,target,state={})=>{const t=trap(),e=duel({1:{[L.MZONE]:mine,[L.SZONE]:[t],[L.HAND]:hand(cards)},0:{[L.MZONE]:[attacker]}},{player:0,phase:8,...state});
  e.attackCard=at(attacker);e.attackTarget=target?at(target):null;e.attacksThisTurn=new Map([[`0:${attacker.sequence}`,1]]);
  return smartContext(e,1,L,{}).activation(t,true)>=0};
 const asura=mon('Asura Priest',0,1),yae=mon('Lady Ninja Yae',1,0);
 same(uses([yae],['Lady Ninja Yae','Pot of Greed'],asura,yae),false,'Discord: no weak Lady Ninja Yae thrown at Asura Priest');
 same(uses([],['Lady Ninja Yae','Lady Ninja Yae'],asura,null),false,'Discord: a 1700 direct hit from a multi-attacker is not worth a doomed body');
 same(uses([yae],['Summoned Skull','Pot of Greed'],asura,yae),true,'a Summoned Skull beats the attacker');
 same(uses([],['Lady Ninja Yae','Pot of Greed'],asura,null,{lp:[8000,1500]}),true,'a lethal direct attack is blocked by any monster');
 same(uses([yae],['Lady Ninja Yae','Summoned Skull'],mon('Vorse Raider',0,1),yae),true,'half the monsters hold against a single attacker');
}

// 4. Snatch Steal never goes on Gearfried the Iron Knight, nor again after a copy fizzles on it.
{
 const steal=()=>card('Snatch Steal',L.HAND,1,0,10);
 const policy=(theirs,state={})=>{const e=duel({1:{[L.MZONE]:[mon('Battle Ox',1,0)],[L.HAND]:[steal()]},0:{[L.MZONE]:theirs}},state);e.effect={code:id('Snatch Steal'),player:1};return smartContext(e,1,L,{type:M.SELECT_IDLECMD,to_bp:true})};
 const gear=mon('Gearfried the Iron Knight',0,1);
 same(policy([gear]).activation(steal(),false)<0,true,'Discord: Gearfried destroys the equip, so Snatch Steal is held');
 const skull=mon('Summoned Skull',0,2);
 const both=policy([gear,skull]);
 assert(both.targetScore('Snatch Steal',gear,{})<0&&both.targetScore('Snatch Steal',skull,{})>0,'with another target it takes the Summoned Skull');checks++;
 same(policy([{...gear,is_disabled:true}]).activation(steal(),false)>=0,true,'a negated Gearfried can be stolen');
 // The Discord duel: the first copy fizzled, so Gearfried is still theirs and the second copy is held too.
 const after=duel({1:{[L.MZONE]:[mon('Battle Ox',1,0)],[L.HAND]:[steal()]},0:{[L.MZONE]:[gear],[L.GRAVE]:[card('Snatch Steal',L.GRAVE,0,0,10)]}});
 same(smartContext(after,1,L,{type:M.SELECT_IDLECMD,to_bp:true}).activation(steal(),false)<0,true,'Discord: no second Snatch Steal on Gearfried');
}
console.log(`CPU flags Nov 3: ${checks} checks passed`);
