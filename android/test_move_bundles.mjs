// Draft/Collector duels send quick answers in a row as one bundle (user, 2026-11-14): the match hub stores a bundle
// in one row instead of one per answer (Cloudflare's daily row limit). See multiplayer/cloudflare/hub.mjs responses().
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('android/web/collector-ui.js','utf8').replace(/^import .*\r?\n/gm,'').replace('export class CollectorUI','class CollectorUI');
const env={replayVersion:'0',explainOnlineError:async e=>String(e),structuredClone,AbortSignal,JSON,setTimeout,clearTimeout};
vm.createContext(env);vm.runInContext(source+'\nglobalThis.C=CollectorUI',env);
const ui=Object.create(env.C.prototype),sent=[];ui.seat=0;ui.hubSend=data=>{sent.push(data);return true};
const move=(n,nextActor)=>({t:'r',game:1,n,response:{type:1,n},nextActor,turn:1,h:n});
// Three answers that keep the prompt with this player wait; the fourth hands it over and sends all four at once.
ui.queueMove(move(0,0));ui.queueMove(move(1,0));ui.queueMove(move(2,0));assert.equal(sent.length,0,'waiting for more');
ui.queueMove(move(3,1));
assert.equal(sent.length,1);assert.equal(sent[0].t,'rs');assert.equal(sent[0].n,0);assert.equal(sent[0].items.length,4);
assert.equal(JSON.stringify(sent[0].items.map(i=>i.response.n)),'[0,1,2,3]');assert.equal(sent[0].items[3].nextActor,1);
// A lone answer that keeps the prompt goes as a normal packet once the short wait ends.
sent.length=0;ui.queueMove(move(4,0));await new Promise(r=>setTimeout(r,260));
assert.equal(sent.length,1);assert.equal(sent[0].t,'r');assert.equal(sent[0].n,4);
// An answer that hands over the prompt on its own is sent at once, unbundled.
sent.length=0;ui.queueMove(move(5,1));assert.equal(sent.length,1);assert.equal(sent[0].t,'r');
// Rebuilding the duel drops anything waiting (the confirmed log is replayed instead).
sent.length=0;ui.duelLog=null;ui.hubHello=()=>{};ui.enqueue=()=>{};ui.queueMove(move(6,0));ui.rebuild();await new Promise(r=>setTimeout(r,260));
assert.equal(sent.length,0);
console.log('PASS quick answers are bundled, hand-overs flush at once, rebuild drops the queue');
