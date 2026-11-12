// FPS Cap (2026-11-09): frame-cap.js draws at most the cap's frames a second on a faster display, while animations
// keep their real-time length, still finish (and resolve .finished), and the game's own pause/play still works.
// Ticks are evenly spaced (2026-11-11): every 2nd, 3rd... display refresh when the display is at least 1.5 times faster
// than the cap, so no frame is longer than its neighbours. Stepped endless loops stay with the browser and add its own
// cheap redraws (about 17 a second, none from the main thread) between ticks.
// Runs headless Chrome, whose display refresh is the machine's (144 Hz here); caps below it are checked.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('../tools/require-module.cjs').requireModule('playwright');
const source=fs.readFileSync(new URL('./web/frame-cap.js',import.meta.url),'utf8');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();
 await page.setContent(`<style>@keyframes slide{to{transform:translateX(200px)}}@keyframes tick{to{opacity:.5}}
  #a{width:40px;height:40px;background:red;animation:slide 1s linear infinite}#s{width:9px;height:9px;background:blue;animation:tick 1.2s steps(20) infinite}</style><div id=a></div><div id=s></div><div id=r></div>`);
 // Like the game: animation-speed.js's presentation scale, and the stepped loop on the ambient clock's 60 ms ticks.
 await page.evaluate(()=>{globalThis.presentationScale=1.2;const a=document.getElementById('s').getAnimations()[0];a.startTime=Math.floor(a.startTime/60)*60});
 // Counts the clock's own native frame requests (2026-11-12: its loop forked whenever a game callback asked for a frame
 // on a tick, and the copies ran side by side until nothing moved: 100,000 callbacks a second after ten seconds).
 await page.evaluate(()=>{const raf=window.requestAnimationFrame.bind(window);window.__nativeFrames=0;window.requestAnimationFrame=cb=>{window.__nativeFrames++;return raf(cb)}});
 await page.addScriptTag({content:source});
 await page.waitForFunction(()=>frameCap.state.refresh>0,null,{timeout:5000});
 const refresh=await page.evaluate(()=>frameCap.state.refresh);
 console.log('display refresh',refresh,'Hz');
 // Counts frames the renderer draws while the slide animation and a requestAnimationFrame loop both move.
 async function drawn(seconds){
  await browser.startTracing(page,{categories:['disabled-by-default-devtools.timeline.frame','devtools.timeline']});
  await page.evaluate(()=>{let x=0;const r=document.getElementById('r');const step=()=>{r.textContent=++x;window.__loop=requestAnimationFrame(step)};window.__loop=requestAnimationFrame(step)});
  await page.waitForTimeout(seconds*1000);
  await page.evaluate(()=>cancelAnimationFrame(window.__loop));
  const events=JSON.parse((await browser.stopTracing()).toString()).traceEvents;
  const pid=events.find(e=>e.name==='DrawFrame')?.pid;
  return events.filter(e=>e.name==='DrawFrame'&&e.pid===pid).length/seconds;
 }
 for(const cap of [30,60,90,120].filter(c=>c*1.05<refresh)){
  await page.evaluate(c=>frameCap.set(c),cap);await page.waitForTimeout(300);
  const state=await page.evaluate(()=>frameCap.state);
  assert.equal(state.active,true,`cap ${cap} drives animations on a ${refresh} Hz display`);
  const asked=await page.evaluate(()=>window.__nativeFrames);
  const fps=await drawn(2);
  const perSecond=(await page.evaluate(()=>window.__nativeFrames)-asked)/2;
  console.log(`cap ${cap}: ${perSecond.toFixed(0)} native frame requests per second`);
  // One clock loop: at most one native frame request per display refresh (plus slack for the refresh measurement).
  assert.ok(perSecond<=refresh*1.3,`cap ${cap}: ${perSecond} native frame requests a second on a ${refresh} Hz display`);
  console.log(`cap ${cap}: ${fps.toFixed(1)} frames drawn per second, ${state.driven} driven`);
  // The clock's own frames stay at or below the cap; the stepped loop adds at most its 17 redraws a second.
  assert.ok(state.rate<=cap*1.05,`cap ${cap}: ticks ${state.rate} times a second`);
  assert.ok(fps<=state.rate+20,`cap ${cap}: drew ${fps} frames a second`);
  assert.ok(fps>=state.rate*.8,`cap ${cap}: only ${fps} frames a second`);
  // Even spacing: with whole-refresh spacing, nearly every gap between two ticks is the same number of refreshes.
  const gaps=await page.evaluate(()=>new Promise(done=>{const times=[];const step=t=>{times.push(t);if(times.length<60)requestAnimationFrame(step);else done(times.slice(1).map((x,i)=>x-times[i]))};requestAnimationFrame(step)}));
  const sorted=[...gaps].sort((a,b)=>a-b),middle=sorted[sorted.length>>1],off=gaps.filter(g=>Math.abs(g-middle)>500/refresh).length;
  console.log(`cap ${cap}: tick gap ${middle.toFixed(1)} ms, ${off} of ${gaps.length} uneven`);
  if(refresh>=cap*1.5)assert.ok(off<=3,`cap ${cap}: ${off} uneven tick gaps (${gaps.map(g=>Math.round(g)).join(',')})`);
 }
 await page.evaluate(()=>frameCap.set(30));await page.waitForTimeout(200);
 const checks=await page.evaluate(async()=>{
  const out={},el=document.getElementById('r'),now=()=>performance.now();
  // A finite animation keeps its real-time length and resolves .finished.
  let t0=now();const a=el.animate([{opacity:1},{opacity:0}],{duration:400});await a.finished;out.finishedAfter=Math.round(now()-t0);
  // The game pausing a driven animation holds it; playing it continues it.
  const b=el.animate([{opacity:1},{opacity:0}],{duration:2000});await new Promise(r=>setTimeout(r,200));
  out.drivenState=b.playState;b.pause();out.pausedState=b.playState;const held=b.currentTime;await new Promise(r=>setTimeout(r,300));out.heldDrift=Math.round(b.currentTime-held);
  b.play();await new Promise(r=>setTimeout(r,300));out.afterPlay=Math.round(b.currentTime-held);out.playState=b.playState;
  // reverse() runs it backwards at its normal speed, not twice as fast.
  const before=b.currentTime;b.reverse();await new Promise(r=>setTimeout(r,300));out.reversed=Math.round(before-b.currentTime);b.cancel();
  // cancelAnimationFrame cancels a queued callback.
  let ran=false;const id=requestAnimationFrame(()=>ran=true);cancelAnimationFrame(id);await new Promise(r=>setTimeout(r,200));out.cancelled=!ran;
  // A stylesheet pausing a driven CSS animation holds it.
  const slide=document.getElementById('a').getAnimations()[0],at=slide.currentTime;document.getElementById('a').style.animationPlayState='paused';
  await new Promise(r=>setTimeout(r,300));out.cssPausedDrift=Math.round(slide.currentTime-at);document.getElementById('a').style.animationPlayState='';
  await new Promise(r=>setTimeout(r,300));out.cssResumed=Math.round(slide.currentTime-at);
  // A cap at or above the display rate drives nothing and leaves animations running natively.
  frameCap.set(120);out.uncapped=frameCap.state;out.slideRunning=document.getElementById('a').getAnimations()[0].startTime!=null;
  return out;
 });
 console.log(checks);
 assert.ok(checks.finishedAfter>=380&&checks.finishedAfter<=520,'400 ms animation finished after '+checks.finishedAfter);
 assert.equal(checks.drivenState,'running');assert.equal(checks.pausedState,'paused');
 assert.ok(Math.abs(checks.heldDrift)<=1,'paused animation moved '+checks.heldDrift);
 assert.ok(checks.afterPlay>=230&&checks.afterPlay<=380,'resumed animation moved '+checks.afterPlay);
 assert.equal(checks.playState,'running');
 assert.ok(checks.reversed>=230&&checks.reversed<=380,'reversed animation moved '+checks.reversed);
 assert.equal(checks.cancelled,true);
 assert.ok(Math.abs(checks.cssPausedDrift)<=40,'CSS-paused animation moved '+checks.cssPausedDrift);
 assert.ok(checks.cssResumed>=230,'CSS animation did not resume: '+checks.cssResumed);
 if(refresh<=126){assert.equal(checks.uncapped.active,false);assert.equal(checks.slideRunning,true)}
 console.log('frame cap ok');
}finally{await browser.close()}
