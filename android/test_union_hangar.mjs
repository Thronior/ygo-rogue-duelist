// Union Hangar adds one random Union monster from the Deck to the starting hand, inside the real core.
import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {MobileDuel,M} from './web/duel.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('./web/'+name+'.json',import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),scripts=read('scripts'),fixture=read('test-fixture');
const id=name=>meta.cards.find(c=>c.name===name).id,union=code=>!!(data[code]?.type&0x400);
const script=artifacts=>{const r=spawnSync(fileURLToPath(new URL('../python/python.exe',import.meta.url)),['-B','-c',`import passives;print(passives.script({'character':1,'artifacts':${JSON.stringify(artifacts)},'curses':[]},telemetry=False))`],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout};
const engine=await new MobileDuel(meta.cards).init([data,scripts]);
const opening=(deck,artifacts,seed)=>{let state=engine.start(deck,fixture.enemy,8000,8000,5,seed,[],[],script(artifacts));for(let i=0;i<300&&!(state.pending?.type===M.SELECT_IDLECMD&&state.pending.player===0);i++)state=engine.respond(engine.auto());const hand=state.players[0].hand.filter(Boolean).map(c=>c.code);assert.deepEqual(engine.errors.filter(x=>x.trim()),[]);engine.destroy();return hand};
try{
 // X-Head Cannon is a Normal Monster; only Y-Dragon Head and Z-Metal Tank are Unions.
 const KURIBOH=id('Kuriboh'),X=id('X-Head Cannon'),Y=id('Y-Dragon Head');
 assert.ok(union(Y)&&!union(X)&&!union(KURIBOH));
 const deck=[Y,X,...Array(38).fill(KURIBOH)];let missed=0;
 for(const seed of [1,2,3,4,5,6,7,8]){
  const base=opening(deck,[],seed),hand=opening(deck,['union_hangar'],seed);
  assert.equal(hand.length,base.length+1,'exactly one extra card');
  assert.ok(hand.includes(Y),'the only Union monster always joins the starting hand');
  if(!base.includes(Y))missed++;
 }
 assert.ok(missed>0,'without the relic the Union monster is not always drawn');
 const plain=Array(40).fill(KURIBOH);
 assert.equal(opening(plain,['union_hangar'],1).length,opening(plain,[],1).length,'no Union monsters in the Deck adds nothing');
 console.log('PASS Union Hangar: one random Union monster from the Deck joins the starting hand; nothing without one');
}finally{try{engine.destroy()}catch{}}
