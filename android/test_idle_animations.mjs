// Idle battery guard (2026-11-07). A screen the player is just looking at must not keep the device busy.
// Any running animation makes the browser redraw the screen on every display refresh (60-120 times a second),
// and one that animates a paint property (box-shadow, background, colour) also re-runs style, layout and
// paint on the main thread for each of those frames. Measured with tools/measure_idle_load.cjs: the duel's
// ambient motes cost 158% CPU against 37% without them; one ultra item's glow cost the shop 111% against 5%.
// So the endless loops a player looks at tick on one shared 50 ms clock: steps() in mobile.css, and
// ambient-clock.js lining every stepped loop up on the same ticks. Fast movers may use half-ticks (40 Hz).
import fs from 'node:fs';import assert from 'node:assert/strict';
import {snapToClock,screenTick,TICK} from './web/ambient-clock.js';
const read=f=>fs.readFileSync(new URL('./web/'+f,import.meta.url),'utf8');
const css=read('mobile.css').replace(/\/\*[\s\S]*?\*\//g,''),HZ=20,PERIOD=1/HZ,EPS=1e-6,MAX_RATE=HZ*1.001;// keyframe offsets are written to 4 decimals
const COMPOSITED=new Set(['transform','translate','rotate','scale','opacity']);
// Fast movers on the clock's half-ticks: at 20 Hz they would jump 3-9 px per tick.
const HALF_TICK=new Set(['pack-spark','pack-dust','pack-foil-loop','tag-arrow-shine']);
// Endless loops still smooth, on screens a player rarely sees. Do not add idle-screen loops here.
const KNOWN_SMOOTH={'badge-rainbow':'challenge level 6 badge'};
const limit=name=>(HALF_TICK.has(name)?2*HZ:HZ)*1.001;
// The game's global presentation slowdown (animation-speed.js), which stretches element animations on screen.
const SCALE=Number(read('animation-speed.js').match(/const scale=([\d.]+)/)[1]);
assert.equal(SCALE,1.2,'animation-speed.js scale');

function keyframes(name){
 const at=css.indexOf(`@keyframes ${name}{`);if(at<0)return null;
 let depth=0,i=css.indexOf('{',at);const start=i;
 do{if(css[i]==='{')depth++;else if(css[i]==='}')depth--;i++}while(depth&&i<css.length);
 const body=css.slice(start+1,i-1),frames=[];
 for(const m of body.matchAll(/([\d.%,\sfromto]+)\{([^}]*)\}/g)){
  const props=[...m[2].matchAll(/([a-z-]+)\s*:/g)].map(p=>p[1]);
  for(const o of m[1].split(','))frames.push({offset:o.trim()==='from'?0:o.trim()==='to'?1:parseFloat(o)/100,props});
 }
 return frames.sort((a,b)=>a.offset-b.offset);
}
const seconds=t=>/ms$/.test(t)?parseFloat(t)/1000:parseFloat(t);
// Every endless animation declared in mobile.css, with the selector, duration, delay and timing function.
const loops=[];
for(const m of css.matchAll(/([^{}]+)\{([^{}]*animation\s*:[^{}]*infinite[^{}]*)\}/g)){
 const decl=m[2].match(/animation\s*:([^;}]*)/)[1];
 for(const part of decl.split(/,(?![^(]*\))/)){
  if(!/infinite/.test(part))continue;
  const tokens=part.replace(/!important/,'').trim().match(/[\w-]+\([^)]*\)|\S+/g);
  const name=tokens.find(t=>keyframes(t)),times=tokens.filter(t=>/^-?[\d.]+m?s$/.test(t)||/^var\(--(duration|delay)/.test(t));
  const timing=tokens.find(t=>/^(steps|cubic-bezier)\(|^(linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end)$/.test(t))||'ease';
  if(name)loops.push({selector:m[1].trim(),name,duration:times[0],delay:m[2].match(/animation-delay:([^;}]*)/)?.[1]||times[1]||'0s',timing,body:m[2]});
 }
}
assert(loops.length>20,'endless animations were found in mobile.css');
if(process.env.LIST_LOOPS)for(const l of loops)console.log(l.name.padEnd(24),String(l.duration).padEnd(16),l.timing.padEnd(26),l.selector.slice(0,70));

// Highest rate (changes per second) at which a stepped loop changes, or Infinity for a smooth one.
function rate({name,duration,timing},steps=null,actualDuration=duration){
 duration=String(actualDuration);
 const n=steps??(/^step-(end|start)$/.test(timing)?1:Number(timing.match(/^steps\((\d+)/)?.[1]));if(!n||!/^[\d.]/.test(duration))return Infinity;
 const frames=keyframes(name),offsets=[...new Set([0,...frames.map(f=>f.offset),1])].sort((a,b)=>a-b);
 let fastest=0;for(let i=1;i<offsets.length;i++)fastest=Math.max(fastest,n/(seconds(duration)*(offsets[i]-offsets[i-1])));
 return fastest;
}

// 1. No endless loop repaints on the main thread at the display's refresh rate.
for(const loop of loops){
 const painted=[...new Set(keyframes(loop.name).flatMap(f=>f.props))].filter(p=>!COMPOSITED.has(p)&&p!=='animation-timing-function');
 if(!painted.length||KNOWN_SMOOTH[loop.name])continue;
 assert(rate(loop)<=limit(loop.name),`${loop.selector} animates ${painted.join(', ')} (${loop.name}) every frame: put it on the clock with steps()`);
}

// 2. The duel's ambient motes tick on one shared 20 Hz clock: evenly spaced keyframes holding both properties,
// steps of exactly 50 ms for every mote, and delays on the same 50 ms grid, so all of them change together.
const mote=loops.find(l=>l.selector==='.duel-particles i');
assert(mote,'the duel motes are an endless animation');
assert.match(mote.timing,/^steps\(var\(--mote-steps/,'motes step on the clock');
const moteFrames=keyframes(mote.name);
assert.deepEqual(moteFrames.map(f=>Math.round(f.offset*100)),[0,10,20,30,40,50,60,70,80,90,100],'mote keyframes every 10%');
for(const f of moteFrames)assert.deepEqual([...f.props].sort(),['opacity','transform'],'each mote keyframe sets both properties');
for(const file of ['mobile.js','cpu-viewer.js']){
 const source=read(file),template=source.match(/duel-particles" aria-hidden="true">\$\{Array\.from\(\{length:(\d+)\},\(_,i\)=>`<i style="([^"]*)"><\/i>`\)/);
 assert(template,`${file} builds the motes`);
 const vars=Object.fromEntries([...template[2].matchAll(/--([\w-]+):([^;]*)/g)].map(([,k,v])=>[k,v]));
 const value=(k,i)=>new Function('i','return `'+vars[k]+'`')(i);
 assert(vars['mote-steps'],`${file} sets --mote-steps on each mote`);
 for(let i=0;i<Number(template[1]);i++){
  const duration=seconds(value('duration',i)),delay=seconds(value('delay',i)),steps=Number(value('mote-steps',i));
  const step=duration/(moteFrames.length-1)/steps;
  assert(Math.abs(step-PERIOD)<EPS,`${file} mote ${i}: ${steps} steps over ${duration}s is a ${Math.round(step*1000)} ms step, not 50 ms`);
  assert(Math.abs(delay/PERIOD-Math.round(delay/PERIOD))<EPS,`${file} mote ${i}: delay ${delay}s is off the 50 ms grid`);
  assert(rate(mote,steps,value('duration',i))<=MAX_RATE,`${file} mote ${i} changes faster than ${HZ} Hz`);
 }
}

// 3. Every loop the fix put on the clock stays there: the selection rim, the shop's ultra glow and sparkle, the
// title drift, the LP heartbeat, the deck warning and the pack opening's loops.
const CLOCKED=['rim','ultra-glow','ultra-sparkle','menu-drift','fx-heartbeat','fx-pile-pulse','pack-rays','pack-hover','pack-spark','pack-dust','pack-background-drift','ultra-border','pack-foil-loop','card-twinkle'];
for(const name of CLOCKED){
 const uses=loops.filter(l=>l.name===name);
 assert(uses.length,`${name} is still used`);
 for(const loop of uses){
  assert(rate(loop)<=limit(name),`${loop.selector} (${name}) must tick at ${limit(name)|0} Hz or less, not ${rate(loop)}`);
  // Its ticks must fall on the shared grid: duration and delay are whole ticks (half-ticks for fast movers). A tick is
  // 50 ms of animation time, 60 ms on screen after animation-speed.js slows element animations by its scale; that
  // slowdown does not reach pseudo-elements, so their loops step in 60 ms of their own.
  const pseudo=/::?(before|after)\b/.test(loop.selector),tick=(pseudo?PERIOD*SCALE:PERIOD)/(HALF_TICK.has(name)?2:1);
  const grid=t=>Math.abs(t/tick-Math.round(t/tick))<1e-6;
  assert(grid(seconds(loop.duration)),`${loop.selector}: ${loop.duration} is not a whole number of ticks`);
  const delay=loop.delay.match(/calc\(var\(--i\)\*(-?[\d.]+)s\)/)?.[1]??seconds(loop.delay);
  assert(grid(Math.abs(Number(delay))),`${loop.selector}: delay ${loop.delay} is off the ${tick*1000} ms grid`);
 }
}

// Selectable piles keep the flip they always had (their own shadow cannot blend into the rim): one step, not a pulse.
assert.match(css,/\.zone\.pile\.selectable\{animation-name:rim-pile;animation-timing-function:step-end\}/,'piles keep their rim flip');
assert.equal(rate({name:'rim-pile',duration:'1s',timing:'step-end'})<=4,true,'the pile flip changes a few times a second at most');
// The shop's ultra loops pause behind an open pack.
assert.match(css,/:root:has\(dialog\.pack-theatre\[open\]\) :is\(\.shop-product\.shop-ultra,\.shop-ultra \.product-art\)\{animation-play-state:paused\}/);

// 4. A loop whose own rule pins an animated property with !important can never show (important declarations win
// over animations), yet it still runs every frame: the Duel Looks' selectable rim did exactly that.
for(const loop of loops){
 const pinned=[...loop.body.matchAll(/([a-z-]+)\s*:[^;]*!important/g)].map(m=>m[1]);
 const animated=new Set(keyframes(loop.name).flatMap(f=>f.props));
 const wasted=pinned.filter(p=>animated.has(p));
 assert(!wasted.length,`${loop.selector} runs ${loop.name} but pins ${wasted.join(', ')} with !important, so it never shows`);
}

// The pack backdrop drift cannot show on the dialog that hosts the video background (transparent !important).
assert.match(css,/\.pack-theatre\.opening\.game-vector-host\{animation:none\}/,'no hidden drift behind the video');
assert.match(read('vector-backgrounds.css'),/\.game-vector-host\{[^}]*background:transparent!important/);

// 5. The shared clock: installed once by mobile.js; it moves a running loop's start back onto the on-screen ticks
// (50 ms of animation time times the presentation scale: 60 ms).
assert.match(read('mobile.js'),/import \{installAmbientClock\} from '\.\/ambient-clock\.js';/);
assert.match(read('mobile.js'),/\ninstallAmbientClock\(\);/);
assert.equal(TICK,PERIOD*1000);
globalThis.presentationScale=SCALE;assert.equal(screenTick(),60);
const fake=(startTime,playState='running')=>({startTime,playState});
const a=fake(12345.678);snapToClock(a);assert.equal(a.startTime,12300,'moved back to the tick before');
const b=fake(540);snapToClock(b);assert.equal(b.startTime,540,'already on a tick');
const c=fake(1234.5,'paused');snapToClock(c);assert.equal(c.startTime,1234.5,'a paused loop is left alone');
const d=fake(null);snapToClock(d);assert.equal(d.startTime,null,'a pending loop is left alone');

const clocked=loops.filter(l=>/^steps?[(-]/.test(l.timing));
console.log(`PASS ${loops.length} endless animations; on the clock: ${[...new Set(clocked.map(l=>l.name))].join(', ')}; the rest animate only transform/opacity on pass-through screens, or are known (${Object.keys(KNOWN_SMOOTH).join(', ')})`);
