// Discord, 2026-11-19: Name Changer's "Dark Magician" pick makes your other monsters "Dark Magician" monsters, but
// Magician's Bond and Master and Apprentice only knew the real cards' codes. They now also read the archetype (0x10a2).
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,B,L} from './web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^\uFEFF/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const relicScript=run=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.script(json.loads(sys.argv[1]),telemetry=False))",JSON.stringify({curses:[],cursed_artifacts:[],challenge_level:0,...run})],{cwd:root,encoding:'utf8',maxBuffer:1<<26});
let checks=0;const ok=(v,why)=>{assert(v,why);checks++};
const OX=id('Battle Ox'),DMA=id('Dark Magic Attack');
const fill=(...codes)=>Array.from({length:40},(_,n)=>codes[n%codes.length]);

// Magician's Bond: Normal Summon a Battle Ox; with Name Changer on "Dark Magician" the relic offers its search.
async function bond(run){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);let asked=false,summoned=false;
 try{let s=e.start(fill(OX,DMA),fill(OX),8000,8000,5,7,[],[],relicScript(run));
  for(let i=0;i<2000&&!s.finished&&e.turn<=1;i++){const m=e.pending;if(!m)break;let a=null;
   if(m.player===0){
    if(m.type===M.SELECT_IDLECMD){const at=(m.summons||[]).findIndex(c=>c.code===OX);a=!summoned&&at>=0?(summoned=true,{type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:at}):{type:R.SELECT_IDLECMD,action:I.TO_EP,index:null}}
    else if(m.type===M.SELECT_YESNO){asked=true;a={type:R.SELECT_YESNO,yes:true}}
    else if(m.type===M.SELECT_BATTLECMD)a={type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null};}
   s=e.respond(a||e.auto());}
  assert.deepEqual(e.errors||[],[],'no script errors');
  return {asked,inHand:e.query(0,L.HAND).filter(c=>c?.code===DMA).length};
 }finally{e.destroy()}
}
const renamed=await bond({artifacts:['magicians_bond','name_changer'],name_changes:[0x10a2]});
ok(renamed.asked,'with Name Changer on "Dark Magician", summoning Battle Ox offers Magician\'s Bond');
const plain=await bond({artifacts:['magicians_bond']});
ok(!plain.asked,'without Name Changer a Battle Ox is not a "Dark Magician" monster');
const other=await bond({artifacts:['magicians_bond','name_changer'],name_changes:[0x7]});
ok(!other.asked,'Name Changer on another archetype does not count');

// Master and Apprentice reads the same archetype, for the destroyed monster and the one it summons.
const mapp=fs.readFileSync(root+'approved_relic_effects.py','utf8');
ok(/IsPreviousSetCard\(\{DARK_MAGICIAN_SET\}\)/.test(mapp)&&/or c:IsSetCard\(\{DARK_MAGICIAN_SET\}\)\) and c:IsCanBeSpecialSummoned/.test(mapp),'Master and Apprentice checks the archetype for both monsters');
console.log(`PASS Name Changer "Dark Magician" counts for Magician's Bond and Master and Apprentice (${checks} checks)`);
