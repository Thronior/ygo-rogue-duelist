// Loyalty covers face-down monsters too (Discord 2026-11-24, MonkehestMan: a Tag opponent's Change of Heart took a
// face-down monster). Field effects skip Set cards unless EFFECT_FLAG_SET_AVAILABLE; player 0 is the whole Tag team.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const web=new URL('./web/',import.meta.url),root=new URL('../',import.meta.url);
const read=f=>JSON.parse(fs.readFileSync(new URL(f,web),'utf8').replace(/^﻿/,''));
const content=read('content.json'),data=read('engine-data.json'),scripts=read('scripts.json');
const {DuelEngine}=await import(new URL('engine.js',web));
const python=fileURLToPath(new URL('python/python.exe',root));
const loyalty=execFileSync(fs.existsSync(python)?python:'python',['-B','-c',"import sys;sys.path.insert(0,'.');import passives;print(passives.script({'artifacts':['loyalty'],'curses':[],'round':1,'character':0,'lp':8000},telemetry=False))"],{cwd:fileURLToPath(root),encoding:'utf8'});
const mon=Array(40).fill(89631139),coh=Array(40).fill(4031928);
for(const tag of [false,true]){
 const duel=await new DuelEngine([...content.cards,...(content.tokenCards||[])]).init([data,scripts]);
 duel.start(mon,coh,8000,8000,5,7,[],[],loyalty,5,tag?[[{main:mon},{main:mon}],[{main:coh},{main:coh}]]:null,null);
 duel.core.loadScript(duel.h,'probe.lua',"local down=Debug.AddCard(89631139,0,0,LOCATION_MZONE,2,POS_FACEDOWN_DEFENSE) local up=Debug.AddCard(89631139,0,0,LOCATION_MZONE,3,POS_FACEUP_ATTACK) Debug.Message('down='..tostring(down:IsControlerCanBeChanged())..' up='..tostring(up:IsControlerCanBeChanged()))");
 assert.ok(duel.errors.includes('down=false up=false'),(tag?'Tag: ':'Solo: ')+duel.errors.join(' | '));
 duel.destroy();
}
console.log('PASS Loyalty stops control changes of face-up and face-down monsters, solo and Tag');
