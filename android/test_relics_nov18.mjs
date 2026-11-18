// Relic changes (user, 2026-11-18), in real engine duels:
// - Berserker's Pact gives 1 more attack than the card has without it: Mataza the Zapper attacks 3 times, a plain monster
//   twice, and two copies of the relic still give just 1 more (they skip each other instead of looping).
// - Stars Aligned needs at least 1 monster in your GY: an empty GY no longer counts as "all the same Level".
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,B,L} from './web/duel.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const json=path=>JSON.parse(fs.readFileSync(root+path,'utf8').replace(/^﻿/,''));
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const py=code=>execFileSync(python,['-B','-c','import sys;sys.path.insert(0,".")\n'+code],{cwd:root}).toString();
const script=artifacts=>py(`import passives\nprint(passives.script(dict(curses=[],artifacts=${JSON.stringify(artifacts)})))`);
const cards=json('data/cards.json'),engine=[json('android/web/engine-data.json'),json('android/web/scripts.json')];
const id=name=>{const c=cards.find(c=>c.name===name);assert(c,name);return c.id};
const VORSE=id('Vorse Raider'),MATAZA=id('Mataza the Zapper'),KURIBOH=id('Kuriboh');
let checks=0;const ok=(v,msg)=>{assert.ok(v,msg);checks++};

async function play(artifacts,deck,{extra='',turns=6,watch=()=>{},summon=true}={}){
 const duel=await new MobileDuel(cards).init(engine);
 let state=duel.start(deck,Array(40).fill(KURIBOH),8000,8000,5,7,[],[],script(artifacts)+'\n'+extra,0),turn=-1,summoned=0;
 for(let guard=0;guard<4000&&!state.finished&&duel.turn<=turns;guard++){
  const m=duel.pending;let response=duel.auto();
  if(duel.turn!==turn){turn=duel.turn;summoned=0}
  if(m.player===0&&m.type===M.SELECT_IDLECMD){
   if(summon&&!summoned&&m.summons.length){response={type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:0};summoned++}
   else if(m.to_bp)response={type:R.SELECT_IDLECMD,action:I.TO_BP,index:null};
  }
  if(m.player===0&&m.type===M.SELECT_BATTLECMD&&m.attacks.length)response={type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index:0};
  const changed=watch(duel,m,response);if(changed)response=changed;
  state=duel.respond(response);
 }
 assert.deepEqual(duel.errors||[],[]);
 return duel;
}
async function mostAttacks(artifacts,deck,extra=''){
 const attacks=new Map();
 const duel=await play(artifacts,deck,{extra,watch:(d,m)=>{if(m.type===M.SELECT_BATTLECMD&&m.player===0&&m.attacks.length){const k=d.turn+':'+m.attacks[0].sequence;attacks.set(k,(attacks.get(k)||0)+1)}}});
 duel.destroy();return Math.max(0,...attacks.values());
}
ok(await mostAttacks([],Array(40).fill(MATAZA))===2,'control: Mataza attacks twice on its own');
ok(await mostAttacks(['cursed_berserkers_pact'],Array(40).fill(VORSE))===2,"Berserker's Pact: Vorse Raider attacks twice");
ok(await mostAttacks(['cursed_berserkers_pact'],Array(40).fill(MATAZA))===3,"Berserker's Pact: Mataza attacks 3 times");
ok(await mostAttacks(['cursed_berserkers_pact'],Array(40).fill(VORSE),py('import approved_relic_effects as a;print(a.BERSERK_ATTACK)'))===2,'a second copy (Relic Mirror) gives 1 more, not 2');

// Stars Aligned: summon a Level 4 Vorse Raider, no battle, end the turn. Its End Phase offer comes only with a monster in the GY.
async function starsOffered(extra){
 let offered=false;
 const duel=await play(['stars_aligned'],Array(40).fill(VORSE),{extra,turns:1,watch:(d,m)=>{
  if(m.player===0&&m.type===M.SELECT_BATTLECMD)return {type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null};
  if(m.player===0&&[M.SELECT_CARD,M.SELECT_UNSELECT_CARD].includes(m.type)&&d.phase===0x200)offered=true;
 }});
 duel.destroy();return offered;
}
const toGrave=`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP) e:SetOperation(function(e) e:Reset() local c=Duel.GetFirstMatchingCard(Card.IsCode,0,LOCATION_DECK,0,nil,${VORSE}) if c then Duel.SendtoGrave(c,REASON_RULE) end end) Duel.RegisterEffect(e,0) end`;
ok(!await starsOffered(''),'Stars Aligned: an empty GY does not count');
ok(await starsOffered(toGrave),'Stars Aligned: a Level 4 in the GY and on the field offers the summon');
console.log(`PASS relics Nov 18: ${checks} checks`);
