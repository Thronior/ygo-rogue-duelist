// A relic's own prompt: the core sends the art cue just before the prompt, and a relic that asks nothing sends none.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R} from './web/duel.js';
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
// The prompt names its relic itself, whatever the motion settings (Discord, Deds, 2026-11-21).
assert.equal(prompt?.relic,'mind_reader','the prompt carries the relic that asks');
// Every prompt of a relic carries it: Dark Lotus asks yes/no, then a pick, then the summon's own prompts. Prompts
// after it (turn flow, card effects) carry none.
{
 const {prompt:ask}=play(['dark_lotus']),labelled=[],plain=[];
 assert.equal(ask?.type,M.SELECT_YESNO,'Dark Lotus asks first');
 for(let i=0,m=ask;i<400&&m&&e.turn<=6;i++,m=e.pending){
  (m.relic?labelled:plain).push(m);
  e.respond(m===ask?{type:R.SELECT_YESNO,yes:true}:e.auto());
 }
 const first=plain.findIndex(m=>m.player===0);
 assert.ok(labelled.length>=2&&labelled.every(m=>m.relic==='dark_lotus'&&m.player===0),'yes/no and the pick both name Dark Lotus: '+labelled.map(m=>m.type));
 assert.ok(first>=0&&plain.slice(first).every(m=>!m.relic),'later prompts name no relic');
}
{
 e.start(ox,bug,8000,8000,5,3,[],[],script(['scarab']));
 for(let i=0;i<200&&e.pending&&e.turn<=4;i++){assert.ok(!e.pending.relic,'no relic, no relic name');e.respond(e.auto())}
}
// Relic code never asks anonymously: each prompt in a relic's Lua has its relic hint right before it.
const audit=execFileSync(python,['-B','-c',`import sys,re;sys.path.insert(0,'.');import passives
keys=list(passives.ART_INFO);base=set(passives.script({'artifacts':[],'curses':[],'challenge_level':0}).splitlines())
P=re.compile(r'Duel\\.(?:SelectYesNo|SelectEffectYesNo|SelectMatchingCard|SelectTarget|SelectOption|Announce\\w+|SelectPosition|SelectReleaseGroup|SelectTribute|SelectDisableField|SelectCardsFromCodes)\\(0\\b|:(?:Select|SelectUnselect|SelectWithSumEqual|FilterSelect|CancelableSelect|SelectSubGroup)\\(0\\b')
bad=[]
for i,k in enumerate(keys):
 text=' '.join(l for l in passives.script({'artifacts':[k],'curses':[],'challenge_level':0}).splitlines() if l not in base)
 for m in P.finditer(text):
  before=text[:m.start()];at=max(before.rfind(str(1850000000+i)),before.rfind(str(1860000000+i)))
  # A prompt nested in a call (Duel.Destroy(g:Select(0,...))) runs before that call.
  gap=re.sub(r'Duel\\.\\w+\\(\\w*$','',before[at:] if at>=0 else before)
  if at<0 or re.search(r'Duel\\.(?!Hint\\()|\\bend\\b|function\\(',gap[11:]):bad.append(k+': '+text[max(0,m.start()-80):m.end()])
print(len(keys));print('\\n'.join(bad))`],{cwd:root,encoding:'utf8'}).trim().split('\n');
assert.ok(Number(audit[0])>250,'every relic checked');assert.deepEqual(audit.slice(1),[],'relic prompts without a relic hint');
assert.deepEqual(e.errors,[],'no script errors');console.log('PASS relic art cue: arrives before the prompt, and only for relics that ask; relic prompts name their relic; no relic prompt is anonymous');process.exit(0);
