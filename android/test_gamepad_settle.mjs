// Stuck sensor "gamepads" (fingerprint readers on some phones) must never drive pad mode (player report, 2026-11-13).
import assert from 'node:assert/strict';
import {settle} from './web/gamepad.js';
const read=(lx=0,b0=false)=>({pressed:[b0,...new Array(15).fill(false)],lx,ly:0,rx:0,ry:0});
const rest=new Map();
// An axis stuck at 1 and a button held from the start are ignored until they are seen at rest.
for(let i=0;i<5;i++){const s=settle(rest,'0:fpc',read(1,true));assert.equal(s.lx,0);assert.equal(s.pressed[0],false)}
// A real pad rests first, then its input counts.
settle(rest,'1:xbox',read(0,false));
const moved=settle(rest,'1:xbox',read(.9,true));assert.equal(moved.lx,.9);assert.equal(moved.pressed[0],true);
// Once the stuck pad returns to rest, it works normally too.
settle(rest,'0:fpc',read(0,false));assert.equal(settle(rest,'0:fpc',read(-.8,true)).lx,-.8);
console.log('PASS gamepad inputs count only after being seen at rest');
