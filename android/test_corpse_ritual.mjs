// Corpse Ritual: monsters in your GY can be banished as Ritual Material (user request 2026-11-06).
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const RIDER=id('Dokurorider'),REVIVAL=id('Revival of Dokurorider'),BURIAL=id('Foolish Burial'),SKULL=id('Summoned Skull');
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const relicScript=artifacts=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.script(json.loads(sys.argv[1])))",JSON.stringify({curses:[],artifacts,challenge_level:0})],{cwd:root,encoding:'utf8'});
let checks=0;
assert(JSON.stringify(meta).includes('Corpse Ritual'),'Corpse Ritual is in content.json');checks++;

// Bury Summoned Skull with Foolish Burial, then Ritual Summon Dokurorider (Level 6) with it from the GY.
async function run(artifacts){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 const deck=Array.from({length:40},(_,n)=>[RIDER,REVIVAL,BURIAL,SKULL][n%4]);
 let s=e.start(deck,Array(40).fill(id('Battle Ox')),8000,8000,5,3,[],[],relicScript(artifacts)),offeredGrave=false,ritual=false,banished=0;
 for(let i=0;i<4000&&!s.finished&&e.turn<=6&&!ritual;i++){const m=e.pending;if(!m)break;
  if(m.player===0&&m.type===M.SELECT_IDLECMD){
   const grave=e.query(0,L.GRAVE).some(c=>c&&c.code===SKULL),act=code=>m.activates.findIndex(c=>c.code===code);
   if(grave&&act(REVIVAL)>=0){s=e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:act(REVIVAL)});continue}
   if(!grave&&act(BURIAL)>=0){s=e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:act(BURIAL)});continue}
   s=e.respond({type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});continue}
  if(m.player===0&&m.type===M.SELECT_CARD&&m.selects.some(c=>c.code===SKULL&&c.location===L.DECK)){s=e.respond({type:R.SELECT_CARD,indicies:[m.selects.findIndex(c=>c.code===SKULL&&c.location===L.DECK)]});continue}
  if(m.player===0&&(m.type===M.SELECT_SUM||m.type===M.SELECT_UNSELECT_CARD)){
   const g=m.type===M.SELECT_SUM?m.selects:[...(m.selects||m.select_cards||[])];
   const at=g.findIndex(c=>c.location===L.GRAVE&&c.code===SKULL);
   if(at>=0){offeredGrave=true;s=e.respond(m.type===M.SELECT_SUM?{type:R.SELECT_SUM,indicies:[at]}:{type:R.SELECT_UNSELECT_CARD,index:at});continue}}
  s=e.respond(e.auto());
  if(e.query(0,L.MZONE).some(c=>c&&c.code===RIDER))ritual=true}
 banished=e.query(0,L.REMOVED).filter(c=>c&&c.code===SKULL).length;
 const graveSkulls=e.query(0,L.GRAVE).filter(c=>c&&c.code===SKULL).length;
 e.destroy();return {offeredGrave,ritual,banished,graveSkulls};
}
const withRelic=await run(['corpse_ritual']);
console.log('with relic',withRelic);
assert(withRelic.offeredGrave,'the GY Summoned Skull is offered as Ritual Material');checks++;
assert(withRelic.ritual,'Dokurorider is Ritual Summoned');checks++;
assert.equal(withRelic.banished,1,'the GY material is banished');checks++;
const without=await run([]);
console.log('without relic',without);
assert(!without.offeredGrave,'without the relic the GY is never offered');checks++;
console.log(`PASS Corpse Ritual banishes GY monsters as Ritual Material (${checks} checks)`);
