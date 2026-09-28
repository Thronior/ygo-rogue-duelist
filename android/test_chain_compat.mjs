// Regression: Sinister Serpent registers a delayed effect; chain property capture
// must not query unsupported Link/Pendulum flags in the vintage WASM core.
import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel} from './web/duel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data'),scripts=read('scripts');const e=await new MobileDuel(meta.cards).init([data,scripts]);
for(const tier of [2]){const a=meta.cpuDecks['7'][tier];assert.equal(a.main.length,40);for(const id of a.main){assert(data[id]);assert(fs.existsSync(new URL('./web/assets/cards/'+id+'.jpg',import.meta.url)));if(!(data[id].type&1)||data[id].type&32)assert(scripts['c'+id+'.lua'],String(id))}for(const opponent of ['12','18']){try{const b=meta.cpuDecks[opponent][tier];let s=e.start(a.main,b.main,8000,8000,5,19,a.extra,b.extra),n=0;for(;n<3000&&!s.finished;n++)s=e.respond(e.auto());assert.deepEqual(e.errors,[]);assert(s.finished);console.log('PASS Pegasus tier',tier+1,'vs',b.name,n,'decisions; completed')}finally{e.destroy()}}}

