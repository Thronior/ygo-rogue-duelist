// Duel Bets minigame: economy, shop, payouts, pacing and brackets (idle-bets-model.js), plus one real
// recorded CPU duel (idle-bets-sim.js) when the generated content.json is present.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import * as M from './web/idle-bets-model.js';

// ---- a new game: board 1 only, a free bet that pays 1 ----
let s=M.newState();
assert.equal(s.boards,1);assert.equal(s.brackets,0);
assert.equal(M.boardStake(1),0);assert.equal(M.boardPayout(1),1);
assert.equal(M.correctPayout(s,1,1),1);
assert.deepEqual(M.visibleItems(s).map(i=>i.id),['calls1','tier1','fee_summon','speed'],'the opening shop: payout, CPU type, action and speed items');

// ---- prices: simple items creep up, drastic ones climb steeply ----
const ratio=id=>M.itemCost(id,5)/M.itemCost(id,4);
assert.ok(ratio('calls1')<1.4&&ratio('fee_summon')<1.3,'simple items grow slowly');
assert.ok(ratio('speed')>=20&&M.itemCost('highroller',1)/M.itemCost('highroller',0)>=30,'board-wide items grow a lot');
assert.equal(M.itemCost('open2',0),100,'The Big Leagues costs 100');

// ---- buying: money goes down, can't overspend, the Big Leagues opens board 2 ----
s.coins=99;
assert.equal(M.buy(s,'open2'),null,'hidden until a milestone, and unaffordable');
s.coins=1000;M.buy(s,'calls1');M.buy(s,'calls1');
assert.equal(M.itemLevel(s,'calls1'),2);assert.equal(s.coins,1000-M.itemCost('calls1',0)-M.itemCost('calls1',1));
assert.equal(M.correctPayout(s,1,1),3,'two Lucky Calls: 1 + 2');
assert.ok(M.visibleItems(s).some(i=>i.id==='open2'));
let before=s.coins,r=M.buy(s,'open2');
assert.equal(r.kind,'board');assert.equal(s.boards,2);assert.equal(s.coins,before-100);
assert.ok(!M.visibleItems(s).some(i=>i.id==='open2'),'a bought opener leaves the shop');
assert.equal(M.boardStake(2),10);assert.equal(M.boardPayout(2),100,'board 2: bet 10, win 100');
assert.ok(M.visibleItems(s).some(i=>i.id==='calls2'),'board 2 brings its own, pricier set');
assert.ok(M.itemCost('calls2',0)>M.itemCost('calls1',0)*10);
s.coins=0;assert.equal(M.buy(s,'calls2'),null,'no money, no sale');

// ---- speed caps at 8× ----
s.settings.infinite=true;for(let i=0;i<20;i++)M.buy(s,'speed');
assert.equal(M.speedOf(s),8);assert.equal(s.coins,0,'infinite money never spends');

// ---- infinite money reaches every board, then brackets, up to 9 ----
for(let k=3;k<=9;k++){M.buy(s,'calls'+(k-1));const res=M.buy(s,'open'+k);assert.ok(res,'opener '+k);assert.equal(s.boards,k)}
assert.equal(s.brackets,1,'nine boards become the first bracket');
for(let b=2;b<=9;b++)assert.equal(M.buy(s,'bracket').kind,'bracket');
assert.equal(s.brackets,9);assert.equal(M.buy(s,'bracket'),null,'nine brackets is the maximum');
assert.equal(M.slotLevel(9,9),25);assert.ok(M.boardPayout(M.slotLevel(9,9))>M.boardPayout(9));

// ---- event income: per action, times board level and High Roller ----
s=M.newState();s.items={fee_summon:2,fee_attack:1,fee_direct:2,fee_destroy:1,fee_trap:1,fee_damage:1};
const ev=[['s',0,123,0],['a',0,0,-1],['x',1,55],['c',1,44095762,4],['l',1,-2000]];
const base=2*.1+.1+2*.5+.2+.2+.2*2;
assert.ok(Math.abs(M.eventIncome(s,ev,1)-base)<1e-9);
assert.ok(Math.abs(M.eventIncome(s,ev,3)-base*100)<1e-9,'board level 3 pays ×100');
s.items.highroller=2;assert.ok(Math.abs(M.eventIncome(s,ev,1)-base*4)<1e-9,'High Roller ×2 per level');

// ---- what a finished duel pays ----
s=M.newState();s.items={calls1:1,tier1:2,exodia:1};
let pay=M.duelPayout(s,{winner:0,reason:1,turns:8,winnerLp:3000,winnerTier:'Tier 1'},1,1,0);
assert.deepEqual(pay.parts.map(p=>p[0]),['Correct call','Tier 1 upset']);assert.equal(pay.total,2+6);
pay=M.duelPayout(s,{winner:1,reason:1,turns:8,winnerLp:3000,winnerTier:'Tier 1'},1,1,0);
assert.deepEqual(pay.parts.map(p=>p[0]),['Tier 1 upset'],'a wrong call still collects the passive bonuses');
pay=M.duelPayout(s,{winner:0,reason:16,turns:9,winnerLp:8000,winnerTier:'Tier 3'},2,2,0);
const jackpot=pay.parts.find(p=>p[0]==='EXODIA JACKPOT');assert.ok(jackpot&&jackpot[2],'Exodia pays a big jackpot');
assert.equal(jackpot[1],100*10*2,'50×2 (one upgrade) × board level 2, doubled for backing the winner');
assert.equal(M.duelPayout(s,{winner:1,reason:21,turns:9,winnerLp:500,winnerTier:'Tier 2'},1,1,null).parts[0][0],'DESTINY JACKPOT');

// ---- pacing: frames take time, turns and attacks longer ----
const tl={v:1,seats:[{id:1,tier:0},{id:2,tier:1}],winner:0,reason:1,turns:3,frames:[[[]],[[['t',0]]],[[['a',0,1,-1],['l',1,-1500]],[[1,1,1,1],[6500,5,30,0]]]]};
const sch=M.schedule(tl);assert.equal(sch.at[0],0);assert.ok(sch.at[2]-sch.at[1]>sch.at[1]-sch.at[0],'a turn frame holds longer than an empty one');
assert.equal(M.finalLp(tl,1),6500);assert.deepEqual(M.damageDealt(tl),[1500,0]);
assert.equal(M.resultOf(tl,[{label:'Tier 1'},{label:'Tier 2'}]).winnerTier,'Tier 1');

// ---- brackets: 18 different characters, 9 pairs, most wins first ----
const pool=Array.from({length:60},(_,i)=>({id:i%30,tier:Math.floor(i/30),label:'Tier '+(1+Math.floor(i/30)),key:(i%30)+':'+Math.floor(i/30)}));
const random=M.rng(7),roster=M.pickRoster(pool,random);
assert.equal(roster.length,18);assert.equal(new Set(roster.map(d=>d.id)).size,18,'no character twice in a bracket');
const pairs=M.pairRound(18,random);assert.equal(pairs.length,9);assert.equal(new Set(pairs.flat()).size,18);
assert.deepEqual(M.standings([1,3,3,0],[0,500,900,0]).slice(0,3),[2,1,0],'ties break on damage dealt');
assert.ok(M.championPayout(M.newState(),1)>M.championStake(M.newState(),1)*20);
const strong={id:1,tier:3,label:'Endless'},weak={id:2,tier:0,label:'Opening Duel'};let w=0;const rr=M.rng(3);
for(let i=0;i<2000;i++)w+=M.modelWinner(strong,weak,{},rr)===0;assert.ok(w>1400,'unwatched duels favour the stronger deck');
assert.ok(M.strength(weak,{'2:0':{g:40,w:36}})>M.strength(weak,{}),'recorded results move a deck\'s strength');

// ---- saves: junk is cleaned, levels clamp, infinite money only with the test switch ----
const clean=M.sanitize({coins:'12',items:{speed:99,bogus:3,calls1:-2},boards:20,brackets:4,settings:{fx:'nope',infinite:true}});
assert.equal(clean.coins,12);assert.equal(clean.items.speed,7);assert.ok(!('bogus' in clean.items)&&!('calls1' in clean.items));
assert.equal(clean.boards,9);assert.equal(clean.brackets,4);assert.equal(clean.settings.fx,'full');assert.equal(clean.settings.infinite,M.DEV_TOOLS);
assert.equal(M.sanitize({boards:3,brackets:5}).brackets,0,'no brackets before nine boards');
assert.equal(M.sanitize(null).coins,0);

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
 assert.equal(t.v,1);assert.ok([0,1,2].includes(t.winner));assert.ok(t.frames.length>5,'a duel has frames');
 assert.ok(t.frames[0][1]&&t.frames[0][1].length===2&&t.frames[0][1][0].length===15,'the first frame carries both boards');
 assert.ok(t.frames.some(f=>f[0].some(e=>e[0]==='t')),'turns are recorded');
 assert.ok(['lp','exodia','destiny','deckout','special'].includes(winKind(t)));
 const again=recordDuel(engine,[decks[ids[0]][0],decks[ids[1]][0]],[{id:+ids[0],tier:0},{id:+ids[1],tier:0}],12345);
 assert.equal(JSON.stringify(again),JSON.stringify(t),'the same seed records the same duel');
 console.log('recorded duel:',t.frames.length,'frames,',t.turns,'turns');
}else console.log('content.json missing: skipped the recorded duel');
console.log('Duel Bets tests passed');
