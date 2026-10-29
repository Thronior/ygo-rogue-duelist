// Character Stats (2026-10-29): which finished runs count as wins or losses, per character and challenge level.
import assert from 'node:assert/strict';
const rows=new Map();globalThis.localStorage={getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,String(v)),removeItem:k=>rows.delete(k)};
globalThis.location={hostname:'example.test'};globalThis.document={addEventListener(){},hidden:false};
let posted=[];globalThis.fetch=async(url,options)=>{posted.push(JSON.parse(options.body));return new Response('{}',{status:200})};
const {runResult,recordRunResult,syncStats}=await import('./web/global-stats.js');
const run=extra=>({character:3,challenge_level:2,started_at:1000,loop:0,stage:'shop',...extra});
assert.equal(runResult(run({stage:'complete'})),'3:2:w','clearing the first loop is a win');
assert.equal(runResult(run({stage:'gameover'})),'3:2:l','dying in the first loop is a loss');
assert.equal(runResult(run({stage:'gameover',loop:1})),'3:2:w','dying after looping is still a win');
assert.equal(runResult(run({stage:'complete',challenge_level:-1})),'3:-1:w');
assert.equal(runResult(run({stage:'shop'})),null,'unfinished runs do not count');
assert.equal(runResult(run({stage:'complete',secret_challenge:true})),null,'secret challenges do not count');
assert.equal(runResult(run({stage:'gameover',history_mode:'tag'})),null,'tag runs do not count');
assert.equal(runResult(run({stage:'complete',challenge_level:7})),null);
// Each run is counted once, however often its final state is seen, and travels with the next stats batch.
recordRunResult(run({stage:'complete'}));recordRunResult(run({stage:'complete'}));recordRunResult(run({stage:'gameover',loop:1}));
recordRunResult(run({started_at:2000,stage:'gameover',character:12,challenge_level:6}));
await new Promise(r=>setTimeout(r,50));const realNow=Date.now;Date.now=()=>realNow()+11*60000;await syncStats();Date.now=realNow;
const batch=posted.find(b=>b.results);assert.deepEqual(batch.results,{'3:2:w':1,'12:6:l':1});assert(Object.keys(batch.counts).every(k=>['runs','duels','wins','losses','seconds','firstTimePlayers'].includes(k)));
assert.deepEqual(Object.keys(batch).sort(),['batchId','counts','expiresAt','results'],'no run identity is uploaded');
console.log('PASS character stats: first-loop wins and losses, looped deaths stay wins, each run once, no identity uploaded');
