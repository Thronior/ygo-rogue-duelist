// Cancel on a forced chain window (user, 2026-11-19): the ✕ is never greyed out; it activates the effect that has to
// activate, as if the player had picked it. Right-click and gamepad B press the same button.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {forcedCancelResponse,mandatoryChainResponse} from './web/duel-presentation.js';
import {M,R} from './web/duel.js';

const mermaid={code:85802526,controller:0,location:4,sequence:2,position:1,description:'89970469502976'};
const second={...mermaid,sequence:3,code:40640057};
const wall={code:22359980,controller:0,location:8,sequence:2,position:10,description:'0'};
const relic={code:0,controller:2,location:0,sequence:0,position:0,description:'0'};
const forced=selects=>({type:M.SELECT_CHAIN,player:0,spe_count:0,forced:true,hint_timing:2,hint_timing_other:0,selects});

// One forced option: Cancel picks it.
assert.deepEqual(forcedCancelResponse(forced([mermaid])),{type:R.SELECT_CHAIN,index:0},'sole forced trigger');
assert.deepEqual(forcedCancelResponse(forced([wall,mermaid])),{type:R.SELECT_CHAIN,index:1},'the set Trap beside it is skipped');
// Several forced triggers: the first forced one, then the core asks again for the rest.
assert.equal(mandatoryChainResponse(forced([mermaid,second,wall])),null,'the old decline had nothing to pick (greyed)');
assert.deepEqual(forcedCancelResponse(forced([mermaid,second,wall])),{type:R.SELECT_CHAIN,index:0},'first forced trigger');
assert.deepEqual(forcedCancelResponse(forced([wall,second,mermaid])),{type:R.SELECT_CHAIN,index:1},'first forced trigger after a plain activation');
assert.deepEqual(forcedCancelResponse(forced([second,wall])),{type:R.SELECT_CHAIN,index:0},'the re-asked window resolves the rest');
assert.deepEqual(forcedCancelResponse(forced([wall,{...wall,sequence:3}])),{type:R.SELECT_CHAIN,index:0},'only plain activations listed: the first');
// Relic triggers still go first.
assert.deepEqual(forcedCancelResponse(forced([mermaid,second,relic])),{type:R.SELECT_CHAIN,index:2},'relic trigger first');
// Nothing changes outside forced chain windows.
assert.equal(forcedCancelResponse({...forced([mermaid,second]),forced:false}),null,'optional window: Cancel passes as before');
assert.equal(forcedCancelResponse(forced([])),null,'empty forced list');
assert.equal(forcedCancelResponse({type:M.SELECT_CARD,player:0,can_cancel:false,min:1,max:1,selects:[mermaid]}),null,'card selections untouched');
assert.equal(forcedCancelResponse(null),null);
console.log('PASS forced Cancel picks the forced trigger, first one when several');

// mobile.js: the ✕ uses it, so it is enabled for forced windows, and the window is shown even while right-click is held.
const mobile=readFileSync(new URL('./web/mobile.js',import.meta.url),'utf8');
const line=mobile.split('\n').find(l=>l.startsWith('function reactionDecline(m)'));
assert(line?.includes('forcedCancelResponse(m)'),'reactionDecline falls back to the forced trigger');
const reactionDecline=new Function('engine','M','forcedCancelResponse',`${line};return reactionDecline`);
const choices=m=>[...m.selects.map((c,index)=>({response:{type:R.SELECT_CHAIN,index}})),...(m.forced?[]:[{response:{type:R.SELECT_CHAIN,index:null}}])];
const decline=reactionDecline({choices},M,forcedCancelResponse);
assert.deepEqual(decline(forced([mermaid,second,wall])),{type:R.SELECT_CHAIN,index:0},'✕ activates the first forced trigger');
assert.deepEqual(decline({...forced([mermaid,second]),forced:false}),{type:R.SELECT_CHAIN,index:null},'✕ still passes an optional window');
const effectYN={type:M.SELECT_EFFECTYN,player:0};
assert.deepEqual(reactionDecline({choices:()=>[{response:{yes:true}},{response:{yes:false}}]},M,forcedCancelResponse)(effectYN),{yes:false},'Activate effect? No is unchanged');
assert(/reaction-decline`[^`]*\$\{decline\?'':'disabled'\}/.test(mobile)||mobile.includes("${decline?'':'disabled'}"),'the ✕ is disabled only with no response');
assert(/function offerChain\(m\)\{[^}]*return !!m\?\.forced\|\|/.test(mobile),'forced windows are offered even while right-click no-chain is held');
// Right-click (and gamepad B, which sends a right click) presses the first enabled Cancel or ✕.
assert(mobile.includes("querySelectorAll('button.reaction-decline,button.duel-cancel')].find(button=>!button.disabled"),'right-click presses an enabled ✕');
const pad=readFileSync(new URL('./web/gamepad.js',import.meta.url),'utf8');
assert(pad.includes("fire(el,'contextmenu',{button:2"),'gamepad B sends the right click');
// Card selections never draw a greyed Cancel: it is left out when the core does not allow cancelling.
assert(!/duelCancel\([^)]*disabled/.test(mobile),'no Cancel drawn disabled');
assert((mobile.match(/m\.can_cancel\?duelCancel\('Cancel','cancel-target'\)/g)||[]).length>=2,'selection Cancel appears only when allowed');
console.log('PASS ✕ enabled for forced windows, right-click/B press it, selection Cancel unchanged');
