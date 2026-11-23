// Auto-Pick Single Choices (user, 2026-11-23; on by default, silent): mobile.js autoSingle answers a card prompt only
// when every listed card must be chosen and it cannot be cancelled. Runs the real function from mobile.js.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {M,R} from './web/duel.js';
const src=fs.readFileSync(new URL('./web/mobile.js',import.meta.url),'utf8');
const start=src.indexOf('function autoSingle(m){'),end=src.indexOf('\n}',start)+2;
assert.ok(start>0,'autoSingle exists');
const make=(env)=>new Function('M','R','state','lesson','screen','tagUI',src.slice(start,end)+'\nreturn autoSingle;')(M,R,env.state,env.lesson,env.screen,env.tagUI);
const env={state:{settings:{}},lesson:null,screen:'duel',tagUI:null};
const pick=make(env),card=(extra={})=>({code:46986414,...extra});
const prompt=(o)=>({type:M.SELECT_CARD,player:0,min:1,max:1,can_cancel:false,selects:[card()],...o});
assert.deepEqual(pick(prompt()),{type:R.SELECT_CARD,indicies:[0]},'one card, one to pick: picked');
assert.deepEqual(pick(prompt({min:2,max:2,selects:[card(),card()]})),{type:R.SELECT_CARD,indicies:[0,1]},'every card must be picked');
assert.equal(pick(prompt({selects:[card(),card()]})),null,'a real choice still asks');
assert.equal(pick(prompt({can_cancel:true})),null,'a prompt with Cancel still asks (attack target)');
assert.equal(pick(prompt({min:0})),null,'an optional pick still asks');
assert.equal(pick(prompt({player:1})),null,'never for the opponent');
assert.deepEqual(pick({type:M.SELECT_TRIBUTE,player:0,min:1,max:1,can_cancel:false,selects:[card()]}),{type:R.SELECT_TRIBUTE,indicies:[0]},'the only Tribute');
assert.equal(pick({type:M.SELECT_TRIBUTE,player:0,min:2,max:2,can_cancel:false,selects:[card()]}),null,'not enough to tribute: asks');
assert.equal(pick({type:M.SELECT_SUM,player:0,min:1,max:1,selects:[card()]}),null,'material sums still ask');
assert.equal(make({...env,state:{settings:{autoPickSingle:false}}})(prompt()),null,'off in Settings');
assert.equal(make({...env,lesson:{}})(prompt()),null,'the tutorial still asks');
console.log('PASS Auto-Pick Single Choices: only forced, uncancellable card prompts answer themselves');
