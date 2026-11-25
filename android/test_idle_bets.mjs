// Duel Bets minigame: economy, shop, payouts, pacing and brackets (idle-bets-model.js), plus one real
// recorded CPU duel (idle-bets-sim.js) when the generated content.json is present.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import * as M from './web/idle-bets-model.js';

// ---- a new game: board 1 only, bet 1 to win 5 ----
let s=M.newState();
assert.equal(s.coins,5,'a new game starts with 5 coins');assert.equal(M.sanitize(null).coins,5);
assert.equal(s.boards,1);assert.equal(s.brackets,0);
assert.equal(M.boardStake(1),1);assert.equal(M.boardPayout(1),5);
assert.equal(M.correctPayout(s,1,1),5,'board 1: bet 1, win 5');
assert.equal(s.items.fee_summon,1,'a new game starts with Summon Fees at 1');
assert.deepEqual(M.visibleItems(s).map(i=>i.id),['calls1','fee_summon','fee_attack','fee_spell','fee_trap','speed','feat_summon','feat_battle'],'the opening shop: payout, monster/Spell/Trap fees, speed and the first feats');
assert.ok(M.itemCost('tier1',0)>M.itemCost('tier2',0)&&M.itemCost('tier2',0)>M.itemCost('tier3',0)&&M.itemCost('tier3',0)>M.itemCost('endless',0),'smaller bonuses cost less');
for(const it of M.ITEMS)assert.ok(M.tooltip(M.newState(),it.id).join(' ').length>20,'every item has a tooltip: '+it.id);
assert.ok(M.tooltip({...M.newState(),items:{fee_summon:3}},'fee_summon').some(x=>x.includes('+0.3')),'the tooltip shows the current total');
// Rewards grow ~15% per level and the prices climb faster to match.
assert.deepEqual([0,1,2].map(l=>Math.round(M.levelValue(l)*100)/100),[0,1,2.15]);assert.ok(M.levelValue(10)>19&&M.levelValue(10)<21);
assert.ok(M.itemCost('fee_summon',20)/M.itemCost('fee_summon',19)>1.3,'income items get dearer faster');
// The dearer an income item's first purchase, the more one level earns.
const inc=M.ITEMS.filter(i=>/^(fee_|feat_)/.test(i.id)).sort((a,b)=>M.itemCost(a.id,0)-M.itemCost(b.id,0));
for(let i=1;i<inc.length;i++)assert.ok(M.power(inc[i].id)>=M.power(inc[i-1].id),`${inc[i].id} earns at least as much per level as the cheaper ${inc[i-1].id}`);

// ---- prices: simple items creep up, drastic ones climb steeply ----
const ratio=id=>M.itemCost(id,5)/M.itemCost(id,4);
assert.ok(ratio('calls1')<1.5&&ratio('fee_summon')<1.6,'simple items grow slowly (15% steeper for income items, 12% ramp for all)');
assert.ok(ratio('speed')>ratio('calls1')&&M.itemCost('highroller',1)/M.itemCost('highroller',0)>=30,'board-wide items grow a lot faster');
assert.equal(M.itemCost('open2',0),100,'The Big Leagues costs 100');
assert.equal(M.itemCost('speed',4),50,'the 5th Duel Speed level costs 50');assert.ok(M.itemCost('speed',0)<=10,'the first is cheap');
for(const it of M.ITEMS.filter(i=>i.max>1))for(let l=0;l<Math.min(it.max-1,12);l++)assert.ok(M.itemCost(it.id,l+1)>M.itemCost(it.id,l),`${it.id} gets dearer every purchase (level ${l})`);
assert.equal(M.itemCost('calls1',0),1,'the first upgrade costs 1');

// ---- buying: money goes down, can't overspend, the Big Leagues opens board 2 ----
s.coins=99;
assert.equal(M.buy(s,'open2'),null,'hidden until a milestone, and unaffordable');
assert.ok(!M.visibleItems(s).some(i=>i.id==='tier1'),'tier bonuses come later');
s.coins=1000;M.buy(s,'calls1');M.buy(s,'calls1');
assert.equal(M.itemLevel(s,'calls1'),2);assert.equal(s.coins,1000-M.itemCost('calls1',0)-M.itemCost('calls1',1));
assert.equal(M.correctPayout(s,1,1),10,'two Lucky Calls: 5 + 2 + 3');
assert.deepEqual([1,2,3,4,5,6].map(M.luckyStep),[2,3,5,8,13,21],'each Lucky Calls level adds more: 2, 3, 5, 8, 13, 21');
assert.deepEqual([0,1,2,3,4,5].map(l=>M.callsBonus(1,l)),[0,2,5,10,18,31]);
assert.ok(M.visibleItems(s).some(i=>i.id==='open2'));
let before=s.coins,r=M.buy(s,'open2');
assert.equal(r.kind,'board');assert.equal(s.boards,2);assert.equal(s.coins,before-100);
assert.ok(!M.visibleItems(s).some(i=>i.id==='open2'),'a bought opener leaves the shop');
assert.equal(M.boardStake(2),10);assert.equal(M.boardPayout(2),100,'board 2: bet 10, win 100');
assert.ok(M.visibleItems(s).some(i=>i.id==='calls2'),'board 2 brings its own, pricier set');
assert.ok(['tier1','tier2','tier3','endless'].every(id=>M.visibleItems(s).some(i=>i.id===id)),'tier bonuses appear with Board 2');
assert.ok(M.itemCost('calls2',0)>M.itemCost('calls1',0)*10);
s.coins=0;assert.equal(M.buy(s,'calls2'),null,'no money, no sale');

// ---- speed: +0.1× per purchase, capped at 8× ----
s.settings.infinite=true;M.buy(s,'speed');assert.equal(M.speedOf(s),1.1);for(let i=0;i<100;i++)M.buy(s,'speed');
assert.equal(M.speedOf(s),8);assert.equal(s.coins,0,'infinite money never spends');

// ---- infinite money reaches every board, then brackets, up to 9 ----
for(let k=3;k<=9;k++){M.buy(s,'calls'+(k-1));const res=M.buy(s,'open'+k);assert.ok(res,'opener '+k);assert.equal(s.boards,k)}
assert.equal(s.brackets,1,'nine boards become the first bracket');
for(let b=2;b<=9;b++)assert.equal(M.buy(s,'bracket').kind,'bracket');
assert.equal(s.brackets,9);assert.equal(M.buy(s,'bracket'),null,'nine brackets is the maximum');
assert.equal(M.slotLevel(9,9),25);assert.ok(M.boardPayout(M.slotLevel(9,9))>M.boardPayout(9));

// ---- automation: Auto Bet gets faster per level; Scouting Report backs the higher tier ----
let auto=M.newState();assert.equal(M.autoInterval(auto),0,'no Auto Bet, no automatic bets');
auto.items.autobet=1;assert.equal(M.autoInterval(auto),5000,'level 1: every 5 seconds');
auto.items.autobet=4;assert.ok(M.autoInterval(auto)<5000&&M.autoInterval(auto)>=500);
auto.items.autobet=12;assert.equal(M.autoInterval(auto),500,'never faster than every half second');
const seatsT=[{label:'Tier 1'},{label:'Endless'}],seen=new Set();for(let i=0;i<40;i++)seen.add(M.autoPick(auto,seatsT,M.rng(i)));
assert.equal(seen.size,2,'without Scouting Report the pick is random');
auto.items.scout=1;assert.equal(M.autoPick(auto,seatsT),1,'Scouting Report backs the higher tier');
assert.equal(M.autoPick(auto,[{label:'Tier 3'},{label:'Tier 2'}]),0);
const tie=new Set();for(let i=0;i<40;i++)tie.add(M.autoPick(auto,[{label:'Tier 2'},{label:'Tier 2'}],M.rng(i)));assert.equal(tie.size,2,'equal tiers: random');
assert.ok(M.itemCost('scout',0)>M.itemCost('autobet',0)*5,'Scouting Report costs more');
auto.settings.off={scout:true};assert.equal(new Set([0,1,2,3,4,5,6,7].map(i=>M.autoPick(auto,seatsT,M.rng(i)))).size,2,'Scouting Report switched OFF: back to random');
auto.settings.off={autobet:true};assert.equal(M.autoInterval(auto),0,'Auto Bet switched OFF');
auto.settings.off={};assert.ok(M.visibleItems(auto).some(i=>i.id==='scout'),'bought automation stays in the shop');

// ---- event income: per action, times board level and High Roller ----
s=M.newState();s.items={fee_summon:2,fee_attack:1,fee_direct:2,fee_destroy:1,fee_trap:1,fee_damage:1};
const ev=[['s',0,123,0,0],['a',0,0,-1],['x',1,55,1,4],['x',1,66,0,8],['c',1,44095762,4],['l',1,-2000]];
const P=M.power,V=M.levelValue,base=V(2)*.1*P('fee_summon')+.1*P('fee_attack')+V(2)*.5*P('fee_direct')+.2*P('fee_destroy')+.2*P('fee_trap')+.2*2*P('fee_damage');// the Spell/Trap destroyed (zone 8) pays no Wreckage Fee
assert.ok(Math.abs(M.eventIncome(s,ev,1)-base)<1e-9);
assert.ok(Math.abs(M.eventIncome(s,ev,3)-base*100)<1e-9,'board level 3 pays ×100');
s.items.highroller=2;assert.ok(Math.abs(M.eventIncome(s,ev,1)-base*4)<1e-9,'High Roller ×2 per level');

// ---- what a finished duel pays ----
s=M.newState();s.items={calls1:1,tier1:2,exodia:1};
let pay=M.duelPayout(s,{winner:0,reason:1,turns:8,winnerLp:3000,winnerTier:'Tier 1'},1,1,0);
assert.deepEqual(pay.parts.map(p=>p[0]),['Correct call']);assert.equal(pay.total,7,'one Lucky Calls level: 5 + 2');
// Tier wins: +10% per Tier 1 level on everything the duel paid, fees included
const tb=M.withTierBonus(s,{winner:0,winnerTier:'Tier 1'},pay,3);assert.deepEqual(tb.parts.at(-1)[0],'Tier 1 upset +20%');assert.ok(Math.abs(tb.total-(7+.2*(7+3)))<1e-9,'two levels: +20% of 7 + 3 fees');
assert.equal(M.withTierBonus(s,{winner:0,winnerTier:'Tier 2'},pay,3),pay,'no Tier 2 levels, no bonus');
assert.equal(M.withTierBonus(s,{winner:2,winnerTier:''},pay,3),pay,'a draw pays no tier bonus');
assert.ok(M.TIER_PCT.tier1>M.TIER_PCT.tier2&&M.TIER_PCT.tier2>M.TIER_PCT.tier3&&M.TIER_PCT.tier3>M.TIER_PCT.endless,'smaller share for stronger tiers');
pay=M.duelPayout(s,{winner:1,reason:1,turns:8,winnerLp:3000,winnerTier:'Tier 1'},1,1,0);
pay=M.withTierBonus(s,{winner:1,winnerTier:'Tier 1'},pay,4);assert.deepEqual(pay.parts.map(p=>p[0]),['Tier 1 upset +20%'],'a wrong call still collects the tier bonus on its fees');
pay=M.duelPayout(s,{winner:0,reason:16,turns:9,winnerLp:8000,winnerTier:'Tier 3'},2,2,0);
const jackpot=pay.parts.find(p=>p[0]==='EXODIA JACKPOT');assert.ok(jackpot&&jackpot[2],'Exodia pays a big jackpot');
assert.ok(Math.abs(jackpot[1]-100*M.power('exodia')*10*2)<1e-6,'50×2 (one upgrade) × its price power × board level 2, doubled for backing the winner');
assert.equal(M.duelPayout(s,{winner:1,reason:21,turns:9,winnerLp:500,winnerTier:'Tier 2'},1,1,null).parts[0][0],'DESTINY JACKPOT');

// ---- shop sections: every item has one ----
for(const it of M.ITEMS)assert.notEqual(M.categoryOf(it.id),'Other','category for '+it.id);
assert.equal(M.categoryOf('feat_summon'),'Duel Feats');assert.equal(M.categoryOf('open3'),'Expansion');

// ---- Duel Feats: the main game's coin rules counted from a recorded duel ----
M.setCoinRules([{label:'Monsters summoned: 1+',coins:1,metric:'summons',threshold:1},{label:'Monsters summoned: 3+',coins:2,metric:'summons',threshold:3},
 {label:'Special Summons: 1+',coins:3,metric:'special_summons',threshold:1},{label:'Cards set: 1+',coins:1,metric:'sets',threshold:1},
 {label:'Enemy cards destroyed by battle: 1+',coins:1,metric:'battle_destroy',threshold:1},{label:'Cards banished: 1+',coins:5,metric:'banish',threshold:1},
 {label:'Largest damage hit: 2000+',coins:3,metric:'big_hit',threshold:2000},{label:'Exact lethal damage',coins:30,metric:'exact_lethal',threshold:1},
 {label:'Effect damage dealt: 500+',coins:5,metric:'effect_damage',threshold:500},{label:'Win without taking damage',coins:8,metric:'untouched',threshold:1,victoryOnly:true},
 {label:'Level 8+ monsters summoned: 1+',coins:12,metric:'level_eight',threshold:1},{label:'Play your signature card',coins:10,metric:'signature_played',threshold:1}]);
const info=c=>({1:{type:0x21,level:8,race:'Dragon',attribute:'LIGHT'},2:{type:0x11,level:4,race:'Warrior',attribute:'EARTH'}}[c]||null);
const ftl={winner:0,reason:1,turns:5,seats:[{id:1,tier:0},{id:2,tier:0}],frames:[
 [[['t',0],['s',0,1,0,0],['n',0,0],['p',8],['a',0,0,-1],['p',64],['l',1,-3000]],[[8000,4,30,0,[1,3000,2500,1],0,0,0,0,0,0,0,0,0,0,0,0,0],[5000,5,30,0]]],
 [[['t',1],['s',1,2,0,1],['c',1,999,2],['l',0,0],['x',1,2,1,4],['b',0]]],
 [[['t',0],['p',4],['l',1,-5000]]]]};
const fm=M.duelMetrics(ftl,info,[new Set([1]),new Set()],['Tier 1','Endless']);
assert.equal(fm[0].summons,1);assert.equal(fm[0].tribute_summons,1,'a Level 8 Normal Summon counts as a Tribute Summon');assert.equal(fm[1].special_summons,1);
assert.equal(fm[0].sets,1);assert.equal(fm[0].spell_trap_sets,1);assert.equal(fm[0].battle_destroy,1,'the destroying player gets the credit');
assert.equal(fm[0].big_hit,5000);assert.equal(fm[0].effect_damage,5000,'damage outside an attack is effect damage');assert.equal(fm[0].exact_lethal,1,'5000 into 5000 LP');
assert.equal(fm[0].untouched,1);assert.equal(fm[0].signature_played,1);assert.equal(fm[0].level_eight,1);assert.equal(fm[0].peak_attack,3000);assert.equal(fm[0].boss_victory,1,'beat an Endless deck');
let fst=M.newState();assert.equal(M.featPayout(fst,fm,0,1).total,0,'no feat items, no feat coins');
fst.items.feat_summon=2;const fp=M.featPayout(fst,fm,0,1);assert.ok(fp.total>0&&fp.hits>=3);
fst.items.feat_victory=1;assert.ok(M.featPayout(fst,fm,1,1).total<M.featPayout(fst,fm,0,1).total+1e-9,'victory-only rules pay only for the winner');
assert.ok(M.tooltip(fst,'feat_summon').some(x=>/Monsters summoned/.test(x)),'the tooltip lists the conditions');

// ---- Characters: one item per CPU character, paying when that character wins ----
M.registerCharacters([{id:900,name:'Test Weak',rank:0,sprite:'x.png'},{id:901,name:'Test Strong',rank:4,sprite:'y.png'}]);
assert.equal(M.categoryOf('char_900'),'Characters');
const hid=M.newState();assert.ok(!M.visibleItems(hid).some(i=>i.id==='char_900'),'characters are not available from the start');
for(let i=0;i<3;i++)M.recordDeckResult(hid,[{id:900,tier:0},{id:901,tier:4}],0,1);assert.ok(M.visibleItems(hid).some(i=>i.id==='char_900')&&!M.visibleItems(hid).some(i=>i.id==='char_901'),'a character appears after 3 wins');
assert.equal(M.sanitize(JSON.parse(JSON.stringify(hid))).charWins[900],3,'rebuilt from deck stats on load');assert.ok(M.itemCost('char_901',0)>M.itemCost('char_900',0),'stronger characters cost more');
assert.ok(M.power('char_901')>M.power('char_900'),'and earn more per win');
const cs=M.newState();cs.items.char_901=2;const cp=M.duelPayout(cs,{winnerId:901,winner:0,reason:1,turns:9,winnerLp:3000,winnerTier:'Endless'},1,1,null);
assert.ok(cp.parts.some(p=>p[0]==='Test Strong wins'&&Math.abs(p[1]-2*M.levelValue(2)*M.power('char_901'))<1e-9));
assert.equal(M.duelPayout(cs,{winnerId:900,winner:0,reason:1,turns:9,winnerLp:3000,winnerTier:'Tier 1'},1,1,null).parts.length,0,'no item, no bonus');
assert.equal(M.sanitize({items:{char_901:3,char_999:2}}).items.char_901,3,'saved character levels load; unknown ones are dropped');
assert.equal(M.sanitize({items:{char_999:2}}).items.char_999,undefined);
M.registerCharacters([{id:910,name:'Collector A',rank:4,sprite:'a.png',uc:true},{id:911,name:'Collector B',rank:3,sprite:'b.png',uc:true}]);
assert.ok(M.ITEM.char_uc&&!M.ITEM.char_910&&!M.ITEM.char_911,'Ultimate Collectors share one item');
const ucs=M.newState();M.recordDeckResult(ucs,[{id:910,tier:0},{id:1,tier:0}],0,1);M.recordDeckResult(ucs,[{id:911,tier:0},{id:1,tier:0}],0,1);M.recordDeckResult(ucs,[{id:910,tier:0},{id:1,tier:0}],0,1);assert.ok(M.visibleItems(ucs).some(i=>i.id==='char_uc'),'3 Collector wins in total unlock it');
const us=M.newState();us.items.char_uc=1;assert.ok(M.duelPayout(us,{winnerId:911,winner:1,reason:1,turns:9,winnerLp:100,winnerTier:'Endless'},1,1,null).parts.some(p=>p[0]==='Ultimate Collector wins'),'any Collector win pays it');
assert.ok(M.itemCost('char_uc',0)>M.itemCost('char_901',0),'it costs more than one character of the same rank');

// ---- deck stats: every finished duel counts for both decks ----
const ds=M.newState();M.recordDeckResult(ds,[{id:5,tier:0},{id:6,tier:2}],0,16);M.recordDeckResult(ds,[{id:6,tier:2},{id:5,tier:0}],0,1);
assert.deepEqual(ds.deckStats['5:0'],[2,1,1,0]);assert.deepEqual(ds.deckStats['6:2'],[2,1,0,0]);
assert.deepEqual(M.sanitize({deckStats:{'5:0':[2,1,1,0],'bad':[1],'7:1':[1,2]}}).deckStats,{'5:0':[2,1,1,0]},'saved deck stats are cleaned');

// ---- pacing: frames take time, turns and attacks longer ----
const tl={v:1,seats:[{id:1,tier:0},{id:2,tier:1}],winner:0,reason:1,turns:3,frames:[[[]],[[['t',0]]],[[['a',0,1,-1],['l',1,-1500]],[[1,1,1,1],[6500,5,30,0]]]]};
const sch=M.schedule(tl);assert.equal(sch.at[0],0);assert.ok(sch.at[2]-sch.at[1]>sch.at[1]-sch.at[0],'a turn frame holds longer than an empty one');
assert.equal(M.frameDelay([[['p',4]]]),120,'a phase-only frame passes quickly');
assert.equal(M.finalLp(tl,1),6500);assert.deepEqual(M.damageDealt(tl),[1500,0]);
assert.equal(M.resultOf(tl,[{label:'Tier 1'},{label:'Tier 2'}]).winnerTier,'Tier 1');

// ---- brackets: a league of 9 CPUs, round robin over 4 rounds, most wins first ----
const pool=Array.from({length:60},(_,i)=>({id:i%30,tier:Math.floor(i/30),label:'Tier '+(1+Math.floor(i/30)),key:(i%30)+':'+Math.floor(i/30)}));
const random=M.rng(7),roster=M.pickRoster(pool,random);
assert.equal(roster.length,9);assert.equal(new Set(roster.map(d=>d.id)).size,9,'no character twice in a bracket');
const met=new Set();for(let r=0;r<M.BRACKET_ROUNDS;r++){const pairs=M.roundPairs(r,random);assert.equal(pairs.length,9,'9 duels a round');
 const count=Array(9).fill(0);for(const [a,b] of pairs){assert.notEqual(a,b);count[a]++;count[b]++;met.add(Math.min(a,b)+'-'+Math.max(a,b))}assert.ok(count.every(c=>c===2),'everyone plays twice a round')}
assert.equal(met.size,36,'after 4 rounds every pair of the 9 has met exactly once');
assert.deepEqual(M.standings([1,3,3,0],[0,500,900,0]).slice(0,3),[2,1,0],'ties break on damage dealt');
assert.equal(M.championPayout(M.newState(),1),M.championStake(M.newState(),1)*10,'one of 9: pays 10x');
const strong={id:1,tier:3,label:'Endless'},weak={id:2,tier:0,label:'Opening Duel'};let w=0;const rr=M.rng(3);
for(let i=0;i<2000;i++)w+=M.modelWinner(strong,weak,{},rr)===0;assert.ok(w>1400,'unwatched duels favour the stronger deck');
assert.ok(M.strength(weak,{'2:0':{g:40,w:36}})>M.strength(weak,{}),'recorded results move a deck\'s strength');

// ---- saves: junk is cleaned, levels clamp, infinite money only with the test switch ----
const clean=M.sanitize({coins:'12',items:{speed:99,bogus:3,calls1:-2},boards:20,brackets:4,settings:{fx:'nope',infinite:true}});
assert.equal(clean.coins,12);assert.equal(clean.items.speed,70);assert.ok(!('bogus' in clean.items)&&!('calls1' in clean.items));
assert.equal(clean.boards,9);assert.equal(clean.brackets,4);assert.equal(clean.settings.fx,'full');assert.equal(clean.settings.infinite,M.DEV_TOOLS);
assert.equal(M.sanitize({boards:3,brackets:5}).brackets,0,'no brackets before nine boards');


// ---- numbers ----
assert.equal(M.fmt(12.34),'12.3');assert.equal(M.fmt(1234),'1,234');assert.equal(M.fmt(1.5e6),'1.5M');assert.equal(M.fmt(2e15),'2Qa');assert.equal(M.fmt(Infinity),'∞');
assert.equal(M.fmt(M.championStake(M.newState(),8)),'100Sx','no float dust: 1e23 reads 100Sx, not 99.99Sx');

// ---- one real duel through the recorder (skipped without the generated content.json) ----
const web=path.join(path.dirname(fileURLToPath(import.meta.url)),'web');
if(fs.existsSync(path.join(web,'content.json'))){
 const {MobileDuel}=await import(pathToFileURL(path.join(web,'duel.js')));
 const {recordDuel,winKind}=await import(pathToFileURL(path.join(web,'idle-bets-sim.js')));
 const read=n=>JSON.parse(fs.readFileSync(path.join(web,n),'utf8'));
 const meta=read('content.json'),decks=meta.cpuWatchDecks,ids=Object.keys(decks).filter(id=>decks[id]?.[0]?.main?.length);
 const engine=await new MobileDuel([...meta.cards,...(meta.tokenCards||[])]).init([read('engine-data.json'),read('scripts.json')]);
 const t=recordDuel(engine,[decks[ids[0]][0],decks[ids[1]][0]],[{id:+ids[0],tier:0},{id:+ids[1],tier:0}],12345);
 assert.equal(t.v,4);
 assert.equal(engine.replayRecord,null,'minigame duels are never kept as game replays');assert.ok([0,1,2].includes(t.winner));assert.ok(t.frames.length>5,'a duel has frames');
 assert.ok(t.frames[0][1]&&t.frames[0][1].length===2&&t.frames[0][1][0].length===18,'the first frame carries both boards');
 assert.ok(t.frames.some(f=>f[0].some(e=>e[0]==='t')),'turns are recorded');
 assert.ok(t.frames.some(f=>f[0].some(e=>e[0]==='p'&&e[1]===8)),'phases are recorded (a Battle Phase)');
 assert.ok(['lp','exodia','destiny','deckout','special'].includes(winKind(t)));
 const again=recordDuel(engine,[decks[ids[0]][0],decks[ids[1]][0]],[{id:+ids[0],tier:0},{id:+ids[1],tier:0}],12345);
 assert.equal(JSON.stringify(again),JSON.stringify(t),'the same seed records the same duel');
 console.log('recorded duel:',t.frames.length,'frames,',t.turns,'turns');
}else console.log('content.json missing: skipped the recorded duel');
console.log('Duel Bets tests passed');
