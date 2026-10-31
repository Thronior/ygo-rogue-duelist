// Weighted Coins and Weighted Dice in real engine duels: exact odds for the owner, none for the opponent.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MobileDuel} from './web/duel.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const json=path=>JSON.parse(fs.readFileSync(root+path,'utf8').replace(/^﻿/,''));
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const relics=run=>execFileSync(python,['-B','-c',`import sys;sys.path.insert(0,".")\nimport passives\nprint(passives.script(${run}))`],{cwd:root}).toString();
const cards=json('data/era-cards.json'),scripts=json('android/web/scripts.json');
scripts['rogue-rng.lua']=fs.readFileSync(root+'runtime/script/rogue-rng.lua','utf8');
const engine=[json('android/web/engine-data.json'),scripts];
const VORSE=14898066,PER_DUEL=300,DUELS=12,N=PER_DUEL*DUELS;

// Both players toss during the first Draw Phase; each side's LP ends as 1 + the number of hits.
const tosses=(toss,hit)=>`
do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PREDRAW) e:SetCountLimit(1)
 e:SetOperation(function() local a,b=0,0
  for i=1,${PER_DUEL} do if Duel.${toss}(0,1)==${hit} then a=a+1 end if Duel.${toss}(1,1)==${hit} then b=b+1 end end
  Duel.SetLP(0,a+1) Duel.SetLP(1,b+1) end)
 Duel.RegisterEffect(e,0) end`;
async function hits(run,toss,hit){
 const script=relics(run)+tosses(toss,hit);let own=0,other=0;
 for(let seed=1;seed<=DUELS;seed++){
  const duel=await new MobileDuel(cards).init(engine);
  duel.start(Array(40).fill(VORSE),Array(40).fill(VORSE),8000,8000,5,seed,[],[],script,0);
  own+=duel.lp[0]-1;other+=duel.lp[1]-1;
 }
 return {own,other};
}
const near=(value,rate,label)=>assert.ok(Math.abs(value/N-rate)<.03,`${label}: ${value/N} vs ${rate}`);

let row=await hits(`dict(character=0,artifacts=['weighted_coins'],round=0,curses=[],weighted_coin=0)`,'TossCoin','COIN_TAILS');
near(row.own,2/3,'chosen tails');near(row.other,1/2,'opponent coins');
row=await hits(`dict(character=0,artifacts=['weighted_coins'],round=0,curses=[],weighted_coin=1)`,'TossCoin','COIN_HEADS');
near(row.own,2/3,'chosen heads');near(row.other,1/2,'opponent coins');
for(const face of [1,6]){
 row=await hits(`dict(character=0,artifacts=['weighted_dice'],round=0,curses=[],weighted_die=${face})`,'TossDice',face);
 near(row.own,3/8,`chosen ${face}`);near(row.other,1/6,'opponent dice');
}
const other=await hits(`dict(character=0,artifacts=['weighted_dice'],round=0,curses=[],weighted_die=6)`,'TossDice',2);
near(other.own,1/8,'another face');
const plain=await hits(`dict(character=0,artifacts=[],round=0,curses=[])`,'TossCoin','COIN_HEADS');
near(plain.own,1/2,'no relic');
console.log('PASS Weighted Coins 2:1 and Weighted Dice 3:1 for their owner only, in real engine duels');
