// Shadow Betting headless playtest: plays the real rules (idle-bets-model.js) on real recorded CPU duels, no rendering.
// Every board runs its own duel loop: bet (the bot backs the higher-tier CPU, like a sensible player; a coin flip on
// equal tiers), the duel plays for its real length at the bought Duel Speed, the result hold, then pay: the correct
// call, fees (eventIncome over the duel's events), tier bonuses, jackpots, characters, finishes. Between duels the bot
// shops. Two shoppers: "smart" buys what pays back soonest (the balance simulator's estimate), "naive" opens the next
// board as soon as it can and otherwise buys the cheapest thing it can afford.
// Usage: node android/idle_bets_playtest.mjs <duel-library.json> [smart|naive] [hours=8]
import fs from 'node:fs';
import * as M from './web/idle-bets-model.js';
import {rate} from './idle_bets_balance.mjs';

const lib=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const mode=process.argv[3]||'smart',HOURS=Number(process.argv[4])||8;
const RESULT_HOLD=1800,PICK=1.5;// game ms after a duel; seconds a person takes to tap a duelist
let seed=7;const rand=()=>(seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
const prep=lib.map(tl=>({tl,len:M.schedule(tl).total+RESULT_HOLD,seats:tl.seats.map((s,p)=>({...s,label:tl.labels[p]}))}));
// TREE='{"seed":1,"interest":5,...}' starts the run as a regress with that skill tree would (prestige testing).
const TREE=process.env.TREE?JSON.parse(process.env.TREE):null;
const s=TREE?M.startRun({...M.newState(),tree:TREE}):M.newState();s.stats.bets=0;
const SKIP=/^(autobet|scout|autochamp|bracket|purse)$/;
const clone=x=>({...x,items:{...x.items},stats:{...x.stats}});
const after=(x,id)=>{const t=clone(x);t.items[id]=(t.items[id]||0)+1;if(/^open\d$/.test(id))t.boards=Number(id.slice(4));return t};
const log={opens:{},income:{calls:0,fees:0,tier:0,jackpots:0,chars:0,finishes:0},stakes:0,spent:{},bets:0,hits:0,perBoard:{},buys:[],hourly:[]};
const boards=[];// {level, end, cur:{d,bet,stake}}: each board's duel in progress and when it ends
let t=0;const end=HOURS*3600;
// A duel starts now: the bot taps the higher-tier CPU (coin flip on equal tiers) if it can pay the stake.
function start(b){const d=prep[Math.floor(rand()*prep.length)],stake=M.boardStake(b.level);
 const ra=M.tierRank(d.seats[0].label),rb=M.tierRank(d.seats[1].label),pick=ra===rb?(rand()<.5?0:1):ra>rb?0:1;
 let bet=null;if(M.spend(s,stake)){bet=pick;log.stakes+=stake;log.bets++}
 b.cur={d,bet,stake};b.end=t+(bet==null?10:PICK)+d.len/M.speedOf(s)/1000}
function addBoard(k){const b={level:k};boards.push(b);start(b)}
addBoard(1);
function shop(){for(let guard=0;guard<500;guard++){
  const vis=M.visibleItems(s).filter(it=>!SKIP.test(it.id)&&M.itemLevel(s,it.id)<it.max);
  let pick=null;
  if(mode==='naive'){const opener=vis.find(it=>/^open\d$/.test(it.id)&&M.canAfford(s,M.itemCost(it.id,0)));
   pick=opener||vis.filter(it=>M.canAfford(s,M.itemCost(it.id,M.itemLevel(s,it.id)))).sort((a,b)=>M.itemCost(a.id,M.itemLevel(s,a.id))-M.itemCost(b.id,M.itemLevel(s,b.id)))[0]}
  else{const r=rate(s);let best=null;for(const it of vis){const l=M.itemLevel(s,it.id),cost=M.itemCost(it.id,l),gain=rate(after(s,it.id))-r;if(!(gain>0))continue;const score=Math.max(0,cost-s.coins)/Math.max(r,1e-9)+cost/gain;if(!best||score<best.score)best={it,cost,score}}
   if(best&&M.canAfford(s,best.cost))pick=best.it}
  if(!pick)return;const l=M.itemLevel(s,pick.id),cost=M.itemCost(pick.id,l);if(!M.spend(s,cost))return;
  s.items[pick.id]=l+1;const cat=M.categoryOf(pick.id);log.spent[cat]=(log.spent[cat]||0)+cost;
  if(/^open\d$/.test(pick.id)){const k=Number(pick.id.slice(4));s.boards=k;log.opens[k]=t;addBoard(k);log.buys.push([t,pick.id])}}}
let nextHour=3600;
while(t<end&&s.boards<9){
 const b=boards.reduce((a,x)=>x.end<a.end?x:a);t=b.end;
 if(t>=nextHour){const inc={...log.income},prevInc=log.lastInc||{};log.hourly.push([nextHour/3600,s.earned,s.boards,s.coins,Object.fromEntries(Object.entries(inc).map(([k,v])=>[k,v-(prevInc[k]||0)]))]);log.lastInc=inc;nextHour+=3600}
 // The duel ends: it pays with the items owned now.
 const {d,bet,stake}=b.cur,tl=d.tl,lvl=b.level;
 let fees=0;for(const f of tl.frames)fees+=M.eventIncome(s,f[0],lvl);
 const r=M.resultOf(tl,d.seats);const base=M.duelPayout(s,r,lvl,lvl,bet),pay=M.withTierBonus(s,r,base,fees);
 for(const [label,v] of pay.parts){const k=label==='Correct call'?'calls':/JACKPOT|jackpot/.test(label)?'jackpots':/ wins$/.test(label)&&!/^(Tier|Endless)/.test(label)?'chars':/upset|win \+|Endless win/.test(label)?'tier':'finishes';log.income[k]+=v}
 log.income.fees+=fees;if(bet!=null&&r.winner===bet)log.hits++;
 const pb=log.perBoard[lvl]??={duels:0,net:0};pb.duels++;pb.net+=pay.total+fees-(bet!=null?stake:0);
 M.earn(s,pay.total+fees);shop();start(b)}
const fmtT=x=>x<3600?(x/60).toFixed(1)+' min':(x/3600).toFixed(2)+' h';
console.log(`\n== ${mode} shopper, ${prep.length} recorded duels, up to ${HOURS} h ==`);
let prev=0;for(const [k,v] of Object.entries(log.opens)){console.log(`board ${k} at ${fmtT(v).padStart(9)}  (wait ${fmtT(v-prev)})`);prev=v}
console.log(`ended at ${fmtT(t)} with ${s.boards} boards, ${M.fmt(s.coins)} coins, ${M.fmt(s.earned)} earned · speed ${M.speedOf(s)}× · High Roller ×${M.multiplier(s)}`);
console.log(`bets ${log.bets}, correct ${(log.hits/Math.max(1,log.bets)*100).toFixed(1)}% · stakes paid ${M.fmt(log.stakes)}`);
const tot=Object.values(log.income).reduce((a,b)=>a+b,0);
console.log('income by source:',Object.entries(log.income).map(([k,v])=>`${k} ${(v/tot*100).toFixed(1)}%`).join(' · '));
const sp=Object.values(log.spent).reduce((a,b)=>a+b,0);
console.log('spent by shop tab:',Object.entries(log.spent).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${(v/sp*100).toFixed(1)}%`).join(' · '));
console.log('net per duel by board:',Object.entries(log.perBoard).map(([k,v])=>`B${k} ${M.fmt(v.net/v.duels)} (${v.duels} duels)`).join(' · '));
const lv=Object.entries(s.items).filter(([,l])=>l>0).sort((a,b)=>b[1]-a[1]).map(([k,l])=>k+' '+l).join(', ');console.log('levels:',lv);
console.log('hour · held coins · earned this run · stars if regressing now (held coins) · (if stars counted coins earned)');
for(const h of log.hourly)console.log(`${String(h[0]).padStart(3)}h  ${M.fmt(h[3]).padStart(8)}  ${M.fmt(h[1]).padStart(8)}  ${String(M.starsFor({...s,coins:h[3]})).padStart(5)} (${M.starsFor({...s,coins:h[1]})})`);
console.log('earned by hour:',log.hourly.map(([h,e,bd])=>`${h}h ${M.fmt(e)} (${bd} boards)`).join(' · '));
for(const [h,,bd,inc] of log.hourly){const tot=Object.values(inc).reduce((a,b)=>a+b,0)||1;console.log(`  hour ${h} (${bd} boards): `+Object.entries(inc).map(([k,v])=>`${k} ${(v/tot*100).toFixed(0)}%`).join(' '))}
