import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,B,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const py=(code,...args)=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');"+code,...args],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}}).trim();
const runScript=(artifacts,side=0)=>py('import passives;print(passives.multiplayer_script(json.loads(sys.argv[1]),int(sys.argv[2])))',JSON.stringify({curses:[],artifacts,cursed_artifacts:[],challenge_level:0}),String(side));
let checks=0;const ok=(value,why)=>{assert(value,why);checks++},same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};

const WABOKU=id('Waboku'),OX=id('Battle Ox'),HOLE=id('Dark Hole'),KOUMORI=id('Koumori Dragon');
const DM=id('Dark Magician'),DMG=id('Dark Magician Girl'),DMK=id('Dark Magician Knight'),DMOC=id('Dark Magician of Chaos'),SKILLED=id('Skilled Dark Magician'),KNIVES=id('Thousand Knives');
const BEWD=id('Blue-Eyes White Dragon'),SHINING=id('Blue-Eyes Shining Dragon'),BEUD=id('Blue-Eyes Ultimate Dragon'),REBD=id('Red-Eyes Black Dragon'),SKULL=id('Black Skull Dragon');
// Cards put in place before the first turn, taken from the Deck: [code, 'hand'|'grave'|'field', player].
const setup=moves=>moves.length?`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP)
e:SetOperation(function(e) e:Reset() ${moves.map(([code,where,p=0])=>`do local c=Duel.GetMatchingGroup(Card.IsCode,${p},LOCATION_DECK,0,nil,${code}):Filter(function(x) return not x:IsLocation(LOCATION_HAND) end,nil):GetFirst() if c then ${where==='grave'?'Duel.SendtoGrave(c,REASON_RULE)':where==='field'?`Duel.MoveToField(c,${p},${p},LOCATION_MZONE,POS_FACEUP_ATTACK,true)`:`Duel.SendtoHand(c,${p},REASON_RULE)`} end end`).join(' ')} end) Duel.RegisterEffect(e,0) end`:'';

async function duel({script='',deck,enemy,turns=1,drive,lp=8000}){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 let s=e.start(deck,enemy,lp,8000,5,7,[],[],script);
 for(let i=0;i<6000&&!s.finished&&e.turn<=turns;i++){const m=e.pending;if(!m)break;const answer=drive(e,m);s=e.respond(answer||e.auto())}
 assert.deepEqual(e.errors||[],[],'no script errors');
 return e;
}
const idle=(m,action,codes,list)=>{const at=(m[list]||[]).findIndex(c=>[].concat(codes).includes(c.code));return at<0?null:{type:R.SELECT_IDLECMD,action,index:at}};
const toEnd={type:R.SELECT_IDLECMD,action:I.TO_EP,index:null},noBattle={type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null};
const fill=(...codes)=>Array.from({length:40},(_,n)=>codes[n%codes.length]);
const deckOf=(cards,filler=WABOKU)=>[...cards,...fill(filler).slice(cards.length)];
const cards=(e,p,loc,code)=>e.query(p,loc).filter(c=>c&&(!code||c.code===code));
const count=(e,p,loc,code)=>cards(e,p,loc,code).length;
const yes=m=>({type:m.type===M.SELECT_YESNO?R.SELECT_YESNO:R.SELECT_EFFECTYN,yes:true});
// Plays each step once, in order, whenever the idle menu offers it ([action, codes, list, turn]).
const steps=(list,{pick}={})=>{const done=new Set();return (e,m)=>{
 if(m.player!==0)return null;
 if(m.type===M.SELECT_IDLECMD){for(const [n,[action,codes,field,turn]] of list.entries()){if(done.has(n)||(turn&&e.turn!==turn))continue;const s=idle(m,action,codes,field);if(s){done.add(n);return s}}return toEnd}
 if(m.type===M.SELECT_BATTLECMD)return noBattle;
 if([M.SELECT_YESNO,M.SELECT_EFFECTYN].includes(m.type))return yes(m);
 if(m.type===M.SELECT_POSITION)return {type:R.SELECT_POSITION,position:1};
 if(m.type===M.SELECT_CARD&&pick){const at=m.selects.map((c,i)=>[c,i]).filter(([c])=>pick.includes(c.code)).map(([,i])=>i).slice(0,m.max);if(at.length>=m.min)return {type:R.SELECT_CARD,indicies:at}}
 return null}};
const offered=(m,code)=>m.player===0&&m.type===M.SELECT_IDLECMD&&(m.special_summons||[]).some(c=>c.code===code);

// Cursed relics approved on Discord (2026-11-17): Mulligan's Offer and Graceful & Skull Dice, in real-core duels.
const ARMY=id('Reinforcement of the Army'),GRACEFUL=id('Graceful Dice'),POT=id('Pot of Greed');
// Mulligan's Offer: at your first Standby Phase you choose cards (none is allowed) to shuffle back and draw as many; once per Duel.
async function mulligan(pickTwo){
 let prompts=0,before=null,after=null;
 const e=await duel({script:runScript(['cursed_mulligans_offer']),deck:deckOf([ARMY,OX,OX,OX,OX],WABOKU),enemy:fill(WABOKU),turns:3,drive(e,m){
  if(m.player===0&&m.type===M.SELECT_CARD&&m.min===0&&m.selects.every(c=>c.location===L.HAND)){prompts++;before=count(e,0,L.HAND);return {type:R.SELECT_CARD,indicies:pickTwo?[0,1]:[]}}
  if(m.player===0&&m.type===M.SELECT_IDLECMD){if(after===null&&before!==null)after=count(e,0,L.HAND);ok(!(m.activates||[]).some(c=>c.code===ARMY),'Reinforcement of the Army cannot search the Deck');}
  return steps([])(e,m)}});
 const out={prompts,before,after};e.destroy();return out;
}
const mul=await mulligan(true);console.log("Mulligan's Offer",mul);
same(mul.prompts,1,'asked once per Duel, at the first Standby Phase');same(mul.after,mul.before,'two cards back, two drawn');
same((await mulligan(false)).prompts,1,'choosing none is allowed');
// Graceful & Skull Dice: Graceful Dice rolls a die; you gain result x100 LP and your face-up monsters lose result x100 ATK
// this turn, which cancels Graceful Dice's own boost. Only the first roll each turn counts.
{
 let rolled=0,lpAfter=null,atkAfter=null;
 const e=await duel({script:runScript(['cursed_graceful_skull_dice'])+String.fromCharCode(10)+setup([[OX,'hand'],[GRACEFUL,'hand'],[GRACEFUL,'hand']]),deck:deckOf([OX,GRACEFUL,GRACEFUL],WABOKU),enemy:fill(WABOKU),turns:1,drive(e,m){
  if(m.player!==0)return null;
  if(m.type===M.SELECT_IDLECMD){
   const s=idle(m,I.SELECT_SUMMON,OX,'summons');if(s)return s;
   if(rolled<2){const g=idle(m,I.SELECT_ACTIVATE,GRACEFUL,'activates');if(g){rolled++;return g}}
   if(rolled===2&&lpAfter===null){lpAfter=e.lp[0];atkAfter=cards(e,0,L.MZONE,OX)[0]?.attack}
   return toEnd}
  return steps([])(e,m)}});
 console.log('Graceful & Skull Dice',{rolled,lpAfter,atkAfter});
 same(rolled,2,'both Graceful Dice were played');
 ok(lpAfter>8000&&lpAfter<=8600&&lpAfter%100===0,`LP gained from the first roll only (${lpAfter})`);
 // First roll: +r1 x100 from Graceful Dice, -r1 x100 from the relic; second roll: +r2 x100 only.
 ok(atkAfter>1700&&atkAfter<=2300,`the relic took back only the first roll's ATK (${atkAfter})`);
 e.destroy();
}
console.log(`PASS cursed relics Nov 17: ${checks} checks`);
