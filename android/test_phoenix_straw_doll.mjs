// Discord 2026-10-29 (Kzulu): Phoenix Feather went missing in a run Straw Doll saved. In the real core, damage Straw
// Doll prevents never triggers Phoenix Feather; Phoenix fires only when LP actually reach 0, and only then is it spent.
import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,B,L} from './web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8'));
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const script=execFileSync(python,['-B','-c',"import sys;sys.path.insert(0,'.');import passives;print(passives.script({'curses':[],'artifacts':['straw_doll','phoenix_rebirth']}))"],{cwd:root,maxBuffer:1<<26}).toString();
const meta=json('android/web/content.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const duel=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([json('android/web/engine-data.json'),json('android/web/scripts.json')]);
// You hold only Blue-Eyes (unsummonable without tributes) at 500 LP; the CPU Normal Summons Battle Ox and attacks directly.
let s=duel.start(Array(40).fill(id('Blue-Eyes White Dragon')),Array(40).fill(id('Battle Ox')),500,8000,5,7,[],[],script);
const timeline=[];let lastLP=500,phoenix=0;
for(let i=0;i<3000&&!s.finished&&duel.turn<=12;i++){
 const m=duel.pending;if(!m)break;
 // You never act: end your Main Phase at once.
 const r=m.player===0&&m.type===M.SELECT_IDLECMD?{type:R.SELECT_IDLECMD,action:m.to_ep?I.SELECT_TO_EP??7:I.SELECT_TO_BP??6,index:null}:m.player===0&&m.type===M.SELECT_BATTLECMD?{type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null}:duel.auto(m);
 const before=duel.events.length;s=duel.respond(r);
 for(const ev of duel.events.slice(before))if(ev.kind==='relic_used'&&ev.relic==='phoenix_rebirth'){phoenix++;timeline.push(`turn ${s.turn}: Phoenix Feather, LP ${s.lp[0]}`)}
 if(s.lp[0]!==lastLP){timeline.push(`turn ${s.turn}: LP ${lastLP} -> ${s.lp[0]}`);lastLP=s.lp[0]}
}
const attacks=duel.query(1,L.MZONE).filter(Boolean).length;
console.log(timeline.join('\n'));
// Turn 2: one Battle Ox, its damage prevented by Straw Doll. Phoenix must not have fired.
assert.ok(!timeline.some(x=>/^turn 2: Phoenix/.test(x)),'Straw Doll prevented the only attack; Phoenix Feather must not fire');
assert.ok(!timeline.some(x=>/^turn 2: LP/.test(x)),'Straw Doll prevents the first battle damage');
// Once the CPU has two attackers, the second hit reaches 0 LP: Phoenix fires exactly once and you are at 1000 LP.
assert.ok(attacks>=2,'the CPU built up two attackers');
assert.equal(phoenix,1,'Phoenix Feather fires once, when LP actually reach 0');
assert.ok(timeline.some(x=>/Phoenix Feather, LP 1000/.test(x)));
console.log('PASS Straw Doll-prevented damage never triggers Phoenix Feather; Phoenix fires once at 0 LP');
