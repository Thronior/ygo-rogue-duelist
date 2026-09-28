import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url)));let checks=0;
for(const p of [0,1]){
const e=new MobileDuel(meta.cards);let zones={};Object.assign(e,{data,lp:[8000,8000],player:p,phase:4,turn:3,activeChain:[],battleProtected:[false,false],aiModifiers:{}});e.query=(s,l)=>zones[s+':'+l]||[];
const c=(n,side=p,loc=L.MZONE,seq=0,extra={})=>{const code=meta.cards.find(x=>x.name===n).id;return {code,controller:side,location:loc,sequence:seq,position:1,attack:data[code].attack,defense:data[code].defense,...extra}};
const put=(s,l,...cs)=>zones[s+':'+l]=cs.map((x,i)=>({...x,controller:s,location:l,sequence:i}));
const ctx=()=>smartContext(e,p,L,{to_bp:e.phase===4});const no=n=>{assert.equal(ctx().activation(c(n,p,L.HAND),true),-1,n);checks++};
put(1-p,L.MZONE,c('Battle Ox',1-p));e.phase=256;no('Stop Defense');no('Giant Trunade');e.phase=4;
put(p,L.MZONE,c('Mystical Elf',p,L.MZONE,0,{position:8}));put(1-p,L.MZONE,c('Aqua Madoor',1-p),c('Hane-Hane',1-p));no('Umi');
put(1-p,L.MZONE,c('Battle Ox',1-p,L.MZONE,0,{attack:1900}));assert(ctx().preferSet(c('Giant Soldier of Stone',p,L.HAND)));checks++;
put(p,L.MZONE,c('Mystical Elf',p,L.MZONE,0,{position:4,defense:2400}));assert.equal(ctx().tributeWorth(c('Summoned Skull',p,L.HAND),true),false);checks++;
e.player=1-p;e.attackCard=null;no('Book of Moon');
put(p,L.MZONE,c('Battle Ox',p,L.MZONE,0,{attack:1700}),c('Dark Magician',p,L.MZONE,1));put(1-p,L.MZONE,c('Mechanicalchaser',1-p));e.attackCard=e.query(1-p,L.MZONE)[0];e.attackTarget=e.query(p,L.MZONE)[0];e.phase=32;e.inDamageStep=true;
assert(ctx().activation(c('Reinforcements',p,L.SZONE),true)>0);checks++;assert(ctx().targetScore('Reinforcements',e.attackTarget,{})>ctx().targetScore('Reinforcements',e.query(p,L.MZONE)[1],{}));checks++;
e.attackTarget=e.query(p,L.MZONE)[1];no('Reinforcements');
e.player=p;e.phase=4;e.inDamageStep=false;e.attackCard=null;e.attackTarget=null;
put(p,L.MZONE);put(1-p,L.MZONE,c('Battle Ox',1-p,L.MZONE,0,{attack:2200}),c('Mechanicalchaser',1-p,L.MZONE,1,{attack:2100}));e.aiModifiers={statRelics:[[],[]]};e.aiModifiers.statRelics[1-p]=[{effect:'atk',amount:500,filter:''}];no('Change of Heart');
e.aiModifiers.statRelics[1-p]=[{effect:'approved_blood_crown'}];no('Change of Heart');
const stale={...e.query(1-p,L.MZONE)[0],attack:9999};assert.equal(ctx().projectedAttack(stale),2200);checks++;
}
console.log('PASS',checks,'September 26 tactical regressions on both seats');
