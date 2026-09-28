import fs from 'node:fs';
import assert from 'node:assert/strict';
import {CPUViewer,shuffleCPUDeck} from './web/cpu-viewer.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url)));
const content=read('content'),resources={'engine-data':read('engine-data'),scripts:read('scripts')};
const source=Array.from({length:40},(_,i)=>i),original=[...source];
for(const seat of [0,1]){const a=shuffleCPUDeck(source,123,seat);assert.notDeepEqual(a,source);assert.deepEqual([...a].sort((a,b)=>a-b),source);assert.deepEqual(a,shuffleCPUDeck(source,123,seat));assert.notDeepEqual(a,shuffleCPUDeck(source,124,seat));}
assert.deepEqual(source,original);assert.notDeepEqual(shuffleCPUDeck(source,123,0),shuffleCPUDeck(source,123,1));
assert.deepEqual(shuffleCPUDeck([],1),[]);assert.deepEqual(shuffleCPUDeck([4],1),[4]);
const duplicate=[1,1,1,2,2,3];assert.deepEqual(shuffleCPUDeck(duplicate,11).sort(),duplicate);
// Exercise the actual Watch CPU Duel start/replay path using the real duel core.
globalThis.fetch=async name=>({json:async()=>resources[name.replace('.json','')]});
const viewer=Object.assign(Object.create(CPUViewer.prototype),{root:{innerHTML:''},content,characters:[4,12],tiers:[2,2],seed:123,generation:0,capture(){},render(){},schedule(){}});
const saved=JSON.stringify(viewer.characters.map(id=>content.cpuDecks[id][2]));
const opening=()=>JSON.stringify(viewer.state.players.map(p=>p.hand.map(c=>c.code)));
try{
 await viewer.start(true);const first=opening();assert.deepEqual(viewer.engine.aiModifiers,{});assert.deepEqual(viewer.state.lp,[8000,8000]);
 viewer.engine.aiModifiers={attack_bonus:9999,curse:true};
 await viewer.start(true);assert.deepEqual(viewer.engine.aiModifiers,{});assert.deepEqual(viewer.state.lp,[8000,8000]);assert.equal(opening(),first,'Replay reproduces both opening hands');
 await viewer.start();assert.notEqual(viewer.seed,123);assert.notEqual(opening(),first,'New match changes opening hands');
 assert.equal(JSON.stringify(viewer.characters.map(id=>content.cpuDecks[id][2])),saved,'Source decks are never reordered');
 let n=0;while(!viewer.state.finished&&n++<3000)viewer.state=viewer.engine.respond(viewer.engine.auto());
 assert.deepEqual(viewer.engine.errors,[]);assert(viewer.state.finished,'Shuffled match completes');
 console.log('PASS independent shuffles, card counts, source preservation, actual viewer replay/new match and complete shuffled duel:',n,'decisions');
}finally{viewer.engine?.destroy()}
