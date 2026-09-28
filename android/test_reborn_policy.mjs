import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,L} from './web/duel.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url))),id=n=>meta.cards.find(c=>c.name===n).id;let checks=0;
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],turn:3,player:1-p,phase:4,events:[],visuals:[],peak:{turns:0},pendingSummons:[],activeChain:[],battleProtected:[false,false]});
 let monsters=[];const trap={code:id('Call of Darkness'),controller:p,location:L.SZONE,sequence:0};
 e.query=(side,loc)=>loc===L.MZONE?monsters.filter(c=>c.controller===side):[];
 const choose=()=>e.auto({type:M.SELECT_CHAIN,player:p,selects:[trap],forced:false}).index;
 const monster={code:id('Blue-Eyes White Dragon'),controller:1-p,location:L.MZONE,sequence:0,position:1,attack:3000,defense:2500};
 const chain=(name,link=1)=>e.onMessage({type:M.CHAINING,code:id(name),controller:1-p,location:L.SZONE,sequence:1,position:1,chain_size:link});
 assert.equal(choose(),null);checks++;
 chain('Monster Reborn');assert.equal(choose(),null);checks++;
 e.onMessage({type:M.CHAIN_NEGATED,chain_size:1});e.onMessage({type:M.CHAIN_SOLVING,chain_size:1});monsters=[monster];e.onMessage({type:M.SPSUMMONING,...monster});assert.equal(choose(),null);checks++;
 e.onMessage({type:M.CHAIN_END});chain('Call of the Haunted');e.onMessage({type:M.CHAIN_SOLVING,chain_size:1});e.onMessage({type:M.SPSUMMONING,...monster});assert.equal(choose(),null);checks++;
 e.onMessage({type:M.CHAIN_END});chain('Monster Reborn');chain('Mystical Space Typhoon',2);e.onMessage({type:M.CHAIN_SOLVING,chain_size:2});e.onMessage({type:M.CHAIN_SOLVED,chain_size:2});e.onMessage({type:M.CHAIN_SOLVING,chain_size:1});e.onMessage({type:M.SPSUMMONING,...monster});e.onMessage({type:M.SPSUMMONED});e.onMessage({type:M.CHAIN_SOLVED,chain_size:1});e.onMessage({type:M.CHAIN_END});assert.equal(choose(),0);checks++;
 e.onMessage({type:M.NEW_TURN,player:p});assert.equal(choose(),0);checks++;
 const controlled={...monster,controller:p};e.onMessage({type:M.MOVE,card:monster.code,from:monster,to:controlled});monsters=[controlled];assert.equal(choose(),0);checks++;
 e.onMessage({type:M.MOVE,card:monster.code,from:controlled,to:{controller:p,location:L.GRAVE,sequence:0,position:1}});monsters=[];assert.equal(choose(),null);checks++;
 monsters=[controlled];e.onMessage({type:M.SUMMONING,...controlled});assert.equal(choose(),null);checks++;
}
console.log('PASS',checks,'Call of Darkness: completed Reborn summons, negation, unrelated revival, control changes, leaving field and slot reuse');
