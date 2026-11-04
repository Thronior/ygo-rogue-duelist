// Stand Tall in the real core (2026-11-04 report): with two copies (Magic Mirror copying it, or bought twice), each
// copy read the other's value, which read the first again, until the core's limit. Every stat check repeated this and
// the duel slowed to a crawl. Token Resonance reads other bonuses the same way and looped with Stand Tall on Tokens.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const script=run=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.script(json.loads(sys.argv[1])))",JSON.stringify({curses:[],challenge_level:0,character:0,...run})],{cwd:root,encoding:'utf8'});
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
const ELF=id('Gemini Elf'),GOAT=id('Scapegoat');
// Summons Gemini Elf (1900/900) on turn 1, then reads its stats; Scapegoat is activated when offered.
function play(run,deck){
 const t0=performance.now();e.start(deck,Array(40).fill(id('Mountain')),8000,8000,5,11,[],[],script(run));
 for(let i=0;i<300&&e.pending&&!e.finished&&e.turn<=1;i++){const m=e.pending;
  if(m.type===M.SELECT_IDLECMD&&m.player===0){
   const a=m.activates.findIndex(c=>c.code===GOAT);if(a>=0){e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:a});continue}
   const s=m.summons.findIndex(c=>c.code===ELF);if(s>=0){e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:s});continue}
   e.respond({type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});continue}
  e.respond(e.auto())}
 const cards=e.query(0,L.MZONE).filter(Boolean);return {ms:Math.round(performance.now()-t0),cards,errors:e.errors.slice(0,2)};
}
const elves=Array(40).fill(ELF);
// Frailty is a curse: -200 ATK on your monsters; Stand Tall halves it to -100.
const one=play({artifacts:['stand_tall'],curses:['frailty']},elves);
const mirrored=play({artifacts:['stand_tall','magic_mirror'],mirror_copy:'stand_tall',curses:['frailty']},elves);
const twice=play({artifacts:['stand_tall','stand_tall'],curses:['frailty']},elves);
const tokens=play({artifacts:['stand_tall','token_resonance'],curses:['frailty']},Array.from({length:40},(_,i)=>i%2?GOAT:ELF));
const atk=r=>r.cards.find(c=>c.code===ELF)?.attack;
console.log(JSON.stringify({one:[one.ms,atk(one)],mirrored:[mirrored.ms,atk(mirrored)],twice:[twice.ms,atk(twice)],tokens:[tokens.ms,tokens.cards.map(c=>c.attack)]}));
for(const [name,r] of Object.entries({one,mirrored,twice,tokens}))assert.deepEqual(r.errors,[],name+': no script errors');
assert.equal(atk(one),1800,'one Stand Tall halves Frailty');
assert.equal(atk(mirrored),1800,'a mirrored copy does not stack or loop');
assert.equal(atk(twice),1800,'a second copy does not stack or loop');
assert(mirrored.ms<one.ms*5+2000&&twice.ms<one.ms*5+2000,'two copies stay as fast as one');
assert(tokens.cards.filter(c=>c.code!==ELF).length>=4&&tokens.ms<one.ms*5+2000,'Token Resonance and Stand Tall together stay fast');
console.log('PASS Stand Tall: no recursion with Magic Mirror, two copies or Token Resonance');
process.exit(0);
