// Reversed Remedy with Granadora (Discord, VellianCrowler, 2026-11-21): the summon gain becomes damage and the
// 2000 self-damage when it is destroyed becomes a gain, also with Effect Reverser at Level 2+ (Level 6 runs).
import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,B,L} from './web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^ï»¿/,''));
const py=code=>execFileSync(root+'python/python.exe',['-B','-c','import sys;sys.path.insert(0,".")\n'+code],{cwd:root}).toString();
const script=(a,c=[],lvl=0)=>py('import passives;print(passives.script('+JSON.stringify({curses:c,artifacts:a,challenge_level:lvl})+'))');
const cards=json('data/cards.json'),engine=[json('android/web/engine-data.json'),json('android/web/scripts.json')];
const GRAN=13944422,WOLF=69247929;
const cases=[[[],0,true],[['effect_reverser'],2,true],[['effect_reverser'],6,true],[['effect_reverser'],0,false]];
for(const [curses,lvl,reversed] of cases){
 const duel=await new MobileDuel(cards).init(engine);const changes=[];let last=8000;
 let state=duel.start(Array(40).fill(GRAN),Array(40).fill(WOLF),8000,8000,5,7,[],[],script(['cursed_reversed_remedy'],curses,lvl),0);
 for(let g=0;g<4000&&!state.finished&&duel.turn<=4;g++){
  const m=duel.pending;let r=duel.auto();
  if(m.player===0&&m.type===M.SELECT_IDLECMD&&m.summons.length&&!duel.query(0,L.MZONE).some(Boolean))r={type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:0};
  state=duel.respond(r);if(duel.lp[0]!==last){changes.push(duel.lp[0]-last);last=duel.lp[0]}
 }
 duel.destroy();
 const tag=JSON.stringify([curses,lvl]);
 if(reversed){assert.ok(changes.includes(-1000),tag+' summon gain becomes 1000 damage: '+changes);assert.ok(changes.includes(1900),tag+' the 2000 self-damage on destruction becomes a gain (100 battle damage, +2000): '+changes)}
 else{assert.ok(changes.includes(1000)&&changes.includes(-2100),tag+' Level 0/1 Effect Reverser cancels Remedy: back to normal: '+changes)}
}
console.log('PASS Reversed Remedy reverses Granadora both ways (alone and with Effect Reverser Level 2+)');
