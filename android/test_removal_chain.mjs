import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data'),id=n=>meta.cards.find(c=>c.name===n).id;
for(const p of [0,1]){
 const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],player:1-p,activeChain:[],events:[],visuals:[],peak:{}});
 // Both targets warrant a discard: this test isolates chain reservations.
 const ox={code:id('Battle Ox'),controller:1-p,location:L.MZONE,sequence:0,position:1,attack:3200};
 const dragon={code:id('Blue-Eyes White Dragon'),controller:1-p,location:L.MZONE,sequence:1,position:1,attack:3000};let monsters=[ox,dragon];
 e.query=(side,loc)=>side===1-p&&loc===L.MZONE?monsters:side===p&&loc===L.HAND?[{code:ox.code},{code:ox.code}]:[];
 const removal={code:id('Raigeki Break'),controller:p,location:L.SZONE,sequence:0,position:8};
 e.onMessage({type:M.CHAINING,code:id('Ring of Destruction'),controller:p,triggering_controller:p,chain_size:1});e.onMessage({type:M.BECOME_TARGET,cards:[dragon]});
 let policy=smartContext(e,p,L);assert(policy.activation(removal,true)>0,'Another threat can still be removed');
 e.effect={code:removal.code,player:p};let r=e.auto({type:M.SELECT_CARD,player:p,min:1,max:1,selects:[ox,dragon]});assert.equal(r.indicies[0],0,'Select the unreserved target');
 monsters=[dragon];assert(smartContext(e,p,L).activation(removal,true)<0,'Do not double-remove the only threat');
 e.onMessage({type:M.CHAIN_NEGATED,chain_size:1});assert(smartContext(e,p,L).activation(removal,true)>0,'Negated removal no longer reserves its target');
 e.onMessage({type:M.CHAIN_END});e.onMessage({type:M.CHAINING,code:id('Raigeki'),controller:p,triggering_controller:p,chain_size:1});
 assert(smartContext(e,p,L).activation(removal,true)<0,'Do not remove monsters already covered by our board wipe');
 e.onMessage({type:M.CHAIN_END});assert(smartContext(e,p,L).activation(removal,true)>0,'Reservations clear after chain');
}
console.log('PASS removal reservations: both players, different target, same target, negation, board wipe and chain reset');
