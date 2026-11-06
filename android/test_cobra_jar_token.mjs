// Cobra Jar's FLIP must Special Summon a Poisonous Snake Token, both when attacked face-down and when Flip Summoned
// (Discord 2026-11-06, meruem).
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),dataDir=process.env.COBRA_DATA||'android/web/',data=json(dataDir+'engine-data.json'),scripts=json(dataDir+(fs.existsSync(root+dataDir+'scripts.json')?'scripts.json':'scripts-0.json')),id=n=>meta.cards.find(c=>c.name===n).id;
const JAR=id('Cobra Jar'),TOKEN=86801872,OX=id('Battle Ox');
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const script=execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.script(json.loads(sys.argv[1])))",JSON.stringify({curses:[],artifacts:[],challenge_level:0})],{cwd:root,encoding:'utf8'});
let checks=0;
// flip: 'attacked' lets the CPU attack the Set jar; 'summon' Flip Summons it on the player's next turn.
async function run(flip){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 let s=e.start(Array(40).fill(JAR),Array(40).fill(OX),8000,8000,5,3,[],[],script),set=false,token=false,flipped=false,log=[];
 for(let i=0;i<4000&&!s.finished&&e.turn<=8&&!token;i++){const m=e.pending;if(!m)break;
  if(m.player===0&&m.type===M.SELECT_IDLECMD){
   const own=e.query(0,L.MZONE).filter(Boolean);
   if(!set){const k=m.monster_sets.findIndex(c=>c.code===JAR);if(k>=0){set=true;s=e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_MONSTER_SET,index:k});continue}}
   if(flip==='summon'){const k=(m.repositions||m.pos_changes||[]).findIndex(c=>c.code===JAR);if(k>=0&&!flipped){flipped=true;s=e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_POS_CHANGE,index:k});continue}}
   s=e.respond({type:R.SELECT_IDLECMD,action:m.to_bp?I.TO_BP:I.TO_EP,index:null});continue}
  if(m.player===0&&m.type===M.SELECT_BATTLECMD){s=e.respond({type:R.SELECT_BATTLECMD,action:m.to_m2?2:3,index:null});continue}
  // The opponent never attacks in the Flip Summon run, so only our own flip can trigger the jar.
  if(flip==='summon'&&m.player===1&&m.type===M.SELECT_BATTLECMD){s=e.respond({type:R.SELECT_BATTLECMD,action:m.to_m2?2:3,index:null});continue}
  if(m.player===0&&[M.SELECT_EFFECTYN,M.SELECT_YESNO].includes(m.type))log.push('asked '+m.type);
  s=e.respond(e.auto());
  token=e.query(0,L.MZONE).some(c=>c&&c.code===TOKEN)}
 const jar=e.query(0,L.MZONE).find(c=>c&&c.code===JAR);
 e.destroy();return {set,flipped,token,jarFaceUp:jar?jar.position&5:null,turn:e.turn,log};
}
const attacked=await run('attacked');console.log('attacked',attacked);
assert(attacked.token,'attacking the Set Cobra Jar summons a Poisonous Snake Token');checks++;
const summoned=await run('summon');console.log('flip summon',summoned);
assert(summoned.token,'Flip Summoning Cobra Jar summons a Poisonous Snake Token');checks++;
console.log(`PASS Cobra Jar summons its Poisonous Snake Token (${checks} checks)`);
