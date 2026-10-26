import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,L} from './web/duel.js';import {smartContext} from './web/smart_policy.js';
// The core reports no attack count; MobileDuel.query fills it from attacks declared this turn.
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data'),id=n=>meta.cards.find(c=>c.name===n).id;
const p=1,e=new MobileDuel(meta.cards),zones={};
Object.assign(e,{data,h:0,lp:[8000,8000],player:p,turn:3,phase:8,activeChain:[],battleProtected:[false,false],aiModifiers:{activeRelics:[[],[]],statRelics:[[],[]]}});
e.core={duelQueryLocation:(h,{controller,location})=>zones[controller+':'+location]||[]};
const reaper={code:id('Spirit Reaper'),position:1,attack:300,defense:200};
zones[p+':'+L.MZONE]=[null,{...reaper}];
const ready=()=>smartContext(e,p,L,{to_bp:true}).reaperDirectReady(e.query(p,L.MZONE)[1]);
assert.deepEqual(e.query(p,L.MZONE).map(c=>c?.attack_count),[undefined,0]);
assert.equal(ready(),true,'unattacked Spirit Reaper can still attack directly');
e.attacksThisTurn=new Map([[p+':1',1]]);
assert.equal(e.query(p,L.MZONE)[1].attack_count,1);
assert.equal(ready(),false,'Spirit Reaper that already attacked is spent');
assert.equal(e.query(1-p,L.MZONE).length,0);
e.attacksThisTurn=new Map();
assert.equal(e.query(p,L.MZONE)[1].attack_count,0,'a new turn clears the count');
console.log('PASS attack_count from declared attacks');
