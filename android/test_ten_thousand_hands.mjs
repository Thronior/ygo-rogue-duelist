// Ten-thousand Hands adds one random Ritual Monster or Ritual Spell from the Deck to the starting hand, inside the real core.
import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {MobileDuel,M} from './web/duel.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('./web/'+name+'.json',import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),scripts=read('scripts'),fixture=read('test-fixture');
const id=name=>meta.cards.find(c=>c.name===name).id,ritual=code=>!!(data[code]?.type&0x80);
const script=artifacts=>{const r=spawnSync(fileURLToPath(new URL('../python/python.exe',import.meta.url)),['-B','-c',`import passives;print(passives.script({'character':7,'artifacts':${JSON.stringify(artifacts)},'curses':[]},telemetry=False))`],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout};
const engine=await new MobileDuel(meta.cards).init([data,scripts]);
const opening=(deck,artifacts,seed)=>{let state=engine.start(deck,fixture.enemy,8000,8000,5,seed,[],[],script(artifacts));for(let i=0;i<300&&!(state.pending?.type===M.SELECT_IDLECMD&&state.pending.player===0);i++)state=engine.respond(engine.auto());const hand=state.players[0].hand.filter(Boolean).map(c=>c.code);assert.deepEqual(engine.errors.filter(x=>x.trim()),[]);engine.destroy();return hand};
try{
 // Drawing after the relic shifts the Deck, so each run holds exactly one Ritual card that must reach the hand.
 const KURIBOH=id('Kuriboh');
 for(const card of [id('Relinquished'),id('Black Illusion Ritual')]){
  assert.ok(ritual(card));const deck=[card,...Array(39).fill(KURIBOH)];
  for(const seed of [1,2,3,4,5]){
   const base=opening(deck,[],seed),hand=opening(deck,['ten_thousand_hands'],seed);
   assert.equal(hand.length,base.length+1,'exactly one extra card');
   assert.ok(hand.includes(card),'the Ritual card always joins the starting hand');
  }
 }
 const plain=Array(40).fill(KURIBOH);
 assert.equal(opening(plain,['ten_thousand_hands'],1).length,opening(plain,[],1).length,'no Ritual cards in the Deck adds nothing');
 console.log('PASS Ten-thousand Hands: one random Ritual Monster or Ritual Spell from the Deck joins the starting hand; nothing without one');
}finally{try{engine.destroy()}catch{}}
