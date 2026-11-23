// Life Points cap (user, 2026-11-23): 10,000,000 LP at most; a player who reaches it is locked there for the rest of the
// Duel (no damage, no LP costs, nothing lowers it) and the LP bar shows ∞. Below the cap nothing changes.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I} from './web/duel.js';
import {LP_CAP,lpText} from './web/lp-cap.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');let checks=0;
const ok=(v,why)=>{assert.ok(v,why);checks++};const same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
const OX=id('Battle Ox'),POT=id('Pot of Greed'),OOKAZI=id('Ookazi'),KETO=id('Dian Keto the Cure Master'),TOON=id('Toon World');
const idle=()=>{for(let i=0;i<60&&(e.pending?.type!==M.SELECT_IDLECMD||e.pending?.player!==0);i++)e.respond(e.auto());return e.pending};
const activate=code=>{const m=idle(),k=m.activates.findIndex(x=>x.code===code);if(k<0)return false;e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k});idle();return true};
// The opponent's cards, played whenever it can, until its first turn is over.
const theirs=(card,lp)=>{e.start(Array(40).fill(POT),Array(40).fill(card),lp,8000,5,3,[],[],'');for(let i=0;i<260&&e.turn<3&&e.pending&&!e.finished;i++){const m=e.pending,k=m.type===M.SELECT_IDLECMD&&m.player===1?m.activates.findIndex(x=>x.code===card):-1;e.respond(k>=0?{type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k}:e.auto())}return [...e.lp]};

same(lpText(LP_CAP),'∞','the cap shows as ∞');same(lpText(LP_CAP-1),String(LP_CAP-1),'just below it shows the number');same(lpText(8000),'8000','ordinary totals unchanged');
same(theirs(OOKAZI,LP_CAP)[0],LP_CAP,'at the cap, Ookazi deals no damage');
ok(theirs(OOKAZI,LP_CAP-1000)[0]<LP_CAP-1000,'below the cap, Ookazi still deals damage');
ok(theirs(OX,9000)[0]<9000,'control: below the cap the direct attack lands');
same(theirs(OX,LP_CAP)[0],LP_CAP,'at the cap, direct attacks deal no damage');
same(theirs(OX,LP_CAP*3)[0],LP_CAP,'a total above the cap is brought down to it, then locked');
e.start(Array(40).fill(KETO),Array(40).fill(OX),LP_CAP-500,8000,5,3,[],[],'');ok(activate(KETO),'Dian Keto can be activated');same(e.lp[0],LP_CAP,'healing past the cap stops at it');
e.start(Array(40).fill(TOON),Array(40).fill(OX),LP_CAP,8000,5,3,[],[],'');ok(activate(TOON),'Toon World can be activated at the cap');same(e.lp[0],LP_CAP,'its 1000 LP cost takes nothing');
e.start(Array(40).fill(TOON),Array(40).fill(OX),9000,8000,5,3,[],[],'');ok(activate(TOON),'Toon World below the cap');same(e.lp[0],8000,'below the cap the cost is paid');
console.log(`PASS 10,000,000 LP cap locks LP and shows ∞ (${checks} checks)`);
