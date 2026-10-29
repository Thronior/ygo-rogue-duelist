import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync('android/web/global-stats.js','utf8').replaceAll('export ','');
let now=1800000000000,tail=Promise.resolve(),fail=false;const values=new Map(),posts=[];
const locks={request:(name,fn)=>{const work=tail.then(fn);tail=work.catch(()=>{});return work}};
function tab(){let tick;const events={},document={hidden:false,addEventListener:(n,fn)=>events[n]=fn};const context=vm.createContext({localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},crypto,navigator:{locks},location:{hostname:'example.test'},document,Date:{now:()=>now},setTimeout,clearTimeout,setInterval:fn=>tick=fn,AbortController,AbortSignal,fetch:async(url,args)=>{posts.push(JSON.parse(args.body));if(fail)throw Error('Offline');return {ok:true}}});vm.runInContext(source+';globalThis.api={startStats,syncStats,recordStat,setStatsEnabled,personalPlaySeconds,drain:()=>queueTail}',context);context.api.startStats(()=>true);return {api:context.api,events,tick:()=>tick(),document}}
const tabs=[tab(),tab(),tab()];const drain=()=>Promise.all(tabs.map(t=>t.api.drain()));await drain();
for(let minute=1;minute<=1440;minute++){
 now+=60000;
 for(const t of tabs){t.events.pointerdown();t.api.recordStat('duels','duel'+Math.floor(minute/10));t.tick()}
 await drain();
}
assert.equal(posts.length,144,'one shared upload every ten minutes across three tabs');assert.equal(posts.reduce((n,b)=>n+b.counts.seconds,0)+JSON.parse(values.get('ygo-stats-batches-v2')).pending.seconds,86400,'overlapping tabs do not triple playtime');assert.equal(posts.reduce((n,b)=>n+b.counts.duels,0),145,'shared event deduplication');assert.equal(tabs[0].api.personalPlaySeconds(),86400);
const before=posts.length;fail=true;tabs[0].api.recordStat('wins','retry');await drain();now+=600000;await tabs[0].api.syncStats();const retry=posts.at(-1);
for(let i=0;i<6;i++){now+=600000;await tabs[i%3].api.syncStats();assert.deepEqual(posts.at(-1),retry)}
fail=false;now+=600000;await tabs[1].api.syncStats();assert.deepEqual(posts.at(-1),retry);now+=600000;await tabs[1].api.syncStats();assert.equal(posts.length,before+8);
// Turning off sharing stops all tabs while local counters remain functional.
tabs[0].api.setStatsEnabled(false);await drain();tabs[2].api.recordStat('wins','private');await drain();now+=600000;await tabs[2].api.syncStats();assert.equal(posts.length,before+8);assert.equal(JSON.parse(values.get('ygo-global-stats-v1')).counts.wins,2);
console.log('PASS three concurrent tabs / 24 hours: 144 uploads, exact shared playtime/events; identical outage retries, successful recovery, cross-tab opt-out and personal counters');
