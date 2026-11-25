// 10K survey relics the user picked (2026-11-25), run in the real core with the relic Lua that passives.py writes:
// Sanctuary Hymn (LP gained by a Fairy monster's effect while "The Sanctuary in the Sky" is face-up becomes damage to the
// opponent), Parasite Infestation (a face-up Parasite Paracide goes into the opponent's Deck at the start of the Duel and
// works when they draw it) and the shadow relic Scorching Strikes (battle damage to the opponent is halved and dealt as
// effect damage, so Burn Proficiency applies to it).
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,B,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),id=n=>{const c=meta.cards.find(c=>c.name===n);assert.ok(c,n+' is in the card pool');return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const SETS=[[],['sanctuary_hymn'],['parasite_infestation'],['cursed_scorching_strikes'],['cursed_scorching_strikes','burn_proficiency'],['cursed_scorching_strikes','battle_proficiency'],['battle_proficiency']];
const scripts=JSON.parse(execFileSync(python,['-B','-c',`import sys,json;sys.path.insert(0,'.');import passives
print(json.dumps({'+'.join(k):passives.script({'curses':[],'artifacts':k,'challenge_level':0,'character':0},telemetry=False) for k in ${JSON.stringify(SETS)}}))`],{cwd:root,encoding:'utf8',maxBuffer:1<<26}));
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
const OX=id('Battle Ox'),BREEZE=id('Spirit of the Breeze'),SANCTUARY=id('The Sanctuary in the Sky'),PARACIDE=27911549;
const fill=code=>Array(40).fill(code);
// `parts` run at the start of turn 1's Draw Phase; `main` at the start of each Main Phase 1 (turn number in `t`).
const setup=(parts,main='')=>`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) e:Reset() ${parts.join(' ')} end) Duel.RegisterEffect(e,0)
local m=Effect.GlobalEffect() m:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) m:SetCode(EVENT_PHASE_START|PHASE_MAIN1) m:SetOperation(function(e) local t=Duel.GetTurnCount() ${main} end) Duel.RegisterEffect(m,0)`;
const place=(p,code,where='LOCATION_MZONE',pos='POS_FACEUP_ATTACK')=>`Duel.MoveToField(Duel.CreateToken(${p},${code}),${p},${p},${where},${pos},true)`;
// Player 0 starts. `attackOn` lists the turns on which that turn's player attacks once with its first monster.
function play(relics,{parts=[],main='',turns,attackOn=[],deck=fill(OX),enemy=fill(OX)}){
 const key=relics.join('+');assert.ok(key in scripts,key);
 e.start(deck,enemy,8000,8000,5,5,[],[],setup(parts,main)+'\n'+scripts[key]);
 const lp={},done=new Set();
 for(let i=0;i<4000&&e.pending&&!e.finished&&e.turn<=turns;i++){
  const m=e.pending;
  if(m.type===M.SELECT_IDLECMD){lp[e.turn]??=[...e.lp];
   if(attackOn.includes(e.turn)&&!done.has(e.turn)&&m.to_bp){e.respond({type:R.SELECT_IDLECMD,action:I.TO_BP,index:null});continue}
   e.respond({type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});continue}
  if(m.type===M.SELECT_BATTLECMD){
   if(attackOn.includes(e.turn)&&!done.has(e.turn)&&m.attacks.length){done.add(e.turn);e.respond({type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index:0});continue}
   e.respond({type:R.SELECT_BATTLECMD,action:m.to_m2?B.TO_M2:B.TO_EP,index:null});continue}
  e.respond(e.auto());
 }
 assert.deepEqual(e.errors.filter(x=>x.trim()),[],key+': no script errors');
 return {lp,end:[...e.lp],field:p=>e.query(p,L.MZONE).filter(Boolean).map(({code,position,race})=>({code,position,race:Number(race)}))};
}
try{
 // Sanctuary Hymn: Spirit of the Breeze gains 1000 LP at your turn-1 Standby Phase; with the Sanctuary face-up, 1000 damage.
 const breeze=[place(0,BREEZE)],sanctuary=place(0,SANCTUARY,'LOCATION_FZONE','POS_FACEUP');
 const hymn=play(['sanctuary_hymn'],{parts:[...breeze,sanctuary],turns:1}).lp[1];
 assert.deepEqual(hymn,[9000,7000],'the Fairy heals 1000, the opponent takes 1000');
 assert.deepEqual(play(['sanctuary_hymn'],{parts:breeze,turns:1}).lp[1],[9000,8000],'no Sanctuary on the field, no damage');
 assert.deepEqual(play([],{parts:[...breeze,sanctuary],turns:1}).lp[1],[9000,8000],'no relic, no damage');
 const theirs=play(['sanctuary_hymn'],{parts:[...breeze,place(1,SANCTUARY,'LOCATION_FZONE','POS_FACEUP')],turns:1}).lp[1];
 assert.deepEqual(theirs,[9000,7000],"the opponent's Sanctuary counts too: \"on the field\"");

 // Scorching Strikes: Battle Ox (1700) attacks directly on turn 3.
 const ox=[place(0,OX)];
 const direct=relics=>play(relics,{parts:ox,turns:3,attackOn:[3]}).end[1];
 assert.equal(direct([]),6300,'no relic: 1700 battle damage');
 assert.equal(direct(['cursed_scorching_strikes']),7150,'halved: 850');
 assert.equal(direct(['cursed_scorching_strikes','burn_proficiency']),8000-1275,'Burn Proficiency applies, as it is effect damage: 850 x1.5 = 1275');
 assert.equal(direct(['cursed_scorching_strikes','battle_proficiency']),8000-1275,'Battle Proficiency first (2550), then halved');
 // The opponent's Battle Ox attacks you directly on turn 2: you take the full 1700, as battle damage.
 assert.equal(play(['cursed_scorching_strikes'],{parts:[place(1,OX)],turns:2,attackOn:[2]}).end[0],6300,'damage you take is unchanged');

 // Parasite Infestation: put the face-up Paracide on top of the opponent's Deck in your turn 1, so they draw it in turn 2.
 const top=`if t==1 then local tc=Duel.GetMatchingGroup(Card.IsCode,1,LOCATION_DECK,0,nil,${PARACIDE}):GetFirst() assert(tc,'Paracide in the opponent Deck') assert(tc:IsPosition(POS_FACEUP),'face-up') Duel.MoveSequence(tc,SEQ_DECKTOP) end`;
 const infest=play(['parasite_infestation'],{parts:[place(1,OX)],main:top,turns:3});
 assert.deepEqual(infest.lp[3],[8000,7000],'they drew it: 1000 damage to them');
 const theirField=infest.field(1);
 assert.ok(theirField.some(c=>c.code===PARACIDE&&c.position===4),'Paracide Special Summoned face-up in Defense Position on their field: '+JSON.stringify(theirField));
 assert.ok(theirField.every(c=>c.race===0x800),'their monsters became Insect: '+JSON.stringify(theirField));
 assert.ok(!play([],{parts:[place(1,OX)],main:`if t==1 then assert(not Duel.IsExistingMatchingCard(Card.IsCode,1,LOCATION_DECK,0,1,nil,${PARACIDE})) end`,turns:1}).field(1).some(c=>c.code===PARACIDE),'no relic, no Paracide');
 console.log('PASS survey relics: Sanctuary Hymn, Scorching Strikes, Parasite Infestation');
}finally{try{e.destroy()}catch{}}
