import assert from 'node:assert/strict';
import fs from 'node:fs';
import {groupStacks,stackButton,tapIntent,applyTaps,steadyTap,STEADY_MS} from './web/deck-stacks.js';
import {mountRelated} from './web/related-cards.js';
// Deck editor bugs from Nori (Discord, 2026-11-20, v0.2.39):
// 1. Related Cards + sometimes put the run's randomized namesake in the deck instead of the card shown.
// 2. Quick taps on a stack's − kept putting copies back: every tap toggled the copy the not-yet-redrawn grid named.

// --- 2. Stacked taps keep what they meant -------------------------------------------------------------------------
const run={pool:[10,10,10,20,20],selected:[0,1,2,3]};
const tile=i=>`<button class="cardbtn" data-pick="${i}" aria-pressed="false"><img><span>x</span></button>`;
const s=groupStacks([0,1,2,3,4],run,run.selected,3),dom=i=>stackButton(tile(i),s.stack(i),{attr:'data-pick'});
assert.match(dom(0),/data-stack-op="clear"/,'a full stack clears');
assert.match(dom(0),/class="stack-minus"[^>]*data-pick="2" data-stack-op="remove"/,'− removes one');
assert.match(dom(3),/data-pick="4" data-stack-op="add"/,'a part-filled stack adds the spare copy');
const el=html=>{const m=[...html.matchAll(/data-(pick|stack-op|stack-clear)="([^"]*)"/g)];const d={};for(const [,k,v] of m)d[k==='pick'?'pick':k==='stack-op'?'stackOp':'stackClear']??=v;return {dataset:d}};
const minus=html=>el(html.slice(html.indexOf('stack-minus')));

// Five quick − taps on the same stale grid: three copies come out, nothing goes back in.
let r=applyTaps(run,run.selected,Array(5).fill(tapIntent(minus(dom(0)))),3);
assert.deepEqual(r.toggles,[2,1,0]);assert.deepEqual(r.selected,[3]);
// The old toggle would have flipped copy 2 five times (out, in, out, in, out).
// Two quick taps on a full stack: the second clears nothing more instead of putting all three back.
r=applyTaps(run,run.selected,[tapIntent(el(dom(0))),tapIntent(el(dom(0)))],3);assert.deepEqual(r.selected,[3]);
// Quick adds take the next spare copy and stop at the copy limit.
const two={pool:[10,10,10,10],selected:[0]},g2=groupStacks([0,1,2,3],two,two.selected,3);
const add=tapIntent(el(stackButton(tile(0),g2.stack(0),{attr:'data-pick'})));assert.equal(add.op,'add');
r=applyTaps(two,two.selected,[add,add,add],3);assert.deepEqual(r.selected,[0,1,2]);assert.equal(r.blocked,1);
assert.equal(applyTaps(two,[0,1,2],[add],null).toggles.length,1,'no limit given: the backend decides');
// A misprinted copy is its own stack; − on it never takes a plain copy.
const mis={pool:[10,10],selected:[1],card_mods:{0:[1]}};
assert.deepEqual(applyTaps(mis,[1],[{op:'remove',index:0}]).toggles,[],'misprint already out');
// Without stacks a tap still toggles, so a double tap on a plain card is in-then-out as before.
assert.deepEqual(applyTaps(run,[3],[tapIntent({dataset:{pick:'4'}}),tapIntent({dataset:{pick:'4'}})]).toggles,[4,4]);
assert.deepEqual(tapIntent({dataset:{index:'7',stackOp:'remove'}},'index'),{op:'remove',index:7},'Tag reads data-index');

// Once the − is gone (stack empty), the next quick tap lands on the stack itself: it keeps taking out (nothing) instead
// of putting a copy back. A pause, or another stack, adds as usual.
const plusTap={op:'add',index:0},minusTap={op:'remove',index:2};
assert.equal(steadyTap(run,minusTap,1000).op,'remove');
assert.equal(steadyTap(run,plusTap,1000+STEADY_MS-50).op,'remove','quick tap after − on the same stack');
assert.equal(steadyTap(run,plusTap,1000+2*STEADY_MS-100).op,'remove','the window restarts on each take-out');
assert.equal(steadyTap(run,plusTap,1000+4*STEADY_MS).op,'add','after a pause it adds');
steadyTap(run,{op:'clear',index:0},5000);assert.equal(steadyTap(run,{op:'add',index:3},5100).op,'add','another stack adds');
steadyTap(run,{op:'clear',index:0},6000);assert.equal(steadyTap(run,plusTap,6100).op,'remove','a quick tap after a full stack cleared');
assert.equal(applyTaps(run,[3],[{op:'remove',index:0}]).toggles.length,0,'and it does nothing on the empty stack');

// Solo and Tag wiring: solo queues taps and sends one toggle list; Tag resolves the tap after any wait and redraws once a frame.
const mobile=fs.readFileSync(new URL('./web/mobile.js',import.meta.url),'utf8'),tag=fs.readFileSync(new URL('./web/tag-ui.js',import.meta.url),'utf8');
assert.match(mobile,/deckTaps\.push\(steadyTap\(state\.run,tapIntent\(el\)\)\)/);
assert.match(mobile,/function tapDraft\(el\)\{[^}]*queueDeckTap\(el\)/);
assert.match(mobile,/command\('toggle',toggles\.length>1\?toggles:toggles\[0\]\)/);
assert.match(mobile,/if\(changed&&!deckTaps\.length\)\{changed=false;updateDraft\(\)/,'one redraw per burst');
assert.match(mobile,/grid\.innerHTML=draftGridCards\(r,true\)/,'a tap keeps the stacked layout');
assert.match(tag,/const tap=steadyTap\(this\.view\.run,tapIntent\(el,'index'\)\);[\s\S]{0,200}unlockForEdit\(\);[\s\S]{0,80}applyTaps\(this\.view\.run,this\.view\.run\.selected,\[tap\]\)/);
assert.match(tag,/this\.renderSoon\(\);return;/);assert.match(tag,/if\(this\.renderFrame\)\{cancelAnimationFrame/);
const backend=fs.readFileSync(new URL('./mobile_backend.py',import.meta.url),'utf8');
assert.match(backend,/for index in \(value if isinstance\(value,list\) else \[value\]\)/,'the backend takes a toggle list');

// --- 1. Related Cards adds the card shown, never a randomized namesake ---------------------------------------------
const cards=[{id:1,name:'Des Dendle',desc:'"Vampiric Orchis"'},{id:2,name:'Vampiric Orchis',desc:''},{id:3,name:'Vampiric Orchis',desc:''},{id:191000005,name:'Vampiric Orchis',desc:'',randomized:{}}];
const card=id=>cards.find(c=>c.id===Number(id));
const pool=[191000005,3,2,1],sel=[3],toggled=[];
const deck=()=>({run:{pool,selected:sel},editable:true,toggle:async i=>{toggled.push(i);const at=sel.indexOf(i);if(at>=0)sel.splice(at,1);else sel.push(i)}});
class Panel{constructor(){this.isConnected=true;this.scrollTop=0;this.dataset={};this.handlers={}}set innerHTML(v){this.html=v}get innerHTML(){return this.html}addEventListener(t,f){this.handlers[t]=f}contains(){return true}}
const panel=new Panel();
mountRelated(panel,1,{cards:cards.filter(c=>c.id<191000000),archetypes:[],card,image:()=>'',inspect:()=>{},deck});
assert.match(panel.innerHTML,/0\/2/,'the randomized namesake is not counted as owned');
const click=async data=>panel.handlers.click({target:{closest:()=>({dataset:data,disabled:false})},stopPropagation(){},preventDefault(){}});
await click({relatedAdd:'2'});assert.deepEqual(toggled,[2],'the exact card shown (pool index 2), not the randomized one at 0');
await click({relatedAdd:'2'});assert.deepEqual(toggled,[2,1],'then its alternate art');
await click({relatedAdd:'2'});assert.deepEqual(toggled,[2,1],'never the randomized copy');
console.log('deck editor nov20 ok');
