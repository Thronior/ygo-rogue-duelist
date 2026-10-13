import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('./web/mobile.js',import.meta.url),'utf8');
const start=source.indexOf('const inspectionWaiters='),end=source.indexOf('function closeDialog()',start);
const animation={playState:'running',effect:{target:{}},pause(){this.playState='paused'},play(){this.playState='running'}};
let scheduled=0;
const context=vm.createContext({screen:'duel',tagUI:null,state:{settings:{}},busy:true,aiTimer:null,modal:{open:true,dataset:{duelOptionsPause:'1'},classList:{contains:()=>false},querySelector:()=>null,contains:()=>false},document:{hidden:false,addEventListener(){},getAnimations:()=>[animation]},performance,setTimeout,clearTimeout,setInterval,clearInterval,scheduleAI:()=>scheduled++});
vm.runInContext(source.slice(start,end)+';globalThis.api={inspectionPaused,waitForInspection,duelDelay,syncInspectionPause};',context);
const api=context.api;api.syncInspectionPause();assert.equal(animation.playState,'paused');let advanced=false;const delay=api.duelDelay(30).then(()=>advanced=true);await new Promise(r=>setTimeout(r,60));assert.equal(advanced,false,'Options holds in-flight delays');let resumed=false;const waiter=api.waitForInspection().then(()=>resumed=true);await Promise.resolve();assert.equal(resumed,false);
// Replacing Options with Settings retains the pause marker.
assert(api.inspectionPaused());context.modal.open=false;delete context.modal.dataset.duelOptionsPause;api.syncInspectionPause();await Promise.all([delay,waiter]);assert(advanced&&resumed);assert.equal(animation.playState,'running');assert.equal(scheduled,0,'Busy owner resumes its own loop');context.busy=false;api.syncInspectionPause();assert.equal(scheduled,1);
assert(source.includes("el.dataset.do!=='duel-options'"));assert(source.includes("doubleTap(el.dataset.zone?'z'+el.dataset.zone:'h'+el.dataset.hand,+el.dataset.code)"));console.log('PASS Options pauses and resumes delays, animations, waiters and CPU scheduling');
