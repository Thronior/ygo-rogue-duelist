// Split Deck Editor setting: Auto splits from 18 per row by itself; the setting splits from 10, fixed size or Auto.
// The Deck side shows 5 per row below 18 and 8 from 18; the Collection side gets the rest.
import assert from 'node:assert/strict';
const attrs=new Set(),style={};
globalThis.document={documentElement:{hasAttribute:a=>attrs.has(a),style:{getPropertyValue:k=>style[k]??''}}};
const {deckSplitColumns,splitStyle}=await import('./web/card-search.js');
const at=({fixed=0,setting=false})=>{attrs.clear();if(fixed){attrs.add('data-deck-columns');style['--deck-columns']=String(fixed)}if(setting)attrs.add('data-deck-split')};
const split=(opts,auto)=>{at(opts);return deckSplitColumns(null,null,auto)};
assert.equal(split({},17),0,'Auto alone keeps one grid below 18');
assert.equal(split({},18),18,'Auto alone splits from 18');
assert.equal(split({setting:true},9),0,'the setting needs 10 per row');
assert.equal(split({setting:true},10),10,'the setting splits Auto from 10');
assert.equal(split({fixed:12},30),0,'a fixed size without the setting keeps one grid');
assert.equal(split({fixed:20},30),0,'even a fixed 20 needs the setting');
assert.equal(split({fixed:12,setting:true},30),12,'the setting splits a fixed 12, ignoring Auto');
assert.equal(split({fixed:9,setting:true},30),0,'a fixed 9 is below the minimum');
const cols=s=>s.match(/--split-deck:(\d+);--split-rest:(\d+)/).slice(1).map(Number);
assert.deepEqual(cols(splitStyle(10)),[5,5]);
assert.deepEqual(cols(splitStyle(17)),[5,12]);
assert.deepEqual(cols(splitStyle(18)),[8,10]);
assert.deepEqual(cols(splitStyle(20)),[8,12]);
console.log('PASS Split Deck Editor: from 10 per row with the setting, deck side 5 (8 from 18)');
