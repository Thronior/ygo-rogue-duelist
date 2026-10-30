// A trigger that resolves without changing anything (a negated Sinister Serpent, flag 85078d57, v0.2.9) is
// offered again at once. The CPU said yes forever; it now declines a repeat while the board is unchanged.
import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M,R,L} from './web/duel.js';
const meta=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url))),data=JSON.parse(fs.readFileSync(new URL('./web/engine-data.json',import.meta.url)));
const serpent=meta.cards.find(c=>c.name==='Sinister Serpent').id;
const e=new MobileDuel(meta.cards);let zones={};
Object.assign(e,{data,lp:[8000,8000],turn:4,player:1,phase:2,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}});
e.query=(p,loc)=>zones[p+':'+loc]||[];
zones['1:'+L.GRAVE]=[{code:serpent,controller:1,location:L.GRAVE,sequence:0,position:1}];
const prompt={type:M.SELECT_EFFECTYN,player:1,code:serpent};
// The first offer is accepted and remembered with the board as it was.
e.lastEffectYes={key:e.effectYesKey(prompt),board:e.effectYesBoard()};
assert.deepEqual(e.auto(prompt),{type:R.SELECT_EFFECTYN,yes:false},'an identical repeat is declined');
// Once the effect did something (the Serpent left the Graveyard), a new offer is judged normally again.
zones['1:'+L.GRAVE]=[];zones['1:'+L.HAND]=[{code:serpent,controller:1,location:L.HAND,sequence:0,position:10}];
assert.equal(e.effectYesRepeats(prompt),false);
// A new phase or turn is never treated as a repeat.
zones={['1:'+L.GRAVE]:[{code:serpent,controller:1,location:L.GRAVE,sequence:0,position:1}]};e.lastEffectYes={key:e.effectYesKey(prompt),board:e.effectYesBoard()};e.turn=6;
assert.equal(e.effectYesRepeats(prompt),false);
console.log('PASS repeated no-op effect prompts are declined; changed boards and new turns are not');
