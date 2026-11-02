// Fusion Fever and Ritual Scar in the real core: no Tribute Summons, and a Ritual count that carries across Duels.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const script=(artifacts,extra={})=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.script(json.loads(sys.argv[1])))",JSON.stringify({curses:[],artifacts,challenge_level:0,...extra})],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'},maxBuffer:1<<24});
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
let checks=0;const same=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const idle=(player=0)=>{for(let i=0;i<200&&!(e.pending?.type===M.SELECT_IDLECMD&&e.pending?.player===player);i++)e.respond(e.auto());return e.pending};
const settle=()=>{for(let i=0;i<30&&e.pending?.type!==M.SELECT_IDLECMD;i++)e.respond(e.auto())};
const OX=id('Battle Ox'),SKULL=id('Summoned Skull'),POT=id('Pot of Greed');
const foe=Array(40).fill(POT);
// Fusion Fever: with a Tribute available, Summoned Skull can't be Summoned or Set.
const board=relics=>{
 const mine=Array.from({length:40},(_,i)=>i%2?OX:SKULL),text=script(relics);
 for(let seed=1;seed<60;seed++){
  e.start(mine,foe,8000,8000,5,seed,[],[],text);const m=idle(0),k=m.summons.findIndex(c=>c.code===OX);
  if(k<0||!e.query(0,L.HAND).some(c=>c?.code===SKULL))continue;
  e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:k});settle();
  // Skip to your next turn, with the Ox still on the field.
  while(e.turn<3||e.pending?.type!==M.SELECT_IDLECMD||e.pending?.player!==0){const p=e.pending;if(p?.type===M.SELECT_IDLECMD&&p.player===0)e.respond({type:R.SELECT_IDLECMD,action:p.to_ep?I.TO_EP:I.TO_BP,index:null});else if(p?.type===M.SELECT_BATTLECMD&&p.player===0)e.respond({type:R.SELECT_BATTLECMD,action:p.to_ep?3:2,index:null});else e.respond(e.auto())}
  if(e.query(0,L.MZONE).some(c=>c?.code===OX)&&e.query(0,L.HAND).some(c=>c?.code===SKULL))return e.pending;
 }
 assert.fail('no usable opening hand');
};
let m=board([]);same(m.summons.some(c=>c.code===SKULL),true,'baseline: Skull can be Tribute Summoned');same(m.monster_sets.some(c=>c.code===SKULL),true,'baseline: Skull can be Tribute Set');
m=board(['cursed_fusion_fever']);same(m.summons.some(c=>c.code===SKULL),false,'Fusion Fever stops the Tribute Summon');same(m.monster_sets.some(c=>c.code===SKULL),false,'and the Tribute Set');same(m.summons.some(c=>c.code===OX),e.query(0,L.HAND).some(c=>c?.code===OX),'Level 4s are untouched');
// Ritual Scar: -500 at first and +100 per earlier Ritual Summon.
const ox=count=>{e.start(Array(40).fill(OX),foe,8000,8000,5,3,[],[],script(['cursed_ritual_scar'],{ritual_scar_count:count}));idle(0);e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:0});settle();return e.query(0,L.MZONE).find(Boolean).attack};
same(ox(0),1200,'1700 - 500');same(ox(5),1700,'five Ritual Summons break even');same(ox(12),2400,'and it keeps climbing');
// A Ritual Summon counts during the Duel and reaches the run through the events.
const RITUAL=id('Black Illusion Ritual'),RELINQUISHED=id('Relinquished'),IDOL=id('Thousand-Eyes Idol');
const deck=Array.from({length:40},(_,i)=>[RITUAL,RELINQUISHED,IDOL,OX][i%4]),text=script(['cursed_ritual_scar'],{ritual_scar_count:6});let done=false;
for(let seed=1;seed<120&&!done;seed++){
 e.start(deck,foe,8000,8000,5,seed,[],[],text);const p=idle(0),k=p.activates.findIndex(c=>c.code===RITUAL);if(k<0)continue;
 const before=e.query(0,L.HAND).filter(Boolean).some(c=>c.code===OX);e.events.length=0;e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k});settle();
 if(!e.query(0,L.MZONE).some(c=>c?.code===RELINQUISHED)||!before)continue;done=true;
 same(e.events.filter(x=>x.kind==='ritual_scar').length,1,'the Summon reaches the run');
 const q=e.pending,s=q.summons.findIndex(c=>c.code===OX);assert(s>=0,'Ox can be Normal Summoned');e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:s});settle();
 same(e.query(0,L.MZONE).find(c=>c?.code===OX).attack,1900,'7 Ritual Summons: 1700 - 500 + 700, updated mid-Duel');
}
assert(done,'a Ritual Summon happened');assert.deepEqual(e.errors,[],'no script errors');console.log(`PASS Fusion Fever and Ritual Scar: ${checks} checks`);process.exit(0);
