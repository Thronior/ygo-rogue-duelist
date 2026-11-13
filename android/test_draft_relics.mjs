// Runs every Draft Duels relic script (tools/test_draft_relics.py writes them) in a short PvP duel on both seats.
import fs from 'node:fs';import assert from 'node:assert/strict';import {TagDuel,flipPerspective} from './web/tag-duel.js';import {M,R,I} from './web/duel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data'),scripts=read('scripts'),cases=JSON.parse(fs.readFileSync('temp/draft-relic-scripts.json','utf8'));
const id=name=>meta.cards.find(c=>c.name===name).id,deck={main:[...Array(20).fill(id('Battle Ox')),...Array(10).fill(id('Mystical Elf')),...Array(10).fill(id('Pot of Greed'))],extra:[]};
const e=await new TagDuel(meta.cards).init([data,scripts]);const failed=[];
try{for(const c of cases){
 e.startTag({mode:'pvp',teams:[[deck],[deck]],lp:8000,enemyLP:8000,seed:11,passives:c.passives,draw:c.draw,enemyDraw:c.enemyDraw,rules:2});
 for(let i=0;i<200&&e.turn<6&&!e.finished;i++){const seat=e.respondingSeat,m=e.pending;if(seat===null||!m)break;const r=m.type===M.SELECT_IDLECMD?{type:R.SELECT_IDLECMD,action:I.TO_EP,index:null}:e.auto(m);e.respondFor(seat,e.responseNumber,seat===1?flipPerspective(r):r);}
 if(e.errors.length)failed.push(c.relics.join('+')+': '+String(e.errors[0]).slice(0,160));e.destroy();
}}finally{e.destroy?.()}
assert.deepEqual(failed,[],failed.join('\n'));console.log(`PASS ${cases.length} draft relic cases ran without script errors`);
