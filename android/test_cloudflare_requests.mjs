// Fewer Cloudflare requests (2026-11-11): quota pauses, cloud-save change detection that survives restarts and
// ignores play time, no .bak uploads, and text/plain bodies. Global stats and hub reconnects are unchanged (user).

import assert from 'node:assert/strict';
const rows=new Map(),session=new Map();
const store=map=>({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)});
globalThis.localStorage=store(rows);globalThis.sessionStorage=store(session);
globalThis.location={hostname:'ygo-rogue.example'};globalThis.window={addEventListener(){}};
const listeners={};globalThis.document={hidden:false,addEventListener(t,f){(listeners[t]||=[]).push(f)},removeEventListener(t,f){listeners[t]=(listeners[t]||[]).filter(x=>x!==f)}};
let clock=Date.UTC(2026,10,11,12,0,0);const realNow=Date.now;Date.now=()=>clock;
const calls=[];let reply=()=>new Response('{}');
globalThis.fetch=async(url,options={})=>{calls.push({url:String(url),options});return reply(String(url),options)};

// 1. Quota pause: until the next 00:00 UTC plus up to 30 minutes.
const quota=await import('./web/quota-pause.js');
assert.equal(quota.nextUtcMidnight(Date.UTC(2026,10,11,23,59)),Date.UTC(2026,10,12));
assert(quota.quotaExhausted(503)&&quota.quotaExhausted(429)&&quota.quotaExhausted(400,'Exceeded allowed rows written')&&quota.quotaExhausted(503,'')&&!quota.quotaExhausted(400,'Too many requests. Try again in a minute.'));
const until=quota.pauseForQuota('demo',{now:clock,random:()=>.5});assert.equal(until,Date.UTC(2026,10,12)+900000);
assert.equal(quota.quotaPausedUntil('demo',{now:clock}),until);assert.equal(quota.quotaPausedUntil('demo',{now:until}),0);
quota.clearQuotaPause('demo');assert.equal(quota.quotaPausedUntil('demo',{now:clock}),0);

// 4. Cloud save: unchanged progress is not re-sent, even after a restart or when only play time moved; no .bak files.
const backup=await import('./web/device-backup.js');
const server=[];let status=200,timers=[];
const worker=async(url,options)=>{if(url==='multiplayer-config.json')return Response.json({signalingUrl:'https://rooms.example'});server.push({url,options});if(status!==200)return Response.json({error:'Exceeded allowed rows written'},{status});return Response.json({updatedAt:clock})};
const make=()=>backup.createBackupClient({storage:localStorage,enabled:true,online:()=>true,visible:()=>true,platform:()=>'test',version:'test',now:()=>clock,setTimer:(f,ms)=>{timers.push(ms);return timers.length},clearTimer:()=>{},request:worker});
localStorage.setItem('ygo-cloud-saves-enabled','true');localStorage.setItem('ygo-cloud-save-code-v1','K7QXM-4TB9R');
const statsExtra=s=>localStorage.setItem('ygo-global-stats-v1',JSON.stringify({counts:{runs:1,duels:4,wins:2,losses:2,seconds:s},seen:['runs:a'],playUntil:clock}));
const saves={'profile.json':'{"wins":3,"unlocked":[0,1,2]}','profile.bak':'{"wins":2,"unlocked":[0,1,2]}','run.json':'{"round":2}','run.bak':'{"round":1}'};
statsExtra(100);let client=make();clock+=60000;client.queue(JSON.stringify(saves));await client.flush();assert.equal(server.length,1);
const uploaded=await backup.openSave('K7QXM-4TB9R',JSON.parse(server[0].options.body).blob);assert.deepEqual(Object.keys(uploaded.files).sort(),['profile.json','run.json']);
assert.equal(server[0].options.headers['Content-Type'],'text/plain;charset=UTF-8');
statsExtra(160);clock+=60000;client.queue(JSON.stringify(saves));await client.flush();assert.equal(server.length,1,'only play time changed');
client.destroy();client=make();clock+=60000;client.queue(JSON.stringify(saves));await client.flush();assert.equal(server.length,1,'a restart does not force an upload');
saves['run.bak']='{"round":2}';clock+=60000;client.queue(JSON.stringify(saves));await client.flush();assert.equal(server.length,1,'.bak changes alone are not sent');
saves['run.json']='{"round":3}';clock+=60000;client.queue(JSON.stringify(saves));await client.flush();assert.equal(server.length,2,'a real change (a duel) is sent');
// Out of quota: the next attempts wait for the daily reset without a request.
status=503;saves['run.json']='{"round":4}';clock+=60000;client.queue(JSON.stringify(saves));await client.flush();assert.equal(server.length,3);
status=200;clock+=60000;await client.flush();clock+=3600000;await client.flush();assert.equal(server.length,3,'paused');assert(timers.at(-1)<=3600000);
clock=Date.UTC(2026,10,13,0,40);await client.flush();assert.equal(server.length,4,'sent after the reset');client.destroy();

// 5. Replays and flags go as text/plain (no preflight).
const replays=await import('./web/replays.js');const sent=[];
const bytes=new Uint8Array([1,2,3]),id=await replays.hash(bytes);
await replays.sendReplayBatch([{bytes}],async(url,options)=>{sent.push(options.headers['Content-Type']);return Response.json({results:[{ok:true,id}]})});
assert.equal(sent[0],'text/plain;charset=UTF-8');

Date.now=realNow;
console.log('PASS quota pause until 00:00 UTC, cloud save skips play-time-only/.bak-only/restart re-sends and pauses on quota, text/plain uploads');
