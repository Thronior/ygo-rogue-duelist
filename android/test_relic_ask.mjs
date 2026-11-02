// A relic's own prompt: the core sends the art cue just before the prompt, and a relic that asks nothing sends none.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M} from './web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const script=artifacts=>execFileSync(python,['-B','-c',`import sys;sys.path.insert(0,'.');import passives;print(passives.script(${JSON.stringify({curses:[],artifacts,challenge_level:0})}))`],{cwd:root,encoding:'utf8'});
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
const ox=Array(40).fill(id('Battle Ox')),bug=Array(40).fill(id('Man-Eater Bug'));
// Plays on with the policy, keeping every cue, until the relic asks or the turn limit passes.
const play=relics=>{e.start(ox,bug,8000,8000,5,3,[],[],script(relics));const seen=[];for(let i=0;i<300&&e.pending&&e.turn<=6;i++){const asked=e.visuals.splice(0).filter(c=>c.kind==='relic-ask');seen.push(...asked);if(asked.length)return {seen,prompt:e.pending};e.respond(e.auto())}return {seen,prompt:null}};
const {seen,prompt}=play(['mind_reader']);
assert.deepEqual(seen,[{kind:'relic-ask',relic:'mind_reader'}],'Mind Reader sends one cue');
assert.equal(prompt?.player,0,'the prompt is yours');assert.equal(prompt?.type,M.SELECT_CARD,'and it is waiting right after the cue');
assert.deepEqual(play(['scarab']).seen,[],'a relic with no prompt sends none');
assert.deepEqual(e.errors,[],'no script errors');console.log('PASS relic art cue: arrives before the prompt, and only for relics that ask');process.exit(0);
