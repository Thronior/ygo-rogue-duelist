import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,L,M} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url),'utf8')),meta=read('content'),data=read('engine-data');
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:p,turn:4,phase:4,activeChain:[],battleProtected:[false,false]});let zones={};e.query=(s,l)=>zones[s+':'+l]||[];
 const card=(name,s=p,extra={})=>{const code=meta.cards.find(c=>c.name===name).id;return {code,controller:s,location:L.MZONE,sequence:0,position:1,attack:data[code].attack,defense:data[code].defense,...extra}};
 const put=(s,l,...c)=>zones[s+':'+l]=c;
 const skull=card('Toon Summoned Skull'),hane=card('Hane-Hane',p,{sequence:1,position:8});put(p,L.MZONE,skull,hane);
 let m={type:M.SELECT_SUM,player:p,select_max:1,amount:1,min:0,max:0,selects_must:[],selects:[{...skull,amount:6},{...hane,amount:2}]};assert.deepEqual(e.auto(m).indicies,[1]);assert(e.sumValid(m,e.auto(m).indicies));
 const mantis=card('Empress Mantis'),bug=card('Man-Eater Bug',p,{sequence:1,position:8});put(p,L.MZONE,mantis,bug);e.effect={code:card('Multiplication of Ants').code,player:p};m={type:M.SELECT_UNSELECT_CARD,player:p,select_cards:[mantis,bug],unselect_cards:[],can_finish:false,can_cancel:false};assert.equal(e.auto(m).index,1);assert.equal(e.auto({...m,can_finish:true}).index,null);
 const yomi=card('Yomi Ship',1-p,{position:4});put(1-p,L.MZONE,yomi);let policy=smartContext(e,p,L);assert(policy.attackScore(mantis,yomi,{dmg:0})<=-99999);assert(policy.attackScore(mantis,yomi,{dmg:8000})>-99999,'Take lethal damage');assert(policy.attackScore(mantis,{...yomi,is_disabled:true},{dmg:0})>-99999,'Disabled Yomi is safe');
 const statue=card('Stone Statue of the Aztecs',1-p,{position:4,level:4});put(1-p,L.MZONE,statue);assert.equal(smartContext(e,p,L).flipUseful('4-Starred Ladybug of Doom',bug),true);put(1-p,L.MZONE,{...statue,position:8});assert.equal(smartContext(e,p,L).flipUseful('4-Starred Ladybug of Doom',bug),false,'Do not inspect hidden levels');
}
console.log('PASS October 12 CPU regressions for both seats');
