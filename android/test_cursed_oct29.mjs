// Thronior's 2026-10-29 cursed relics, in real engine duels: Berserker's Pact, Shield Bash,
// Reversed Remedy and Conscription Drum, plus the CPU forecast.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,B,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const json=path=>JSON.parse(fs.readFileSync(root+path,'utf8').replace(/^﻿/,''));
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const py=code=>execFileSync(python,['-B','-c','import sys;sys.path.insert(0,".")\n'+code],{cwd:root}).toString();
const script=(artifacts,curses=[],extra='')=>py(`import passives\nprint(passives.script(dict(curses=${JSON.stringify(curses)},artifacts=${JSON.stringify(artifacts)}${extra})))`);
const cards=json('data/cards.json'),engine=[json('android/web/engine-data.json'),json('android/web/scripts.json')];
const VORSE=14898066,GARDNA=65240384,KURIBOH=40640057,UPSTART=70368879,OOKAZI=19523799;

// Player 0 summons (up to `summons` per turn), optionally switches to Defense Position, and always attacks when it can.
async function play(artifacts,deck,enemy,{summons=1,defend=false,turns=6,watch=()=>{}}={}){
 const duel=await new MobileDuel(cards).init(engine);
 let state=duel.start(deck,enemy,8000,8000,5,7,[],[],script(artifacts),0),turn=-1,summoned=0,switched=false;
 for(let guard=0;guard<3000&&!state.finished&&duel.turn<=turns;guard++){
  const m=duel.pending;let response=duel.auto();
  if(duel.turn!==turn){turn=duel.turn;summoned=0;switched=false}
  if(m.player===0&&m.type===M.SELECT_IDLECMD){
   if(summoned<summons&&m.summons.length){response={type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:0};summoned++}
   else if(defend&&!switched&&(m.pos_changes||[]).length){response={type:R.SELECT_IDLECMD,action:I.SELECT_POS_CHANGE,index:0};switched=true}
   else if(m.to_bp)response={type:R.SELECT_IDLECMD,action:I.TO_BP,index:null};
  }
  if(m.player===0&&m.type===M.SELECT_BATTLECMD&&m.attacks.length)response={type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index:0};
  watch(duel,m);
  state=duel.respond(response);
 }
 return {duel,state};
}
let checks=0;const ok=(v,msg)=>{assert.ok(v,msg);checks++};

// Berserker's Pact: each monster may attack twice, and attacking stays optional (its downside is no Sets or Defense Position Special Summons).
{
 let attacks=new Map(),escape=false;
 const {duel}=await play(['cursed_berserkers_pact'],Array(40).fill(VORSE),Array(40).fill(KURIBOH),{watch:(d,m)=>{
  if(m.type===M.SELECT_BATTLECMD&&m.player===0){
   if(m.attacks.length){const k=d.turn+':'+m.attacks[0].sequence;attacks.set(k,(attacks.get(k)||0)+1);if(m.to_m2||m.to_ep)escape=true}
  }}});
 duel.destroy();
 ok(Math.max(0,...attacks.values())===2,`each Vorse Raider declares 2 attacks per turn (${[...attacks.values()]})`);
 ok(escape,'you can still end the Battle Phase with an attack left');
}
// Without the relic, the same monster attacks once.
{
 let attacks=new Map();
 const {duel}=await play([],Array(40).fill(VORSE),Array(40).fill(KURIBOH),{watch:(d,m)=>{if(m.type===M.SELECT_BATTLECMD&&m.player===0&&m.attacks.length){const k=d.turn+':'+m.attacks[0].sequence;attacks.set(k,(attacks.get(k)||0)+1)}}});
 duel.destroy();
 ok(Math.max(0,...attacks.values())===1,'control: one attack per turn without the relic');
}
// Shield Bash: Attack Position cannot attack; a face-up Defense Position Gardna attacks with its 2600 DEF.
{
 let attackOffered=[],hits=[],last=8000;
 const {duel}=await play(['cursed_shield_bash'],Array(40).fill(GARDNA),Array(40).fill(UPSTART),{defend:true,turns:8,watch:(d,m)=>{
  if(m.type===M.SELECT_BATTLECMD&&m.player===0){const own=d.query(0,L.MZONE).filter(Boolean);attackOffered.push({n:m.attacks.length,defense:own.some(c=>c.position&4),attack:own.some(c=>c.position&1)})}
  if(d.lp[1]<last)hits.push(last-d.lp[1]);last=d.lp[1]}});
 duel.destroy();
 ok(attackOffered.some(x=>x.defense&&x.n>0),'a Defense Position monster may attack');
 ok(attackOffered.every(x=>!(x.attack&&!x.defense&&x.n>0)),'an Attack Position monster may not');
 ok(hits.includes(2600),`direct damage uses DEF 2600 (saw ${hits})`);
}
// Reversed Remedy: your Upstart Goblin's 1000 LP gift now costs the opponent 1000, and your Ookazi's 800 damage heals them.
{
 const lp=[];
 const duel=await new MobileDuel(cards).init(engine);
 let state=duel.start(Array(20).fill([UPSTART,OOKAZI]).flat(),Array(40).fill(KURIBOH),8000,8000,5,9,[],[],script(['cursed_reversed_remedy']),0);
 for(let guard=0;guard<3000&&!state.finished&&duel.turn<=4;guard++){
  const m=duel.pending;let response=duel.auto();
  if(m.player===0&&m.type===M.SELECT_IDLECMD&&m.activates?.length)response={type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:0};
  state=duel.respond(response);lp.push([...duel.lp]);
 }
 duel.destroy();
 const steps=lp.map((x,i)=>x[1]-(lp[i-1]?.[1]??8000)).filter(Boolean);
 ok(steps.includes(-1000),`Upstart Goblin's LP gift hurts the opponent (LP changes ${steps})`);
 ok(steps.includes(800),`Ookazi heals the opponent (LP changes ${steps})`);
}
// Conscription Drum: two Normal Summons per turn, and neither attacks that turn.
{
 let summonedTurn=new Map(),attackedSameTurn=false;
 const {duel}=await play(['cursed_conscription_drum'],Array(40).fill(VORSE),Array(40).fill(UPSTART),{summons:2,turns:4,watch:(d,m)=>{
  if(m.type===M.SELECT_BATTLECMD&&m.player===0&&d.turn===summonedTurn.get('last')&&m.attacks.length)attackedSameTurn=true;
  if(m.type===M.SELECT_IDLECMD&&m.player===0){const n=d.query(0,L.MZONE).filter(Boolean).length;summonedTurn.set(d.turn,Math.max(n,summonedTurn.get(d.turn)||0))}
  if(m.type===M.SUMMONED&&m.player===0)summonedTurn.set('last',d.turn)}});
 duel.destroy();
 ok(Math.max(...[...summonedTurn].filter(([k])=>k!=='last').map(([,v])=>v))>=2,'two Normal Summons in one turn');
 ok(!attackedSameTurn,'monsters cannot attack the turn they are Normal Summoned');
}
// CPU forecast: Shield Bash attacks with DEF, Berserker's Pact counts two attacks, Reversed Remedy stops healing plans.
{
 const wall={code:KURIBOH,controller:1,location:L.MZONE,sequence:0,position:4,attack:300,defense:200};
 const forecast=(relics,mine)=>smartContext({player:1,phase:4,data:{[KURIBOH]:{type:0x21,attack:300,defense:200},[mine.code]:{type:0x11,attack:mine.attack,defense:mine.defense}},cards:new Map(),lp:[8000,8000],name:()=>'Monster',
  query:(p,l)=>l===L.MZONE?(p===0?[mine]:[wall]):[],activeChain:[],battleProtected:[false,false],aiModifiers:{activeRelics:[relics,[]]}},1,L);
 const vorse={code:VORSE,controller:0,location:L.MZONE,sequence:0,position:1,attack:1900,defense:1200};
 const gardna={code:GARDNA,controller:0,location:L.MZONE,sequence:0,position:4,attack:100,defense:2600};
 ok(forecast([],vorse).incomingDamage(wall,false)===0,'forecast: one Vorse Raider attack only clears the wall');
 ok(forecast(['cursed_berserkers_pact'],vorse).incomingDamage(wall,false)===1900,"forecast: Berserker's Pact adds the follow-up direct attack");
 ok(forecast([],gardna).incomingDamage(wall,false)===0,'forecast: a Defense Position Gardna normally never attacks');
 ok(forecast(['cursed_shield_bash'],{...gardna,position:1}).attackBlocked({...gardna,position:1},0)===true,'forecast: Shield Bash blocks Attack Position');
 ok(forecast(['cursed_shield_bash','cursed_berserkers_pact'],gardna).incomingDamage(wall,false)===2600,'forecast: Shield Bash Gardna attacks with 2600 DEF');
 ok(forecast([],vorse).healingAllowed(1)&&!forecast(['cursed_reversed_remedy'],vorse).healingAllowed(1),'forecast: Reversed Remedy makes healing harmful for the CPU too');
}
console.log(`PASS cursed relics (2026-10-29): ${checks} checks`);
