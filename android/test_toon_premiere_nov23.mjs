// Toon Premiere (user, 2026-11-23, from a Discord suggestion for Pegasus' Toons): at the start of each Duel a "Toon World"
// from your Deck is placed face-up in your Spell & Trap Zone, so its 1000 LP is never paid, and Toon monsters work with it.
// Without one in the Deck nothing happens. Also: the four later Toon cards added to Pegasus' pack load and have scripts.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const relic=a=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.multiplayer_script(json.loads(sys.argv[1]),0))",JSON.stringify({curses:[],artifacts:a,challenge_level:0})],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}}).trim();
let checks=0;
for(const name of ['Toon Dark Magician','Toon Briefcase','Toon Mask','Comic Hand']){const c=id(name);assert(data[c]&&scripts[`c${c}.lua`],`${name} has data and a script`);checks++}
const TW=id('Toon World'),ELF=id('Toon Gemini Elf'),W=id('Waboku');
async function duel(deck,artifacts){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 let s=e.start(deck,Array(40).fill(W),8000,8000,5,11,[],[],artifacts.length?relic(artifacts):'');
 for(let i=0;i<50&&!s.finished;i++){const m=e.pending;if(!m||m.player===0&&m.type===M.SELECT_IDLECMD)break;s=e.respond(e.auto())}
 const out={field:e.query(0,L.SZONE).filter(c=>c&&c.code===TW&&(c.position&5)).length,lp:e.lp[0],deckWorlds:e.query(0,L.DECK).filter(c=>c&&c.code===TW).length+e.query(0,L.HAND).filter(c=>c&&c.code===TW).length,
  summons:(e.pending?.summons||[]).concat(e.pending?.spsummons||[]).map(c=>c.code)};e.destroy();return out;
}
const deck=[TW,...Array(39).fill(ELF)];
const on=await duel(deck,['toon_premiere']);
assert.equal(on.field,1,'Toon World starts face-up');assert.equal(on.lp,8000,'no LP paid');assert.equal(on.deckWorlds,0,'it came from the Deck');checks+=3;
const off=await duel(deck,[]);assert.equal(off.field,0,'without the relic Toon World is not on the field');checks++;
const none=await duel(Array(40).fill(ELF),['toon_premiere']);assert.equal(none.field,0,'no Toon World in the Deck: nothing');assert.equal(none.lp,8000);checks+=2;
console.log(`PASS Toon Premiere places Toon World from the Deck for free; the 4 new Toon cards load (${checks} checks)`);
