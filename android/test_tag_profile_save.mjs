// Tag progress reaches the device without pressing Exit (Discord, 2026-11-18: a Twin-Headed Thunder Dragon sleeve went
// missing after Tag wins). TagUI.saveProfile writes the profile with 'tag-profile' whenever its counters change.
import assert from 'node:assert/strict';
Object.assign(globalThis,{window:globalThis,Audio:class{},addEventListener(){},innerHeight:800,
 document:{hidden:false,addEventListener(){},removeEventListener(){},querySelector(){return null},querySelectorAll(){return []}},location:{search:''},
 localStorage:{getItem(){return null},setItem(){},removeItem(){}}});
const {TagUI}=await import('./web/tag-ui.js');
const calls=[],ui={backend:async(action,value)=>{calls.push([action,value])}};
const save=p=>TagUI.prototype.saveProfile.call(ui,p);
const base={wins:3,victories:20,runs:5,won_as:[1],character_levels:{1:2},sleeves_earned:['a'],run_history:[{}]};
save(base);assert.equal(calls.length,0,'the first view is the starting point');
save({...base});assert.equal(calls.length,0,'nothing changed');
const won={...base,wins:4,won_as:[1,20],sleeves_earned:['a','twin-headed-thunder-dragon']};
save(won);assert.deepEqual(calls,[['tag-profile',won]],'a finished run is saved at once');
save(won);assert.equal(calls.length,1,'once');
console.log('PASS Tag profile saved on change: first view skipped, unchanged skipped, a win saved once');
