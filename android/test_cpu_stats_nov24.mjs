// CPU Stats (user, 2026-11-24): one anonymous "opponent:tier:character:w|l" per finished solo CPU duel, riding in the
// next stats batch (no request of its own), at most 16 per batch, each duel once. Run: node android/test_cpu_stats_nov24.mjs
import assert from 'node:assert/strict';import fs from 'node:fs';
const rows=new Map();globalThis.localStorage={getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,String(v)),removeItem:k=>rows.delete(k)};
globalThis.location={hostname:'example.test',href:'https://example.test/'};globalThis.document={addEventListener(){},hidden:false};
const posted=[],got=[];globalThis.fetch=async(url,options)=>{if(options?.method==='POST')posted.push({url:String(url),body:JSON.parse(options.body)});else got.push(String(url));return new Response('{"since":null,"tiers":{}}',{status:200})};
const realNow=Date.now;let clock=realNow();Date.now=()=>clock;
const {syncStats,recordStat,cpuResult,recordCpuResult,fetchCpuStats}=await import('./web/global-stats.js');
const settle=()=>new Promise(r=>setTimeout(r,20)),queue=()=>JSON.parse(rows.get('ygo-stats-batches-v2')||'{}');
try{
 // Which duels count is the campaign's call (duel.cpu_tier only on counting duels); the key holds nothing else.
 assert.equal(cpuResult({id:'a',opponent:12,cpu_tier:1},3,true),'12:1:3:w');
 assert.equal(cpuResult({id:'a',opponent:40,cpu_tier:4},3,false),'40:4:3:l');
 assert.equal(cpuResult({id:'a',opponent:7,cpu_tier:0},3,true),'7:0:3:w');
 for(const duel of [{id:'a',opponent:12},{id:'a',opponent:12,cpu_tier:5},{id:'a',opponent:12,cpu_tier:'1'},{id:'a',cpu_tier:1},{id:'a',opponent:1000,cpu_tier:1},null,false])assert.equal(cpuResult(duel,3,true),null,JSON.stringify(duel));
 assert.equal(cpuResult({id:'a',opponent:3,cpu_tier:1},3,true),null,'a mirror of the own character is not a CPU opponent');
 assert.equal(cpuResult({id:'a',opponent:12,cpu_tier:1},'x',true),null);
 // Each finished duel once, even if the result is recorded twice.
 recordStat('duels','d1');recordCpuResult({id:'d1',opponent:12,cpu_tier:1},3,true);recordCpuResult({id:'d1',opponent:12,cpu_tier:1},3,true);
 recordCpuResult({id:'d2',opponent:12,cpu_tier:1},3,true);recordCpuResult({id:'d3',opponent:12,cpu_tier:1},5,false);recordCpuResult({id:'d4',opponent:12},5,false);await settle();
 assert.deepEqual(queue().pending.cpu,{'12:1:3:w':2,'12:1:5:l':1});
 // The batch carries them next to the counters; no player, run, device or duel identity goes out.
 clock+=31*60000;await syncStats();assert.equal(posted.length,1);const sent=posted[0].body;
 assert.deepEqual(Object.keys(sent).sort(),['batchId','counts','cpu','expiresAt']);assert.deepEqual(sent.cpu,{'12:1:3:w':2,'12:1:5:l':1});
 assert(!JSON.stringify(sent).includes('d1'),'no duel id in the upload');assert.equal(queue().pending.cpu,undefined);
 // More than 16 keys: the rest waits for the next batch, nothing is dropped.
 for(let i=0;i<20;i++)recordCpuResult({id:'m'+i,opponent:i,cpu_tier:2},30,i%2===0);await settle();
 clock+=31*60000;await syncStats();assert.equal(Object.keys(posted[1].body.cpu).length,16);assert.equal(Object.keys(queue().pending.cpu).length,4);
 clock+=31*60000;await syncStats();assert.equal(Object.keys(posted[2].body.cpu).length,4);assert.equal(queue().pending.cpu,undefined);
 // Turned off in Settings: nothing is queued.
 localStorage.setItem('ygo-usage-stats-enabled','false');recordCpuResult({id:'off',opponent:12,cpu_tier:1},3,true);await settle();assert.equal(queue().pending?.cpu,undefined);localStorage.setItem('ygo-usage-stats-enabled','true');
 // The tab reads on demand: the overview, or one opponent.
 await fetchCpuStats();await fetchCpuStats(12);await fetchCpuStats(null,3);assert(/\/v2\/cpu-stats\?character=3/.test(got[2]),got[2]);assert(got[0].endsWith('/v2/cpu-stats')||got[0].includes('/v2/cpu-stats?b='),got[0]);assert(/\/v2\/cpu-stats\?opponent=12/.test(got[1]),got[1]);
 // The campaign marks only counting duels (campaign_expansion.py) and the client records only finished solo duels.
 const campaign=fs.readFileSync(new URL('../campaign_expansion.py',import.meta.url),'utf8');
 assert(/if not \(fallen or run\.get\('encore_active'\) or run\.get\('secret_challenge'\) or easy_mode\.active\(run\) or run\.get\('history_mode'\)=='tag'\):\s*\n\s*request\['cpu_tier'\]=4 if run\.get\('loop'\) else 0 if deck_round\(run\)==0 else min\(3,deck_round\(run\)\/\/3\+1\)/.test(campaign));
 const mobile=fs.readFileSync(new URL('./web/mobile.js',import.meta.url),'utf8');
 assert(mobile.includes("cpuDuel=!lesson&&state?.run?.duel")&&mobile.includes("recordCpuResult(cpuDuel,cpuCharacter,statsRequest.value.winner===0)"));
 assert(mobile.includes("['cpu','CPU Stats']"),'Stats has the CPU Stats tab');assert(mobile.includes('data-do="character-stats-cpu"')&&mobile.includes('cachedCpuStats(null,character)'),'Character Stats rows open the CPU records of that character');
 // Layout C (2026-11-25): a sortable opponent list beside the picked opponent's record, updated in place.
 assert(mobile.includes("CPU_LIST_SORTS=[['played','Most played'],['tough','Toughest'],['easy','Easiest'],['name','A–Z']]")&&mobile.includes("if(a==='cpu-stats-sort')")&&mobile.includes('openCpuOpponent(cpuStatsOpponent)'),'CPU Stats list sorts and opens opponents in place');
 // Character Stats layout F (2026-11-25): the same list + detail, with the level chart, toughest CPUs and All CPU records.
 assert(mobile.includes("CHARACTER_LIST_SORTS=[['played','Most played'],['best','Best win rate'],['worst','Lowest win rate'],['name','A–Z']]")&&mobile.includes("if(a==='character-stats-pick')")&&mobile.includes('cachedCpuStats(null,id)')&&mobile.includes('class="char-all-cpu" data-do="character-stats-cpu"'),'Character Stats list, detail and CPU records link');
 console.log('PASS CPU stats client: one anonymous key per finished CPU duel, counted once, sent in the stats batch (16 a batch, rest waits), respects the stats setting, on-demand reads');
}finally{Date.now=realNow}
