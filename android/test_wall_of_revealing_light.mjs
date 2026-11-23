// Wall of Revealing Light with huge LP (Discord, 2026-11-17): the core's number prompt holds at most 255 choices, so
// 999,999 LP showed 231 amounts and higher LP none (stuck). Our script asks for a range first above 200 amounts.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^\uFEFF/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const WALL=id('Wall of Revealing Light'),OX=id('Battle Ox');
async function pay(lp,want){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 e.start(Array(40).fill(WALL),Array(40).fill(OX),lp,8000,5,0,[],[],'');
 const prompts=[];let set=false,before=null,done=false;
 for(let i=0;i<400&&!e.finished;i++){
  const m=e.pending;if(!m)break;
  if(m.player===0&&m.type===M.SELECT_IDLECMD){
   if(!set&&m.spell_sets?.length){set=true;e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SPELL_SET,index:0});continue}
   const a=(m.activates||[]).findIndex(c=>c.code===WALL);if(a>=0&&set&&e.turn>=3&&before===null){before=e.lp[0];e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:a});continue}
   e.respond(e.auto());continue;
  }
  if(m.player===0&&m.type===M.ANNOUNCE_NUMBER){
   const values=m.options.map(Number);prompts.push(values.length);
   assert(values.length>0&&values.length<=200,`prompt ${prompts.length} lists ${values.length} amounts`);
   // Pick the largest choice not above `want`.
   let k=0;for(let j=0;j<values.length;j++)if(values[j]<=want)k=j;
   e.respond({type:R.ANNOUNCE_NUMBER,value:k});if(values[k]>=1000&&prompts.length&&(values.length<2||values[1]-values[0]===1000)){done=true;break}continue;
  }
  e.respond(e.auto());
 }
 assert(done,'Wall was activated and its amount chosen');
 return {paid:before-e.lp[0],prompts};
}
// The top case is just below the 10,000,000 LP cap (lp-cap.js, 2026-11-23): at the cap LP is locked and costs are 0.
for(const [lp,want] of [[8000,3000],[999999,523000],[1500000,1234000],[9999999,9990000]]){
 const r=await pay(lp,want);
 assert.equal(r.paid,want,`${lp} LP: paid ${r.paid}, wanted ${want} (prompts ${r.prompts})`);
 console.log(lp,'LP: paid',r.paid,'in',r.prompts.length,'prompt(s):',r.prompts.join('+'));
}
console.log('PASS Wall of Revealing Light pays any multiple of 1000 with at most 200 choices per prompt');
