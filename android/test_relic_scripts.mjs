// Every relic's script in the real core: a short duel with each relic must raise no Lua errors (2026-11-03).
// Fusion Time called a function that doesn't exist for a year and nothing noticed, because the error only showed when
// its summon was used. So player 0 tries every Special Summon and activation it is offered, not just the CPU's pick.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),known=new Set(meta.cards.map(c=>c.id)),id=n=>meta.cards.find(c=>c.name===n).id;
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const only=process.argv[2]?process.argv[2].split(','):null;
const scripts=JSON.parse(execFileSync(python,['-B','-c',`import sys,json;sys.path.insert(0,'.');import content,passives
keys=[k for k in content.ARTIFACTS if k not in content.RETIRED_ARTIFACTS]
print(json.dumps({k:passives.script({'curses':[],'artifacts':[k],'challenge_level':0,'character':0}) for k in keys}))`],{cwd:root,encoding:'utf8',maxBuffer:1<<28}));
const ydk=f=>{let z='main';const o={main:[],extra:[]};for(const l of fs.readFileSync(root+'data/decks/'+f+'.ydk','utf8').split(/\r?\n/)){if(l.startsWith('#extra'))z='extra';else if(l.startsWith('#main'))z='main';else if(l.startsWith('!side'))z='side';else if(/^\d+$/.test(l.trim())&&z!=='side'&&known.has(+l))o[z].push(+l)}return o};
// A mixed duel against a real deck: spells, traps, battles and Fusion materials. Then a quiet one against a deck of
// Field Spells, where King Dragun's two Level 4 materials reach the field, so Extra Deck summon relics get used too.
const mine=ydk('tea-gardner-tier-3'),theirs=ydk('rex-raptor-tier-3'),LORD=id('Lord of D.'),RAG=id('Divine Dragon Ragnarok');
const setups=[
 {main:[...mine.main.slice(0,30),...['Dark Magician','Buster Blader','Dark Magician','Buster Blader','Polymerization','Pot of Greed','Mystical Space Typhoon','Raigeki','Mirror Force','Monster Reborn'].map(id)],extra:[...mine.extra,id('Dark Paladin')],enemy:theirs.main,enemyExtra:theirs.extra},
 {main:Array.from({length:40},(_,i)=>i%2?LORD:RAG),extra:[id('King Dragun')],enemy:Array(40).fill(id('Mountain')),enemyExtra:[],quiet:true}];
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
const failures=[];let duels=0;
for(const [key,script] of Object.entries(scripts)){
 if(only&&!only.includes(key))continue;
 for(const setup of setups){
 e.start(setup.main,setup.enemy,8000,8000,5,7,setup.extra,setup.enemyExtra,script);duels++;const tried=new Set();
 for(let i=0;i<500&&e.turn<=6&&e.pending&&!e.finished&&!e.errors.length;i++){
  const m=e.pending;
  if(m.type===M.SELECT_IDLECMD&&m.player===0){
   const options=[...m.special_summons.map((c,index)=>[I.SELECT_SPECIAL_SUMMON,index,c]),...m.activates.map((c,index)=>[I.SELECT_ACTIVATE,index,c])];
   const next=options.find(([action,,c])=>!tried.has(action+':'+c.code+':'+e.turn));
   if(next){tried.add(next[0]+':'+next[2].code+':'+e.turn);e.respond({type:R.SELECT_IDLECMD,action:next[0],index:next[1]});continue}
   // In the quiet duel, summon a material every turn instead of letting the CPU logic hold it back.
   const s=setup.quiet?m.summons.findIndex(c=>c.code===LORD||c.code===RAG):-1;
   if(s>=0){e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:s});continue}
  }
  e.respond(e.auto());
 }
 if(process.env.RELIC_DEBUG)console.log(key,setup.quiet?'quiet':'mixed','turn',e.turn,'tried',[...tried].length);
 if(e.errors.length){failures.push(`${key}: ${e.errors[0].slice(0,200)}`);break}
 }
}
assert.deepEqual(failures,[],'relic scripts raised Lua errors');
console.log(`PASS ${Object.keys(scripts).filter(k=>!only||only.includes(k)).length} relic scripts, ${duels} real duels, no Lua errors`);
process.exit(0);
