// Duel Bets (incremental minigame): the rules with no DOM — money, shop items and their prices, what each
// duel pays, the board/bracket ladder and the bracket standings. idle-bets.js draws it; the tests import it.
import {winKind} from './idle-bets-sim.js';

export const SAVE_KEY='ygo-duel-bets-v1';
export const BOARD_MAX=9,BRACKET_MAX=9,BRACKET_ROUNDS=3,ROSTER_SIZE=18;
// Test switch for this branch: the settings window offers "Infinite money". Turn off before merging.
export const DEV_TOOLS=true;

// The league each board slot plays in. Slot 2 is "The Big Leagues" by request.
export const LEAGUES=['Free Table','The Big Leagues','Pro Circuit','Regional Finals','National Finals','Continental Cup','Battle City','Duelist Kingdom','World Championship'];
// A board's level sets its stakes: board k before brackets, slot k + 2 per extra bracket after.
export const slotLevel=(slot,bracket=0)=>slot+(bracket>1?2*(bracket-1):0);
export const levelScale=level=>10**(level-1);
export const boardStake=level=>level<=1?0:10**(level-1);
export const boardPayout=level=>level<=1?1:10**level;
export const boardOpenerCost=k=>100*50**(k-2);
export const bracketOpenerCost=b=>boardOpenerCost(9)*1000**(b-1);

// Shop items. kind: 'simple' prices grow slowly; 'drastic' ones (they lift every board) grow steeply;
// 'opener' is bought once. set = the board you must own before the item can appear; show = the milestone
// that reveals it. icon = a card id (assets/cards-thumb, falling back to assets/cards).
// A set is priced from the next opener: about 1/20 of what opens the following board.
export function speedAt(l){return Math.round((1+.1*l)*10)/10}
// Auto Bet's interval in seconds at a level: 5s, 20% faster per level, never under 0.5s.
export function autoSeconds(l){return Math.max(.5,Math.round(5*.8**(l-1)*10)/10)}
const setBase=k=>k<=1?5:100*50**(k-1)/20;
const I=(id,set,name,icon,factor,growth,kind,extra={})=>({id,set,name,icon,base:setBase(set)*factor,growth,kind,max:Infinity,...extra});
const lvl=(s,id)=>s.items?.[id]||0;
// Lucky Calls is the very first purchase: it costs 1.
const calls=k=>I('calls'+k,k,k===1?'Lucky Calls':LEAGUES[k-1]+' Calls',74137509,k===1?.2:1,1.25,'simple',{text:()=>`+${k===1?1:fmt(boardPayout(k)*.25)} per correct call on board ${k}.`,show:s=>k===1||s.boards>=k});
export const ITEMS=[
 calls(1),
 // One item per tier from the start; the stronger the tier, the smaller the bonus.
 I('tier1',1,'Tier 1 Upsets',40640057,2,1.2,'simple',{text:()=>'+3 whenever a Tier 1 deck wins a duel (× board level).',show:()=>true}),
 I('tier2',1,'Tier 2 Wins',91152256,1.6,1.2,'simple',{text:()=>'+2 whenever a Tier 2 deck wins a duel (× board level).',show:()=>true}),
 I('tier3',1,'Tier 3 Wins',89631139,1.2,1.2,'simple',{text:()=>'+1 whenever a Tier 3 deck wins a duel (× board level).',show:()=>true}),
 I('endless',1,'Endless Wins',10000020,.8,1.2,'simple',{text:()=>'+0.5 whenever an Endless deck wins a duel (× board level).',show:()=>true}),
 I('fee_summon',1,'Summon Fees',70781052,3,1.15,'simple',{text:()=>'+0.1 for every summon (× board level).',show:()=>true}),
 I('fee_attack',1,'Battle Fees',5053103,3,1.15,'simple',{text:()=>'+0.1 for every attack (× board level).',show:s=>lvl(s,'fee_summon')>=1}),
 // Automation: Auto Bet backs a duelist on one waiting board every few seconds (faster per level);
 // Scouting Report makes it back the higher-tier CPU (a coin flip when both are the same tier).
 I('autobet',1,'Auto Bet',72302403,6,1.6,'simple',{max:12,text:l=>l?`Bets on a waiting board every ${autoSeconds(l)}s · next level ${autoSeconds(l+1)}s.`:`Every ${autoSeconds(1)}s, bets on a random duelist on a waiting board.`,maxText:`Bets on a waiting board every ${autoSeconds(12)}s.`,show:s=>s.stats.bets>=1||lvl(s,'calls1')>=1}),
 I('scout',1,'Scouting Report',4031928,60,1,'opener',{max:1,text:()=>'Auto Bet backs the higher-tier CPU (random when both are the same tier).',show:s=>lvl(s,'autobet')>=1}),
 // +0.1× per purchase (user, 2026-11-25), up to 8×; still the steepest-growing price in the opening shop.
 I('speed',1,'Duel Speed',16589042,10,1.8,'drastic',{max:70,text:l=>`Duels play at ${speedAt(l)}× now · next level ${speedAt(l+1)}×.`,maxText:'Duels play at 8× speed.',show:()=>true}),
 I('open2',1,'The Big Leagues',37313786,20,1,'opener',{max:1,text:()=>'Opens board 2. Bets cost 10 and pay 100.',show:s=>lvl(s,'calls1')>=2||s.earned>=20}),
 calls(2),
 I('fee_destroy',2,'Wreckage Fees',12580477,1.6,1.15,'simple',{text:()=>'+0.2 for every monster destroyed (× board level).',show:s=>s.boards>=2}),
 I('fee_direct',2,'Direct Hit Fees',46986414,2.4,1.15,'simple',{text:()=>'+0.5 for every direct attack (× board level).',show:s=>lvl(s,'fee_destroy')>=1}),
 I('exodia',2,'Exodia Jackpot',33396948,8,4,'drastic',{max:20,text:l=>`Exodia wins pay ${fmt(jackpotBase('exodia',{items:{exodia:l+1}}))}× board level (now ${fmt(jackpotBase('exodia',{items:{exodia:l}}))}).`,show:s=>s.boards>=2}),
 I('destiny',2,'Destiny Jackpot',94212438,8,4,'drastic',{max:20,text:l=>`Destiny Board wins pay ${fmt(jackpotBase('destiny',{items:{destiny:l+1}}))}× board level (now ${fmt(jackpotBase('destiny',{items:{destiny:l}}))}).`,show:s=>s.boards>=2}),
 I('open3',2,'Board 3: '+LEAGUES[2],32807846,20,1,'opener',{max:1,text:()=>`Opens board 3. Bets cost ${fmt(boardStake(3))} and pay ${fmt(boardPayout(3))}.`,show:s=>s.boards>=2&&lvl(s,'calls2')>=1}),
 calls(3),
 I('fee_spell',3,'Spell Fees',55144522,1.5,1.15,'simple',{text:()=>'+0.1 for every Spell activated (× board level).',show:s=>s.boards>=3}),
 I('fee_trap',3,'Trap Fees',44095762,1.5,1.15,'simple',{text:()=>'+0.2 for every Trap activated (× board level).',show:s=>lvl(s,'fee_spell')>=1}),
 I('highroller',3,'High Roller',3549275,15,40,'drastic',{max:12,text:l=>`Everything pays ×${2**(l+1)} (now ×${2**l}).`,show:s=>s.boards>=3}),
 I('open4',3,'Board 4: '+LEAGUES[3],4031928,20,1,'opener',{max:1,text:()=>`Opens board 4. Bets cost ${fmt(boardStake(4))} and pay ${fmt(boardPayout(4))}.`,show:s=>s.boards>=3&&lvl(s,'calls3')>=1}),
 calls(4),
 I('fee_fusion',4,'Fusion Fees',24094653,2,1.15,'simple',{text:()=>'+1 for every Fusion Summon (× board level).',show:s=>s.boards>=4}),
 I('fee_damage',4,'Damage Fees',19523799,2,1.15,'simple',{text:()=>'+0.2 for every 1,000 damage dealt (× board level).',show:s=>lvl(s,'fee_fusion')>=1}),
 I('open5',4,'Board 5: '+LEAGUES[4],72302403,20,1,'opener',{max:1,text:()=>`Opens board 5. Bets cost ${fmt(boardStake(5))} and pay ${fmt(boardPayout(5))}.`,show:s=>s.boards>=4&&lvl(s,'calls4')>=1}),
 calls(5),
 I('deckout',5,'Deck-Out Jackpot',70368879,3,3,'drastic',{max:20,text:()=>'+50 whenever a duel ends by deck-out (× board level).',show:s=>s.boards>=5}),
 I('fee_heal',5,"Healer's Tithe",11714098,2,1.15,'simple',{text:()=>'+0.5 for every 1,000 LP gained (× board level).',show:s=>s.boards>=5}),
 I('open6',5,'Board 6: '+LEAGUES[5],83764718,20,1,'opener',{max:1,text:()=>`Opens board 6. Bets cost ${fmt(boardStake(6))} and pay ${fmt(boardPayout(6))}.`,show:s=>s.boards>=5&&lvl(s,'calls5')>=1}),
 calls(6),
 I('special',6,'Alternate Win Jackpot',28566710,3,3,'drastic',{max:20,text:()=>'+200 whenever a duel ends by a special win other than Exodia or Destiny Board (× board level).',show:s=>s.boards>=6}),
 I('flawless',6,'Flawless Bonus',5318639,2,1.2,'simple',{text:()=>'+5 whenever the winner still has 8,000 LP or more (× board level).',show:s=>s.boards>=6}),
 I('open7',6,'Board 7: '+LEAGUES[6],50045299,20,1,'opener',{max:1,text:()=>`Opens board 7. Bets cost ${fmt(boardStake(7))} and pay ${fmt(boardPayout(7))}.`,show:s=>s.boards>=6&&lvl(s,'calls6')>=1}),
 calls(7),
 I('longgame',7,'Long Game',19613556,2,1.2,'simple',{text:()=>'+1 for every turn past turn 10 (× board level).',show:s=>s.boards>=7}),
 I('open8',7,'Board 8: '+LEAGUES[7],98502113,20,1,'opener',{max:1,text:()=>`Opens board 8. Bets cost ${fmt(boardStake(8))} and pay ${fmt(boardPayout(8))}.`,show:s=>s.boards>=7&&lvl(s,'calls7')>=1}),
 calls(8),
 I('blitz',8,'Blitz Bonus',38033121,2,1.2,'simple',{text:()=>'+10 whenever a duel ends by turn 5 (× board level).',show:s=>s.boards>=8}),
 I('open9',8,'Board 9: '+LEAGUES[8],32012841,20,1,'opener',{max:1,text:()=>`Opens board 9. Nine boards become your first bracket.`,show:s=>s.boards>=8&&lvl(s,'calls8')>=1}),
 calls(9),
 I('purse',9,"Champion's Purse",72989439,2,1.25,'simple',{text:()=>'+50% to bracket champion payouts.',show:s=>s.brackets>=1}),
 I('bracket',9,'New Bracket',12580477,1,1,'opener',{max:BRACKET_MAX-1,text:l=>`Opens bracket ${l+2}: nine more boards at higher stakes.`,maxText:'All nine brackets are open.',show:s=>s.brackets>=1}),
];
// Shop pictures are relic cutouts (assets/relics/<name>.png), one per item.
const CALL_ART=["Let's Go Gambling",'Weighted Coins','Divine Gambler',"Duelist's Wager",'Golden Scale','Golden Receipt','Merchant Sigil',"Collector's Stamp",'Champion Trophy'];
const ART={tier1:"Underdog's Banner",tier2:"Warrior's Vow",tier3:'Lone Champion',endless:'Eternal Flame',fee_summon:'Tribute Power',fee_attack:'Battle Proficiency',
 autobet:'Weighted Dice',scout:'Mind Reader',speed:'Sun and Moon Dial',open2:'Grand Bazaar',fee_destroy:'Cracked Sword',fee_direct:'Lancer Spear',exodia:'Legendary Shackles',
 destiny:'Final Hour',open3:'Treasure Map',fee_spell:'Magician Staff',fee_trap:'Trap Weaver',highroller:'Bottomless Purse',open4:'Booster Box',fee_fusion:'Fusion Chamber',
 fee_damage:'Burn Proficiency',open5:'Golden Receipt',deckout:'Starving Library',fee_heal:'Healing Spring',open6:'Merchant Sigil',special:'Premature Triumph',flawless:'Life Shield',
 open7:'Golden Scale',longgame:'Ominous Clock',open8:"Collector's Stamp",blitz:'Reckless Spear',open9:'Champion Trophy',purse:'Loaded Purse',bracket:'Twin Banner'};
for(const it of ITEMS)it.art=/^calls\d$/.test(it.id)?CALL_ART[Number(it.id.slice(5))-1]:ART[it.id];
export const ITEM=Object.fromEntries(ITEMS.map(i=>[i.id,i]));
export function itemCost(id,level){const it=ITEM[id];if(id==='bracket')return bracketOpenerCost(level+1);if(/^open\d$/.test(id))return boardOpenerCost(Number(id.slice(4)));return Math.ceil(it.base*it.growth**level)}
export const itemLevel=lvl;

// ---- state ----
export function newState(){return {v:1,coins:0,earned:0,spent:0,items:{},boards:1,brackets:0,stats:{bets:0,correct:0,slots:{},exodia:0,destiny:0,champions:0},settings:{fx:'full',infinite:false},brackets_saved:[]}}
const num=(x,d=0)=>Number.isFinite(Number(x))?Number(x):d;
export function sanitize(raw){const s=newState();if(!raw||typeof raw!=='object')return s;
 s.coins=Math.max(0,num(raw.coins));s.earned=Math.max(0,num(raw.earned));s.spent=Math.max(0,num(raw.spent));
 for(const it of ITEMS){const v=Math.floor(num(raw.items?.[it.id]));if(v>0)s.items[it.id]=Math.min(v,it.max)}
 s.boards=Math.min(BOARD_MAX,Math.max(1,Math.floor(num(raw.boards,1))));s.brackets=Math.min(BRACKET_MAX,Math.max(0,Math.floor(num(raw.brackets))));
 if(s.boards<BOARD_MAX)s.brackets=0;else s.brackets=Math.max(1,s.brackets);
 for(const k of ['bets','correct','exodia','destiny','champions'])s.stats[k]=Math.max(0,Math.floor(num(raw.stats?.[k])));
 for(const [k,v] of Object.entries(raw.stats?.slots||{}))if(/^\d$/.test(k))s.stats.slots[k]=Math.max(0,Math.floor(num(v)));
 if(['full','light','off'].includes(raw.settings?.fx))s.settings.fx=raw.settings.fx;s.settings.infinite=DEV_TOOLS&&!!raw.settings?.infinite;
 if(Array.isArray(raw.brackets_saved))s.brackets_saved=raw.brackets_saved.filter(b=>b&&Array.isArray(b.roster)&&b.roster.length===ROSTER_SIZE).slice(0,BRACKET_MAX);
 return s}
export const canAfford=(s,cost)=>s.settings.infinite||s.coins>=cost;
export function spend(s,cost){if(!canAfford(s,cost))return false;if(!s.settings.infinite)s.coins-=cost;s.spent+=cost;return true}
export function earn(s,amount){if(!(amount>0))return 0;s.coins+=amount;s.earned+=amount;return amount}
export const visibleItems=s=>ITEMS.filter(it=>it.set<=Math.max(s.boards,s.brackets?9:0)&&it.show(s)&&!(it.kind==='opener'&&lvl(s,it.id)>=it.max));
// Buying returns what changed so the screen can react ('board', 'bracket' or null).
export function buy(s,id){const it=ITEM[id],level=lvl(s,id);if(!it||level>=it.max||!it.show(s))return null;const cost=itemCost(id,level);if(!spend(s,cost))return null;
 s.items[id]=level+1;
 if(/^open\d$/.test(id)){s.boards=Math.max(s.boards,Number(id.slice(4)));if(s.boards>=BOARD_MAX){s.brackets=Math.max(1,s.brackets);return {kind:'bracket',cost}}return {kind:'board',cost}}
 if(id==='bracket'){s.brackets=Math.min(BRACKET_MAX,s.brackets+1);return {kind:'bracket',cost}}
 return {kind:'item',cost}}

// ---- what things pay ----
export const speedOf=s=>speedAt(lvl(s,'speed'));
export const autoInterval=s=>lvl(s,'autobet')?autoSeconds(lvl(s,'autobet'))*1000:0;
const TIER_RANK={'Opening Duel':0,'Tier 1':1,'Tier 2':2,'Tier 3':3,Endless:4,'World Championship':4};
export const tierRank=label=>TIER_RANK[label]??2;
// The seat Auto Bet backs: random, or with Scouting Report the higher tier (random on a tie).
export function autoPick(s,seats,random=Math.random){if(lvl(s,'scout')){const a=tierRank(seats[0].label),b=tierRank(seats[1].label);if(a!==b)return a>b?0:1}return random()<.5?0:1}
export const multiplier=s=>2**lvl(s,'highroller');
export const callUnit=k=>k===1?1:boardPayout(k)*.25;
export const correctPayout=(s,slot,level)=>(boardPayout(level)+lvl(s,'calls'+slot)*callUnit(slot)*levelScale(level)/levelScale(slot))*multiplier(s);
export function jackpotBase(kind,s){const l=lvl(s,kind);return kind==='exodia'||kind==='destiny'?50*2**l:kind==='deckout'?50*l:kind==='special'?200*l:0}
// Income from one replayed frame's events on a board of this level.
export function eventIncome(s,events,level){let total=0;const scale=levelScale(level)*multiplier(s);
 for(const e of events){
  if(e[0]==='s'||e[0]==='f'){total+=lvl(s,'fee_summon')*.1;if(e[0]==='f')total+=lvl(s,'fee_fusion')}
  else if(e[0]==='a'){total+=lvl(s,'fee_attack')*.1;if(e[3]===-1)total+=lvl(s,'fee_direct')*.5}
  else if(e[0]==='x')total+=lvl(s,'fee_destroy')*.2;
  else if(e[0]==='c'){if(e[3]===2)total+=lvl(s,'fee_spell')*.1;else if(e[3]===4)total+=lvl(s,'fee_trap')*.2}
  else if(e[0]==='l'){if(e[2]<0)total+=lvl(s,'fee_damage')*.2*(-e[2]/1000);else total+=lvl(s,'fee_heal')*.5*(e[2]/1000)}
 }
 return total*scale}
export const tierKey=label=>/^Tier 1/.test(label)?'tier1':/^Tier 2/.test(label)?'tier2':/^Tier 3/.test(label)?'tier3':/Endless/.test(label)?'endless':null;
// Everything a finished duel pays. result: {winner, reason, turns, winnerLp, winnerTier (deck label)};
// pick = the seat the player backed (null = no bet). Returns {total, parts:[[label, amount, big]]}.
export function duelPayout(s,result,level,slot,pick=null){const parts=[],scale=levelScale(level)*multiplier(s),add=(label,v,big=false)=>{if(v>0)parts.push([label,v,big])};
 if(pick!=null&&result.winner===pick)add('Correct call',correctPayout(s,slot,level),true);
 const tier=tierKey(result.winnerTier||'');
 if(result.winner<2&&tier)add({tier1:'Tier 1 upset',tier2:'Tier 2 win',tier3:'Tier 3 win',endless:'Endless win'}[tier],{tier1:3,tier2:2,tier3:1,endless:.5}[tier]*lvl(s,tier)*scale);
 const kind=winKind(result);
 if(kind==='exodia'||kind==='destiny'){const v=jackpotBase(kind,s)*scale*(pick!=null&&result.winner===pick?2:1);add(kind==='exodia'?'EXODIA JACKPOT':'DESTINY JACKPOT',v,true)}
 if(kind==='deckout')add('Deck-out jackpot',jackpotBase('deckout',s)*scale,true);
 if(kind==='special')add('Alternate win jackpot',jackpotBase('special',s)*scale,true);
 if(result.winner<2&&result.winnerLp>=8000)add('Flawless',5*lvl(s,'flawless')*scale);
 if(result.turns>10)add('Long game',(result.turns-10)*lvl(s,'longgame')*scale);
 if(result.winner<2&&result.turns<=5)add('Blitz',10*lvl(s,'blitz')*scale);
 return {total:parts.reduce((a,p)=>a+p[1],0),parts}}

// ---- replay pacing ----
// How long each recorded frame stays on screen at 1× speed.
// A frame that only changes the phase passes quickly, so showing phases doesn't slow duels down.
export function frameDelay(frame){if(!frame[1]&&frame[0].length&&frame[0].every(e=>e[0]==='p'))return 120;let ms=260;for(const e of frame[0]){ms+=e[0]==='t'?520:e[0]==='a'?360:e[0]==='f'?420:e[0]==='x'?200:e[0]==='c'?220:e[0]==='s'?160:e[0]==='l'?140:0}return Math.min(ms,1400)}
export function schedule(tl){let t=0;const at=tl.frames.map(f=>{const start=t;t+=frameDelay(f);return start});return {at,total:t+900}}
export const finalLp=(tl,p)=>{for(let i=tl.frames.length-1;i>=0;i--){const b=tl.frames[i][1];if(b&&b[p])return b[p][0]}return 8000};
export const resultOf=(tl,decks)=>({winner:tl.winner,reason:tl.reason,turns:tl.turns,winnerLp:tl.winner<2?finalLp(tl,tl.winner):0,winnerTier:tl.winner<2?decks?.[tl.winner]?.label||'':''});
export function damageDealt(tl){const d=[0,0];for(const f of tl.frames)for(const e of f[0])if(e[0]==='l'&&e[2]<0)d[1-e[1]]+=-e[2];return d}

// ---- brackets: 18 CPUs, 9 boards, 3 rounds; most wins takes it ----
export function rng(seed){let s=seed>>>0;return()=>{s=(s+0x6d2b79f5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
// pool: [{id,tier,label}] every CPU deck of every tier. Characters don't repeat inside one roster.
export function pickRoster(pool,random,size=ROSTER_SIZE){const out=[],seen=new Set();let guard=0;while(out.length<size&&guard++<size*50){const d=pool[Math.floor(random()*pool.length)];if(seen.has(d.id)&&guard<size*40)continue;seen.add(d.id);out.push(d)}return out}
export function pairRound(n,random){const idx=[...Array(n).keys()];for(let i=n-1;i>0;i--){const j=Math.floor(random()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]]}const pairs=[];for(let i=0;i+1<n;i+=2)pairs.push([idx[i],idx[i+1]]);return pairs}
export function standings(wins,damage){return wins.map((w,i)=>i).sort((a,b)=>wins[b]-wins[a]||damage[b]-damage[a]||a-b)}
export const championStake=(s,bracket)=>boardStake(slotLevel(9,bracket))*10;
export const championPayout=(s,bracket)=>championStake(s,bracket)*25*(1+.5*lvl(s,'purse'))*multiplier(s);
// Unwatched bracket duels are settled from each deck's recorded results (idle-bets-library.js keeps them).
const TIER_BASE={'Opening Duel':.6,'Tier 1':1,'Tier 2':1.4,'Tier 3':1.9,Endless:2.4,'World Championship':2.4};
export function strength(deck,stats){const st=stats?.[deck.id+':'+deck.tier]||{g:0,w:0};return (TIER_BASE[deck.label]??1.5)*((st.w+3)/(st.g+6))/.5}
export function modelWinner(a,b,stats,random){const sa=strength(a,stats),sb=strength(b,stats);return random()<sa/(sa+sb)?0:1}
export function modelWinKind(deck,stats,random){const st=stats?.[deck.id+':'+deck.tier];if(!st||!st.w)return 1;const r=random()*(st.w+1);return r<(st.ex||0)?16:r<(st.ex||0)+(st.de||0)?21:1}

// ---- numbers ----
const SUFFIX=['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc','Ud','Dd','Td','Qad','Qid','Sxd','Spd','Ocd','Nod','Vg'];
export function fmt(n){if(!Number.isFinite(n))return '∞';const a=Math.abs(n);if(a<100)return (Math.floor(n*10)/10).toLocaleString('en-US');if(a<1e4)return Math.floor(n).toLocaleString('en-US');
 const k=Math.min(SUFFIX.length-1,Math.floor(Math.log10(a)/3));if(k>=SUFFIX.length-1&&a>=1e66)return n.toExponential(2).replace('+','');const v=Math.round(n/1000**k*1e9)/1e9;return (v>=100?Math.floor(v):Math.floor(v*100)/100).toLocaleString('en-US')+SUFFIX[k]}
