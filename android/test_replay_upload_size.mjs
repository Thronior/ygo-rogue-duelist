// Behaviour flags from huge runs (Nori, Discord 2026-11-20): at loop 9-10 with 150+ relics the duel script alone gzipped
// past the old 20 kB upload limit, so no flag could be sent "no matter how little" text. A synthetic run with every relic,
// stacked copies, curses and misprints: the uploaded replay drops the unused parts of the CPU header, keeps the duel
// script byte for byte, fits the new 100 kB limit, and the replays Worker accepts it.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {packReplay,unpackReplay,stringify,compactPassives,replayBundles,sendReplayBatch,MAX_REPLAY_BYTES} from './web/replays.js';
import worker,{validate,MAX_REPLAY_BYTES as WORKER_MAX} from '../multiplayer/replays/worker.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const passives=execFileSync(python,['-B','-c',`
import sys,random;sys.path.insert(0,'.')
import passives
from content import ARTIFACTS
rng=random.Random(9)
keys=sorted(ARTIFACTS)
arts=keys+[rng.choice(keys) for _ in range(120)]
mods=[dict(location='DECK',sequence=i,atk=rng.randrange(0,5000),defense=rng.randrange(0,5000),race=0,attribute=0) for i in range(40)]
run=dict(artifacts=arts,curses=['frailty','tax','mercy','brittle','exposed','fireproof_vest','spell_jammer']*2,loop=9,challenge_level=3,
 duel_modifications=mods,mirror_copy='urn',monster_type='Dragon',name_changes=[0x3b],opponent=0,round=3)
sys.stdout.write(passives.script(run))`],{cwd:root,maxBuffer:64<<20}).toString();

const gzipSize=async text=>(await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()).byteLength;
const deck=Array.from({length:40},(_,i)=>89631139+i),record={format:'ygo-replay',version:1,core:'ocgcore-wasm-0.1.2',build:'0.2.40',at:Date.now(),
 start:[deck,deck,8000,8000,5,123456,[],[],passives,5,null,null],
 responses:Array.from({length:1500},(_,i)=>i%3?{type:1,action:i%7,index:i%5}:{type:5,index:null}),ended:false,
 behaviourReport:{mode:'solo',seat:0,turn:14,phase:4,version:1,description:'x',at:Date.now(),step:1500}};

// The bug: the same record packed the old way is over the old 20 kB ceiling, and its script is over the old 200k characters.
const before=await gzipSize(stringify(record));
assert(before>=20000,`synthetic run should reproduce the 20 kB failure (got ${before})`);
assert(passives.length>200000,'synthetic script should pass the old 200k character check');

const bytes=await packReplay(record);
assert.equal(MAX_REPLAY_BYTES,WORKER_MAX,'client and Worker limits match');
assert(bytes.byteLength<MAX_REPLAY_BYTES,`compact replay ${bytes.byteLength} B fits ${MAX_REPLAY_BYTES}`);
assert(bytes.byteLength<before*0.92,`sends less: ${before} -> ${bytes.byteLength} B`);
console.log(`huge run: script ${passives.length} chars; replay ${before} B -> ${bytes.byteLength} B`);
assert.equal((await validate(bytes)).steps,1500);

// Lossless for the duel: every line but the CPU header is identical; the header keeps what the game reads.
const back=await unpackReplay(bytes),script=back.start[8],header=/^-- SHADOW_RUN_AI (.+)$/m;
assert.deepEqual(script.split('\n').filter(l=>!header.test(l)),passives.split('\n').filter(l=>!header.test(l)));
const was=JSON.parse(passives.match(header)[1]),now=JSON.parse(script.match(header)[1]);
assert.equal(script.match(/^-- SHADOW_RUN_AI /gm).length,1);
for(const key of Object.keys(was))if(key!=='statRelics')assert.deepEqual(now[key],was[key],key);
for(const side of [0,1]){assert.equal(now.statRelics[side].length,was.statRelics[side].length);
 now.statRelics[side].forEach((r,i)=>{const {art,tag,...used}=was.statRelics[side][i];assert.deepEqual(r,used);assert(!('art' in r)&&!('tag' in r));});}
assert(was.statRelics[0].some(r=>r.parameters),'a relic with parameters is covered');
assert.deepEqual(back.responses,record.responses);assert.deepEqual(back.behaviourReport,record.behaviourReport);
assert.equal(record.start[8],passives,'packing never edits the live record');
assert.equal(compactPassives('-- SHADOW_RUN_AI {broken'),'-- SHADOW_RUN_AI {broken','an unreadable header is left as it is');

// The Worker takes it on both upload routes (flags use the single route; Settings uploads use bundles).
const seen=new Set(),env={REPLAYS:{idFromName:n=>n,get:()=>({fetch:async request=>{seen.add(new URL(request.url).pathname.slice(1));return Response.json({ok:true,id:new URL(request.url).pathname.slice(1)})}})}};
const call=(url,args)=>worker.fetch(new Request(url,args),env);
const single=await call('https://test/v1/replays',{method:'POST',headers:{'Content-Type':'text/plain'},body:bytes});
assert.equal(single.status,200,await single.clone().text());
const small=await packReplay({...record,start:[...record.start.slice(0,8),'',5,null,null],responses:[]});
const rows=[{bytes},{bytes:small},{bytes},{bytes:small}],bundles=replayBundles(rows);
for(const bundle of bundles)assert(bundle.reduce((n,r)=>n+Math.ceil(r.bytes.byteLength/3)*4+3,0)<=250000||bundle.length===1);
assert.deepEqual(bundles.flat(),rows,'bundles keep every row in order');
for(const bundle of bundles)assert((await sendReplayBatch(bundle,call)).every(r=>r.ok));
assert.equal(replayBundles(Array.from({length:25},()=>({bytes:small}))).map(b=>b.length).join(),'10,10,5','small replays still go 10 at a time');
await assert.rejects(validate(new Uint8Array(MAX_REPLAY_BYTES)),/100 kB/);
console.log('replay upload size: ok');
