// Heal/burn bursts (player report, 2026-11-17: heal builds with Fire Princess ran very badly). In the real core, both
// seats hold two face-up Fire Princess and three face-up Solemn Wishes, with stacked Healing Echo, Healing Spring,
// Damage Echo, Burn Proficiency and Scorched Hourglass. One Standby Phase then sends hundreds of LP cues and relic
// pulses in a single presentation pass, and each LP cue used to add its own effects and read the layout: 19.8 s frozen
// at 4x CPU in headless Chrome. lp-cue-burst.js folds a long run into one gain and one loss per player and one pulse
// per relic; this test bounds the cues per pass, checks the totals still add up, and bounds the core's own time per
// LP event. Run: runtime/ai/node.exe android/test_lp_burst.mjs
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel}=await import('./web/duel.js');
const {compactLifeBursts,LP_BURST_LIMIT}=await import('./web/lp-cue-burst.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const FP=id('Fire Princess'),WISHES=id('Solemn Wishes');
// The same relics for both seats; at the first Draw Phase each seat puts 2 Fire Princess and 3 Solemn Wishes face-up.
const relics=['healing_echo','healing_echo','healing_echo','spring','spring','spring','static_coil','static_coil','static_coil','burn_proficiency','scorched_hourglass'];
const script=execFileSync(python,['-B','-c',`import sys,json;sys.path.insert(0,'.');import passives
run={'curses':[],'challenge_level':0,'character':0,'started_at':1,'artifacts':json.loads(sys.argv[1])}
print(passives.script(run)+'\\n'+'\\n'.join(passives.duel_rules(passives.multiplayer_script(run,1))))`,JSON.stringify(relics)],{cwd:root,encoding:'utf8'})+`
do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START+PHASE_DRAW)
e:SetOperation(function(e) for p=0,1 do
 for i=1,2 do local c=Duel.GetFirstMatchingCard(Card.IsCode,p,LOCATION_DECK,0,nil,${FP}) if c then Duel.MoveToField(c,p,p,LOCATION_MZONE,POS_FACEUP_ATTACK,true) end end
 for i=1,3 do local c=Duel.GetFirstMatchingCard(Card.IsCode,p,LOCATION_DECK,0,nil,${WISHES}) if c then Duel.MoveToField(c,p,p,LOCATION_SZONE,POS_FACEUP,true) end end
end e:Reset() end) Duel.RegisterEffect(e,0) end`;
const deck=[...Array(3).fill(FP),...Array(3).fill(WISHES),...['Rain of Mercy','Upstart Goblin','Red Medicine','Dian Keto the Cure Master','Blue Medicine',"Goblin's Secret Remedy",'Soul of the Pure','Mooyan Curry','Nimble Momonga','Hysteric Fairy'].flatMap(n=>Array(3).fill(id(n))),...Array(4).fill(id("Sebek's Blessing"))];
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
let s=e.start(deck.slice(),deck.slice(),200000,200000,5,7,[],[],script);
const passes=[];let coreMs=0,steps=0;
passes.push(e.visuals.splice(0));
while(!s.finished&&steps<600&&s.turn<=4){const t=performance.now();s=e.respond(e.auto());coreMs+=performance.now()-t;steps++;passes.push(e.visuals.splice(0))}
assert.deepEqual(e.errors.slice(0,2),[],'no script errors');
const lpOf=pass=>pass.filter(c=>c.kind==='lp');
const lpEvents=passes.reduce((n,p)=>n+lpOf(p).length,0),biggest=passes.reduce((a,p)=>lpOf(p).length>lpOf(a).length?p:a,[]);
const sum=(list,player,sign)=>list.filter(c=>c.kind==='lp'&&c.player===player&&Math.sign(c.amount)===sign).reduce((n,c)=>n+c.amount,0);
let worstAfter=0;
for(const pass of passes){
 const after=compactLifeBursts(pass);worstAfter=Math.max(worstAfter,lpOf(after).length);
 // Nothing but LP and relic cues is dropped, and each relic still pulses.
 assert.deepEqual(after.filter(c=>c.kind!=='lp'&&c.kind!=='relic'),pass.filter(c=>c.kind!=='lp'&&c.kind!=='relic'),'other cues kept in order');
 assert.deepEqual(new Set(after.filter(c=>c.kind==='relic').map(c=>c.relic)),new Set(pass.filter(c=>c.kind==='relic').map(c=>c.relic)),'every relic still pulses');
 for(const player of [0,1])for(const sign of [1,-1])assert.equal(sum(after,player,sign),sum(pass,player,sign),'LP totals kept');
}
console.log(JSON.stringify({steps,turns:s.turn,lpEvents,biggestPass:{lp:lpOf(biggest).length,relic:biggest.filter(c=>c.kind==='relic').length},compactedLpPerPassMax:worstAfter,coreMsPerLpEvent:+(coreMs/lpEvents).toFixed(3)}));
assert(lpOf(biggest).length>=100,'the stacked heal/burn board produces a burst of 100+ LP cues in one pass');
assert(worstAfter<=Math.max(LP_BURST_LIMIT,4),'a pass plays at most a few LP cues however many LP events it holds');
// Core work per LP event (relic Lua, Fire Princess triggers, CPU answers) stays small: no recursion, no rescans.
assert(coreMs/lpEvents<5,'core time per LP event under 5 ms');

// The folded loss plays from the LP the gain reached, so the last cue lands on the real final LP.
const burst=[{kind:'lp',player:1,amount:500,before:1000},{kind:'relic',relic:'healing_echo'},{kind:'lp',player:1,amount:-1200,before:1500},{kind:'lp',player:0,amount:-500,before:800,cost:true},
 ...Array(8).fill(0).flatMap((_,i)=>[{kind:'lp',player:1,amount:-100,before:300-i*100+0},{kind:'relic',relic:'static_coil'}])];
const folded=compactLifeBursts(burst),loss=folded.find(c=>c.player===1&&c.amount<0),gain=folded.find(c=>c.player===1&&c.amount>0);
assert.deepEqual([gain.before,gain.amount,loss.before,loss.amount],[1000,500,1500,-2000],'gain first, then the loss from the gained LP');
assert.equal(folded.find(c=>c.player===0).cost,true,'a run of costs stays a cost');
assert.equal(folded.filter(c=>c.kind==='relic').length,2,'each relic pulses once');
// Bounded however long the burst: 10, 100 and 1000 events give the same number of cues.
const sizes=[10,100,1000].map(n=>compactLifeBursts(Array.from({length:n},(_,i)=>i%3===2?{kind:'relic',relic:'r'+(i%2)}:{kind:'lp',player:i%2,amount:i%4?-500:300,before:9000})).length);
assert.equal(new Set(sizes).size,1,'cue count does not grow with the burst: '+sizes);
// Short runs, as in normal duels, are left exactly as they were.
const short=[{kind:'lp',player:0,amount:1000,before:8000},{kind:'lp',player:1,amount:-500,before:8000},{kind:'relic',relic:'x'},{kind:'relic',relic:'x'}];
assert.deepEqual(compactLifeBursts(short),short,'short runs untouched');
// The duel screen plays every pass through it.
const mobile=fs.readFileSync(new URL('./web/mobile.js',import.meta.url),'utf8');
assert(/cues=compactLifeBursts\(engine\.visuals\.splice\(0\)\)/.test(mobile),'playDuelCues folds LP bursts');
console.log('PASS LP bursts: heal/burn chains stay a few cues per pass');
process.exit(0);
