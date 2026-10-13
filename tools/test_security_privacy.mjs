import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync('android/web/global-stats.js','utf8').replaceAll('export ','');
function client(values=new Map(),start=1000000){
 let now=start,tick,fail=false;const requests=[],events={};const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const document={hidden:false,addEventListener:(name,fn)=>events[name]=fn};
 const context=vm.createContext({localStorage:storage,crypto,location:{hostname:'game.example'},document,Date:{now:()=>now},setTimeout,clearTimeout,setInterval:fn=>tick=fn,AbortController,AbortSignal,fetch:async(url,args)=>{requests.push(JSON.parse(args.body));if(fail)throw Error('Lost acknowledgement');return {ok:true}}});
 vm.runInContext(source+';globalThis.api={startStats,syncStats,setStatsEnabled,statsEnabled,recordStat,personalPlaySeconds,drain:()=>queueTail}',context);
 const a=context.api;a.startStats(()=>true);
 return {a,values,requests,document,events,advance:n=>now+=n,tick:()=>tick(),fail:v=>fail=v};
}
const old={id:'old-device',counts:{runs:4,duels:8,wins:5,losses:3,seconds:7200},seen:['runs:old'],synced:'old payload'};
const c=client(new Map([['ygo-global-stats-v1',JSON.stringify(old)]]));await c.a.drain();assert(c.a.statsEnabled());assert.equal(c.a.personalPlaySeconds(),7200);assert(!JSON.parse(c.values.get('ygo-global-stats-v1')).id);
c.events['game-startup-ready']({detail:{newDevice:false}});c.advance(600001);await c.a.syncStats();assert.equal(c.requests.length,0,'old personal history never re-uploaded');
c.a.recordStat('runs','old');c.a.recordStat('duels','new');c.a.recordStat('duels','new');await c.a.syncStats();assert.equal(c.requests.length,1);assert.equal(c.requests[0].counts.duels,1);assert.equal(c.requests[0].counts.runs,0);assert(!('id'in c.requests[0]));
c.advance(600001);await c.a.syncStats();assert.equal(c.requests.length,1,'no activity means no request');
c.a.setStatsEnabled(false);c.a.recordStat('wins','new');c.events.pointerdown();c.advance(60000);c.tick();await c.a.drain();assert.equal(c.a.personalPlaySeconds(),7260);assert.equal(JSON.parse(c.values.get('ygo-global-stats-v1')).counts.wins,6);assert.equal(c.requests.length,1,'opt-out preserves personal counters but stops uploads');
const fresh=client();fresh.events['game-startup-ready']({detail:{newDevice:true}});await fresh.a.drain();fresh.advance(600001);fresh.fail(true);await fresh.a.syncStats();const first=fresh.requests[0];assert.equal(first.counts.firstTimePlayers,1);
const reload=client(fresh.values,1600001);reload.events['game-startup-ready']({detail:{newDevice:false}});reload.advance(600001);await reload.a.syncStats();assert.deepEqual(reload.requests[0],first,'reload retries identical batch');reload.advance(600001);await reload.a.syncStats();assert.equal(reload.requests.length,1);
const opted=client(new Map([['ygo-usage-stats-enabled','false']]));opted.events['game-startup-ready']({detail:{newDevice:true}});opted.a.recordStat('runs','r');opted.advance(600001);await opted.a.syncStats();assert.equal(opted.requests.length,0);assert(!opted.a.statsEnabled());
const play=client();play.events.pointerdown();play.advance(60000);play.tick();await play.a.drain();assert.equal(play.a.personalPlaySeconds(),60);play.document.hidden=true;play.advance(60000);play.tick();await play.a.drain();assert.equal(play.a.personalPlaySeconds(),60);play.document.hidden=false;play.advance(600000);play.tick();await play.a.drain();assert.equal(play.a.personalPlaySeconds(),60,'idle time excluded');assert.equal(play.requests[0].counts.seconds,60);
console.log('PASS default-on, existing opt-out, local history preservation, first launch, no-op dedupe, retry after reload, opt-out local playtime, hidden and idle exclusion');
