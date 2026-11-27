// The randomized Kaiser Colosseum effect is enforced like Rivalry of Warlords (MonkehestMan, Discord 2026-11-26, user:
// "true"): while its controller has a monster, an opponent with more monsters sends the extra ones to the GY.
//   runtime/ai/node.exe tools/test_randomizer_kaiser_nov26.mjs
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel} from '../android/web/duel.js';import {M,R,L,I} from '../android/web/engine.js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),WEB=path.join(ROOT,'android','web');
const readJson=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^﻿/,''));
const file=path.join(os.tmpdir(),`randomizer-kaiser-${process.pid}.json`);
execFileSync(path.join(ROOT,'python','python.exe'),['-B',path.join(ROOT,'tools','randomizer_kaiser_card_nov26.py'),file],{stdio:'inherit'});
const {card,script}=readJson(file);fs.rmSync(file,{force:true});
assert.match(card.desc,/they send any extra ones to the GY/);
const meta=readJson(path.join(WEB,'content.json')),data=readJson(path.join(WEB,'engine-data.json')),scripts=readJson(path.join(WEB,'scripts.json'));
scripts['randomizer.lua']=fs.readFileSync(path.join(ROOT,'data','randomizer','randomizer.lua'),'utf8');data[card.id]=card.data;scripts[`c${card.id}.lua`]=script;
const engine=await new MobileDuel([...meta.cards,...(meta.tokenCards||[]),card]).init([data,scripts]);
const id=n=>meta.cards.find(c=>c.name===n).id;
const put=(p,code,loc,pos)=>`Duel.MoveToField(Duel.CreateToken(${p},${code}),${p},${p},${loc},${pos},true)`;
const setup=`\nlocal e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetCountLimit(1) e:SetOperation(function(e) e:Reset() ${put(1,id('Battle Ox'),'LOCATION_MZONE','POS_FACEUP_ATTACK')} ${put(1,id('Kuriboh'),'LOCATION_MZONE','POS_FACEUP_ATTACK')} ${put(1,id('Mystical Elf'),'LOCATION_MZONE','POS_FACEUP_ATTACK')} ${put(0,id('Vorse Raider'),'LOCATION_MZONE','POS_FACEUP_ATTACK')} Duel.SendtoHand(Duel.CreateToken(0,${card.id}),nil,REASON_RULE) end) Duel.RegisterEffect(e,0)`;
let state=engine.start(Array(40).fill(id('Kuriboh')),Array(40).fill(id('Kuriboh')),8000,8000,5,7,[],[],setup);
let activated=false;
for(let n=0;n<80&&!state.finished;n++){const m=engine.pending;
 if(m?.type===M.SELECT_IDLECMD&&m.player===0){if(activated)break;const i=m.activates.findIndex(c=>c.code===card.id);assert(i>=0,'the card can be activated');activated=true;state=engine.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:i});continue}
 state=engine.respond(engine.auto());}
assert.equal(engine.query(0,L.MZONE).filter(Boolean).length,1);
assert.equal(engine.query(1,L.MZONE).filter(Boolean).length,1,'the opponent keeps only as many monsters as the card\'s controller');
assert.equal(engine.query(1,L.GRAVE).length,2,'the 2 extra monsters went to the GY');
assert.equal((engine.errors||[]).length,0,JSON.stringify(engine.errors));
console.log('PASS randomizer Kaiser Colosseum: the opponent\'s extra monsters go to the GY; text says so');
