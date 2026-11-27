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
assert.deepEqual(M.visibleItems(s).map(i=>i.id),['calls1','fee_summon'],'a new game shows only Lucky Calls and Summon Fees');
// Items appear as you earn half their first price (Cookie Clicker style), cheapest first.
s.earned=2;assert.deepEqual(M.visibleItems(s).map(i=>i.id).sort(),['calls1','fee_spell','fee_summon','fee_trap'],'after earning 2: Spell and Trap Fees (price 4)');
s.earned=5;assert.ok(['fee_attack','speed'].every(id=>M.visibleItems(s).some(i=>i.id===id)));s.earned=0;
assert.ok(!M.ITEMS.some(i=>/^feat_/.test(i.id))&&!M.CATEGORIES.some(c=>c[0]==='Duel Feats'),'no Duel Feats (user, Discord 2026-11-26)');
assert.ok(M.itemCost('tier1',0)>M.itemCost('tier2',0)&&M.itemCost('tier2',0)>M.itemCost('tier3',0)&&M.itemCost('tier3',0)>M.itemCost('endless',0),'smaller bonuses cost less');
for(const it of M.ITEMS)assert.ok(M.tooltip(M.newState(),it.id).join(' ').length>20,'every item has a tooltip: '+it.id);
assert.ok(M.tooltip({...M.newState(),items:{fee_summon:3}},'fee_summon').some(x=>x.includes('+0.3')),'the tooltip shows the current total');
// Cookie Clicker scaling: rewards grow 15% per level, prices ×1.3225 (1.15²), so each next level pays back 15% slower.
assert.deepEqual([0,1,2].map(l=>Math.round(M.levelValue(l)*100)/100),[0,1,2.15]);assert.ok(M.levelValue(10)>19&&M.levelValue(10)<21);
for(const id of ['calls1','calls3','fee_summon','fee_heal','flawless']){const r=M.itemCost(id,40)/M.itemCost(id,39);assert.ok(Math.abs(r-1.3225)<.002,id+' price ×1.3225 per level, got '+r)
 const payback=l=>M.itemCost(id,l)/(M.levelValue(l+1)-M.levelValue(l));assert.ok(Math.abs(payback(31)/payback(30)-1.15)<.01,id+': each level pays back 15% slower')}
// The dearer an income item's first purchase, the more one level earns.
const inc=M.ITEMS.filter(i=>/^fee_/.test(i.id)).sort((a,b)=>M.itemCost(a.id,0)-M.itemCost(b.id,0));
for(let i=1;i<inc.length;i++)assert.ok(M.power(inc[i].id)>=M.power(inc[i-1].id),`${inc[i].id} earns at least as much per level as the cheaper ${inc[i-1].id}`);

// ---- prices: simple items creep up, drastic ones climb steeply ----
const ratio=id=>M.itemCost(id,5)/M.itemCost(id,4);
assert.ok(ratio('calls1')<1.5&&ratio('fee_summon')<1.5,'income items grow slowly');
assert.ok(ratio('speed')>ratio('calls1')&&ratio('tier1')>2&&M.itemCost('highroller',1)/M.itemCost('highroller',0)>=999,'multipliers (speed, tier bonuses, High Roller) climb much faster');
for(let k=3;k<=9;k++)assert.equal(M.itemCost('open'+k,0),M.itemCost('open'+(k-1),0)*M.BOARD_RATIO,'each board opener costs BOARD_RATIO× the one before');
// Each board's item set earns 10× the previous one, like the stakes (power = ln 10 / ln BOARD_RATIO).
assert.ok(Math.abs(Math.log(M.power('fee_fusion')/M.power('fee_destroy'))/Math.log(M.itemCost('fee_fusion',0)/M.itemCost('fee_destroy',0))-Math.log(10)/Math.log(M.BOARD_RATIO))<1e-9,'power exponent ties sets to the stakes');
assert.equal(M.longGameFactor(10),0);assert.equal(M.longGameFactor(11),1.1);assert.equal(M.longGameFactor(40),2,'Long Game: once per duel past turn 10, up to double');
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
assert.ok(Math.abs(M.correctPayout(s,1,1)-7.15)<1e-9,'two Lucky Calls: 5 + 1 + 1.15');
// Every Calls item, Lucky Calls included: once it costs as much as the next board's opener, one more level adds
// less to a correct call than that next board pays (user: Lucky Calls vs The Big Leagues).
for(let k=1;k<=8;k++){const open=M.itemCost('open'+(k+1),0);let l=0;while(M.itemCost('calls'+k,l)<open)l++;
 const step=M.callsBonus(k,l+1)-M.callsBonus(k,l);assert.ok(step<M.boardPayout(k+1)/4,`calls${k} level ${l+1} (${M.itemCost('calls'+k,l)}) adds ${step}, under a quarter of board ${k+1}'s ${M.boardPayout(k+1)}`)}
assert.ok(!M.visibleItems(s).some(i=>i.id==='open2'),'not until you have earned half its price');s.earned=50;assert.ok(M.visibleItems(s).some(i=>i.id==='open2'));
let before=s.coins,r=M.buy(s,'open2');
assert.equal(r.kind,'board');assert.equal(s.boards,2);assert.equal(s.coins,before-100);
assert.ok(!M.visibleItems(s).some(i=>i.id==='open2'),'a bought opener leaves the shop');
assert.equal(M.boardStake(2),10);assert.equal(M.boardPayout(2),100,'board 2: bet 10, win 100');
s.earned=1000;assert.ok(M.visibleItems(s).some(i=>i.id==='calls2'),'board 2 brings its own, pricier set');
assert.ok(['tier1','tier2','tier3','endless'].every(id=>M.visibleItems(s).some(i=>i.id===id)),'tier bonuses appear with Board 2');
assert.ok(M.itemCost('calls2',0)>M.itemCost('calls1',0)*10);
s.coins=0;assert.equal(M.buy(s,'calls2'),null,'no money, no sale');

// ---- speed: +0.1× per purchase, capped at 10× ----
s.settings.infinite=true;M.buy(s,'speed');assert.equal(M.speedOf(s),1.1);for(let i=0;i<100;i++)M.buy(s,'speed');
assert.equal(M.speedOf(s),10,'Duel Speed tops out at 10x');assert.equal(s.coins,0,'infinite money never spends');

// ---- infinite money reaches every board, then brackets, up to 9 ----
for(let k=3;k<=9;k++){M.buy(s,'calls'+(k-1));const res=M.buy(s,'open'+k);assert.ok(res,'opener '+k);assert.equal(s.boards,k)}
assert.equal(s.brackets,1,'nine boards become the first bracket');
for(let b=2;b<=9;b++)assert.equal(M.buy(s,'bracket').kind,'bracket');
assert.equal(s.brackets,9);assert.equal(M.buy(s,'bracket'),null,'nine brackets is the maximum');
assert.equal(M.slotLevel(9,9),25);assert.ok(M.boardPayout(M.slotLevel(9,9))>M.boardPayout(9));

// ---- automation: Auto Bet gets faster per level; Scouting Report backs the higher tier ----
let auto=M.newState();assert.equal(M.autoInterval(auto),0,'no Auto Bet, no automatic bets');
auto.items.autobet=1;assert.equal(M.autoInterval(auto),10000,'level 1: waits the full 10 seconds');
auto.items.autobet=2;assert.equal(M.autoInterval(auto),8500,'15% shorter per level');auto.items.autobet=4;assert.ok(M.autoInterval(auto)<8500&&M.autoInterval(auto)>=500);
auto.items.autobet=20;assert.equal(M.autoInterval(auto),500,'never faster than every half second');
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
assert.ok(Math.abs(M.eventIncome(s,ev,3)-base)<1e-9,'items pay the same on every board (a new board never multiplies old items)');
s.items.highroller=2;assert.ok(Math.abs(M.eventIncome(s,ev,1)-base*4)<1e-9,'High Roller ×2 per level');

// ---- what a finished duel pays ----
s=M.newState();s.items={calls1:1,tier1:2,exodia:1};
let pay=M.duelPayout(s,{winner:0,reason:1,turns:8,winnerLp:3000,winnerTier:'Tier 1'},1,1,0);
assert.deepEqual(pay.parts.map(p=>p[0]),['Correct call']);assert.equal(pay.total,6,'one Lucky Calls level: 5 + 1');
// Tier wins: +10% per Tier 1 level on everything the duel paid, fees included
const tb=M.withTierBonus(s,{winner:0,winnerTier:'Tier 1'},pay,3);assert.deepEqual(tb.parts.at(-1)[0],'Tier 1 upset +20%');assert.ok(Math.abs(tb.total-(6+.2*(6+3)))<1e-9,'two levels: +20% of 6 + 3 fees');
assert.equal(M.withTierBonus(s,{winner:0,winnerTier:'Tier 2'},pay,3),pay,'no Tier 2 levels, no bonus');
assert.equal(M.withTierBonus(s,{winner:2,winnerTier:''},pay,3),pay,'a draw pays no tier bonus');
assert.ok(M.TIER_PCT.tier1>M.TIER_PCT.tier2&&M.TIER_PCT.tier2>M.TIER_PCT.tier3&&M.TIER_PCT.tier3>M.TIER_PCT.endless,'smaller share for stronger tiers');
pay=M.duelPayout(s,{winner:1,reason:1,turns:8,winnerLp:3000,winnerTier:'Tier 1'},1,1,0);
pay=M.withTierBonus(s,{winner:1,winnerTier:'Tier 1'},pay,4);assert.deepEqual(pay.parts.map(p=>p[0]),['Tier 1 upset +20%'],'a wrong call still collects the tier bonus on its fees');
pay=M.duelPayout(s,{winner:0,reason:16,turns:9,winnerLp:8000,winnerTier:'Tier 3'},2,2,0);
const jackpot=pay.parts.find(p=>p[0]==='EXODIA JACKPOT');assert.ok(jackpot&&jackpot[2],'Exodia pays a big jackpot');
assert.ok(Math.abs(jackpot[1]-100*M.power('exodia')*2)<1e-6,'50×2 (one upgrade) × its price power, doubled for backing the winner (same on every board)');
assert.ok(!M.ITEM.destiny,'no Destiny jackpot (no CPU deck runs Destiny Board)');assert.equal(M.duelPayout(s,{winner:1,reason:21,turns:9,winnerLp:500,winnerTier:'Tier 2'},1,1,null).parts.length,0);

// ---- shop sections: every item has one ----
for(const it of M.ITEMS)assert.notEqual(M.categoryOf(it.id),'Other','category for '+it.id);
assert.equal(M.categoryOf('fee_trap'),'Card Fees');assert.equal(M.categoryOf('open3'),'Expansion');

// ---- Characters: one item per CPU character, paying when that character wins ----
M.registerCharacters([{id:900,name:'Test Weak',rank:0,sprite:'x.png'},{id:901,name:'Test Strong',rank:4,sprite:'y.png'},{id:902,name:'Test T1',rank:1,sprite:'z.png',labels:['Tier 1']},{id:903,name:'Test T2',rank:2,sprite:'w.png',labels:['Tier 1','Tier 2']},{id:904,name:'Test Endless',rank:4,sprite:'v.png',labels:['Tier 1','Tier 2','Tier 3','Endless']}]);
assert.ok(M.ITEM.char_902.boost>1.6&&M.ITEM.char_903.boost>1.3&&M.ITEM.char_903.boost<M.ITEM.char_902.boost,'rare winners earn more per win: T1-only most, T1-T2 less');
assert.equal(M.ITEM.char_904.boost,1,'a character with decks up to Endless gets no boost');
assert.equal(M.categoryOf('char_900'),'Characters');
const hid=M.newState();assert.ok(!M.visibleItems(hid).some(i=>/^char_/.test(i.id)),'characters are not available from the start');
hid.earned=1e30;assert.ok(!M.visibleItems(hid).some(i=>/^char_/.test(i.id)),'characters come from the roster, not from earnings');
// ---- roster: Destiny Duel picks by tier, slots after the 5th Destiny Duel ----
{const r=M.newState();assert.equal(M.rosterPickTier(r),'Tier 1');assert.equal(M.openSlots(r,'Tier 1'),0);
 assert.ok(!M.rosterWin(r,'Tier 2',903),'picks go tier by tier');assert.ok(M.rosterWin(r,'Tier 1',902));assert.deepEqual(M.rosterOf(r,'Tier 1'),[902]);assert.equal(M.rosterPickTier(r),'Tier 2');
 assert.ok(M.visibleItems(r).some(i=>i.id==='char_902'),'a roster duelist can be upgraded');
 r.coins=1e20;assert.ok(!M.buySlot(r,'Tier 1'),'no slots before the 5th Destiny Duel');r.destinyPlayed=5;assert.ok(M.buySlot(r,'Tier 1'));assert.equal(M.openSlots(r,'Tier 1'),1);
 assert.ok(M.rosterAdd(r,'Tier 1',900));assert.ok(!M.rosterAdd(r,'Tier 1',901),'one duelist per slot');assert.ok(M.slotCost(r,'Tier 1')>1e7,'each slot costs more');
 const k=M.sanitize(JSON.parse(JSON.stringify(r)));assert.deepEqual(k.roster['Tier 1'],[902,900]);assert.equal(k.rosterPicks,1);assert.equal(k.slots['Tier 1'],1);
 const n=M.startRun({...r});assert.deepEqual(n.roster['Tier 1'],[902,900],'the roster stays through a regress');}
for(let i=0;i<3;i++)M.recordDeckResult(hid,[{id:900,tier:0},{id:901,tier:4}],0,1);
assert.equal(M.sanitize(JSON.parse(JSON.stringify(hid))).charWins[900],3,'rebuilt from deck stats on load');assert.ok(M.itemCost('char_901',0)>M.itemCost('char_900',0),'stronger characters cost more');
assert.ok(M.power('char_901')>M.power('char_900'),'and earn more per win');
const cs=M.newState();cs.items.char_901=2;const cp=M.duelPayout(cs,{winnerId:901,winner:0,reason:1,turns:9,winnerLp:3000,winnerTier:'Endless'},1,1,null);
assert.ok(cp.parts.some(p=>p[0]==='Test Strong wins'&&Math.abs(p[1]-2*M.levelValue(2)*M.power('char_901'))<1e-9));
assert.equal(M.duelPayout(cs,{winnerId:900,winner:0,reason:1,turns:9,winnerLp:3000,winnerTier:'Tier 1'},1,1,null).parts.length,0,'no item, no bonus');
assert.equal(M.sanitize({items:{char_901:3,char_999:2}}).items.char_901,3,'saved character levels load; unknown ones are dropped');
assert.equal(M.sanitize({items:{char_999:2}}).items.char_999,undefined);
M.registerCharacters([{id:910,name:'Collector A',rank:4,sprite:'a.png',uc:true},{id:911,name:'Collector B',rank:3,sprite:'b.png',uc:true}]);
assert.ok(M.ITEM.char_uc&&!M.ITEM.char_910&&!M.ITEM.char_911,'Ultimate Collectors share one item');
const ucs=M.newState();ucs.earned=1e9;M.recordDeckResult(ucs,[{id:910,tier:0},{id:1,tier:0}],0,1);M.recordDeckResult(ucs,[{id:911,tier:0},{id:1,tier:0}],0,1);M.recordDeckResult(ucs,[{id:910,tier:0},{id:1,tier:0}],0,1);assert.ok(!M.visibleItems(ucs).some(i=>i.id==='char_uc'),'not without a Collector in the roster');ucs.roster={'Endless':[911]};assert.ok(M.visibleItems(ucs).some(i=>i.id==='char_uc'),'a Collector in the roster shows the shared item');
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
assert.equal(clean.coins,12);assert.equal(clean.items.speed,90);assert.ok(!('bogus' in clean.items)&&!('calls1' in clean.items));
assert.equal(clean.boards,9);assert.equal(clean.brackets,4);assert.equal(clean.settings.fx,'full');assert.equal(clean.settings.infinite,M.DEV_TOOLS);
assert.equal(M.sanitize({boards:3,brackets:5}).brackets,0,'no brackets before nine boards');


// ---- numbers ----
assert.equal(M.fmt(12.34),'12.3');assert.equal(M.fmt(1234),'1,234');assert.equal(M.fmt(1.5e6),'1.5M');assert.equal(M.fmt(2e15),'2Qa');assert.equal(M.fmt(Infinity),'∞');
assert.equal(M.fmt(M.championStake(M.newState(),8)),'100Sx','no float dust: 1e23 reads 100Sx, not 99.99Sx');

// ---- prestige: Regress at 1M coins, 1 star per 500K; the skill tree ----
{let p=M.newState();p.earned=999999;p.coins=5e9;assert.equal(M.regress(p),null,'no regress under 1M earned this run (coins held do not count)');
 p.coins=10;p.earned=8.5e6;p.items.fee_attack=5;p.boards=4;const r=M.regress(p);assert.equal(r.gained,2,'stars: cube root of the millions');
 let n=r.state;assert.equal(n.stars,2);assert.equal(n.regresses,1);assert.equal(n.boards,1);assert.equal(n.coins,5);assert.equal(n.items.fee_attack,undefined,'the run resets');
 assert.ok(!M.buyNode(n,'kit'),'Starter Kit needs Seed Money first');assert.ok(M.buyNode(n,'seed'));assert.equal(n.stars,1);
 n.stars=1000;for(const id of ['nest','kit','pass','quick','quick','order','insider','interest','haggle','haggle'])assert.ok(M.buyNode(n,id),id);
 n=M.startRun(n);assert.equal(n.coins,1000,'Seed Money + Nest Egg 1: 1,000 coins');assert.equal(n.items.fee_spell,3,'Starter Kit 1: fees at 3');assert.equal(n.boards,2,'Season Pass 1: 2 boards');
 assert.equal(n.items.speed,10);assert.equal(n.items.autobet,3);assert.equal(n.items.scout,1);
 assert.equal(M.price(n,'calls1',10),Math.ceil(M.itemCost('calls1',10)*.92),'Haggler 2: 8% off');
 assert.ok(Math.abs(M.correctPayout(n,1,1)-5*1.1)<1e-9,'Compound Interest 1: +10%');
 n.tree.starpower=5;n.earned=1e9;assert.equal(M.starsFor(n),15,'Star Power 5: 10 stars x1.5');assert.equal(M.starsFor({...n,earned:1e12,tree:{}}),100);assert.equal(M.nextStarAt({...n,earned:1e9,tree:{}}),1331e6,'next star at 11 cubed millions');
 assert.equal(M.starsFor({...n,earned:1e24,tree:{}}),4256,'past 1T stars grow with the log');assert.equal(M.starsFor({...n,earned:1e36,tree:{}}),11857);
 {const q={...n,earned:1e18,tree:{}},next=M.nextStarAt(q);assert.equal(M.starsFor({...q,earned:next}),M.starsFor(q)+1,'next star past 1T');assert.equal(M.starsFor({...q,earned:next*.999}),M.starsFor(q))}
 assert.equal(M.TREE_BY.interest.cost(0),1,'first levels keep their price');assert.ok(M.TREE_BY.interest.cost(1)>=6,'later levels cost more');
 assert.deepEqual(M.sanitize(JSON.parse(JSON.stringify(n))).tree,n.tree,'the tree is saved');
 {const g=M.newState();g.earned=1e9;assert.equal(M.regressBegin(g),10);assert.ok(g.pendingRun&&g.stars===10,'stars first, the run waits');assert.ok(M.buyNode(g,'seed'));const n2=M.finishRun(g);assert.equal(n2.coins,M.startCoins(1),'what was bought before the new run applies to it');assert.ok(!n2.pendingRun);
  assert.ok(!M.sanitize({...g,pendingRun:true}).pendingRun,'a reload mid-regress starts the new run')}
 assert.ok(!M.buyNode(M.newState(),'interest'),'every branch starts at the root');
 assert.deepEqual(M.sanitize({tree:{seed:3,kit:1}}).tree,{seed:1,nest:2,kit:1},'old Seed Money levels become Nest Egg');
 for(const x of M.TREE)if(x.req)assert.ok(M.TREE_BY[x.req[0]].at[1]<x.at[1],x.id+' sits above what it needs');}
// ---- Destiny Duel: every power of 100 from 100, once ----
{const d=M.newState();d.coins=99;assert.equal(M.destinyDue(d),0);d.coins=150;assert.equal(M.destinyDue(d),2);d.destiny=2;d.coins=9999;assert.equal(M.destinyDue(d),0,'1,000 is not a milestone');
 d.coins=12000;assert.equal(M.destinyDue(d),4);d.coins=5e7;assert.equal(M.destinyDue(d),6,'skipped milestones: the highest one');d.destiny=6;assert.equal(M.destinyDue(d),0,'once each');d.coins=2e8;assert.equal(M.destinyDue(d),8);d.destiny=8;d.coins=5e10;assert.equal(M.destinyDue(d),0,'past 100M: every power of 1000');d.coins=2e11;assert.equal(M.destinyDue(d),11);d.destiny=11;d.coins=1e13;assert.equal(M.destinyDue(d),0);d.coins=1e14;assert.equal(M.destinyDue(d),14);
 assert.equal(M.sanitize({coins:5e5}).destiny,5,'older saves: milestones already passed count as played');}
// ---- bulk buying, deck-out bonus ----
{const b=M.newState();b.coins=1e6;const one=M.bulk(b,'fee_summon',1),five=M.bulk(b,'fee_summon',5);assert.equal(one.count,1);assert.equal(five.count,5);assert.ok(five.cost>one.cost*5,'each level dearer');
 const mx=M.bulk(b,'fee_summon','max');assert.ok(mx.count>5&&mx.cost<=b.coins&&mx.cost+M.price(b,'fee_summon',1+mx.count)>b.coins,'MAX buys all you can afford');
 b.coins=0;assert.equal(M.bulk(b,'fee_summon','max').count,0);
 const pay=M.duelPayout(M.newState(),{winner:0,reason:2,turns:30,winnerLp:4000},2,2);assert.ok(pay.parts.some(p=>p[0]==='Deck-out jackpot'&&p[1]>0),'deck-out wins pay without the jackpot item');}
// ---- character upgrades: payout, spotlight, signature card, LP, relics and curses ----
{const mods={chars:{'5':{card:100,cardName:'X',field:false,relics:['a@5','b@5','c@5'],curses:['tax','mercy','drain']},'6':{card:200,relics:[],curses:[]}},relics:{'a@5':{name:'A',text:'',s:['RELIC0','RELIC1']}},curses:{tax:{s:['TAX0','TAX1']},mercy:{s:['M0','M1']},drain:{s:['','']}}};
 M.registerMods(mods);M.registerCharacters([{id:5,name:'Five',rank:1,sprite:'f.png',labels:['Tier 1']},{id:6,name:'Six',rank:1,sprite:'s.png',labels:['Tier 1']}]);
 const c=M.newState();assert.equal(M.duelMods(c,[5,6]).sig,'','no upgrades: plain duels keep sharing the library');
 c.coins=1e9;assert.ok(M.buyCharUp(c,5,'lp'));assert.ok(M.buyCharUp(c,6,'foe'));assert.ok(M.buyCharUp(c,5,'card'));assert.ok(!M.buyCharUp(c,5,'card'),'the card is bought once');
 assert.ok(M.buyCharUp(c,5,'relic','a@5'));assert.ok(!M.buyCharUp(c,5,'relic','zzz'),'only its own three');assert.ok(M.buyCharUp(c,6,'curse','tax')===false,'curses must be the character\'s own');
 assert.ok(M.buyCharUp(c,5,'curse','tax'));assert.ok(M.buyCharUp(c,5,'curse','drain'));
 const dm=M.duelMods(c,[5,6]);assert.deepEqual(dm.lp,[8000,7000],"5: +100 LP, -100 from 6's Intimidation; 6: -1000 from 5's Withering Soul");
 assert.ok(dm.passives.includes('RELIC0')&&!dm.passives.includes('RELIC1'),"the relic acts for its owner's seat");
 assert.ok(dm.passives.includes('TAX1')&&!dm.passives.includes('TAX0'),"the curse lands on the opponent's seat");
 assert.ok(/Duel\.SendtoHand\(tc,0,REASON_RULE\)/.test(dm.passives)&&dm.passives.includes(',100)'),"signature card 100 into seat 0's hand");
 assert.notEqual(dm.sig,'');assert.equal(M.duelMods(c,[6,5]).lp[1],8000,'seats swap cleanly');
 assert.ok(M.charWeight(c,5)===1&&(M.buyCharUp(c,5,'spot'),M.charWeight(c,5)===1.6),'Spotlight: +60% per level');
 assert.equal(M.autoPick(c,[{id:6},{id:5}],()=>0),0,'no Fan Club: the usual pick');c.coins=1e12;assert.ok(M.buyCharUp(c,5,'fan'));assert.equal(M.autoPick(c,[{id:6},{id:5}],()=>0),1,'Fan Club: Auto Bet backs them');assert.equal(M.sanitize(JSON.parse(JSON.stringify(c))).chars['5'].fan,1,'Fan Club is saved');
 assert.ok(M.toggleFan(c,5));assert.equal(M.autoPick(c,[{id:6},{id:5}],()=>0),0,'favourite switched off: the usual pick');assert.equal(M.sanitize(JSON.parse(JSON.stringify(c))).chars['5'].fanOff,true,'the switch is saved');M.toggleFan(c,5);assert.equal(M.autoPick(c,[{id:6},{id:5}],()=>0),1);
 {const v=M.newState();v.coins=1e12;v.items.autobet=1;v.items.betpay=1;v.items.tier2=3;assert.equal(M.autoPick(v,[{id:5,label:'Tier 1'},{id:6,label:'Tier 2'}],()=>0),1,'Payout Sense counts tier upgrades');
  v.items.char_5=30;assert.equal(M.autoPick(v,[{id:5,label:'Tier 1'},{id:6,label:'Tier 2'}],()=>1),0,'and character Payout')
  v.items.scout=1;assert.equal(M.autoPick(v,[{id:5,label:'Tier 1'},{id:6,label:'Tier 2'}],()=>1),1,'Scouting Report goes first when both are on');v.settings.off.scout=true;assert.equal(M.autoPick(v,[{id:5,label:'Tier 1'},{id:6,label:'Tier 2'}],()=>1),0,'switched off: Payout Sense decides')}
 {const r=M.newState();r.coins=1e15;M.registerMods(mods);for(let i=0;i<4;i++)M.buyCharUp(r,5,'relic','a@5');assert.equal(M.copies(r.chars['5'].relics,'a@5'),1,'one copy of a relic');
  assert.ok(!M.buyCharUp(r,5,'fused'),'Fused Relic needs all three relics');M.buyCharUp(r,5,'relic','b@5');M.buyCharUp(r,5,'relic','c@5');assert.ok(M.buyCharUp(r,5,'fused'));
  assert.equal(M.duelMods(r,[5,6]).passives.split('RELIC0').length-1,2,'Fused Relic: each relic counts twice');for(let i=0;i<2;i++)M.buyCharUp(r,5,'curse','drain');assert.equal(M.duelMods(r,[5,6]).lp[1],6000,'two Withering Souls: -2000 LP');
  for(let i=0;i<3;i++)M.buyCharUp(r,5,'curse','mercy');assert.equal(M.copies(r.chars['5'].curses,'mercy'),1,'curses that do not stack: one copy');
  assert.deepEqual(M.sanitize({chars:{'5':{relics:['a@5','a@5','a@5'],curses:['tax','tax','tax','tax']}}}).chars['5'],{relics:['a@5'],curses:['tax','tax','tax']},'older saves: extra relic copies drop');
  {const q=M.newState();q.coins=1e15;assert.equal(M.charBulk(q,5,'lp',5).count,5);assert.equal(M.charBulk(q,5,'lp','max').count,20,'MAX up to the cap')}
  r.items.autobet=1;r.items.betfav=1;assert.equal(M.autoPick(r,[{id:6},{id:5}],()=>0),1,'Loyal Backer backs the most upgraded character')}
 assert.ok(M.charUpCost(c,5,'relic')>M.charUpCost(c,5,'lp'),'relics cost more than an LP level');
}
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
