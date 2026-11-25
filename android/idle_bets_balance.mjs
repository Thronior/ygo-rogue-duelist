// Shadow Betting balance simulator: node android/idle_bets_balance.mjs
// Plays the economy from a new game to the first bracket with expected values per duel (measured from 288 recorded
// CPU duels) and a player who always buys what pays itself back soonest, the usual idle-game "best ratio" play.
// Prints when each board opens, what was bought, and checks the scaling rules the shop is built on.
const M=await import(process.env.BET_MODEL?new URL(process.env.BET_MODEL,import.meta.url).href:'./web/idle-bets-model.js');

// ---- measured: average coins per duel at board level 1 with the item at level 1, per point of item power ----
const RAW={fee_summon:.969,fee_attack:1.08,fee_spell:.644,fee_trap:.915,fee_destroy:1.519,fee_direct:2.394,fee_fusion:.006945,fee_damage:2.306,fee_heal:.5779,
 feat_summon:4.812,feat_battle:3.549,feat_activate:1.821,feat_set:1.757,feat_destroy:1.457,feat_survive:1.289,feat_victory:1.265};
// Duel length at 1× (replay + bet window + result hold), how often things happen, who wins.
const D={seconds:47.4+3.3,think:1.5,exodia:14/288,deckout:6/288,flawless:.198,longTurns:6.56,blitz:.042,
 winTier:{tier1:37/287,tier2:51/287,tier3:88/287,endless:111/287},hit:.5};
const SKIP=/^(autobet|scout|autochamp|bracket|purse|char_|destiny|special)/;// no income for an active player / not in this phase

function perDuel(s,level){const scale=M.itemScale(s);let flat=0;
 for(const [id,r] of Object.entries(RAW)){const l=M.itemLevel(s,id);if(l)flat+=r*M.power(id)*M.levelValue(l)}
 flat*=scale;
 const lv=id=>M.levelValue(M.itemLevel(s,id))*M.power(id);
 flat+=(D.flawless*5*lv('flawless')+D.longTurns*lv('longgame')+D.blitz*10*lv('blitz'))*scale;
 flat+=D.exodia*M.jackpotBase('exodia',s)*scale*(1+D.hit)+D.deckout*M.jackpotBase('deckout',s)*scale;
 const call=D.hit*M.correctPayout(s,level,level);
 let total=call+flat;let pct=0;for(const [t,p] of Object.entries(D.winTier))pct+=p*M.tierPct(s,t)/100;
 return total*(1+pct)-M.boardStake(level)}
const duelTime=s=>D.seconds/M.speedOf(s)+D.think;
// Where the income comes from (per second): bets and Calls, item income, the tier bonus, and the global multipliers.
export function breakdown(s){const T=duelTime(s),sc=M.itemScale(s);let calls=0,items=0;
 for(let k=1;k<=s.boards;k++){calls+=D.hit*M.correctPayout(s,k,k)-M.boardStake(k)}
 const one={...s,boards:1};items=(perDuel(s,1)+M.boardStake(1))/(1+tierShare(s))-D.hit*M.correctPayout(s,1,1);items*=s.boards;
 return {calls:calls/T,items:items/T,tier:tierShare(s),highroller:M.multiplier(s),speed:M.speedOf(s)}}
function tierShare(s){let pct=0;for(const [t,p] of Object.entries(D.winTier))pct+=p*M.tierPct(s,t)/100;return pct}
export function rate(s){let r=0;for(let k=1;k<=s.boards;k++)r+=perDuel(s,k);return r/duelTime(s)}
const clone=s=>({...s,items:{...s.items},stats:{...s.stats}});
function after(s,id){const t=clone(s);t.items[id]=(t.items[id]||0)+1;if(/^open\d$/.test(id))t.boards=Number(id.slice(4));return t}

export function run({log=false,until=9}={}){const s=M.newState();s.stats.bets=1;let t=0;const opens={},buys=[];
 for(let step=0;step<20000&&s.boards<until;step++){const r=rate(s);let best=null;
  for(const it of M.visibleItems(s)){if(SKIP.test(it.id))continue;const l=M.itemLevel(s,it.id);if(l>=it.max)continue;
   const cost=M.itemCost(it.id,l),gain=rate(after(s,it.id))-r;if(!(gain>0))continue;
   const score=Math.max(0,cost-s.coins)/r+cost/gain;if(!best||score<best.score)best={id:it.id,cost,gain,score,l}}
  if(!best)break;const wait=Math.max(0,best.cost-s.coins)/r;t+=wait;s.coins+=wait*r;s.earned+=wait*r;
  s.coins-=best.cost;s.items[best.id]=best.l+1;if(/^open\d$/.test(best.id)){const b=breakdown(s);s.boards=Number(best.id.slice(4));opens[s.boards]=t;if(log||process.argv.includes('--why'))console.log(`  before board ${s.boards}: bets+calls ${M.fmt(b.calls)}/s · items ${M.fmt(b.items)}/s · tier bonus +${Math.round(b.tier*100)}% · High Roller ×${b.highroller} · speed ${b.speed}×`)}
  buys.push([t,best.id,best.l+1,best.cost,best.cost/best.gain]);if(log)console.log((t/60).toFixed(1).padStart(7),'min',best.id.padEnd(12),'L'+(best.l+1),'cost',M.fmt(best.cost),'payback',(best.cost/best.gain).toFixed(0)+'s')}
 return {opens,buys,s,t}}

const fmtT=sec=>sec<3600?(sec/60).toFixed(1)+' min':(sec/3600).toFixed(2)+' h';
if(import.meta.url.endsWith(process.argv[1].replace(/\\/g,'/').split('/').pop())){
 const {opens,buys,s}=run({log:process.argv.includes('--log')});
 console.log('\nBoard opens (active play, best-ratio buying):');let prev=0;
 for(const [k,t] of Object.entries(opens)){console.log(`  board ${k}: ${fmtT(t).padStart(9)}  (${prev?'×'+(t/prev).toFixed(2)+' the previous wait':'first'})`);prev=t}
 const count={};for(const b of buys)count[b[1]]=(count[b[1]]||0)+1;console.log('\nLevels at the end:',Object.entries(count).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+' '+v).join(', '));
 // The rule from the user: once Lucky Calls costs as much as The Big Leagues, each upgrade gives less than it.
 const big=M.itemCost('open2',0);let l=0;while(M.itemCost('calls1',l)<big)l++;
 const st=M.newState();st.items.calls1=l;const before=M.correctPayout(st,1,1);st.items.calls1=l+1;const step=M.correctPayout(st,1,1)-before;
 console.log(`\nLucky Calls level ${l+1} costs ${M.itemCost('calls1',l)} (The Big Leagues: ${big}): +${M.fmt(step)} per correct call vs Board 2 paying ${M.boardPayout(2)}.`)}
