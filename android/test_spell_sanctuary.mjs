// Spell Sanctuary (the user's shadow relic, 2026-11-19), in real-core duels: Spells cannot be activated from the hand,
// a Set Spell cannot be activated the turn it was Set, and a Set Spell can be activated during the opponent's turn.
// Also the CPU's side (Relic Mirror or a Tag/Draft opponent): it Sets its Spells and uses them later.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,B,L} from './web/duel.js';
import {chainWindowAllowed} from './web/duel-presentation.js';
import {activationBlock,ACTIVATION_REASONS} from './web/activation-reasons.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const py=(code,...args)=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');"+code,...args],{cwd:root,encoding:'utf8',maxBuffer:1<<26,env:{...process.env,PYTHONUTF8:'1'}}).trim();
const runScript=(artifacts,side=0)=>py('import passives;print(passives.multiplayer_script(json.loads(sys.argv[1]),int(sys.argv[2])))',JSON.stringify({curses:[],artifacts,cursed_artifacts:[],challenge_level:0}),String(side));
let checks=0;const ok=(value,why)=>{assert(value,why);checks++},same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};

const KEY='cursed_spell_sanctuary';
const OX=id('Battle Ox'),POT=id('Pot of Greed'),MOUNTAIN=id('Mountain'),WABOKU=id('Waboku'),HOLE=id('Dark Hole');
const fill=(...codes)=>Array.from({length:40},(_,n)=>codes[n%codes.length]);
const cards=(e,p,loc,code)=>e.query(p,loc).filter(c=>c&&(!code||c.code===code));
const has=(list,code,loc)=>(list||[]).some(c=>c.code===code&&(loc===undefined||c.location===loc));
const at=(list,code,loc)=>(list||[]).findIndex(c=>c.code===code&&(loc===undefined||c.location===loc));
const toEnd={type:R.SELECT_IDLECMD,action:I.TO_EP,index:null};

// The catalog, the shadow relic pool and the shadow relic screen's two halves.
const facts=JSON.parse(py(`import content,approved_relics as ar,cursed_relics as cr,draft_relics as dr;print(json.dumps(dict(name=content.ARTIFACTS['${KEY}'][0],price=content.ARTIFACTS['${KEY}'][1],cursed='${KEY}' in ar.CURSED_IDS,pool='${KEY}' in cr.approved(),parts=ar.CURSED_PARTS.get('${KEY}'),draft='${KEY}' in dr.eligible())))`));
same(facts.name,'Spell Sanctuary','catalog name');ok(facts.cursed&&facts.pool,'in the shadow relic pool');same(facts.price,0,'shadow relics cost nothing');
same(facts.parts,["You can activate Spell Cards during your opponent's turn.","You cannot activate Spell Cards unless they are Set first. You cannot activate a Set Spell Card the turn it was Set."],'upside and drawback');
ok(facts.draft,'offered in Draft Duels (it changes the duel)');
ok(meta.artifacts?.[KEY]?.[0]==='Spell Sanctuary','content.json has the relic (run tools/build_android.py --sync-only)');

// Player 0 holds Pot of Greed and Mountain (and Dark Hole) in the opening hand. Turn 1: it Sets them. Turn 2 (the CPU's):
// the Set Pot of Greed is activated in answer to the CPU's summon.
async function play({script,drive,turns=2,deck=fill(POT,MOUNTAIN,HOLE,OX),enemy=fill(OX)}){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 let s=e.start(deck,enemy,8000,8000,5,7,[],[],script);
 for(let i=0;i<4000&&!s.finished&&e.turn<=turns;i++){const m=e.pending;if(!m)break;s=e.respond(drive(e,m)||e.auto())}
 assert.deepEqual(e.errors||[],[],'no script errors');
 return e;
}
function human(log){
 return (e,m)=>{
  if(m.player!==0)return null;
  if(m.type===M.SELECT_IDLECMD&&e.turn===1){
   if(!log.handChecked){log.handChecked=true;log.potFromHand=has(m.activates,POT,L.HAND);log.mountainFromHand=has(m.activates,MOUNTAIN,L.HAND);log.potSettable=has(m.spell_sets,POT);log.mountainSettable=has(m.spell_sets,MOUNTAIN)}
   for(const code of [POT,MOUNTAIN]){if(log['set'+code])continue;const i=at(m.spell_sets,code);if(i>=0){log['set'+code]=true;return {type:R.SELECT_IDLECMD,action:I.SELECT_SPELL_SET,index:i}}}
   log.potSetTurn=has(m.activates,POT,L.SZONE);log.mountainSetTurn=has(m.activates,MOUNTAIN,L.SZONE);
   return toEnd;
  }
  // The player answers as the game would ask with Chain Sometimes (mobile.js offerChain), at the first window it shows.
  if(m.type===M.SELECT_CHAIN&&e.turn===2){
   const i=at(m.selects,POT,L.SZONE);
   if(i>=0&&!log.chained){
    const card=code=>meta.cards.find(c=>c.id===code);
    const asked=chainWindowAllowed(m,'sometimes',e.activeChain,{turnPlayer:e.player,phase:e.phase,attackers:e.query(1,L.MZONE).filter(c=>c&&c.position&1).length,card,script:code=>scripts[`c${code}.lua`]});
    (log.windows??=[]).push({phase:e.phase,timing:Number(m.hint_timing||0)|Number(m.hint_timing_other||0),asked});
    if(asked){log.chained=true;log.hand=cards(e,0,L.HAND).length;log.enemyMonsters=cards(e,1,L.MZONE).length;return {type:R.SELECT_CHAIN,index:i}}
   }
   return {type:R.SELECT_CHAIN,index:null};
  }
  if(m.type===M.SELECT_BATTLECMD)return {type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null};
  return null;
 };
}
{
 const log={};const e=await play({script:runScript([KEY]),drive:human(log)});
 console.log('Spell Sanctuary',log);
 ok(!log.potFromHand&&!log.mountainFromHand,'no Spell, Field Spells included, is activated from the hand');
 ok(log.potSettable&&log.mountainSettable,'both can be Set');
 ok(!log.potSetTurn&&!log.mountainSetTurn,'a Set Spell cannot be activated the turn it was Set');
 ok(log.chained,"the Set Pot of Greed is offered during the opponent's turn");
 ok(cards(e,0,L.GRAVE,POT).length===1,'Pot of Greed resolved');
 ok(cards(e,0,L.HAND).length>=log.hand+2,'and drew 2');
 ok(log.windows.length>1&&!log.windows[0].asked,'Chain Sometimes stays quiet at the start of their turn');
 ok(log.enemyMonsters>0,"and asks once the CPU has summoned");
 e.destroy();
}
// Without the relic: a Set Normal Spell can be activated the turn it was Set and never during the opponent's turn.
{
 const log={};const e=await play({script:'',drive:human(log)});
 ok(log.potFromHand&&log.mountainFromHand,'without the relic Spells are activated from the hand');
 ok(log.potSetTurn,'and a Set Normal Spell the turn it was Set');
 ok(!log.chained,"but not during the opponent's turn");
 e.destroy();
}
// The CPU's side: Relic Mirror copies the relic to the opponent. It Sets its Spells (none can be activated from the hand)
// and activates them on later turns, the player's included (it chains Pot of Greed in the player's turn).
{
 const script=py('import passives;print(passives.script(json.loads(sys.argv[1]),telemetry=False))',JSON.stringify({curses:['relic_mirror'],mirrored_relics:[KEY],artifacts:[],cursed_artifacts:[],challenge_level:0}));
 ok(/"activeRelics": \[\[\], \["cursed_spell_sanctuary"\]\]/.test(script),'the CPU knows it holds the copy');
 const log={fromHand:0,set:[],activated:[]};
 const e=await play({script,turns:4,deck:fill(OX),enemy:fill(POT,OX),drive(e,m){
  if(m.player!==1){if(m.type===M.SELECT_IDLECMD)return toEnd;if(m.type===M.SELECT_BATTLECMD)return {type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null};if(m.type===M.SELECT_CHAIN)return {type:R.SELECT_CHAIN,index:null};return null}
  if(m.type===M.SELECT_IDLECMD&&has(m.activates,POT,L.HAND))log.fromHand++;
  const r=e.auto();
  if(m.type===M.SELECT_IDLECMD&&r.action===I.SELECT_SPELL_SET&&m.spell_sets[r.index]?.code===POT)log.set.push(e.turn);
  if(m.type===M.SELECT_IDLECMD&&r.action===I.SELECT_ACTIVATE&&m.activates[r.index]?.code===POT)log.activated.push({turn:e.turn,location:m.activates[r.index].location});
  if(m.type===M.SELECT_CHAIN&&r.index!==null&&m.selects[r.index]?.code===POT)log.activated.push({turn:e.turn,location:m.selects[r.index].location,chain:true});
  return r}});
 console.log('CPU with Spell Sanctuary',log);
 same(log.fromHand,0,'the CPU is never offered Pot of Greed from its hand');
 ok(log.set.includes(2),'the CPU Sets Pot of Greed on its first turn');
 ok(log.activated.length&&log.activated.every(x=>x.turn>2&&x.location===L.SZONE),'and activates it from the field on a later turn');
 ok(log.activated.some(x=>x.turn===3&&x.chain),"including during the player's turn");
 ok(cards(e,1,L.GRAVE,POT).length>=1,'Pot of Greed resolved for the CPU');
 e.destroy();
}
// Tag's final duel and Draft Duels build each seat's relics with passives.multiplayer_script: on seat 1 the relic binds
// only that player. Player 0 activates Pot of Greed from the hand; player 1 can only Set it.
{
 const log={};
 const e=await play({script:runScript([KEY],1),turns:2,deck:fill(POT,OX),enemy:fill(POT,OX),drive(e,m){
  if(m.type===M.SELECT_IDLECMD){const key='p'+m.player;if(!(key in log))log[key]={fromHand:has(m.activates,POT,L.HAND),set:has(m.spell_sets,POT)};return toEnd}
  if(m.type===M.SELECT_BATTLECMD)return {type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null};
  if(m.type===M.SELECT_CHAIN)return {type:R.SELECT_CHAIN,index:null};
  return null}});
 console.log('seat 1',log);
 ok(log.p0?.fromHand,'seat 0 has no relic: Pot of Greed from the hand');
 ok(log.p1&&!log.p1.fromHand&&log.p1.set,'seat 1 holds the relic: Set only');
 e.destroy();
}
// The greyed Activate in a card's menu says why (activation-reasons.js), naming the relic.
{
 const relics={activeRelics:[[KEY],[]]},idle={player:0,type:M.SELECT_IDLECMD,activates:[]},base={type:2,desc:'',M,L,relicName:()=>'Spell Sanctuary',lp:8000,spells:[]};
 same(activationBlock({...base,loc:L.HAND,seq:0,pending:idle,turnPlayer:0,phase:4,modifiers:relics}),'Spell Sanctuary: Spells must be Set before they can be activated.','from the hand');
 same(activationBlock({...base,loc:L.SZONE,seq:0,faceDown:true,status:0x10,pending:idle,turnPlayer:0,phase:4,modifiers:relics}),'Spell Sanctuary: Spells can’t be activated the turn they’re Set.','the turn it was Set');
 ok(activationBlock({...base,loc:L.SZONE,seq:0,faceDown:true,status:0,pending:{player:0,type:M.SELECT_CHAIN,selects:[]},turnPlayer:1,phase:4,modifiers:relics})!==ACTIVATION_REASONS.spellOpponentTurn,"a Set Spell is not refused for being in the opponent's turn");
 same(activationBlock({...base,loc:L.HAND,seq:0,pending:idle,turnPlayer:1,phase:4,modifiers:{activeRelics:[[],[]]}}),ACTIVATION_REASONS.spellOpponentTurn,'without the relic, the old reason');
 // Chain Sometimes: at the opponent's End Phase it asks for a Set Spell that clears Spells and Traps, like Mystical Space Typhoon.
 const DUSTER=id("Harpie's Feather Duster"),card=code=>meta.cards.find(c=>c.id===code);
 ok(chainWindowAllowed({player:0,selects:[{code:DUSTER,location:L.SZONE,position:8}],hint_timing:0,hint_timing_other:0},'sometimes',[],{turnPlayer:1,phase:512,card,script:()=>''}),"Harpie's Feather Duster asks at the opponent's End Phase");
 ok(!chainWindowAllowed({player:0,selects:[{code:POT,location:L.SZONE,position:8}],hint_timing:0,hint_timing_other:0},'sometimes',[],{turnPlayer:1,phase:512,card,script:()=>''}),'Pot of Greed does not');
}
console.log(`PASS Spell Sanctuary: ${checks} checks`);
