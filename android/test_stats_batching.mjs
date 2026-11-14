// Global stats request savings (user, 2026-11-14): uploads at most every 30 minutes; play-time-only batches wait an hour.
import assert from 'node:assert/strict';
const rows=new Map();globalThis.localStorage={getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,String(v)),removeItem:k=>rows.delete(k)};
globalThis.location={hostname:'example.test'};globalThis.document={addEventListener(){},hidden:false};
let posted=[];globalThis.fetch=async(url,options)=>{posted.push(JSON.parse(options.body));return new Response('{}',{status:200})};
const realNow=Date.now;let clock=realNow();Date.now=()=>clock;
const {syncStats,recordStat,recordRunResult}=await import('./web/global-stats.js');
const queue=()=>JSON.parse(rows.get('ygo-stats-batches-v2')||'{}');
const setSeconds=n=>{const q=queue();q.pending={...(q.pending||{}),seconds:n};rows.set('ygo-stats-batches-v2',JSON.stringify(q))};
const step=async ms=>{clock+=ms;await syncStats();};
// Play time only: nothing is sent for the first hour.
setSeconds(600);await step(31*60000);assert.equal(posted.length,0);
await step(31*60000);assert.equal(posted.length,0,'still under an hour since the first unsent second');
await step(31*60000);assert.equal(posted.length,1,'sent once the play time is an hour old');assert.equal(posted[0].counts.seconds,600);
// A duel joins: the next 30-minute window sends it at once, play time included.
setSeconds(120);recordStat('duels','d1');await new Promise(r=>setTimeout(r,20));
await step(10*60000);assert.equal(posted.length,1,'never sooner than 30 minutes after the last send');
await step(21*60000);assert.equal(posted.length,2);assert.equal(posted[1].counts.duels,1);assert.equal(posted[1].counts.seconds,120);
Date.now=realNow;
console.log('PASS stats batching: 30-minute uploads, play-time-only batches wait an hour, duels go with the next window');
