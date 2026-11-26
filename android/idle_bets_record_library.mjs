// Records a library of real CPU duels for the Shadow Betting playtest (android/idle_bets_playtest.mjs), the same way
// the game does: two random CPU decks from every tier, the real engine and AI, no turn limit.
// Usage: node android/idle_bets_record_library.mjs <count> <out.json>
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const web=path.join(path.dirname(fileURLToPath(import.meta.url)),'web');
const [count=300,out]=[Number(process.argv[2])||300,process.argv[3]];
const read=n=>JSON.parse(fs.readFileSync(path.join(web,n),'utf8'));
const {MobileDuel}=await import(pathToFileURL(path.join(web,'duel.js')));
const {recordDuel}=await import(pathToFileURL(path.join(web,'idle-bets-sim.js')));
const meta=read('content.json'),data=read('engine-data.json'),scripts=read('scripts.json');
const pool=Object.entries(meta.cpuWatchDecks).flatMap(([id,rs])=>rs.map((r,t)=>({id:+id,t,r,label:r?.label||'Tier '+(t+1)}))).filter(d=>d.r?.main?.length&&(meta.cpuWatchOpponents[d.id]||meta.characters[d.id]));
let rng=12345;const rand=n=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return Math.floor(rng/4294967296*n)};
const lib=[];const t0=Date.now();
for(let i=0;i<count;i++){const a=pool[rand(pool.length)];let b;do b=pool[rand(pool.length)];while(b===a);
 const engine=await new MobileDuel([...meta.cards,...(meta.tokenCards||[])]).init([data,scripts]);
 const tl=recordDuel(engine,[a.r,b.r],[{id:a.id,tier:a.t},{id:b.id,tier:b.t}],90000+i);
 tl.labels=[a.label,b.label];lib.push(tl);
 if((i+1)%25===0)console.log(`${i+1}/${count} duels (${((Date.now()-t0)/1000).toFixed(0)} s)`)}
fs.writeFileSync(out,JSON.stringify(lib));console.log('saved',lib.length,'duels to',out);
