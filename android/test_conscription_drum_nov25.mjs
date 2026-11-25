// Conscription Drum (shadow relic): "Monsters you control cannot attack the turn they are Normal Summoned."
// Player report (2026-11-25): a Flip Summoned monster that had been on the field for turns sometimes could not attack.
// Flip Summons must never be locked; Normal Summons are locked only on their own turn.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,L} from './web/duel.js';
import {R,I,B} from './web/engine.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json');
const all=[...meta.cards,...(meta.tokenCards||[])],id=n=>{const c=all.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const py=code=>execFileSync(python,['-B','-c',"import sys;sys.path.insert(0,'.');"+code],{cwd:root,encoding:'utf8'});
const lua=relics=>relics.length?py(`import passives;print(passives.script({'artifacts':${JSON.stringify(relics)},'curses':[],'round':1,'character':0,'lp':8000},telemetry=False))`):'';
let checks=0;const ok=(v,why)=>{assert(v,why);checks++};
const e=await new MobileDuel(all).init([data,scripts]);
const add=(n,p,loc,pos,seq=0)=>`Debug.AddCard(${id(n)},${p},${p},LOCATION_${loc},${seq},POS_${pos})\n`;
const field=body=>{let s='Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,8000,0,0)\nDebug.SetPlayerInfo(1,8000,0,0)\n'+body;for(const p of [0,1])for(let i=0;i<10;i++)s+=add('Kuriboh',p,'DECK','FACEDOWN');return s+'Debug.ReloadFieldEnd()\n'};
const name=c=>e.name(c.code);

// Plays a duel where player 0 follows `plan[turn]` (a list of [kind, card name] steps in Main Phase 1), then enters the
// Battle Phase; returns the names that could attack on each of player 0's turns. The opponent only passes.
function play(body,relics,plan,lastTurn){
 e.start([],[],8000,8000,0,7,[],[],field(body)+'\n'+lua(relics),0);e.core.startDuel(e.h);e.advance();
 const attackers={},done={};
 for(let i=0;i<400&&e.pending&&e.turn<=lastTurn;i++){const m=e.pending,t=e.turn;
  if(m.player!==0){e.respond(m.type===M.SELECT_IDLECMD?{type:R.SELECT_IDLECMD,action:I.TO_EP,index:null}:m.type===M.SELECT_BATTLECMD?{type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null}:e.auto(m));continue}
  if(m.type===M.SELECT_IDLECMD&&e.phase!==0x200){
   const steps=plan[t]||[];done[t]??=0;
   if(done[t]<steps.length){const [kind,card]=steps[done[t]++];
    const list={summon:[m.summons,I.SELECT_SUMMON],set:[m.monster_sets,I.SELECT_MONSTER_SET],flip:[m.pos_changes,I.SELECT_POS_CHANGE],activate:[m.activates,I.SELECT_ACTIVATE]}[kind];
    const k=list[0].findIndex(c=>name(c)===card);assert(k>=0,`turn ${t}: can ${kind} ${card}`);e.respond({type:R.SELECT_IDLECMD,action:list[1],index:k});continue}
   e.respond(m.to_bp?{type:R.SELECT_IDLECMD,action:I.TO_BP,index:null}:{type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});continue}
  if(m.type===M.SELECT_IDLECMD){e.respond({type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});continue}
  if(m.type===M.SELECT_BATTLECMD){attackers[t]??=m.attacks.map(name);e.respond({type:R.SELECT_BATTLECMD,action:m.to_ep?B.TO_EP:B.TO_M2,index:null});continue}
  if(m.type===M.SELECT_POSITION){e.respond(e.auto(m));continue}
  e.respond(e.auto(m))}
 return attackers}

// A monster Normal Set on turn 1 and Flip Summoned on turn 3 can attack on turn 3; a monster Normal Summoned on turn 3
// cannot. Both with the relic; the same without it as a control.
for(const relics of [['cursed_conscription_drum'],[]]){
 const on=relics.length>0,tag=on?'Conscription Drum':'control';
 const a=play(add('Battle Ox',0,'HAND','FACEDOWN')+add('Vorse Raider',0,'HAND','FACEDOWN')+add('Gemini Elf',0,'HAND','FACEDOWN'),relics,
  {1:[['set','Battle Ox']],3:[['flip','Battle Ox'],['summon','Vorse Raider']]},3);
 ok(a[3]?.includes('Battle Ox'),`${tag}: Battle Ox, Set on turn 1 and Flip Summoned on turn 3, can attack (got ${a[3]})`);
 ok(a[3]?.includes('Vorse Raider')===!on,`${tag}: Vorse Raider, Normal Summoned this turn, ${on?'cannot':'can'} attack (got ${a[3]})`);
 // Set on turn 3 with the second summon too: the Flip Summoned one still attacks.
 const b=play(add('Battle Ox',0,'HAND','FACEDOWN')+add('Vorse Raider',0,'HAND','FACEDOWN')+add('Gemini Elf',0,'HAND','FACEDOWN'),relics,
  {1:[['set','Battle Ox']],3:[['set','Gemini Elf'],['flip','Battle Ox']]},3);
 ok(b[3]?.includes('Battle Ox'),`${tag}: Flip Summoned after a Set the same turn, Battle Ox can attack (got ${b[3]})`);
 // Set this turn, then turned face-up by an effect (Book of Taiyou): it was Set, not Normal Summoned, so it attacks.
 const d=play(add('Battle Ox',0,'HAND','FACEDOWN')+add('Book of Taiyou',0,'HAND','FACEDOWN'),relics,{3:[['set','Battle Ox'],['activate','Book of Taiyou']]},3);
 ok(d[3]?.includes('Battle Ox'),`${tag}: Set this turn and flipped by Book of Taiyou, Battle Ox can attack (got ${d[3]})`);
 // Normal Summoned on turn 1, so it can attack on turn 3.
 const c=play(add('Battle Ox',0,'HAND','FACEDOWN'),relics,{1:[['summon','Battle Ox']]},3);
 ok(c[3]?.includes('Battle Ox'),`${tag}: Normal Summoned on turn 1, Battle Ox attacks on turn 3 (got ${c[3]})`);
}
console.log(`PASS Conscription Drum (${checks} checks): Flip Summons are never locked, Normal Summons only on their own turn`);
