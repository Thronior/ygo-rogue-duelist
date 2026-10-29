// CPU behaviour flags from the 2026-10-29 review (v0.2.9 builds).
import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,R,I,B,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';import {planBattle} from './web/battle-planner.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url))),id=n=>meta.cards.find(c=>c.name===n).id;
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,position,controller,location,sequence,type:data[id(name)]?.type||0,...extra});
const mon=(name,controller,sequence,position=1,extra)=>card(name,L.MZONE,controller,sequence,position,extra);
const back=(name,controller,sequence,position=1,extra)=>card(name,L.SZONE,controller,sequence,position,extra);
const hand=(name,controller,sequence)=>card(name,L.HAND,controller,sequence,10);
const filler=(controller,n=20)=>Array.from({length:n},(_,i)=>card('Battle Ox',L.DECK,controller,i,10));
// A CPU (seat 1) duel whose zones are given as {[player]:{[location]:cards}}.
function duel(zones,state={}){
 const e=new MobileDuel(meta.cards);
 Object.assign(e,{data,lp:[8000,8000],turn:5,player:1,phase:4,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},state);
 const slots=list=>{const out=Array(5).fill(null);for(const c of list)out[c.sequence]=c;return out};
 for(const p of [0,1]){zones[p]={[L.DECK]:filler(p),...zones[p]};for(const loc of [L.MZONE,L.SZONE])zones[p][loc]=slots(zones[p][loc]||[]);}
 e.query=(side,loc)=>zones[side]?.[loc]||[];
 e.core={duelQueryCount:(_,side,loc)=>(zones[side]?.[loc]||[]).length};
 return e;
}
const idle=(o={})=>({type:M.SELECT_IDLECMD,player:1,summons:[],special_summons:[],monster_sets:[],spell_sets:[],activates:[],pos_changes:[],to_bp:true,to_ep:true,...o});
const activated=(e,m,name)=>{const r=e.auto(m);return r.action===I.SELECT_ACTIVATE&&e.name(m.activates[r.index].code)===name;};

// 1. "Cannot be destroyed by battle" is no protection from Fissure (0440a8887b: two Fissures held for five turns).

// Behaviour flag 2026-10-29: with Fissure and Raigeki in hand and one face-up enemy monster, spend Fissure.
{
 const fissure=hand('Fissure',1,0),raigeki=hand('Raigeki',1,1),bell=mon('Summoned Skull',0,2);
 const e=duel({1:{[L.HAND]:[fissure,raigeki]},0:{[L.MZONE]:[bell]}},{lp:[4000,8000]});
 const m=idle({activates:[fissure,raigeki]}),r=e.auto(m);
 assert.equal(r.action,I.SELECT_ACTIVATE);assert.equal(e.name(m.activates[r.index].code),'Fissure','Fissure handles a lone monster; Raigeki is kept');
}
// Two face-up monsters: the wipe still covers both, so Raigeki is used and Fissure kept.
{
 const fissure=hand('Fissure',1,0),raigeki=hand('Raigeki',1,1),skull=mon('Summoned Skull',0,2),eyes=mon('Blue-Eyes White Dragon',0,3);
 const e=duel({1:{[L.HAND]:[fissure,raigeki]},0:{[L.MZONE]:[skull,eyes]}},{lp:[4000,8000]});
 const m=idle({activates:[fissure,raigeki]}),r=e.auto(m);
 assert.equal(r.action,I.SELECT_ACTIVATE);assert.equal(e.name(m.activates[r.index].code),'Raigeki','one wipe for two monsters');
}
// Call of the Haunted on any monster that stops a lethal attack, however weak (2026-10-29).
for(const [lp,expected,why] of [[1500,true,'Kuriboh takes the hit: 1400 instead of 1700'],[1000,false,'1400 through Kuriboh is still lethal'],[8000,false,'no lethal, no need for a weak revive']]){
 const call=back('Call of the Haunted',1,1,10),ox=mon('Battle Ox',0,1),kuriboh=card('Kuriboh',L.GRAVE,1,0,1);
 const e=duel({1:{[L.SZONE]:[call],[L.GRAVE]:[kuriboh]},0:{[L.MZONE]:[ox]}},{player:0,phase:16,lp:[8000,lp]});
 e.attackCard={controller:0,location:L.MZONE,sequence:1};ox.attack_count=1;
 const smart=smartContext(e,1,L,{type:M.SELECT_CHAIN,player:1,selects:[call]});
 assert.equal(smart.activation(call,true)>=0,expected,why);
}
console.log('PASS review oct29: narrow removal for a lone monster, the wipe for two; Call of the Haunted stops lethal with any monster');
