import assert from 'node:assert/strict';
import {applyCommandUpdate,phaseCheckpoint} from '../android/web/state-update.js';
const state={run:{pool:[1,2],selected:[0],mobile_duel:{responses:[]}},profile:{wins:3},settings:{music:40},registeredCards:[1]};
const next=applyCommandUpdate(state,{partial:true,runPatch:{selected:[1]}},'toggle');assert.deepEqual(next.run.selected,[1]);assert.equal(next.run.pool,state.run.pool);assert.equal(next.profile,state.profile);assert.equal(next.registeredCards,state.registeredCards);
assert.equal(applyCommandUpdate(next,{partial:true,persist:false,result:[]},'active-curses'),next);
applyCommandUpdate(next,{partial:true,duelResponse:{type:1}},'response');assert.equal(next.run.mobile_duel.responses.length,1);
assert.equal(phaseCheckpoint({turn:1,phase:4},{turn:1,phase:4}),false);assert.equal(phaseCheckpoint({turn:1,phase:4},{turn:2,phase:4}),true);assert.equal(phaseCheckpoint({turn:1,phase:4},{turn:1,phase:8}),true);
console.log('PASS partial updates preserve unrelated state and phase/turn checkpoint detection');
