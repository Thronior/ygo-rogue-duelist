// Kunai with Chain on the opponent's turn (behaviour flag d3ed0d76bd, 2026-11-02) and Proton Blast with a re-tossed coin.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const same=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const KUNAI=id('Kunai with Chain');
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,position,controller,location,sequence,type:data[id(name)]?.type,...extra});
const mon=(name,controller,sequence,position=1,extra)=>card(name,L.MZONE,controller,sequence,position,extra);
const trap=()=>card('Kunai with Chain',L.SZONE,1,4,10,{description:BigInt(KUNAI)<<20n});
// The opponent's battle: `attacker` declared on `target`, in the given phase.
function battle(mine,theirs,attacker,target,state={}){
 const zones={0:{[L.MZONE]:theirs},1:{[L.MZONE]:mine,[L.SZONE]:[trap()]}},e=new MobileDuel(meta.cards);
 const filler=p=>Array.from({length:20},(_,i)=>card('Battle Ox',L.DECK,p,i,10));
 Object.assign(e,{data,lp:[8000,8000],turn:6,player:0,phase:8,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},state);
 for(const p of [0,1]){zones[p][L.DECK]=filler(p);for(const loc of [L.MZONE,L.SZONE]){const out=Array(5).fill(null);for(const c of zones[p][loc]||[])out[c.sequence]=c;zones[p][loc]=out}}
 e.query=(side,loc)=>zones[side]?.[loc]||[];e.core={duelQueryCount:(_,side,loc)=>(zones[side]?.[loc]||[]).length};
 e.attackCard={controller:0,location:L.MZONE,sequence:attacker.sequence};e.attackTarget=target?{controller:1,location:L.MZONE,sequence:target.sequence}:null;
 e.attacksThisTurn??=new Map([[`0:${attacker.sequence}`,1]]);
 return e;
}
const uses=e=>e.auto({type:M.SELECT_CHAIN,player:1,forced:false,selects:[trap()]}).index===0;
// Flagged duel: 1800 ATK attacking a set 1150-DEF Axe Raider. Stop it at declaration.
{
 const snake=mon('The Snake Hair',0,1),raider=mon('Axe Raider',1,2,8);
 same(uses(battle([raider],[snake],snake,raider)),true,'declaration: Kunai saves the set Axe Raider');
 const face=mon('Axe Raider',1,2,4);
 same(uses(battle([face],[snake],snake,face,{phase:32,inDamageStep:true})),false,'Damage Step: no equip on a Defense Position monster');
}
// At declaration it follows the Enemy Controller rules.
{
 const ox=mon('Battle Ox',0,1,1,{attack:1000}),wall=mon('Axe Raider',1,2,4,{defense:2000});
 same(uses(battle([wall],[ox],ox,wall)),false,'an attack that costs nothing is left alone');
 const vorse=mon('Vorse Raider',0,1);
 same(uses(battle([],[vorse],vorse,null,{lp:[8000,1500]})),true,'a lethal direct attack is stopped');
 const small=mon('Battle Ox',0,1,1,{attack:900}),big=mon('Blue-Eyes White Dragon',0,2);
 same(uses(battle([],[small,big],small,null)),false,'held for the bigger attack still to come');
}
// In the Damage Step only the equip is left: use it when 500 ATK wins or trades the battle.
{
 const step={phase:32,inDamageStep:true},at=(mine,theirs)=>{const foe=mon('Battle Ox',0,1,1,{attack:theirs}),own=mon('Axe Raider',1,2,1,{attack:mine});return uses(battle([own],[foe],foe,own,step))};
 same(at(1500,1700),true,'1500 + 500 beats 1700');same(at(1500,2000),true,'1500 + 500 trades with 2000');same(at(1500,2100),false,'500 ATK is not enough');same(at(2000,1500),false,'already winning');
}
// Modes and equip targets, on the option values the core really sends.
{
 const snake=mon('The Snake Hair',0,1),raider=mon('Axe Raider',1,2,8),weak=mon('Battle Ox',1,0,4,{attack:1000}),strong=mon('Axe Raider',1,1,1);
 const e=battle([weak,strong,raider],[snake],snake,raider);e.effect={code:KUNAI,player:1};
 const policy=smartContext(e,1,L,{}),o=n=>(BigInt(KUNAI)<<20n)+BigInt(n);
 same(policy.resourceOption([o(1),o(2),o(3)]),2,'both modes when both are open');same(policy.resourceOption([o(1)]),0,'position change alone with no face-up monster');
 assert(policy.targetScore('Kunai with Chain',strong,{})>policy.targetScore('Kunai with Chain',weak,{}),'the attack is stopped, so the equip goes on the best attacker');checks++;
 const f=battle([weak,strong],[snake],snake,weak,{phase:32,inDamageStep:true});f.effect={code:KUNAI,player:1};
 const g=smartContext(f,1,L,{});assert(g.targetScore('Kunai with Chain',weak,{})>g.targetScore('Kunai with Chain',strong,{}),'in the Damage Step it goes on the monster in the battle');checks++;
}
// Real core: Let's Go Gambling must not make one coin count twice.
{
 const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
 const text=execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.script(json.loads(sys.argv[1])))",JSON.stringify({curses:[],artifacts:['lets_go_gambling'],challenge_level:0,character:0})],{cwd:root,encoding:'utf8'});
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
 const PROTON=id('Proton Blast'),WIZARD=id('Time Wizard'),FORCE=id('Mirror Force'),OX=id('Battle Ox');
 const deck=Array.from({length:40},(_,i)=>[PROTON,WIZARD,OX,OX][i%4]),foe=Array(40).fill(FORCE); // Set Traps: a second head would have something to destroy.
 const step=(onCard=()=>{})=>{const p=e.pending;if(p?.type===M.SELECT_YESNO&&p.player===0){e.respond({type:R.SELECT_YESNO,yes:true});return 1}if(p?.player===0&&p?.type===M.SELECT_CARD)onCard(p);e.respond(e.auto());return 0};
 const until=test=>{for(let i=0;i<300&&!test();i++)step()};
 const mine=()=>e.pending?.type===M.SELECT_IDLECMD&&e.pending?.player===0;
 const seen={heads:0,tails:0};
 for(let seed=1;seed<500&&(!seen.heads||!seen.tails);seed++){
  e.start(deck,foe,8000,8000,5,seed,[],[],text);until(mine);let m=e.pending;
  const set=m.spell_sets.findIndex(c=>c.code===PROTON);if(set<0||!m.summons.some(c=>c.code===WIZARD))continue;
  e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SPELL_SET,index:set});until(mine);m=e.pending;
  e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:m.summons.findIndex(c=>c.code===WIZARD)});until(mine);m=e.pending;
  e.respond({type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});until(()=>e.turn>=3&&mine());
  // The automatic answers may already have flipped it on the opponent's turn.
  m=e.pending;const blast=m?.activates?.findIndex(c=>c.code===PROTON);
  if(blast>=0){e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:blast});until(mine);m=e.pending}
  if(!e.query(0,L.SZONE).some(c=>c?.code===PROTON&&c.position&1))continue;
  const k=m?.activates?.findIndex(c=>c.code===WIZARD);if(!(k>=0))continue;
  const back=()=>e.query(1,L.SZONE).filter(Boolean).length,traps=back();if(!traps)continue;
  e.visuals.length=0;let asked=0;const lp=e.lp[1],prompts=[];e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k});
  for(let i=0;i<60&&!mine();i++)asked+=step(p=>prompts.push(p));
  const coins=e.visuals.filter(x=>x.kind==='coin');if(asked!==1||coins.length!==2)continue;
  const heads=Number(coins.at(-1).results[0])?1:0;seen[heads?'heads':'tails']++;
  same(lp-e.lp[1],heads?500:0,'the retried coin decides Proton Blast');same(prompts.length,0,'one coin never reaches the 2+ heads destroy');same(back(),traps,'and nothing was destroyed');
 }
 assert(seen.heads&&seen.tails,'both results were tested: '+JSON.stringify(seen));assert.deepEqual(e.errors,[],'no script errors');
}
console.log(`PASS Kunai with Chain rules and re-tossed coins: ${checks} checks`);process.exit(0);
