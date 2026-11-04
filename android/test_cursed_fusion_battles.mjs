// Cursed fusions' battle rules in the real core, with both players' moves scripted (2026-11-04):
// Gaia Plate's once-per-turn save, Giant-Killer's Cradle against Level 5+, Undying Legion's revive, Tyrant's Throne's second attack.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,B,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const KEYS=['gaia_plate','giant_killers_cradle','undying_legion','tyrants_throne'];
const scripts=JSON.parse(execFileSync(python,['-B','-c',`import sys,json;sys.path.insert(0,'.');import passives
print(json.dumps({k:passives.script({'curses':[],'artifacts':[k] if k else [],'challenge_level':0,'character':0}) for k in ${JSON.stringify(['',...KEYS])}}))`],{cwd:root,encoding:'utf8',maxBuffer:1<<26}));
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
const mine=(p=0)=>e.query(p,L.MZONE).filter(Boolean),named=(n,p=0)=>mine(p).find(c=>c.code===id(n));
const fill=(...names)=>Array.from({length:40},(_,i)=>id(names[i%names.length])),WALL=Array(40).fill(id('Mountain'));
const sets=m=>m.msets||m.monster_sets||m.sets||[];
// Each player's `plan(m)` answers its own prompts; anything else ends the phase or falls back to the core's default answer.
function play(key,main,enemy,turns,plan){
 e.start(main,enemy,8000,8000,5,5,[],[],scripts[key]);
 for(let i=0;i<4000&&e.pending&&!e.finished&&e.turn<=turns;i++){
  const m=e.pending,own=plan(m);
  if(own){e.respond(own);continue}
  if(m.type===M.SELECT_IDLECMD){e.respond({type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});continue}
  if(m.type===M.SELECT_BATTLECMD){e.respond({type:R.SELECT_BATTLECMD,action:m.to_m2?B.TO_M2:B.TO_EP,index:null});continue}
  e.respond(e.auto());
 }
 assert.deepEqual(e.errors,[],key+': no script errors');
}
const idle=(m,p,t)=>m.type===M.SELECT_IDLECMD&&m.player===p&&e.turn===t;
const summon=(m,n)=>{const k=m.summons.findIndex(c=>c.code===id(n));return k>=0?{type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:k}:null};
// The core's default answer cancels a losing attack at its target prompt, so the test picks the target.
const target=(m,t)=>m.type===M.SELECT_CARD&&m.player===0&&e.turn===t?{type:R.SELECT_CARD,indicies:[0]}:null;
const setCard=(m,n)=>{const k=sets(m).findIndex(c=>c.code===id(n));return k>=0?{type:R.SELECT_IDLECMD,action:I.SELECT_MONSTER_SET,index:k}:null};

// Gaia Plate: your Set Kuriboh (200 DEF, 1,700 once flipped) survives Gemini Elf's 1,900 ATK attack.
for(const key of ['','gaia_plate']){let done={},attacked=false;
 play(key,fill('Kuriboh'),fill('Gemini Elf'),2,m=>{
  if(idle(m,0,1)&&!done.set){done.set=true;const r=setCard(m,'Kuriboh');assert.ok(r,'Kuriboh can be Set: '+Object.keys(m));return r}
  if(idle(m,1,2)&&!done.summon){done.summon=true;return summon(m,'Gemini Elf')}
  if(idle(m,1,2)&&m.to_bp&&!attacked)return {type:R.SELECT_IDLECMD,action:I.TO_BP,index:null};
  if(m.type===M.SELECT_BATTLECMD&&m.player===1&&!attacked&&m.attacks.length){attacked=true;return {type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index:0}}
  return null});
 assert.ok(attacked,'Gemini Elf attacked the Set Kuriboh');
 if(key)assert.ok(named('Kuriboh'),'Gaia Plate: the Defense Position monster is not destroyed by battle');
 else assert.ok(!named('Kuriboh'),'without the relic Kuriboh is destroyed');
}

// Giant-Killer's Cradle: Kuriboh (1,300 ATK with the relic) attacks Summoned Skull (Level 6, 2,500 ATK) and survives; you take 1,200.
for(const key of ['','giant_killers_cradle']){let done={},attacked=false;
 play(key,fill('Kuriboh'),fill('Summoned Skull','Mystical Elf'),5,m=>{
  if(idle(m,0,1)&&!done.kuriboh){done.kuriboh=true;return summon(m,'Kuriboh')}
  if(idle(m,1,2)&&!done.elf){done.elf=true;return setCard(m,'Mystical Elf')}
  if(idle(m,1,4)&&!done.skull){done.skull=true;return summon(m,'Summoned Skull')}
  if(idle(m,0,5)&&m.to_bp&&!attacked)return {type:R.SELECT_IDLECMD,action:I.TO_BP,index:null};
  if(m.type===M.SELECT_BATTLECMD&&m.player===0&&e.turn===5&&!attacked&&m.attacks.length){attacked=true;return {type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index:0}}
  if(attacked&&!done.target&&target(m,5)){done.target=true;return target(m,5)}
  return null});
 assert.ok(named('Summoned Skull',1),'the opponent has Summoned Skull');
 assert.ok(attacked,'Kuriboh attacked Summoned Skull');
 if(key){assert.ok(named('Kuriboh'),"Giant-Killer's Cradle: Kuriboh is not destroyed by battle with a Level 6");assert.equal(e.lp[0],8000-1200,"Giant-Killer's Cradle: the battle damage still applies")}
 else assert.ok(!named('Kuriboh'),'without the relic Kuriboh is destroyed');
}

// Undying Legion: Skull Servant (1,500 ATK with the relic) attacks Gemini Elf (1,900), is destroyed, and returns at the end of the Battle Phase.
for(const key of ['','undying_legion']){let done={},attacked=false,after=null;
 play(key,fill('Skull Servant'),fill('Gemini Elf'),3,m=>{
  if(idle(m,0,1)&&!done.servant){done.servant=true;return summon(m,'Skull Servant')}
  if(idle(m,1,2)&&!done.elf){done.elf=true;return summon(m,'Gemini Elf')}
  if(idle(m,0,3)&&attacked&&after===null)after=mine().filter(c=>c.code===id('Skull Servant')).length;
  if(idle(m,0,3)&&m.to_bp&&!attacked)return {type:R.SELECT_IDLECMD,action:I.TO_BP,index:null};
  if(m.type===M.SELECT_BATTLECMD&&m.player===0&&e.turn===3&&!attacked&&m.attacks.length){attacked=true;return {type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index:0}}
  if(attacked&&!done.target&&target(m,3)){done.target=true;return target(m,3)}
  return null});
 assert.ok(attacked,'Skull Servant attacked Gemini Elf');
 assert.equal(e.lp[0],8000-(key?400:1600),'the attack lost');
 assert.equal(after,key?1:0,key?'Undying Legion: the Zombie is back in Main Phase 2':'without the relic it stays in the GY');
}

// Tyrant's Throne: a lone Mystical Elf (2,000 ATK) attacks directly twice in one Battle Phase.
for(const key of ['','tyrants_throne']){let done={},attacks=0;
 play(key,fill('Mystical Elf'),WALL,3,m=>{
  if(idle(m,0,1)&&!done.elf){done.elf=true;return summon(m,'Mystical Elf')}
  if(idle(m,0,3)&&m.to_bp&&!attacks)return {type:R.SELECT_IDLECMD,action:I.TO_BP,index:null};
  if(m.type===M.SELECT_BATTLECMD&&m.player===0&&e.turn===3&&m.attacks.length){attacks++;return {type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index:0}}
  return null});
 assert.equal(attacks,key?2:1,key?"Tyrant's Throne: two attacks":'without the relic one attack');
 assert.equal(e.lp[1],8000-(key?4000:800),"the attacks were direct");
}

console.log("PASS cursed fusion battles: Gaia Plate save, Giant-Killer's Cradle vs Level 6, Undying Legion revive, Tyrant's Throne second attack");
process.exit(0);
