// Final Message (fused Destiny Hourglass + Sealed Fate, user 2026-11-24): Destiny Board from the Deck face-up at the start
// of the Duel; Destiny Board and Spirit Messages we control, face-up or Set, can't be targeted or destroyed by card effects.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const web=new URL('./web/',import.meta.url),root=new URL('../',import.meta.url);
const read=f=>JSON.parse(fs.readFileSync(new URL(f,web),'utf8').replace(/^﻿/,''));
const content=read('content.json'),data=read('engine-data.json'),scripts=read('scripts.json');
const {MobileDuel,M,L}=await import(new URL('duel.js',web));
const python=fileURLToPath(new URL('python/python.exe',root));
const script=key=>execFileSync(fs.existsSync(python)?python:'python',['-B','-c',`import sys;sys.path.insert(0,'.');import passives;print(passives.script({'artifacts':['${key}'],'curses':[],'round':1,'character':0,'lp':8000},telemetry=False))`],{cwd:fileURLToPath(root),encoding:'utf8'});
const BOARD=94212438,deck=[BOARD,...Array(39).fill(89631139)],enemy=Array(40).fill(89631139);
const duel=await new MobileDuel([...content.cards,...(content.tokenCards||[])]).init([data,scripts]);
let st=duel.start(deck,enemy,8000,8000,5,7,[],[],script('final_message'),5,null,null);
for(let i=0;i<50&&!st.finished;i++){const m=duel.pending;if(!m||m.player===0&&m.type===M.SELECT_IDLECMD)break;st=duel.respond(duel.auto())}
const board=duel.query(0,L.SZONE).filter(Boolean).find(c=>c.code===BOARD);
assert.ok(board&&(board.position&1),'Destiny Board starts face-up in the Spell & Trap Zone');
duel.core.loadScript(duel.h,'probe.lua',"local m=Debug.AddCard(31893528,0,0,LOCATION_SZONE,3,POS_FACEDOWN) local b=Duel.GetFirstMatchingCard(Card.IsCode,0,LOCATION_SZONE,0,nil,94212438) Debug.Message('board='..tostring(b:IsHasEffect(EFFECT_INDESTRUCTABLE_EFFECT)~=nil)..','..tostring(b:IsHasEffect(EFFECT_CANNOT_BE_EFFECT_TARGET)~=nil)..' set='..tostring(m:IsHasEffect(EFFECT_INDESTRUCTABLE_EFFECT)~=nil)..','..tostring(m:IsHasEffect(EFFECT_CANNOT_BE_EFFECT_TARGET)~=nil))");
assert.ok(duel.errors.includes('board=true,true set=true,true'),duel.errors.join(' | '));
duel.destroy();
console.log('PASS Final Message places Destiny Board and protects Destiny Board and Spirit Messages, face-up or Set');
