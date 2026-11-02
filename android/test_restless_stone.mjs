// Restless Stone in the real core: once per turn in total, a Rock may change position the turn it arrived.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const script=artifacts=>execFileSync(python,['-B','-c',`import sys;sys.path.insert(0,'.');import passives;print(passives.script(${JSON.stringify({curses:[],artifacts,challenge_level:0})}))`],{cwd:root,encoding:'utf8'});
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
const ROCK=id('Giant Soldier of Stone'),rocks=Array(40).fill(ROCK),OX=Array(40).fill(id('Battle Ox'));
const relic=script(['restless_stone']),plain=script([]);
// Puts the top Rock of the Deck on the field at the start of Main Phase 1, so a turn can hold two arrivals.
const extraRock=`\ndo local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_MAIN1) e:SetOperation(function(e) e:Reset() Duel.SpecialSummon(Duel.GetDecktopGroup(0,1),0,0,0,false,false,POS_FACEUP_ATTACK) end) Duel.RegisterEffect(e,0) end\n`;
const idle=()=>{for(let i=0;i<60&&(e.pending?.type!==M.SELECT_IDLECMD||e.pending?.player!==0);i++)e.respond(e.auto());assert.equal(e.pending?.type,M.SELECT_IDLECMD,'reached your Main Phase');return e.pending};
const place=()=>{for(let i=0;i<8&&e.pending&&e.pending.type!==M.SELECT_IDLECMD;i++)e.respond(e.auto())};
const act=(action,index)=>{e.respond({type:R.SELECT_IDLECMD,action,index});place();return idle()};
const start=source=>{e.start(rocks,OX,8000,8000,5,3,[],[],source);return idle()};

let m=start(plain);m=act(I.SELECT_SUMMON,0);assert.equal(m.pos_changes.length,0,'without the relic a Summoned monster stays put');
m=start(relic);m=act(I.SELECT_SUMMON,0);assert.equal(m.pos_changes.length,1,'with it the Rock can move');
m=act(I.SELECT_POS_CHANGE,0);assert.equal(m.pos_changes.length,0,'it moves once');
// Two arrivals in one turn: moving either blocks the other.
m=start(relic+extraRock);assert.equal(m.pos_changes.length,1,'the first Rock can move');m=act(I.SELECT_SUMMON,0);assert.equal(m.pos_changes.length,2,'so can the second');
m=act(I.SELECT_POS_CHANGE,0);assert.equal(m.pos_changes.length,0,'one move spends it for both');
// Set and flipped the same turn: the flip is the use.
m=start(relic+extraRock);m=act(I.SELECT_MONSTER_SET,0);assert.equal(m.pos_changes.length,2,'the Set Rock can flip and the other can move');
const set=m.pos_changes.findIndex(c=>e.query(0,L.MZONE)[c.sequence]?.position&10);assert(set>=0,'the Set Rock is offered');
m=act(I.SELECT_POS_CHANGE,set);assert.equal(m.pos_changes.length,0,'the flip spends it, for itself as well');
assert.deepEqual(e.errors,[],'no script errors');console.log('PASS Restless Stone: once per turn across Rocks, and a same-turn flip counts');process.exit(0);
