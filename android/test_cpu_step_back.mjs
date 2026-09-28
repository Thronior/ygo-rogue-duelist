import fs from 'node:fs';import assert from 'node:assert/strict';import {CPUViewer} from './web/cpu-viewer.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),content=read('content'),resources={'engine-data':read('engine-data'),scripts:read('scripts')};globalThis.fetch=async name=>({json:async()=>resources[name.replace('.json','')]});
const viewer=Object.assign(Object.create(CPUViewer.prototype),{root:{innerHTML:''},content,characters:[4,12],tiers:[2,2],seed:123,generation:0,render(){},schedule(){}});
const snapshot=()=>JSON.stringify({state:viewer.state,history:viewer.history,plan:viewer.engine.exodiaPlan},(_,v)=>typeof v==='bigint'?String(v):v);
try{
 await viewer.start(true,{paused:true});const initial=snapshot();await viewer.stepBack();assert.equal(snapshot(),initial);
 let prior,current;
 for(let i=0;i<40&&!viewer.state.finished;i++){prior=snapshot();viewer.step();current=snapshot()}
 const count=viewer.decisions.length;assert(count>10);await viewer.stepBack();assert.equal(viewer.decisions.length,count-1);assert.equal(snapshot(),prior);assert(viewer.paused);
 viewer.step();assert.equal(snapshot(),current,'Stepping forward returns the same complete position and log');
 const first=viewer.decisions.slice(0,1);await viewer.start(true,{replay:first,paused:true});await viewer.stepBack();assert.equal(snapshot(),initial,'Rewind to the opening deal');
 for(let i=0;i<3000&&!viewer.state.finished;i++)viewer.step();assert(viewer.state.finished);const ending=snapshot();await viewer.stepBack();assert(!viewer.state.finished);assert(viewer.paused);viewer.step();assert.equal(snapshot(),ending,'Rewind and replay the winning move');assert.deepEqual(viewer.engine.errors,[]);
 console.log('PASS exact CPU rewind/forward, initial boundary, multiple decisions, paused state, full logs and finished-duel rewind');
}finally{viewer.engine?.destroy()}
