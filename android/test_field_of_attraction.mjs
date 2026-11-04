// Field of Attraction (2026-11-04, Paradox Brothers' Magnet Warriors): Normal Summoning a Magnet Warrior adds a Magnet
// Warrior with a different name from the Deck to the hand. Valkyrion (a Magna Warrior) is never added.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const script=artifacts=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.script(json.loads(sys.argv[1])))",JSON.stringify({curses:[],artifacts,challenge_level:0,character:21})],{cwd:root,encoding:'utf8'});
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
const ALPHA=id('Alpha The Magnet Warrior'),BETA=id('Beta The Magnet Warrior'),GAMMA=id('Gamma the Magnet Warrior'),VALK=id('Valkyrion the Magna Warrior'),ROCK=id('Giant Soldier of Stone');
// Opening hand is the last five cards: one Alpha and four Rocks; the rest of the Deck holds Beta, Gamma and Valkyrion.
function summonAlpha(artifacts,rest){
 const deck=[...rest,ROCK,ROCK,ROCK,ROCK,ALPHA];e.start(deck,Array(40).fill(id('Mountain')),8000,8000,5,7,[],[],script(artifacts));
 let summoned=false,picked=null,offered=null;
 for(let i=0;i<200&&e.pending&&!e.finished&&e.turn<=1;i++){const m=e.pending;
  if(m.player===0&&m.type===M.SELECT_IDLECMD){if(summoned)break;const s=m.summons.findIndex(c=>c.code===ALPHA);if(s<0)break;summoned=true;e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:s});continue}
  if(m.player===0&&m.type===M.SELECT_CARD){offered=m.selects.map(c=>c.code);picked=offered[0];e.respond({type:R.SELECT_CARD,indicies:[0]});continue}
  e.respond(e.auto())}
 return {hand:e.query(0,L.HAND).filter(Boolean).map(c=>c.code),offered,picked,errors:e.errors.slice(0,2)};
}
const rest=Array.from({length:35},(_,i)=>[BETA,GAMMA,VALK,ROCK,ALPHA][i%5]);
const on=summonAlpha(['field_of_attraction'],rest),off=summonAlpha([],rest);
assert.deepEqual(on.errors,[],'no script errors');
assert(on.offered,'a Magnet Warrior is offered after Normal Summoning Alpha');
assert.deepEqual([...new Set(on.offered)].sort(),[BETA,GAMMA].sort(),'only Magnet Warriors with a different name: Beta and Gamma, never Alpha or Valkyrion');
assert(on.hand.includes(on.picked),'the chosen card is added to the hand');
assert.equal(off.offered,null,'without the relic nothing is offered');
console.log('PASS Field of Attraction: Normal Summon Alpha adds Beta or Gamma, never Alpha or Valkyrion');
process.exit(0);
