// Chain Sometimes asks ATK/DEF-changing Traps that work in the Damage Step there, not at the attack declaration, so a
// face-down monster flipped by the attack can be chosen (Discord 2026-11-05: Castle Walls).
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,L}=await import('./web/duel.js');
const {chainWindowAllowed}=await import('./web/duel-presentation.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const byId=new Map(meta.cards.map(c=>[c.id,c])),WALLS=id('Castle Walls'),WABOKU=id('Waboku'),TRAP_HOLE=id('Trap Hole');
let checks=0;const same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};
const ATTACK=0x1000,DAMAGE_STEP=0x2000;
const ask=(codes,timing)=>({type:M.SELECT_CHAIN,player:0,forced:false,spe_count:4,hint_timing:timing,hint_timing_other:timing,selects:codes.map(code=>({code,location:L.SZONE}))});
const ctx={turnPlayer:1,phase:0x10,attackers:1,card:code=>byId.get(code),script:code=>scripts[`c${code}.lua`]};
same(chainWindowAllowed(ask([WALLS],ATTACK),'sometimes',[],ctx),false,'Castle Walls waits past the attack declaration');
same(chainWindowAllowed(ask([WALLS],DAMAGE_STEP),'sometimes',[],ctx),true,'and is offered in the Damage Step');
same(chainWindowAllowed(ask([WALLS,WABOKU],DAMAGE_STEP),'sometimes',[],ctx),true,'beside another card it still opens the Damage Step window');
same(chainWindowAllowed(ask([WALLS,TRAP_HOLE],ATTACK),'sometimes',[],ctx),true,'Trap Hole still opens the attack declaration window');
same(chainWindowAllowed(ask([WALLS],ATTACK),'sometimes',[{}],ctx),true,'answering an activation is unchanged');
same(chainWindowAllowed(ask([id('Mirror Wall')],ATTACK),'sometimes',[],ctx),true,'Mirror Wall, a Continuous Trap, keeps the attack declaration');
same(chainWindowAllowed(ask([WALLS],ATTACK),'always',[],ctx),true,'Always is unchanged');
same(chainWindowAllowed(ask([WALLS],DAMAGE_STEP),'never',[],ctx),false,'Never is unchanged');

// The real core: Castle Walls set beside a face-down Giant Soldier of Stone, attacked by Battle Ox.
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const script=execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.script(json.loads(sys.argv[1])))",JSON.stringify({curses:[],artifacts:[],challenge_level:0})],{cwd:root,encoding:'utf8'});
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
const SOLDIER=id('Giant Soldier of Stone');
let s=e.start(Array.from({length:40},(_,n)=>n%2?SOLDIER:WALLS),Array(40).fill(id('Battle Ox')),8000,8000,5,3,[],[],script),atDeclaration=0,inDamageStep=0,facedownTargets=0,used=false,raised=0;
for(let i=0;i<3000&&!s.finished&&e.turn<=8;i++){const m=e.pending;if(!m)break;raised=Math.max(raised,...e.query(0,L.MZONE).filter(c=>c&&c.code===SOLDIER).map(c=>c.defense));
 // Keep the player's monsters face-down in Defense Position so the attack flips them.
 if(m.player===0&&m.type===M.SELECT_IDLECMD){const set=m.monster_sets.findIndex(c=>c.code===SOLDIER),walls=m.spell_sets.findIndex(c=>c.code===WALLS);
  if(set>=0&&e.query(0,L.MZONE).every(c=>!c)){s=e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_MONSTER_SET,index:set});continue}
  if(walls>=0&&!e.query(0,L.SZONE).some(c=>c&&c.code===WALLS)){s=e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SPELL_SET,index:walls});continue}}
 if(m.player===0&&m.type===M.SELECT_CHAIN&&e.player===1&&m.selects?.some(c=>c.code===WALLS)){
  const live={turnPlayer:e.player,phase:e.phase,attackers:1,card:code=>byId.get(code),script:code=>e.scripts[`c${code}.lua`]};
  const timing=Number(m.hint_timing||0)|Number(m.hint_timing_other||0),allowed=chainWindowAllowed(m,'sometimes',e.activeChain,live);
  if(timing&DAMAGE_STEP){inDamageStep++;assert(allowed,'Damage Step window offered');checks++;
   if(!used){used=true;s=e.respond({type:R.SELECT_CHAIN,index:m.selects.findIndex(c=>c.code===WALLS)});
    for(let j=0;j<20&&e.pending?.player===0&&e.pending.type!==M.SELECT_CHAIN;j++)s=e.respond(e.auto());continue}}
  else if(timing&ATTACK&&!e.activeChain.length){atDeclaration++;if(e.query(0,L.MZONE).some(c=>c&&c.code===SOLDIER&&c.position===8))facedownTargets++;assert(!allowed,'attack declaration skipped');checks++}
  s=e.respond({type:R.SELECT_CHAIN,index:null});continue}
 s=e.respond(e.auto())}
console.log({atDeclaration,facedownTargets,inDamageStep,used,raised});
assert(facedownTargets>0,'an attack declaration on a face-down monster was skipped');checks++;
same(raised,2500,'Castle Walls gave the flipped Giant Soldier of Stone 500 DEF');
assert(inDamageStep>0,'the core offers Castle Walls in the Damage Step');checks++;
e.destroy();
console.log(`PASS ATK/DEF Traps ask in the Damage Step on Chain Sometimes (${checks} checks)`);
