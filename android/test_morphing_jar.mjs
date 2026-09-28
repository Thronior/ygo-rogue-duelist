import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M} from './web/duel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url)));
const meta=read('content'),id=n=>meta.cards.find(c=>c.name===n).id;
for(const seed of [3,17,91]){
const e=await new MobileDuel(meta.cards).init([read('engine-data'),read('scripts')]);let flips=0,sorts=0;
try{let s=e.start(Array(30).fill(id('Battle Ox')),Array.from({length:10},()=>[id('Morphing Jar #2'),id('Petit Dragon'),id('Fissure')]).flat(),8000,4000,5,seed);for(let i=0;i<500&&!s.finished;i++){if(e.visuals.some(v=>v.kind==='effect'&&v.code===id('Morphing Jar #2')))flips++;e.visuals=[];if(e.pending.type===M.SORT_CARD)sorts++;s=e.respond(e.auto());}assert(flips>0);assert.equal(e.errors.length,0);assert(s.finished,'Must finish after Jar flip');console.log('PASS Morphing Jar #2',seed,flips,'activations',sorts,'sorts')}finally{e.destroy()}}
