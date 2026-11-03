// Open Wound in the real core: battle damage you take is multiplied once; effect damage and damage you deal are not.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L,B} from './web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const script=(curses,level,artifacts=[])=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.script(json.loads(sys.argv[1])))",JSON.stringify({curses,artifacts,challenge_level:level,character:0})],{cwd:root,encoding:'utf8'});
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
let checks=0;const same=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const OX=id('Battle Ox'),VORSE=id('Vorse Raider'),OOKAZI=id('Ookazi');
const mine=()=>e.pending?.type===M.SELECT_IDLECMD&&e.pending?.player===0;
const until=test=>{for(let i=0;i<400&&!test();i++)e.respond(e.auto())};
const end=()=>e.respond({type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});
// Taken: the CPU's Vorse Raider (1900) attacks an empty field directly on turn 2.
const taken=(curses,level)=>{
 e.start(Array(40).fill(OX),Array(40).fill(VORSE),8000,8000,5,3,[],[],script(curses,level));until(mine);end();
 const hits=[];for(let i=0;i<300&&e.turn<3&&e.pending;i++){const before=e.lp[0];e.respond(e.auto());if(e.lp[0]<before)hits.push(before-e.lp[0])}
 return hits;
};
const base=taken([],0);same(base,[1900],'baseline: one direct attack');
same(taken(['exposed'],0),[2850],'Open Wound: 1900 x 1.5, once');
same(taken(['exposed'],2),[3800],'Challenge Level 2+: 1900 x 2');
same(taken(['exposed','exposed'],0),[4275],'two copies: 1900 x 2.25, rounded down');
// Dealt: our attack is unchanged.
{
 e.start(Array(40).fill(OX),Array(40).fill(id('Giant Soldier of Stone')),8000,8000,5,3,[],[],script(['exposed'],0));until(mine);end();until(()=>e.turn>=3&&mine());
 let m=e.pending;e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:m.summons.findIndex(c=>c.code===OX)});until(mine);
 e.query(1,L.MZONE).some(Boolean);e.respond({type:R.SELECT_IDLECMD,action:I.TO_BP,index:null});until(()=>e.pending?.type===M.SELECT_BATTLECMD&&e.pending?.player===0);
 const lp=e.lp[1];e.respond({type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index:0});
 for(let i=0;i<30&&e.lp[1]===lp;i++){if(!e.pending)break;e.respond(e.auto())}
 assert((lp-e.lp[1])%100===0&&[0,1700,400].includes(lp-e.lp[1]),'unmultiplied: '+(lp-e.lp[1]));checks++;
}
// Effect damage: the CPU's Ookazi still deals 800.
{
 const burn=curses=>{for(let seed=1;seed<60;seed++){
  e.start(Array(40).fill(OX),Array(40).fill(OOKAZI),8000,8000,5,seed,[],[],script(curses,0));until(mine);end();
  const hits=[];for(let i=0;i<200&&e.turn<3&&e.pending;i++){const before=e.lp[0];e.respond(e.auto());if(e.lp[0]<before)hits.push(before-e.lp[0])}
  if(hits.length)return hits[0];
 }assert.fail('the CPU never burned')};
 same(burn(['exposed']),800,'Open Wound leaves effect damage alone');
}
assert.deepEqual(e.errors,[],'no script errors');console.log(`PASS Open Wound: ${checks} checks`);process.exit(0);
