import fs from 'node:fs';
import assert from 'node:assert/strict';
import {MobileDuel} from '../android/web/duel.js';
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const content=read('../android/web/content.json');
const fixtures=read('./fixtures/wct2004-regressions.json');
function shuffle(cards,seed){const a=[...cards];let s=seed>>>0;for(let i=a.length-1;i>0;i--){s=(Math.imul(s,1664525)+1013904223)>>>0;const j=Math.floor(s/4294967296*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const e=await new MobileDuel(content.cards).init([read('../android/web/engine-data.json'),read('../android/web/scripts.json')]);
for(const row of fixtures){
 const {seed,seat}=row,a=shuffle(row.main,seed),b=shuffle(row.enemyMain,seed+731);
 try{
  e.start(seat===0?a:b,seat===0?b:a,8000,8000,5,seed,seat===0?row.extra:row.enemyExtra,seat===0?row.enemyExtra:row.extra);
  let steps=0;while(!e.finished&&e.pending&&steps++<5000&&e.turn<160)e.respond(e.auto());
  const label=`candidate ${row.candidate}, tier ${row.tier}, opponent ${row.opponent}, seed ${seed}, seat ${seat}`;
  assert.ok(e.finished,'Unfinished: '+label);assert.deepEqual(e.errors,[],'Engine warnings: '+label);
 }finally{e.destroy();}
}
console.log(`PASS ${fixtures.length} formerly stalled/warning-producing duels finish without engine warnings.`);
