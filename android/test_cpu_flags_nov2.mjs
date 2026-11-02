// Behaviour flags against v0.2.17 (2026-11-02): three CPU choices, each reproduced from its replay.
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
const ctx=(mine,options)=>{const e=duel(mine,[],options);return [e,smartContext(e,1,L,null)]};
const baou=(sequence=0)=>({...back('Wicked-Breaking Flamberge - Baou',0,0),equipCard:{controller:0,location:L.MZONE,sequence,position:1}});

// Flag 0be76afa: Sangan dies to a monster holding Baou and searches nothing.
{const sangan=mon('Sangan',1,2,1),emissary=mon('Emissary of the Afterlife',0,0,1);
 let [,s]=ctx([emissary],{ownBoard:[sangan]});assert.equal(s.suicideScore(sangan,emissary),800,'a plain 1600 ATK target is worth dying to');
 [,s]=ctx([emissary],{ownBoard:[sangan],theirBack:[baou()]});assert.equal(s.suicideScore(sangan,emissary),0,'Baou negates the search');assert.equal(s.suicideScore(sangan),0,'and it is the only target');
 const other=mon('Battle Ox',0,1,1);[,s]=ctx([emissary,other],{ownBoard:[sangan],theirBack:[baou()]});assert.equal(s.suicideScore(sangan,other),800,'the monster without Baou still counts');
 const e=duel([emissary],[],{ownBoard:[sangan],theirBack:[baou()]}),a=e.auto({type:M.SELECT_BATTLECMD,player:1,attacks:[{...sangan}],chains:[],to_m2:true,to_ep:true});assert.notEqual(a.action,1,'no attack is declared');}

// Flag 03dcbf9a: each Battleguard gains 500 ATK for the other.
{const lava=card('Lava Battleguard',L.HAND,1,0,0),swamp=mon('Swamp Battleguard',1,1,1),setSwamp=mon('Swamp Battleguard',1,1,8);
 let [,s]=ctx([],{hand:[lava]});assert.equal(s.projectedAttack(lava),1550,'alone it has its printed ATK');
 [,s]=ctx([],{hand:[lava],ownBoard:[swamp]});assert.equal(s.projectedAttack(lava),2050,'a face-up partner adds 500');
 [,s]=ctx([],{hand:[lava],ownBoard:[setSwamp]});assert.equal(s.projectedAttack(lava),1550,'a set partner adds nothing');
 [,s]=ctx([],{hand:[lava],ownBoard:[mon('Swamp Battleguard',1,1,1),mon('Swamp Battleguard',1,2,1)]});assert.equal(s.projectedAttack(lava),2550,'it counts each partner');
 // The flagged board: a set Mataza to pay with and Swamp keeps its bonus.
 const hand=[lava],board=[mon('Mataza the Zapper',1,0,8),mon('Swamp Battleguard',1,1,1),mon('Gagagigo',1,2,1)],set=()=>mon('Battle Ox',0,0,8);
 const e=duel([set()],[],{hand,ownBoard:board}),choice=e.auto({type:M.SELECT_IDLECMD,player:1,summons:hand,monster_sets:hand,special_summons:[],spell_sets:[],activates:[],pos_changes:[],to_bp:true,to_ep:true});
 assert.equal(choice.action,I.SELECT_SUMMON,'Lava is summoned rather than set');
 // The partner is never the Tribute: alone with it, the summon is not worth paying for.
 const only=duel([],[],{hand,ownBoard:[mon('Swamp Battleguard',1,1,1)]});assert.equal(smartContext(only,1,L,null).tributeWorth(lava),false,'Swamp is not spent on Lava');}

// Flag f2cdd521: a special summon that wins in Attack and dies in Defense goes to Attack.
{const ask=(mine,code='Gilasaurus')=>duel(mine,[]).auto({type:M.SELECT_POSITION,player:1,code:id(code),positions:1|4}).position;
 assert.equal(ask([mon('Battle Ox',0,1,8),mon('Man-Eater Bug',0,0,1)]),1,'1400 ATK beats 850 even with a strong guess for the set card');
 assert.equal(ask([mon('Blue-Eyes White Dragon',0,0,1)]),4,'an attacker that beats either position still means Defense');
 const threat=[mon('Battle Ox',0,1,8)];threat[0].defense=1000;const e=duel(threat,[]);const guess=smartContext(e,1,L,null).hiddenDefense(threat[0]);assert.equal(ask(threat),1400>guess?1:4,'with nothing visible the threat rule still decides');}
console.log('PASS Sangan avoids Baou, the Battleguards count each other, Gilasaurus takes the position that wins');process.exit(0);
